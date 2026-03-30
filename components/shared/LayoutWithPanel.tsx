"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Footer } from "./Footer";

/** Rutas que usan el cascarón público: contenido a alto completo, footer al final de la página. */
const PUBLIC_SHELL_PATHS = ["/checkout", "/auth", "/catalogo"];

export function LayoutWithPanel({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  const pathname = usePathname();
  const isPanel = pathname?.startsWith("/panel") || pathname === "/planes";
  const usePublicShell = !isPanel && PUBLIC_SHELL_PATHS.some((p) => pathname?.startsWith(p));

  if (isPanel) {
    return <>{children}</>;
  }

  if (usePublicShell) {
    return (
      <>
        <Header />
        <div className="flex min-h-screen flex-col pt-[var(--header-height)]">
          <main id="main" className="flex-1 flex flex-col">
            {children}
          </main>
          {footer ?? <Footer />}
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <main id="main">{children}</main>
      {footer ?? <Footer />}
    </>
  );
}
