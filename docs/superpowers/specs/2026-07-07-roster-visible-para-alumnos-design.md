# Roster visible para alumnos (Approach A: endpoint dedicado + lazy-load)

**Fecha:** 2026-07-07
**Branch propuesta:** `feature/roster-alumnos`
**Owner:** Jorge Cabané

## Resumen

Permitir que un alumno vea, antes (y después) de reservar una clase, quiénes más están registrados (nombre completo + avatar, sin email). Se reutiliza el patrón visual del acordeón "Estudiantes inscritos" que hoy ven admin/instructor en `ClassCard`, pero en una variante de **solo lectura** (sin marcar asistencia, des-reservar ni reservar por otro). La visibilidad se controla con un nuevo check en `/panel/configuracion`, a nivel de centro (no por clase), **desactivado por default**.

## Motivación

- Los alumnos piden saber quién más va a estar en la clase antes de decidir reservar (contexto social, coordinación con compañeros).
- Ya existe la infraestructura de datos (`Reservation` + `User`) y el patrón de UI (acordeón lazy-load en `ClassCard`) usados hoy por staff para asistencia — se reutiliza el patrón, no el endpoint.
- Es sensible en términos de privacidad (expone nombre + foto de otros alumnos), por eso el admin debe habilitarlo explícitamente por centro.

## Non-goals

- No aplica a Eventos (`Event`/`EventTicket`) ni al guest checkout — esto es exclusivamente para `LiveClass`/`Reservation`.
- No se muestra lista de espera (waitlist) en esta vista — solo reservas `CONFIRMED`.
- No hay control por clase individual, solo el toggle global de centro.
- No se toca el endpoint `/api/admin/attendance` existente (sigue siendo 100% staff).
- No se agrega el unit test faltante de `attendance.ts` (gap preexistente, fuera de alcance).

## Arquitectura

```
Alumno (ClassCard, variante solo-lectura)
  └── expande acordeón "Compañeros registrados (N)"
        └── GET /api/reservations/roster?liveClassId=…   (lazy, on-expand)
              └── listClassRosterUseCase(liveClassId, centerId)
                    ├── valida center.showClassRosterToStudents === true
                    ├── valida liveClass.centerId === centerId
                    └── prisma.reservation.findMany({ status: CONFIRMED }, include user{ id, name, lastName, imageUrl })

Admin (PoliticasForm.tsx en /panel/configuracion)
  └── checkbox "Mostrar a los alumnos quién más está registrado en la clase"
        └── updateCenterPolicies(centerId, { showClassRosterToStudents })
              └── centerRepository.updatePolicies
                    └── Center.showClassRosterToStudents (DB)
```

El patrón de carga perezosa es idéntico al que ya usa `PanelHomeCalendar.loadStaffAttendeesForDay` para el staff, pero con un endpoint y DTO propios (sin email, sin acciones).

## Cambios detallados

### 1. Schema Prisma

En `prisma/schema.prisma`, modelo `Center`, junto a `allowTrialClassPerPerson`:

```prisma
showClassRosterToStudents Boolean @default(false)
```

Migración: `npx prisma migrate dev --name add_show_class_roster_to_students`.

### 2. Dominio

`lib/domain/center.ts` — agregar a la interface `Center`:

```ts
showClassRosterToStudents: boolean;
```

### 3. Ports/Adapters

- `lib/ports/center-repository.ts` — agregar `showClassRosterToStudents?: boolean` a `CenterPoliciesUpdate`.
- `lib/adapters/db/center-repository.ts` — en `updatePolicies`: `if (data.showClassRosterToStudents !== undefined) payload.showClassRosterToStudents = data.showClassRosterToStudents;`. Mapear en `toDomainCenter`.

### 4. DTO nuevo

`lib/dto/class-roster-dto.ts`:

```ts
export const classRosterQuerySchema = z.object({
  liveClassId: z.string().min(1, "liveClassId requerido"),
});

export interface ClassRosterEntryDto {
  userId: string;
  name: string | null;
  lastName: string | null;
  imageUrl: string | null;
}
```

Sin `email` — decisión de privacidad explícita, a diferencia de `ClassAttendanceDto`.

### 5. Caso de uso nuevo

`lib/application/class-roster.ts` → `listClassRosterUseCase(liveClassId: string, centerId: string)`:

1. `centerRepository.findById(centerId)` → si `!center?.showClassRosterToStudents` → throw error `ROSTER_DISABLED`.
2. `liveClassRepository.findById(liveClassId)` → si no existe o `liveClass.centerId !== centerId` → throw error `NOT_FOUND` (mismo patrón que `listClassAttendanceUseCase`).
3. `prisma.reservation.findMany({ where: { liveClassId, status: "CONFIRMED" }, include: { user: { select: { id: true, name: true, lastName: true, imageUrl: true } } }, orderBy: { createdAt: "asc" } })`.
4. Mapea a `ClassRosterEntryDto[]`.

### 6. Endpoint nuevo

`app/api/reservations/roster/route.ts` — `GET`:

- Requiere sesión activa (cualquier rol del centro — no se restringe a `STUDENT`, mismo criterio amplio que otros endpoints de lectura propia).
- Valida query con `classRosterQuerySchema`.
- Llama `listClassRosterUseCase(liveClassId, session.user.centerId)`.
- Mapeo de errores: `ROSTER_DISABLED` → 403, `NOT_FOUND` → 404.

### 7. UI — ClassCard (variante alumno) + componente nuevo

`ClassCard.tsx` ya tiene 420 líneas (sobre el máximo de 400 del CLAUDE.md). En vez de seguir agregando JSX ahí, el acordeón de solo lectura se extrae a un componente propio:

**`components/panel/reservas/ClassRosterAccordion.tsx`** (nuevo):
- Props: `liveClassId: string`, `roster: RosterEntry[] | undefined`, `loading: boolean`, `onExpand: () => void`.
- Acordeón "Compañeros registrados (N)", mismo patrón visual de expand/collapse que la variante admin de `ClassCard`, pero **sin ninguna acción** (sin botones de asistencia/des-reservar/reservar-por-otro). Cada fila: avatar (`imageUrl` o iniciales como fallback) + `name` + `lastName`.
- Estado vacío (0 confirmados): "Aún no hay nadie más registrado en esta clase."
- Estado de carga: spinner mientras espera la respuesta.
- Unidad autocontenida: no sabe de `ClassCard`, ni de admin/instructor — solo recibe datos y un callback de expansión.

**`ClassCard.tsx`**, sección de alumno (líneas ~340-416): agrega ~10 líneas — prop nueva `showRoster?: boolean` y, si es `true`, renderiza `<ClassRosterAccordion liveClassId={...} roster={...} loading={...} onExpand={...} />`. Si `showRoster` es `false`/`undefined`, no se renderiza nada — el alumno no percibe que la opción existe. Los datos (`roster`, `loading`, `onExpand`) se siguen recibiendo como props desde el padre (mismo mecanismo que hoy usan `attendees`/`onMarkAttendance` para la variante staff), así `ClassCard` no gana lógica de fetch, solo pasa las props hacia abajo.

### 8. Wiring — PanelHomeCalendar y ReservasPanel

Ambos ya cargan `center` en su `page.tsx` server component (`app/panel/page.tsx:88`, `app/panel/reservas/page.tsx:12`) y pasan campos individuales del centro como props (`weekStartDay`, no el objeto completo).

- `app/panel/page.tsx` y `app/panel/reservas/page.tsx`: agregar prop `showClassRosterToStudents={center?.showClassRosterToStudents ?? false}` a `<PanelHomeCalendar>` / `<ReservasPanel>`.
- `PanelHomeCalendar.tsx` / `ReservasPanel.tsx`: recibir la nueva prop, agregar estado `rosterByClassId` (cache en memoria, similar a como se cachean los attendees de staff) y una función `loadRosterForClass(liveClassId)` análoga a `loadStaffAttendeesForDay` que hace `GET /api/reservations/roster?liveClassId=` y guarda el resultado. Se pasa a `ClassCard` como `onExpandRoster`.

### 9. UI — Configuración de centro

`app/panel/configuracion/PoliticasForm.tsx` + `actions.ts` (patrón de `notifyWhenSlotFreed`):

- `actions.ts` (`updateCenterPolicies`): agregar el campo al objeto pasado a `centerRepository.updatePolicies`, mantener `revalidatePath("/panel/configuracion")`.
- `PoliticasForm.tsx`: leer `formData.get("showClassRosterToStudents") === "on"`, checkbox:

```tsx
<label className="flex items-center gap-2">
  <input type="checkbox" name="showClassRosterToStudents" defaultChecked={center.showClassRosterToStudents} />
  Mostrar a los alumnos quién más está registrado en la clase
</label>
<p className="text-xs text-[var(--color-text-muted)]">
  Los alumnos verán el nombre y la foto de perfil de quienes ya tienen un cupo confirmado en la misma clase.
</p>
```

**Nota:** `/panel/politicas` es una ruta legacy no enlazada en el nav (`lib/panel-nav.ts`) que duplica parte de este formulario. No se toca en este trabajo — si el usuario confirma que está en desuso, se puede eliminar en un cambio separado.

## Validación y edge cases

| Caso | Comportamiento |
|---|---|
| Policy desactivada, alumno llama el endpoint directo | 403 `ROSTER_DISABLED` |
| Clase de otro centro | 404 (mismo criterio multi-tenant que `listClassAttendanceUseCase`) |
| Clase sin reservas confirmadas | Lista vacía → UI muestra estado vacío, no error |
| Alumno que ya reservó esa clase | Sigue viendo el acordeón (incluido él mismo en la lista, sin trato especial) |
| Reserva `CANCELLED`/`LATE_CANCELLED`/`ATTENDED`/`NO_SHOW` | Excluida — solo `CONFIRMED` |
| Admin desactiva la policy después de que un alumno ya abrió el acordeón | Próxima carga (nueva expansión) devuelve 403; no hay invalidación push, es aceptable dado que es de solo lectura y no cambia mientras la página sigue abierta |

## Seguridad

- Nuevo DTO **no incluye email** — solo `name`, `lastName`, `imageUrl`. Decisión explícita de privacidad, distinta del DTO de asistencia (staff).
- Endpoint valida sesión + pertenencia al centro (misma verificación multi-tenant que el resto de la app).
- No se reutiliza ni modifica `/api/admin/attendance` — cero riesgo de que un cambio futuro en el DTO de staff filtre datos a alumnos.

## Testing

**Unit (Vitest):**

- `lib/application/class-roster.test.ts` (nuevo, patrón `vi.hoisted` + mocks de `centerRepository`/`liveClassRepository`, igual que `reserve-class.test.ts`):
  - Policy desactivada → error `ROSTER_DISABLED`.
  - Clase de otro centro → error `NOT_FOUND`.
  - Devuelve solo reservas `CONFIRMED` (fixtures con `CANCELLED`, `LATE_CANCELLED`, `ATTENDED`, `NO_SHOW` deben quedar excluidas).
  - DTO resultante no incluye `email`.
  - Orden `createdAt asc`.

**E2E (Playwright):**

`e2e/roster-alumnos.spec.ts` (rol student, storageState `.auth/student.json`, helpers de `e2e/helpers/cleanup.ts` para seed/cleanup de reservas):

- Policy activada: alumno abre el acordeón y ve nombre+avatar de un compañero confirmado; la respuesta de red del endpoint no incluye `email`.
- Policy desactivada: el acordeón no se renderiza en `ClassCard`; llamar el endpoint directo devuelve 403.
- Aislamiento multi-tenant: alumno de centro A no puede leer el roster de una clase de centro B (404).
- Admin activa/desactiva el checkbox en `/panel/configuracion` y el valor persiste tras recargar.

**Coverage:** el nuevo `lib/application/class-roster.ts` debe quedar cubierto por el unit test de arriba para no bajar el umbral del 90% del proyecto.

## Archivos tocados

| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` | +1 campo (`Center.showClassRosterToStudents`) |
| `prisma/migrations/…/migration.sql` | nuevo |
| `lib/domain/center.ts` | +1 campo en interface |
| `lib/ports/center-repository.ts` | +1 campo en `CenterPoliciesUpdate` |
| `lib/adapters/db/center-repository.ts` | +1 campo en `updatePolicies` + `toDomainCenter` |
| `lib/dto/class-roster-dto.ts` (nuevo) | query schema + `ClassRosterEntryDto` |
| `lib/application/class-roster.ts` (nuevo) | `listClassRosterUseCase` |
| `lib/application/class-roster.test.ts` (nuevo) | unit tests |
| `app/api/reservations/roster/route.ts` (nuevo) | `GET` |
| `components/panel/reservas/ClassRosterAccordion.tsx` (nuevo) | acordeón solo-lectura, componente propio |
| `components/panel/reservas/ClassCard.tsx` | +prop `showRoster`, renderiza `ClassRosterAccordion` condicionalmente (~10 líneas) |
| `app/panel/page.tsx` | +prop `showClassRosterToStudents` a `PanelHomeCalendar` |
| `app/panel/PanelHomeCalendar.tsx` | +prop, +estado `rosterByClassId`, +`loadRosterForClass` |
| `app/panel/reservas/page.tsx` | +prop `showClassRosterToStudents` a `ReservasPanel` |
| `app/panel/reservas/ReservasPanel.tsx` | +prop, +estado, +`loadRosterForClass` |
| `app/panel/configuracion/actions.ts` | +campo en `updateCenterPolicies` |
| `app/panel/configuracion/PoliticasForm.tsx` | +checkbox |
| `e2e/roster-alumnos.spec.ts` (nuevo) | E2E |

Los archivos nuevos quedan dentro de los límites del CLAUDE.md (<200 líneas objetivo, <400 máx). `ClassCard.tsx` (420 líneas) y `PanelHomeCalendar.tsx` (811 líneas) ya superaban el máximo *antes* de este cambio; se extrajo `ClassRosterAccordion.tsx` para no seguir agregando JSX a `ClassCard.tsx` (queda en ~+10 líneas netas), pero refactorizar el resto de esos archivos para bajarlos del límite es deuda preexistente no relacionada al pedido de esta feature — no se aborda aquí para no arriesgar regresiones en flujos ya en producción (marcar asistencia, des-reservar, etc.) sin que se haya pedido.
