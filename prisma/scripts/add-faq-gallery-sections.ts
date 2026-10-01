/**
 * Backfill: add the "gallery" and "faq" CenterSiteSections to the default center
 * (NEXT_PUBLIC_DEFAULT_CENTER_SLUG) and seed the initial FAQ content.
 *
 * Idempotent — skips sections that already exist (FAQ items are only created
 * together with a new "faq" section, never duplicated).
 * - "gallery" goes right after "team" (Sobre mí).
 * - "faq" goes right before "cta".
 * Run with: npx tsx prisma/scripts/add-faq-gallery-sections.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
const slug = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
if (!connectionString || !slug) {
  console.error("DATABASE_URL and NEXT_PUBLIC_DEFAULT_CENTER_SLUG are required.");
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const FAQ_ITEMS: { title: string; description: string }[] = [
  {
    title: "¿Necesito experiencia previa?",
    description: "No necesitas experiencia previa, solo interés y ganas.",
  },
  {
    title: "¿Dónde son las clases presenciales?",
    description: "En la salita de Av. Pdte. Kennedy 6690, Vitacura.",
  },
  {
    title: "¿Puedo probar antes de comprar un plan?",
    description: "Sí — agenda una clase de prueba sin costo y conoce el espacio.",
  },
  {
    title: "¿Cómo funcionan los planes mensuales?",
    description:
      "Hay planes de 4, 6, 8 o 12 clases al mes, ilimitado, o clase suelta — eliges el que se ajuste a tu ritmo y pagas seguro con MercadoPago.",
  },
  {
    title: "¿Qué es la Biblioteca Virtual y tiene vencimiento?",
    description:
      "Es tu biblioteca personal de clases grabadas de yoga y meditación, organizada en packs (Vinyasa Flow, Yin Yoga & Restaurativo, Meditaciones Guiadas & Pranayama) para que elijas el estilo que buscas ese día. La compras una sola vez — sin mensualidad ni suscripción — y queda tuya para siempre: sin fecha de vencimiento ni límite de veces que la veas. La puedes ver desde el celular, tablet o computador, cuando y desde donde quieras.",
  },
  {
    title: "¿Qué pasa si reservo una clase y no puedo ir?",
    description: "Puedes cancelar tu reserva hasta 2 horas antes de la clase sin perder el cupo.",
  },
  {
    title: "¿Hay devolución si compro un pack de la Biblioteca Virtual y no me acomoda?",
    description:
      "Al ser contenido digital de acceso inmediato, los packs de la Biblioteca Virtual no tienen devolución.",
  },
];

/** Inserts a section at `sortOrder`, shifting the following ones down. */
async function insertAt(centerId: string, sectionKey: string, sortOrder: number, title: string, subtitle: string) {
  await prisma.centerSiteSection.updateMany({
    where: { centerId, sortOrder: { gte: sortOrder } },
    data: { sortOrder: { increment: 1 } },
  });
  return prisma.centerSiteSection.create({
    data: { centerId, sectionKey, sortOrder, title, subtitle, visible: true },
  });
}

async function sortOrderOf(centerId: string, sectionKey: string) {
  const s = await prisma.centerSiteSection.findUnique({
    where: { centerId_sectionKey: { centerId, sectionKey } },
    select: { sortOrder: true },
  });
  return s?.sortOrder ?? null;
}

async function lastSortOrder(centerId: string) {
  const last = await prisma.centerSiteSection.findFirst({
    where: { centerId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return last?.sortOrder ?? -1;
}

async function main() {
  const center = await prisma.center.findUniqueOrThrow({ where: { slug }, select: { id: true, name: true } });

  if ((await sortOrderOf(center.id, "gallery")) === null) {
    const team = await sortOrderOf(center.id, "team");
    const at = team !== null ? team + 1 : (await lastSortOrder(center.id)) + 1;
    await insertAt(center.id, "gallery", at, "En imágenes", "Galería");
    console.log(`[+] ${center.name}: "gallery" en sortOrder ${at}`);
  } else {
    console.log(`[=] ${center.name}: "gallery" ya existe`);
  }

  if ((await sortOrderOf(center.id, "faq")) === null) {
    const cta = await sortOrderOf(center.id, "cta");
    const at = cta ?? (await lastSortOrder(center.id)) + 1;
    const faq = await insertAt(center.id, "faq", at, "Preguntas frecuentes", "Dudas comunes");
    await prisma.centerSiteSectionItem.createMany({
      data: FAQ_ITEMS.map((item, i) => ({ sectionId: faq.id, sortOrder: i, ...item })),
    });
    console.log(`[+] ${center.name}: "faq" en sortOrder ${at} con ${FAQ_ITEMS.length} preguntas`);
  } else {
    console.log(`[=] ${center.name}: "faq" ya existe`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
