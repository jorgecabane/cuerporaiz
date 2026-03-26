# Fase 3B: On Demand — Videoteca y contenido grabado

**Goal:** Permitir que los centros publiquen contenido on demand (clases grabadas en video), organizadas en categorías y prácticas, con un sistema de cuotas por plan que controla cuántas clases puede desbloquear cada estudiante.

**Context:** Los planes ON_DEMAND y MEMBERSHIP_ON_DEMAND ya existen en el modelo Plan (PlanType). La Fase 3A (Home dinámico) preparó la sección `on-demand` con `visible: false`. Esta fase agrega la jerarquía de contenido, el mecanismo de desbloqueo, y las páginas de catálogo y administración.

**Depends on:** Fase 3A (Site Customization) — la sección `on-demand` del home se activa cuando hay planes ON_DEMAND creados.

---

## Data Model

### New Enums

```prisma
enum OnDemandContentStatus {
  DRAFT
  PUBLISHED
}
```

### New Models

#### OnDemandCategory

Primer nivel de la jerarquía. Independiente del modelo `Discipline` (live classes). Un centro puede tener categorías on demand que no correspondan a ninguna disciplina presencial.

```prisma
model OnDemandCategory {
  id            String                @id @default(cuid())
  centerId      String
  name          String
  description   String?
  thumbnailUrl  String?
  sortOrder     Int                   @default(0)
  status        OnDemandContentStatus @default(DRAFT)
  createdAt     DateTime              @default(now())
  updatedAt     DateTime              @updatedAt

  center        Center                @relation(fields: [centerId], references: [id], onDelete: Cascade)
  practices     OnDemandPractice[]
  quotas        PlanCategoryQuota[]

  @@unique([centerId, name])
  @@index([centerId])
  @@index([centerId, status])
}
```

#### OnDemandPractice

Segundo nivel. Agrupa lecciones dentro de una categoría (e.g., "Hatha Yoga" dentro de "Yoga").

```prisma
model OnDemandPractice {
  id            String                @id @default(cuid())
  categoryId    String
  name          String
  description   String?
  thumbnailUrl  String?
  sortOrder     Int                   @default(0)
  status        OnDemandContentStatus @default(DRAFT)
  createdAt     DateTime              @default(now())
  updatedAt     DateTime              @updatedAt

  category      OnDemandCategory      @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  lessons       OnDemandLesson[]

  @@unique([categoryId, name])
  @@index([categoryId])
}
```

#### OnDemandLesson

Tercer nivel. Una clase grabada individual con video de Vimeo.

```prisma
model OnDemandLesson {
  id              String                @id @default(cuid())
  practiceId      String
  title           String
  description     String?
  videoUrl        String                // Vimeo private URL (embed)
  promoVideoUrl   String?               // public promo/trailer
  thumbnailUrl    String?
  durationMinutes Int?
  level           String?               // free text: "Principiante", "Intermedio", etc.
  intensity       String?               // free text: "Suave", "Moderada", "Intensa"
  targetAudience  String?               // free text: "Embarazadas", "Adulto mayor"
  equipment       String?               // free text: "Mat, bloque, cinta"
  tags            String?               // comma-separated: "relajación, espalda, flexibilidad"
  sortOrder       Int                   @default(0)
  status          OnDemandContentStatus @default(DRAFT)
  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt

  practice        OnDemandPractice      @relation(fields: [practiceId], references: [id], onDelete: Cascade)
  unlocks         LessonUnlock[]

  @@index([practiceId])
  @@index([practiceId, status])
}
```

#### PlanCategoryQuota

Cuota de lecciones por categoría para planes ON_DEMAND. Los planes MEMBERSHIP_ON_DEMAND no tienen registros aquí (acceso ilimitado).

```prisma
model PlanCategoryQuota {
  id          String   @id @default(cuid())
  planId      String
  categoryId  String
  maxLessons  Int      // cuántas lecciones puede desbloquear en esta categoría
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  plan        Plan             @relation(fields: [planId], references: [id], onDelete: Cascade)
  category    OnDemandCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([planId, categoryId])
  @@index([planId])
  @@index([categoryId])
}
```

#### LessonUnlock

Registro de desbloqueo. Vinculado al UserPlan — si el plan vence (`validUntil` pasado), los unlocks dejan de dar acceso.

```prisma
model LessonUnlock {
  id          String   @id @default(cuid())
  userId      String
  lessonId    String
  userPlanId  String
  centerId    String
  unlockedAt  DateTime @default(now())

  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  lesson      OnDemandLesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  userPlan    UserPlan         @relation(fields: [userPlanId], references: [id], onDelete: Cascade)
  center      Center           @relation(fields: [centerId], references: [id], onDelete: Cascade)

  @@unique([userId, lessonId])
  @@index([userId])
  @@index([userPlanId])
  @@index([centerId])
}
```

### Modified Models

#### Center

Add relations:
```prisma
onDemandCategories OnDemandCategory[]
lessonUnlocks      LessonUnlock[]
```

#### Plan

Add relation:
```prisma
categoryQuotas PlanCategoryQuota[]
```

#### UserPlan

Add relation:
```prisma
lessonUnlocks LessonUnlock[]
```

#### User

Add relation:
```prisma
lessonUnlocks LessonUnlock[]
```

#### EmailPreference

Add new boolean columns (default `true`):
```prisma
lessonUnlocked  Boolean @default(true)
quotaExhausted  Boolean @default(true)
newContent      Boolean @default(true)
```

---

## Unlock Flow

1. Student browses catalog, finds a lesson, clicks "Desbloquear"
2. Frontend shows confirmation modal: "Vas a usar 1 de tus X clases restantes de [Categoría]. Confirmar?"
3. `POST /api/on-demand/unlock` with `{ lessonId }`
4. Backend validates:
   - User has active UserPlan of type ON_DEMAND or MEMBERSHIP_ON_DEMAND
   - UserPlan is not expired (`validUntil` is null or in the future)
   - UserPlan is not frozen
   - For ON_DEMAND plans: PlanCategoryQuota exists for this category, and user hasn't exceeded it (count LessonUnlock for this userPlan + category)
   - Lesson is not already unlocked by this user
5. Creates `LessonUnlock` record
6. Returns lesson with full video URL
7. Sends `lessonUnlocked` email (if preference enabled)
8. If quota is now exhausted, sends `quotaExhausted` email (if preference enabled)

**MEMBERSHIP_ON_DEMAND plans:** Skip quota validation entirely. The user can unlock unlimited lessons.

**Access check logic:** A user can watch a lesson if:
- They have a `LessonUnlock` for that lesson, AND
- The linked `UserPlan` has `status = ACTIVE` AND (`validUntil` is null OR `validUntil > now()`)

---

## Pages

### Public (not logged in)

#### `/catalogo` — Browse catalog

Server Component. Displays published categories, practices, and lessons with thumbnails, descriptions, and promo videos. No unlock/watch actions.

- Category cards with thumbnail and practice count
- Click category: shows practices with lesson count
- Click practice: shows lesson cards (thumbnail, title, duration, level)
- Lesson detail: shows promo video (if available), description, metadata. No full video.
- CTA: "Compra un plan para acceder" (link to plans section) or "Inicia sesion" (link to login)

**Caching:** `export const revalidate = 300` (5 min ISR). `revalidatePath('/catalogo')` on content changes.

### Panel (logged in)

#### `/panel/on-demand` — Student catalog with actions

Same catalog structure as `/catalogo`, but with unlock/watch actions:
- Unlocked lessons show "Ver clase" button (plays full video)
- Locked lessons show "Desbloquear" button with quota badge
- Category header shows quota: "3 de 8 clases usadas" (for ON_DEMAND plans) or "Acceso ilimitado" (for MEMBERSHIP_ON_DEMAND)
- If user has no on-demand plan: CTA "Compra un plan on demand" (link to store)

#### `/panel/on-demand/mis-clases` — Quick access to unlocked lessons

Flat list of all lessons the user has unlocked, sorted by `unlockedAt` desc. Each card shows thumbnail, title, practice name, category name, duration. Click to play.

### Admin

#### `/panel/on-demand` section (sidebar)

New sidebar menu item "On Demand" visible to all roles. Admin sees management sub-items, students/instructors see catalog view.

#### `/panel/on-demand/categorias` — Category management

- List of categories with name, practice count, lesson count, status badge (DRAFT/PUBLISHED)
- Create new category: name, description, thumbnail URL
- Up/down buttons to reorder (same pattern as Fase 3A)
- Click category: navigates to category detail

#### `/panel/on-demand/categorias/[id]` — Category detail

- Edit category fields (name, description, thumbnail, status)
- List of practices within this category
- Create new practice: name, description, thumbnail URL
- Up/down buttons to reorder practices
- Click practice: navigates to practice detail

#### `/panel/on-demand/categorias/[id]/practicas/[id]` — Practice detail

- Edit practice fields (name, description, thumbnail, status)
- List of lessons within this practice
- Create new lesson: opens lesson form
- Up/down buttons to reorder lessons
- Click lesson: opens edit form

#### `/panel/on-demand/nueva-clase` — Create/edit lesson form

Form fields:
- **Required:** Title, Video URL (Vimeo embed URL)
- **Optional:** Description, Promo Video URL, Thumbnail URL, Duration (minutes), Level, Intensity, Target Audience, Equipment, Tags
- **Selectors:** Category (dropdown, can create on the fly), Practice (dropdown filtered by category, can create on the fly)
- **Status:** DRAFT (default) / PUBLISHED toggle
- Submit creates `OnDemandLesson` (and optionally new category/practice)

#### Plan form extension

When plan type is ON_DEMAND:
- Show "Cuota por categoria" section
- Table: Category | Max lecciones (input number)
- Admin selects categories and sets max lessons per category
- Creates/updates `PlanCategoryQuota` records on save

When plan type is MEMBERSHIP_ON_DEMAND:
- Show warning: "Este plan dara acceso ilimitado a todo el contenido on demand"
- No quota configuration needed

---

## Emails

Three new transactional emails, following the pattern in `lib/email/transactional.ts`.

### `lessonUnlocked`

**Trigger:** After successful unlock.
**Subject:** `Desbloqueaste: [lessonTitle]`
**Body:**
- Greeting
- "Desbloqueaste [lessonTitle] de [practiceName]."
- "Te quedan X clases de [categoryName]." (omit for MEMBERSHIP_ON_DEMAND)
- CTA: "Ver clase" (link to `/panel/on-demand`)
- Footer with unsubscribe

**Preference key:** `lessonUnlocked` in EmailPreference

### `quotaExhausted`

**Trigger:** After unlock when quota reaches 0 for a category.
**Subject:** `Usaste todas tus clases de [categoryName]`
**Body:**
- Greeting
- "Usaste todas tus clases de [categoryName]."
- "Renueva tu plan o compra una membresia para acceso ilimitado."
- CTA: "Ver planes" (link to store)

**Preference key:** `quotaExhausted` in EmailPreference

### `newContent`

**Trigger:** Admin explicitly clicks "Notificar" after publishing new content.
**Subject:** `Nueva clase disponible: [lessonTitle]`
**Body:**
- Greeting
- "Se agrego [lessonTitle] a [practiceName]."
- "Explora el catalogo on demand."
- CTA: "Ver catalogo" (link to `/catalogo` or `/panel/on-demand`)

**Preference key:** `newContent` in EmailPreference

**Recipient logic:** All users with active ON_DEMAND or MEMBERSHIP_ON_DEMAND plans in the center, who have `newContent: true` in their EmailPreference.

---

## API Routes

### Public Catalog

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/catalog` | None | List published categories with practice count, lesson count |
| GET | `/api/catalog/[categoryId]` | None | Category detail with published practices |
| GET | `/api/catalog/[categoryId]/[practiceId]` | None | Practice detail with published lessons (no full video URLs) |

### Student Actions

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/on-demand/unlock` | Student | Unlock a lesson. Body: `{ lessonId: string }` |
| GET | `/api/on-demand/my-lessons` | Student | List unlocked lessons with access status |

### Admin CRUD

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/panel/on-demand/categories` | Admin | List all categories (including DRAFT) |
| POST | `/api/panel/on-demand/categories` | Admin | Create category |
| PATCH | `/api/panel/on-demand/categories/[id]` | Admin | Update category |
| DELETE | `/api/panel/on-demand/categories/[id]` | Admin | Delete category (cascades practices + lessons) |
| POST | `/api/panel/on-demand/categories/[id]/practices` | Admin | Create practice |
| PATCH | `/api/panel/on-demand/categories/[id]/practices/[id]` | Admin | Update practice |
| DELETE | `/api/panel/on-demand/categories/[id]/practices/[id]` | Admin | Delete practice (cascades lessons) |
| POST | `/api/panel/on-demand/lessons` | Admin | Create lesson |
| PATCH | `/api/panel/on-demand/lessons/[id]` | Admin | Update lesson |
| DELETE | `/api/panel/on-demand/lessons/[id]` | Admin | Delete lesson |
| PATCH | `/api/panel/on-demand/reorder` | Admin | Reorder categories, practices, or lessons. Body: `{ type: "category" | "practice" | "lesson", orderedIds: string[] }` |
| POST | `/api/panel/on-demand/notify` | Admin | Send newContent email to eligible users. Body: `{ lessonId: string }` |

---

## Hexagonal Architecture

### Domain

- `lib/domain/on-demand.ts` — types: `OnDemandCategory`, `OnDemandPractice`, `OnDemandLesson`, `PlanCategoryQuota`, `LessonUnlock`, `OnDemandContentStatus`

### Application

- `lib/application/unlock-lesson.ts` — validates plan, quota, creates LessonUnlock, triggers emails
- `lib/application/check-lesson-access.ts` — checks if user can watch a lesson (unlock exists + plan active)
- `lib/application/get-category-quota-usage.ts` — counts used/remaining lessons per category for a UserPlan

### Ports

```typescript
// lib/ports/on-demand-category-repository.ts
interface IOnDemandCategoryRepository {
  findByCenterId(centerId: string, includeItems?: boolean): Promise<OnDemandCategory[]>;
  findPublishedByCenterId(centerId: string): Promise<OnDemandCategory[]>;
  findById(id: string): Promise<OnDemandCategory | null>;
  create(data: CreateCategoryInput): Promise<OnDemandCategory>;
  update(id: string, data: UpdateCategoryInput): Promise<OnDemandCategory>;
  delete(id: string): Promise<void>;
  reorder(orderedIds: string[]): Promise<void>;
}

// lib/ports/on-demand-practice-repository.ts
interface IOnDemandPracticeRepository {
  findByCategoryId(categoryId: string): Promise<OnDemandPractice[]>;
  findPublishedByCategoryId(categoryId: string): Promise<OnDemandPractice[]>;
  findById(id: string): Promise<OnDemandPractice | null>;
  create(data: CreatePracticeInput): Promise<OnDemandPractice>;
  update(id: string, data: UpdatePracticeInput): Promise<OnDemandPractice>;
  delete(id: string): Promise<void>;
  reorder(orderedIds: string[]): Promise<void>;
}

// lib/ports/on-demand-lesson-repository.ts
interface IOnDemandLessonRepository {
  findByPracticeId(practiceId: string): Promise<OnDemandLesson[]>;
  findPublishedByPracticeId(practiceId: string): Promise<OnDemandLesson[]>;
  findById(id: string): Promise<OnDemandLesson | null>;
  create(data: CreateLessonInput): Promise<OnDemandLesson>;
  update(id: string, data: UpdateLessonInput): Promise<OnDemandLesson>;
  delete(id: string): Promise<void>;
  reorder(orderedIds: string[]): Promise<void>;
}

// lib/ports/lesson-unlock-repository.ts
interface ILessonUnlockRepository {
  findByUserId(userId: string): Promise<LessonUnlock[]>;
  findByUserAndLesson(userId: string, lessonId: string): Promise<LessonUnlock | null>;
  countByUserPlanAndCategory(userPlanId: string, categoryId: string): Promise<number>;
  create(data: CreateLessonUnlockInput): Promise<LessonUnlock>;
}

// lib/ports/plan-category-quota-repository.ts
interface IPlanCategoryQuotaRepository {
  findByPlanId(planId: string): Promise<PlanCategoryQuota[]>;
  findByPlanAndCategory(planId: string, categoryId: string): Promise<PlanCategoryQuota | null>;
  upsertMany(planId: string, quotas: { categoryId: string; maxLessons: number }[]): Promise<void>;
  deleteByPlanId(planId: string): Promise<void>;
}
```

### Adapters

- `lib/adapters/db/on-demand-category-repository.ts` — Prisma implementation
- `lib/adapters/db/on-demand-practice-repository.ts` — Prisma implementation
- `lib/adapters/db/on-demand-lesson-repository.ts` — Prisma implementation
- `lib/adapters/db/lesson-unlock-repository.ts` — Prisma implementation
- `lib/adapters/db/plan-category-quota-repository.ts` — Prisma implementation

### DTOs

- `lib/dto/on-demand-category-dto.ts` — Zod schemas for category CRUD
- `lib/dto/on-demand-practice-dto.ts` — Zod schemas for practice CRUD
- `lib/dto/on-demand-lesson-dto.ts` — Zod schemas for lesson CRUD (videoUrl must be https://, thumbnailUrl must be https://)
- `lib/dto/lesson-unlock-dto.ts` — Zod schema for unlock request
- `lib/dto/plan-category-quota-dto.ts` — Zod schema for quota configuration

### Emails

- `lib/email/on-demand.ts` — builders: `buildLessonUnlockedEmail()`, `buildQuotaExhaustedEmail()`, `buildNewContentEmail()`
- Add `lessonUnlocked`, `quotaExhausted`, `newContent` to `EmailPreferenceType` in `lib/domain/email-preference.ts`

---

## Testing

### Unit Tests

- `on-demand-category-dto.test.ts` — validate name required, thumbnailUrl https-only, status enum
- `on-demand-lesson-dto.test.ts` — validate title required, videoUrl required + https-only, durationMinutes positive int
- `lesson-unlock-dto.test.ts` — validate lessonId required
- `unlock-lesson.test.ts` — test unlock flow:
  - Success: active plan, quota available, creates unlock
  - Reject: no active plan
  - Reject: plan expired (validUntil in past)
  - Reject: plan frozen
  - Reject: quota exhausted (ON_DEMAND plan)
  - Success: no quota check (MEMBERSHIP_ON_DEMAND plan)
  - Reject: already unlocked (duplicate)
- `check-lesson-access.test.ts` — test access logic:
  - Access granted: unlock exists + plan active + not expired
  - Access denied: unlock exists but plan expired
  - Access denied: unlock exists but plan frozen
  - Access denied: no unlock
- `get-category-quota-usage.test.ts` — count used/remaining correctly

### E2E Tests

- Public: browse `/catalogo`, verify categories and lessons visible, no video URLs exposed
- Student: login, navigate `/panel/on-demand`, unlock a lesson, verify video plays
- Student: unlock until quota exhausted, verify "Desbloquear" disabled with message
- Student: navigate `/panel/on-demand/mis-clases`, verify unlocked lesson appears
- Admin: create category, practice, lesson via CRUD pages
- Admin: reorder categories using up/down buttons
- Admin: extend plan with category quotas
- Admin: trigger "Notificar" for new content

---

## Seed Data

### Centro "cuerporaiz"

Create sample on-demand content for development/demo:

**Categories:**
- "Yoga" (PUBLISHED, 3 practices)
- "Meditacion" (PUBLISHED, 2 practices)

**Practices under "Yoga":**
- "Hatha Yoga" (PUBLISHED, 3 lessons)
- "Vinyasa Flow" (PUBLISHED, 2 lessons)
- "Yoga Restaurativo" (PUBLISHED, 2 lessons)

**Practices under "Meditacion":**
- "Mindfulness" (PUBLISHED, 2 lessons)
- "Meditacion Guiada" (PUBLISHED, 2 lessons)

**Lessons:** Use placeholder Vimeo URLs. Include varied metadata (duration, level, intensity, equipment).

**PlanCategoryQuota:** Add quotas to existing ON_DEMAND plans (e.g., 4 lessons for "Yoga", 2 for "Meditacion").

---

## Scope — What's NOT Included

- Vimeo API integration (manual URL paste for now)
- Custom video player component (use Vimeo embed iframe)
- Drag & drop reordering (use up/down buttons, same as Fase 3A)
- Watch progress / completion tracking
- Ratings / reviews on lessons
- Search / full-text search within catalog
- Instructor assignment to lessons (future: link to User model)
- Analytics / watch counts
- Offline access / downloads
- Subscription-based on demand billing (uses existing plan + checkout flow)
