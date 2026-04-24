import Link from "next/link";

type CTAButtonValue = {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
};

export function CTAButton({ value }: { value: CTAButtonValue }) {
  const { label, href, variant = "primary" } = value;

  const styles =
    variant === "secondary"
      ? "border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
      : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]";

  const isExternal = /^https?:\/\//.test(href);

  const content = (
    <>
      {label} <span aria-hidden="true">→</span>
    </>
  );

  const className = `not-prose mx-auto my-[var(--space-10)] flex max-w-[42rem] items-center justify-center`;
  const btn = `inline-flex items-center gap-2 rounded-[var(--radius-md)] px-8 py-4 text-sm font-medium transition-colors duration-[var(--duration-normal)] ease-out active:scale-[0.97] ${styles}`;

  return (
    <div className={className}>
      {isExternal ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={btn}>
          {content}
        </a>
      ) : (
        <Link href={href} className={btn}>
          {content}
        </Link>
      )}
    </div>
  );
}
