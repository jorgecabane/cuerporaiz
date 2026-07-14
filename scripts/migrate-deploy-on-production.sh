#!/usr/bin/env bash
# Corre `prisma migrate deploy` sólo en el build de Production de Vercel.
# VERCEL_ENV lo setea Vercel automáticamente ("production" | "preview" | "development");
# Preview y Production comparten la misma DATABASE_URL, así que NO debe correr en preview
# (aplicaría migraciones de una rama sin mergear directo a prod).
# Ver docs/prisma-migraciones-supabase.md.
set -euo pipefail

if [ "${VERCEL_ENV:-}" = "production" ]; then
  echo "VERCEL_ENV=production → aplicando migraciones pendientes..."
  npx prisma migrate deploy
else
  echo "VERCEL_ENV=${VERCEL_ENV:-local} → se omite migrate deploy (sólo corre en production)."
fi
