import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_DATABASE_URL or DATABASE_URL is required to run the seed.");
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

  // Usuario Instructor fijo para E2E
  const instructorEmail = process.env.SEED_INSTRUCTOR_EMAIL ?? "instructor@cuerporaiz.cl";
  const instructorPassword = process.env.SEED_INSTRUCTOR_PASSWORD ?? "instructor123";
  const instructorHash = await bcrypt.hash(instructorPassword, 12);
  const instructor = await prisma.user.upsert({
    where: { email: instructorEmail },
    create: {
      email: instructorEmail,
      passwordHash: instructorHash,
      name: "Instructor E2E",
    },
    update: {},
  });
  await prisma.userCenterRole.upsert({
    where: {
      userId_centerId: { userId: instructor.id, centerId: center.id },
    },
    create: {
      userId: instructor.id,
      centerId: center.id,
      role: "INSTRUCTOR",
    },
    update: { role: "INSTRUCTOR" },
  });
  console.log("Seed OK: instructor", instructor.email, "role INSTRUCTOR");

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
          instructorId: instructor.id,
        },
        {
          centerId: center.id,
          title: "Yin Yoga",
          startsAt: inThreeDays,
          durationMinutes: 75,
          maxCapacity: 8,
          instructorId: instructor.id,
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
        instructorId: instructor.id,
      },
    });
    console.log("Clase futura creada para E2E");
  }

  // Limpiar intentos de login para que E2E no sea bloqueado por rate limiting
  await prisma.loginAttempt.deleteMany({});

  console.log("Seed OK: center", center.slug, "user", user.email, "role ADMINISTRATOR");

  // ─── Site Config ─────────────────────────────────────────────────────────
  await prisma.centerSiteConfig.upsert({
    where: { centerId: center.id },
    create: {
      centerId: center.id,
      heroEyebrow: "yoga con identidad",
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
      heroEyebrow: "yoga con identidad",
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
    { sectionKey: "on-demand", sortOrder: 5, title: "Practica a tu ritmo, donde quieras", subtitle: "Biblioteca virtual", visible: false },
    { sectionKey: "events", sortOrder: 6, title: "Para vernos en persona", subtitle: "Próximos eventos", visible: true },
    { sectionKey: "disciplines", sortOrder: 7, title: null, subtitle: null, visible: false },
    { sectionKey: "team", sortOrder: 8, title: "Trinidad Cáceres", subtitle: "Sobre Trini" },
    { sectionKey: "testimonials", sortOrder: 9, title: null, subtitle: null },
    { sectionKey: "cta", sortOrder: 10, title: "El camino de regreso a ti.", subtitle: "El camino empieza aquí" },
    { sectionKey: "contact", sortOrder: 11, title: null, subtitle: null, visible: false },
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

  // testimonials: quote + 3 stats — delete and recreate to ensure correct data
  await prisma.centerSiteSectionItem.deleteMany({
    where: { sectionId: sectionRecords["testimonials"] },
  });
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
      { sectionId: sectionRecords["testimonials"], sortOrder: 1, title: "2022", description: "Inicio de comunidad" },
      { sectionId: sectionRecords["testimonials"], sortOrder: 2, title: "4+", description: "Tipos de práctica" },
      { sectionId: sectionRecords["testimonials"], sortOrder: 3, title: "Online y presencial", description: "Clases a tu ritmo" },
    ],
  });

  // cta: body text
  const ctaItems = await prisma.centerSiteSectionItem.findFirst({
    where: { sectionId: sectionRecords["cta"] },
  });
  if (!ctaItems) {
    await prisma.centerSiteSectionItem.create({
      data: {
        sectionId: sectionRecords["cta"],
        sortOrder: 0,
        title: "Elige el formato que se adapte a tu ritmo. Comienza cuando quieras, desde donde estés.",
      },
    });
  }

  console.log("CenterSiteSectionItems creados");

  // ─── Página "Sobre Trini" + galería ───────────────────────────────────────
  const aboutPage = await prisma.centerAboutPage.upsert({
    where: { centerId: center.id },
    create: {
      centerId: center.id,
      visible: true,
      showInHeader: true,
      headerLabel: "Sobre Trini",
      pageTitle: "Sobre Trinidad",
      pageEyebrow: "Sobre mí",
      name: "Trinidad",
      tagline:
        "Un espacio donde el movimiento y la pausa conviven. Una práctica para volver al cuerpo, aquietar la mente y reconocer lo que ya estaba ahí.",
      heroImageUrl:
        "https://images.unsplash.com/photo-1545389336-cf090694435e?w=900&q=80&auto=format&fit=crop",
      bio: [
        "Practico yoga desde hace más de quince años y enseño desde hace ocho. Lo que empezó como una manera de habitar mi propio cuerpo se fue transformando, con el tiempo, en un oficio que me eligió tanto como yo lo elegí a él.",
        "",
        "Me formé en Hatha y Vinyasa, estudié anatomía aplicada al movimiento, y desde entonces no he dejado de aprender. La práctica sigue enseñándome que enseñar, también, es escuchar.",
        "",
        "Hoy guío clases en Vitacura, retiros varias veces al año y sesiones online para quienes no pueden estar acá en persona. Mi propuesta está en el cruce entre rigor y suavidad: alineación precisa, respiración consciente, y mucho espacio para lo que cada cuerpo necesita ese día.",
      ].join("\n"),
      propuesta: [
        "Creo en una práctica sostenible. Una que pueda acompañar a lo largo de los años, sin forzar el cuerpo ni apurar el proceso. Una práctica que se ajusta a quien la hace, no al revés.",
        "",
        "En cada clase trabajamos tres capas: el cuerpo (alineación, fuerza, flexibilidad), la respiración (ritmo y foco), y la atención (volver, una y otra vez, a este momento).",
        "",
        "Movimiento con raíz. Pausa con sentido.",
      ].join("\n"),
      ctaLabel: "Agenda tu primera clase",
      ctaHref: "/#agenda",
    },
    update: {},
  });

  const existingImages = await prisma.centerAboutPageImage.findFirst({
    where: { pageId: aboutPage.id },
  });
  if (!existingImages) {
    const captionsByCategory = {
      RETIROS: [
        { url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773", caption: "Retiro de invierno · Cajón del Maipo" },
        { url: "https://images.unsplash.com/photo-1528319725582-ddc096101511", caption: "Silencio compartido" },
        { url: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8", caption: "Sesión al aire libre" },
        { url: "https://images.unsplash.com/photo-1478144592103-25e218a04891", caption: "Retiro de primavera · Matanzas" },
      ],
      CLASES: [
        { url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b", caption: "Clase matinal" },
        { url: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b", caption: "Trabajo de inversiones" },
        { url: "https://images.unsplash.com/photo-1599447421416-3414500d18a5", caption: "Vinyasa flow" },
        { url: "https://images.unsplash.com/photo-1545205597-3d9d02c29597", caption: "Guía en la respiración" },
      ],
      ESPACIO: [
        { url: "https://images.unsplash.com/photo-1540206395-68808572332f", caption: "La sala principal" },
        { url: "https://images.unsplash.com/photo-1593810450967-f9c42742e326", caption: "Props y mats" },
        { url: "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0", caption: "Rincón para la pausa" },
      ],
    } as const;

    const imagesData: Array<{
      pageId: string;
      imageUrl: string;
      caption: string;
      category: "RETIROS" | "CLASES" | "ESPACIO";
      sortOrder: number;
    }> = [];
    for (const [category, items] of Object.entries(captionsByCategory)) {
      items.forEach((item, i) => {
        imagesData.push({
          pageId: aboutPage.id,
          imageUrl: `${item.url}?w=900&q=80&auto=format&fit=crop`,
          caption: item.caption,
          category: category as "RETIROS" | "CLASES" | "ESPACIO",
          sortOrder: i,
        });
      });
    }

    await prisma.centerAboutPageImage.createMany({ data: imagesData });
    console.log(`CenterAboutPageImage creadas (${imagesData.length})`);
  }

  console.log("CenterAboutPage seedeada");

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

  // ─── On Demand seed content ────────────────────────────────────────────────
  const existingOnDemandCategory = await prisma.onDemandCategory.findFirst({
    where: { centerId: center.id },
  });
  if (!existingOnDemandCategory) {
    const catYoga = await prisma.onDemandCategory.create({
      data: { centerId: center.id, name: "Yoga", description: "Clases grabadas de diferentes estilos de yoga", sortOrder: 0, status: "PUBLISHED" },
    });
    const catMeditacion = await prisma.onDemandCategory.create({
      data: { centerId: center.id, name: "Meditación", description: "Prácticas de meditación y mindfulness", sortOrder: 1, status: "PUBLISHED" },
    });

    const pracHatha = await prisma.onDemandPractice.create({ data: { categoryId: catYoga.id, name: "Hatha Yoga", sortOrder: 0, status: "PUBLISHED" } });
    const pracVinyasa = await prisma.onDemandPractice.create({ data: { categoryId: catYoga.id, name: "Vinyasa Flow", sortOrder: 1, status: "PUBLISHED" } });
    const pracRestaurativo = await prisma.onDemandPractice.create({ data: { categoryId: catYoga.id, name: "Yoga Restaurativo", sortOrder: 2, status: "PUBLISHED" } });
    const pracMindfulness = await prisma.onDemandPractice.create({ data: { categoryId: catMeditacion.id, name: "Mindfulness", sortOrder: 0, status: "PUBLISHED" } });
    const pracGuiada = await prisma.onDemandPractice.create({ data: { categoryId: catMeditacion.id, name: "Meditación Guiada", sortOrder: 1, status: "PUBLISHED" } });

    const lessons = [
      { practiceId: pracHatha.id, title: "Hatha para principiantes", durationMinutes: 30, level: "Principiante", intensity: "Suave", equipment: "Mat" },
      { practiceId: pracHatha.id, title: "Hatha intermedio — Fuerza", durationMinutes: 45, level: "Intermedio", intensity: "Moderada", equipment: "Mat, bloque" },
      { practiceId: pracHatha.id, title: "Hatha avanzado — Inversiones", durationMinutes: 60, level: "Avanzado", intensity: "Intensa", equipment: "Mat, cinta, bloque" },
      { practiceId: pracVinyasa.id, title: "Vinyasa matinal energizante", durationMinutes: 40, level: "Intermedio", intensity: "Moderada", equipment: "Mat" },
      { practiceId: pracVinyasa.id, title: "Vinyasa suave para la noche", durationMinutes: 35, level: "Principiante", intensity: "Suave", equipment: "Mat" },
      { practiceId: pracRestaurativo.id, title: "Restaurativo para estrés", durationMinutes: 50, level: "Principiante", intensity: "Suave", equipment: "Mat, bolster, manta" },
      { practiceId: pracRestaurativo.id, title: "Restaurativo para espalda", durationMinutes: 40, level: "Principiante", intensity: "Suave", equipment: "Mat, bloque, cinta" },
      { practiceId: pracMindfulness.id, title: "Mindfulness — Respiración consciente", durationMinutes: 15, level: "Principiante", intensity: "Suave" },
      { practiceId: pracMindfulness.id, title: "Body scan guiado", durationMinutes: 20, level: "Principiante", intensity: "Suave" },
      { practiceId: pracGuiada.id, title: "Meditación para dormir", durationMinutes: 25, level: "Principiante", intensity: "Suave" },
      { practiceId: pracGuiada.id, title: "Visualización creativa", durationMinutes: 20, level: "Intermedio", intensity: "Suave" },
    ];

    for (let i = 0; i < lessons.length; i++) {
      await prisma.onDemandLesson.create({
        data: { ...lessons[i], videoUrl: `https://player.vimeo.com/video/${900000000 + i}`, sortOrder: i % 3, status: "PUBLISHED" },
      });
    }

    console.log("Contenido on demand creado (2 categorías, 5 prácticas, 11 lecciones)");
  }

  // ON_DEMAND plan + quotas (independiente de las categorías)
  const allOdCategories = await prisma.onDemandCategory.findMany({ where: { centerId: center.id } });
  let odPlan = await prisma.plan.findFirst({ where: { centerId: center.id, type: "ON_DEMAND" } });
  if (!odPlan && allOdCategories.length > 0) {
    odPlan = await prisma.plan.create({
      data: { centerId: center.id, name: "Pack On Demand 6", slug: "on-demand-6", description: "6 clases on demand a desbloquear", amountCents: 12000, currency: "CLP", type: "ON_DEMAND", validityDays: 31, billingMode: "ONE_TIME" },
    });
    console.log("Plan ON_DEMAND creado:", odPlan.name);
  }

  // Ensure quotas exist for every ON_DEMAND plan + category
  if (odPlan && allOdCategories.length > 0) {
    const existingQuotas = await prisma.planCategoryQuota.findMany({ where: { planId: odPlan.id } });
    if (existingQuotas.length === 0) {
      const defaultQuotas: Record<string, number> = { "Yoga": 4, "Meditación": 2 };
      await prisma.planCategoryQuota.createMany({
        data: allOdCategories.map((cat) => ({
          planId: odPlan!.id,
          categoryId: cat.id,
          maxLessons: defaultQuotas[cat.name] ?? 2,
        })),
      });
      console.log("Quotas ON_DEMAND creadas para", allOdCategories.length, "categorías");
    }
  }

  // Activate ON_DEMAND plan for student
  if (odPlan) {
    const existingUp = await prisma.userPlan.findFirst({ where: { userId: student.id, centerId: center.id, planId: odPlan.id, status: "ACTIVE" } });
    if (!existingUp) {
      const validFrom = new Date();
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 31);
      await prisma.userPlan.create({
        data: { userId: student.id, centerId: center.id, planId: odPlan.id, status: "ACTIVE", paymentStatus: "PAID", classesTotal: null, classesUsed: 0, validFrom, validUntil },
      });
      console.log("UserPlan ON_DEMAND ACTIVE creado para student e2e");
    }
  }
  // ─── Evento de ejemplo ─────────────────────────────────────────────────────
  const existingEvent = await prisma.event.findFirst({ where: { centerId: center.id } });
  if (!existingEvent) {
    const eventStart = new Date();
    eventStart.setDate(eventStart.getDate() + 7);
    eventStart.setHours(10, 0, 0, 0);
    const eventEnd = new Date(eventStart);
    eventEnd.setDate(eventEnd.getDate() + 1);
    eventEnd.setHours(18, 0, 0, 0);

    await prisma.event.create({
      data: {
        centerId: center.id,
        title: "Retiro Rena-ser",
        description: "Un fin de semana de reconexión con el cuerpo y la naturaleza. Yoga, meditación, charlas y más.",
        location: "Cajón del Maipo, Santiago",
        startsAt: eventStart,
        endsAt: eventEnd,
        amountCents: 120000,
        currency: "CLP",
        maxCapacity: 20,
        status: "PUBLISHED",
        color: "#B85C38",
      },
    });
    console.log("Evento de ejemplo creado: Retiro Rena-ser");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
