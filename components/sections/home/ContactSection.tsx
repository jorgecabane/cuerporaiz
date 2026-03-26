import { AnimateIn } from "@/components/ui/AnimateIn";

type ContactSectionProps = {
  title?: string;
  subtitle?: string;
  email?: string;
  phone?: string;
  address?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  whatsappUrl?: string;
  youtubeUrl?: string;
};

const SOCIAL_LABELS: Record<string, string> = {
  instagramUrl: "Instagram",
  facebookUrl: "Facebook",
  whatsappUrl: "WhatsApp",
  youtubeUrl: "YouTube",
};

export function ContactSection({
  title,
  subtitle,
  email,
  phone,
  address,
  instagramUrl,
  facebookUrl,
  whatsappUrl,
  youtubeUrl,
}: ContactSectionProps) {
  const socialLinks = [
    { key: "instagramUrl", url: instagramUrl },
    { key: "facebookUrl", url: facebookUrl },
    { key: "whatsappUrl", url: whatsappUrl },
    { key: "youtubeUrl", url: youtubeUrl },
  ].filter((s) => s.url);

  const hasContactInfo = email || phone || address;
  const hasSocial = socialLinks.length > 0;

  if (!hasContactInfo && !hasSocial) return null;

  return (
    <section
      className="bg-[var(--color-surface)] px-[var(--space-4)] py-[var(--space-24)] md:px-[var(--space-8)] md:py-[var(--space-32)]"
      aria-labelledby="contact-heading"
    >
      <div className="mx-auto max-w-3xl text-center">
        <AnimateIn>
          <h2
            id="contact-heading"
            className="text-section font-display font-semibold text-[var(--color-primary)]"
          >
            {title ?? "Contacto"}
          </h2>
        </AnimateIn>

        {subtitle && (
          <AnimateIn delay={0.08}>
            <p className="mt-[var(--space-3)] text-lg leading-relaxed text-[var(--color-text-muted)]">
              {subtitle}
            </p>
          </AnimateIn>
        )}

        <AnimateIn delay={0.16}>
          <div className="mt-[var(--space-10)] flex flex-col items-center gap-[var(--space-4)]">
            {email && (
              <a
                href={`mailto:${email}`}
                className="text-base text-[var(--color-text)] underline underline-offset-4 decoration-[var(--color-secondary)]/40 transition-colors hover:text-[var(--color-primary)] hover:decoration-[var(--color-secondary)]"
              >
                {email}
              </a>
            )}
            {phone && (
              <a
                href={`tel:${phone.replace(/\s/g, "")}`}
                className="text-base text-[var(--color-text)] underline underline-offset-4 decoration-[var(--color-secondary)]/40 transition-colors hover:text-[var(--color-primary)] hover:decoration-[var(--color-secondary)]"
              >
                {phone}
              </a>
            )}
            {address && (
              <p className="text-base text-[var(--color-text-muted)]">
                {address}
              </p>
            )}
          </div>
        </AnimateIn>

        {hasSocial && (
          <AnimateIn delay={0.24}>
            <div className="mt-[var(--space-8)] flex justify-center gap-[var(--space-4)]">
              {socialLinks.map(({ key, url }) => (
                <a
                  key={key}
                  href={url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-2)] text-sm font-medium text-[var(--color-text-muted)] transition-all duration-[var(--duration-normal)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
                >
                  {SOCIAL_LABELS[key] ?? key}
                </a>
              ))}
            </div>
          </AnimateIn>
        )}
      </div>
    </section>
  );
}
