"use client";

import { useState } from "react";
import type { OnDemandCategory } from "@/lib/domain/on-demand";

interface QuotaRow {
  categoryId: string;
  maxLessons: number;
}

interface QuotaEditorProps {
  categories: OnDemandCategory[];
  initialQuotas?: QuotaRow[];
}

export function QuotaEditor({ categories, initialQuotas = [] }: QuotaEditorProps) {
  const [quotas, setQuotas] = useState<QuotaRow[]>(initialQuotas);

  const usedCategoryIds = new Set(quotas.map((q) => q.categoryId));
  const availableCategories = categories.filter((c) => !usedCategoryIds.has(c.id));

  function addRow() {
    if (availableCategories.length === 0) return;
    setQuotas((prev) => [...prev, { categoryId: availableCategories[0].id, maxLessons: 1 }]);
  }

  function removeRow(index: number) {
    setQuotas((prev) => prev.filter((_, i) => i !== index));
  }

  function updateCategoryId(index: number, categoryId: string) {
    setQuotas((prev) =>
      prev.map((row, i) => (i === index ? { ...row, categoryId } : row))
    );
  }

  function updateMaxLessons(index: number, value: string) {
    const n = parseInt(value, 10);
    if (!Number.isNaN(n) && n > 0) {
      setQuotas((prev) => prev.map((row, i) => (i === index ? { ...row, maxLessons: n } : row)));
    }
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="quotas" value={JSON.stringify(quotas)} />

      {quotas.length > 0 && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
                <th className="px-3 py-2 text-left font-medium text-[var(--color-text-muted)]">Categoría</th>
                <th className="px-3 py-2 text-left font-medium text-[var(--color-text-muted)] w-32">Máx. lecciones</th>
                <th className="px-3 py-2 w-16" />
              </tr>
            </thead>
            <tbody>
              {quotas.map((row, index) => {
                const selectableCategories = categories.filter(
                  (c) => c.id === row.categoryId || !usedCategoryIds.has(c.id)
                );
                return (
                  <tr key={index} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="px-3 py-2">
                      <select
                        value={row.categoryId}
                        onChange={(e) => updateCategoryId(index, e.target.value)}
                        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm text-[var(--color-text)]"
                      >
                        {selectableCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        value={row.maxLessons}
                        onChange={(e) => updateMaxLessons(index, e.target.value)}
                        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm text-[var(--color-text)]"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        className="text-sm text-[var(--color-error)] hover:underline"
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {availableCategories.length > 0 && (
        <button
          type="button"
          onClick={addRow}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)]"
        >
          + Agregar categoría
        </button>
      )}

      {quotas.length === 0 && (
        <p className="text-xs text-[var(--color-text-muted)]">
          Sin cuotas definidas: las lecciones desbloqueables no estarán limitadas por categoría.
        </p>
      )}
    </div>
  );
}
