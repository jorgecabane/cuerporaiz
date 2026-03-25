import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import { siteConfigRepository } from "@/lib/adapters/db";
import Link from "next/link";
import BrandingForm from "./BrandingForm";
import ContactForm from "./ContactForm";

const TABS = [
  { key: "branding", label: "Marca" },
  { key: "secciones", label: "Secciones" },
  { key: "contacto", label: "Contacto" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function PanelSitioPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/sitio");
  if (!isAdminRole(session.user.role)) redirect("/panel");

  const { tab } = await searchParams;
  const activeTab: TabKey = (TABS.some((t) => t.key === tab) ? tab : "branding") as TabKey;

  const config = await siteConfigRepository.findByCenterId(session.user.centerId);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-lg font-semibold text-[var(--color-text)] mb-4">Sitio web</h1>

      {/* Tab navigation */}
      <nav className="flex gap-1 border-b border-[var(--color-border)] mb-6">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/panel/sitio?tab=${t.key}`}
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
      {activeTab === "branding" && <BrandingForm config={config} />}
      {activeTab === "secciones" && (
        <p className="text-sm text-[var(--color-text-muted)]">Secciones</p>
      )}
      {activeTab === "contacto" && <ContactForm config={config} />}
    </div>
  );
}
