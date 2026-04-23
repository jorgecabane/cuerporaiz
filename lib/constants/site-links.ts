export type SiteLinkGroup = "home" | "page";

export interface SiteLinkSuggestion {
  href: string;
  label: string;
  group: SiteLinkGroup;
}

export const SITE_LINK_SUGGESTIONS: SiteLinkSuggestion[] = [
  { href: "/#como-funciona", label: "Formas de sumarse", group: "home" },
  { href: "/#agenda", label: "Reserva tu lugar (agenda)", group: "home" },
  { href: "/#oferta", label: "Online", group: "home" },
  { href: "/#propuesta", label: "Propuesta", group: "home" },
  { href: "/#sobre-trini", label: "Sobre Trini (preview)", group: "home" },
  { href: "/#biblioteca-virtual", label: "Biblioteca virtual", group: "home" },
  { href: "/#proximos-eventos", label: "Próximos eventos", group: "home" },
  { href: "/#contacto", label: "Contacto", group: "home" },
  { href: "/#cta", label: "CTA final", group: "home" },
  { href: "/planes", label: "Planes", group: "page" },
  { href: "/packs", label: "Packs", group: "page" },
  { href: "/membresia", label: "Membresía", group: "page" },
  { href: "/catalogo", label: "Biblioteca virtual (página)", group: "page" },
];
