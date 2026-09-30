"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { SITE_NAME, DEFAULT_NAV, CTAS } from "@/lib/constants/copy";
import { isNavGroup, type NavItem } from "@/lib/domain/public-nav";
import { SiteLogoMark } from "./SiteLogoMark";
import { NavDropdown } from "./NavDropdown";

interface HeaderProps {
  navLinks?: NavItem[];
  logoUrl?: string | null;
  centerName?: string;
}

/** Rutas que usan cascarón público: header siempre sólido (buen contraste en fondo claro). */
const PUBLIC_SHELL_PATHS = ["/checkout", "/auth", "/catalogo", "/sobre", "/blog", "/eventos", "/preguntas-frecuentes"];

export function Header({ navLinks, logoUrl = null, centerName = SITE_NAME }: HeaderProps = {}) {
  const items: NavItem[] = navLinks ?? DEFAULT_NAV;
  const hasLogo = Boolean(logoUrl);
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
        <div className="relative mx-auto flex h-[var(--header-height)] max-w-6xl items-center justify-between px-[var(--space-4)] md:px-[var(--space-8)]">
          {/* Marca a la izquierda. En desktop muestra logo + nombre; en mobile sólo el nombre (el logo va centrado). */}
          <Link
            href="/"
            className={`flex items-center gap-2 font-display text-xl font-semibold tracking-tight transition-colors duration-[var(--duration-normal)] md:text-2xl ${
              solid ? "text-[var(--color-primary)]" : "text-white"
            }`}
          >
            {hasLogo && logoUrl && (
              <SiteLogoMark
                logoUrl={logoUrl}
                centerName={centerName}
                size={28}
                className="hidden lg:block"
              />
            )}
            <span>{centerName}</span>
          </Link>

          {/* Logo centrado sólo en mobile (lg:hidden) cuando hay logoUrl. Absoluto al centro del header. */}
          {hasLogo && logoUrl && (
            <Link
              href="/"
              aria-label={`Ir al inicio de ${centerName}`}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:hidden"
            >
              <SiteLogoMark logoUrl={logoUrl} centerName={centerName} size={32} />
            </Link>
          )}

          {/* Desktop nav */}
          <nav className="hidden items-center gap-[var(--space-6)] lg:flex" aria-label="Principal">
            {items.map((item) =>
              isNavGroup(item) ? (
                <NavDropdown key={item.label} group={item} solid={solid} />
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors duration-[var(--duration-normal)] hover:text-[var(--color-secondary)] ${
                    solid ? "text-[var(--color-text-muted)]" : "text-white/80"
                  }`}
                >
                  {item.label}
                </Link>
              )
            )}
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
              className="flex flex-col items-center gap-[var(--space-6)] overflow-y-auto px-[var(--space-6)] pb-[var(--space-12)] pt-[calc(var(--header-height)+var(--space-8))] text-center"
              style={{ minHeight: "100dvh" }}
              aria-label="Menú móvil"
            >
              {items.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.07, duration: 0.35 }}
                  className="flex flex-col items-center gap-[var(--space-3)]"
                >
                  {isNavGroup(item) ? (
                    <>
                      <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/60">{item.label}</p>
                      {item.children.map((link) => (
                        <MobileNavLink key={link.href} href={link.href} label={link.label} onNavigate={() => setIsOpen(false)} />
                      ))}
                    </>
                  ) : (
                    <MobileNavLink href={item.href} label={item.label} onNavigate={() => setIsOpen(false)} />
                  )}
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + items.length * 0.07, duration: 0.35 }}
                className="mt-[var(--space-4)]"
              >
                <Link
                  href="/panel"
                  onClick={() => setIsOpen(false)}
                  className="rounded-[var(--radius-md)] bg-white px-[var(--space-8)] py-[var(--space-4)] text-base font-semibold text-[var(--color-primary)] shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--color-secondary)] hover:text-white"
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

function MobileNavLink({ href, label, onNavigate }: { href: string; label: string; onNavigate: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="font-display text-3xl font-semibold text-white/75 transition-colors hover:text-white"
    >
      {label}
    </Link>
  );
}
