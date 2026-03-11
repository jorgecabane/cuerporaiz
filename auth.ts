import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
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
        const { centerRepository } = await import("@/lib/adapters/db");
        const email = String(credentials.email);
        const password = String(credentials.password);
        const centerIdOrSlug = String(credentials.centerId);
        const center = await centerRepository.findBySlug(centerIdOrSlug) ?? await centerRepository.findById(centerIdOrSlug);
        if (!center) {
          return null;
        }
        try {
          const result = await authService.authenticateWithCredentials(email, password, center.id);
          return {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            role: result.role,
            centerId: result.centerId,
          };
        } catch {
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.centerId = user.centerId;
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
