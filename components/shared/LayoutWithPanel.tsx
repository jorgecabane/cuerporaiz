"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function LayoutWithPanel({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPanel = pathname?.startsWith("/panel");

  if (isPanel) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
