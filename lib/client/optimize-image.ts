import imageCompression from "browser-image-compression";
import { IMAGE_PRESETS, type ImageKind } from "./image-presets";

export const HARD_MAX_BYTES = 50 * 1024 * 1024;

export class ImageTooLargeError extends Error {
  constructor() {
    super("La imagen es demasiado grande. Máximo 50MB antes de optimizar.");
    this.name = "ImageTooLargeError";
  }
}

export async function optimizeImage(file: File, kind: ImageKind = "default"): Promise<File> {
  if (file.size > HARD_MAX_BYTES) {
    throw new ImageTooLargeError();
  }

  const preset = IMAGE_PRESETS[kind];
  const fileType = preset.output === "webp" ? "image/webp" : file.type;

  const compressed = await imageCompression(file, {
    maxSizeMB: preset.targetSizeMB,
    maxWidthOrHeight: preset.maxDimension,
    useWebWorker: true,
    fileType,
    initialQuality: preset.initialQuality,
  });

  if (compressed instanceof File) return compressed;
  const name = renameExtension(file.name, fileType);
  return new File([compressed], name, { type: fileType });
}

function renameExtension(name: string, mime: string): string {
  const ext = mime === "image/webp" ? "webp" : mime === "image/png" ? "png" : "jpg";
  const base = name.replace(/\.[^.]+$/, "");
  return `${base || "image"}.${ext}`;
}
