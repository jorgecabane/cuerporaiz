import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import { centerRepository, userRepository } from "@/lib/adapters/db";
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

  const centerId = session.user.centerId as string;
  const center = await centerRepository.findById(centerId);
  const user = await userRepository.findById(session.user.id);

  if (!center || !user) {
    redirect(`/api/auth/signout?callbackUrl=${encodeURIComponent("/auth/login")}`);
  }

  const isAdmin = isAdminRole(session.user.role);
  const centerName = center.name;

  return (
    <PanelShell
      isAdmin={isAdmin}
      user={{ name: session.user.name ?? undefined, email: session.user.email ?? "", imageUrl: user.imageUrl ?? undefined }}
      centerName={centerName}
    >
      {children}
    </PanelShell>
  );
}
