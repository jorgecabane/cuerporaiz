# Favicon per-tenant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que cada centro cargue su favicon desde `/panel/sitio` (Marca), con hint de medidas, y que se sirva automáticamente en la metadata del layout raíz (fallback a `app/favicon.ico` si no hay).

**Architecture:** Añadimos `faviconUrl` a `CenterSiteConfig` (nullable). El admin lo sube con el `SanityImagePicker` existente (aspect cuadrado). `app/layout.tsx` pasa de `metadata` estático a `generateMetadata()` que resuelve el centro por slug (patrón de `DynamicTheme`) y emite las variantes de tamaño vía query params del CDN de Sanity.

**Tech Stack:** Next.js 16 (App Router, webpack), React 19, Prisma 7 + Supabase, Zod, Sanity CDN, Vitest, Playwright.

Spec: `docs/superpowers/specs/2026-04-24-favicon-per-center-design.md`

---

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `prisma/schema.prisma` | Añadir `faviconUrl String?` al modelo `CenterSiteConfig` |
| `prisma/migrations/<ts>_add_favicon_url_to_site_config/migration.sql` | Migración generada |
| `lib/domain/site-config.ts` | Añadir `faviconUrl: string \| null` a la interface `SiteConfig` |
| `lib/dto/site-config-dto.ts` | Añadir `faviconUrl: httpsUrlSchema` al `upsertSiteConfigSchema` |
| `lib/dto/site-config-dto.test.ts` | Casos para `faviconUrl` (https OK, http rechazado, null OK) |
| `lib/adapters/db/site-config-repository.ts` | Propagar `faviconUrl` en `toDomain` |
| `app/api/panel/site-config/route.ts` | Añadir `faviconUrl: null` al default del `GET` |
| `lib/sanity/image.ts` | Nueva función `withSanityImageParams(url, params)` |
| `lib/sanity/image.test.ts` (nuevo) | Tests para `withSanityImageParams` |
| `app/panel/sitio/BrandingForm.tsx` | Nuevo estado + picker + hint de medidas |
| `lib/seo/metadata.ts` | `buildSiteMetadata` emite `icons` cuando hay `faviconUrl` (base branch ya centralizó aquí la metadata de todo el sitio) |

---

## Task 1: Schema + migración

**Files:**
- Modify: `prisma/schema.prisma` (modelo `CenterSiteConfig`)
- Create: `prisma/migrations/<ts>_add_favicon_url_to_site_config/migration.sql` (generado)

- [ ] **Step 1: Editar `prisma/schema.prisma`**

Buscar el modelo `CenterSiteConfig`. Después de la línea `logoUrl         String?`, añadir:

```prisma
  faviconUrl      String?
```

- [ ] **Step 2: Generar la migración**

Run:
```bash
npx prisma migrate dev --name add_favicon_url_to_site_config
```

Expected: la CLI crea `prisma/migrations/<timestamp>_add_favicon_url_to_site_config/migration.sql` con `ALTER TABLE "CenterSiteConfig" ADD COLUMN "faviconUrl" TEXT;` y regenera el cliente Prisma.

- [ ] **Step 3: Verificar que compila**

Run:
```bash
npm run typecheck
```

Expected: PASS. (El DTO todavía no tiene `faviconUrl`, pero el cliente Prisma ya acepta el campo como opcional, así que no rompe llamadas existentes.)

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(schema): add faviconUrl to CenterSiteConfig"
```

---

## Task 2: Dominio — `SiteConfig.faviconUrl`

**Files:**
- Modify: `lib/domain/site-config.ts`

- [ ] **Step 1: Editar la interface `SiteConfig`**

En `lib/domain/site-config.ts`, localizar la interface `SiteConfig`. Justo después de `logoUrl: string | null;`, añadir:

```ts
  faviconUrl: string | null;
```

- [ ] **Step 2: No correr typecheck ni commit todavía**

A propósito: el typecheck fallaría ahora (el repository no devuelve `faviconUrl` y el pre-commit hook rechazaría el commit). Tasks 3 y 4 terminan la cadena y se commitean juntas.

---

## Task 3: DTO — agregar `faviconUrl` al schema

**Files:**
- Modify: `lib/dto/site-config-dto.ts`
- Modify: `lib/dto/site-config-dto.test.ts`

- [ ] **Step 1: Escribir los tests fallando**

Abrir `lib/dto/site-config-dto.test.ts` y, dentro del `describe("upsertSiteConfigSchema", ...)`, añadir tres casos nuevos (ubicarlos junto a los tests existentes de `heroImageUrl`):

```ts
  it("accepts https faviconUrl", () => {
    const result = upsertSiteConfigSchema.safeParse({ faviconUrl: "https://cdn.sanity.io/images/p/d/abc.png" });
    expect(result.success).toBe(true);
  });

  it("accepts null faviconUrl", () => {
    const result = upsertSiteConfigSchema.safeParse({ faviconUrl: null });
    expect(result.success).toBe(true);
  });

  it("rejects non-https faviconUrl", () => {
    const result = upsertSiteConfigSchema.safeParse({ faviconUrl: "http://example.com/favicon.png" });
    expect(result.success).toBe(false);
  });
```

- [ ] **Step 2: Correr los tests para confirmar que fallan**

Run:
```bash
npx vitest run lib/dto/site-config-dto.test.ts
```

Expected: los 3 tests nuevos fallan (la property `faviconUrl` no existe todavía, Zod la ignora silenciosamente y devuelve `success: true` incluso para `"http://…"`). Tests existentes deben seguir pasando.

- [ ] **Step 3: Añadir `faviconUrl` al schema**

En `lib/dto/site-config-dto.ts`, dentro de `upsertSiteConfigSchema`, después de la línea `logoUrl: httpsUrlSchema,`, añadir:

```ts
  faviconUrl: httpsUrlSchema,
```

- [ ] **Step 4: Correr los tests para confirmar que pasan**

Run:
```bash
npx vitest run lib/dto/site-config-dto.test.ts
```

Expected: PASS (todos los tests, incluidos los 3 nuevos).

- [ ] **Step 5: No commitear todavía**

El typecheck seguiría fallando porque el repository aún no mapea `faviconUrl`. Pasar a Task 4 y commitear al final de esa task.

---

## Task 4: Repository — propagar `faviconUrl`

**Files:**
- Modify: `lib/adapters/db/site-config-repository.ts`

- [ ] **Step 1: Añadir `faviconUrl` al type del parámetro de `toDomain`**

En `lib/adapters/db/site-config-repository.ts`, en el type literal del argumento de `toDomain`, después de `logoUrl: string | null;`, añadir:

```ts
  faviconUrl: string | null;
```

- [ ] **Step 2: Propagar `faviconUrl` en el objeto devuelto por `toDomain`**

En el mismo archivo, en el `return { … }` de `toDomain`, después de `logoUrl: r.logoUrl,`, añadir:

```ts
    faviconUrl: r.faviconUrl,
```

- [ ] **Step 3: Verificar typecheck**

Run:
```bash
npm run typecheck
```

Expected: PASS. (El cliente Prisma ya incluye `faviconUrl` gracias a Task 1, y el dominio ya lo declara.)

- [ ] **Step 4: Commit bundleado (Tasks 2 + 3 + 4)**

Con la cadena dominio → DTO → repository completa, el typecheck pasa y el hook no se queja. Commit incluye los tres archivos:

```bash
git add lib/domain/site-config.ts lib/dto/site-config-dto.ts lib/dto/site-config-dto.test.ts lib/adapters/db/site-config-repository.ts
git commit -m "feat(site-config): add faviconUrl to domain, DTO, and repository"
```

---

## Task 5: API route — default `GET`

**Files:**
- Modify: `app/api/panel/site-config/route.ts`

- [ ] **Step 1: Añadir `faviconUrl: null` al objeto default del `GET`**

En `app/api/panel/site-config/route.ts`, función `GET`, en el objeto pasado al `NextResponse.json(config ?? { … })`, después de `logoUrl: null,`, añadir:

```ts
faviconUrl: null,
```

El objeto queda con la misma forma que `SiteConfig`.

- [ ] **Step 2: Verificar typecheck**

Run:
```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/api/panel/site-config/route.ts
git commit -m "feat(api): include faviconUrl in site-config GET default"
```

---

## Task 6: Helper `withSanityImageParams` + tests

**Files:**
- Modify: `lib/sanity/image.ts`
- Create: `lib/sanity/image.test.ts`

**Objetivo:** helper puro que agrega query params a URLs del CDN de Sanity y deja intactas las demás. Trabaja con URL literal (no con sources de Sanity), porque lo que guardamos en `faviconUrl` es un string `https://cdn.sanity.io/...`.

- [ ] **Step 1: Escribir los tests fallando**

Crear `lib/sanity/image.test.ts` con:

```ts
import { describe, it, expect } from "vitest";
import { withSanityImageParams } from "./image";

describe("withSanityImageParams", () => {
  it("adds params to a Sanity CDN URL", () => {
    const out = withSanityImageParams("https://cdn.sanity.io/images/p/d/abc.png", { w: 32, h: 32 });
    expect(out).toContain("w=32");
    expect(out).toContain("h=32");
    expect(out.startsWith("https://cdn.sanity.io/")).toBe(true);
  });

  it("preserves existing query params on Sanity URLs", () => {
    const out = withSanityImageParams("https://cdn.sanity.io/images/p/d/abc.png?auto=format", { w: 32 });
    expect(out).toContain("auto=format");
    expect(out).toContain("w=32");
  });

  it("returns non-Sanity URLs unchanged", () => {
    const url = "https://example.com/favicon.png";
    expect(withSanityImageParams(url, { w: 32 })).toBe(url);
  });

  it("coerces numeric params to strings in the URL", () => {
    const out = withSanityImageParams("https://cdn.sanity.io/x.png", { w: 180, h: 180, fit: "crop" });
    expect(out).toMatch(/w=180/);
    expect(out).toMatch(/h=180/);
    expect(out).toMatch(/fit=crop/);
  });

  it("returns the original string if URL parsing fails", () => {
    const out = withSanityImageParams("not-a-valid-url", { w: 32 });
    expect(out).toBe("not-a-valid-url");
  });
});
```

- [ ] **Step 2: Correr los tests para confirmar que fallan**

Run:
```bash
npx vitest run lib/sanity/image.test.ts
```

Expected: FAIL con `withSanityImageParams is not a function` (no existe todavía).

- [ ] **Step 3: Implementar `withSanityImageParams` en `lib/sanity/image.ts`**

Añadir al final de `lib/sanity/image.ts`:

```ts
/**
 * Agrega query params a una URL del CDN de Sanity (host `cdn.sanity.io`).
 * Para cualquier otro host devuelve la URL original sin tocar.
 * Si la URL no parsea, devuelve el string original.
 */
export function withSanityImageParams(
  url: string,
  params: Record<string, string | number>,
): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.hostname !== "cdn.sanity.io") return url;
  for (const [key, value] of Object.entries(params)) {
    parsed.searchParams.set(key, String(value));
  }
  return parsed.toString();
}
```

- [ ] **Step 4: Correr los tests para confirmar que pasan**

Run:
```bash
npx vitest run lib/sanity/image.test.ts
```

Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add lib/sanity/image.ts lib/sanity/image.test.ts
git commit -m "feat(sanity): add withSanityImageParams helper"
```

---

## Task 7: BrandingForm — favicon picker + hint

**Files:**
- Modify: `app/panel/sitio/BrandingForm.tsx`

- [ ] **Step 1: Añadir estado para `faviconUrl`**

En `app/panel/sitio/BrandingForm.tsx`, justo después de la línea:

```ts
  const [logoUrl, setLogoUrl] = useState<string | null>(config?.logoUrl ?? null);
```

añadir:

```ts
  const [faviconUrl, setFaviconUrl] = useState<string | null>(config?.faviconUrl ?? null);
```

- [ ] **Step 2: Propagar `faviconUrl` al body del PATCH**

En la misma función `handleSubmit`, después de la línea `body.logoUrl = logoUrl;`, añadir:

```ts
    body.faviconUrl = faviconUrl;
```

- [ ] **Step 3: Añadir el bloque de UI "Favicon" después del bloque "Logo"**

En el template JSX, el bloque actual del logo es:

```tsx
      {/* Logo */}
      <div>
        <label className={labelCls}>Logo</label>
        <SanityImagePicker
          value={logoUrl}
          onChange={setLogoUrl}
          label="Logo del centro"
          aspect="square"
        />
      </div>
```

Inmediatamente después de ese `</div>`, añadir:

```tsx
      {/* Favicon */}
      <div>
        <label className={labelCls}>Favicon</label>
        <p className="text-xs text-[var(--color-text-muted)] mb-2">
          Imagen cuadrada, PNG o SVG. Mínimo recomendado <strong>256×256 px</strong>, ideal <strong>512×512 px</strong>. Se usará para la pestaña del navegador (32×32) y para iOS (180×180).
        </p>
        <SanityImagePicker
          value={faviconUrl}
          onChange={setFaviconUrl}
          label="Favicon del sitio"
          aspect="square"
        />
      </div>
```

- [ ] **Step 4: Verificar typecheck + lint**

Run:
```bash
npm run typecheck && npm run lint
```

Expected: PASS.

- [ ] **Step 5: Verificación manual rápida en Storybook/dev**

Run (en otro shell):
```bash
npm run dev
```

Navegar a `http://localhost:3000/panel/sitio?tab=branding`, loguearse como admin. Confirmar:
- Aparece el bloque "Favicon" debajo de "Logo".
- Se ve el hint con las medidas.
- Subir un PNG cuadrado funciona (picker abre, carga a Sanity, thumbnail aparece).
- Hacer click en "Guardar cambios" y verificar que el botón no rompe y muestra "Cambios guardados".
- Refrescar la página; el favicon subido persiste en el preview del picker.

Detener el dev server (Ctrl+C) antes del próximo commit (pre-commit corre E2E y el puerto 3000 debe quedar libre; ver CLAUDE.md).

- [ ] **Step 6: Commit**

```bash
git add app/panel/sitio/BrandingForm.tsx
git commit -m "feat(panel/sitio): favicon picker con recomendación de medidas"
```

---

## Task 8: Favicon en `buildSiteMetadata`

**Files:**
- Modify: `lib/seo/metadata.ts`

**Contexto clave:** la branch base `feature/seo-centros` ya centralizó `generateMetadata` usando `lib/seo/metadata.ts`. Ese helper tiene:
- `getSiteContext()` (cacheado con `react.cache`) que ya resuelve `center` y `siteConfig`.
- `buildSiteMetadata(opts)` que es invocado desde `app/layout.tsx`, `app/page.tsx`, `app/sobre/page.tsx`, `app/blog/[slug]/page.tsx`, `app/blog/categoria/[slug]/page.tsx`, `app/catalogo/[categoryId]/[practiceId]/page.tsx`.

Por eso el favicon se agrega una sola vez dentro de `buildSiteMetadata` y se propaga a todas las páginas. **No se toca `app/layout.tsx` ni los otros consumidores.**

- [ ] **Step 1: Importar `withSanityImageParams`**

Al tope de `lib/seo/metadata.ts`, junto al import existente de `./urls`, añadir:

```ts
import { withSanityImageParams } from "@/lib/sanity/image";
```

- [ ] **Step 2: Construir `icons` dentro de `buildSiteMetadata`**

Dentro de la función `buildSiteMetadata`, después de la línea que define `twitterImages` y antes del `return { ... }`, añadir:

```ts
  const favicon = ctx?.siteConfig?.faviconUrl ?? null;
  const icons: Metadata["icons"] | undefined = favicon
    ? {
        icon: [
          { url: withSanityImageParams(favicon, { w: 32, h: 32, fit: "crop" }), sizes: "32x32" },
          { url: withSanityImageParams(favicon, { w: 192, h: 192, fit: "crop" }), sizes: "192x192" },
        ],
        apple: withSanityImageParams(favicon, { w: 180, h: 180, fit: "crop" }),
        shortcut: withSanityImageParams(favicon, { w: 32, h: 32, fit: "crop" }),
      }
    : undefined;
```

- [ ] **Step 3: Añadir `icons` al objeto `Metadata` devuelto**

En el `return { ... }` de `buildSiteMetadata`, añadir `icons,` junto al resto de los campos (p. ej. después de `robots: opts.noIndex ? ... : undefined,` y antes de `openGraph: { ... }`):

```ts
    icons,
```

(Cuando `icons` es `undefined`, Next.js cae automáticamente al `app/favicon.ico` estático — no hay que declararlo explícitamente.)

- [ ] **Step 4: Verificar typecheck + lint**

Run:
```bash
npm run typecheck && npm run lint
```

Expected: PASS.

- [ ] **Step 5: Verificación manual**

Run (en otro shell):
```bash
npm run dev
```

1. En `/panel/sitio` (tab Marca) subir un favicon y guardar.
2. Abrir `http://localhost:3000/` en pestaña privada. Inspeccionar `<head>` en DevTools. Confirmar que aparecen `<link rel="icon" sizes="32x32" href="https://cdn.sanity.io/...?...w=32&h=32&fit=crop">`, el de `192x192`, `<link rel="apple-touch-icon" ... w=180 h=180 ...>` y `<link rel="shortcut icon" ...>`.
3. Confirmar que las mismas etiquetas aparecen también en `/sobre` y (si hay blog configurado) en un post de blog — debería funcionar gratis porque todas usan `buildSiteMetadata`.
4. Verificar que la pestaña del navegador muestra el nuevo favicon (puede requerir reload duro con Cmd+Shift+R).
5. En `/panel/sitio` borrar el favicon (click en "Quitar") y guardar. Recargar `/` con Cmd+Shift+R. Confirmar que vuelve `favicon.ico` (los `<link rel="icon">` dinámicos ya no están en `<head>`).
6. Restaurar el favicon.

Detener el dev server antes del commit.

- [ ] **Step 6: Correr tests completos**

Run:
```bash
npm run test
```

Expected: PASS. Los tests nuevos de Tasks 3 y 6 están incluidos; el resto no se ve afectado (`lib/seo` no tiene tests unitarios directos sobre `buildSiteMetadata`).

- [ ] **Step 7: Commit**

```bash
git add lib/seo/metadata.ts
git commit -m "feat(seo): emitir favicon per-centro en buildSiteMetadata"
```

---

## Task 9: Cierre — checklist final

- [ ] **Step 1: Correr build completo**

Run:
```bash
npm run build
```

Expected: PASS. `prisma generate && next build --webpack` completa sin errores.

- [ ] **Step 2: Correr E2E (opcional si no hay cambios al flujo crítico; los pre-commit hooks los correrán de todas formas)**

Run:
```bash
npm run e2e
```

Expected: PASS. Si falla algún spec de `panel/sitio`, revisar que no dependa del markup exacto del form.

- [ ] **Step 3: Verificar estado del branch**

Run:
```bash
git log --oneline main..HEAD
```

Expected: ver los 6 commits (Task 1 schema, Task 4 cadena site-config, Task 5 API, Task 6 helper, Task 7 UI, Task 8 layout).

- [ ] **Step 4: Push + PR (si el usuario lo pide)**

Este paso se hace solo cuando el usuario confirme explícitamente. No pushear sin permiso.

```bash
git push -u origin HEAD
gh pr create --title "feat: favicon per-tenant con recomendación de medidas" --body "..."
```

---

## Notas para quien implementa

- **No usar `--no-verify`** bajo ninguna circunstancia. Si el pre-commit hook falla, leer el mensaje, corregir el problema y crear un commit nuevo (nunca `--amend` a un commit que pasó por un hook fallado).
- **Parar `npm run dev`** antes de cada commit — el pre-commit corre Playwright y no puede levantar el server si el puerto 3000 está ocupado (ver CLAUDE.md).
- **UI copy**: mantener el tú chileno ("tienes", "subís no, subes"). Todas las labels nuevas ya siguen esa convención.
- **Fallback importante**: cuando no hay `faviconUrl`, `generateMetadata` devuelve `base` sin `icons`. Next.js automáticamente usa `app/favicon.ico` — no hay que declararlo explícitamente.
- **Sanity CDN**: para URLs que no sean de `cdn.sanity.io` (p. ej. una imagen cargada desde una URL externa pegada manualmente en la DB), `withSanityImageParams` devuelve la URL original. El navegador usará el mismo archivo para todos los tamaños; no es ideal pero no rompe nada.
