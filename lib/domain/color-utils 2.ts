const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Validate hex color, return fallback if invalid. Defense-in-depth against CSS injection. */
export function sanitizeHexColor(color: string | null | undefined, fallback: string): string {
  if (!color || !HEX_REGEX.test(color)) return fallback;
  return color;
}

/** Convert hex color to "R, G, B" string for use in rgba(). */
export function hexToRgb(hex: string): string {
  let r: number, g: number, b: number;
  const h = hex.replace("#", "");
  if (h.length === 3) {
    r = parseInt(h[0]! + h[0]!, 16);
    g = parseInt(h[1]! + h[1]!, 16);
    b = parseInt(h[2]! + h[2]!, 16);
  } else {
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  }
  return `${r}, ${g}, ${b}`;
}

/** Darken a hex color by a percentage (0-100). */
export function darkenHex(hex: string, percent: number): string {
  return adjustBrightness(hex, -percent);
}

/** Lighten a hex color by a percentage (0-100). */
export function lightenHex(hex: string, percent: number): string {
  return adjustBrightness(hex, percent);
}

function adjustBrightness(hex: string, percent: number): string {
  const h = hex.replace("#", "");
  const num = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const factor = percent / 100;
  const r = Math.min(255, Math.max(0, Math.round(((num >> 16) & 0xff) + 255 * factor)));
  const g = Math.min(255, Math.max(0, Math.round(((num >> 8) & 0xff) + 255 * factor)));
  const b = Math.min(255, Math.max(0, Math.round((num & 0xff) + 255 * factor)));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
