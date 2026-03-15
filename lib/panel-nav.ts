/**
 * Fuente única de verdad para ítems de navegación del panel.
 * Usado por PanelShell y por la página Mi cuenta (acciones rápidas).
 */

export const PANEL_NAV_ITEMS = [
  { href: "/panel", label: "Mi cuenta" },
  { href: "/panel/reservas", label: "Clases y reservas" },
  { href: "/planes", label: "Planes y comprar" },
] as const;

export const PANEL_ADMIN_ITEMS = [
  { href: "/panel/horarios", label: "Horarios" },
  { href: "/panel/disciplinas", label: "Disciplinas" },
  { href: "/panel/profesoras", label: "Profesoras" },
  { href: "/panel/feriados", label: "Feriados" },
  { href: "/panel/clientes", label: "Clientes" },
  { href: "/panel/politicas", label: "Configuración" },
  { href: "/panel/plugins", label: "Plugins" },
  { href: "/panel/planes", label: "Planes" },
  { href: "/panel/pagos", label: "Pagos" },
] as const;
