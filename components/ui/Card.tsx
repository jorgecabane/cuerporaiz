type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-[var(--space-6)] shadow-[var(--shadow-md)] transition-shadow duration-[var(--duration-normal)] hover:shadow-[var(--shadow-lg)] ${className}`}
    >
      {children}
    </div>
  );
}
