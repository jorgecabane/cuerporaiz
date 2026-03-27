import type { LoginAttempt } from "@/lib/domain/auth-token";

export interface ILoginAttemptRepository {
  create(data: { email: string; centerId: string; ip: string; success: boolean }): Promise<LoginAttempt>;
  countRecentByEmailAndCenter(email: string, centerId: string, sinceMinutes: number): Promise<number>;
  countRecentByIp(ip: string, sinceMinutes: number): Promise<number>;
}
