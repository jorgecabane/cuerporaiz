"use client";

import { useFormStatus } from "react-dom";
import { createDiscipline, updateDiscipline } from "./actions";
import { Button } from "@/components/ui/Button";
import type { Discipline } from "@/lib/domain";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
    >
      {pending ? "Guardando…" : label}
    </button>
  );
}

const PRESET_COLORS = [
  "#2D3B2A", "#B85C38", "#4A90D9", "#7B61FF",
  "#E67E22", "#27AE60", "#E74C3C", "#8E44AD",
  "#16A085", "#F39C12",
];

export function DisciplineForm({ discipline }: { discipline?: Discipline }) {
  const action = discipline ? updateDiscipline : createDiscipline;

  return (
    <form action={action} className="space-y-4">
      {discipline && <input type="hidden" name="id" value={discipline.id} />}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Nombre
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={discipline?.name ?? ""}
          placeholder="ej. Yoga, Pilates, TRX"
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
        />
      </div>
      <div>
        <label htmlFor="color" className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Color (opcional)
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {PRESET_COLORS.map((c) => (
            <label key={c} className="cursor-pointer">
              <input type="radio" name="color" value={c} defaultChecked={discipline?.color === c} className="sr-only peer" />
              <span
                className="inline-block h-8 w-8 rounded-full border-2 border-transparent peer-checked:border-[var(--color-text)] peer-checked:ring-2 peer-checked:ring-[var(--color-primary)]"
                style={{ backgroundColor: c }}
              />
            </label>
          ))}
          <label className="cursor-pointer">
            <input type="radio" name="color" value="" defaultChecked={!discipline?.color} className="sr-only peer" />
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--color-border)] peer-checked:border-[var(--color-text)] peer-checked:ring-2 peer-checked:ring-[var(--color-primary)] text-xs text-[var(--color-text-muted)]">
              —
            </span>
          </label>
        </div>
      </div>
      {discipline && (
        <div>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="hidden" name="active" value="false" />
            <input
              type="checkbox"
              name="active"
              value="true"
              defaultChecked={discipline.active}
              className="rounded border-[var(--color-border)]"
            />
            <span className="text-sm text-[var(--color-text)]">Activa</span>
          </label>
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <SubmitButton label={discipline ? "Guardar cambios" : "Crear disciplina"} />
        <Button href="/panel/disciplinas" variant="secondary">
          Cancelar
        </Button>
      </div>
    </form>
  );
}
