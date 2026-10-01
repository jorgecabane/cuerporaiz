"use client";

import type { SiteConfig } from "@/lib/domain/site-config";
import { usePatchSiteConfig } from "./usePatchSiteConfig";
import { SaveRow } from "./VisitPageForm";

export default function FirstClassForm({ config }: { config: SiteConfig | null }) {
  const { save, isPending, error, success } = usePatchSiteConfig();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = (new FormData(e.currentTarget).get("firstClassInfo") as string)?.trim();
    save({ firstClassInfo: text || null });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="first-class-info" className="mb-1 block text-xs font-medium text-[var(--color-text)]">
          Qué debe saber alguien antes de su primera clase
        </label>
        <textarea
          id="first-class-info"
          name="firstClassInfo"
          rows={6}
          maxLength={1000}
          defaultValue={config?.firstClassInfo ?? ""}
          placeholder={"Llega 10 minutos antes para instalarte con calma.\nVen con ropa cómoda. Hay mats para prestar.\nNo necesitas experiencia previa."}
          aria-describedby="first-class-help"
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
        <p id="first-class-help" className="mt-1 text-xs text-[var(--color-text-muted)]">
          Una idea por línea. Se muestra en <strong>Horarios</strong>, en <strong>Conócenos</strong> y en el{" "}
          <strong>correo de confirmación</strong> de la clase de prueba y de la primera reserva.
        </p>
      </div>
      <SaveRow isPending={isPending} error={error} success={success} previewHref="/horarios" />
    </form>
  );
}
