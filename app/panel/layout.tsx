import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import { centerRepository } from "@/lib/adapters/db";
import { PanelShell } from "@/components/panel/PanelShell";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/panel");
  }
  const isAdmin = isAdminRole(session.user.role);
  const centerId = session.user.centerId as string;
  const center = await centerRepository.findById(centerId);
  const centerName = center?.name ?? centerId;

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
