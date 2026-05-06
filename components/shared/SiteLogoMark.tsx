/* eslint-disable @next/next/no-img-element -- Logo del centro servido desde Sanity CDN; el optimizador no aplica con imágenes externas variables. */

interface Props {
  logoUrl: string;
  centerName: string;
  /** Alto en píxeles. */
  size?: number;
  className?: string;
}

/**
 * Renderiza el logo del centro como bloque (height fijo, width auto) sin texto.
 * El alt usa "Logo de <nombre>" para accesibilidad.
 */
export function SiteLogoMark({ logoUrl, centerName, size = 32, className = "" }: Props) {
  return (
    <img
      src={logoUrl}
      alt={`Logo de ${centerName}`}
      style={{ height: size, width: "auto" }}
      className={`object-contain ${className}`}
    />
  );
}
