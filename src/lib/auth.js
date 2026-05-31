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

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

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
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const ip =
          request?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() ||
          request?.headers?.get?.("x-real-ip") ||
          "unknown";
        const loginLimit = await checkRateLimit("login", `${ip}:${parsed.data.email.toLowerCase()}`);
        if (!loginLimit.success) throw new Error("RATE_LIMITED");

        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        if (!user?.passwordHash) return null;
        if (!user.emailVerified) {
          await setCachedEmailVerified(user.id, false);
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
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
          accounts: { select: { provider: true } },
        },
      });

      const cookieStore = await cookies();
      const regId = cookieStore.get("oauth_reg_id")?.value ?? null;
      const oauthLink = cookieStore.get("oauth_link")?.value ?? null;
      const isTrustedGoogleEmail = profile?.email_verified === true || profile?.email_verified === "true";

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
                session_state: account.session_state ?? null,
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
    jwt: async ({ token, user }) => {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
  events: {
    signIn: async ({ user, account, isNewUser }) => {
      if (account?.provider !== "google") return;

      // Mark email verified for Google accounts.
      await prisma.user
        .update({ where: { id: user.id }, data: { emailVerified: new Date() } })
        .catch(() => {});
      await setCachedEmailVerified(user.id, true);

      const cookieStore = await cookies();
      const regId = cookieStore.get("oauth_reg_id")?.value ?? null;
      if (!regId) return;

      // Finalize Google registration by creating tenant + roles + membership.
      // Only do this if user is new OR has no memberships yet.
      const membershipCount = await prisma.tenantUser.count({ where: { userId: user.id } }).catch(() => 0);
      if (!isNewUser && membershipCount > 0) return;

      const reg = await consumeOauthRegistration({ id: regId }).catch(() => null);
      if (!reg) return;

      await prisma.user
        .update({
          where: { id: user.id },
          data: { name: reg.ownerName || user.name, phone: reg.phone ?? null },
        })
        .catch(() => {});

      await createTenantForExistingUser({
        userId: user.id,
        tenantName: reg.tenantName,
        planSlug: reg.planSlug ?? undefined,
      }).catch(() => {});
    },
  },
});

