import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { centerRepository } from "@/lib/adapters/db";
import { PanelShell } from "@/components/panel/PanelShell";
import { isAdminRole } from "@/lib/domain/role";

/**
 * Planes usa el mismo cascarón que el panel (sidebar) porque requiere sesión.
 */
export default async function PlanesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.centerId) {
    redirect("/auth/login?callbackUrl=/planes");
  }
  const centerId = session.user.centerId;
  const center = await centerRepository.findById(centerId);
  const centerName = center?.name ?? centerId;
  const isAdmin = isAdminRole(session.user.role);

  return (
    <PanelShell
      isAdmin={isAdmin}
      user={{ name: session.user.name ?? undefined, email: session.user.email ?? "" }}
      centerName={centerName}
    >
      {children}
    </PanelShell>
  );
}
