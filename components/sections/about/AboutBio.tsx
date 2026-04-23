import { AnimateIn } from "@/components/ui/AnimateIn";

type Props = {
  heading: string;
  body: string;
  background?: "surface" | "tertiary";
};

function renderParagraphs(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((paragraph, i) => (
      <p key={i} className="text-lg leading-[1.75] text-[var(--color-text)] md:text-xl">
        {paragraph.split("\n").map((line, j, arr) => (
          <span key={j}>
            {line}
            {j < arr.length - 1 && <br />}
          </span>
        ))}
      </p>
    ));
}

export function AboutBio({ heading, body, background = "surface" }: Props) {
  return (
    <section
      className={`${
        background === "surface"
          ? "bg-[var(--color-surface)]"
          : "bg-[var(--color-tertiary)]"
      } px-[var(--space-4)] py-[var(--space-20)] md:px-[var(--space-8)] md:py-[var(--space-24)]`}
    >
      <div className="mx-auto max-w-3xl">
        <AnimateIn>
          <div
            aria-hidden
            className="mb-[var(--space-8)] h-[2px] w-12"
            style={{ background: "var(--color-secondary)" }}
          />
          <h2 className="text-section font-display font-semibold text-[var(--color-primary)]">
            {heading}
          </h2>
        </AnimateIn>
        <AnimateIn delay={0.08}>
          <div className="mt-[var(--space-8)] space-y-[var(--space-5)] font-display">
            {renderParagraphs(body)}
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
