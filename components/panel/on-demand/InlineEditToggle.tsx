"use client";

import { useState } from "react";

type InlineEditToggleProps = {
  viewContent: React.ReactNode;
  editContent: React.ReactNode;
  footer?: React.ReactNode;
  editLabel?: string;
};

export function InlineEditToggle({
  viewContent,
  editContent,
  footer,
  editLabel = "Editar",
}: InlineEditToggleProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      {isEditing ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">{editLabel}</h3>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              Cancelar
            </button>
          </div>
          {editContent}
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">{viewContent}</div>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="shrink-0 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-text)] transition-colors"
            >
              {editLabel}
            </button>
          </div>
        </>
      )}
      {footer && (
        <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
          {footer}
        </div>
      )}
    </div>
  );
}
