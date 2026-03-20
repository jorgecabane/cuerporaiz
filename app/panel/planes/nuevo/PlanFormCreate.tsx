"use client";

import { useTransition, useState } from "react";
import { createPlan } from "../actions";
import { Button } from "@/components/ui/Button";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type PlanType = "LIVE" | "ON_DEMAND" | "MEMBERSHIP_ON_DEMAND";
type BillingMode = "ONE_TIME" | "RECURRING" | "BOTH";
type ValidityPeriod = "MONTHLY" | "QUARTERLY" | "QUADRIMESTRAL" | "SEMESTER" | "ANNUAL";
type ValidityKind = "days" | "period";
type UsesLimit = "unlimited" | "limited";

function parseOptionalInt(v: FormDataEntryValue | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function parseOptionalEnum<T extends string>(v: FormDataEntryValue | null, allowed: T[]): T | null {
  const s = (v as string)?.trim();
  return s && allowed.includes(s as T) ? (s as T) : null;
}

const PERIOD_OPTIONS: { value: ValidityPeriod; label: string }[] = [
  { value: "MONTHLY", label: "Mensual" },
  { value: "QUARTERLY", label: "Trimestral" },
  { value: "QUADRIMESTRAL", label: "Cuatrimestral" },
  { value: "SEMESTER", label: "Semestral" },
  { value: "ANNUAL", label: "Anual" },
];

const PERIOD_LABEL_SINGULAR: Record<ValidityPeriod, string> = {
  MONTHLY: "mes",
  QUARTERLY: "trimestre",
  QUADRIMESTRAL: "cuatrimestre",
  SEMESTER: "semestre",
  ANNUAL: "año",
};

const TYPE_OPTIONS: { value: PlanType; label: string; hint: string }[] = [
  { value: "LIVE", label: "Live", hint: "Con profe en vivo (presencial o por Zoom/Meet)." },
  { value: "ON_DEMAND", label: "On-demand", hint: "Clases grabadas a desbloquear." },
  { value: "MEMBERSHIP_ON_DEMAND", label: "Membresía on-demand", hint: "Acceso a la videoteca on-demand." },
];

export function PlanFormCreate({ slugError }: { slugError?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [validityKind, setValidityKind] = useState<ValidityKind | "">("");
  const [validityDaysInput, setValidityDaysInput] = useState("");
  const [validityPeriodInput, setValidityPeriodInput] = useState<ValidityPeriod | "">("");
  const [planType, setPlanType] = useState<PlanType>("LIVE");
  const [usesLimit, setUsesLimit] = useState<UsesLimit>("unlimited");
  const [billingMode, setBillingMode] = useState<BillingMode | "">("");

  const displaySlug = slugManuallyEdited ? slug : slugify(name);
  const showRecurringDiscount = billingMode === "RECURRING" || billingMode === "BOTH";

  const showDistribution = planType === "LIVE" || planType === "ON_DEMAND";

  return (
    <form
      action={(formData: FormData) => {
        const nameVal = (formData.get("name") as string)?.trim();
        const slugVal = (formData.get("slug") as string)?.trim();
        const description = (formData.get("description") as string)?.trim() || null;
        const amountCents = Number(formData.get("amountCents"));
        const type = (formData.get("type") as PlanType) || "LIVE";
        const kind = (formData.get("validityKind") as ValidityKind) || "";
        const validityDays = kind === "days" ? parseOptionalInt(formData.get("validityDays")) : null;
        const validityPeriod = kind === "period" ? parseOptionalEnum(formData.get("validityPeriod"), ["MONTHLY", "QUARTERLY", "QUADRIMESTRAL", "SEMESTER", "ANNUAL"]) as ValidityPeriod | null : null;
        const billingModeVal = parseOptionalEnum(formData.get("billingMode"), ["ONE_TIME", "RECURRING", "BOTH"]) as BillingMode | null;
        const recurringDiscountRaw = parseOptionalInt(formData.get("recurringDiscountPercent"));
        const recurringDiscountPercent =
          (billingModeVal === "RECURRING" || billingModeVal === "BOTH") && recurringDiscountRaw != null
            ? Math.min(100, Math.max(0, recurringDiscountRaw))
            : undefined;
        const usesLimitVal = formData.get("usesLimit") as UsesLimit | null;
        const maxReservations =
          usesLimitVal === "limited" ? parseOptionalInt(formData.get("maxReservationsCount")) : null;
        const maxReservationsPerDay = parseOptionalInt(formData.get("maxReservationsPerDay"));
        const maxReservationsPerWeek = parseOptionalInt(formData.get("maxReservationsPerWeek"));
        if (!nameVal || !slugVal || Number.isNaN(amountCents) || amountCents < 0) return;
        startTransition(() =>
          createPlan({
            name: nameVal,
            slug: slugVal,
            description,
            amountCents,
            type,
            validityDays: validityDays ?? undefined,
            validityPeriod: validityPeriod ?? undefined,
            billingMode: billingModeVal ?? undefined,
            recurringDiscountPercent,
            maxReservations: usesLimitVal === "unlimited" ? null : (maxReservations ?? undefined),
            maxReservationsPerDay: maxReservationsPerDay ?? undefined,
            maxReservationsPerWeek: maxReservationsPerWeek ?? undefined,
          })
        );
      }}
      className="space-y-4"
    >
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="slug" value={displaySlug} />
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Nombre
        </label>
        <input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
        />
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          El nombre lo define el admin del centro (ej. &quot;Pack 6 clases&quot;, &quot;Membresía mensual&quot;).
        </p>
      </div>
      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Identificador del plan (slug)
        </label>
        <input
          id="slug"
          required
          value={displaySlug}
          onChange={(e) => {
            setSlugManuallyEdited(true);
            setSlug(e.target.value);
          }}
          placeholder="pack-6-clases"
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
        />
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Se usará en el enlace único del plan (puedes editarlo).
        </p>
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
      <div>
        <label htmlFor="amountCents" className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Valor del plan
        </label>
        <input
          id="amountCents"
          name="amountCents"
          type="number"
          min={0}
          required
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
        />
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          La moneda se toma de la configuración del centro.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Tipo de plan
        </label>
        <select
          id="type"
          name="type"
          value={planType}
          onChange={(e) => setPlanType(e.target.value as PlanType)}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {TYPE_OPTIONS.find((o) => o.value === planType)?.hint}
        </p>
      </div>

      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)]/50 p-3 space-y-3">
        <p className="text-sm font-medium text-[var(--color-text)]">Vigencia</p>
        <p className="text-xs text-[var(--color-text-muted)] mb-2">
          ¿Cómo es la vigencia del plan?
        </p>
        <div className="flex flex-wrap gap-4">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="validityKind"
              value="days"
              checked={validityKind === "days"}
              onChange={() => setValidityKind("days")}
              className="rounded-full border-[var(--color-border)]"
            />
            <span className="text-sm text-[var(--color-text)]">Por días</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="validityKind"
              value="period"
              checked={validityKind === "period"}
              onChange={() => setValidityKind("period")}
              className="rounded-full border-[var(--color-border)]"
            />
            <span className="text-sm text-[var(--color-text)]">Por período</span>
          </label>
        </div>
        {validityKind === "days" && (
          <div className="mt-3">
            <label htmlFor="validityDays" className="block text-xs text-[var(--color-text-muted)] mb-0.5">
              Días
            </label>
            <input
              id="validityDays"
              name="validityDays"
              type="number"
              min={1}
              required
              placeholder="ej. 15"
              value={validityDaysInput}
              onChange={(e) => setValidityDaysInput(e.target.value)}
              className="w-full max-w-[120px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
          </div>
        )}
        {validityKind === "period" && (
          <div className="mt-3">
            <label htmlFor="validityPeriod" className="block text-xs text-[var(--color-text-muted)] mb-0.5">
              Período (1 por ese período)
            </label>
            <select
              id="validityPeriod"
              name="validityPeriod"
              required
              value={validityPeriodInput}
              onChange={(e) => setValidityPeriodInput(e.target.value as ValidityPeriod | "")}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
            >
              <option value="">Selecciona período</option>
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {validityKind !== "" && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)]/50 p-3 space-y-3">
          <p className="text-sm font-medium text-[var(--color-text)]">
            ¿Cuántas veces puede asistir el cliente en ese período?
          </p>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="usesLimit"
                value="unlimited"
                checked={usesLimit === "unlimited"}
                onChange={() => setUsesLimit("unlimited")}
                className="rounded-full border-[var(--color-border)]"
              />
              <span className="text-sm text-[var(--color-text)]">Ilimitado</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="usesLimit"
                value="limited"
                checked={usesLimit === "limited"}
                onChange={() => setUsesLimit("limited")}
                className="rounded-full border-[var(--color-border)]"
              />
              <span className="text-sm text-[var(--color-text)]">Veces</span>
            </label>
          </div>
          {usesLimit === "limited" && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <input
                id="maxReservationsCount"
                name="maxReservationsCount"
                type="number"
                min={1}
                placeholder="ej. 5 u 8"
                className="w-24 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
              />
              <span className="text-sm text-[var(--color-text-muted)]">
                {validityKind === "days"
                  ? `veces en esos ${validityDaysInput ? validityDaysInput + " " : ""}días`
                  : validityPeriodInput
                    ? `veces en el ${PERIOD_LABEL_SINGULAR[validityPeriodInput]}`
                    : "veces en el período"}
              </span>
            </div>
          )}
          <p className="text-xs text-[var(--color-text-muted)]">
            Ej. ilimitado mensual, 5 veces en 15 días, 8 veces al mes con máx 4 por semana.
          </p>
        </div>
      )}

      {validityKind !== "" && showDistribution && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)]/50 p-3 space-y-3">
          <p className="text-sm font-medium text-[var(--color-text)]">
            Distribución dentro del período (opcional)
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Límites para que no consuman todo de una. Ej. 8 veces al mes, máx 4 por semana.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="maxReservationsPerDay" className="block text-xs text-[var(--color-text-muted)] mb-0.5">
                Máx por día
              </label>
              <input
                id="maxReservationsPerDay"
                name="maxReservationsPerDay"
                type="number"
                min={1}
                placeholder="—"
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
              />
            </div>
            <div>
              <label htmlFor="maxReservationsPerWeek" className="block text-xs text-[var(--color-text-muted)] mb-0.5">
                Máx por semana
              </label>
              <input
                id="maxReservationsPerWeek"
                name="maxReservationsPerWeek"
                type="number"
                min={1}
                placeholder="ej. 4"
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="billingMode" className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Modalidad de cobro
        </label>
        <select
          id="billingMode"
          name="billingMode"
          value={billingMode}
          onChange={(e) => setBillingMode((e.target.value || "") as BillingMode | "")}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
        >
          <option value="">—</option>
          <option value="ONE_TIME">Solo pago único</option>
          <option value="RECURRING">Solo recurrente</option>
          <option value="BOTH">Pago único y recurrente</option>
        </select>
      </div>

      {showRecurringDiscount && (
        <div>
          <label htmlFor="recurringDiscountPercent" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Descuento % si recurrente (0–100)
          </label>
          <input
            id="recurringDiscountPercent"
            name="recurringDiscountPercent"
            type="number"
            min={0}
            max={100}
            placeholder="0"
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
          />
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Por ejemplo 10 = 10% de descuento sobre el precio al elegir suscripción recurrente.
          </p>
        </div>
      )}

      {slugError && (
        <p className="text-sm text-[var(--color-error)]">Ese slug ya existe en este centro.</p>
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
