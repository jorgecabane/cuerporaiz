import type { Role } from "@/lib/domain/role";

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    email?: string;
    name?: string | null;
    role?: Role;
    centerId?: string;
  }
}
