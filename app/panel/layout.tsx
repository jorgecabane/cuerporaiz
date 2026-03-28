import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import { centerRepository, userRepository } from "@/lib/adapters/db";
import { prisma } from "@/lib/adapters/db/prisma";
import { PanelShell } from "@/components/panel/PanelShell";
import { EmailVerificationBanner } from "@/components/panel/EmailVerificationBanner";

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

  const userAuth = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerifiedAt: true },
  });
  const needsVerification = !userAuth?.emailVerifiedAt;

  return (
    <>
      {needsVerification && <EmailVerificationBanner />}
      <PanelShell
        isAdmin={isAdmin}
        user={{ name: session.user.name ?? undefined, email: session.user.email ?? "" }}
        centerName={centerName}
      >
        {children}
      </PanelShell>
    </>
  );
}
