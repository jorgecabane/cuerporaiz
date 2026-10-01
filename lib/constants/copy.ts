/**
 * Copy y textos de la marca (referencia: docs/PROJECT_CONTEXT.md)
 * Principio: nunca sonar a carrito. La experiencia primero.
 */

import { buildPublicNav, type NavItem } from "@/lib/domain/public-nav";

export const SITE_NAME = "Cuerpo Raíz";

export const TAGLINE =
  "cuerpo, respiración y placer. el camino de regreso a ti.";

/** Menú por defecto (sin centro configurado): solo lo que siempre existe. */
export const DEFAULT_NAV: NavItem[] = buildPublicNav({ aboutLabel: null, faqEnabled: false, blogLabel: null });

export const CTAS = {
  comenzarPractica: "Comenzar a practicar",
  verOpciones: "Ver opciones",
  sumarmeMembresia: "Sumarme",
  accederContenido: "Acceder al contenido",
  hablemos: "Hablemos",
  clasePrueba: "Agenda una clase de prueba",
  entrar: "Entrar",
  miCuenta: "Mi cuenta",
} as const;
