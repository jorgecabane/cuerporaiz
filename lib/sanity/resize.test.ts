import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { resizeImage } from "./resize";

async function makeTestImage(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 100, g: 150, b: 200 },
    },
  })
    .png()
    .toBuffer();
}

describe("resizeImage", () => {
  it("reduces dimensions to the bounding box", async () => {
    const input = await makeTestImage(2000, 1000);
    const result = await resizeImage(input, 800);
    expect(result.width).toBeLessThanOrEqual(800);
    expect(result.height).toBeLessThanOrEqual(800);
    expect(result.width).toBe(800);
    expect(result.height).toBe(400);
  });

  it("preserves aspect ratio on portrait images", async () => {
    const input = await makeTestImage(600, 1200);
    const result = await resizeImage(input, 800);
    expect(result.height).toBeLessThanOrEqual(800);
    expect(result.width).toBe(400);
    expect(result.height).toBe(800);
  });

  it("does not enlarge images smaller than maxDimension", async () => {
    const input = await makeTestImage(400, 300);
    const result = await resizeImage(input, 800);
    expect(result.width).toBe(400);
    expect(result.height).toBe(300);
  });

  it("outputs webp format", async () => {
    const input = await makeTestImage(1000, 1000);
    const result = await resizeImage(input, 800);
    expect(result.format).toBe("webp");
    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.format).toBe("webp");
  });

  it("accepts ArrayBuffer input", async () => {
    const input = await makeTestImage(500, 500);
    const arrayBuffer = input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
    const result = await resizeImage(arrayBuffer as ArrayBuffer, 400);
    expect(result.width).toBe(400);
  });
});
