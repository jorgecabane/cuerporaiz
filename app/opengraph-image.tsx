import { ImageResponse } from "next/og";
import { centerRepository, siteConfigRepository } from "@/lib/adapters/db";
import { getSiteUrl } from "@/lib/seo/urls";

export const alt = "Cuerpo Raíz";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

export default async function OpengraphImage() {
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
  let name = "Cuerpo Raíz";
  let headline = "el camino de regreso a tu cuerpo";
  let colorPrimary = "#2D3B2A";
  let colorSecondary = "#B85C38";

  if (slug) {
    try {
      const center = await centerRepository.findBySlug(slug);
      if (center) {
        name = center.name;
        const cfg = await siteConfigRepository.findByCenterId(center.id);
        if (cfg?.heroSubtitle?.trim()) headline = cfg.heroSubtitle.trim();
        if (cfg?.colorPrimary) colorPrimary = cfg.colorPrimary;
        if (cfg?.colorSecondary) colorSecondary = cfg.colorSecondary;
      }
    } catch {
      // falls back to defaults below
    }
  }

  const domain = new URL(getSiteUrl()).host;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: `linear-gradient(135deg, ${colorPrimary} 0%, ${colorSecondary} 100%)`,
          color: "#FFFFFF",
          padding: "72px 80px",
          fontFamily: "serif",
        }}
      >
        {/* Eyebrow: center name */}
        <div
          style={{
            fontSize: 26,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            opacity: 0.85,
            fontFamily: "sans-serif",
          }}
        >
          {name}
        </div>

        {/* Headline: heroSubtitle as big italic */}
        <div
          style={{
            display: "flex",
            fontSize: 100,
            lineHeight: 1.04,
            fontWeight: 500,
            fontStyle: "italic",
            letterSpacing: "-0.01em",
            maxWidth: 980,
          }}
        >
          {headline}
        </div>

        {/* Footer: CTA + domain */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 26,
            fontFamily: "sans-serif",
            opacity: 0.92,
          }}
        >
          <span
            style={{
              display: "flex",
              borderBottom: "2px solid rgba(255,255,255,0.9)",
              paddingBottom: "6px",
            }}
          >
            Reserva tu clase →
          </span>
          <span style={{ display: "flex", opacity: 0.7 }}>{domain}</span>
        </div>
      </div>
    ),
    size,
  );
}
