/**
 * Seed de contenido de demo para Sanity.
 *
 * Requiere:
 * - NEXT_PUBLIC_SANITY_PROJECT_ID
 * - NEXT_PUBLIC_SANITY_DATASET (default "production")
 * - SANITY_API_WRITE_TOKEN (permisos Editor o superior)
 *
 * Uso:
 *   npx tsx scripts/seed-sanity.ts
 *
 * Idempotente: re-correrlo actualiza en lugar de duplicar (usa IDs fijos).
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

import { createClient } from "@sanity/client";
import { randomUUID } from "crypto";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
const token = process.env.SANITY_API_WRITE_TOKEN;

if (!projectId) {
  console.error("Falta NEXT_PUBLIC_SANITY_PROJECT_ID en env.");
  process.exit(1);
}
if (!token) {
  console.error(
    "Falta SANITY_API_WRITE_TOKEN en env.\n" +
      "Crear uno en manage.sanity.io → API → Tokens (permisos Editor).",
  );
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  token,
  useCdn: false,
  apiVersion: "2026-04-23",
});

// ── helpers ────────────────────────────────────────────────────────

function key(): string {
  return randomUUID().slice(0, 12);
}

type SanityImageAssetRef = { _type: "reference"; _ref: string };

async function uploadImageFromUrl(url: string, filename: string): Promise<SanityImageAssetRef> {
  console.log(`  ↑ subiendo ${filename}…`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No pude descargar ${url}: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const asset = await client.assets.upload("image", buffer, { filename });
  return { _type: "reference", _ref: asset._id };
}

function imageRef(ref: SanityImageAssetRef, alt: string, caption?: string) {
  return {
    _type: "image",
    asset: ref,
    alt,
    ...(caption ? { caption } : {}),
  };
}

// ── seed ───────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🌱 Seeding Sanity (project=${projectId}, dataset=${dataset})\n`);

  // ── 1. Autor ────────────────────────────────────────────────────
  console.log("➊ Autor");
  const trinidadPhoto = await uploadImageFromUrl(
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    "trinidad-photo.jpg",
  );

  const authorId = "author-trinidad";
  await client.createOrReplace({
    _id: authorId,
    _type: "author",
    name: "Trinidad Cáceres",
    slug: { _type: "slug", current: "trinidad" },
    role: "Guía de yoga y meditación",
    photo: { _type: "image", asset: trinidadPhoto, alt: "Trinidad Cáceres" },
    bio: "Acompaña prácticas en Vitacura desde 2015. Formada en Ashtanga, Vinyasa y meditación secular. Lidera retiros en Chile y escribe sobre la vida lenta y los pequeños rituales.",
    socials: {
      instagram: "https://instagram.com/cuerporaiz",
      web: "https://cuerporaiz.cl",
    },
  });

  // ── 2. Categorías ──────────────────────────────────────────────
  console.log("➋ Categorías");
  const categories = [
    { id: "category-yoga", name: "Yoga", slug: "yoga", description: "Práctica en la esterilla, sequencias, asanas y más." },
    { id: "category-respiracion", name: "Respiración", slug: "respiracion", description: "Pranayama y ejercicios guiados." },
    { id: "category-retiros", name: "Retiros", slug: "retiros", description: "Crónicas y guías de nuestros retiros en Chile." },
    { id: "category-vida-cotidiana", name: "Vida cotidiana", slug: "vida-cotidiana", description: "Rituales y prácticas fuera de la esterilla." },
  ];

  for (const c of categories) {
    await client.createOrReplace({
      _id: c.id,
      _type: "category",
      name: c.name,
      slug: { _type: "slug", current: c.slug },
      description: c.description,
    });
  }

  const catRef = (id: string) => ({ _type: "reference" as const, _ref: id, _key: key() });

  // ── 3. Post principal (rico, 15 bloques custom) ────────────────
  console.log("➌ Post principal: “Volver al cuerpo cuando la mente no para”");
  const cover = await uploadImageFromUrl(
    "https://images.unsplash.com/photo-1545389336-cf090694435e?auto=format&fit=crop&w=1600&q=80",
    "cover-volver-al-cuerpo.jpg",
  );
  const inlineImg = await uploadImageFromUrl(
    "https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&w=1600&q=80",
    "inline-pies.jpg",
  );
  const tadasanaImg = await uploadImageFromUrl(
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80",
    "tadasana.jpg",
  );
  const bolsterImg = await uploadImageFromUrl(
    "https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?auto=format&fit=crop&w=600&q=80",
    "bolster.jpg",
  );
  const galleryImgs = await Promise.all([
    uploadImageFromUrl("https://images.unsplash.com/photo-1599447541321-ba5d7a6a3da2?auto=format&fit=crop&w=800&q=80", "gal-1.jpg"),
    uploadImageFromUrl("https://images.unsplash.com/photo-1588286840104-8957b019727f?auto=format&fit=crop&w=800&q=80", "gal-2.jpg"),
    uploadImageFromUrl("https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80", "gal-3.jpg"),
    uploadImageFromUrl("https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?auto=format&fit=crop&w=800&q=80", "gal-4.jpg"),
    uploadImageFromUrl("https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80", "gal-5.jpg"),
    uploadImageFromUrl("https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80", "gal-6.jpg"),
  ]);
  const eventImg = await uploadImageFromUrl(
    "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
    "event-retiro.jpg",
  );

  const richPostId = "post-volver-al-cuerpo";
  await client.createOrReplace({
    _id: richPostId,
    _type: "post",
    title: "Volver al cuerpo cuando la mente no para",
    slug: { _type: "slug", current: "volver-al-cuerpo" },
    excerpt:
      "El apoyo en los pies, el ritmo del aliento: cómo encontrar calma incluso en semanas densas, sin forzar la práctica.",
    coverImage: {
      _type: "image",
      asset: cover,
      alt: "Práctica matutina con luz suave entrando por la ventana",
      caption: "Práctica matutina en la sala de Vitacura.",
    },
    author: { _type: "reference", _ref: authorId },
    categories: [catRef("category-yoga"), catRef("category-respiracion")],
    publishedAt: new Date("2026-04-20T10:00:00Z").toISOString(),
    readingMinutes: 6,
    body: [
      {
        _type: "block",
        _key: key(),
        style: "normal",
        children: [
          {
            _type: "span",
            _key: key(),
            text: "Hay semanas en que la mente corre más rápido que el cuerpo. La lista de pendientes, las conversaciones que quedaron en el aire, los mensajes que todavía no respondo: todo ocurre al mismo tiempo, y el pecho se vuelve estrecho sin que me dé cuenta.",
            marks: [],
          },
        ],
      },
      {
        _type: "block",
        _key: key(),
        style: "normal",
        children: [
          {
            _type: "span",
            _key: key(),
            text: "Cuando me pasa eso, no siempre puedo hacer una hora de práctica. Pero sí puedo bajar a los pies. Y ahí empieza todo.",
            marks: [],
          },
        ],
      },
      {
        _type: "block",
        _key: key(),
        style: "h2",
        children: [{ _type: "span", _key: key(), text: "El cuerpo sabe más que la mente", marks: [] }],
      },
      {
        _type: "block",
        _key: key(),
        style: "normal",
        children: [
          {
            _type: "span",
            _key: key(),
            text: "Una cosa que aprendí con los años en la esterilla es que el sistema nervioso responde más rápido a la respiración que a la lógica. Podés pasarte horas explicándote que no hay motivo para estar acelerada; no va a cambiar nada. En cambio, tres minutos de exhalaciones largas te llevan a otro estado sin discusión.",
            marks: [],
          },
        ],
      },
      // Callout
      {
        _type: "callout",
        _key: key(),
        tone: "tip",
        title: "Tip para empezar",
        body: [
          {
            _type: "block",
            _key: key(),
            style: "normal",
            children: [
              {
                _type: "span",
                _key: key(),
                text: "Si es tu primera vez, probá cinco minutos al despertar, antes de tomar el teléfono. La constancia importa más que la duración — un ritual corto sostenido gana siempre al gesto largo y esporádico.",
                marks: [],
              },
            ],
          },
        ],
      },
      {
        _type: "block",
        _key: key(),
        style: "normal",
        children: [
          {
            _type: "span",
            _key: key(),
            text: "No se trata de “hacerlo bien”. Se trata de avisarle al cuerpo que está a salvo, que puede soltar la vigilancia por un rato, que hay tiempo.",
            marks: [],
          },
        ],
      },
      // Image fullBleed
      {
        _type: "imageBlock",
        _key: key(),
        asset: inlineImg,
        alt: "Detalle de pies descalzos sobre la esterilla",
        caption: "Los pies son la primera puerta de entrada al presente.",
        fullBleed: true,
      },
      {
        _type: "block",
        _key: key(),
        style: "h2",
        children: [{ _type: "span", _key: key(), text: "Una secuencia breve para días densos", marks: [] }],
      },
      {
        _type: "block",
        _key: key(),
        style: "normal",
        children: [
          {
            _type: "span",
            _key: key(),
            text: "Te comparto una mini-secuencia que suelo hacer cuando tengo poco tiempo pero necesito reconectar. Podés incorporarla antes de empezar el día o como pausa a mitad de tarde.",
            marks: [],
          },
        ],
      },
      // Asana card
      {
        _type: "asanaCard",
        _key: key(),
        sanskritName: "Tadasana",
        spanishName: "Postura de la montaña",
        poseImage: imageRef(tadasanaImg, "Postura de la montaña"),
        benefits: [
          "Ancla el cuerpo al presente a través de los pies",
          "Mejora la postura y la alineación general",
          "Invita a observar la respiración sin forzar",
        ],
        duration: "5 respiraciones",
        difficulty: "principiante",
      },
      // Breath pattern
      {
        _type: "breathPattern",
        _key: key(),
        name: "Respiración 4-7-8",
        phases: [
          { _key: key(), label: "inhale", seconds: 4 },
          { _key: key(), label: "hold-in", seconds: 7 },
          { _key: key(), label: "exhale", seconds: 8 },
        ],
        rounds: 4,
        description:
          "Una respiración que calma el sistema nervioso. Ideal al final del día o cuando te cuesta dormir.",
      },
      {
        _type: "block",
        _key: key(),
        style: "normal",
        children: [
          {
            _type: "span",
            _key: key(),
            text: "Si podés, cerrá los ojos. Si estás en la oficina, bajá la mirada. Lo importante es que la atención se vuelva hacia adentro. No necesitás hacer más.",
            marks: [],
          },
        ],
      },
      {
        _type: "block",
        _key: key(),
        style: "h2",
        children: [{ _type: "span", _key: key(), text: "Lo que no siempre decimos", marks: [] }],
      },
      {
        _type: "block",
        _key: key(),
        style: "normal",
        children: [
          {
            _type: "span",
            _key: key(),
            text: "A veces el yoga se vende como productividad emocional: hacer la postura, sentirse bien, rendir más. A mí me ayuda pensarlo al revés.",
            marks: [],
          },
        ],
      },
      // Pull quote
      {
        _type: "pullQuote",
        _key: key(),
        quote: "La práctica no es un escape del mundo. Es una manera de volver a habitarlo.",
        attribution: "Donna Farhi",
      },
      {
        _type: "block",
        _key: key(),
        style: "normal",
        children: [
          {
            _type: "span",
            _key: key(),
            text: "Cuando la esterilla se vuelve otro lugar donde exigirnos, perdió su sentido. Una buena práctica puede ser quedarse cinco minutos en shavasana y llorar un poco. Y está bien.",
            marks: [],
          },
        ],
      },
      // H2 + bullet list
      {
        _type: "block",
        _key: key(),
        style: "h2",
        children: [{ _type: "span", _key: key(), text: "Señales de que tu cuerpo te está pidiendo calma", marks: [] }],
      },
      {
        _type: "block",
        _key: key(),
        style: "normal",
        listItem: "bullet",
        level: 1,
        children: [{ _type: "span", _key: key(), text: "Te cuesta quedarte quieta más de treinta segundos.", marks: [] }],
      },
      {
        _type: "block",
        _key: key(),
        style: "normal",
        listItem: "bullet",
        level: 1,
        children: [{ _type: "span", _key: key(), text: "La mandíbula está apretada sin que lo notes.", marks: [] }],
      },
      {
        _type: "block",
        _key: key(),
        style: "normal",
        listItem: "bullet",
        level: 1,
        children: [{ _type: "span", _key: key(), text: "Los hombros suben sin permiso hacia las orejas.", marks: [] }],
      },
      {
        _type: "block",
        _key: key(),
        style: "normal",
        listItem: "bullet",
        level: 1,
        children: [{ _type: "span", _key: key(), text: "Te agitás al hablar, aun de cosas cotidianas.", marks: [] }],
      },
      {
        _type: "block",
        _key: key(),
        style: "normal",
        listItem: "bullet",
        level: 1,
        children: [{ _type: "span", _key: key(), text: "Te duerme mal o te despertás con la mente ya corriendo.", marks: [] }],
      },
      // Two column (image + text)
      {
        _type: "twoColumn",
        _key: key(),
        ratio: "50-50",
        left: [
          {
            _type: "imageBlock",
            _key: key(),
            asset: bolsterImg,
            alt: "Bolster y manta preparados",
          },
        ],
        right: [
          {
            _type: "block",
            _key: key(),
            style: "h4",
            children: [{ _type: "span", _key: key(), text: "Lo que necesitás", marks: [] }],
          },
          {
            _type: "block",
            _key: key(),
            style: "normal",
            children: [
              {
                _type: "span",
                _key: key(),
                text: "Una esterilla, un bolster (o dos cojines), una manta y un temporizador. Nada más. La propuesta restorativa se trata de soltar peso, no de construir fuerza.",
                marks: [],
              },
            ],
          },
        ],
      },
      // Embed (YouTube)
      {
        _type: "embed",
        _key: key(),
        url: "https://www.youtube.com/watch?v=v7AYKMP6rOE",
        caption: "Secuencia restorativa de 20 min — video guiado.",
      },
      // Gallery
      {
        _type: "gallery",
        _key: key(),
        layout: "grid",
        images: galleryImgs.map((ref, i) => ({
          _type: "image",
          _key: key(),
          asset: ref,
          alt: `Detalle del espacio ${i + 1}`,
        })),
      },
      // Callout info
      {
        _type: "callout",
        _key: key(),
        tone: "info",
        title: "Contraindicaciones",
        body: [
          {
            _type: "block",
            _key: key(),
            style: "normal",
            children: [
              {
                _type: "span",
                _key: key(),
                text: "Si estás en las primeras semanas de embarazo, evitá retenciones largas de aire. En caso de vértigo, realizá la secuencia sentada en una silla en lugar de pie.",
                marks: [],
              },
            ],
          },
        ],
      },
      {
        _type: "block",
        _key: key(),
        style: "h2",
        children: [{ _type: "span", _key: key(), text: "Seguí practicando con nosotras", marks: [] }],
      },
      {
        _type: "block",
        _key: key(),
        style: "normal",
        children: [
          {
            _type: "span",
            _key: key(),
            text: "Si resonaste con este artículo, te dejo dos invitaciones. La primera es reservar una clase de prueba presencial. La segunda, un retiro breve que estamos organizando en mayo.",
            marks: [],
          },
        ],
      },
      // Featured event
      {
        _type: "featuredEvent",
        _key: key(),
        eyebrow: "Próximo retiro",
        title: "Respirar el valle — retiro de tres días",
        dateLabel: "16 – 18 mayo 2026",
        location: "Cajón del Maipo",
        description: "Tres días de silencio, práctica y montaña, para volver al cuerpo sin exigencia.",
        image: imageRef(eventImg, "Retiro en la cordillera"),
        ctaLabel: "Ver detalles",
        ctaHref: "/#proximos-eventos",
      },
      // Divider
      {
        _type: "divider",
        _key: key(),
        style: "ornament",
      },
      // CTA button
      {
        _type: "ctaButton",
        _key: key(),
        label: "Agenda tu primera clase",
        href: "/#agenda",
        variant: "primary",
      },
    ],
  });

  // ── 4. Posts simples para llenar el grid ───────────────────────
  const simplePosts = [
    {
      id: "post-practica-refugio",
      title: "La práctica como refugio",
      slug: "la-practica-como-refugio",
      excerpt: "Cuando la agenda aprieta, la esterilla puede ser un lugar donde soltar el ruido.",
      categoryId: "category-yoga",
      coverUrl: "https://images.unsplash.com/photo-1552196563-55cd4e45efb3?auto=format&fit=crop&w=1200&q=80",
      coverAlt: "Sala con luz lateral",
      readingMinutes: 4,
      publishedAt: "2026-04-18T10:00:00Z",
    },
    {
      id: "post-respirar-para-soltar",
      title: "Respirar para soltar: un ejercicio guiado",
      slug: "respirar-para-soltar",
      excerpt: "Cuatro cuentas inhalando, siete sosteniendo, ocho soltando. Vuelve al presente en tres minutos.",
      categoryId: "category-respiracion",
      coverUrl: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80",
      coverAlt: "Respiración en silencio",
      readingMinutes: 3,
      publishedAt: "2026-04-12T10:00:00Z",
    },
  ];

  for (const p of simplePosts) {
    console.log(`➍ Post: ${p.title}`);
    const coverAsset = await uploadImageFromUrl(p.coverUrl, `${p.slug}-cover.jpg`);
    await client.createOrReplace({
      _id: p.id,
      _type: "post",
      title: p.title,
      slug: { _type: "slug", current: p.slug },
      excerpt: p.excerpt,
      coverImage: { _type: "image", asset: coverAsset, alt: p.coverAlt },
      author: { _type: "reference", _ref: authorId },
      categories: [catRef(p.categoryId)],
      publishedAt: new Date(p.publishedAt).toISOString(),
      readingMinutes: p.readingMinutes,
      body: [
        {
          _type: "block",
          _key: key(),
          style: "normal",
          children: [
            {
              _type: "span",
              _key: key(),
              text: p.excerpt,
              marks: [],
            },
          ],
        },
        {
          _type: "block",
          _key: key(),
          style: "normal",
          children: [
            {
              _type: "span",
              _key: key(),
              text: "Este es un post de demo. Reemplazalo con contenido real desde /studio cuando estés lista.",
              marks: [],
            },
          ],
        },
      ],
    });
  }

  console.log("\n✅ Seed completo.");
  console.log("   Visitá /blog para verlo, y /studio para editar.\n");
}

main().catch((err) => {
  console.error("\n❌ Seed falló:", err);
  process.exit(1);
});
