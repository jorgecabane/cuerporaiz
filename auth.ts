import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Role } from "@/lib/domain/role";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name?: string | null;
    role?: Role;
    centerId?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: Role;
      centerId: string;
    };
  }
}

const FIVE_MINUTES = 5 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: { params: { prompt: "select_account" } },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
        centerId: { label: "Centro", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.centerId) {
          return null;
        }
        const { authService } = await import("@/lib/adapters/auth");
        const { centerRepository, loginAttemptRepository } = await import("@/lib/adapters/db");
        const { checkRateLimit } = await import("@/lib/application/check-rate-limit");

        const email = String(credentials.email);
        const password = String(credentials.password);
        const centerIdOrSlug = String(credentials.centerId);
        const center =
          (await centerRepository.findBySlug(centerIdOrSlug)) ??
          (await centerRepository.findById(centerIdOrSlug));
        if (!center) {
          return null;
        }

        const rateCheck = await checkRateLimit({
          key: { email, centerId: center.id },
          maxAttempts: 5,
          windowMinutes: 15,
          repo: loginAttemptRepository,
        });
        if (!rateCheck.allowed) {
          throw new Error("RATE_LIMITED");
        }

        try {
          const result = await authService.authenticateWithCredentials(email, password, center.id);
          await loginAttemptRepository.create({
            email,
            centerId: center.id,
            ip: "server",
            success: true,
          });
          return {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            role: result.role,
            centerId: result.centerId,
          };
        } catch (err) {
          if (err instanceof Error && err.message === "RATE_LIMITED") throw err;
          await loginAttemptRepository.create({
            email,
            centerId: center.id,
            ip: "server",
            success: false,
          });
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24, // 24h
  },
  cookies: {
    sessionToken: {
      name: "cuerporaiz.session",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24,
      },
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const { prisma } = await import("@/lib/adapters/db/prisma");
        const email = user.email;
        const googleId = account.providerAccountId;

        const defaultSlug = process.env.DEFAULT_CENTER_SLUG ?? "cuerporaiz";
        const center = await prisma.center.findFirst({ where: { slug: defaultSlug } });
        if (!center) return false;

        const centerId = center.id;

        let dbUser = await prisma.user.findUnique({ where: { email } });

        if (dbUser) {
          const updates: Record<string, unknown> = {};
          if (!dbUser.googleId) updates.googleId = googleId;
          if (!dbUser.emailVerifiedAt) updates.emailVerifiedAt = new Date();
          if (Object.keys(updates).length > 0) {
            await prisma.user.update({ where: { id: dbUser.id }, data: updates });
          }
          const membership = await prisma.userCenterRole.findUnique({
            where: { userId_centerId: { userId: dbUser.id, centerId } },
          });
          if (!membership) {
            await prisma.userCenterRole.create({
              data: { userId: dbUser.id, centerId, role: "STUDENT" },
            });
          }
        } else {
          dbUser = await prisma.user.create({
            data: {
              email,
              passwordHash: "",
              name: user.name ?? null,
              imageUrl: user.image ?? null,
              googleId,
              emailVerifiedAt: new Date(),
            },
          });
          await prisma.userCenterRole.create({
            data: { userId: dbUser.id, centerId, role: "STUDENT" },
          });
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      // Credentials flow: user object is present on first sign-in
      if (user && user.role && user.centerId) {
        const { prisma } = await import("@/lib/adapters/db/prisma");
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { tokenVersion: true },
        });
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.centerId = user.centerId;
        token.tokenVersion = dbUser?.tokenVersion ?? 0;
        token.tokenVersionCheckedAt = Date.now();
        return token;
      }

      // Google OAuth flow: user present but no role/centerId yet
      if (user && !token.centerId) {
        const { prisma } = await import("@/lib/adapters/db/prisma");
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
          include: { memberships: true },
        });
        if (dbUser && dbUser.memberships.length > 0) {
          const membership = dbUser.memberships[0];
          token.id = dbUser.id;
          token.email = dbUser.email;
          token.name = dbUser.name;
          token.role = membership.role;
          token.centerId = membership.centerId;
          token.tokenVersion = dbUser.tokenVersion;
          token.tokenVersionCheckedAt = Date.now();
        }
        return token;
      }

      // Periodic tokenVersion check (every 5 minutes)
      if (
        token.id &&
        token.tokenVersionCheckedAt &&
        Date.now() - (token.tokenVersionCheckedAt as number) < FIVE_MINUTES
      ) {
        return token;
      }

      if (token.id) {
        const { prisma } = await import("@/lib/adapters/db/prisma");
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { tokenVersion: true },
        });
        if (!dbUser || dbUser.tokenVersion !== token.tokenVersion) {
          return {}; // Invalidate session — forces re-login
        }
        token.tokenVersionCheckedAt = Date.now();
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string | null;
        session.user.role = token.role as Role;
        session.user.centerId = token.centerId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  trustHost: true,
});
