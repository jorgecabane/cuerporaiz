import type { NewsletterSubscriber } from "@/lib/ports/newsletter-subscriber-repository";

type Props = { subscribers: NewsletterSubscriber[]; studentsReceiving: number; timeZone: string };

export default function NewsletterSubscribers({ subscribers, studentsReceiving, timeZone }: Props) {
  const active = subscribers.filter((s) => !s.unsubscribedAt).length;
  const fmt = (d: Date) => d.toLocaleDateString("es-CL", { timeZone, day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-text)]">
          <strong>{active}</strong> {active === 1 ? "suscriptor activo" : "suscriptores activos"}
          <span className="text-[var(--color-text-muted)]"> · además {studentsReceiving} alumnos reciben el blog</span>
        </p>
        <a
          href="/api/panel/newsletter/export"
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text)] hover:border-[var(--color-primary)]"
        >
          Exportar CSV
        </a>
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">
        Cada artículo nuevo del blog se envía automáticamente a los suscriptores activos y a los alumnos con “Nuevos artículos del blog” activado, sin duplicados.
        La sección de suscripción se activa y ordena en la pestaña Secciones (“Newsletter del blog”).
      </p>
      {subscribers.length === 0 ? (
        <p className="rounded-[var(--radius-md)] bg-[var(--color-tertiary)] p-4 text-sm text-[var(--color-text-muted)]">Aún no hay suscriptores.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                <th scope="col" className="py-2 pr-3 font-medium">Email</th>
                <th scope="col" className="py-2 pr-3 font-medium">Desde</th>
                <th scope="col" className="py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((s) => (
                <tr key={s.id} className="border-b border-[var(--color-border)]">
                  <td className="py-2 pr-3 text-[var(--color-text)]">{s.email}</td>
                  <td className="py-2 pr-3 text-[var(--color-text-muted)]">{fmt(s.subscribedAt)}</td>
                  <td className="py-2">
                    {s.unsubscribedAt ? (
                      <span className="rounded-full bg-[var(--color-tertiary)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">Dado de baja</span>
                    ) : (
                      <span className="rounded-full bg-[var(--color-primary-light)] px-2 py-0.5 text-xs text-[var(--color-primary)]">Suscrito</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
