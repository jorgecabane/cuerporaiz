import { describe, it, expect } from "vitest";
import { CONTENT_STATUS_LABELS } from "./on-demand";

describe("CONTENT_STATUS_LABELS", () => {
  it("tiene labels para DRAFT y PUBLISHED", () => {
    expect(CONTENT_STATUS_LABELS.DRAFT).toBe("Borrador");
    expect(CONTENT_STATUS_LABELS.PUBLISHED).toBe("Publicado");
  });
});
