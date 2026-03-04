"use client";

import { useState, useMemo } from "react";
import { AnimateIn } from "@/components/ui/AnimateIn";
import { CTAS } from "@/lib/constants/copy";

/* ─── Tipos ──────────────────────────────────────────────────────────────── */
type ClassItem = {
  time: string;
  type: string;
  duration: string;
  spotsUsed: number;
  spotsTotal: number;
};

/* ─── Datos de horario por día de semana (0 = domingo) ───────────────────── */
const SCHEDULE: Record<number, ClassItem[]> = {
  0: [],
  1: [
    { time: "07:30", type: "Yoga Flow", duration: "60 min", spotsUsed: 3, spotsTotal: 12 },
    { time: "19:00", type: "Vinyasa", duration: "60 min", spotsUsed: 8, spotsTotal: 12 },
  ],
  2: [
    { time: "07:30", type: "Hatha Yoga", duration: "60 min", spotsUsed: 5, spotsTotal: 12 },
    { time: "19:30", type: "Yin Yoga", duration: "75 min", spotsUsed: 6, spotsTotal: 10 },
  ],
  3: [
    { time: "07:30", type: "Yoga Flow", duration: "60 min", spotsUsed: 2, spotsTotal: 12 },
    { time: "20:00", type: "Prácticas Somáticas", duration: "75 min", spotsUsed: 4, spotsTotal: 8 },
  ],
  4: [
    { time: "07:30", type: "Hatha Yoga", duration: "60 min", spotsUsed: 7, spotsTotal: 12 },
    { time: "19:30", type: "Vinyasa", duration: "60 min", spotsUsed: 9, spotsTotal: 12 },
  ],
  5: [
    { time: "07:30", type: "Yoga Flow", duration: "60 min", spotsUsed: 1, spotsTotal: 12 },
  ],
  6: [
    { time: "09:00", type: "Hatha + Meditación", duration: "90 min", spotsUsed: 5, spotsTotal: 12 },
    { time: "10:30", type: "Yin Yoga", duration: "75 min", spotsUsed: 8, spotsTotal: 10 },
  ],
};

const PLANES = [
  { name: "Clase suelta", price: "$12.000", note: "30 días de vigencia", highlight: false },
  { name: "Pack 4 clases", price: "$36.000", note: "31 días", highlight: false },
  { name: "Pack 6 clases", price: "$48.000", note: "31 días", highlight: false },
  { name: "Pack 8 clases", price: "$60.000", note: "31 días", highlight: false },
  { name: "Pack 12 clases", price: "$88.000", note: "31 días", highlight: true },
  { name: "Ilimitado", price: "$96.000", note: "31 días, clases ilimitadas", highlight: false },
] as const;

const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTH_SHORT = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];
const DAY_LONG = [
  "Domingo", "Lunes", "Martes", "Miércoles",
  "Jueves", "Viernes", "Sábado",
];

function getUpcomingDays(count = 7): Date[] {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
}

function availabilityStyle(used: number, total: number): string {
  const ratio = used / total;
  if (used >= total) return "text-[var(--color-secondary)]";
  if (ratio >= 0.8) return "text-amber-600";
  return "text-[var(--color-text-muted)]";
}

function availabilityLabel(used: number, total: number): string {
  if (used >= total) return "Completo";
  return `${total - used} ${total - used === 1 ? "cupo" : "cupos"}`;
}

/* ─── Componente ─────────────────────────────────────────────────────────── */
export function AgendaSection() {
  const days = useMemo(() => getUpcomingDays(7), []);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const selectedDay = days[selectedIdx];
  const dayOfWeek = selectedDay.getDay();
  const classes = SCHEDULE[dayOfWeek] ?? [];

  const headingDate = `${DAY_LONG[dayOfWeek]} ${selectedDay.getDate()} de ${MONTH_SHORT[selectedDay.getMonth()]}`;

  return (
    <section
      id="agenda"
      className="bg-[var(--color-surface)] px-[var(--space-4)] py-[var(--space-24)] md:px-[var(--space-8)] md:py-[var(--space-32)]"
      aria-labelledby="agenda-heading"
    >
      <div className="mx-auto max-w-6xl">
        {/* Encabezado */}
        <AnimateIn>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-secondary)]">
            Presencial — Vitacura
          </p>
        </AnimateIn>
        <AnimateIn delay={0.1}>
          <h2
            id="agenda-heading"
            className="mt-[var(--space-3)] text-section font-display font-semibold text-[var(--color-primary)]"
          >
            Reserva tu lugar
          </h2>
        </AnimateIn>

        {/* Layout 2 columnas en desktop */}
        <AnimateIn delay={0.18} className="mt-[var(--space-12)]">
          <div className="grid grid-cols-1 gap-[var(--space-12)] lg:grid-cols-[1fr_340px]">

            {/* ── IZQUIERDA: Schedule ──────────────────────────── */}
            <div>
              {/* Date scroller */}
              <div
                className="flex gap-[var(--space-2)] overflow-x-auto pb-[var(--space-2)]"
                role="tablist"
                aria-label="Seleccionar día"
                style={{ scrollbarWidth: "none" }}
              >
                {days.map((day, i) => {
                  const isSelected = i === selectedIdx;
                  const hasClasses = (SCHEDULE[day.getDay()] ?? []).length > 0;
                  return (
                    <button
                      key={i}
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => setSelectedIdx(i)}
                      className={`flex min-w-[3.5rem] flex-col items-center rounded-[var(--radius-lg)] px-[var(--space-3)] py-[var(--space-3)] text-center transition-all duration-[var(--duration-normal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${
                        isSelected
                          ? "bg-[var(--color-primary)] text-white shadow-[var(--shadow-md)]"
                          : "bg-[var(--color-tertiary)] text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)]"
                      }`}
                    >
                      <span className="text-[0.65rem] font-medium uppercase tracking-widest">
                        {DAY_SHORT[day.getDay()]}
                      </span>
                      <span className="mt-[var(--space-1)] text-lg font-semibold font-display leading-none">
                        {day.getDate()}
                      </span>
                      {/* Indicador de clases disponibles */}
                      <span
                        className={`mt-[var(--space-1)] h-1 w-1 rounded-full ${
                          hasClasses
                            ? isSelected
                              ? "bg-[var(--color-secondary)]"
                              : "bg-[var(--color-secondary)]/50"
                            : "bg-transparent"
                        }`}
                        aria-hidden
                      />
                    </button>
                  );
                })}
              </div>

              {/* Heading del día */}
              <p className="mt-[var(--space-6)] text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                {headingDate}
              </p>

              {/* Lista de clases */}
              <div
                className="mt-[var(--space-4)] divide-y divide-[var(--color-border)]"
                role="tabpanel"
                aria-label={`Clases del ${headingDate}`}
              >
                {classes.length === 0 ? (
                  <p className="py-[var(--space-8)] text-base text-[var(--color-text-muted)]">
                    Sin clases este día. Descansa, el cuerpo también lo necesita.
                  </p>
                ) : (
                  classes.map((c) => {
                    const isFull = c.spotsUsed >= c.spotsTotal;
                    return (
                      <div
                        key={`${c.time}-${c.type}`}
                        className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-[var(--space-4)] py-[var(--space-5)] sm:grid-cols-[3.5rem_1fr_auto_auto]"
                      >
                        {/* Hora */}
                        <span className="font-display text-lg font-semibold text-[var(--color-primary)]">
                          {c.time}
                        </span>

                        {/* Tipo + duración */}
                        <div>
                          <span className="block font-medium text-[var(--color-text)]">
                            {c.type}
                          </span>
                          <span className="text-xs text-[var(--color-text-muted)]">
                            {c.duration}
                          </span>
                        </div>

                        {/* Cupos — oculto en mobile xs, visible en sm */}
                        <span
                          className={`hidden text-sm sm:block ${availabilityStyle(
                            c.spotsUsed,
                            c.spotsTotal
                          )}`}
                        >
                          {availabilityLabel(c.spotsUsed, c.spotsTotal)}
                        </span>

                        {/* Acción */}
                        {isFull ? (
                          <span className="text-xs text-[var(--color-text-muted)]">
                            Lista de espera
                          </span>
                        ) : (
                          <a
                            href="#reservar"
                            className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-2)] text-xs font-medium text-[var(--color-text-muted)] transition-all duration-[var(--duration-normal)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
                          >
                            Reservar
                          </a>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Clase de prueba */}
              <div className="mt-[var(--space-8)] rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-tertiary)] p-[var(--space-6)]">
                <p className="text-sm font-medium text-[var(--color-primary)]">
                  ¿Primera vez?
                </p>
                <p className="mt-[var(--space-1)] text-sm leading-relaxed text-[var(--color-text-muted)]">
                  Agenda una clase de prueba sin costo y conoce el espacio.
                </p>
                <a
                  href="#clase-prueba"
                  className="mt-[var(--space-4)] inline-flex items-center gap-[var(--space-2)] text-sm font-medium text-[var(--color-secondary)] underline underline-offset-4 decoration-[var(--color-secondary)]/40 transition-colors hover:decoration-[var(--color-secondary)]"
                >
                  {CTAS.clasePrueba} →
                </a>
              </div>
            </div>

            {/* ── DERECHA: Planes ──────────────────────────────── */}
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                Planes
              </p>
              <h3 className="mt-[var(--space-2)] font-display text-2xl font-semibold text-[var(--color-primary)]">
                Elige el tuyo
              </h3>

              <ul className="mt-[var(--space-6)] divide-y divide-[var(--color-border)]">
                {PLANES.map((plan) => (
                  <li
                    key={plan.name}
                    className={`flex items-center justify-between py-[var(--space-4)] ${
                      plan.highlight
                        ? "rounded-[var(--radius-md)] px-[var(--space-3)] -mx-[var(--space-3)] bg-[var(--color-primary-light)]"
                        : ""
                    }`}
                  >
                    <div>
                      <span
                        className={`block text-sm font-medium ${
                          plan.highlight
                            ? "text-[var(--color-primary)]"
                            : "text-[var(--color-text)]"
                        }`}
                      >
                        {plan.name}
                        {plan.highlight && (
                          <span className="ml-[var(--space-2)] rounded-sm bg-[var(--color-secondary)] px-[var(--space-2)] py-px text-[0.6rem] font-semibold uppercase tracking-wider text-white">
                            Popular
                          </span>
                        )}
                      </span>
                      {plan.note && (
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {plan.note}
                        </span>
                      )}
                    </div>
                    <span className="font-display text-base font-semibold text-[var(--color-primary)]">
                      {plan.price}
                    </span>
                  </li>
                ))}
              </ul>

              <a
                href="#planes"
                className="mt-[var(--space-6)] flex w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-[var(--space-6)] py-[var(--space-4)] text-sm font-medium text-white transition-all duration-[var(--duration-normal)] hover:bg-[var(--color-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
              >
                Ver planes y comprar
              </a>

              <p className="mt-[var(--space-3)] text-center text-xs text-[var(--color-text-muted)]">
                Pago seguro a través de MercadoPago
              </p>
            </div>

          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
