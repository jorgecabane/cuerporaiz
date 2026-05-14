import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import { centerRepository, userRepository, siteConfigRepository } from "@/lib/adapters/db";
import { PanelShell } from "@/components/panel/PanelShell";
import { TimezoneProvider } from "@/components/providers/TimezoneProvider";
import { DEFAULT_TIMEZONE } from "@/lib/datetime/center-timezone";

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
  const [center, user, siteConfig] = await Promise.all([
    centerRepository.findById(centerId),
    userRepository.findById(session.user.id),
    siteConfigRepository.findByCenterId(centerId),
  ]);

  if (!center || !user) {
    redirect(`/api/auth/signout?callbackUrl=${encodeURIComponent("/auth/login")}`);
  }

  const isAdmin = isAdminRole(session.user.role);
  const centerName = center.name;
  const logoUrl = siteConfig?.logoUrl ?? null;

  return (
    <TimezoneProvider value={center.timezone ?? DEFAULT_TIMEZONE}>
      <PanelShell
        isAdmin={isAdmin}
        user={{ name: session.user.name ?? undefined, email: session.user.email ?? "", imageUrl: user.imageUrl ?? undefined }}
        centerName={centerName}
        logoUrl={logoUrl}
      >
        {children}
      </PanelShell>
    </TimezoneProvider>
  );
}
