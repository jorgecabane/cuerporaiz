"use client";

import { useState } from "react";
import { Copy, ChevronDown } from "lucide-react";
import { SITE_LINK_SUGGESTIONS, type SiteLinkGroup } from "@/lib/constants/site-links";
import { toast } from "@/components/ui/Toast";

const GROUP_LABELS: Record<SiteLinkGroup, string> = {
  home: "Secciones del home",
  page: "Otras páginas",
};

export function SiteLinkPicker({ onPick }: { onPick?: (href: string) => void }) {
  const [open, setOpen] = useState(false);

  async function copyToClipboard(href: string) {
    try {
      await navigator.clipboard.writeText(href);
      toast(`Link copiado: ${href}`);
    } catch {
      toast("No pude copiar. Copialo a mano.");
    }
  }

  const grouped = SITE_LINK_SUGGESTIONS.reduce<Record<SiteLinkGroup, typeof SITE_LINK_SUGGESTIONS>>(
    (acc, s) => {
      (acc[s.group] ||= []).push(s);
      return acc;
    },
    { home: [], page: [] },
  );

  return (
    <div className="text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <ChevronDown
          size={12}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
        Usar un link del sitio
      </button>

      {open && (
        <div className="mt-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
          {(Object.keys(grouped) as SiteLinkGroup[]).map((group) => (
            <div key={group} className="mb-2 last:mb-0">
              <p className="mb-1 px-1 text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
                {GROUP_LABELS[group]}
              </p>
              <ul className="space-y-0.5">
                {grouped[group].map(({ href, label }) => (
                  <li key={href} className="flex items-center justify-between gap-2 rounded px-1 py-1 hover:bg-[var(--color-primary-light)]">
                    <button
                      type="button"
                      onClick={() => {
                        onPick?.(href);
                        copyToClipboard(href);
                      }}
                      className="flex-1 text-left font-mono text-[11px] text-[var(--color-text)]"
                    >
                      {href}
                    </button>
                    <span className="truncate text-[var(--color-text-muted)]">{label}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(href)}
                      aria-label={`Copiar ${href}`}
                      className="shrink-0 rounded p-1 text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                    >
                      <Copy size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
