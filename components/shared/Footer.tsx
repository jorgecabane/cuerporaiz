import Link from "next/link";
import { SITE_NAME, NAV_LINKS, CTAS } from "@/lib/constants/copy";

const WHATSAPP_URL =
  "https://wa.me/56900000000?text=Hola%20Trini%2C%20me%20interesa%20conocer%20m%C3%A1s%20sobre%20Cuerpo%20Ra%C3%ADz";

export function Footer() {
  const supportEmail =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "cuerporaiztrinidad@gmail.com";

  return (
    <footer
      className="bg-[var(--color-primary)] px-[var(--space-4)] pb-[var(--space-8)] pt-[var(--space-16)] md:px-[var(--space-8)]"
      role="contentinfo"
    >
      <div className="mx-auto max-w-6xl">
        {/* Desktop: 3 columnas / Mobile: centrado en bloque */}
        <div className="flex flex-col items-center gap-[var(--space-10)] text-center md:flex-row md:items-start md:justify-between md:text-left">
          {/* Marca */}
          <div className="md:max-w-[14rem]">
            <Link
              href="/"
              className="font-display text-2xl font-semibold text-white"
            >
              {SITE_NAME}
            </Link>
            <p className="mt-[var(--space-2)] text-sm leading-relaxed text-white/50">
              cuerpo, respiración y placer.
              <br />
              el camino de regreso a ti.
            </p>
          </div>

          {/* Nav — grid 2 columnas en mobile centrado */}
          <nav
            aria-label="Pie de página"
            className="grid grid-cols-2 gap-x-[var(--space-8)] gap-y-[var(--space-3)] md:flex md:flex-col md:gap-[var(--space-3)]"
          >
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm text-white/50 transition-colors hover:text-white"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <div className="flex flex-col items-center gap-[var(--space-3)] md:items-start">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-[var(--space-2)] rounded-[var(--radius-md)] border border-white/20 px-[var(--space-5)] py-[var(--space-3)] text-sm font-medium text-white/80 transition-all hover:border-white/50 hover:text-white"
            >
              {CTAS.hablemos}
            </a>
            <p className="text-xs text-white/30">
              Av. Luis Pasteur 5728, Vitacura
            </p>
          </div>
        </div>

        {/* Divider */}
        <div
          className="my-[var(--space-8)] h-px bg-white/10"
          aria-hidden
        />

        {/* Bottom */}
        <div className="flex flex-col items-center gap-[var(--space-2)] text-center md:flex-row md:justify-between">
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} {SITE_NAME}. Todos los derechos reservados.
          </p>
          <div className="flex flex-col items-center gap-1 text-xs text-white/20 md:flex-row md:gap-4">
            <p>Santiago, Chile</p>
            <div className="flex items-center gap-3">
              <Link href="/tyc" className="underline underline-offset-2 hover:text-white">
                Términos
              </Link>
              <Link href="/privacy" className="underline underline-offset-2 hover:text-white">
                Privacidad
              </Link>
              <a
                href={`mailto:${supportEmail}`}
                className="underline underline-offset-2 hover:text-white"
              >
                Contacto
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
