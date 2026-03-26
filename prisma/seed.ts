import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run the seed.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const center = await prisma.center.upsert({
    where: { slug: "cuerporaiz" },
    create: { name: "Cuerpo Raíz", slug: "cuerporaiz" },
    update: {},
  });

  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@cuerporaiz.cl";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
  const hash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash: hash,
      name: "Administrator",
    },
    update: {},
  });

  await prisma.userCenterRole.upsert({
    where: {
      userId_centerId: { userId: user.id, centerId: center.id },
    },
    create: {
      userId: user.id,
      centerId: center.id,
      role: "ADMINISTRATOR",
    },
    update: {},
  });

  // Usuario Student fijo para E2E (credenciales estables)
  const studentEmail = process.env.SEED_STUDENT_EMAIL ?? "student@cuerporaiz.cl";
  const studentPassword = process.env.SEED_STUDENT_PASSWORD ?? "student123";
  const studentHash = await bcrypt.hash(studentPassword, 12);
  const student = await prisma.user.upsert({
    where: { email: studentEmail },
    create: {
      email: studentEmail,
      passwordHash: studentHash,
      name: "Student E2E",
    },
    update: {},
  });
  await prisma.userCenterRole.upsert({
    where: {
      userId_centerId: { userId: student.id, centerId: center.id },
    },
    create: {
      userId: student.id,
      centerId: center.id,
      role: "STUDENT",
    },
    update: { role: "STUDENT" },
  });

  // Clases live de ejemplo para reservas (solo si no hay ninguna)
  const existingClass = await prisma.liveClass.findFirst({ where: { centerId: center.id } });
  if (!existingClass) {
    const inTwoDays = new Date();
    inTwoDays.setDate(inTwoDays.getDate() + 2);
    inTwoDays.setHours(10, 0, 0, 0);
    const inThreeDays = new Date();
    inThreeDays.setDate(inThreeDays.getDate() + 3);
    inThreeDays.setHours(18, 0, 0, 0);
    await prisma.liveClass.createMany({
      data: [
        {
          centerId: center.id,
          title: "Vinyasa Flow",
          startsAt: inTwoDays,
          durationMinutes: 60,
          maxCapacity: 10,
        },
        {
          centerId: center.id,
          title: "Yin Yoga",
          startsAt: inThreeDays,
          durationMinutes: 75,
          maxCapacity: 8,
        },
      ],
    });
  }
  // Asegurar al menos 1 clase futura "reservable" (lejos de ventanas de bloqueo).
  const now = new Date();
  // bookBeforeMinutes default = 24h → dejamos margen (48h) para evitar flakiness.
  const minReservable = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const hasFutureReservable = await prisma.liveClass.findFirst({
    where: {
      centerId: center.id,
      startsAt: { gte: minReservable },
    },
  });
  if (!hasFutureReservable) {
    const startsAt = new Date(minReservable);
    await prisma.liveClass.create({
      data: {
        centerId: center.id,
        title: "Clase E2E (futura)",
        startsAt,
        durationMinutes: 60,
        maxCapacity: 10,
      },
    });
    console.log("Clase futura creada para E2E");
  }

  console.log("Seed OK: center", center.slug, "user", user.email, "role ADMINISTRATOR");

  // ─── Site Config ─────────────────────────────────────────────────────────
  await prisma.centerSiteConfig.upsert({
    where: { centerId: center.id },
    create: {
      centerId: center.id,
      heroTitle: "cuerpo,\n*respiración*\ny placer.",
      heroSubtitle: "el camino de regreso a ti.",
      heroImageUrl:
        "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1920&q=80",
      colorPrimary: "#2D3B2A",
      colorSecondary: "#B85C38",
      colorAccent: "#D4A574",
      contactEmail: "contacto@cuerporaiz.cl",
      contactPhone: "+56900000000",
      contactAddress: "Vitacura, Santiago, Chile",
      whatsappUrl:
        "https://wa.me/56900000000?text=Hola%20Trini%2C%20me%20interesa%20conocer%20m%C3%A1s%20sobre%20Cuerpo%20Ra%C3%ADz",
      instagramUrl: "https://instagram.com/cuerporaiz",
      facebookUrl: "https://facebook.com/cuerporaiz",
      youtubeUrl: "https://youtube.com/@cuerporaiz",
    },
    update: {
      heroTitle: "cuerpo,\n*respiración*\ny placer.",
      heroSubtitle: "el camino de regreso a ti.",
      heroImageUrl:
        "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1920&q=80",
      colorPrimary: "#2D3B2A",
      colorSecondary: "#B85C38",
      colorAccent: "#D4A574",
    },
  });
  console.log("CenterSiteConfig creada");

  // ─── Site Sections ───────────────────────────────────────────────────────
  const sectionDefs = [
    { sectionKey: "hero", sortOrder: 0, title: "cuerpo,\n*respiración*\ny placer.", subtitle: "yoga con identidad" },
    { sectionKey: "about", sortOrder: 1, title: "Yoga con identidad", subtitle: null },
    { sectionKey: "how-it-works", sortOrder: 2, title: "Tres formas de sumarte", subtitle: null },
    { sectionKey: "schedule", sortOrder: 3, title: "Reserva tu lugar", subtitle: "Presencial — Vitacura" },
    { sectionKey: "plans", sortOrder: 4, title: "Elige el tuyo", subtitle: "Planes" },
    { sectionKey: "on-demand", sortOrder: 5, title: "Elige cómo practicar", subtitle: "Packs y membresía", visible: false },
    { sectionKey: "disciplines", sortOrder: 6, title: null, subtitle: null, visible: false },
    { sectionKey: "team", sortOrder: 7, title: "Trinidad Cáceres", subtitle: "Sobre Trini" },
    { sectionKey: "testimonials", sortOrder: 8, title: null, subtitle: null },
    { sectionKey: "cta", sortOrder: 9, title: "El camino de regreso a ti.", subtitle: "El camino empieza aquí" },
    { sectionKey: "contact", sortOrder: 10, title: null, subtitle: null, visible: false },
  ] as const;

  const sectionRecords: Record<string, string> = {};
  for (const def of sectionDefs) {
    const section = await prisma.centerSiteSection.upsert({
      where: {
        centerId_sectionKey: { centerId: center.id, sectionKey: def.sectionKey },
      },
      create: {
        centerId: center.id,
        sectionKey: def.sectionKey,
        sortOrder: def.sortOrder,
        title: def.title ?? null,
        subtitle: def.subtitle ?? null,
        visible: "visible" in def ? (def as { visible: boolean }).visible : true,
      },
      update: {
        sortOrder: def.sortOrder,
        title: def.title ?? null,
        subtitle: def.subtitle ?? null,
        visible: "visible" in def ? (def as { visible: boolean }).visible : true,
      },
    });
    sectionRecords[def.sectionKey] = section.id;
  }
  console.log("CenterSiteSections creadas:", Object.keys(sectionRecords).length);

  // ─── Site Section Items ──────────────────────────────────────────────────
  // about: quote + body
  const aboutItems = await prisma.centerSiteSectionItem.findFirst({
    where: { sectionId: sectionRecords["about"] },
  });
  if (!aboutItems) {
    await prisma.centerSiteSectionItem.create({
      data: {
        sectionId: sectionRecords["about"],
        sortOrder: 0,
        title: "hablar de sexualidad también es hablar de cuerpo, emociones y bienestar. este espacio nace para abrir conversaciones más conscientes, desde el respeto, la educación, la conexión y el placer.",
        description:
          "El cuerpo sana cuando se siente seguro. Vinimos a hacerlo en compañía, en comunidad. Aquí encontrarás clases para practicar a tu ritmo, con la misma dedicación que en una clase presencial.",
      },
    });
  }

  // how-it-works: 3 steps
  const howItems = await prisma.centerSiteSectionItem.findFirst({
    where: { sectionId: sectionRecords["how-it-works"] },
  });
  if (!howItems) {
    await prisma.centerSiteSectionItem.createMany({
      data: [
        {
          sectionId: sectionRecords["how-it-works"],
          sortOrder: 0,
          title: "Clases en la sala",
          description:
            "Reserva tu lugar en Vitacura. Clase suelta o packs de 6, 8 o 12 clases. Un espacio de práctica en comunidad, con guía en cada movimiento.",
          linkUrl: "01|Presencial",
        },
        {
          sectionId: sectionRecords["how-it-works"],
          sortOrder: 1,
          title: "Packs de videos",
          description:
            "Clases grabadas para practicar a tu ritmo y desde donde quieras. Acceso por tiempo definido, con la misma dedicación que en presencial.",
          linkUrl: "02|Online",
        },
        {
          sectionId: sectionRecords["how-it-works"],
          sortOrder: 2,
          title: "Contenido mes a mes",
          description:
            "Suscripción mensual con material nuevo cada mes. Prácticas, meditaciones y recursos que se acumulan. Sin perder nada del historial.",
          linkUrl: "03|Membresía",
        },
      ],
    });
  }

  // on-demand: packs + membership items
  const onDemandItems = await prisma.centerSiteSectionItem.findFirst({
    where: { sectionId: sectionRecords["on-demand"] },
  });
  if (!onDemandItems) {
    await prisma.centerSiteSectionItem.createMany({
      data: [
        {
          sectionId: sectionRecords["on-demand"],
          sortOrder: 0,
          title: "Practica a tu ritmo",
          description:
            "Clases grabadas por tipo de práctica — Hatha, Vinyasa, Yin, Somática. Acceso por tiempo definido. La misma dedicación que en una clase presencial.",
          imageUrl:
            "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80",
          linkUrl: "Packs online",
        },
        {
          sectionId: sectionRecords["on-demand"],
          sortOrder: 1,
          title: "Siempre actualizada",
          description:
            "Contenido nuevo cada mes. Prácticas, meditaciones, charlas de sexualidad y bienestar. Acceso a todo el historial mientras estés activa.",
          imageUrl:
            "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80",
          linkUrl: "Membresía",
        },
      ],
    });
  }

  // team: Trinidad Cáceres
  const teamItems = await prisma.centerSiteSectionItem.findFirst({
    where: { sectionId: sectionRecords["team"] },
  });
  if (!teamItems) {
    await prisma.centerSiteSectionItem.create({
      data: {
        sectionId: sectionRecords["team"],
        sortOrder: 0,
        title: "Trinidad Cáceres",
        description: [
          "Profesor de yoga y sexólogo. Combina el movimiento, la respiración y la consciencia corporal con una mirada profunda sobre el placer y la sensualidad.",
          "Sus clases son un espacio para que el cuerpo se reordene, se reconozca y sane en comunidad — porque hay algo que sucede cuando las mujeres se encuentran desde el corazón.",
          "---",
          "Yoga Hatha, Vinyasa, Yin Yoga, Prácticas somáticas, Meditación y respiración, Charlas de sexualidad, Retiros",
        ].join("\n"),
        imageUrl:
          "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80",
        linkUrl: "el cuerpo sana cuando se siente seguro.",
      },
    });
  }

  // testimonials: community quote
  const testimonialItems = await prisma.centerSiteSectionItem.findFirst({
    where: { sectionId: sectionRecords["testimonials"] },
  });
  if (!testimonialItems) {
    await prisma.centerSiteSectionItem.createMany({
      data: [
        {
          sectionId: sectionRecords["testimonials"],
          sortOrder: 0,
          title:
            "Sabemos que no fue solo un retiro, fue un espacio de verdad, de contención, de pura expansión. cuerpos respirando juntos, corazones vibrando en la misma sintonía.",
          description: "Comunidad Cuerpo Raíz",
          linkUrl: "Retiro Rena-ser",
        },
        // Stats (sortOrder 1+ = stat items, title = value, description = label)
        { sectionId: sectionRecords["testimonials"], sortOrder: 1, title: "2022", description: "Inicio de comunidad" },
        { sectionId: sectionRecords["testimonials"], sortOrder: 2, title: "4+", description: "Tipos de práctica" },
        { sectionId: sectionRecords["testimonials"], sortOrder: 3, title: "Online y presencial", description: "Clases a tu ritmo" },
      ],
    });
  }

  console.log("CenterSiteSectionItems creados");

  const existingConfig = await prisma.centerMercadoPagoConfig.findUnique({
    where: { centerId: center.id },
  });
  if (!existingConfig) {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN ?? "TEST-xxx";
    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "whsec-xxx";
    await prisma.centerMercadoPagoConfig.create({
      data: {
        centerId: center.id,
        accessToken,
        webhookSecret,
        enabled: true,
      },
    });
    console.log("MercadoPago config creada (usa MERCADOPAGO_ACCESS_TOKEN y MERCADOPAGO_WEBHOOK_SECRET en .env para producción)");
  }

  const existingPlan = await prisma.plan.findFirst({ where: { centerId: center.id } });
  if (!existingPlan) {
    await prisma.plan.createMany({
      data: [
        {
          centerId: center.id,
          name: "Pack 6 clases",
          slug: "pack-6",
          description: "6 clases presenciales u online, 31 días de vigencia",
          amountCents: 48000,
          currency: "CLP",
          type: "LIVE",
          validityDays: 31,
          maxReservations: 6,
          billingMode: "ONE_TIME",
        },
        {
          centerId: center.id,
          name: "Membresía mensual",
          slug: "membresia-mensual",
          description: "Acceso ilimitado a videoteca on-demand",
          amountCents: 15000,
          currency: "CLP",
          type: "MEMBERSHIP_ON_DEMAND",
          validityPeriod: "MONTHLY",
          billingMode: "RECURRING",
          recurringDiscountPercent: 10,
        },
      ],
    });
    console.log("Planes de ejemplo creados (Live 6 clases, Membresía mensual)");
  }

  // Plan activo usable para student (necesario para reservar clases LIVE)
  const livePlan = await prisma.plan.findFirst({
    where: { centerId: center.id, type: "LIVE" },
    orderBy: { createdAt: "asc" },
  });
  if (livePlan) {
    const existingUserPlan = await prisma.userPlan.findFirst({
      where: { userId: student.id, centerId: center.id, planId: livePlan.id, status: "ACTIVE" },
    });
    if (!existingUserPlan) {
      const validFrom = new Date();
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 31);
      await prisma.userPlan.create({
        data: {
          userId: student.id,
          centerId: center.id,
          planId: livePlan.id,
          orderId: null,
          status: "ACTIVE",
          paymentStatus: "PAID",
          classesTotal: livePlan.maxReservations ?? 6,
          classesUsed: 0,
          validFrom,
          validUntil,
        },
      });
      console.log("UserPlan ACTIVE creado para student e2e:", student.email);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
