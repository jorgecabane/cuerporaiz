"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SiteConfig } from "@/lib/domain/site-config";

interface ContactFormProps {
  config: SiteConfig | null;
}

const inputCls =
  "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]";
const labelCls = "block text-xs font-medium text-[var(--color-text)] mb-1";

export default function ContactForm({ config }: ContactFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    setSuccess(false);

    const body: Record<string, string | null> = {};
    for (const key of [
      "contactEmail",
      "contactPhone",
      "contactAddress",
      "instagramUrl",
      "facebookUrl",
      "whatsappUrl",
      "youtubeUrl",
    ]) {
      const val = (fd.get(key) as string)?.trim();
      body[key] = val || null;
    }

    startTransition(async () => {
      const res = await fetch("/api/panel/site-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Error al guardar");
      } else {
        setSuccess(true);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Contact info */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-[var(--color-text)] mb-2">
          Información de contacto
        </legend>
        <div>
          <label htmlFor="contact-email" className={labelCls}>
            Email
          </label>
          <input
            id="contact-email"
            name="contactEmail"
            type="email"
            defaultValue={config?.contactEmail ?? ""}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="contact-phone" className={labelCls}>
            Teléfono
          </label>
          <input
            id="contact-phone"
            name="contactPhone"
            type="tel"
            defaultValue={config?.contactPhone ?? ""}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="contact-address" className={labelCls}>
            Dirección
          </label>
          <input
            id="contact-address"
            name="contactAddress"
            defaultValue={config?.contactAddress ?? ""}
            className={inputCls}
          />
        </div>
      </fieldset>

      {/* Social links */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-[var(--color-text)] mb-2">Redes sociales</legend>
        <div>
          <label htmlFor="contact-instagram" className={labelCls}>
            Instagram URL
          </label>
          <input
            id="contact-instagram"
            name="instagramUrl"
            type="url"
            defaultValue={config?.instagramUrl ?? ""}
            className={inputCls}
            placeholder="https://instagram.com/..."
          />
        </div>
        <div>
          <label htmlFor="contact-facebook" className={labelCls}>
            Facebook URL
          </label>
          <input
            id="contact-facebook"
            name="facebookUrl"
            type="url"
            defaultValue={config?.facebookUrl ?? ""}
            className={inputCls}
            placeholder="https://facebook.com/..."
          />
        </div>
        <div>
          <label htmlFor="contact-whatsapp" className={labelCls}>
            WhatsApp URL
          </label>
          <input
            id="contact-whatsapp"
            name="whatsappUrl"
            type="url"
            defaultValue={config?.whatsappUrl ?? ""}
            className={inputCls}
            placeholder="https://wa.me/..."
          />
        </div>
        <div>
          <label htmlFor="contact-youtube" className={labelCls}>
            YouTube URL
          </label>
          <input
            id="contact-youtube"
            name="youtubeUrl"
            type="url"
            defaultValue={config?.youtubeUrl ?? ""}
            className={inputCls}
            placeholder="https://youtube.com/..."
          />
        </div>
      </fieldset>

      {error && <p className="text-xs text-[var(--color-error,#dc2626)]">{error}</p>}
      {success && <p className="text-xs text-green-600">Cambios guardados</p>}

      <button
        type="submit"
        disabled={isPending}
        className="text-sm px-4 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
