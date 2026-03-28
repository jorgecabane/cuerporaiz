import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimit } from "./check-rate-limit";

const mockRepo = {
  create: vi.fn(),
  countRecentByEmailAndCenter: vi.fn(),
  countRecentByIp: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

describe("checkRateLimit", () => {
  it("permite si bajo el límite", async () => {
    mockRepo.countRecentByEmailAndCenter.mockResolvedValue(2);
    const result = await checkRateLimit({
      key: { email: "a@b.com", centerId: "c1" },
      maxAttempts: 5,
      windowMinutes: 15,
      repo: mockRepo,
    });
    expect(result.allowed).toBe(true);
  });

  it("bloquea si en el límite", async () => {
    mockRepo.countRecentByEmailAndCenter.mockResolvedValue(5);
    const result = await checkRateLimit({
      key: { email: "a@b.com", centerId: "c1" },
      maxAttempts: 5,
      windowMinutes: 15,
      repo: mockRepo,
    });
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("usa IP cuando key tiene ip", async () => {
    mockRepo.countRecentByIp.mockResolvedValue(3);
    const result = await checkRateLimit({
      key: { ip: "1.2.3.4" },
      maxAttempts: 5,
      windowMinutes: 60,
      repo: mockRepo,
    });
    expect(result.allowed).toBe(true);
    expect(mockRepo.countRecentByIp).toHaveBeenCalledWith("1.2.3.4", 60);
  });
});
