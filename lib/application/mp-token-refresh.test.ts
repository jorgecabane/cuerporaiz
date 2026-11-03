import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/adapters/db/prisma", () => ({
  prisma: {
    centerMercadoPagoConfig: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock("./security-alerts", () => ({ sendSecurityAlert: vi.fn() }));

import { prisma } from "@/lib/adapters/db/prisma";
import { sendSecurityAlert } from "./security-alerts";
import { refreshExpiringMpTokens } from "./mp-token-refresh";

const DAY = 86_400_000;
const now = new Date("2026-11-03T12:00:00Z");
const findMany = vi.mocked(prisma.centerMercadoPagoConfig.findMany);
const update = vi.mocked(prisma.centerMercadoPagoConfig.update);

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MP_APP_ID = "app";
  process.env.MP_CLIENT_SECRET = "secret";
});

describe("refreshExpiringMpTokens", () => {
  it("solo busca tokens que vencen dentro de 30 días", async () => {
    findMany.mockResolvedValue([] as never);
    mockFetch(200, {});

    await refreshExpiringMpTokens(now);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tokenExpiresAt: { lte: new Date(now.getTime() + 30 * DAY) } }),
      })
    );
  });

  it("renueva y guarda el token nuevo con su vencimiento", async () => {
    findMany.mockResolvedValue([{ centerId: "c1", refreshToken: "old-rt" }] as never);
    const fetchMock = mockFetch(200, { access_token: "new-at", refresh_token: "new-rt", expires_in: 180 * 86_400 });

    const result = await refreshExpiringMpTokens(now);

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      grant_type: "refresh_token",
      refresh_token: "old-rt",
    });
    expect(update).toHaveBeenCalledWith({
      where: { centerId: "c1" },
      data: { accessToken: "new-at", refreshToken: "new-rt", tokenExpiresAt: new Date(now.getTime() + 180 * DAY) },
    });
    expect(result).toEqual({ refreshed: 1, failed: 0 });
    expect(sendSecurityAlert).not.toHaveBeenCalled();
  });

  it("si MP rechaza, no toca la base y manda alerta", async () => {
    findMany.mockResolvedValue([{ centerId: "c1", refreshToken: "old-rt" }] as never);
    mockFetch(400, { message: "invalid_grant" });

    const result = await refreshExpiringMpTokens(now);

    expect(update).not.toHaveBeenCalled();
    expect(sendSecurityAlert).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "mp_token_refresh_failed", metadata: expect.objectContaining({ centerId: "c1", status: 400 }) })
    );
    expect(result).toEqual({ refreshed: 0, failed: 1 });
  });
});
