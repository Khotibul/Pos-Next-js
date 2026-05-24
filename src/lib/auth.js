import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { consumeOauthRegistration } from "@/modules/auth/oauth-registration/service";
import { createTenantForExistingUser } from "@/modules/tenants/service";

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
          }),
        ]
      : []),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        if (!user?.passwordHash) return null;
        if (!user.emailVerified) throw new Error("EMAIL_NOT_VERIFIED");

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
      const email = profile?.email?.toLowerCase?.() ?? profile?.email ?? null;
      if (!email) return false;

      const existing = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          accounts: { select: { provider: true } },
        },
      });

      const cookieStore = await cookies();
      const regId = cookieStore.get("oauth_reg_id")?.value ?? null;

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
      // Do not allow logging in with Google if the account was created with another method.
      if (!linkedGoogle) return "/login?error=GOOGLE_NOT_REGISTERED";

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

