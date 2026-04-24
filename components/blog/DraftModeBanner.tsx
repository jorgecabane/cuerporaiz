export function DraftModeBanner() {
  return (
    <div className="fixed left-1/2 top-[calc(var(--header-height,64px)+8px)] z-[60] -translate-x-1/2 rounded-full bg-[var(--color-secondary)] px-5 py-2 text-xs font-medium text-white shadow-[var(--shadow-md)]">
      Modo borrador activo ·{" "}
      <a href="/api/disable-draft" className="underline underline-offset-2">
        Salir
      </a>
    </div>
  );
}
