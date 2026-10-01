/**
 * Menú público agrupado por intención:
 * grupo "about" (conocer el espacio) · grupo "practice" (reservar / comprar) · Blog · Contacto.
 * Los títulos de los grupos están en NAV_GROUP_LABELS.
 */

export type NavLink = { href: string; label: string; description?: string };
export type NavGroup = { label: string; children: NavLink[] };
export type NavItem = NavLink | NavGroup;

export function isNavGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

/** Lista plana (footer, sitemap): los grupos se expanden en sus hijos. */
export function flattenNav(items: NavItem[]): NavLink[] {
  return items.flatMap((i) => (isNavGroup(i) ? i.children : [i]));
}

export interface PublicNavOptions {
  /** Label del link a /sobre, o null si la página no está visible en el header. */
  aboutLabel: string | null;
  /** Página "Conócenos" visible. */
  visitEnabled?: boolean;
  faqEnabled: boolean;
  /** Label del blog, o null si está deshabilitado. */
  blogLabel: string | null;
  /** Overrides editables desde /panel/sitio (vacío = default). */
  labels?: { inPerson?: string | null; online?: string | null; contact?: string | null };
}

/** Títulos de los submenús del header (único lugar donde se definen). */
export const NAV_GROUP_LABELS = { about: "Sobre Cuerpo Raíz", practice: "Practica" } as const;

export function buildPublicNav({ aboutLabel, visitEnabled = false, faqEnabled, blogLabel, labels = {} }: PublicNavOptions): NavItem[] {
  const about: NavLink[] = [
    ...(aboutLabel ? [{ href: "/sobre", label: aboutLabel, description: "Mi historia y propuesta" }] : []),
    ...(visitEnabled ? [{ href: "/conocenos", label: "Conócenos", description: "La sala y cómo llegar" }] : []),
    ...(faqEnabled ? [{ href: "/preguntas-frecuentes", label: "Preguntas frecuentes", description: "Dudas antes de venir" }] : []),
  ];
  const practice: NavLink[] = [
    { href: "/horarios", label: labels.inPerson || "Horarios", description: "Calendario, planes y clases presenciales" },
    { href: "/catalogo", label: labels.online || "Biblioteca Virtual", description: "Clases grabadas, tuyas para siempre" },
    { href: "/eventos", label: "Eventos y Experiencias", description: "Círculos, retiros y talleres" },
  ];

  return [
    ...groupOrLink(NAV_GROUP_LABELS.about, about),
    ...groupOrLink(NAV_GROUP_LABELS.practice, practice),
    ...(blogLabel ? [{ href: "/blog", label: blogLabel }] : []),
    { href: "/#contacto", label: labels.contact || "Contacto" },
  ];
}

/** Un grupo con 0 hijos no se muestra; con 1 hijo se muestra como link directo. */
function groupOrLink(label: string, children: NavLink[]): NavItem[] {
  if (children.length === 0) return [];
  if (children.length === 1) return [{ href: children[0].href, label: children[0].label }];
  return [{ label, children }];
}
