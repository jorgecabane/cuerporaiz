# Site Customization + Dynamic Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded home page with dynamic data from the center's database, allow admins to customize branding/sections/content, and apply center colors dynamically via CSS variables.

**Architecture:** New Prisma models `CenterSiteConfig`, `CenterSiteSection`, `CenterSiteSectionItem` store branding and editable content. Server Components query center data via `DEFAULT_CENTER_SLUG` env var. CSS custom properties are injected server-side from center colors with computed derived variants. Admin panel page `/panel/sitio` provides CRUD for all site configuration. Seed script pre-loads current hardcoded content.

**Tech Stack:** Next.js 16, React 19, Prisma 7, Zod, Vitest, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-03-25-site-customization-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `lib/domain/color-utils.ts` | Pure functions: sanitizeHexColor, hexToRgb, darkenHex, lightenHex |
| `lib/domain/color-utils.test.ts` | Tests for color utilities |
| `lib/domain/site-config.ts` | Domain types: CenterSiteConfig, SiteSection, SiteSectionItem, SectionKey |
| `lib/ports/site-config-repository.ts` | Port: ISiteConfigRepository interface |
| `lib/ports/site-section-repository.ts` | Port: ISiteSectionRepository interface |
| `lib/adapters/db/site-config-repository.ts` | Prisma implementation of ISiteConfigRepository |
| `lib/adapters/db/site-section-repository.ts` | Prisma implementation of ISiteSectionRepository |
| `lib/dto/site-config-dto.ts` | Zod schemas for config, section, item updates |
| `lib/dto/site-config-dto.test.ts` | Tests for site config DTOs |
| `app/api/panel/site-config/route.ts` | GET + PATCH site config |
| `app/api/panel/site-sections/route.ts` | GET all sections |
| `app/api/panel/site-sections/[id]/route.ts` | PATCH section |
| `app/api/panel/site-sections/reorder/route.ts` | PATCH reorder sections |
| `app/api/panel/site-sections/[id]/items/route.ts` | POST create item |
| `app/api/panel/site-sections/[id]/items/[itemId]/route.ts` | PATCH + DELETE item |
| `app/api/panel/site-sections/[id]/items/reorder/route.ts` | PATCH reorder items |
| `app/panel/sitio/page.tsx` | Admin: site customization page (Server Component) |
| `app/panel/sitio/BrandingForm.tsx` | Client Component: hero, colors, logo |
| `app/panel/sitio/ContactForm.tsx` | Client Component: email, phone, address, socials |
| `app/panel/sitio/SectionsManager.tsx` | Client Component: section list with toggles + reorder |
| `app/panel/sitio/SectionItemsEditor.tsx` | Client Component: CRUD items within a section |
| `components/shared/DynamicTheme.tsx` | Server Component: injects CSS variables from center colors |
| `components/sections/home/DisciplinesSection.tsx` | New section: disciplines del centro |
| `components/sections/home/ContactSection.tsx` | New section: contacto con datos de CenterSiteConfig |

### Modified Files

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add CenterSiteConfig, CenterSiteSection, CenterSiteSectionItem models + relations |
| `prisma/seed.ts` | Add seed for site config + sections + items replicating current hardcoded home |
| `lib/ports/index.ts` | Export new repository types |
| `lib/adapters/db/index.ts` | Export new repository instances |
| `lib/panel-nav.ts` | Add "Sitio" to PANEL_ADMIN_ITEMS |
| `app/layout.tsx` | Add DynamicTheme component |
| `app/page.tsx` | Replace hardcoded sections with dynamic data from DB |
| `components/sections/home/HeroSection.tsx` | Accept props instead of hardcoded content |
| `components/sections/home/PropuestaSection.tsx` | Accept props (maps to `about` section) |
| `components/sections/home/ComoFuncionaSection.tsx` | Accept props (maps to `how-it-works` section) |
| `components/sections/home/AgendaSection.tsx` | Accept props for schedule + plans from DB |
| `components/sections/home/OfertaSection.tsx` | Accept props (maps to `on-demand` section data) |
| `components/sections/home/TestimoniosSection.tsx` | Accept props (maps to `testimonials` section) |
| `components/sections/home/SobreTriniSection.tsx` | Accept props (maps to `team` section) |
| `components/sections/home/CtaSection.tsx` | Accept props (maps to `cta` section) |
| `components/sections/home/index.ts` | Update barrel exports for new/changed components |
| `.env.example` | Add DEFAULT_CENTER_SLUG |

---

## Task 1: Color Utilities (Domain)

**Files:**
- Create: `lib/domain/color-utils.ts`
- Create: `lib/domain/color-utils.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// lib/domain/color-utils.test.ts
import { describe, it, expect } from "vitest";
import { sanitizeHexColor, hexToRgb, darkenHex, lightenHex } from "./color-utils";

describe("sanitizeHexColor", () => {
  it("accepts valid 6-digit hex", () => {
    expect(sanitizeHexColor("#2D3B2A", "#000000")).toBe("#2D3B2A");
  });

  it("accepts valid 3-digit hex", () => {
    expect(sanitizeHexColor("#FFF", "#000000")).toBe("#FFF");
  });

  it("returns fallback for null/undefined", () => {
    expect(sanitizeHexColor(null, "#2D3B2A")).toBe("#2D3B2A");
    expect(sanitizeHexColor(undefined, "#2D3B2A")).toBe("#2D3B2A");
  });

  it("returns fallback for invalid hex", () => {
    expect(sanitizeHexColor("not-a-color", "#2D3B2A")).toBe("#2D3B2A");
  });

  it("returns fallback for CSS injection attempt", () => {
    expect(sanitizeHexColor("#000; } body { display: none } :root {", "#2D3B2A")).toBe("#2D3B2A");
  });

  it("returns fallback for empty string", () => {
    expect(sanitizeHexColor("", "#2D3B2A")).toBe("#2D3B2A");
  });
});

describe("hexToRgb", () => {
  it("converts 6-digit hex to RGB string", () => {
    expect(hexToRgb("#2D3B2A")).toBe("45, 59, 42");
  });

  it("converts 3-digit hex to RGB string", () => {
    expect(hexToRgb("#FFF")).toBe("255, 255, 255");
  });

  it("handles lowercase", () => {
    expect(hexToRgb("#ff0000")).toBe("255, 0, 0");
  });
});

describe("darkenHex", () => {
  it("darkens a color by given percentage", () => {
    const result = darkenHex("#FFFFFF", 10);
    expect(result).toBe("#e6e6e6");
  });

  it("does not go below #000000", () => {
    const result = darkenHex("#010101", 99);
    expect(result).toBe("#000000");
  });
});

describe("lightenHex", () => {
  it("lightens a color by given percentage", () => {
    const result = lightenHex("#000000", 10);
    expect(result).toBe("#1a1a1a");
  });

  it("does not go above #FFFFFF", () => {
    const result = lightenHex("#fefefe", 99);
    expect(result).toBe("#ffffff");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/domain/color-utils.test.ts`

- [ ] **Step 3: Write implementation**

```typescript
// lib/domain/color-utils.ts

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/domain/color-utils.test.ts`

- [ ] **Step 5: Commit**

```bash
git add lib/domain/color-utils.ts lib/domain/color-utils.test.ts
git commit -m "feat: add color utility functions (sanitize, hex-to-rgb, darken, lighten)"
```

---

## Task 2: Domain Types + Prisma Models

**Files:**
- Create: `lib/domain/site-config.ts`
- Modify: `prisma/schema.prisma`
- Create migration manually

- [ ] **Step 1: Create domain types**

```typescript
// lib/domain/site-config.ts

export const SECTION_KEYS = [
  "hero",
  "about",
  "how-it-works",
  "schedule",
  "plans",
  "on-demand",
  "disciplines",
  "team",
  "testimonials",
  "cta",
  "contact",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export interface SiteConfig {
  id: string;
  centerId: string;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageUrl: string | null;
  logoUrl: string | null;
  colorPrimary: string | null;
  colorSecondary: string | null;
  colorAccent: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  whatsappUrl: string | null;
  youtubeUrl: string | null;
}

export interface SiteSection {
  id: string;
  centerId: string;
  sectionKey: SectionKey;
  title: string | null;
  subtitle: string | null;
  visible: boolean;
  sortOrder: number;
}

export interface SiteSectionItem {
  id: string;
  sectionId: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  userId: string | null;
  sortOrder: number;
}

export interface SiteSectionWithItems extends SiteSection {
  items: SiteSectionItem[];
}
```

- [ ] **Step 2: Add Prisma models**

Add to `prisma/schema.prisma` — the 3 new models (`CenterSiteConfig`, `CenterSiteSection`, `CenterSiteSectionItem`) as defined in the spec. Add relations to `Center` (`siteConfig CenterSiteConfig?`, `siteSections CenterSiteSection[]`) and to `User` (`siteItems CenterSiteSectionItem[]`).

- [ ] **Step 3: Create migration SQL manually**

Create `prisma/migrations/YYYYMMDDHHMMSS_add_site_customization/migration.sql` with CREATE TABLE statements for the 3 models, indexes, unique constraints, and foreign keys — following the same pattern as the EmailPreference migration.

- [ ] **Step 4: Apply migration + generate**

Run: `npx prisma migrate deploy && npx prisma generate`

If using local dev DB: `npx prisma migrate dev` instead. For Supabase: apply SQL manually via SQL Editor.

- [ ] **Step 5: Add DEFAULT_CENTER_SLUG to .env.example**

Add `DEFAULT_CENTER_SLUG=cuerporaiz` to `.env.example` and to your local `.env`.

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 7: Commit**

```bash
git add lib/domain/site-config.ts prisma/schema.prisma prisma/migrations/ .env.example
git commit -m "feat: add CenterSiteConfig, CenterSiteSection, CenterSiteSectionItem models"
```

---

## Task 3: DTOs (Zod Schemas)

**Files:**
- Create: `lib/dto/site-config-dto.ts`
- Create: `lib/dto/site-config-dto.test.ts`

- [ ] **Step 1: Write failing tests**

Tests should validate:
- `upsertSiteConfigSchema`: hex color validation (accepts valid, rejects invalid/injection), https-only URLs, optional fields
- `updateSiteSectionSchema`: boolean visible, string title/subtitle
- `createSiteSectionItemSchema`: https-only imageUrl/linkUrl, optional userId
- `reorderSchema`: array of string IDs

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run lib/dto/site-config-dto.test.ts`

- [ ] **Step 3: Write DTO implementations**

```typescript
// lib/dto/site-config-dto.ts
import { z } from "zod";

const hexColorSchema = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color hex inválido").nullable().optional();
const httpsUrlSchema = z.string().url().startsWith("https://", "Solo URLs https://").nullable().optional();

export const upsertSiteConfigSchema = z.object({
  heroTitle: z.string().nullable().optional(),
  heroSubtitle: z.string().nullable().optional(),
  heroImageUrl: httpsUrlSchema,
  logoUrl: httpsUrlSchema,
  colorPrimary: hexColorSchema,
  colorSecondary: hexColorSchema,
  colorAccent: hexColorSchema,
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  contactAddress: z.string().nullable().optional(),
  instagramUrl: httpsUrlSchema,
  facebookUrl: httpsUrlSchema,
  whatsappUrl: httpsUrlSchema,
  youtubeUrl: httpsUrlSchema,
});
export type UpsertSiteConfigInput = z.infer<typeof upsertSiteConfigSchema>;

export const updateSiteSectionSchema = z.object({
  title: z.string().nullable().optional(),
  subtitle: z.string().nullable().optional(),
  visible: z.boolean().optional(),
});
export type UpdateSiteSectionInput = z.infer<typeof updateSiteSectionSchema>;

export const createSiteSectionItemSchema = z.object({
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  imageUrl: httpsUrlSchema,
  linkUrl: httpsUrlSchema,
  userId: z.string().nullable().optional(),
});
export type CreateSiteSectionItemInput = z.infer<typeof createSiteSectionItemSchema>;

export const updateSiteSectionItemSchema = createSiteSectionItemSchema;
export type UpdateSiteSectionItemInput = z.infer<typeof updateSiteSectionItemSchema>;

export const reorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)),
});
export type ReorderInput = z.infer<typeof reorderSchema>;
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/dto/site-config-dto.test.ts`

- [ ] **Step 5: Commit**

```bash
git add lib/dto/site-config-dto.ts lib/dto/site-config-dto.test.ts
git commit -m "feat: add site config and section Zod DTOs"
```

---

## Task 4: Ports + Adapters (Repositories)

**Files:**
- Create: `lib/ports/site-config-repository.ts`
- Create: `lib/ports/site-section-repository.ts`
- Create: `lib/adapters/db/site-config-repository.ts`
- Create: `lib/adapters/db/site-section-repository.ts`
- Modify: `lib/ports/index.ts`
- Modify: `lib/adapters/db/index.ts`

- [ ] **Step 1: Create port interfaces**

As defined in the spec: `ISiteConfigRepository` with `findByCenterId` + `upsert`, and `ISiteSectionRepository` with `findByCenterId`, `findByIdWithItems`, `update`, `reorder`, `createItem`, `updateItem`, `deleteItem`, `reorderItems`.

- [ ] **Step 2: Create Prisma adapters**

Implement both repositories using `prisma.centerSiteConfig.*` and `prisma.centerSiteSection.*`.

For reorder operations, use a transaction that updates `sortOrder` based on array index:
```typescript
async reorder(centerId: string, orderedIds: string[]): Promise<void> {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.centerSiteSection.update({ where: { id }, data: { sortOrder: index } })
    )
  );
}
```

- [ ] **Step 3: Export from index files**

Add to `lib/ports/index.ts` and `lib/adapters/db/index.ts`.

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add lib/ports/site-config-repository.ts lib/ports/site-section-repository.ts lib/adapters/db/site-config-repository.ts lib/adapters/db/site-section-repository.ts lib/ports/index.ts lib/adapters/db/index.ts
git commit -m "feat: add site config and section repositories (port + Prisma adapter)"
```

---

## Task 5: DynamicTheme Component

**Files:**
- Create: `components/shared/DynamicTheme.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create DynamicTheme server component**

```typescript
// components/shared/DynamicTheme.tsx
import { siteConfigRepository } from "@/lib/adapters/db";
import { centerRepository } from "@/lib/adapters/db";
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

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
```

Note: `dangerouslySetInnerHTML` is safe here because all values pass through `sanitizeHexColor` which strictly validates against `/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/`.

- [ ] **Step 2: Add to layout.tsx**

Import `DynamicTheme` and render it inside `<head>` or at the top of `<body>`, after the font style tags.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add components/shared/DynamicTheme.tsx app/layout.tsx
git commit -m "feat: add DynamicTheme server component for center-specific CSS variables"
```

---

## Task 6: Seed Script — Replicate Current Home

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Read current home sections**

Read all files in `components/sections/home/` to extract exact hardcoded texts, images, and data. Use these as seed content.

- [ ] **Step 2: Add site config seed (idempotent with upsert)**

After the existing center creation, use `upsert` to add `CenterSiteConfig` with current branding values, and `CenterSiteSection` records for each section key with items replicating the hardcoded content. Use `upsert` so the seed is safe to run multiple times.

Key sections to seed:
- `hero`: title/subtitle from HeroSection.tsx
- `about`: item with PropuestaSection content
- `how-it-works`: 3 items from ComoFuncionaSection steps
- `schedule`: title/subtitle (data comes from LiveClass queries)
- `plans`: title/subtitle (data comes from Plan queries)
- `on-demand`: visible=false
- `disciplines`: title/subtitle (data comes from Discipline queries)
- `team`: items from SobreTriniSection (Trini's bio, image, practices)
- `testimonials`: items from TestimoniosSection
- `cta`: title/subtitle from CtaSection
- `contact`: title/subtitle (data from siteConfig)

- [ ] **Step 3: Run seed**

Run: `npm run db:seed`

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: seed site config and sections replicating current hardcoded home"
```

---

## Task 7: API Routes — Site Config

**Files:**
- Create: `app/api/panel/site-config/route.ts`

- [ ] **Step 1: Write GET + PATCH endpoints**

Auth pattern (same for all admin routes in Tasks 7-8):
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain/role";
import { revalidatePath } from "next/cache";

// At start of each handler:
const session = await auth();
if (!session?.user?.id || !isAdminRole(session.user.role)) {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}
const centerId = session.user.centerId;
```

GET returns current config or defaults. PATCH validates with `upsertSiteConfigSchema`, upserts using `centerId` from session (never from request body), calls `revalidatePath("/")` for ISR invalidation.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add app/api/panel/site-config/route.ts
git commit -m "feat: add site config API routes (GET + PATCH)"
```

---

## Task 8: API Routes — Site Sections + Items

**Files:**
- Create: `app/api/panel/site-sections/route.ts`
- Create: `app/api/panel/site-sections/[id]/route.ts`
- Create: `app/api/panel/site-sections/reorder/route.ts`
- Create: `app/api/panel/site-sections/[id]/items/route.ts`
- Create: `app/api/panel/site-sections/[id]/items/[itemId]/route.ts`
- Create: `app/api/panel/site-sections/[id]/items/reorder/route.ts`

- [ ] **Step 1: Write section routes**

GET all sections with items, PATCH section (title/subtitle/visible), PATCH reorder.

- [ ] **Step 2: Write item routes**

POST create item, PATCH update item, DELETE item, PATCH reorder items.

All routes: admin auth, Zod validation, `revalidatePath("/")` on mutations.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add app/api/panel/site-sections/
git commit -m "feat: add site sections and items API routes (CRUD + reorder)"
```

---

## Task 9A: Admin Panel — Page + Branding + Contact Forms

**Files:**
- Create: `app/panel/sitio/page.tsx`
- Create: `app/panel/sitio/BrandingForm.tsx`
- Create: `app/panel/sitio/ContactForm.tsx`
- Modify: `lib/panel-nav.ts`

- [ ] **Step 1: Add nav item**

Add `{ href: "/panel/sitio", label: "Sitio" }` to `PANEL_ADMIN_ITEMS` in `lib/panel-nav.ts`. Use the `Globe` icon from lucide-react (already imported in PanelShell).

- [ ] **Step 2: Create page.tsx (Server Component)**

Admin-only page (redirect non-admins). Uses `searchParams` for tab navigation: `?tab=branding` (default), `?tab=secciones`, `?tab=contacto`. Loads `siteConfig` and `sections` server-side. Same tab pattern as `app/panel/mi-perfil/page.tsx`.

- [ ] **Step 3: Create BrandingForm**

Client component following `EditClientForm` pattern:
- `"use client"`, `useTransition` + `useState` for error/success
- Hero fields: title (text input), subtitle (text input), image URL (text input)
- Color pickers: 3 native `<input type="color">` for primary/secondary/accent, with hex value shown
- Logo URL (text input)
- Submit via `fetch("/api/panel/site-config", { method: "PATCH", ... })`
- Use same `inputCls` and `labelCls` class patterns from existing forms
- On success: `router.refresh()` + success message

- [ ] **Step 4: Create ContactForm**

Same client component pattern. Fields: email, phone, address, Instagram URL, Facebook URL, WhatsApp URL, YouTube URL.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 6: Commit**

```bash
git add app/panel/sitio/page.tsx app/panel/sitio/BrandingForm.tsx app/panel/sitio/ContactForm.tsx lib/panel-nav.ts
git commit -m "feat: add admin site customization page with branding and contact forms"
```

---

## Task 9B: Admin Panel — Sections Manager

**Files:**
- Create: `app/panel/sitio/SectionsManager.tsx`

- [ ] **Step 1: Create SectionsManager**

Client component. Fetches sections from `GET /api/panel/site-sections`. Renders a list of sections with:
- Section name (from `sectionKey` mapped to Spanish labels)
- Toggle switch for `visible` (same pattern as `EmailPreferencesForm` toggle — `role="switch"`, `aria-checked`)
- Up/down arrow buttons for reorder (simpler than drag & drop for first version)
- For editable sections (`team`, `testimonials`, `about`, `how-it-works`): "Editar contenido" button that expands `SectionItemsEditor`

On toggle change: PATCH `/api/panel/site-sections/[id]` with `{ visible: newValue }`.
On reorder: PATCH `/api/panel/site-sections/reorder` with `{ orderedIds: [...] }`.

Section key labels:
```typescript
const SECTION_LABELS: Record<string, string> = {
  hero: "Hero / Portada",
  about: "Propuesta",
  "how-it-works": "Cómo funciona",
  schedule: "Agenda / Horarios",
  plans: "Planes",
  "on-demand": "On Demand",
  disciplines: "Disciplinas",
  team: "Equipo",
  testimonials: "Testimonios",
  cta: "Llamado a la acción",
  contact: "Contacto",
};
```

- [ ] **Step 2: Wire into page.tsx tab="secciones"**

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add app/panel/sitio/SectionsManager.tsx app/panel/sitio/page.tsx
git commit -m "feat: add sections manager with visibility toggles and reorder"
```

---

## Task 9C: Admin Panel — Section Items Editor

**Files:**
- Create: `app/panel/sitio/SectionItemsEditor.tsx`

- [ ] **Step 1: Create SectionItemsEditor**

Client component. Receives `sectionId` prop. Fetches items from the section data. Renders:
- List of existing items (title, description preview, thumbnail if imageUrl)
- "Agregar" button to create new item
- Each item has "Editar" and "Eliminar" buttons
- Inline edit form (same `inputCls` pattern): title, description (textarea), imageUrl, linkUrl
- Up/down buttons for reorder

CRUD operations:
- Create: `POST /api/panel/site-sections/[id]/items`
- Update: `PATCH /api/panel/site-sections/[id]/items/[itemId]`
- Delete: `DELETE /api/panel/site-sections/[id]/items/[itemId]` with confirmation
- Reorder: `PATCH /api/panel/site-sections/[id]/items/reorder`

- [ ] **Step 2: Wire into SectionsManager (expand on "Editar contenido" click)**

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add app/panel/sitio/SectionItemsEditor.tsx app/panel/sitio/SectionsManager.tsx
git commit -m "feat: add section items editor (CRUD + reorder)"
```

---

## Task 10: Dynamize Home Page — Section Components

**Files:**
- Modify: `components/sections/home/HeroSection.tsx`
- Modify: `components/sections/home/PropuestaSection.tsx`
- Modify: `components/sections/home/ComoFuncionaSection.tsx`
- Modify: `components/sections/home/AgendaSection.tsx`
- Modify: `components/sections/home/OfertaSection.tsx`
- Modify: `components/sections/home/TestimoniosSection.tsx`
- Modify: `components/sections/home/SobreTriniSection.tsx`
- Modify: `components/sections/home/CtaSection.tsx`

- [ ] **Step 1: Read all current section components**

Read each component fully to understand props, animations, and layout before modifying.

- [ ] **Step 2: Refactor each section to accept props**

For each section component:
1. Define a props interface with the data it needs
2. Replace hardcoded content with prop values
3. Add fallback defaults (so the component still renders if props are missing)
4. Keep all existing animations, styles, and layout intact

**Client/Server boundary:** The existing sections use `"use client"` with Framer Motion animations. They remain client components. The server component `page.tsx` fetches data and passes it as serializable props (strings, numbers, arrays of plain objects). Do NOT pass Prisma model instances — map them to plain objects first. Example: `{ title: section.title, items: section.items.map(i => ({ id: i.id, title: i.title, ... })) }`

**Key mapping:**
| Component | Section Key | Data Source |
|-----------|-------------|-------------|
| HeroSection | `hero` | `SiteConfig` (title, subtitle, image) |
| PropuestaSection | `about` | `SiteSectionItem[]` |
| ComoFuncionaSection | `how-it-works` | `SiteSectionItem[]` |
| AgendaSection | `schedule` + `plans` | `LiveClass[]` + `Plan[]` from DB |
| OfertaSection | `on-demand` | Plan data from DB for on-demand plans (hidden if no on-demand plans) |
| DisciplinesSection (NEW) | `disciplines` | `Discipline[]` from DB |
| ContactSection (NEW) | `contact` | `SiteConfig` contact fields |
| TestimoniosSection | `testimonials` | `SiteSectionItem[]` |
| SobreTriniSection | `team` | `SiteSectionItem[]` |
| CtaSection | `cta` | `SiteSection` title/subtitle + `SiteConfig` whatsappUrl |

- [ ] **Step 3: Create DisciplinesSection.tsx**

New component that accepts `disciplines: { name: string; color: string | null }[]` and section title/subtitle. Renders discipline cards/badges with their colors.

- [ ] **Step 4: Create ContactSection.tsx**

New component that accepts contact fields from `SiteConfig` (email, phone, address, socials). Renders a contact info layout with social links.

- [ ] **Step 5: Update `components/sections/home/index.ts` barrel exports**

Add exports for the new components and ensure all existing exports still work with the new prop interfaces.

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 7: Commit**

```bash
git add components/sections/home/
git commit -m "refactor: make home section components accept dynamic props, add disciplines and contact sections"
```

---

## Task 11: Dynamize Home Page — page.tsx

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace hardcoded page with dynamic queries**

```typescript
// app/page.tsx
import { centerRepository, siteConfigRepository, siteSectionRepository } from "@/lib/adapters/db";
import { planRepository, liveClassRepository, disciplineRepository } from "@/lib/adapters/db";
// ... import section components

export const revalidate = 60; // ISR: revalidate every 60s

export async function generateMetadata() {
  const slug = process.env.DEFAULT_CENTER_SLUG;
  if (!slug) return { title: "Cuerpo Raíz" };
  const center = await centerRepository.findBySlug(slug);
  const config = center ? await siteConfigRepository.findByCenterId(center.id) : null;
  return {
    title: `${center?.name ?? "Cuerpo Raíz"} — ${config?.heroSubtitle ?? "yoga con identidad"}`,
    description: config?.heroSubtitle ?? undefined,
  };
}

export default async function HomePage() {
  const slug = process.env.DEFAULT_CENTER_SLUG;
  if (!slug) return <FallbackHome />;

  const center = await centerRepository.findBySlug(slug);
  if (!center) return <FallbackHome />;

  const [siteConfig, sections, plans, disciplines] = await Promise.all([
    siteConfigRepository.findByCenterId(center.id),
    siteSectionRepository.findByCenterId(center.id),
    planRepository.findManyByCenterId(center.id),
    disciplineRepository.findManyByCenterId(center.id),
  ]);

  // For schedule section: query upcoming live classes directly via Prisma
  // (no existing findUpcoming method — use prisma.liveClass.findMany with date filter)
  const now = new Date();
  const weekFromNow = new Date(now);
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  const nextClasses = await prisma.liveClass.findMany({
    where: { centerId: center.id, startAt: { gte: now, lte: weekFromNow }, cancelledAt: null },
    include: { discipline: true },
    orderBy: { startAt: "asc" },
    take: 20,
  });

  // Build section map for easy lookup
  const sectionMap = new Map(sections.map((s) => [s.sectionKey, s]));
  const visibleSections = sections
    .filter((s) => s.visible)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Render sections in order
  return (
    <main>
      {visibleSections.map((section) => {
        switch (section.sectionKey) {
          case "hero": return <HeroSection key={section.id} config={siteConfig} />;
          case "about": return <PropuestaSection key={section.id} section={section} />;
          // ... etc for each section
        }
      })}
    </main>
  );
}
```

- [ ] **Step 2: Run typecheck + verify visually**

Run: `npm run typecheck`
Then: `npm run dev` and visually compare the home page — should look identical to before.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: dynamize home page with center data from database"
```

---

## Task 12: E2E Tests

**Files:**
- Create: `e2e/home-dynamic.spec.ts`
- Create: `e2e/panel-sitio.spec.ts`

- [ ] **Step 1: Write home E2E test**

Test that the home loads with seeded data: hero title visible, at least 3 sections render, plans section shows plan names from DB.

- [ ] **Step 2: Write admin site customization E2E tests**

Test scenarios (matching spec requirements):
1. Login as admin → navigate to `/panel/sitio` → verify page loads with branding tab
2. Verify color pickers are visible and have current center colors
3. Navigate to "Secciones" tab → verify section list with toggle switches
4. Toggle a section visibility → verify toggle state changes
5. Navigate to an editable section → verify items editor loads

- [ ] **Step 3: Run E2E tests**

Run: `E2E_PORT=3001 npx playwright test e2e/home-dynamic.spec.ts e2e/panel-sitio.spec.ts`

- [ ] **Step 4: Commit**

```bash
git add e2e/home-dynamic.spec.ts e2e/panel-sitio.spec.ts
git commit -m "test(e2e): add dynamic home and site customization tests"
```

---

## Task 13: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 2: Run all unit tests**

Run: `npm run test`

- [ ] **Step 3: Run lint**

Run: `npm run lint`

- [ ] **Step 4: Run build**

Run: `npm run build`

- [ ] **Step 5: Visual comparison**

Start dev server and compare the home page with the current production version. Every section should render identically with data from the seed.
