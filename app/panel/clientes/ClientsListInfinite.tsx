"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ClientListSkeleton } from "@/components/ui/PanelSkeletons";

type ClientItem = { id: string; name: string | null; email: string };

type ApiResponse = {
  items: ClientItem[];
  total: number;
  page: number;
  pageSize: number;
};

export function ClientsListInfinite({ pageSize = 25 }: { pageSize?: number }) {
  const [items, setItems] = useState<ClientItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canLoadMore = total == null ? true : items.length < total;

  const loadNext = useCallback(async () => {
    if (loading || !canLoadMore) return;
    setLoading(true);
    setError(null);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/admin/clients?page=${nextPage}&pageSize=${pageSize}`);
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Error al cargar (HTTP ${res.status})`);
      }
      const data = (await res.json()) as ApiResponse;
      setItems((prev) => (nextPage === 1 ? data.items : [...prev, ...data.items]));
      setTotal(typeof data.total === "number" ? data.total : null);
      setPage(nextPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar estudiantes");
    } finally {
      setLoading(false);
    }
  }, [canLoadMore, loading, page, pageSize]);

  useEffect(() => {
    // Initial page.
    loadNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (!canLoadMore) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          loadNext();
        }
      },
      { rootMargin: "400px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [canLoadMore, loadNext]);

  const subtitle = useMemo(() => {
    if (total == null) return "Cargando…";
    return `${total} estudiante${total !== 1 ? "s" : ""} en este centro.`;
  }, [total]);

  return (
    <div>
      <p className="text-[var(--color-text-muted)] mb-6">{subtitle}</p>

      {items.length === 0 && loading ? (
        <ClientListSkeleton />
      ) : items.length === 0 && !loading ? (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6">
          <p className="text-[var(--color-text-muted)]">
            No hay estudiantes registrados en este centro.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((user) => (
            <li
              key={user.id}
              className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] transition-shadow"
            >
              <Link href={`/panel/clientes/${user.id}`} className="block">
                <p className="font-medium text-[var(--color-primary)]">
                  {user.name || user.email}
                </p>
                {user.name && (
                  <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                    {user.email}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--color-error,#dc2626)]/30 bg-[var(--color-error-bg,#fef2f2)] p-4">
          <p className="text-sm text-[var(--color-error,#dc2626)]">{error}</p>
        </div>
      )}

      <div ref={sentinelRef} className="h-1 w-full" />

      <div className="mt-6 flex items-center justify-center">
        {canLoadMore ? (
          <button
            type="button"
            onClick={loadNext}
            disabled={loading}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-border)]/40 disabled:opacity-50"
          >
            {loading ? "Cargando…" : "Cargar más"}
          </button>
        ) : (
          total != null && total > 0 && (
            <p className="text-xs text-[var(--color-text-muted)]">
              Mostrando {items.length} de {total}
            </p>
          )
        )}
      </div>
    </div>
  );
}

