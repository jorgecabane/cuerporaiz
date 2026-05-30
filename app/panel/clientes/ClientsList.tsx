"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ClientListSkeleton } from "@/components/ui/PanelSkeletons";

type ClientItem = {
  id: string;
  name: string | null;
  email: string;
  isLegacyClient: boolean;
};

type ApiResponse = {
  items: ClientItem[];
  total: number;
  page: number;
  pageSize: number;
};

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

export function ClientsList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q")?.trim() ?? "";
  const pageParam = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam >= 1 ? Math.floor(pageParam) : 1;

  const [draft, setDraft] = useState(q);
  const [items, setItems] = useState<ClientItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateQuery = useCallback(
    (mutator: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutator(params);
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (draft === q) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateQuery((params) => {
        const next = draft.trim();
        if (next) params.set("q", next);
        else params.delete("q");
        params.delete("page");
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [draft, q, updateQuery]);

  useEffect(() => {
    setDraft(q);
  }, [q]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    if (q) params.set("q", q);

    fetch(`/api/admin/clients?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? `Error al cargar (HTTP ${res.status})`);
        }
        return (await res.json()) as ApiResponse;
      })
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((e) => {
        if (cancelled || (e instanceof DOMException && e.name === "AbortError")) return;
        setError(e instanceof Error ? e.message : "Error al cargar estudiantes");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [q, page]);

  const totalPages = total != null ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;
  const from = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = total ? Math.min(page * PAGE_SIZE, total) : 0;

  const subtitle = useMemo(() => {
    if (loading && total == null) return "Cargando…";
    if (total == null) return "";
    if (total === 0) return q ? "" : "0 estudiantes.";
    return `${total} estudiante${total !== 1 ? "s" : ""} · Mostrando ${from}–${to}`;
  }, [loading, total, q, from, to]);

  const goToPage = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(1, next), totalPages);
      updateQuery((params) => {
        if (clamped === 1) params.delete("page");
        else params.set("page", String(clamped));
      });
    },
    [updateQuery, totalPages]
  );

  const showSkeleton = loading && total == null;

  return (
    <div>
      <div className="mb-4">
        <label htmlFor="clients-search" className="sr-only">
          Buscar estudiante
        </label>
        <input
          id="clients-search"
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Buscar por nombre o email…"
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40"
        />
      </div>

      <p className="text-[var(--color-text-muted)] mb-6 text-sm" aria-live="polite">
        {subtitle}
      </p>

      {showSkeleton ? (
        <ClientListSkeleton />
      ) : items.length === 0 && !error ? (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6">
          <p className="text-[var(--color-text-muted)]">
            {q
              ? `Sin resultados para «${q}».`
              : "No hay estudiantes registrados en este centro."}
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
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-[var(--color-primary)]">
                    {user.name || user.email}
                  </p>
                  {user.isLegacyClient && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[var(--color-surface-alt,#f3f4f6)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                      Migrado
                    </span>
                  )}
                </div>
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

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onChange={goToPage}
          disabled={loading}
        />
      )}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
  disabled,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
  disabled: boolean;
}) {
  const pages = useMemo(() => buildPageList(page, totalPages), [page, totalPages]);

  return (
    <nav
      aria-label="Paginación de estudiantes"
      className="mt-6 flex flex-wrap items-center justify-center gap-1"
    >
      <PageButton
        ariaLabel="Página anterior"
        disabled={disabled || page <= 1}
        onClick={() => onChange(page - 1)}
      >
        ‹
      </PageButton>
      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span
            key={`ellipsis-${i}`}
            className="px-2 text-sm text-[var(--color-text-muted)]"
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <PageButton
            key={p}
            ariaLabel={`Ir a página ${p}`}
            ariaCurrent={p === page ? "page" : undefined}
            active={p === page}
            disabled={disabled}
            onClick={() => onChange(p)}
          >
            {p}
          </PageButton>
        )
      )}
      <PageButton
        ariaLabel="Página siguiente"
        disabled={disabled || page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        ›
      </PageButton>
    </nav>
  );
}

function PageButton({
  children,
  onClick,
  disabled,
  active,
  ariaLabel,
  ariaCurrent,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  ariaLabel: string;
  ariaCurrent?: "page";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      className={
        "min-w-9 rounded-[var(--radius-md)] border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 " +
        (active
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-border)]/40")
      }
    >
      {children}
    </button>
  );
}

function buildPageList(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("ellipsis");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push("ellipsis");
  pages.push(total);
  return pages;
}
