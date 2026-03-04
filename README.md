# Cuerpo Raíz

*cuerpo, respiración y placer. el camino de regreso a ti.*

Front mock del proyecto Cuerpo Raíz: yoga con identidad, clases presenciales y online, membresía. Sigue los design guidelines (Tierra y cuerpo) y la experiencia narrativa acordada.

## Cómo correr

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Estructura del mock

- **Design tokens** en `app/globals.css` (paleta, espaciado, tipografía, radios, duraciones). Sin números mágicos ni estilos inline.
- **Home:** Hero (imagen placeholder), Propuesta, Cómo funciona, Packs y membresía, Sobre Trini, CTA final. Copy de voz de marca en `lib/constants/copy.ts`.
- **Placeholders:** Imágenes de Unsplash por sección (hero: práctica en naturaleza; oferta: yoga naturaleza / espacio en casa; sobre: mujer en práctica). Reemplazar por fotos reales cuando estén.
- **Rutas:** `/` (home), `/packs` y `/membresia` (placeholders de contenido futuro).

## Docs de referencia

- `docs/DESIGN_GUIDELINES.md` — Paleta, principios, variables, narrativa.
- `docs/PROJECT_CONTEXT.md` — Contexto del proyecto, Trini, pagos, roadmap.
- `docs/ARCHITECTURE.md` — Hexagonal, DTOs, backend vs Sanity.

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS 4. Fuentes: Cormorant Garamond (display), DM Sans (cuerpo).
