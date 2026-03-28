import type { ILoginAttemptRepository } from "@/lib/ports/login-attempt-repository";

interface RateLimitKey {
  email?: string;
  centerId?: string;
  ip?: string;
}

interface CheckRateLimitParams {
  key: RateLimitKey;
  maxAttempts: number;
  windowMinutes: number;
  repo: ILoginAttemptRepository;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export async function checkRateLimit({
  key,
  maxAttempts,
  windowMinutes,
  repo,
}: CheckRateLimitParams): Promise<RateLimitResult> {
  let count: number;

  if (key.email && key.centerId) {
    count = await repo.countRecentByEmailAndCenter(key.email, key.centerId, windowMinutes);
  } else if (key.ip) {
    count = await repo.countRecentByIp(key.ip, windowMinutes);
  } else {
    return { allowed: true };
  }

  if (count >= maxAttempts) {
    return { allowed: false, retryAfterSeconds: windowMinutes * 60 };
  }

  return { allowed: true };
}
