import type { Metadata } from "next";

const supportEmail =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "cuerporaiztrinidad@gmail.com";

export const metadata: Metadata = {
  title: "Integración con Zoom | Cuerpo Raíz",
  description:
    "Cómo conectar, usar y desconectar la integración de Zoom en Cuerpo Raíz.",
};

export default function ZoomHelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-[var(--color-primary)]">
          Integración con Zoom
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Guía para administradores de centro: cómo conectar, usar y
          desconectar la integración con Zoom.
        </p>
      </header>

      <div className="prose prose-neutral max-w-none">
        <section>
          <h2>1. Qué hace esta integración</h2>
          <p>
            Al conectar la cuenta de Zoom de tu centro, Cuerpo Raíz puede
            generar automáticamente un enlace de reunión de Zoom para las
            clases marcadas como &quot;en línea&quot;. El enlace se guarda en
            la clase y se muestra a los alumnos que reservan, para que puedan
            unirse a la videollamada en el horario correspondiente.
          </p>
        </section>

        <section>
          <h2>2. Cómo conectar tu cuenta de Zoom</h2>
          <ol>
            <li>Inicia sesión como administrador del centro.</li>
            <li>
              Ve a <strong>Panel → Plugins → Zoom</strong>.
            </li>
            <li>
              Haz clic en <strong>&quot;Conectar con Zoom&quot;</strong>.
            </li>
            <li>
              Se abrirá la pantalla de autorización de Zoom. Revisa los
              permisos solicitados y haz clic en{" "}
              <strong>&quot;Autorizar&quot;</strong> (o el botón equivalente
              de Zoom).
            </li>
            <li>
              Zoom te redirigirá de vuelta a Cuerpo Raíz. Si la conexión fue
              exitosa, verás el estado{" "}
              <strong>&quot;Conectado&quot;</strong> en Panel → Plugins →
              Zoom.
            </li>
          </ol>
        </section>

        <section>
          <h2>3. Cómo usar la integración al crear una clase</h2>
          <ol>
            <li>
              Ve a <strong>Panel → Horarios → Nueva clase</strong> (o edita
              una clase existente).
            </li>
            <li>
              Marca la casilla <strong>&quot;Clase online&quot;</strong>.
            </li>
            <li>
              Haz clic en{" "}
              <strong>&quot;Generar link con Zoom&quot;</strong>. Se creará
              una reunión nueva en tu cuenta de Zoom y el enlace se completará
              automáticamente en el formulario.
            </li>
            <li>Guarda la clase.</li>
          </ol>
          <p>
            El enlace generado queda visible para los alumnos que reserven
            esa clase, en su sección de reservas.
          </p>
        </section>

        <section>
          <h2>4. Cómo desconectar la integración</h2>
          <ol>
            <li>
              Ve a <strong>Panel → Plugins → Zoom</strong>.
            </li>
            <li>
              Haz clic en <strong>&quot;Desconectar&quot;</strong>.
            </li>
          </ol>
          <p>
            Al desconectar, Cuerpo Raíz deja de tener acceso a tu cuenta de
            Zoom y ya no podrá generar nuevos enlaces de reunión. Las clases
            que ya tenían un enlace generado conservan ese enlace hasta que
            lo edites manualmente. También puedes revocar el acceso desde tu
            propia cuenta de Zoom, en Marketplace de Zoom →
            &quot;Administrado por mí&quot; (Manage → Added apps).
          </p>
        </section>

        <section>
          <h2>5. Soporte</h2>
          <p>
            Si tienes problemas con la integración, escríbenos a{" "}
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
