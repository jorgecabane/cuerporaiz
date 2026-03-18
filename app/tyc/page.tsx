import type { Metadata } from "next";

const supportEmail =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "cuerporaiztrinidad@gmail.com";

export const metadata: Metadata = {
  title: "Términos y Condiciones | Cuerpo Raíz",
  description:
    "Términos y condiciones de uso de Cuerpo Raíz: cuenta, reservas, pagos, integraciones y responsabilidades.",
};

export default function TycPage() {
  const updatedAt = "2026-03-18";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-[var(--color-primary)]">
          Términos y Condiciones
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Última actualización: {updatedAt}
        </p>
      </header>

      <nav
        aria-label="Índice de Términos y Condiciones"
        className="mb-10 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
      >
        <p className="text-sm font-medium text-[var(--color-text)] mb-2">
          Índice
        </p>
        <ul className="grid gap-2 text-sm">
          {[
            ["alcance", "1. Alcance"],
            ["cuentas", "2. Cuenta y acceso"],
            ["reservas", "3. Clases y reservas"],
            ["pagos", "4. Pagos, cancelaciones y reembolsos"],
            ["integraciones", "5. Integraciones de terceros"],
            ["responsabilidad", "6. Responsabilidad y limitaciones"],
            ["propiedad", "7. Propiedad intelectual"],
            ["terminacion", "8. Suspensión o terminación"],
            ["cambios", "9. Cambios en estos términos"],
            ["contacto", "10. Contacto"],
          ].map(([id, label]) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="text-[var(--color-primary)] hover:underline underline-offset-4"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="prose prose-neutral max-w-none">
        <section id="alcance" className="scroll-mt-24">
          <h2>1. Alcance</h2>
          <p>
            Estos Términos y Condiciones regulan el uso del sitio y los servicios
            de Cuerpo Raíz (incluyendo el panel, reservas y funcionalidades
            relacionadas). Al usar el servicio, aceptas estos términos.
          </p>
        </section>

        <section id="cuentas" className="scroll-mt-24">
          <h2>2. Cuenta y acceso</h2>
          <ul>
            <li>
              Debes entregar información veraz al crear tu cuenta y mantenerla
              actualizada.
            </li>
            <li>
              Eres responsable de mantener la confidencialidad de tus
              credenciales y del uso de tu cuenta.
            </li>
            <li>
              Podemos restringir el acceso si detectamos uso indebido, fraude o
              riesgos de seguridad.
            </li>
          </ul>
        </section>

        <section id="reservas" className="scroll-mt-24">
          <h2>3. Clases y reservas</h2>
          <p>
            La disponibilidad de clases, cupos y horarios puede variar. Las
            reservas pueden depender de tu plan activo y de reglas del centro
            (por ejemplo, ventanas de cancelación).
          </p>
        </section>

        <section id="pagos" className="scroll-mt-24">
          <h2>4. Pagos, cancelaciones y reembolsos</h2>
          <p>
            Los pagos pueden procesarse mediante proveedores externos (por
            ejemplo, MercadoPago o transferencia). Las políticas de cancelación,
            reembolso y no asistencia pueden variar según el centro y se
            muestran en el panel cuando corresponda.
          </p>
        </section>

        <section id="integraciones" className="scroll-mt-24">
          <h2>5. Integraciones de terceros</h2>
          <p>
            Algunas funciones dependen de integraciones de terceros (por
            ejemplo, Google Meet/Calendar, Zoom o pasarelas de pago). El uso de
            esas integraciones puede estar sujeto a los términos y políticas de
            dichos proveedores.
          </p>
        </section>

        <section id="responsabilidad" className="scroll-mt-24">
          <h2>6. Responsabilidad y limitaciones</h2>
          <ul>
            <li>
              El servicio se entrega “tal cual” y puede tener interrupciones o
              mantenimiento programado.
            </li>
            <li>
              No garantizamos que el servicio esté libre de errores o sea
              ininterrumpido.
            </li>
            <li>
              En la medida permitida por la ley, Cuerpo Raíz no será
              responsable por daños indirectos o pérdidas derivadas del uso del
              servicio.
            </li>
          </ul>
        </section>

        <section id="propiedad" className="scroll-mt-24">
          <h2>7. Propiedad intelectual</h2>
          <p>
            El contenido, marca y materiales del servicio pertenecen a Cuerpo
            Raíz o a sus respectivos titulares. No puedes copiar, distribuir o
            reutilizar contenido sin autorización.
          </p>
        </section>

        <section id="terminacion" className="scroll-mt-24">
          <h2>8. Suspensión o terminación</h2>
          <p>
            Podemos suspender o terminar el acceso al servicio si hay
            incumplimientos graves, uso fraudulento, abuso o riesgos de
            seguridad. También puedes solicitar el cierre de tu cuenta.
          </p>
        </section>

        <section id="cambios" className="scroll-mt-24">
          <h2>9. Cambios en estos términos</h2>
          <p>
            Podemos actualizar estos términos para reflejar cambios en el
            servicio o requisitos legales. Si hacemos cambios relevantes,
            publicaremos la versión actualizada en esta página.
          </p>
        </section>

        <section id="contacto" className="scroll-mt-24">
          <h2>10. Contacto</h2>
          <p>
            Si tienes preguntas sobre estos términos, escríbenos a{" "}
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
          </p>
        </section>
      </div>
    </div>
  );
}

