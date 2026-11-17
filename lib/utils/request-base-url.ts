/**
 * Origen público del request (`https://cuerporaiz.cl`, preview de Vercel, localhost),
 * leyendo los headers del proxy. Para links que vuelven a esta misma app (back_urls de MP,
 * redirect_uri de OAuth). Para correos y crons sin request, usa `getBaseUrl()`.
 */
export function requestBaseUrl(headers: Headers, requestUrl?: string): string {
  const url = requestUrl ? new URL(requestUrl) : null;
  const first = (v: string) => v.split(",")[0].trim();
  const proto = first(headers.get("x-forwarded-proto") ?? url?.protocol.replace(":", "") ?? "http");
  const host = first(headers.get("x-forwarded-host") ?? headers.get("host") ?? url?.host ?? "localhost:3000");
  return `${proto}://${host}`;
}
