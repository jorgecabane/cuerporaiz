/**
 * Seed del centro DEMO ("Estudio Marea", slug "demo") para grabar videos de venta.
 *
 * Seguridad: sólo crea/borra filas del Center slug "demo" y Users con email
 * "@demo.invalid". Aborta si el centro "demo" existe con usuarios ajenos.
 * Idempotente: si el centro es nuestro, lo borra y lo recrea.
 *
 * Uso: npm run db:seed-demo   (usa la DB del .env: el centro demo queda aislado por slug)
 * Para ver el sitio público / login: NEXT_PUBLIC_DEFAULT_CENTER_SLUG=demo npm run dev
 * Para grabar videos usa un build de producción (el dev server recompila y mete esperas):
 *   NEXT_PUBLIC_DEFAULT_CENTER_SLUG=demo npm run build && NEXT_PUBLIC_DEFAULT_CENTER_SLUG=demo npx next start -p 3001
 * Login: admin@demo.invalid / alumno@demo.invalid (clave demo1234). Los emails @demo.invalid
 * tienen todas las preferencias de correo apagadas, así que los crons no les envían nada.
 */
import "dotenv/config";
import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { generateSeriesInstances } from "@/lib/application/generate-series-instances";
import {
  civilDateTimeInTzToUtc,
  civilYearMonthDayInTz,
  civilDayOfWeekInTz,
} from "@/lib/datetime/civil-day";

const connectionString = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DIRECT_DATABASE_URL or DATABASE_URL is required.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const SLUG = "demo";
const EMAIL_DOMAIN = "@demo.invalid";
const PASSWORD = "demo1234";
const TZ = "America/Santiago";
const DAY = 86_400_000;
const NOW = new Date();
const VIDEO_URL = "https://vimeo.com/76979871";
const img = (id: string, w = 1600) => `https://images.unsplash.com/${id}?w=${w}&q=80`;

const IMG = {
  heroClass: "photo-1588286840104-8957b019727f",
  beachGroup: "photo-1545205597-3d9d02c29597",
  mountains: "photo-1706046718261-7167727d165c", // Cajón del Maipo (Willian Justen de Vasconcellos, Unsplash)
  meditateDeck: "photo-1506126613408-eca07ce68773",
  meditateDeck2: "photo-1600618528240-fb9fc964b853",
  lakeDock: "photo-1508672019048-805c876b67e2",
  studioSeated: "photo-1510894347713-fc3ed6fdf539",
  homeYoga: "photo-1575052814086-f385e2e2ad1b",
  pilatesGroup: "photo-1518611012118-696072aa579a",
  downDog: "photo-1599901860904-17e6ed7083a0",
  crow: "photo-1599447421416-3414500d18a5",
  stretchFloor: "photo-1593810450967-f9c42742e326",
  seatedMat: "photo-1552196563-55cd4e45efb3",
  sunsetPose: "photo-1544367567-0f2fcb009e0b",
  sunsetLake: "photo-1573590330099-d6c7355ec595",
  sunsetHill: "photo-1524863479829-916d8e77f114",
  meadow: "photo-1470252649378-9c29740c9fa8",
  silhouette: "photo-1447452001602-7090c7ab2db3",
  props: "photo-1591291621164-2c6367723315",
  archway: "photo-1603988363607-e1e4a66962c6",
  portraitCatalina: "photo-1494790108377-be9c29b29330",
  portraitMatias: "photo-1507003211169-0a1dd7228f2d",
  portraitValentina: "photo-1438761681033-6461ffad8d80",
};

// ─── PRNG determinístico (misma data en cada corrida) ──────────────────────
let seed = 20261019;
function rand() {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Fechas civiles en TZ del centro ───────────────────────────────────────
type Ymd = { year: number; month: number; day: number };
const TODAY = civilYearMonthDayInTz(NOW, TZ);
function addDays(d: Ymd, n: number): Ymd {
  const dt = new Date(Date.UTC(d.year, d.month - 1, d.day + n));
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
}
const at = (d: Ymd, h: number, m = 0) => civilDateTimeInTzToUtc(d.year, d.month, d.day, h, m, TZ);
const dow = (d: Ymd) => civilDayOfWeekInTz(at(d, 12), TZ);
const ymdKey = (d: Ymd) =>
  `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
function nextDow(from: Ymd, target: number): Ymd {
  let d = from;
  while (dow(d) !== target) d = addDays(d, 1);
  return d;
}

// ─── Reset seguro ──────────────────────────────────────────────────────────
async function resetDemo() {
  const center = await prisma.center.findUnique({ where: { slug: SLUG } });
  const demoUsers = await prisma.user.findMany({
    where: { email: { endsWith: EMAIL_DOMAIN } },
    select: { id: true },
  });
  const demoUserIds = demoUsers.map((u) => u.id);

  if (center) {
    const foreign = await prisma.userCenterRole.count({
      where: { centerId: center.id, user: { email: { not: { endsWith: EMAIL_DOMAIN } } } },
    });
    if (foreign > 0) {
      throw new Error(`Center "${SLUG}" exists with ${foreign} non-demo member(s). Aborting.`);
    }
  }
  if (demoUserIds.length > 0) {
    const elsewhere = await prisma.userCenterRole.count({
      where: { userId: { in: demoUserIds }, ...(center ? { centerId: { not: center.id } } : {}) },
    });
    if (elsewhere > 0) {
      throw new Error(`${elsewhere} demo user membership(s) outside "${SLUG}". Aborting.`);
    }
  }

  await prisma.$transaction(async (tx) => {
    if (center) {
      const centerId = center.id;
      // Plan tiene onDelete: Restrict desde UserPlan/Order/Subscription: borrar esos primero.
      await tx.lessonUnlock.deleteMany({ where: { centerId } });
      await tx.manualPayment.deleteMany({ where: { centerId } });
      await tx.waitlistEntry.deleteMany({ where: { centerId } });
      await tx.reservation.deleteMany({ where: { liveClass: { centerId } } });
      await tx.userPlan.deleteMany({ where: { centerId } });
      await tx.order.deleteMany({ where: { centerId } });
      await tx.subscription.deleteMany({ where: { centerId } });
      // Sin FK a Center: limpiar a mano.
      await tx.loginAttempt.deleteMany({ where: { centerId } });
      await tx.blogPostNotification.deleteMany({ where: { centerId } });
      await tx.center.delete({ where: { id: centerId } }); // cascade al resto
    }
    if (demoUserIds.length > 0) {
      await tx.user.deleteMany({ where: { id: { in: demoUserIds } } });
    }
  }, { timeout: 60_000 });
  console.log(center ? "Previous demo center removed." : "No previous demo center.");
}

// ─── Datos ─────────────────────────────────────────────────────────────────
const FIRST = [
  "Camila", "Benjamín", "Antonia", "Vicente", "Isidora", "Tomás", "Fernanda", "Joaquín",
  "Martina", "Cristóbal", "Florencia", "Agustín", "Josefa", "Diego", "Catalina", "Sebastián",
  "Constanza", "Nicolás", "Trinidad", "Felipe", "Paula", "Ignacio", "Daniela", "Rodrigo",
  "Macarena", "Gonzalo", "Javiera", "Francisco", "Valeria", "Andrés", "Emilia", "Pablo",
  "Amanda", "Maximiliano", "Rocío", "Claudio", "Bárbara", "Esteban", "Carla", "Héctor",
  "Gabriela", "Lucas", "Pía", "Matías", "Consuelo", "Ricardo", "Ignacia", "Álvaro",
  "Magdalena", "Patricio",
];
const LAST = [
  "González", "Muñoz", "Rojas", "Díaz", "Pérez", "Soto", "Contreras", "Silva", "Martínez",
  "Sepúlveda", "Morales", "Rodríguez", "López", "Fuentes", "Hernández", "Torres", "Araya",
  "Flores", "Espinoza", "Valenzuela", "Castillo", "Tapia", "Reyes", "Gutiérrez", "Castro",
  "Pizarro", "Álvarez", "Vásquez", "Sánchez", "Fernández", "Ramírez", "Carrasco", "Gómez",
  "Cortés", "Herrera", "Núñez", "Jara", "Vergara", "Rivera", "Figueroa", "Riquelme", "Bravo",
  "Miranda", "Vera", "Molina", "Vega", "Campos", "Sandoval", "Orellana", "Cárdenas",
];
const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");

const DISCIPLINES = [
  { key: "vinyasa", name: "Vinyasa", color: "#B5654A" },
  { key: "hatha", name: "Hatha", color: "#6B8F71" },
  { key: "yin", name: "Yin", color: "#7A6A9B" },
  { key: "pilates", name: "Pilates Mat", color: "#C9915B" },
  { key: "meditacion", name: "Meditación", color: "#4F7A8C" },
] as const;
type DiscKey = (typeof DISCIPLINES)[number]["key"];

type InstructorKey = "catalina" | "matias" | "valentina";
const SERIES: {
  title: string; disc: DiscKey; inst: InstructorKey; days: number[]; h: number; m: number;
  dur: number; cap: number; online?: boolean; trial?: boolean;
}[] = [
  { title: "Vinyasa Flow", disc: "vinyasa", inst: "catalina", days: [1, 3, 5], h: 7, m: 30, dur: 60, cap: 14 },
  { title: "Pilates Mat", disc: "pilates", inst: "valentina", days: [2, 4], h: 8, m: 0, dur: 55, cap: 10 },
  { title: "Hatha Yoga", disc: "hatha", inst: "matias", days: [2, 4], h: 10, m: 0, dur: 75, cap: 12, trial: true },
  { title: "Yoga Online al Mediodía", disc: "vinyasa", inst: "catalina", days: [1, 3], h: 13, m: 0, dur: 45, cap: 15, online: true },
  { title: "Pilates Mat", disc: "pilates", inst: "valentina", days: [1, 3], h: 19, m: 0, dur: 55, cap: 10 },
  { title: "Yin Yoga", disc: "yin", inst: "catalina", days: [2, 4], h: 19, m: 30, dur: 75, cap: 12 },
  { title: "Vinyasa al Atardecer", disc: "vinyasa", inst: "matias", days: [5], h: 18, m: 30, dur: 60, cap: 14 },
  { title: "Meditación Guiada Online", disc: "meditacion", inst: "matias", days: [3], h: 20, m: 15, dur: 30, cap: 15, online: true },
  { title: "Hatha Suave", disc: "hatha", inst: "catalina", days: [6], h: 10, m: 0, dur: 75, cap: 14, trial: true },
  { title: "Pilates Mat", disc: "pilates", inst: "valentina", days: [6], h: 11, m: 45, dur: 55, cap: 10 },
];

const PLANS = [
  { key: "suelta", name: "Clase suelta", slug: "clase-suelta", amount: 9000, max: 1, days: 30, desc: "Ideal para conocernos o venir cuando puedas.", sort: 0 },
  { key: "pack4", name: "Pack 4 clases", slug: "pack-4-clases", amount: 32000, max: 4, days: 30, desc: "Una clase a la semana durante un mes.", sort: 1 },
  { key: "pack8", name: "Pack 8 clases", slug: "pack-8-clases", amount: 56000, max: 8, days: 30, desc: "Dos clases a la semana: el ritmo que más recomendamos.", sort: 2, popular: true },
  { key: "mensual", name: "Mensual ilimitado", slug: "mensual-ilimitado", amount: 69000, max: null, days: null, desc: "Todas las clases presenciales y online que quieras durante el mes.", sort: 3 },
] as const;
type PlanKey = (typeof PLANS)[number]["key"] | "biblioteca";

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  await resetDemo();
  const hash = await bcrypt.hash(PASSWORD, 12);

  const center = await prisma.center.create({
    data: {
      name: "Estudio Marea",
      slug: SLUG,
      timezone: TZ,
      cancelBeforeMinutes: 360,
      bookBeforeMinutes: 60,
      maxNoShowsPerMonth: 3,
      notifyWhenSlotFreed: true,
      instructorCanReserveForStudent: true,
      allowTrialClassPerPerson: true,
      calendarStartHour: 7,
      calendarEndHour: 21,
      calendarWeekStartDay: 1,
      defaultClassDurationMinutes: 60,
      bankTransferEnabled: true,
      bankName: "Banco Ficticio de Chile",
      bankAccountType: "Cuenta corriente",
      bankAccountNumber: "00-000-00000-0",
      bankAccountHolder: "Estudio Marea SpA (demo)",
      bankAccountRut: "11.111.111-1",
      bankAccountEmail: `pagos${EMAIL_DOMAIN}`,
      bankTransferAcceptPlans: true,
      bankTransferAcceptEvents: true,
      bankTransferRequireReceipt: true,
      welcomeEmailCustomBody: "",
    },
  });
  const centerId = center.id;

  // Zoom "conectado" sólo para que la UI muestre la opción online. Token falso:
  // nunca se crea una clase online desde la demo, así que no se llama a Zoom.
  await prisma.centerZoomConfig.create({
    data: { centerId, accessToken: "demo-fake-token", enabled: true },
  });

  // Usuarios
  type U = { email: string; name: string; lastName: string; imageUrl?: string; createdAt: Date };
  const staff: Record<"admin" | InstructorKey | "alumno", U> = {
    admin: { email: `admin${EMAIL_DOMAIN}`, name: "Fernanda", lastName: "Silva", createdAt: new Date(NOW.getTime() - 400 * DAY) },
    catalina: { email: `catalina${EMAIL_DOMAIN}`, name: "Catalina", lastName: "Rojas", imageUrl: img(IMG.portraitCatalina, 800), createdAt: new Date(NOW.getTime() - 390 * DAY) },
    matias: { email: `matias${EMAIL_DOMAIN}`, name: "Matías", lastName: "Herrera", imageUrl: img(IMG.portraitMatias, 800), createdAt: new Date(NOW.getTime() - 300 * DAY) },
    valentina: { email: `valentina${EMAIL_DOMAIN}`, name: "Valentina", lastName: "Soto", imageUrl: img(IMG.portraitValentina, 800), createdAt: new Date(NOW.getTime() - 250 * DAY) },
    alumno: { email: `alumno${EMAIL_DOMAIN}`, name: "Sofía", lastName: "Muñoz", createdAt: new Date(NOW.getTime() - 120 * DAY) },
  };
  const STUDENT_COUNT = 70;
  const students: U[] = Array.from({ length: STUDENT_COUNT }, (_, i) => {
    const first = FIRST[i % FIRST.length];
    const last = LAST[(i * 7 + 3 + (i >= FIRST.length ? 11 : 0)) % LAST.length];
    return {
      email: `${slugify(first)}.${slugify(last)}${EMAIL_DOMAIN}`,
      name: first,
      lastName: last,
      createdAt: new Date(NOW.getTime() - (20 + Math.floor(rand() * 340)) * DAY),
    };
  });
  const allUsers = [...Object.values(staff), ...students];
  const created = await prisma.user.createManyAndReturn({
    data: allUsers.map((u, i) => ({
      email: u.email,
      passwordHash: hash,
      name: u.name,
      lastName: u.lastName,
      imageUrl: u.imageUrl ?? null,
      phone: `+56 9 0000 ${String(1000 + i).slice(-4)}`,
      emailVerifiedAt: u.createdAt,
      createdAt: u.createdAt,
    })),
  });
  const idByEmail = new Map(created.map((u) => [u.email, u.id]));
  const uid = (u: U) => idByEmail.get(u.email)!;
  const instructorId: Record<InstructorKey, string> = {
    catalina: uid(staff.catalina), matias: uid(staff.matias), valentina: uid(staff.valentina),
  };
  const alumnoId = uid(staff.alumno);
  const studentIds = students.map(uid);

  await prisma.userCenterRole.createMany({
    data: [
      { userId: uid(staff.admin), centerId, role: "ADMINISTRATOR" },
      ...(["catalina", "matias", "valentina"] as const).map((k) => ({ userId: instructorId[k], centerId, role: "INSTRUCTOR" as const })),
      ...[alumnoId, ...studentIds].map((userId) => ({ userId, centerId, role: "STUDENT" as const })),
    ],
  });
  // Todas las preferencias en false: los crons de producción no envían correos a la demo.
  await prisma.emailPreference.createMany({
    data: created.map((u) => ({
      userId: u.id, centerId,
      classReminder: false, spotFreed: false, planExpiring: false, reservationConfirm: false,
      purchaseConfirm: false, lessonUnlocked: false, quotaExhausted: false, newContent: false,
      blogPublished: false,
    })),
  });

  // Disciplinas
  const discs = await prisma.discipline.createManyAndReturn({
    data: DISCIPLINES.map((d) => ({ centerId, name: d.name, color: d.color })),
  });
  const discId = (k: DiscKey) => discs.find((d) => d.name === DISCIPLINES.find((x) => x.key === k)!.name)!.id;

  // Feriados (reales de Chile en la ventana)
  const holidays = [
    { ymd: { year: 2026, month: 10, day: 12 }, label: "Encuentro de Dos Mundos" },
    { ymd: { year: 2026, month: 10, day: 31 }, label: "Día de las Iglesias Evangélicas" },
    { ymd: { year: 2026, month: 11, day: 1 }, label: "Día de Todos los Santos" },
  ];
  await prisma.centerHoliday.createMany({
    data: holidays.map((h) => ({ centerId, date: new Date(Date.UTC(h.ymd.year, h.ymd.month - 1, h.ymd.day)), label: h.label })),
  });
  const holidaySet = new Set(holidays.map((h) => ymdKey(h.ymd)));

  // Series + instancias (usa el generador de la app)
  const windowStart = addDays(TODAY, -21);
  const windowEnd = addDays(TODAY, 22);
  type ClassRow = { id: string; startsAt: Date; maxCapacity: number; disciplineId: string | null };
  const classes: ClassRow[] = [];
  for (const s of SERIES) {
    let first = windowStart;
    while (!s.days.includes(dow(first)) || holidaySet.has(ymdKey(first))) first = addDays(first, 1);
    const series = await prisma.liveClassSeries.create({
      data: {
        centerId, title: s.title, disciplineId: discId(s.disc), instructorId: instructorId[s.inst],
        maxCapacity: s.cap, durationMinutes: s.dur, isOnline: !!s.online,
        meetingUrl: s.online ? "https://zoom.us/j/00000000000" : null,
        acceptsTrialReservations: !!s.trial, trialCapacity: s.trial ? 2 : null,
        repeatFrequency: "WEEKLY", repeatOnDaysOfWeek: s.days, repeatEveryN: 1,
        startsAt: at(first, s.h, s.m), endsAt: at(windowEnd, 23, 59),
      },
    });
    const inputs = generateSeriesInstances(series, holidaySet, TZ);
    const rows = await prisma.liveClass.createManyAndReturn({
      data: inputs.map((i) => ({ ...i, centerId, status: "ACTIVE" })),
      select: { id: true, startsAt: true, maxCapacity: true, disciplineId: true },
    });
    classes.push(...rows);
  }
  classes.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  // Planes
  const planRows = await prisma.plan.createManyAndReturn({
    data: [
      ...PLANS.map((p) => ({
        centerId, name: p.name, slug: p.slug, description: p.desc, amountCents: p.amount,
        type: "LIVE" as const, maxReservations: p.max, validityDays: p.days,
        validityPeriod: p.days ? null : ("MONTHLY" as const), billingMode: "ONE_TIME" as const,
        sortOrder: p.sort, isPopular: "popular" in p,
      })),
      {
        centerId, name: "Biblioteca online", slug: "biblioteca-online",
        description: "Acceso ilimitado a todas las clases grabadas por un mes.",
        amountCents: 15000, type: "MEMBERSHIP_ON_DEMAND" as const, validityPeriod: "MONTHLY" as const,
        billingMode: "ONE_TIME" as const, sortOrder: 4,
      },
    ],
  });
  const planBySlugKey = (k: PlanKey) =>
    planRows.find((p) => p.slug === (k === "biblioteca" ? "biblioteca-online" : PLANS.find((x) => x.key === k)!.slug))!;

  // UserPlans + pagos
  type UP = { id: string; userId: string; from: Date; until: Date; total: number | null; used: number; live: boolean };
  const userPlans: UP[] = [];
  let refN = 0;
  async function grantPlan(userId: string, key: PlanKey, from: Date, opts: { payment?: "order" | "manual" } = {}) {
    const plan = planBySlugKey(key);
    const until = new Date(from.getTime() + 30 * DAY);
    const expired = until < NOW;
    const payment = opts.payment ?? (rand() < 0.6 ? "order" : "manual");
    let orderId: string | null = null;
    if (payment === "order") {
      const method = rand() < 0.7 ? "MERCADOPAGO" : "TRANSFER";
      const order = await prisma.order.create({
        data: {
          centerId, userId, planId: plan.id, amountCents: plan.amountCents, status: "APPROVED",
          paymentMethod: method, externalReference: `MP-${104800 + ++refN}`,
          transferClaimedAt: method === "TRANSFER" ? from : null, createdAt: from,
        },
      });
      orderId = order.id;
    }
    const up = await prisma.userPlan.create({
      data: {
        userId, planId: plan.id, centerId, orderId, status: expired ? "EXPIRED" : "ACTIVE",
        paymentStatus: "PAID", classesTotal: plan.maxReservations, validFrom: from, validUntil: until,
        createdAt: from,
      },
    });
    if (payment === "manual") {
      const method = rand() < 0.5 ? "cash" : "transfer";
      await prisma.manualPayment.create({
        data: {
          centerId, userId, userPlanId: up.id, amountCents: plan.amountCents, method,
          note: `${plan.name} — ${method === "cash" ? "efectivo en recepción" : "transferencia"}`, paidAt: from, createdAt: from,
        },
      });
    }
    userPlans.push({ id: up.id, userId, from, until, total: plan.maxReservations, used: 0, live: plan.type === "LIVE" });
    return up;
  }

  const TYPE_BY_MOD: PlanKey[] = ["mensual", "mensual", "pack8", "mensual", "mensual", "pack8", "mensual", "pack4", "mensual", "suelta"];
  for (const [i, userId] of studentIds.entries()) {
    const key = TYPE_BY_MOD[i % 10];
    const offset = ((i * 7) % 29) + 1; // días desde la renovación (1..29)
    const renewal = new Date(NOW.getTime() - offset * DAY);
    const churned = i % 8 === 7;
    const isNew = i % 9 === 4;
    if (churned) {
      await grantPlan(userId, key, new Date(NOW.getTime() - (33 + (i % 12)) * DAY));
    } else if (isNew) {
      await grantPlan(userId, key, renewal);
    } else {
      await grantPlan(userId, key, new Date(renewal.getTime() - 30 * DAY));
      await grantPlan(userId, key, renewal);
    }
  }
  // Alumno demo: pack 8 vencido, mensual ilimitado activo + biblioteca online
  await grantPlan(alumnoId, "pack8", new Date(NOW.getTime() - 36 * DAY), { payment: "order" });
  const alumnoMensual = await grantPlan(alumnoId, "pack8", new Date(NOW.getTime() - 6 * DAY), { payment: "order" });
  const alumnoBiblio = await grantPlan(alumnoId, "biblioteca", new Date(NOW.getTime() - 6 * DAY), { payment: "order" });
  // Algunos alumnos también tienen biblioteca online
  for (const userId of studentIds.filter((_, i) => i % 6 === 1)) {
    await grantPlan(userId, "biblioteca", new Date(NOW.getTime() - (2 + Math.floor(rand() * 25)) * DAY));
  }

  // Transferencia de plan pendiente de aprobar (pestaña Transferencias)
  const pendingBuyer = studentIds[7];
  await prisma.order.create({
    data: {
      centerId, userId: pendingBuyer, planId: planBySlugKey("pack8").id, amountCents: 56000,
      status: "PENDING", paymentMethod: "TRANSFER", externalReference: `MP-${104800 + ++refN}`,
      transferClaimedAt: new Date(NOW.getTime() - 3 * 3600_000), createdAt: new Date(NOW.getTime() - 4 * 3600_000),
    },
  });

  // Reservas
  const reservations: Prisma.ReservationCreateManyInput[] = [];
  const reservedBy = new Map<string, Set<string>>(); // classId -> userIds
  const dayCount = new Map<string, number>(); // userId|day
  const weekCount = new Map<string, number>(); // userId|week
  const dayKey = (d: Date) => ymdKey(civilYearMonthDayInTz(d, TZ));
  const weekKey = (d: Date) => String(Math.floor((d.getTime() + 4 * DAY) / (7 * DAY)));

  function usablePlan(userId: string, when: Date): UP | undefined {
    return userPlans.find(
      (p) => p.userId === userId && p.live && p.from <= when && when < p.until && (p.total == null || p.used < p.total),
    );
  }
  function addReservation(c: ClassRow, userId: string, up: UP, status: Prisma.ReservationCreateManyInput["status"]) {
    reservations.push({
      userId, liveClassId: c.id, userPlanId: up.id, status,
      createdAt: new Date(c.startsAt.getTime() - (1 + Math.floor(rand() * 5)) * DAY),
    });
    if (status !== "CANCELLED") up.used++;
    const set = reservedBy.get(c.id) ?? new Set<string>();
    set.add(userId);
    reservedBy.set(c.id, set);
    const dk = `${userId}|${dayKey(c.startsAt)}`;
    const wk = `${userId}|${weekKey(c.startsAt)}`;
    dayCount.set(dk, (dayCount.get(dk) ?? 0) + 1);
    weekCount.set(wk, (weekCount.get(wk) ?? 0) + 1);
  }
  const countActive = (classId: string) =>
    reservations.filter((r) => r.liveClassId === classId && r.status !== "CANCELLED").length;

  // Próximas 3 reservas del alumno demo (disciplinas distintas, desde mañana)
  const tomorrow = at(addDays(TODAY, 1), 0);
  const alumnoUpcoming: ClassRow[] = [];
  for (const c of classes) {
    if (c.startsAt < tomorrow || alumnoUpcoming.length >= 3) continue;
    if (alumnoUpcoming.some((x) => x.disciplineId === c.disciplineId || dayKey(x.startsAt) === dayKey(c.startsAt))) continue;
    alumnoUpcoming.push(c);
  }
  const alumnoMensualUp = userPlans.find((p) => p.id === alumnoMensual.id)!;
  for (const c of alumnoUpcoming) addReservation(c, alumnoId, alumnoMensualUp, "CONFIRMED");

  const pastStatus = (): Prisma.ReservationCreateManyInput["status"] => {
    const r = rand();
    return r < 0.84 ? "ATTENDED" : r < 0.91 ? "NO_SHOW" : r < 0.94 ? "LATE_CANCELLED" : "CANCELLED";
  };
  const fullClasses: ClassRow[] = [];
  // Orden de llenado: pasado primero, luego por semana; aleatorio dentro de cada grupo
  // para que los cupos no se agoten siempre a comienzo de semana.
  const fillOrder = classes
    .map((c) => ({ c, k: [c.startsAt < NOW ? 0 : 1, Number(weekKey(c.startsAt)), rand()] }))
    .sort((a, b) => a.k[0] - b.k[0] || a.k[1] - b.k[1] || a.k[2] - b.k[2])
    .map((x) => x.c);
  for (const c of fillOrder) {
    const past = c.startsAt < NOW;
    const daysAhead = (c.startsAt.getTime() - NOW.getTime()) / DAY;
    let fill: number;
    if (past) fill = 0.55 + rand() * 0.45;
    else if (daysAhead < 7) fill = rand() < 0.35 ? 1 : 0.6 + rand() * 0.35;
    else if (daysAhead < 14) fill = rand() < 0.25 ? 1 : 0.55 + rand() * 0.35;
    else fill = 0.15 + rand() * 0.3;
    const target = Math.round(c.maxCapacity * fill);
    const candidates = shuffle(past ? [alumnoId, ...studentIds] : studentIds);
    for (const userId of candidates) {
      if (countActive(c.id) >= target) break;
      if (reservedBy.get(c.id)?.has(userId)) continue;
      if ((dayCount.get(`${userId}|${dayKey(c.startsAt)}`) ?? 0) >= 1) continue;
      if ((weekCount.get(`${userId}|${weekKey(c.startsAt)}`) ?? 0) >= (userId === alumnoId ? 3 : 4)) continue;
      const up = usablePlan(userId, c.startsAt);
      if (!up) continue;
      addReservation(c, userId, up, past && dayKey(c.startsAt) !== dayKey(NOW) ? pastStatus() : "CONFIRMED");
    }
    if (!past && countActive(c.id) >= c.maxCapacity) fullClasses.push(c);
  }
  await prisma.reservation.createMany({ data: reservations });
  for (const up of userPlans) {
    if (up.used > 0) await prisma.userPlan.update({ where: { id: up.id }, data: { classesUsed: up.used } });
  }

  // Lista de espera en clases llenas (el alumno demo espera en la primera)
  const waitlist: Prisma.WaitlistEntryCreateManyInput[] = [];
  fullClasses.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  for (const [n, c] of fullClasses.entries()) {
    const inClass = reservedBy.get(c.id)!;
    const others = shuffle(studentIds.filter((u) => !inClass.has(u)));
    const queue = n === 0 && !inClass.has(alumnoId) ? [alumnoId, ...others] : others;
    queue.slice(0, 1 + Math.floor(rand() * 3)).forEach((userId, i) =>
      waitlist.push({ userId, centerId, liveClassId: c.id, status: "QUEUED", position: i + 1 }),
    );
  }
  await prisma.waitlistEntry.createMany({ data: waitlist });

  // Eventos
  const taller = nextDow(addDays(TODAY, 14), 6);
  const retiro = nextDow(addDays(TODAY, 28), 6);
  const events = [
    {
      title: "Taller de respiración y sonido",
      description:
        "Una tarde para bajar el ritmo. Exploraremos técnicas de pranayama y cerraremos con un baño de sonido con cuencos tibetanos y gong. No necesitas experiencia previa: trae ropa cómoda y una manta.",
      location: "Estudio Marea — Av. Irarrázaval 0000, Ñuñoa",
      imageUrl: img(IMG.meditateDeck),
      startsAt: at(taller, 17, 0), endsAt: at(taller, 19, 30),
      amountCents: 25000, maxCapacity: 24, color: "#4F7A8C", sold: 14,
    },
    {
      title: "Retiro de primavera en Cajón del Maipo",
      description:
        "Dos días de yoga, meditación y naturaleza en la cordillera. Incluye alojamiento en habitación compartida, alimentación vegetariana, 4 prácticas de yoga, caminata guiada y círculo de cierre. Traslado desde el estudio incluido.",
      location: "San José de Maipo, Región Metropolitana",
      imageUrl: img(IMG.mountains),
      startsAt: at(retiro, 9, 0), endsAt: at(addDays(retiro, 1), 17, 0),
      amountCents: 189000, maxCapacity: 18, color: "#6B8F71", sold: 9,
    },
  ];
  for (const [ei, e] of events.entries()) {
    const { sold, ...data } = e;
    const ev = await prisma.event.create({ data: { ...data, centerId, status: "PUBLISHED" } });
    const buyers = shuffle(studentIds).slice(0, sold);
    if (ei === 0) buyers[0] = alumnoId;
    for (const [bi, userId] of buyers.entries()) {
      const pending = bi === buyers.length - 1 && ei === 1;
      const method = bi % 3 === 2 ? "TRANSFER" : "MERCADOPAGO";
      const paidAt = new Date(NOW.getTime() - (1 + Math.floor(rand() * 14)) * DAY);
      const qty = bi % 5 === 3 ? 2 : 1;
      const ticket = await prisma.eventTicket.create({
        data: {
          eventId: ev.id, userId, amountCents: e.amountCents * qty, quantity: qty,
          status: pending ? "PENDING" : "PAID", paymentMethod: pending ? "TRANSFER" : method,
          externalReference: `MP-${205000 + ei * 100 + bi}`,
          transferClaimedAt: pending ? new Date(NOW.getTime() - 5 * 3600_000) : method === "TRANSFER" ? paidAt : null,
          paidAt: pending ? null : paidAt, createdAt: paidAt,
        },
      });
      if (!pending && method === "TRANSFER") {
        await prisma.manualPayment.create({
          data: {
            centerId, userId, eventTicketId: ticket.id, amountCents: ticket.amountCents, method: "transfer",
            note: `Entrada ${e.title}`, paidAt, createdAt: paidAt,
          },
        });
      }
    }
  }

  // On demand
  const ON_DEMAND = [
    {
      name: "Yoga en casa", description: "Prácticas grabadas para hacer a tu ritmo, donde estés.", thumb: IMG.homeYoga,
      practices: [
        { name: "Vinyasa para empezar el día", description: "Secuencias dinámicas para despertar el cuerpo.", thumb: IMG.crow,
          lessons: [
            { title: "Saludo al sol paso a paso", min: 20, level: "Principiante", intensity: "Media", thumb: IMG.sunsetPose },
            { title: "Flow energizante de 30 minutos", min: 30, level: "Intermedio", intensity: "Alta", thumb: IMG.downDog },
            { title: "Vinyasa para la espalda", min: 25, level: "Todos los niveles", intensity: "Media", thumb: IMG.archway },
          ] },
        { name: "Yin para soltar", description: "Posturas largas y pasivas para liberar tensión.", thumb: IMG.stretchFloor,
          lessons: [
            { title: "Yin de caderas", min: 40, level: "Todos los niveles", intensity: "Suave", thumb: IMG.seatedMat },
            { title: "Yin antes de dormir", min: 30, level: "Principiante", intensity: "Suave", thumb: IMG.studioSeated },
          ] },
      ],
    },
    {
      name: "Meditación y respiración", description: "Herramientas simples para calmar la mente.", thumb: IMG.lakeDock,
      practices: [
        { name: "Respiración consciente", description: "Pranayama para regular tu energía.", thumb: IMG.sunsetLake,
          lessons: [
            { title: "Respiración cuadrada", min: 10, level: "Principiante", intensity: "Suave", thumb: IMG.silhouette },
            { title: "Nadi shodhana: respiración alterna", min: 15, level: "Todos los niveles", intensity: "Suave", thumb: IMG.meditateDeck2 },
          ] },
        { name: "Meditaciones guiadas", description: "Pausas guiadas para cualquier momento del día.", thumb: IMG.meadow,
          lessons: [
            { title: "Body scan de 15 minutos", min: 15, level: "Principiante", intensity: "Suave", thumb: IMG.sunsetHill },
            { title: "Meditación de gratitud", min: 12, level: "Todos los niveles", intensity: "Suave", thumb: IMG.meditateDeck },
          ] },
      ],
    },
  ];
  const lessonIds: string[] = [];
  for (const [ci, cat] of ON_DEMAND.entries()) {
    const category = await prisma.onDemandCategory.create({
      data: { centerId, name: cat.name, description: cat.description, thumbnailUrl: img(cat.thumb, 1200), sortOrder: ci, status: "PUBLISHED" },
    });
    for (const [pi, p] of cat.practices.entries()) {
      const practice = await prisma.onDemandPractice.create({
        data: { categoryId: category.id, name: p.name, description: p.description, thumbnailUrl: img(p.thumb, 1200), sortOrder: pi, status: "PUBLISHED" },
      });
      for (const [li, l] of p.lessons.entries()) {
        const lesson = await prisma.onDemandLesson.create({
          data: {
            practiceId: practice.id, title: l.title, description: `${l.title}. Práctica guiada por el equipo de Estudio Marea.`,
            videoUrl: VIDEO_URL, thumbnailUrl: img(l.thumb, 1200), durationMinutes: l.min, level: l.level,
            intensity: l.intensity, equipment: "Mat", tags: cat.name.toLowerCase(), sortOrder: li, status: "PUBLISHED",
          },
        });
        lessonIds.push(lesson.id);
      }
    }
  }
  await prisma.lessonUnlock.createMany({
    data: lessonIds.slice(0, 3).map((lessonId, i) => ({
      userId: alumnoId, lessonId, userPlanId: alumnoBiblio.id, centerId,
      unlockedAt: new Date(NOW.getTime() - (5 - i) * DAY),
    })),
  });

  await seedSite(centerId, instructorId.catalina);

  await printSummary(centerId);
}

// ─── Sitio público ─────────────────────────────────────────────────────────
async function seedSite(centerId: string, catalinaId: string) {
  await prisma.centerSiteConfig.create({
    data: {
      centerId,
      heroEyebrow: "Yoga · Pilates · Meditación en Ñuñoa",
      heroTitle: "Un lugar para volver a tu cuerpo",
      heroSubtitle: "Clases presenciales y online para todos los niveles. Respira, muévete y encuentra tu ritmo en comunidad.",
      heroImageUrl: img(IMG.heroClass, 2000),
      colorPrimary: "#3B2F4A",
      colorSecondary: "#94562C",
      colorAccent: "#D9B48A",
      contactEmail: "hola@estudiomarea.cl",
      contactPhone: "+56 9 0000 0000",
      contactAddress: "Av. Irarrázaval 0000, Ñuñoa, Santiago",
      instagramUrl: "https://instagram.com/estudiomarea.demo",
      whatsappUrl: "https://wa.me/56900000000",
      headerNavLabelHowItWorks: "Cómo funciona",
      headerNavLabelInPerson: "Clases",
      headerNavLabelOnline: "Online",
      headerNavLabelContact: "Contacto",
      libraryHeroTitle: "Tu práctica, donde estés",
      libraryHeroDescription: "Clases grabadas de yoga, respiración y meditación para practicar en casa a tu ritmo.",
      libraryHeroImageUrl: img(IMG.homeYoga, 1600),
      seoTitle: "Estudio Marea — Yoga y Pilates en Ñuñoa",
      seoDescription: "Clases de Vinyasa, Hatha, Yin, Pilates Mat y meditación en Ñuñoa y online. Reserva tu primera clase.",
      heroOverlayEnabled: true,
    },
  });

  type Item = { title?: string; description?: string; imageUrl?: string; linkUrl?: string; href?: string; userId?: string };
  const sections: { key: string; title?: string; subtitle?: string; items?: Item[] }[] = [
    { key: "hero", subtitle: "Estudio Marea" },
    {
      key: "about", title: "Nuestra propuesta", subtitle: "Movimiento consciente",
      items: [{
        title: "La práctica no se trata de llegar a la postura perfecta, sino de volver a ti cada vez.",
        description: "En Estudio Marea creemos en grupos pequeños, profesores que te conocen por tu nombre y clases que se adaptan a tu cuerpo. Da lo mismo si nunca has pisado un mat o si practicas hace años: aquí tienes un espacio para respirar, moverte y descansar.",
      }],
    },
    { key: "disciplines", title: "Disciplinas", subtitle: "Encuentra la práctica que te hace bien" },
    { key: "schedule", title: "Horarios de la semana", subtitle: "Presencial y online" },
    {
      key: "how-it-works", title: "Cómo funciona", subtitle: "Empezar es simple",
      items: [
        { linkUrl: "01|Elige", title: "Elige tu plan", description: "Clase suelta, packs o mensual ilimitado. Paga online o por transferencia.", href: "/catalogo" },
        { linkUrl: "02|Reserva", title: "Reserva tu clase", description: "Elige día y horario desde tu celular. Si se llena, te sumas a la lista de espera." },
        { linkUrl: "03|Practica", title: "Ven a practicar", description: "Llega 10 minutos antes. Tenemos mats, bloques y mantas para ti." },
      ],
    },
    { key: "on-demand", title: "Biblioteca online", subtitle: "Practica cuando quieras" },
    { key: "events", title: "Próximos eventos", subtitle: "Talleres y retiros" },
    {
      key: "team", title: "Quién está detrás", subtitle: "Fundadora y profesora",
      items: [{
        title: "Catalina Rojas",
        description: "Profesora de yoga con formación de 500 horas y diez años de práctica. Fundó Estudio Marea en 2020 con la idea de crear un espacio cercano, sin exigencias ni competencia, donde cada persona pueda encontrar su propio ritmo.\n---\nVinyasa, Yin Yoga, Formación 500 h, Meditación",
        imageUrl: img(IMG.studioSeated, 1200),
        linkUrl: "el cuerpo aprende cuando se siente seguro.",
        userId: catalinaId,
      }],
    },
    {
      key: "testimonials", title: "Lo que dice nuestra comunidad",
      items: [
        { title: "Llegué con dolor de espalda y mucho estrés. Hoy Marea es mi lugar favorito de la semana: me siento más fuerte y mucho más tranquilo.", description: "Tomás, alumno desde 2023", linkUrl: "Mensual ilimitado" },
        { title: "+1.200", description: "clases al año" },
        { title: "4,9", description: "valoración promedio" },
        { title: "6", description: "disciplinas y formatos" },
      ],
    },
    { key: "cta", title: "Tu primera clase te está esperando", subtitle: "Reserva hoy", items: [{ title: "Elige el formato que se adapte a tu ritmo: presencial en Ñuñoa u online desde tu casa." }] },
    { key: "contact", title: "Contacto", subtitle: "Escríbenos, te respondemos el mismo día" },
  ];
  for (const [i, s] of sections.entries()) {
    await prisma.centerSiteSection.create({
      data: {
        centerId, sectionKey: s.key, title: s.title ?? null, subtitle: s.subtitle ?? null, visible: true, sortOrder: i,
        items: { create: (s.items ?? []).map((it, j) => ({ ...it, sortOrder: j })) },
      },
    });
  }

  const gallery: { cat: "RETIROS" | "CLASES" | "ESPACIO"; id: string; caption: string }[] = [
    { cat: "CLASES", id: IMG.heroClass, caption: "Clase de Vinyasa del sábado" },
    { cat: "CLASES", id: IMG.pilatesGroup, caption: "Pilates Mat en grupos pequeños" },
    { cat: "CLASES", id: IMG.downDog, caption: "Hatha Yoga" },
    { cat: "RETIROS", id: IMG.beachGroup, caption: "Retiro de verano en la costa" },
    { cat: "RETIROS", id: IMG.sunsetHill, caption: "Amanecer en el Cajón del Maipo" },
    { cat: "RETIROS", id: IMG.meadow, caption: "Caminata consciente" },
    { cat: "ESPACIO", id: IMG.meditateDeck2, caption: "Nuestra terraza" },
    { cat: "ESPACIO", id: IMG.props, caption: "Implementos para todas las clases" },
    { cat: "ESPACIO", id: IMG.archway, caption: "Luz natural todo el día" },
  ];
  await prisma.centerAboutPage.create({
    data: {
      centerId, visible: true, showInHeader: true, headerLabel: "Nosotros", pageTitle: "Nosotros",
      pageEyebrow: "Estudio Marea", name: "Estudio Marea", tagline: "Yoga, pilates y meditación en el corazón de Ñuñoa",
      heroImageUrl: img(IMG.studioSeated, 2000),
      bio: "Estudio Marea nació en 2020 como un pequeño espacio para practicar yoga entre amigos. Hoy somos una comunidad de más de cien alumnos que se mueven con nosotros cada semana, en el estudio y online.",
      propuesta: "Grupos pequeños, profesores certificados y un horario amplio de lunes a sábado. Creemos en una práctica amable, accesible y constante, que te acompañe en tu día a día.",
      ctaLabel: "Agenda tu primera clase", ctaHref: "/#agenda",
      images: { create: gallery.map((g, i) => ({ imageUrl: img(g.id, 1400), caption: g.caption, category: g.cat, sortOrder: i })) },
    },
  });
}

// ─── Resumen ───────────────────────────────────────────────────────────────
async function printSummary(centerId: string) {
  const w = { centerId };
  const counts = {
    users: await prisma.user.count({ where: { email: { endsWith: EMAIL_DOMAIN } } }),
    memberships: await prisma.userCenterRole.count({ where: w }),
    emailPreferences: await prisma.emailPreference.count({ where: w }),
    disciplines: await prisma.discipline.count({ where: w }),
    series: await prisma.liveClassSeries.count({ where: w }),
    liveClasses: await prisma.liveClass.count({ where: w }),
    upcomingClasses: await prisma.liveClass.count({ where: { ...w, startsAt: { gte: NOW } } }),
    reservations: await prisma.reservation.count({ where: { liveClass: w } }),
    upcomingConfirmed: await prisma.reservation.count({ where: { liveClass: { ...w, startsAt: { gte: NOW } }, status: "CONFIRMED" } }),
    waitlist: await prisma.waitlistEntry.count({ where: w }),
    plans: await prisma.plan.count({ where: w }),
    userPlansActive: await prisma.userPlan.count({ where: { ...w, status: "ACTIVE" } }),
    userPlansExpired: await prisma.userPlan.count({ where: { ...w, status: "EXPIRED" } }),
    orders: await prisma.order.count({ where: w }),
    manualPayments: await prisma.manualPayment.count({ where: w }),
    events: await prisma.event.count({ where: w }),
    eventTickets: await prisma.eventTicket.count({ where: { event: w } }),
    holidays: await prisma.centerHoliday.count({ where: w }),
    onDemandCategories: await prisma.onDemandCategory.count({ where: w }),
    onDemandLessons: await prisma.onDemandLesson.count({ where: { practice: { category: w } } }),
    lessonUnlocks: await prisma.lessonUnlock.count({ where: w }),
    siteSections: await prisma.centerSiteSection.count({ where: w }),
    aboutImages: await prisma.centerAboutPageImage.count({ where: { page: w } }),
  };
  console.table(counts);
  console.log(`\nLogin (centro "${SLUG}"):`);
  console.log(`  Admin:  admin${EMAIL_DOMAIN} / ${PASSWORD}`);
  console.log(`  Alumno: alumno${EMAIL_DOMAIN} / ${PASSWORD}`);
  console.log(`  Profes: catalina|matias|valentina${EMAIL_DOMAIN} / ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
