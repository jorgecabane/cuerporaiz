/**
 * Fuente única de verdad para ítems de navegación del panel.
 * Usado por PanelShell y por la página Mi cuenta (acciones rápidas).
 */

export const PANEL_NAV_ITEMS = [
  { href: "/panel", label: "Home" },
  { href: "/panel/reservas", label: "Reservas" },
  { href: "/planes", label: "Planes y comprar" },
] as const;

export const PANEL_ADMIN_ITEMS = [
  { href: "/panel/horarios", label: "Horarios" },
  { href: "/panel/disciplinas", label: "Disciplinas" },
  { href: "/panel/profesores", label: "Profesores" },
  { href: "/panel/feriados", label: "Feriados" },
  { href: "/panel/clientes", label: "Clientes" },
  { href: "/panel/configuracion", label: "Configuración" },
  { href: "/panel/plugins", label: "Plugins" },
  { href: "/panel/planes", label: "Planes" },
  { href: "/panel/pagos", label: "Pagos" },
] as const;
