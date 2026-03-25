# Fase 3A: Personalización del sitio + Home dinámico

**Goal:** Reemplazar el home hardcodeado con datos reales del centro, permitir que el admin personalice branding, secciones y contenido del sitio público, y aplicar colores del centro dinámicamente vía CSS variables.

**Context:** Hoy el home público tiene 8 secciones con contenido estático. Con la variable `DEFAULT_CENTER_SLUG`, el home carga datos reales del centro. El admin gestiona qué secciones se muestran, su orden, y el contenido de cada una.

**Depends on:** Nada (independiente). La Fase 3B (On Demand) depende de esta.

---

## Data Model

### New Models

#### CenterSiteConfig

Configuración 1:1 del sitio público del centro.

```prisma
model CenterSiteConfig {
  id              String  @id @default(cuid())
  centerId        String  @unique
  // Hero
  heroTitle       String?
  heroSubtitle    String?
  heroImageUrl    String?
  // Branding
  logoUrl         String?
  colorPrimary    String?   // hex, ej: "#2D3B2A"
  colorSecondary  String?   // hex, ej: "#B85C38"
  colorAccent     String?   // hex, opcional tercer color
  // Contact
  contactEmail    String?
  contactPhone    String?
  contactAddress  String?
  // Social
  instagramUrl    String?
  facebookUrl     String?
  whatsappUrl     String?
  youtubeUrl      String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  center          Center   @relation(fields: [centerId], references: [id], onDelete: Cascade)
}
```

#### CenterSiteSection

Secciones del home, editables y reordenables.

```prisma
model CenterSiteSection {
  id          String   @id @default(cuid())
  centerId    String
  sectionKey  String   // "team", "testimonials", etc.
  title       String?
  subtitle    String?
  visible     Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  center      Center   @relation(fields: [centerId], references: [id], onDelete: Cascade)
  items       CenterSiteSectionItem[]

  @@unique([centerId, sectionKey])
  @@index([centerId])
}
```

#### CenterSiteSectionItem

Items dentro de secciones tipo galería (equipo, testimonios, etc.).

```prisma
model CenterSiteSectionItem {
  id          String   @id @default(cuid())
  sectionId   String
  title       String?
  description String?
  imageUrl    String?
  linkUrl     String?
  userId      String?  // optional: link to instructor for team section
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  section     CenterSiteSection @relation(fields: [sectionId], references: [id], onDelete: Cascade)

  @@index([sectionId])
}
```

### Modified Models

#### Center

Add relation:
```prisma
siteConfig      CenterSiteConfig?
siteSections    CenterSiteSection[]
```

### Section Keys

Secciones predefinidas del home. El admin puede mostrar/ocultar y reordenar, pero no crear tipos nuevos (para mantener el layout predecible).

| Key | Tipo | Fuente de datos |
|-----|------|----------------|
| `hero` | Fija | `CenterSiteConfig` (title, subtitle, image) |
| `about` | Editable | `CenterSiteSectionItem` — propuesta de valor, descripción del centro |
| `how-it-works` | Editable | `CenterSiteSectionItem` — pasos o beneficios (con ícono/imagen + texto) |
| `schedule` | Dinámica | `LiveClass` — próximas clases de la semana |
| `plans` | Dinámica | `Plan` tipo LIVE con filtro: planes del centro que no estén archivados |
| `on-demand` | Dinámica | `Plan` tipo ON_DEMAND y MEMBERSHIP_ON_DEMAND — seeded con `visible: false`, se activa en Fase 3B |
| `disciplines` | Dinámica | `Discipline` activas del centro |
| `team` | Editable | `CenterSiteSectionItem` — fotos, nombres, bios. Campo `userId` opcional para vincular a instructor |
| `testimonials` | Editable | `CenterSiteSectionItem` — citas de estudiantes |
| `cta` | Fija | `CenterSiteSection` title/subtitle — call to action final |
| `contact` | Fija | `CenterSiteConfig` (email, phone, address, socials) |

- **Fija:** datos de `CenterSiteConfig`, solo title/subtitle editables en la sección
- **Dinámica:** query a modelos existentes, title/subtitle editables. Para `plans`: filtra planes del centro por tipo, excluyendo los que tengan `amountCents = 0` o no tengan precio configurado.
- **Editable:** title/subtitle + items CRUD con drag & drop

**Nota:** La sección `on-demand` se seedea con `visible: false` por defecto. Se activará automáticamente cuando haya planes ON_DEMAND creados (Fase 3B).

---

## CSS Dinámico

### Implementación

Server Component en `app/layout.tsx` (o un componente wrapper) lee `CenterSiteConfig` del centro y genera un `<style>` tag con CSS custom properties.

**Sanitización (defense in depth):** Tanto al guardar (DTO) como al renderizar, los colores pasan por `sanitizeHexColor()` que valida contra `/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/`. Si no coincide, se usa el color default. Esto previene CSS injection.

**Variables derivadas:** Además de los 3 colores base, se computan server-side las variantes derivadas para que el theming sea consistente:

```tsx
import { sanitizeHexColor, hexToRgb, darkenHex } from "@/lib/domain/color-utils";

const primary = sanitizeHexColor(siteConfig?.colorPrimary, '#2D3B2A');
const secondary = sanitizeHexColor(siteConfig?.colorSecondary, '#B85C38');
const accent = sanitizeHexColor(siteConfig?.colorAccent, '#D4A574');
const primaryRgb = hexToRgb(primary); // "45, 59, 42"

// Injected as <style> tag
`:root {
  --color-primary: ${primary};
  --color-primary-hover: ${darkenHex(primary, 10)};
  --color-primary-light: rgba(${primaryRgb}, 0.08);
  --color-secondary: ${secondary};
  --color-accent: ${accent};
}`
```

`lib/domain/color-utils.ts` — funciones puras: `sanitizeHexColor()`, `hexToRgb()`, `darkenHex()`, `lightenHex()`. Con unit tests.

### Validación

- Los colores deben ser hex válidos (#RGB o #RRGGBB) — validado en DTO (Zod regex) y al renderizar (sanitizeHexColor)
- Se valida contraste mínimo (texto sobre fondo) al guardar, con warning si no cumple WCAG AA
- Fallback a los colores default si no hay configuración
- URLs de imágenes validadas contra protocolo `https://` solamente (previene `javascript:` y `data:` URLs)

---

## Environment Variable

```
DEFAULT_CENTER_SLUG=cuerporaiz
```

- Usado por el home público para identificar qué centro mostrar
- Si no está configurada, fallback al primer centro de la DB (desarrollo) o 404 (producción)
- Se lee server-side en las páginas públicas

---

## Pages

### Public

#### Home (`app/page.tsx`)

Server Component. Lee `DEFAULT_CENTER_SLUG` → carga centro + siteConfig + secciones. Queries paralelos:

```typescript
const [center, siteConfig, sections, plans, nextClasses, disciplines] = await Promise.all([
  centerRepository.findBySlug(slug),
  siteConfigRepository.findByCenterId(centerId),
  siteSectionRepository.findByCenterId(centerId),
  planRepository.findPublishedByCenterId(centerId),
  liveClassRepository.findUpcoming(centerId, 7), // próximos 7 días
  disciplineRepository.findActiveByCenterId(centerId),
]);
```

Renderiza secciones en el orden de `sortOrder`, filtrando `visible: false`. Cada sección es un componente independiente que recibe sus datos.

**Caching:** El home usa `export const revalidate = 60` (ISR, revalida cada 60s). Cuando el admin guarda cambios en `/panel/sitio`, se llama `revalidatePath('/')` para invalidar el cache inmediatamente.

**Dynamic metadata:** `generateMetadata()` en `page.tsx` usa `center.name` y `siteConfig.heroSubtitle` para `<title>` y `<meta description>` dinámicos.

### Panel Admin

#### `/panel/sitio` — Personalización del sitio

Accesible solo para ADMINISTRATOR. Tabs o secciones:

1. **Branding** — logo, colores (3 color pickers con preview en vivo), hero (título, subtítulo, imagen)
2. **Secciones** — lista de secciones con toggle visible/oculto + drag & drop para reordenar. Click en una sección editable abre CRUD de items.
3. **Contacto** — email, teléfono, dirección, redes sociales

Patrón: mismo que `EditClientForm` — `useTransition` + fetch a API routes.

---

## API Routes

### Site Config

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/panel/site-config` | Admin | Get site config for current center |
| PATCH | `/api/panel/site-config` | Admin | Upsert site config |

### Site Sections

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/panel/site-sections` | Admin | List all sections with items |
| PATCH | `/api/panel/site-sections/[id]` | Admin | Update section (title, subtitle, visible) |
| PATCH | `/api/panel/site-sections/reorder` | Admin | Reorder sections. Body: `{ orderedIds: string[] }` |

### Site Section Items

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/panel/site-sections/[id]/items` | Admin | Create item |
| PATCH | `/api/panel/site-sections/[id]/items/[itemId]` | Admin | Update item |
| DELETE | `/api/panel/site-sections/[id]/items/[itemId]` | Admin | Delete item |
| PATCH | `/api/panel/site-sections/[id]/items/reorder` | Admin | Reorder items. Body: `{ orderedIds: string[] }` |

---

## Seed Data

### Centro nuevo (genérico)
Al crear un nuevo centro, se genera:
- `CenterSiteConfig` con colores default
- `CenterSiteSection` para cada key con `visible: true` y orden default
- No se crean items — el admin los agrega

### Seed del centro "cuerporaiz" (replica el home actual)

El seed script (`prisma/seed.ts`) debe pre-cargar los datos del centro Cuerpo Raíz con el mismo contenido que hoy está hardcodeado en el home, para que al dinamizar la página no se pierda nada visualmente.

**CenterSiteConfig:**
- Hero: título, subtítulo e imagen actuales del home
- Branding: colores actuales (`--color-primary: #2D3B2A`, `--color-secondary: #B85C38`), logo
- Contacto: email, teléfono, dirección, redes sociales actuales

**CenterSiteSection + Items (replicar cada sección hardcodeada):**
- `about` — propuesta de valor actual (texto + imagen)
- `how-it-works` — pasos/beneficios actuales (cada paso como un item con ícono + texto)
- `schedule` — visible, title/subtitle actuales (datos vienen de LiveClass)
- `plans` — visible, title/subtitle actuales (datos vienen de Plan)
- `on-demand` — `visible: false` (se activa en Fase 3B)
- `disciplines` — visible, title/subtitle actuales (datos vienen de Discipline)
- `team` — items con las fotos, nombres y bios actuales de cada profesora/fundadora
- `testimonials` — items con los testimonios actuales
- `cta` — title/subtitle del call to action final
- `contact` — visible (datos vienen de CenterSiteConfig)

**Importante:** Leer el contenido actual de `app/page.tsx` y los componentes de cada sección (`components/sections/`) para extraer los textos, imágenes y datos exactos que se usan hoy. El seed debe producir un home visualmente idéntico al actual.

---

## Hexagonal Architecture

### Domain

- `lib/domain/site-config.ts` — tipos `CenterSiteConfig`, `SiteSection`, `SiteSectionItem`, `SectionKey`

### Ports

```typescript
// lib/ports/site-config-repository.ts
interface ISiteConfigRepository {
  findByCenterId(centerId: string): Promise<CenterSiteConfig | null>;
  upsert(centerId: string, data: UpsertSiteConfigInput): Promise<CenterSiteConfig>;
}

// lib/ports/site-section-repository.ts
interface ISiteSectionRepository {
  findByCenterId(centerId: string): Promise<SiteSection[]>;
  findByIdWithItems(id: string): Promise<SiteSectionWithItems | null>;
  update(id: string, data: UpdateSiteSectionInput): Promise<SiteSection>;
  reorder(centerId: string, orderedIds: string[]): Promise<void>;
  // Items
  createItem(sectionId: string, data: CreateSiteSectionItemInput): Promise<SiteSectionItem>;
  updateItem(itemId: string, data: UpdateSiteSectionItemInput): Promise<SiteSectionItem>;
  deleteItem(itemId: string): Promise<void>;
  reorderItems(sectionId: string, orderedIds: string[]): Promise<void>;
}
```

### Adapters

- `lib/adapters/db/site-config-repository.ts` — Prisma implementation
- `lib/adapters/db/site-section-repository.ts` — Prisma implementation

### DTOs

- `lib/dto/site-config-dto.ts` — Zod schemas for config and section updates

---

## Testing

### Unit Tests

- `site-config-dto.test.ts` — validate hex colors, URL formats (https only), required fields
- `color-utils.test.ts` — sanitizeHexColor (valid/invalid/injection attempts), hexToRgb, darkenHex, lightenHex

### E2E Tests

- Home público carga con datos del centro (no hardcoded)
- Admin: navega a `/panel/sitio`, edita hero title, verifica que se refleja en home
- Admin: toggle sección visible/oculta, verifica que desaparece del home
- Admin: agrega item a sección equipo, verifica que aparece

---

## Scope — What's NOT Included

- On demand content (categories, practices, lessons) → Fase 3B
- Blog / CMS Sanity → Fase 5
- Multi-domain (un dominio por centro) → futuro
- WYSIWYG editor → campos de texto plano con formularios
- Image upload → el admin pega URLs (como el patrón actual del proyecto)
- Vimeo plugin → Fase 3B+
