import type { Metadata } from "next";

const supportEmail =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "cuerporaiztrinidad@gmail.com";

export const metadata: Metadata = {
  title: "Política de Privacidad | Cuerpo Raíz",
  description:
    "Política de privacidad de Cuerpo Raíz: datos personales, finalidades, proveedores, seguridad y derechos.",
};

export default function PrivacyPage() {
  const updatedAt = "2026-03-18";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-[var(--color-primary)]">
          Política de Privacidad
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Última actualización: {updatedAt}
        </p>
      </header>

      <nav
        aria-label="Índice de Política de Privacidad"
        className="mb-10 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
      >
        <p className="text-sm font-medium text-[var(--color-text)] mb-2">
          Índice
        </p>
        <ul className="grid gap-2 text-sm">
          {[
            ["resumen", "1. Resumen"],
            ["datos", "2. Qué datos recopilamos"],
            ["finalidades", "3. Para qué usamos tus datos"],
            ["terceros", "4. Proveedores y terceros"],
            ["retencion", "5. Retención"],
            ["seguridad", "6. Seguridad"],
            ["derechos", "7. Tus derechos"],
            ["cookies", "8. Cookies y analítica"],
            ["cambios", "9. Cambios en esta política"],
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
        <section id="resumen" className="scroll-mt-24">
          <h2>1. Resumen</h2>
          <p>
            Esta política explica qué datos recopilamos, cómo los usamos y qué
            opciones tienes. Usamos datos personales para operar el servicio
            (reservas, pagos, integraciones) y para soporte.
          </p>
        </section>

        <section id="datos" className="scroll-mt-24">
          <h2>2. Qué datos recopilamos</h2>
          <ul>
            <li>
              <strong>Cuenta</strong>: nombre, email y datos necesarios para
              autenticarte.
            </li>
            <li>
              <strong>Uso del servicio</strong>: reservas, asistencia, planes,
              historial de acciones relevantes.
            </li>
            <li>
              <strong>Pagos</strong>: información asociada a órdenes y estados
              de pago (no almacenamos datos completos de tarjetas si el pago lo
              procesa un proveedor).
            </li>
            <li>
              <strong>Integraciones</strong>: tokens/credenciales de conexión a
              proveedores (por ejemplo Google Meet/Calendar) para crear eventos
              o reuniones, según configuración del centro.
            </li>
          </ul>
        </section>

        <section id="finalidades" className="scroll-mt-24">
          <h2>3. Para qué usamos tus datos</h2>
          <ul>
            <li>Crear y administrar tu cuenta.</li>
            <li>Gestionar reservas, cupos y asistencia.</li>
            <li>Procesar pagos y gestionar órdenes.</li>
            <li>Habilitar integraciones solicitadas (p. ej. Google Meet).</li>
            <li>Soporte, seguridad y prevención de fraude.</li>
            <li>Comunicaciones transaccionales (por ejemplo emails de confirmación).</li>
          </ul>
        </section>

        <section id="terceros" className="scroll-mt-24">
          <h2>4. Proveedores y terceros</h2>
          <p>
            Para operar el servicio podemos usar proveedores de infraestructura
            y funcionalidades (por ejemplo hosting, email transaccional),
            pasarelas de pago y plataformas de videollamadas/calendario.
          </p>
          <p>
            Si conectas Google Meet/Calendar, se usarán permisos OAuth para
            crear/administrar eventos según el alcance autorizado.
          </p>
        </section>

        <section id="retencion" className="scroll-mt-24">
          <h2>5. Retención</h2>
          <p>
            Conservamos los datos por el tiempo necesario para operar el
            servicio, cumplir obligaciones legales y resolver disputas. Puedes
            solicitar eliminación o cierre de cuenta según corresponda.
          </p>
        </section>

        <section id="seguridad" className="scroll-mt-24">
          <h2>6. Seguridad</h2>
          <p>
            Aplicamos medidas razonables para proteger los datos (controles de
            acceso, prácticas de seguridad y monitoreo). Aun así, ningún sistema
            es 100% infalible.
          </p>
        </section>

        <section id="derechos" className="scroll-mt-24">
          <h2>7. Tus derechos</h2>
          <p>
            Puedes solicitar acceso, rectificación, actualización o eliminación
            de tus datos, según corresponda. Para ejercer estos derechos,
            contáctanos.
          </p>
        </section>

        <section id="cookies" className="scroll-mt-24">
          <h2>8. Cookies y analítica</h2>
          <p>
            Podemos usar cookies necesarias para iniciar sesión y mantener tu
            sesión. Si usamos analítica, su fin será mejorar el servicio.
          </p>
        </section>

        <section id="cambios" className="scroll-mt-24">
          <h2>9. Cambios en esta política</h2>
          <p>
            Podemos actualizar esta política para reflejar cambios en el
            servicio o requisitos legales. Publicaremos la versión vigente en
            esta página.
          </p>
        </section>

        <section id="contacto" className="scroll-mt-24">
          <h2>10. Contacto</h2>
          <p>
            Si tienes preguntas sobre privacidad, escríbenos a{" "}
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
          </p>
        </section>
      </div>
    </div>
  );
}

