# Prisma Migrate + Supabase (BD ya existente)

## Qué pasó con el error `type "Role" already exists`

`prisma migrate deploy` aplica las migraciones **en orden** por nombre de carpeta. La primera es `20260310120000_init_postgres`: crea el enum `Role` (valores en español) y tablas mínimas.

Si tu base **ya fue creada** con el esquema completo (por ejemplo aplicando a mano el SQL del baseline `20260317133157_baseline` o con un deploy anterior), **ese tipo y las tablas ya existen**. La migración inicial vuelve a ejecutar `CREATE TYPE "Role"` → Postgres responde **42710** (*already exists*).

No es un fallo de Supabase: es un **historial de migraciones mezclado** (bootstrap antiguo + baseline grande + migraciones posteriores).

## Paso 1: Salir del estado “migración fallida”

Si `migrate deploy` quedó en error **P3018**:

```bash
npx prisma migrate resolve --rolled-back "20260310120000_init_postgres"
```

(Si Prisma ya no marca esa migración como fallida, este paso puede no ser necesario.)

## Paso 2: Alinear el historial con lo que **ya** tiene la base

Tienes que marcar como **ya aplicadas** (`--applied`) las migraciones cuyo SQL **ya está reflejado** en tu base, **en orden**, sin ejecutar el SQL otra vez.

Orden actual en el repo:

| Orden | Carpeta de migración |
|------|------------------------|
| 1 | `20260310120000_init_postgres` |
| 2 | `20260311021122_add_live_classes_and_reservations` |
| 3 | `20260311021241_add_mercadopago_checkout_plans_orders_webhooks` |
| 4 | `20260311030000_rename_role_enum_to_english` |
| 5 | `20260312100000_rename_role_enum_to_english` |
| 6 | `20260312160529_add_subscription_model` |
| 7 | `20260313000000_add_center_policy_fields` |
| 8 | `20260315000000_add_zoom_google_meet_config` |
| 9 | `20260315180000_add_user_image_url` |
| 10 | `20260317133157_baseline` |

Después del baseline suelen faltar en BD “limpias” solo estas (según cómo hayas creado la base):

| Orden | Carpeta |
|------|---------|
| 11 | `20260317165140_instructor_bank_account` |
| 12 | `20260317180000_add_subscription_and_recurring_discount` |

Y la que necesitas para `cancelBeforeMinutes` / `bookBeforeMinutes`:

| Orden | Carpeta |
|------|---------|
| 13 | `20260318120000_center_policy_minutes` |

**Regla:** solo usa `migrate resolve --applied "<carpeta>"` para migraciones que **ya** dejaron la base como corresponde. Si no estás seguro de la 11 o 12, en Supabase revisá si existen las tablas `InstructorBankAccount` y `Subscription` (y el enum `SubscriptionStatus`). Si **no** existen, **no** las marques como aplicadas: dejá que `migrate deploy` las ejecute.

Ejemplo (marcar solo las 10 primeras + 11 y 12 si ya están en la base):

```bash
npx prisma migrate resolve --applied "20260310120000_init_postgres"
npx prisma migrate resolve --applied "20260311021122_add_live_classes_and_reservations"
# ... repetir en orden hasta la que corresponda ...
npx prisma migrate resolve --applied "20260317133157_baseline"
```

## Paso 3: Aplicar lo que falta

```bash
npx prisma migrate deploy
```

Debería ejecutar **solo** las migraciones que no estaban registradas en `_prisma_migrations` (típicamente `20260318120000_center_policy_minutes` si el resto ya coincidía con el baseline).

## Paso 4: Regenerar el cliente (local / CI)

```bash
npx prisma generate
```

En Vercel, el build debe ejecutar `prisma generate` después de que el schema y las migraciones coincidan con la base.

## Prevención

- Tras mergear migraciones nuevas: en cada entorno con BD compartida, **`migrate deploy`** en el orden correcto.
- Evitar tener **dos “inicios”** de esquema (init mínimo + baseline completo) sin una estrategia de baseline documentada; si en el futuro se limpia el historial, usar [baselining](https://www.prisma.io/docs/guides/migrate/developing-with-prisma-migrate/baselining) oficial.

## Reparación automática (recomendado si tuviste `init_postgres` duplicado / rolled back)

Si ya corriste el baseline en Supabase y solo faltaba alinear el historial + aplicar `center_policy_minutes`:

```bash
npx tsx scripts/repair-prisma-migrations.ts
```

Ese script: borra filas rotas de `20260310120000_init_postgres`, marca como aplicadas las migraciones intermedias (sin ejecutar SQL), ejecuta `migrate deploy` y `prisma generate`.

## Script opcional (manual)

Ver `scripts/prisma-mark-migrations-applied.sh` (lista de nombres; revisá y editá antes de usar).
