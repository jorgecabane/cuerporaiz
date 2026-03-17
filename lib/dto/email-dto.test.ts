import { describe, it, expect } from "vitest";
import { sendEmailDtoSchema } from "./email-dto";

describe("email-dto schema", () => {
  it("valida payload mínimo", () => {
    const parsed = sendEmailDtoSchema.parse({
      from: "noreply@cuerporaiz.cl",
      to: ["a@b.com"],
      subject: "Hola",
      html: "<p>test</p>",
    });
    expect(parsed.to[0]).toBe("a@b.com");
  });
});

