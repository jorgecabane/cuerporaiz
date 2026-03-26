import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import Link from "next/link";
import {
  onDemandCategoryRepository,
  onDemandPracticeRepository,
} from "@/lib/adapters/db";
import { CONTENT_STATUS_LABELS } from "@/lib/domain/on-demand";
import { CategoryForm } from "@/components/panel/on-demand/CategoryForm";

export default async function CategoriasPage() {
  const session = await auth();
  if (!session?.user?.centerId || !isAdminRole(session.user.role)) redirect("/panel");
  const centerId = session.user.centerId;

  const categories = await onDemandCategoryRepository.findByCenterId(centerId);

  const practiceCounts = await Promise.all(
    categories.map(async (cat) => {
      const practices = await onDemandPracticeRepository.findByCategoryId(cat.id);
      return { id: cat.id, count: practices.length };
    })
  );
  const countMap = Object.fromEntries(practiceCounts.map((p) => [p.id, p.count]));

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between gap-4 mb-2">
        <h1 className="font-display text-2xl font-bold text-[var(--color-primary)]">
          Categorías On Demand
        </h1>
      </div>
      <p className="text-[var(--color-text-muted)] mb-6">
        Organiza el contenido on-demand en categorías y prácticas.
      </p>

      <div className="mb-6">
        <CategoryForm />
      </div>

      {categories.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-[var(--color-text-muted)]">
            No hay categorías. Crea una desde &quot;Nueva categoría&quot;.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {categories.map((cat) => (
            <li key={cat.id}>
              <Link
                href={`/panel/on-demand/categorias/${cat.id}`}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 hover:border-[var(--color-primary)] transition-colors"
              >
                <div>
                  <p className="font-semibold text-[var(--color-text)]">{cat.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {countMap[cat.id] ?? 0} prácticas
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    cat.status === "PUBLISHED"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {CONTENT_STATUS_LABELS[cat.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <Link
          href="/panel"
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          ← Volver al panel
        </Link>
      </div>
    </div>
  );
}
