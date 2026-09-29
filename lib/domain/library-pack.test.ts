import { describe, it, expect } from "vitest";
import {
  buildLibraryPacks,
  packsForCategory,
  describePackContents,
  buyPlanHref,
} from "./library-pack";

const plan = (o: Partial<Parameters<typeof buildLibraryPacks>[0][number]>) => ({
  id: "p1",
  name: "Pack 4 clases",
  amountCents: 15990,
  currency: "CLP",
  type: "ON_DEMAND",
  validityDays: null,
  validityPeriod: null,
  ...o,
});
const categories = [
  { id: "yoga", name: "Yoga" },
  { id: "med", name: "Meditaciones" },
];

describe("buildLibraryPacks", () => {
  it("arma packs ON_DEMAND con sus cuotas por categoría publicada", () => {
    const [pack] = buildLibraryPacks(
      [plan({})],
      [
        { planId: "p1", categoryId: "yoga", maxLessons: 3 },
        { planId: "p1", categoryId: "med", maxLessons: 1 },
        { planId: "p1", categoryId: "draft", maxLessons: 2 },
      ],
      categories
    );
    expect(pack.includes.map((i) => i.categoryName)).toEqual(["Yoga", "Meditaciones"]);
    expect(pack.lifetime).toBe(true);
    expect(pack.unlimited).toBe(false);
  });

  it("ignora planes LIVE y ON_DEMAND sin categorías publicadas", () => {
    const packs = buildLibraryPacks(
      [plan({ id: "live", type: "LIVE" }), plan({ id: "empty" })],
      [{ planId: "empty", categoryId: "draft", maxLessons: 1 }],
      categories
    );
    expect(packs).toEqual([]);
  });

  it("MEMBERSHIP_ON_DEMAND es ilimitado y con vigencia no es lifetime", () => {
    const [pack] = buildLibraryPacks(
      [plan({ id: "m", type: "MEMBERSHIP_ON_DEMAND", validityPeriod: "MONTHLY" })],
      [],
      categories
    );
    expect(pack.unlimited).toBe(true);
    expect(pack.lifetime).toBe(false);
  });
});

describe("packsForCategory", () => {
  it("incluye packs que cubren la categoría y los ilimitados", () => {
    const packs = buildLibraryPacks(
      [plan({ id: "a" }), plan({ id: "m", type: "MEMBERSHIP_ON_DEMAND" })],
      [{ planId: "a", categoryId: "yoga", maxLessons: 3 }],
      categories
    );
    expect(packsForCategory(packs, "yoga").map((p) => p.planId)).toEqual(["a", "m"]);
    expect(packsForCategory(packs, "med").map((p) => p.planId)).toEqual(["m"]);
  });
});

describe("describePackContents", () => {
  it("describe cuotas con singular/plural", () => {
    expect(
      describePackContents({
        unlimited: false,
        includes: [
          { categoryId: "yoga", categoryName: "Yoga", maxLessons: 3 },
          { categoryId: "med", categoryName: "Meditaciones", maxLessons: 1 },
        ],
      })
    ).toBe("3 clases de Yoga + 1 clase de Meditaciones");
    expect(describePackContents({ unlimited: true, includes: [] })).toBe("Acceso a toda la biblioteca");
  });
});

describe("buyPlanHref", () => {
  it("arma el link de compra vía login a la tienda", () => {
    expect(buyPlanHref("abc")).toBe("/auth/login?callbackUrl=%2Fpanel%2Ftienda%3Fplan%3Dabc");
  });
});
