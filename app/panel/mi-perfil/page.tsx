import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { userRepository } from "@/lib/adapters/db";
import { prisma } from "@/lib/adapters/db/prisma";
import Link from "next/link";
import ProfileForm from "./ProfileForm";
import PasswordForm from "./PasswordForm";
import PlanSummaryCard from "./PlanSummaryCard";
import EmailPreferencesForm from "./EmailPreferencesForm";

const TABS = [
  { key: "perfil", label: "Mis datos" },
  { key: "plan", label: "Mi plan" },
  { key: "correos", label: "Correos" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function MiPerfilPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/mi-perfil");

  const { tab } = await searchParams;
  const activeTab: TabKey = (TABS.some((t) => t.key === tab) ? tab : "perfil") as TabKey;
  const user = await userRepository.findById(session.user.id);
  if (!user) redirect("/auth/login");

  const userAuth = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true, googleId: true },
  });
  const hasPassword = !!userAuth?.passwordHash && userAuth.passwordHash !== "";
  const hasGoogle = !!userAuth?.googleId;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-lg font-semibold text-[var(--color-text)] mb-4">Mi perfil</h1>

      {/* Tab navigation */}
      <nav className="flex gap-1 border-b border-[var(--color-border)] mb-6">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/panel/mi-perfil?tab=${t.key}`}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.key
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {/* Tab content */}
      {activeTab === "perfil" && (
        <>
          <ProfileForm
            user={{
              name: user.name,
              lastName: user.lastName,
              phone: user.phone,
              rut: user.rut,
              birthday: user.birthday?.toISOString().split("T")[0] ?? null,
              sex: user.sex,
            }}
          />
          {hasGoogle && (
            <p className="text-xs text-green-700 mb-4">✓ Cuenta vinculada con Google</p>
          )}
          <PasswordForm hasPassword={hasPassword} />
        </>
      )}

      {activeTab === "plan" && (
        <PlanSummaryCard userId={session.user.id} centerId={session.user.centerId} />
      )}

      {activeTab === "correos" && <EmailPreferencesForm />}
    </div>
  );
}
