#!/usr/bin/env bash
# Marca migraciones como ya aplicadas SIN ejecutar su SQL.
# SOLO usar si la base en DATABASE_URL ya tiene ese esquema (ej. creada con baseline en Supabase).
# Ver docs/prisma-migraciones-supabase.md
#
# Uso:
#   chmod +x scripts/prisma-mark-migrations-applied.sh
#   ./scripts/prisma-mark-migrations-applied.sh
#
# Opcional: comenta líneas del array si alguna migración aún NO está reflejada en la BD
# (dejá que `npx prisma migrate deploy` la ejecute).

set -euo pipefail

MIGRATIONS=(
  "20260310120000_init_postgres"
  "20260311021122_add_live_classes_and_reservations"
  "20260311021241_add_mercadopago_checkout_plans_orders_webhooks"
  "20260311030000_rename_role_enum_to_english"
  "20260312100000_rename_role_enum_to_english"
  "20260312160529_add_subscription_model"
  "20260313000000_add_center_policy_fields"
  "20260315000000_add_zoom_google_meet_config"
  "20260315180000_add_user_image_url"
  "20260317133157_baseline"
)

# Si InstructorBankAccount y Subscription ya existen en tu BD, agregá estas dos líneas
# al array MIGRATIONS arriba (antes del cierre):
#   "20260317165140_instructor_bank_account"
#   "20260317180000_add_subscription_and_recurring_discount"

for name in "${MIGRATIONS[@]}"; do
  [[ "$name" =~ ^#.*$ ]] && continue
  [[ -z "${name// }" ]] && continue
  echo "→ prisma migrate resolve --applied \"$name\""
  npx prisma migrate resolve --applied "$name"
done

echo ""
echo "Listo. Ejecutá: npx prisma migrate deploy"
