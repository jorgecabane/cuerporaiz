"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/panel/actions";
import { useFormStatus } from "react-dom";
import {
  ChevronDown,
  Menu,
  X,
  Home,
  User,
  Calendar,
  CreditCard,
  Banknote,
  LayoutDashboard,
  Users,
  FileText,
  Plug,
  Wallet,
  LogOut,
  Clock,
  Sparkles,
  UserCheck,
  CalendarOff,
  Settings,
  Play,
} from "lucide-react";
import { SITE_NAME } from "@/lib/constants/copy";
import { PANEL_NAV_ITEMS, PANEL_ADMIN_ITEMS } from "@/lib/panel-nav";

const NAV_ICONS = [Home, Calendar, CreditCard, Banknote, Play] as const;
const ADMIN_ICONS = [Clock, Sparkles, UserCheck, CalendarOff, Users, Settings, Plug, LayoutDashboard, Wallet, Play] as const;
const NAV_ITEMS = PANEL_NAV_ITEMS.map((item, i) => ({
  ...item,
  icon: NAV_ICONS[i]!,
}));
const ADMIN_ITEMS = PANEL_ADMIN_ITEMS.map((item, i) => ({
  ...item,
  icon: ADMIN_ICONS[i]!,
}));

function SignOutButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full cursor-pointer items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-left text-sm font-medium text-[var(--color-text)] transition-colors duration-200 hover:bg-[var(--color-primary-light)] disabled:opacity-60"
      aria-label={pending ? "Cerrando sesión…" : "Cerrar sesión"}
    >
      <LogOut className="h-4 w-4 shrink-0" aria-hidden />
      {pending ? "Cerrando sesión…" : "Cerrar sesión"}
    </button>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isPanelRoot = href === "/panel";
  const isTienda = href === "/panel/tienda";
  const isActive = isPanelRoot
    ? pathname === "/panel"
    : isTienda
      ? pathname === "/panel/tienda"
      : pathname?.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
        isActive
          ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
          : "text-[var(--color-text)] hover:bg-[var(--color-primary-light)]"
      }`}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </Link>
  );
}

export function PanelShell({
  children,
  isAdmin,
  user,
  centerName,
}: {
  children: React.ReactNode;
  isAdmin: boolean;
  user: { name?: string | null; email: string };
  centerName: string;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const openDrawerButtonRef = useRef<HTMLButtonElement>(null);

  const closeDrawer = () => {
    setDrawerOpen(false);
    openDrawerButtonRef.current?.focus();
  };

  // Focus trap: when drawer opens, focus first focusable inside
  useEffect(() => {
    if (!drawerOpen) return;
    const drawer = document.querySelector('[data-panel-drawer]');
    const firstFocusable = drawer?.querySelector<HTMLElement>(
      'button[aria-label="Cerrar menú"], a[href]'
    );
    firstFocusable?.focus();
  }, [drawerOpen]);

  // Close user menu on click outside
  useEffect(() => {
    if (!userMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [userMenuOpen]);

  const sidebarContent = (
    <nav className="flex flex-col gap-0.5 p-3" aria-label="Navegación del panel">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.href}
          href={item.href}
          label={item.label}
          icon={item.icon}
          onClick={closeDrawer}
        />
      ))}
      {isAdmin && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setAdminOpen((o) => !o)}
            className="flex w-full cursor-pointer items-center justify-between rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium text-[var(--color-text)] transition-colors duration-200 hover:bg-[var(--color-primary-light)]"
            aria-expanded={adminOpen}
          >
            <span className="flex items-center gap-3">
              <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
              Admin
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform duration-200 ${adminOpen ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
          {adminOpen && (
            <div className="ml-5 mt-0.5 flex flex-col gap-0.5 border-l-2 border-[var(--color-border)] pl-3">
              {ADMIN_ITEMS.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  onClick={closeDrawer}
                />
              ))}
            </div>
          )}
        </div>
      )}
      <div className="mt-auto flex flex-col gap-0.5 border-t border-[var(--color-border)] pt-3">
        <form action={signOutAction}>
          <SignOutButton />
        </form>
        <Link
          href="/"
          onClick={closeDrawer}
          className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium text-[var(--color-text)] transition-colors duration-200 hover:bg-[var(--color-primary-light)]"
        >
          <Home className="h-4 w-4 shrink-0" aria-hidden />
          Ir al inicio
        </Link>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--color-tertiary)]">
      {/* Header: logo + user menu — visible on all viewports */}
      <header
        className="sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 shadow-[var(--shadow-sm)] md:px-6"
        role="banner"
      >
        <div className="flex min-w-0 items-center gap-3">
          <button
            ref={openDrawerButtonRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-[var(--radius-md)] p-2 text-[var(--color-text)] transition-colors duration-200 hover:bg-[var(--color-primary-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 md:hidden"
            aria-label="Abrir menú"
            aria-expanded={drawerOpen}
          >
            <Menu className="h-6 w-6" aria-hidden />
          </button>
          <Link
            href="/"
            className="font-display text-xl font-semibold text-[var(--color-primary)] transition-colors duration-200 hover:text-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--color-surface)] rounded-[var(--radius-md)]"
          >
            {SITE_NAME}
          </Link>
        </div>

        <div className="relative flex items-center gap-2" ref={menuRef}>
          <Link
            href="/"
            className="hidden cursor-pointer items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium text-[var(--color-text)] transition-colors duration-200 hover:bg-[var(--color-primary-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 sm:inline-flex"
          >
            <Home className="h-4 w-4" aria-hidden />
            Inicio
          </Link>
          <button
            type="button"
            onClick={() => setUserMenuOpen((o) => !o)}
            className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium text-[var(--color-text)] transition-colors duration-200 hover:bg-[var(--color-primary-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
            aria-label="Menú de cuenta"
          >
            <span className="max-w-[8rem] truncate md:max-w-[12rem]">
              {user.name ?? user.email}
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
          {userMenuOpen && (
            <div
              className="absolute right-0 top-full z-50 mt-1 min-w-[12rem] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-[var(--shadow-lg)]"
              role="menu"
            >
              <div className="border-b border-[var(--color-border)] px-3 py-2">
                <p className="truncate text-xs text-[var(--color-text-muted)]">
                  {user.email}
                </p>
                {user.name && (
                  <p className="truncate text-sm font-medium text-[var(--color-text)]">
                    {user.name}
                  </p>
                )}
              </div>
              <Link
                href="/panel/mi-perfil"
                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--color-text)] transition-colors duration-200 hover:bg-[var(--color-primary-light)]"
                role="menuitem"
                onClick={() => setUserMenuOpen(false)}
              >
                <User className="h-4 w-4" aria-hidden />
                Mi perfil
              </Link>
              <form action={signOutAction} role="menuitem">
                <SignOutButton />
              </form>
              <Link
                href="/"
                className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium text-[var(--color-text)] transition-colors duration-200 hover:bg-[var(--color-primary-light)]"
                role="menuitem"
                onClick={() => setUserMenuOpen(false)}
              >
                <Home className="h-4 w-4" aria-hidden />
                Ir al inicio
              </Link>
            </div>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Desktop sidebar */}
        <aside
          className="hidden w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] md:flex"
          aria-label="Navegación del panel"
        >
          {sidebarContent}
        </aside>

        {/* Mobile drawer */}
        {drawerOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              aria-hidden
              onClick={closeDrawer}
            />
            <aside
              data-panel-drawer
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl md:hidden"
              aria-label="Menú del panel"
            >
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4">
                <span className="font-display text-lg font-semibold text-[var(--color-primary)]">
                  {SITE_NAME}
                </span>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="rounded-[var(--radius-md)] p-2 text-[var(--color-text)] transition-colors duration-200 hover:bg-[var(--color-primary-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  aria-label="Cerrar menú"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-auto">
                {sidebarContent}
              </div>
            </aside>
          </>
        )}

        {/* Main content */}
        <main
          id="main"
          className="min-w-0 flex-1 overflow-auto p-4 md:p-6 lg:p-8"
          role="main"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
