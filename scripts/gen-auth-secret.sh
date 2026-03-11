#!/usr/bin/env bash
# Genera un valor seguro para AUTH_SECRET (NextAuth).
# Uso: ./scripts/gen-auth-secret.sh
# Añade la salida a .env como AUTH_SECRET="..."

set -e
echo "Generando AUTH_SECRET..."
SECRET=$(openssl rand -base64 32)
echo ""
echo "Añade esta línea a tu .env:"
echo "AUTH_SECRET=\"$SECRET\""
echo ""
echo "O ejecuta: echo \"AUTH_SECRET=\\\"$SECRET\\\"\" >> .env"
