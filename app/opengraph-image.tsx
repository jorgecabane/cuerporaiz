import { ImageResponse } from "next/og";
import { centerRepository, siteConfigRepository } from "@/lib/adapters/db";

export const alt = "Cuerpo Raíz";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

export default async function OpengraphImage() {
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
  let name = "Cuerpo Raíz";
  let subtitle = "cuerpo, respiración y placer";
  let colorPrimary = "#2D3B2A";
  let colorSecondary = "#B85C38";

  if (slug) {
    try {
      const center = await centerRepository.findBySlug(slug);
      if (center) {
        name = center.name;
        const cfg = await siteConfigRepository.findByCenterId(center.id);
        if (cfg?.heroSubtitle?.trim()) subtitle = cfg.heroSubtitle.trim();
        if (cfg?.colorPrimary) colorPrimary = cfg.colorPrimary;
        if (cfg?.colorSecondary) colorSecondary = cfg.colorSecondary;
      }
    } catch {
      // falls back to defaults below
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: `linear-gradient(135deg, ${colorPrimary} 0%, ${colorSecondary} 100%)`,
          color: "#FFFFFF",
          padding: "96px",
          textAlign: "center",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            opacity: 0.85,
            marginBottom: 48,
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontSize: 112,
            lineHeight: 1.04,
            fontWeight: 500,
            maxWidth: 1000,
            fontStyle: "italic",
          }}
        >
          {subtitle}
        </div>
      </div>
    ),
    size,
  );
}
