# Favicon per-tenant (Approach A: single square image)

**Fecha:** 2026-04-24
**Branch propuesta:** `feature/admin-favicon`
**Owner:** Jorge Cabané

## Resumen

Permitir que cada centro cargue su propio favicon desde el panel (`/panel/sitio`, sección Branding) subiendo **una sola imagen cuadrada**. Los distintos tamaños (32×32 para navegador, 180×180 para Apple touch icon) se derivan on-the-fly usando los query params del CDN de Sanity. Se muestra al admin una recomendación explícita de medidas antes de subir. Cuando no hay favicon configurado, se mantiene como fallback el `app/favicon.ico` estático actual.

## Motivación

- `CenterSiteConfig` ya es per-tenant (logo, hero, colores). El favicon es el único asset de branding que aún está hardcodeado globalmente (`app/favicon.ico`).
- El proyecto está preparado para que cada deploy represente un centro distinto (`NEXT_PUBLIC_DEFAULT_CENTER_SLUG`), por lo que cada centro debería ver su propio favicon en la pestaña del navegador.
- Evita tener que editar código + redeploy cuando un centro quiere cambiar el ícono.

## Non-goals

- No se generan PWA manifests ni tiles de Windows/Android. Si el centro lo pide después, se agrega por separado.
- No se soportan SVG animados, ICO multi-resolución ni uploads múltiples. Una sola imagen cuadrada y listo.
- No se agrega `app/icon.tsx` dinámico (ImageResponse). Sanity CDN resuelve resize gratis vía URL.

## Arquitectura

```
Admin UI (BrandingForm.tsx)
  └── SanityImagePicker (aspect="square")
        └── POST /api/panel/sanity-upload  → Sanity CDN
              (devuelve URL https://cdn.sanity.io/…)
  └── PATCH /api/panel/site-config { faviconUrl }
        └── siteConfigRepository.upsert
              └── CenterSiteConfig.faviconUrl (DB)

Public render (app/layout.tsx)
  └── generateMetadata()
        ├── resolve center via NEXT_PUBLIC_DEFAULT_CENTER_SLUG
        ├── fetch siteConfig.faviconUrl
        └── return metadata.icons con variantes Sanity (?w=32, ?w=180&h=180)
              ó fallback a /favicon.ico si faviconUrl es null
```

El patrón de resolución del centro es idéntico al que ya usa `DynamicTheme` y `getPublicNavLinks`.

## Cambios detallados

### 1. Schema Prisma

En `prisma/schema.prisma`, modelo `CenterSiteConfig`, agregar junto a `logoUrl`:

```prisma
faviconUrl      String?
```

Migración: `npx prisma migrate dev --name add_favicon_url_to_site_config`.

### 2. Dominio

En `lib/domain/site-config.ts`, agregar a `SiteConfig`:

```ts
faviconUrl: string | null;
```

### 3. DTO

En `lib/dto/site-config-dto.ts`, agregar al `upsertSiteConfigSchema` junto a `logoUrl`:

```ts
faviconUrl: httpsUrlSchema,
```

Reutiliza el `httpsUrlSchema` existente (obliga a URL `https://`, permite `null`).

### 4. Repository

En `lib/adapters/db/site-config-repository.ts`, agregar `faviconUrl` en el type del `toDomain` y en el objeto devuelto. El `upsert` ya propaga `data` completo, no necesita cambios.

### 5. API route

`app/api/panel/site-config/route.ts` — el `GET` devuelve un objeto default cuando no hay config. Agregar `faviconUrl: null` a ese default. El `PATCH` no necesita cambios (usa el schema).

### 6. UI — BrandingForm

En `app/panel/sitio/BrandingForm.tsx`:

- Nuevo estado: `const [faviconUrl, setFaviconUrl] = useState<string | null>(config?.faviconUrl ?? null);`
- En `handleSubmit`: `body.faviconUrl = faviconUrl;`
- Después del bloque "Logo", agregar un bloque "Favicon" con:
  - `<label className={labelCls}>Favicon</label>`
  - `<SanityImagePicker value={faviconUrl} onChange={setFaviconUrl} label="Favicon del sitio" aspect="square" />`
  - Texto de ayuda justo debajo del label (clase `text-xs text-[var(--color-text-muted)]`):
    > Imagen cuadrada, PNG o SVG. Mínimo recomendado: **256×256 px**. Ideal: **512×512 px**. Se usará para la pestaña del navegador (32×32) y para iOS (180×180).

### 7. Metadata dinámico

La branch `feature/seo-centros` (base de esta) ya centralizó la metadata en `lib/seo/metadata.ts`:

- `getSiteContext()` (cacheado con `react.cache`) ya resuelve `center` + `siteConfig`.
- `buildSiteMetadata(opts)` se invoca desde `app/layout.tsx`, `app/page.tsx`, `app/sobre/page.tsx`, `app/blog/[slug]/page.tsx`, `app/catalogo/…`, etc.

Agregamos los `icons` dentro de `buildSiteMetadata`, de modo que todas las páginas del sitio los hereden sin tocar cada `generateMetadata` individual:

```ts
// dentro de buildSiteMetadata(), reutiliza el ctx existente
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

return {
  metadataBase: ...,
  title,
  description,
  ...
  icons,
};
```

`withSanityImageParams` se agrega como función exportada en `lib/sanity/image.ts` (archivo existente). Firma: `withSanityImageParams(url: string, params: Record<string, string | number>): string`. Si el host es `cdn.sanity.io`, agrega los params respetando los ya presentes (usa `URL` nativo). Si el host es distinto (caso raro: dominio externo), devuelve la URL original sin tocar.

**Fallback a favicon.ico:** cuando `icons` es `undefined`, Next.js toma automáticamente `app/favicon.ico`. No se borra ese archivo.

**No se toca `app/layout.tsx`** — ya delega a `buildSiteMetadata`. Mismo razonamiento para `app/page.tsx`, blog, sobre, catálogo: todas se benefician automáticamente.

### 8. Revalidación

El `PATCH /api/panel/site-config` ya hace `revalidatePath("/")`. Eso invalida la metadata del layout raíz en el próximo request, por lo que el favicon se actualiza sin redeploy.

## Validación y edge cases

| Caso | Comportamiento |
|---|---|
| Admin sube un PNG no cuadrado | SanityImagePicker lo acepta igual; el CDN hace crop (`fit=crop` solo en apple-touch). Para `w=32` Sanity mantiene aspect, lo que puede dar íconos distorsionados — el hint de UI le pide cuadrada, no lo forzamos por código. |
| Archivo > 10MB o tipo no permitido | Ya lo maneja `/api/panel/sanity-upload`. No se agrega lógica. |
| `faviconUrl` apunta a dominio no-Sanity | `withSanityParams` devuelve URL original sin query params. Un solo tamaño para todos los usos. Aceptable. |
| Sanity CDN down durante `generateMetadata` | El `try/catch` hace fallback a `base` → Next sirve `favicon.ico`. No rompe el render. |
| Admin borra el favicon (`null`) | `faviconUrl` se guarda `null`, `generateMetadata` devuelve `base`, Next sirve `favicon.ico`. |
| Centro sin `siteConfig` aún | Mismo fallback. |

## Seguridad

- URL validada por `httpsUrlSchema` (solo `https://`), igual que `logoUrl` y `heroImageUrl`.
- El endpoint `PATCH` ya valida `isAdminRole` y saca `centerId` de la sesión (no del body).
- No se expone endpoint nuevo.

## Testing

**Unit (Vitest):**

- `lib/dto/site-config-dto.test.ts` (si existe) — agregar casos: `faviconUrl` con `https://…` válido, con `http://` rechazado, con `null`.
- `lib/sanity/image-url.test.ts` — URL de Sanity recibe query params; URL con host externo pasa intacta; URL con params existentes los respeta y agrega los nuevos (`?w=32&h=32` sumado a una URL que ya tenía `?auto=format` queda `?auto=format&w=32&h=32`).

**E2E (Playwright):**

- No se agrega spec nuevo. La cobertura de la sección Branding ya existe y puede tocarse opcionalmente para confirmar que el nuevo picker aparece.

**Verificación manual:**

1. Subir favicon.png en `/panel/sitio` → Branding.
2. Abrir `/` en pestaña privada, inspeccionar `<head>` → confirmar `<link rel="icon">` con URL de Sanity + `?w=32`.
3. Confirmar en DevTools → Application → Manifest que el icon se carga.
4. Borrar favicon → recargar → confirmar que vuelve `favicon.ico`.

## Recomendaciones de medidas (lo que ve el admin)

> **Favicon**
> Imagen cuadrada, PNG o SVG.
> Mínimo recomendado: **256×256 px**.
> Ideal: **512×512 px** (se usará tanto en la pestaña del navegador como en iOS).

## Archivos tocados

| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` | +1 campo |
| `prisma/migrations/…/migration.sql` | nuevo |
| `lib/domain/site-config.ts` | +1 campo en interface |
| `lib/dto/site-config-dto.ts` | +1 campo en schema |
| `lib/adapters/db/site-config-repository.ts` | +1 campo en `toDomain` |
| `app/api/panel/site-config/route.ts` | +1 campo en default GET |
| `app/panel/sitio/BrandingForm.tsx` | +estado, +picker, +hint |
| `lib/seo/metadata.ts` | `buildSiteMetadata` emite `icons` si hay `faviconUrl` |
| `lib/sanity/image.ts` | nueva función `withSanityImageParams` |
| `lib/sanity/image.test.ts` (nuevo) | tests del helper |

Ningún archivo supera los límites del CLAUDE.md (<200 líneas objetivo, <400 máx).
