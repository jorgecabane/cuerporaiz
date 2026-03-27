import Link from "next/link";
import { SITE_NAME, NAV_LINKS } from "@/lib/constants/copy";
import { Mail, Phone, MapPin, MessageCircle, Instagram, Facebook, Youtube } from "lucide-react";

type ContactInfo = {
  email?: string;
  phone?: string;
  address?: string;
  whatsappUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
};

type FooterProps = {
  centerName?: string;
  contact?: ContactInfo;
};

export function Footer({ centerName, contact }: FooterProps) {
  const name = centerName ?? SITE_NAME;
  const supportEmail = contact?.email ?? process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "cuerporaiztrinidad@gmail.com";

  const socialLinks = [
    { url: contact?.whatsappUrl, icon: MessageCircle, label: "WhatsApp" },
    { url: contact?.instagramUrl, icon: Instagram, label: "Instagram" },
    { url: contact?.facebookUrl, icon: Facebook, label: "Facebook" },
    { url: contact?.youtubeUrl, icon: Youtube, label: "YouTube" },
  ].filter((s) => s.url);

  return (
    <footer
      className="bg-[var(--color-primary)] px-[var(--space-4)] pb-[var(--space-8)] pt-[var(--space-16)] md:px-[var(--space-8)]"
      role="contentinfo"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center gap-[var(--space-10)] text-center md:flex-row md:items-start md:justify-between md:text-left">
          {/* Marca */}
          <div className="md:max-w-[14rem]">
            <Link
              href="/"
              className="font-display text-2xl font-semibold text-white"
            >
              {name}
            </Link>
            <p className="mt-[var(--space-2)] text-sm leading-relaxed text-white/50">
              cuerpo, respiración y placer.
              <br />
              el camino de regreso a ti.
            </p>
          </div>

          {/* Nav */}
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

          {/* Contact + Social */}
          <div className="flex flex-col items-center gap-[var(--space-4)] md:items-end">
            {/* Social icons */}
            {socialLinks.length > 0 && (
              <div className="flex gap-[var(--space-3)]">
                {socialLinks.map((s) => (
                  <a
                    key={s.label}
                    href={s.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/50 transition-all hover:border-white/50 hover:text-white"
                  >
                    <s.icon size={14} />
                  </a>
                ))}
              </div>
            )}

            {/* Contact details */}
            <div className="flex flex-col items-center gap-[var(--space-1)] md:items-end">
              {contact?.address && (
                <span className="inline-flex items-center gap-[var(--space-1)] text-xs text-white/30">
                  <MapPin size={12} />
                  {contact.address}
                </span>
              )}
              {contact?.phone && (
                <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-[var(--space-1)] text-xs text-white/30 hover:text-white/60">
                  <Phone size={12} />
                  {contact.phone}
                </a>
              )}
              {contact?.email && (
                <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-[var(--space-1)] text-xs text-white/30 hover:text-white/60">
                  <Mail size={12} />
                  {contact.email}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-[var(--space-8)] h-px bg-white/10" aria-hidden />

        {/* Bottom */}
        <div className="flex flex-col items-center gap-[var(--space-2)] text-center md:flex-row md:justify-between">
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} {name}. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-3 text-xs text-white/20">
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
    </footer>
  );
}
