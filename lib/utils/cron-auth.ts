/** Vercel Cron manda `Authorization: Bearer <CRON_SECRET>`. */
export function isCronAuthorized(request: Request): boolean {
  return request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}
