import type { CategoryQuotaUsage } from "@/lib/application/get-category-quota-usage";

/**
 * Modo de operación del shell de biblioteca virtual.
 * - `public`: usuario no autenticado, navega solo por catálogo.
 * - `authenticated`: usuario autenticado en el panel; con o sin plan ON_DEMAND.
 */
export type BibliotecaMode =
  | { kind: "public" }
  | {
      kind: "authenticated";
      unlockedLessonIds: string[];
      quotaUsage: CategoryQuotaUsage[];
      unlimited: boolean;
      hasOnDemandPlan: boolean;
    };

/**
 * Esquema de routing del shell.
 * - `path`: drill-down via URL paths (`/catalogo/<cat>/<prac>`). SEO friendly.
 * - `query`: drill-down via query params (`?practice=...&lesson=...`). SPA-like.
 */
export type RoutingMode = "path" | "query";

export interface LessonData {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  level: string | null;
  intensity: string | null;
  targetAudience: string | null;
  equipment: string | null;
  tags: string | null;
  thumbnailUrl: string | null;
  promoVideoUrl: string | null;
  videoUrl: string | null;
  practiceId: string;
}

export interface PracticeData {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  categoryId: string;
  lessons: LessonData[];
}

export interface CategoryData {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  practices: PracticeData[];
}

export interface NavigationTarget {
  category?: string | null;
  practice?: string | null;
  lesson?: string | null;
}

export function buildBibliotecaHref(
  basePath: string,
  routingMode: RoutingMode,
  target: NavigationTarget
): string {
  if (routingMode === "path") {
    if (target.category && target.practice) {
      return `${basePath}/${target.category}/${target.practice}`;
    }
    if (target.category) return `${basePath}/${target.category}`;
    return basePath;
  }
  // query mode
  const params = new URLSearchParams();
  if (target.category) params.set("category", target.category);
  if (target.practice) params.set("practice", target.practice);
  if (target.lesson) params.set("lesson", target.lesson);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
