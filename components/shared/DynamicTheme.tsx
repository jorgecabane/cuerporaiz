import { siteConfigRepository, centerRepository } from "@/lib/adapters/db";
import { sanitizeHexColor, hexToRgb, darkenHex } from "@/lib/domain/color-utils";

const DEFAULTS = { primary: "#2D3B2A", secondary: "#B85C38", accent: "#D4A574" };

export default async function DynamicTheme() {
  const slug = process.env.DEFAULT_CENTER_SLUG;
  if (!slug) return null;

  const center = await centerRepository.findBySlug(slug);
  if (!center) return null;

  const config = await siteConfigRepository.findByCenterId(center.id);
  if (!config?.colorPrimary && !config?.colorSecondary && !config?.colorAccent) return null;

  const primary = sanitizeHexColor(config.colorPrimary, DEFAULTS.primary);
  const secondary = sanitizeHexColor(config.colorSecondary, DEFAULTS.secondary);
  const accent = sanitizeHexColor(config.colorAccent, DEFAULTS.accent);
  const primaryRgb = hexToRgb(primary);
  const secondaryRgb = hexToRgb(secondary);

  const css = `:root {
  --color-primary: ${primary};
  --color-primary-hover: ${darkenHex(primary, 10)};
  --color-primary-light: rgba(${primaryRgb}, 0.08);
  --color-secondary: ${secondary};
  --color-secondary-hover: ${darkenHex(secondary, 10)};
  --color-secondary-light: rgba(${secondaryRgb}, 0.10);
  --color-accent: ${accent};
  --shadow-sm: 0 1px 3px rgba(${primaryRgb}, 0.08);
  --shadow-md: 0 4px 12px rgba(${primaryRgb}, 0.12);
  --shadow-lg: 0 8px 24px rgba(${primaryRgb}, 0.16);
  --hero-overlay-bottom: rgba(${primaryRgb}, 0.96);
  --hero-overlay-mid: rgba(${primaryRgb}, 0.55);
  --hero-overlay-top: rgba(${primaryRgb}, 0.15);
}`;

  // Safe: all values pass through sanitizeHexColor which validates against /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
