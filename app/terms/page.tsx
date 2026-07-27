import type { Metadata } from "next";

const supportEmail =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "cuerporaiztrinidad@gmail.com";

export const metadata: Metadata = {
  title: "Términos de Uso | Cuerpo Raíz",
  description:
    "Términos de uso de Cuerpo Raíz: cuentas, pagos, integraciones de terceros, propiedad intelectual y responsabilidades.",
};

export default function TermsPage() {
  const updatedAt = "2026-07-27";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-[var(--color-primary)]">
          Términos de Uso
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Última actualización: {updatedAt}
        </p>
      </header>

      <nav
        aria-label="Índice de Términos de Uso"
        className="mb-10 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
      >
        <p className="text-sm font-medium text-[var(--color-text)] mb-2">
          Índice
        </p>
        <ul className="grid gap-2 text-sm">
          {[
            ["aceptacion", "1. Aceptación de estos términos"],
            ["servicio", "2. Descripción del servicio"],
            ["cuentas", "3. Cuentas de usuario"],
            ["uso-aceptable", "4. Uso aceptable"],
            ["pagos", "5. Pagos y suscripciones"],
            ["integraciones", "6. Integraciones de terceros"],
            ["propiedad", "7. Propiedad intelectual"],
            ["responsabilidad", "8. Limitación de responsabilidad"],
            ["terminacion", "9. Suspensión y término"],
            ["cambios", "10. Cambios en estos términos"],
            ["ley", "11. Ley aplicable"],
            ["contacto", "12. Contacto"],
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
        <section id="aceptacion" className="scroll-mt-24">
          <h2>1. Aceptación de estos términos</h2>
          <p>
            Estos Términos de Uso regulan el acceso y uso de la plataforma
            Cuerpo Raíz (el &quot;Servicio&quot;), operada por Cuerpo Raíz.
            Al crear una cuenta o usar el Servicio, aceptas estos términos.
            Si no estás de acuerdo, no debes usar el Servicio.
          </p>
        </section>

        <section id="servicio" className="scroll-mt-24">
          <h2>2. Descripción del servicio</h2>
          <p>
            Cuerpo Raíz es una plataforma de gestión para centros de yoga:
            agenda de clases, reservas, membresías, pagos y clases en línea
            (mediante integraciones de videollamada como Zoom o Google
            Meet). El Servicio puede ser usado por administradores de
            centro, instructores y estudiantes según el rol asignado.
          </p>
        </section>

        <section id="cuentas" className="scroll-mt-24">
          <h2>3. Cuentas de usuario</h2>
          <ul>
            <li>
              Eres responsable de mantener la confidencialidad de tus
              credenciales y de toda actividad realizada desde tu cuenta.
            </li>
            <li>
              Debes entregar información verídica al registrarte y
              mantenerla actualizada.
            </li>
            <li>
              Podemos suspender o cerrar cuentas que incumplan estos
              términos.
            </li>
          </ul>
        </section>

        <section id="uso-aceptable" className="scroll-mt-24">
          <h2>4. Uso aceptable</h2>
          <p>Al usar el Servicio, te comprometes a no:</p>
          <ul>
            <li>
              Usar el Servicio para fines ilegales o no autorizados.
            </li>
            <li>
              Intentar acceder a cuentas, datos o centros que no te
              pertenecen.
            </li>
            <li>
              Interferir con el funcionamiento normal de la plataforma o
              intentar vulnerar su seguridad.
            </li>
          </ul>
        </section>

        <section id="pagos" className="scroll-mt-24">
          <h2>5. Pagos y suscripciones</h2>
          <p>
            Los pagos de planes, membresías y entradas a eventos se
            procesan a través de proveedores de pago externos (por ejemplo
            MercadoPago). Los precios, condiciones de renovación y
            políticas de cancelación son definidos por cada centro dentro
            de la plataforma. Cuerpo Raíz no almacena datos completos de
            tarjetas de pago.
          </p>
        </section>

        <section id="integraciones" className="scroll-mt-24">
          <h2>6. Integraciones de terceros</h2>
          <p>
            El Servicio permite conectar cuentas de terceros —como Zoom o
            Google Meet— para generar enlaces de videollamada asociados a
            clases en línea. Al conectar una integración, autorizas a
            Cuerpo Raíz a acceder a la cuenta del proveedor con el alcance
            (scope) mínimo necesario para crear y administrar esas
            reuniones. Puedes desconectar cualquier integración en
            cualquier momento desde el panel de administración del centro.
            El uso de cada proveedor externo también está sujeto a sus
            propios términos y políticas.
          </p>
        </section>

        <section id="propiedad" className="scroll-mt-24">
          <h2>7. Propiedad intelectual</h2>
          <p>
            El software, diseño y marca de Cuerpo Raíz son propiedad de
            Cuerpo Raíz. El contenido que cada centro carga (horarios,
            descripciones, imágenes) sigue siendo propiedad del centro
            correspondiente.
          </p>
        </section>

        <section id="responsabilidad" className="scroll-mt-24">
          <h2>8. Limitación de responsabilidad</h2>
          <p>
            El Servicio se entrega &quot;tal cual&quot;. En la medida
            permitida por la ley, Cuerpo Raíz no será responsable por daños
            indirectos, pérdida de datos o interrupciones derivadas de
            proveedores externos (por ejemplo, caídas de Zoom, Google Meet
            o pasarelas de pago) fuera de su control razonable.
          </p>
        </section>

        <section id="terminacion" className="scroll-mt-24">
          <h2>9. Suspensión y término</h2>
          <p>
            Puedes dejar de usar el Servicio y solicitar el cierre de tu
            cuenta en cualquier momento. Podemos suspender o cerrar cuentas
            que incumplan estos términos o representen un riesgo de
            seguridad para la plataforma.
          </p>
        </section>

        <section id="cambios" className="scroll-mt-24">
          <h2>10. Cambios en estos términos</h2>
          <p>
            Podemos actualizar estos Términos de Uso para reflejar cambios
            en el Servicio o requisitos legales. Publicaremos la versión
            vigente en esta página con su fecha de actualización.
          </p>
        </section>

        <section id="ley" className="scroll-mt-24">
          <h2>11. Ley aplicable</h2>
          <p>
            Estos términos se rigen por las leyes de la República de Chile,
            sin perjuicio de los derechos que la ley aplicable a tu país de
            residencia te otorgue de forma imperativa.
          </p>
        </section>

        <section id="contacto" className="scroll-mt-24">
          <h2>12. Contacto</h2>
          <p>
            Si tienes preguntas sobre estos Términos de Uso, escríbenos a{" "}
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
