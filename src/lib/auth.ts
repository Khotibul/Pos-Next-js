import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";
import { consumeOauthRegistration } from "@/modules/auth/oauth-registration/service";
import { createTenantForExistingUser } from "@/modules/tenants/service";
import { setCachedEmailVerified } from "@/lib/cache/user-cache";
import { getCachedAuthUser, setCachedAuthUser } from "@/lib/auth-cache";
import { setCachedTenantContext } from "@/lib/tenant-context-cache";
import { createDevTimer } from "@/lib/perf";
import { startTimer } from "@/lib/perf-monitor";
import { writeAuthLog } from "@/lib/monitoring/log-service";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

async function preWarmTenantContext(user: {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  isSuperAdmin: boolean;
  memberships: Array<{
    tenantId: string;
    branchId: string | null;
    branch: { id: string; name: string } | null;
    tenant: { name: string; slug: string; status: string; trialEndsAt: Date | null };
    role: { id: string; name: string; permissions: Array<{ permission: { key: string } }> } | null;
  }>;
}) {
  const ms = user.memberships;
  if (!ms || ms.length === 0) return;

  const primary = ms[0];
  const branchId = primary.branchId ?? primary.branch?.id;
  if (!branchId) return;

  const permissions = (primary.role?.permissions ?? []).map((rp) => rp.permission.key);
  const memberships = ms.map((m) => ({
    tenantId: m.tenantId,
    tenantName: m.tenant.name,
    tenantSlug: m.tenant.slug,
    tenantStatus: m.tenant.status,
  }));

  await setCachedTenantContext(user.id, primary.tenantId, {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    userImage: user.image,
    isSuperAdmin: user.isSuperAdmin,
    tenantId: primary.tenantId,
    tenantName: primary.tenant.name,
    tenantSlug: primary.tenant.slug,
    tenantStatus: primary.tenant.status as "ACTIVE" | "TRIAL" | "SUSPENDED" | "EXPIRED",
    tenantTrialEndsAt: primary.tenant.trialEndsAt?.toISOString() ?? null,
    branchId,
    branchName: primary.branch?.name ?? null,
    permissions,
    roleName: primary.role?.name ?? null,
    roleId: primary.role?.id ?? null,
    subscriptionStatus: primary.tenant.status as "ACTIVE" | "TRIAL" | "SUSPENDED" | "EXPIRED",
    memberships,
  });
}

async function warmLoginCache(
  userId: string,
  email: string | null,
  name: string | null,
  image: string | null,
  isSuperAdmin: boolean,
  verifiedAt: string,
  ip: string | undefined,
  ua: string | undefined,
) {
  try {
    const [memberships] = await Promise.all([
      prisma.tenantUser.findMany({
        where: { userId },
        select: {
          tenantId: true,
          branchId: true,
          branch: { select: { id: true, name: true } },
          tenant: { select: { name: true, slug: true, status: true, trialEndsAt: true } },
          role: {
            select: {
              id: true,
              name: true,
              permissions: { select: { permission: { select: { key: true } } } },
            },
          },
        },
      }),
      writeAuthLog({ userId, email, event: "LOGIN_SUCCESS", ipAddress: ip, userAgent: ua, provider: "credentials" }),
    ]);

    await Promise.allSettled([
      setCachedEmailVerified(userId, true),
      setCachedAuthUser({ id: userId, email, name, image, isSuperAdmin, emailVerified: verifiedAt }),
      preWarmTenantContext({
        id: userId,
        email,
        name,
        image,
        isSuperAdmin,
        memberships,
      }),
    ]);
  } catch (e) {
    console.error("[auth] warmLoginCache failed", e);
  }
}

export const {
  handlers: { GET, POST },
  auth,
} = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw, request) => {
        const loginTimer = startTimer();
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.trim().toLowerCase();
        const ip =
          request?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() ||
          request?.headers?.get?.("x-real-ip") ||
          "unknown";
        const ua = request?.headers?.get?.("user-agent") ?? undefined;
        const loginLimit = await checkRateLimit("login", `login:email:${email}:${ip}`);
        if (!loginLimit.success) {
          writeAuthLog({ email, event: "RATE_LIMITED", ipAddress: ip, userAgent: ua }).catch(() => {});
          throw new Error("RATE_LIMITED");
        }

        // Phase 1: lightweight query — user fields only, no joins.
        const endQueryUser = createDevTimer("auth.credentials.queryUser");
        const user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            passwordHash: true,
            emailVerified: true,
            isSuperAdmin: true,
            isActive: true,
          },
        });
        endQueryUser();
        if (!user?.passwordHash) {
          writeAuthLog({ email, event: "LOGIN_FAILED", ipAddress: ip, userAgent: ua }).catch(() => {});
          return null;
        }
        if (!user.isActive) {
          writeAuthLog({ userId: user.id, email, event: "USER_DISABLED", ipAddress: ip, userAgent: ua }).catch(() => {});
          throw new Error("USER_DISABLED");
        }
        if (!user.emailVerified) {
          setCachedEmailVerified(user.id, false).catch(() => {});
          writeAuthLog({ userId: user.id, email, event: "EMAIL_NOT_VERIFIED", ipAddress: ip, userAgent: ua }).catch(() => {});
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        const endBcrypt = createDevTimer("auth.credentials.bcrypt");
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        endBcrypt();
        if (!ok) {
          writeAuthLog({ userId: user.id, email, event: "LOGIN_FAILED", ipAddress: ip, userAgent: ua }).catch(() => {});
          return null;
        }

        const verifiedAt = user.emailVerified.toISOString();
        const userObj = {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          isSuperAdmin: user.isSuperAdmin,
          emailVerified: user.emailVerified?.toISOString() ?? null,
        };

        // Phase 2: prewarm cache synchronously so dashboard load gets a cache hit.
        await warmLoginCache(user.id, user.email, user.name, user.image, user.isSuperAdmin, verifiedAt, ip, ua);

        loginTimer("login");

        return userObj;
      },
    }),
  ],
  callbacks: {
    signIn: async ({ account, profile }) => {
      if (account?.provider !== "google") return true;
      const emailRaw = profile?.email ?? null;
      const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : null;
      if (!email) return false;

      // IMPORTANT: Query email case-insensitively.
      // This prevents OAuthAccountNotLinked when existing credentials users have mixed-case emails.
      const existing = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: {
          id: true,
          email: true,
          isActive: true,
          accounts: { select: { provider: true } },
        },
      });

      const cookieStore = await cookies();
      const regId = cookieStore.get("oauth_reg_id")?.value ?? null;
      const oauthLink = cookieStore.get("oauth_link")?.value ?? null;
      const isTrustedGoogleEmail = profile?.email_verified === true || String(profile?.email_verified) === "true";

      // Only allow Google sign-in if the account already exists & linked to Google,
      // or the user explicitly started "Register with Google" flow.
      if (!existing) {
        if (!regId) return "/login?error=GOOGLE_NOT_REGISTERED";

        const reg = await prisma.oauthRegistration
          .findUnique({ where: { id: regId }, select: { id: true, expiresAt: true } })
          .catch(() => null);
        if (!reg) return "/register?error=OAUTH_REG_EXPIRED";
        if (reg.expiresAt.getTime() < Date.now()) return "/register?error=OAUTH_REG_EXPIRED";
        return true;
      }

      const linkedGoogle = existing.accounts.some((a) => a.provider === "google");
      if (!existing.isActive) return "/login?error=USER_DISABLED";
      if (!linkedGoogle) {
        // Allow explicit account linking flow, or trusted Google email auto-link.
        // Google `email_verified=true` is safe enough to avoid OAuthAccountNotLinked for existing credential users.
        if ((oauthLink === "1" || isTrustedGoogleEmail) && account?.providerAccountId) {
          const provider = account.provider;
          const providerAccountId = account.providerAccountId;

          const existingAccount = await prisma.account
            .findUnique({ where: { provider_providerAccountId: { provider, providerAccountId } }, select: { userId: true } })
            .catch(() => null);

          // If the Google account is already linked to a different user, block for safety.
          if (existingAccount && existingAccount.userId !== existing.id) return "/login?error=GOOGLE_ACCOUNT_IN_USE";

          if (!existingAccount) {
            await prisma.account.create({
              data: {
                userId: existing.id,
                type: account.type,
                provider,
                providerAccountId,
                refresh_token: account.refresh_token ?? null,
                access_token: account.access_token ?? null,
                expires_at: typeof account.expires_at === "number" ? account.expires_at : null,
                token_type: account.token_type ?? null,
                scope: account.scope ?? null,
                id_token: account.id_token ?? null,
                session_state: typeof account.session_state === "string" ? account.session_state : null,
              },
            });
          }
          return true;
        }

        // Default: Do not allow logging in with Google if the account was created with another method.
        return "/login?error=GOOGLE_NOT_REGISTERED";
      }

      return true;
    },
    jwt: async ({ token, user, trigger }) => {
      const u = user as { id?: string; email?: string | null; name?: string | null; image?: string | null; isSuperAdmin?: boolean; emailVerified?: string | null } | undefined;
      if (u?.id) {
        token.sub = u.id;
        token.email = u.email ?? token.email;
        token.name = u.name ?? token.name;
        token.picture = u.image ?? token.picture;
        token.isSuperAdmin = Boolean(u.isSuperAdmin);
        token.emailVerified = u.emailVerified ?? null;
      }
      if (token.sub && (trigger !== "signIn" || !user)) {
        if (typeof token.emailVerified !== "boolean" && typeof token.emailVerified !== "string") {
          const cached = await getCachedAuthUser(token.sub);
          if (cached) {
            token.email = cached.email ?? token.email;
            token.name = cached.name ?? token.name;
            token.picture = cached.image ?? token.picture;
            token.isSuperAdmin = cached.isSuperAdmin;
            token.emailVerified = cached.emailVerified ?? null;
          }
        }
      }
      return token;
    },
    session: async ({ session, token }) => {
      const endSession = createDevTimer("auth.session.callback");
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.email = typeof token.email === "string" ? token.email : session.user.email;
        session.user.name = typeof token.name === "string" ? token.name : session.user.name;
        session.user.image = typeof token.picture === "string" ? token.picture : session.user.image;
        (session.user as unknown as Record<string, unknown>).isSuperAdmin = Boolean(token.isSuperAdmin);
        (session.user as unknown as Record<string, unknown>).emailVerified = typeof token.emailVerified === "boolean"
          ? token.emailVerified
          : token.emailVerified === null
            ? null
            : Boolean(token.emailVerified);
      }
      endSession();
      return session;
    },
  },
  events: {
    signIn: async ({ user, account, isNewUser }) => {
      if (account?.provider !== "google") return;
      const uid = user.id;
      const uemail = user.email ?? null;
      if (!uid) return;

      await writeAuthLog({
        userId: uid,
        email: uemail ?? undefined,
        event: isNewUser ? "SIGNUP_SUCCESS" : "LOGIN_SUCCESS",
        provider: "google",
      }).catch(() => {});

      // Mark email verified for Google accounts.
      await prisma.user
        .update({ where: { id: uid }, data: { emailVerified: new Date() } })
        .catch(() => {});
      await setCachedEmailVerified(uid, true);
      const cachedGoogleUser = await getCachedAuthUser(uid) ?? {};
      await setCachedAuthUser({
        id: uid,
        email: uemail ?? (cachedGoogleUser as Record<string, unknown>).email as string | null ?? null,
        name: user.name ?? (cachedGoogleUser as Record<string, unknown>).name as string | null ?? null,
        image: user.image ?? (cachedGoogleUser as Record<string, unknown>).image as string | null ?? null,
        isSuperAdmin: (cachedGoogleUser as Record<string, unknown>).isSuperAdmin as boolean ?? false,
        emailVerified: new Date().toISOString(),
      });

      const cookieStore = await cookies();
      const regId = cookieStore.get("oauth_reg_id")?.value ?? null;
      if (!regId) return;

      // Finalize Google registration by creating tenant + roles + membership.
      // Only do this if user is new OR has no memberships yet.
      const membershipCount = await prisma.tenantUser.count({ where: { userId: uid } }).catch(() => 0);
      if (!isNewUser && membershipCount > 0) return;

      const reg = await consumeOauthRegistration({ id: regId }).catch(() => null);
      if (!reg) return;

      await prisma.user
        .update({
          where: { id: uid },
          data: { name: reg.ownerName || (user.name ?? null), phone: reg.phone ?? null },
        })
        .catch(() => {});

      await createTenantForExistingUser({
        userId: uid,
        tenantName: reg.tenantName,
        planSlug: reg.planSlug ?? undefined,
      }).catch(() => {});
    },
  },
});

