import { AnimateIn } from "@/components/ui/AnimateIn";
import { Mail, Phone, MapPin, MessageCircle, Instagram, Facebook, Youtube } from "lucide-react";

type CtaItem = {
  title?: string | null;
  description?: string | null;
  linkUrl?: string | null;
};

type ContactInfo = {
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  whatsappUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  youtubeUrl?: string | null;
};

type CtaSectionProps = {
  title?: string;
  subtitle?: string;
  items?: CtaItem[];
  contact?: ContactInfo;
};

export function CtaSection({ title, subtitle, items, contact }: CtaSectionProps) {
  const bodyText = items?.[0]?.title ?? "Elige el formato que se adapte a tu ritmo. Comienza cuando quieras, desde donde estés.";

  const socialLinks = [
    { url: contact?.whatsappUrl, icon: MessageCircle, label: "WhatsApp" },
    { url: contact?.instagramUrl, icon: Instagram, label: "Instagram" },
    { url: contact?.facebookUrl, icon: Facebook, label: "Facebook" },
    { url: contact?.youtubeUrl, icon: Youtube, label: "YouTube" },
  ].filter((s) => s.url);

  const contactDetails = [
    { value: contact?.email, icon: Mail, href: contact?.email ? `mailto:${contact.email}` : undefined },
    { value: contact?.phone, icon: Phone, href: contact?.phone ? `tel:${contact.phone}` : undefined },
    { value: contact?.address, icon: MapPin, href: undefined },
  ].filter((c) => c.value);

  return (
    <section
      id="contacto"
      className="bg-[var(--color-secondary)] px-[var(--space-4)] py-[var(--space-24)] md:px-[var(--space-8)] md:py-[var(--space-32)]"
      aria-labelledby="cta-heading"
    >
      <div className="mx-auto max-w-3xl text-center">
        <AnimateIn>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/60">
            {subtitle ?? "El camino empieza aquí"}
          </p>
        </AnimateIn>

        <AnimateIn delay={0.1}>
          <h2
            id="cta-heading"
            className="mt-[var(--space-4)] text-section font-display font-semibold text-white"
          >
            {title ?? "El camino de regreso a ti."}
          </h2>
        </AnimateIn>

        <AnimateIn delay={0.18}>
          <p className="mx-auto mt-[var(--space-5)] max-w-md text-base leading-relaxed text-white/75">
            {bodyText}
          </p>
        </AnimateIn>

        {/* Social icons */}
        {socialLinks.length > 0 && (
          <AnimateIn delay={0.26}>
            <div className="mt-[var(--space-10)] flex justify-center gap-[var(--space-4)]">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 text-white/80 transition-all duration-[var(--duration-normal)] hover:border-white hover:bg-white hover:text-[var(--color-secondary)]"
                >
                  <s.icon size={18} />
                </a>
              ))}
            </div>
          </AnimateIn>
        )}

        {/* Contact details */}
        {contactDetails.length > 0 && (
          <AnimateIn delay={0.34}>
            <div className="mt-[var(--space-6)] flex flex-wrap justify-center gap-x-[var(--space-6)] gap-y-[var(--space-2)]">
              {contactDetails.map((c) => {
                const content = (
                  <span className="inline-flex items-center gap-[var(--space-2)] text-sm text-white/60">
                    <c.icon size={14} />
                    {c.value}
                  </span>
                );
                return c.href ? (
                  <a key={c.value} href={c.href} className="transition-colors hover:text-white/90">
                    {content}
                  </a>
                ) : (
                  <span key={c.value}>{content}</span>
                );
              })}
            </div>
          </AnimateIn>
        )}
      </div>
    </section>
  );
}
