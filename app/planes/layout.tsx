import { auth } from "@/auth";
import { redirect } from "next/navigation";

/**
 * /planes redirige a /panel/tienda si el usuario está logueado con centro.
 * Si no está logueado, redirige a login con callbackUrl=/panel/tienda.
 */
export default async function PlanesLayout(_props: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/panel/tienda");
  }
  if (session.user.centerId) {
    redirect("/panel/tienda");
  }
  redirect("/panel");
}
