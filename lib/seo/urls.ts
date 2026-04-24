const DEFAULT_SITE_URL = "https://cuerporaiz.cl";

export function getSiteUrl(env: Record<string, string | undefined> = process.env as Record<string, string | undefined>): string {
  const raw = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) return stripTrailingSlash(raw);
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return DEFAULT_SITE_URL;
}

export function absoluteUrl(path: string, env: Record<string, string | undefined> = process.env as Record<string, string | undefined>): string {
  if (isAbsoluteUrl(path)) return path;
  const base = getSiteUrl(env);
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${base}${clean}`;
}

export function resolveImageUrl(
  input: string | null | undefined,
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): string | null {
  if (!input) return null;
  if (isAbsoluteUrl(input)) return input;
  return absoluteUrl(input, env);
}

export function isProductionEnv(env: Record<string, string | undefined> = process.env as Record<string, string | undefined>): boolean {
  const vercelEnv = env.VERCEL_ENV;
  if (vercelEnv === "production") return true;
  if (vercelEnv === "preview" || vercelEnv === "development") return false;
  return true;
}

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
