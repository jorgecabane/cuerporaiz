"use client";

import { useCallback, useState } from "react";
import { Share, Mail, Check } from "lucide-react";

import { AdaptiveSheet } from "@/components/ui/AdaptiveSheet";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { buildShareText, shareLinks } from "@/lib/share/social-urls";

type BlogShareProps = {
  url: string;
  title: string;
  variant: "icon" | "cta";
};

export function BlogShare({ url, title, variant }: BlogShareProps) {
  const [open, setOpen] = useState(false);

  // Siempre abrimos nuestro panel: en desktop sale como modal centrado y en
  // mobile como bottom sheet pegado abajo (estilo Linktree) — AdaptiveSheet
  // con variant="auto" hace ese cambio según el viewport.
  const openPanel = useCallback(() => setOpen(true), []);

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={openPanel}
          aria-label="Compartir"
          className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] transition-[color,background-color,transform] duration-[var(--duration-fast)] hover:bg-[var(--color-primary)] hover:text-[var(--color-text-inverse)] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          <Share className="h-[18px] w-[18px]" />
        </button>
      ) : (
        <Button variant="primary" onClick={openPanel}>
          <Share className="h-5 w-5" /> Compartir
        </Button>
      )}

      <AdaptiveSheet
        open={open}
        onOpenChange={setOpen}
        title="Compartir entrada"
        variant="auto"
        maxHeight={{ mobile: "35vh" }}
      >
        <SharePanel url={url} title={title} />
      </AdaptiveSheet>
    </>
  );
}

function SharePanel({ url, title }: { url: string; title: string }) {
  const text = buildShareText(title);
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Enlace copiado");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  }, [url]);

  const channels = [
    { name: "WhatsApp", href: shareLinks.whatsapp(url, text), bg: "#1DA851", icon: <WhatsAppIcon /> },
    { name: "Facebook", href: shareLinks.facebook(url), bg: "#1877F2", icon: <FacebookIcon /> },
    { name: "X", href: shareLinks.x(url, text), bg: "#000000", icon: <XIcon /> },
    { name: "Email", href: shareLinks.email(url, text), bg: "var(--color-text-muted)", icon: <Mail className="h-[18px] w-[18px]" /> },
  ];

  return (
    <div className="px-[var(--space-5)] py-[var(--space-5)]">
      <ul className="grid grid-cols-4 gap-[var(--space-3)]">
        {channels.map((c) => (
          <li key={c.name}>
            <a
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 rounded-[var(--radius-md)] py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            >
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full text-white transition-transform duration-[var(--duration-fast)] active:scale-90"
                style={{ backgroundColor: c.bg }}
              >
                {c.icon}
              </span>
              <span className="text-[11px] text-[var(--color-text-muted)]">{c.name}</span>
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-[var(--space-5)] flex items-center gap-2 rounded-full border border-[var(--color-border)] py-1.5 pl-4 pr-1.5">
        <span className="min-w-0 flex-1 truncate text-xs text-[var(--color-text-muted)]">
          {url.replace(/^https?:\/\//, "")}
        </span>
        <button
          type="button"
          onClick={copy}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium text-white transition-[background-color,transform] duration-[var(--duration-fast)] active:scale-95 ${
            copied ? "bg-[var(--color-success)]" : "bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-hover)]"
          }`}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" /> Copiado
            </>
          ) : (
            "Copiar"
          )}
        </button>
      </div>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.945c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.582 0 11.94-5.359 11.943-11.945a11.86 11.86 0 00-3.416-8.4" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[17px] w-[17px]" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
