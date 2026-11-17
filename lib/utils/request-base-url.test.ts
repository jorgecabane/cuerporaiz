import { describe, it, expect } from "vitest";
import { requestBaseUrl } from "./request-base-url";

const h = (init: Record<string, string>) => new Headers(init);

describe("requestBaseUrl", () => {
  it("usa x-forwarded-proto y x-forwarded-host (Vercel)", () => {
    expect(requestBaseUrl(h({ "x-forwarded-proto": "https", "x-forwarded-host": "cuerporaiz.cl", host: "interno" }))).toBe(
      "https://cuerporaiz.cl"
    );
  });

  it("toma el primer valor de headers con lista separada por comas", () => {
    expect(requestBaseUrl(h({ "x-forwarded-proto": "https, http", "x-forwarded-host": "a.cl, b.cl" }))).toBe("https://a.cl");
  });

  it("sin x-forwarded-host cae al host", () => {
    expect(requestBaseUrl(h({ host: "localhost:3001" }))).toBe("http://localhost:3001");
  });

  it("con la URL del request, el proto y host salen de ahí si faltan headers", () => {
    expect(requestBaseUrl(h({}), "https://preview.vercel.app/api/checkout")).toBe("https://preview.vercel.app");
  });

  it("sin headers ni URL cae a http://localhost:3000", () => {
    expect(requestBaseUrl(h({}))).toBe("http://localhost:3000");
  });
});
