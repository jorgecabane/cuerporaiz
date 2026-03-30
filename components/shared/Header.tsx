"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { SITE_NAME, NAV_LINKS, CTAS } from "@/lib/constants/copy";

/** Rutas que usan cascarón público: header siempre sólido (buen contraste en fondo claro). */
const PUBLIC_SHELL_PATHS = ["/checkout", "/auth", "/catalogo"];

export function Header() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const isPublicShellRoute = PUBLIC_SHELL_PATHS.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setIsOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const solid = isPublicShellRoute || isScrolled || isOpen;

  return (
    <>
      <header
        className={`fixed top-0 z-50 w-full transition-[background-color,box-shadow,backdrop-filter] duration-[var(--duration-slow)] ${
          solid
            ? "bg-[var(--color-surface)]/96 shadow-[var(--shadow-sm)] backdrop-blur-md"
            : "bg-transparent"
        }`}
        role="banner"
      >
        <div className="mx-auto flex h-[var(--header-height)] max-w-6xl items-center justify-between px-[var(--space-4)] md:px-[var(--space-8)]">
          {/* Logo */}
          <Link
            href="/"
            className={`font-display text-xl font-semibold tracking-tight transition-colors duration-[var(--duration-normal)] md:text-2xl ${
              solid ? "text-[var(--color-primary)]" : "text-white"
            }`}
          >
            {SITE_NAME}
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-[var(--space-6)] lg:flex" aria-label="Principal">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`text-sm font-medium transition-colors duration-[var(--duration-normal)] hover:text-[var(--color-secondary)] ${
                  solid ? "text-[var(--color-text-muted)]" : "text-white/80"
                }`}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/panel"
              className={`rounded-[var(--radius-md)] px-[var(--space-5)] py-[var(--space-3)] text-sm font-medium transition-all duration-[var(--duration-normal)] ${
                solid
                  ? "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
                  : "border border-white/50 text-white hover:border-white hover:bg-white/10"
              }`}
            >
              {CTAS.comenzarPractica}
            </Link>
          </nav>

          {/* Hamburger */}
          <button
            onClick={() => setIsOpen((v) => !v)}
            aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isOpen}
            className={`flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] transition-colors duration-[var(--duration-normal)] lg:hidden ${
              solid ? "text-[var(--color-primary)]" : "text-white"
            }`}
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] } }}
            exit={{ opacity: 0, transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] } }}
            className="fixed inset-0 z-40 flex flex-col bg-[var(--color-primary)] lg:hidden"
          >
            <nav
              className="flex flex-col items-center justify-center gap-[var(--space-8)] pt-[var(--header-height)]"
              style={{ minHeight: "100dvh" }}
              aria-label="Menú móvil"
            >
              {NAV_LINKS.map(({ href, label }, i) => (
                <motion.div
                  key={href}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.07, duration: 0.35 }}
                >
                  <Link
                    href={href}
                    onClick={() => setIsOpen(false)}
                    className="font-display text-4xl font-semibold text-white/70 transition-colors hover:text-white"
                  >
                    {label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + NAV_LINKS.length * 0.07, duration: 0.35 }}
                className="mt-[var(--space-4)]"
              >
                <Link
                  href="/panel"
                  onClick={() => setIsOpen(false)}
                  className="rounded-[var(--radius-md)] border-2 border-[var(--color-secondary)] px-[var(--space-8)] py-[var(--space-4)] text-base font-medium text-[var(--color-secondary)] transition-all hover:bg-[var(--color-secondary)] hover:text-white"
                >
                  {CTAS.comenzarPractica}
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
