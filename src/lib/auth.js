import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { OAuth2Client } from "google-auth-library";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const googleIdTokenSchema = z.object({
  token: z.string().min(20),
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
    Credentials({
      id: "google-id-token",
      name: "Google",
      credentials: {
        token: { label: "Google ID Token", type: "text" },
      },
      authorize: async (raw) => {
        const parsed = googleIdTokenSchema.safeParse(raw);
        if (!parsed.success) return null;
        const token = parsed.data.token;
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
        if (!clientId) return null;

        const oauthClient = new OAuth2Client();
        const ticket = await oauthClient.verifyIdToken({ idToken: token, audience: clientId });
        const payload = ticket.getPayload();
        if (!payload?.sub || !payload.email) return null;

        const provider = "google-id-token";
        const providerAccountId = payload.sub;

        const existingAccount = await prisma.account.findUnique({
          where: { provider_providerAccountId: { provider, providerAccountId } },
          select: { user: { select: { id: true, email: true, name: true, image: true } } },
        });

        if (existingAccount?.user) {
          return {
            id: existingAccount.user.id,
            email: existingAccount.user.email,
            name: existingAccount.user.name,
            image: existingAccount.user.image,
          };
        }

        const existingUserByEmail = await prisma.user.findUnique({
          where: { email: payload.email },
          select: { id: true, email: true, name: true, image: true },
        });

        const user =
          existingUserByEmail ??
          (await prisma.user.create({
            data: {
              email: payload.email,
              name: payload.name || payload.email.split("@")[0],
              image: payload.picture || null,
              emailVerified: new Date(),
            },
            select: { id: true, email: true, name: true, image: true },
          }));

        await prisma.account.create({
          data: {
            userId: user.id,
            type: "oauth",
            provider,
            providerAccountId,
            id_token: token,
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
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
    jwt: async ({ token, user }) => {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
