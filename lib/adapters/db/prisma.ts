/**
 * Cliente Prisma con adaptador SQLite (Prisma 7).
 * Solo se usa desde adaptadores; el dominio no importa este archivo.
 */
import { PrismaClient } from "@/lib/generated/prisma";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
// El adaptador better-sqlite3 espera path absoluto para file:
const dbPath =
  databaseUrl.startsWith("file:") && databaseUrl !== "file::memory:"
    ? path.resolve(process.cwd(), databaseUrl.slice("file:".length))
    : databaseUrl;

const adapter = new PrismaBetterSqlite3({ url: dbPath });
export const prisma = new PrismaClient({ adapter });
