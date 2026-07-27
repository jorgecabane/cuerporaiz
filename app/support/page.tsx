import type { Metadata } from "next";

const supportEmail =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "cuerporaiztrinidad@gmail.com";

export const metadata: Metadata = {
  title: "Soporte | Cuerpo Raíz",
  description:
    "Cómo contactar al equipo de soporte de Cuerpo Raíz: horario de atención, tiempo de respuesta y canales de contacto.",
};

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-[var(--color-primary)]">
          Soporte
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Cómo obtener ayuda directa de nuestro equipo.
        </p>
      </header>

      <div className="prose prose-neutral max-w-none">
        <section>
          <h2>Horario de atención</h2>
          <p>Lunes a viernes, 9:00 a 18:00 (hora de Chile continental).</p>
        </section>

        <section>
          <h2>Tiempo de primera respuesta</h2>
          <p>
            Respondemos dentro de un máximo de 48 horas hábiles desde que
            recibimos tu solicitud.
          </p>
        </section>

        <section>
          <h2>Cómo contactarnos</h2>
          <ul>
            <li>
              <strong>Crear un caso de soporte / email</strong>: escríbenos
              a{" "}
              <a href={`mailto:${supportEmail}`}>{supportEmail}</a> con el
              detalle de tu problema o consulta. Este correo es nuestro
              canal único de soporte, tanto para abrir un caso como para
              hacer seguimiento.
            </li>
            <li>
              <strong>Guías y documentación</strong>: consulta nuestra{" "}
              <a href="/ayuda/zoom">guía de integración con Zoom</a> para
              dudas sobre conectar, usar o desconectar esa integración.
            </li>
          </ul>
          <p>
            Por ahora no contamos con línea telefónica ni chat en vivo; el
            correo es la vía más rápida para contactarnos.
          </p>
        </section>
      </div>
    </div>
  );
}
