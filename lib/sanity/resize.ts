import sharp from "sharp";

export type ResizeResult = {
  buffer: Buffer;
  format: "webp";
  width: number;
  height: number;
};

/**
 * Reescala una imagen a un bounding box de `maxDimension` x `maxDimension` manteniendo
 * aspect ratio. Convierte a WebP (calidad 85) para reducir peso sin pérdida perceptible.
 *
 * Úsalo antes de subir a Sanity CDN para evitar que usuarios suban fotos de 20MB.
 */
export async function resizeImage(
  input: ArrayBuffer | Buffer,
  maxDimension: number,
): Promise<ResizeResult> {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);

  const pipeline = sharp(buffer, { failOn: "error" })
    .rotate()
    .resize({
      width: maxDimension,
      height: maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 85 });

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  return {
    buffer: data,
    format: "webp",
    width: info.width,
    height: info.height,
  };
}
