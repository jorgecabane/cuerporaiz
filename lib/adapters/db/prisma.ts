/**
 * Cliente Prisma con adaptador Postgres (Prisma 7). Conexión vía DATABASE_URL (Supabase u otro Postgres).
 * Solo se usa desde adaptadores; el dominio no importa este archivo.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required for Postgres.");
}

const adapter = new PrismaPg({ connectionString });
export const prisma = new PrismaClient({ adapter });
