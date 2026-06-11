import { NextResponse } from "next/server";
import { isValidSignature, SIGNATURE_HEADER_NAME } from "@sanity/webhook";

import {
  blogPostWebhookSchema,
  notifyBlogPostPublishedUseCase,
} from "@/lib/application/notify-blog-post-published";

/**
 * Webhook de Sanity: nueva entrada del blog publicada.
 *
 * Configurar en manage.sanity.io → API → Webhooks:
 *  - Trigger: on create / on update, filtro GROQ `_type == "post"`.
 *  - Projection (cuerpo plano que consume este handler):
 *      {
 *        "_id": _id, "_type": _type, "slug": slug.current, "title": title,
 *        "excerpt": excerpt, "coverImage": coverImage,
 *        "readingMinutes": readingMinutes,
 *        "categoryName": categories[0]->name, "authorName": author->name,
 *        "publishedAt": publishedAt
 *      }
 *  - Secret: el mismo valor de `SANITY_WEBHOOK_SECRET`.
 *
 * La firma `sanity-webhook-signature` se valida contra `SANITY_WEBHOOK_SECRET`.
 */
export async function POST(request: Request) {
  const secret = process.env.SANITY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[sanity webhook] SANITY_WEBHOOK_SECRET no configurado");
    return NextResponse.json({ code: "NOT_CONFIGURED" }, { status: 500 });
  }

  const signature = request.headers.get(SIGNATURE_HEADER_NAME);
  const rawBody = await request.text();
  if (!signature || !(await isValidSignature(rawBody, signature, secret))) {
    return NextResponse.json({ code: "INVALID_SIGNATURE" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ code: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = blogPostWebhookSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await notifyBlogPostPublishedUseCase(parsed.data);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[sanity webhook] error", err);
    return NextResponse.json({ code: "SERVER_ERROR" }, { status: 500 });
  }
}
