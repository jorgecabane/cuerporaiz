/**
 * Rate limiter in-memory, por proceso. No persiste entre restarts.
 * Suficiente para proteger endpoints no-críticos (ej. uploads) contra spam básico.
 * Para protección distribuida usar check-rate-limit con LoginAttempt o Redis.
 */

type Bucket = number[];
const buckets = new Map<string, Bucket>();

export type RateLimitCheck = {
  allowed: boolean;
  retryAfterSeconds?: number;
};

export function memoryRateLimit(
  key: string,
  max: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitCheck {
  const cutoff = now - windowMs;
  const bucket = (buckets.get(key) ?? []).filter((t) => t > cutoff);

  if (bucket.length >= max) {
    const oldest = bucket[0] ?? now;
    const retryAfterSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    buckets.set(key, bucket);
    return { allowed: false, retryAfterSeconds: Math.max(retryAfterSeconds, 1) };
  }

  bucket.push(now);
  buckets.set(key, bucket);
  return { allowed: true };
}

/** Solo para tests — limpia el estado global. */
export function resetMemoryRateLimit(): void {
  buckets.clear();
}
