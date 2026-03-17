import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(async () => ({ user: { id: "u1", centerId: "c1" } })),
  listMyReservationsPaginated: vi.fn(async () => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
  })),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));

vi.mock("@/lib/application/reserve-class", () => ({
  listMyReservationsPaginated: mocks.listMyReservationsPaginated,
}));

import { GET } from "./route";

describe("GET /api/reservations", () => {
  beforeEach(() => {
    mocks.listMyReservationsPaginated.mockClear();
  });

  it("devuelve 400 si page es inválido (NaN)", async () => {
    const res = await GET(new Request("http://localhost/api/reservations?page=abc"));
    expect(res.status).toBe(400);
    expect(mocks.listMyReservationsPaginated).not.toHaveBeenCalled();
  });

  it("devuelve 400 si pageSize excede máximo", async () => {
    const res = await GET(new Request("http://localhost/api/reservations?pageSize=51"));
    expect(res.status).toBe(400);
    expect(mocks.listMyReservationsPaginated).not.toHaveBeenCalled();
  });

  it("devuelve 400 si statuses contiene algún valor inválido (con espacios)", async () => {
    const res = await GET(
      new Request("http://localhost/api/reservations?statuses= CONFIRMED , NOPE ")
    );
    expect(res.status).toBe(400);
    expect(mocks.listMyReservationsPaginated).not.toHaveBeenCalled();
  });
});

