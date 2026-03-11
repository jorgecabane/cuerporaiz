"use client";

import { useTransition } from "react";
import { createPlan } from "../actions";
import { Button } from "@/components/ui/Button";

type PlanType = "PACK" | "MEMBERSHIP";

export function PlanFormCreate({ slugError }: { slugError?: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData: FormData) => {
        const name = (formData.get("name") as string)?.trim();
        const slug = (formData.get("slug") as string)?.trim();
        const description = (formData.get("description") as string)?.trim() || null;
        const amountCents = Number(formData.get("amountCents"));
        const currency = (formData.get("currency") as string)?.trim() || "CLP";
        const type = (formData.get("type") as PlanType) || "PACK";
        if (!name || !slug || Number.isNaN(amountCents) || amountCents < 0) return;
        startTransition(() =>
          createPlan({
            name,
            slug,
            description,
            amountCents,
            currency,
            type,
          })
        );
      }}
      className="space-y-4"
    >
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Nombre
        </label>
        <input
          id="name"
          name="name"
          required
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
        />
      </div>
      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Slug (único en el centro)
        </label>
        <input
          id="slug"
          name="slug"
          required
          placeholder="pack-6-clases"
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Descripción (opcional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="amountCents" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Monto (centavos)
          </label>
          <input
            id="amountCents"
            name="amountCents"
            type="number"
            min={0}
            required
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
          />
        </div>
        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Moneda
          </label>
          <input
            id="currency"
            name="currency"
            defaultValue="CLP"
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
          />
        </div>
      </div>
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Tipo
        </label>
        <select
          id="type"
          name="type"
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
        >
          <option value="PACK">Pack</option>
          <option value="MEMBERSHIP">Membresía</option>
        </select>
      </div>
      {slugError && (
        <p className="text-sm text-red-600">Ese slug ya existe en este centro.</p>
      )}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {isPending ? "Guardando…" : "Crear plan"}
        </button>
        <Button href="/panel/planes" variant="secondary">
          Cancelar
        </Button>
      </div>
    </form>
  );
}
