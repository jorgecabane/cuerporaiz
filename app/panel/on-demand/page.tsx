import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";

export default async function OnDemandRedirect() {
  const session = await auth();
  if (session?.user && isAdminRole(session.user.role)) {
    redirect("/panel/on-demand/categorias");
  }
  redirect("/panel/replay");
}
