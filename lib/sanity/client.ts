import { createClient } from "@sanity/client";
import { apiVersion, dataset, isSanityConfigured, projectId, readToken, writeToken } from "@/sanity/env";

/**
 * Sanity client for server components.
 *
 * useCdn: true en producción (cache 60s en CDN de Sanity).
 * Para draft mode, usa `getDraftClient()` con token.
 */
export const sanityClient = projectId
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: process.env.NODE_ENV === "production",
      perspective: "published",
    })
  : null;

export function getDraftClient() {
  if (!projectId || !readToken) return null;
  return createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    perspective: "previewDrafts",
    token: readToken,
  });
}

/**
 * Sanity client con permisos de escritura.
 * Usar SOLO desde server components / route handlers — nunca exponer el token al browser.
 * Lanza si no está configurado; el caller debe manejar el error con un 5xx claro.
 */
export function getSanityWriteClient() {
  if (!projectId) {
    throw new Error(
      "Sanity no está configurado: falta NEXT_PUBLIC_SANITY_PROJECT_ID. Ver docs/sanity-setup.md.",
    );
  }
  if (!writeToken) {
    throw new Error(
      "SANITY_API_WRITE_TOKEN no configurado. Crea un token con permiso Editor en manage.sanity.io.",
    );
  }
  return createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    token: writeToken,
  });
}

type FetchOptions = {
  revalidate?: number | false;
  tags?: string[];
  draft?: boolean;
};

/**
 * Helper tipado para hacer fetch con ISR. Retorna `null` si Sanity no está configurado.
 * Úsalo en server components / route handlers. En client use el endpoint HTTP.
 */
export async function sanityFetch<T>(
  query: string,
  params: Record<string, unknown> = {},
  options: FetchOptions = {},
): Promise<T | null> {
  if (!isSanityConfigured()) return null;

  const { revalidate = 60, tags, draft = false } = options;
  const client = draft ? getDraftClient() : sanityClient;
  if (!client) return null;

  const nextOptions: { revalidate?: number | false; tags?: string[] } = {};
  if (revalidate !== undefined) nextOptions.revalidate = revalidate;
  if (tags) nextOptions.tags = tags;

  return client.fetch<T>(query, params, { next: nextOptions });
}

export { isSanityConfigured };
