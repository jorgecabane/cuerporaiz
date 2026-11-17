import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain/role";

/** Para server actions del panel: centerId de la sesión admin, o redirige a /panel. */
export async function requireAdminCenterId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.centerId || !isAdminRole(session.user.role)) redirect("/panel");
  return session.user.centerId;
}
