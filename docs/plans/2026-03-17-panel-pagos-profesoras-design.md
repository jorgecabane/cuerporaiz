# 2026-03-17 — Panel Pagos (paginación + filtros) y Datos bancarios de profesoras

## Contexto

Hoy `/panel/pagos` lista **órdenes** (`Order`) del centro con filtro por `status`, sin paginación, y resuelve `User`/`Plan` con lookups adicionales.

Objetivo:

- Hacer el listado **paginado** (máx. **20 items por página**).
- Agregar **búsqueda por email** del cliente y **filtro por fecha** con **presets + rango**.
- Soportar **dos fuentes** (tab/switch): **Checkout** (`Order`) y **Manual** (`ManualPayment`), por separado (sin merge entre tablas).
- En sección de profesoras: agregar **datos bancarios** (depósito) reutilizando la UI del plugin de transferencia. La **imagen** se deja en pausa hasta integrar Sanity.

## Decisiones clave

### 1) Fuente de datos y navegación

- La vista de pagos tendrá un **switch** `type=checkout|manual` (por defecto `checkout`).
- El switch determina **qué tabla se consulta**:
  - `checkout` ⇒ `Order`
  - `manual` ⇒ `ManualPayment`
- Al cambiar el switch:
  - Se mantiene `email`/fecha (si aplica) en la URL.
  - Se **resetea la paginación** (vuelve a la primera página).
  - Checkout sigue permitiendo `status` (manual no).

### 2) Filtros

#### Email

- `email` (string): filtro por `User.email` (case-insensitive).
- UX: input con placeholder “Email cliente…” + botón “Limpiar”.

#### Fecha (presets + custom)

- Presets: **Hoy**, **Últimos 7 días**, **Este mes**, **Personalizado**.
- Params:
  - `datePreset=today|last7|thisMonth|custom`
  - `from=YYYY-MM-DD` y `to=YYYY-MM-DD` (solo si `custom`)
- Semántica:
  - Se filtra por rango inclusivo en día (server convierte `from` a inicio de día y `to` a fin de día en zona horaria definida por el sistema).
  - `checkout`: filtra por `Order.createdAt`.
  - `manual`: filtra por `ManualPayment.paidAt`.

### 3) Paginación (máx. 20 items)

- Tamaño fijo: `take=20`.
- Paginación server-side usando `cursor`:
  - `cursor` codifica el último registro mostrado (fecha + id o solo id según estrategia).
  - Params:
    - `cursor=<opaque>`
    - `direction=next|prev` (opcional; se puede implementar solo “next” inicialmente y volver con “primera página”)

Nota: al evitar “vista combinada”, cada tipo pagina directo en su tabla (estable y simple).

### 4) Rendimiento / N+1

- Checkout: la query debe traer lo necesario para renderizar la fila sin N+1:
  - incluir `User.email` y `Plan.name` (via `include`/joins Prisma) o resolver en una única query adicional y mapear (pero evitando traer “todo”).
- Manual: incluir `User.email` y `UserPlan/Plan` si corresponde.

## Diseño UI (Panel Pagos)

### Estructura

- Título: “Pagos”
- Subtítulo corto (qué muestra y para qué)
- Barra de controles (sticky en desktop si aplica):
  - Switch: Checkout | Manual (Checkout activo por defecto)
  - Input email
  - DatePreset (segmented / select) + rango (si custom)
  - (Solo checkout) filtro `status`
  - Acción “Limpiar filtros”
- Tabla data-dense:
  - Columnas (checkout):
    - Fecha (`createdAt`)
    - Cliente (email + link a `/panel/clientes/[id]`)
    - Plan
    - Monto
    - Estado
    - Ref.
    - Acción (conciliación manual si `PENDING`)
  - Columnas (manual):
    - Fecha (`paidAt`)
    - Cliente (email)
    - Plan (si `userPlanId`, si no “Pago suelto”)
    - Monto
    - Método (`method`)
    - Nota (si existe)
- Paginación:
  - “Anterior” / “Siguiente” + “Mostrando 1–20” si tenemos total (opcional).

### Estilo (alineado al design system generado)

- Estética “data-dense dashboard”:
  - tabla con hover highlight por fila
  - controles compactos, spacing mínimo pero respirable
  - estados y tipos como badges (sin emojis)
  - accesibilidad: focus states y labels

## Datos bancarios de profesoras (reutilización “transferencia”)

### Estado actual

- Plugin transferencia: formulario con campos bancarios en `Center`:
  - `bankName`, `bankAccountType`, `bankAccountNumber`, `bankAccountHolder`, `bankAccountRut`, `bankAccountEmail`
- Profesora: se guarda como `User` con rol INSTRUCTOR por centro (`UserCenterRole`).

### Objetivo

- Permitir guardar datos bancarios por profesora **por centro**.
- Reutilizar UI/campos del plugin para mantener consistencia.

### Modelo propuesto (DB)

Crear un nuevo modelo:

- `InstructorBankAccount` (o `UserBankAccount`):
  - `id`
  - `centerId`
  - `userId` (profesora)
  - mismos campos que `Center` para datos bancarios (nullable)
  - `@@unique([centerId, userId])`

Esto evita mezclar datos en `User` (multi-centro) y permite que una instructora tenga datos distintos según el centro.

### UI propuesta

- En `app/panel/profesoras/[id]/editar` agregar sección “Datos bancarios (depósito)”.
- Extraer desde `app/panel/plugins/transferencia/BankTransferForm.tsx` un componente reutilizable:
  - `BankAccountFields` (inputs/selects y constantes `BANKS`/`ACCOUNT_TYPES`)
  - Usarlo tanto en plugin (Center) como en profesoras.

### Acciones / Validación

- Server Action: `saveInstructorBankData({ centerId, instructorId, ...fields })`
  - valida permisos admin del centro.
  - upsert por `(centerId, userId)`.
- Validación liviana:
  - email formato
  - rut formato (sin validar dígito verificador inicialmente, opcional futuro)

## Testing

### Unit (Vitest)

- Agregar tests para:
  - parsing de `searchParams` (email + presets + rango)
  - construcción de filtros Prisma (checkout vs manual)
  - helper de rango de fechas (inclusive day range)

### E2E (Playwright)

- Agregar E2E para `/panel/pagos`:
  - paginación (siguiente/prev si aplica)
  - búsqueda por email
  - filtro por preset “Últimos 7 días”
  - switch checkout/manual y que cambia dataset

## Fuera de alcance (por ahora)

- “Vista combinada” (merge entre `Order` y `ManualPayment`) para paginar como una sola lista.
- Subida de imagen de profesoras sin URL (se retoma cuando integremos Sanity).

