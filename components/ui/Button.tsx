import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "ghost" | "light";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-primary)] text-[var(--color-text-inverse)] hover:bg-[var(--color-primary-hover)]",
  secondary:
    "border-2 border-[var(--color-secondary)] bg-transparent text-[var(--color-secondary)] hover:bg-[var(--color-secondary)] hover:text-[var(--color-text-inverse)]",
  ghost:
    "bg-transparent text-[var(--color-primary)] underline underline-offset-4 decoration-[var(--color-secondary)] hover:decoration-2",
  light:
    "border-2 border-white/70 bg-transparent text-white hover:bg-white hover:text-[var(--color-primary)]",
};

type BaseProps = {
  variant?: ButtonVariant;
  children: React.ReactNode;
  className?: string;
};

type ButtonProps = BaseProps &
  (
    | { href: string; target?: string; rel?: string }
    | { href?: never; type?: "button" | "submit"; onClick?: () => void; disabled?: boolean }
  );

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] px-[var(--space-6)] py-[var(--space-3)] text-sm font-medium tracking-wide transition-all duration-[var(--duration-normal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none";

export function Button({ variant = "primary", children, className = "", ...props }: ButtonProps) {
  const classes = `${base} ${variantStyles[variant]} ${className}`;

  if ("href" in props && props.href) {
    const isExternal =
      props.href.startsWith("http") || props.href.startsWith("//");

    if (isExternal) {
      return (
        <a
          href={props.href}
          target={props.target ?? "_blank"}
          rel={props.rel ?? "noopener noreferrer"}
          className={classes}
        >
          {children}
        </a>
      );
    }

    return (
      <Link href={props.href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={"type" in props ? (props.type ?? "button") : "button"}
      className={classes}
      onClick={"onClick" in props ? props.onClick : undefined}
      disabled={"disabled" in props ? props.disabled : undefined}
    >
      {children}
    </button>
  );
}
