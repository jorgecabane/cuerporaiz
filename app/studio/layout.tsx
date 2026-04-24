import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import { isSanityConfigured } from "@/sanity/env";

export const metadata = {
  title: "Studio — Cuerpo Raíz",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  if (!isSanityConfigured()) {
    notFound();
  }

  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/studio");
  }
  if (!isAdminRole(session.user.role)) {
    redirect("/panel");
  }

  return <>{children}</>;
}
