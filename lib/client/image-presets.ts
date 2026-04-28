export type ImageKind =
  | "hero"
  | "cover"
  | "event"
  | "gallery"
  | "lesson"
  | "practice"
  | "category"
  | "instructor"
  | "section-item"
  | "logo"
  | "favicon"
  | "default";

export type ImagePreset = {
  maxDimension: number;
  targetSizeMB: number;
  output: "webp" | "preserve";
  initialQuality: number;
};

export const IMAGE_PRESETS: Record<ImageKind, ImagePreset> = {
  hero: { maxDimension: 2400, targetSizeMB: 3, output: "webp", initialQuality: 0.92 },
  cover: { maxDimension: 2000, targetSizeMB: 2.5, output: "webp", initialQuality: 0.92 },
  event: { maxDimension: 2000, targetSizeMB: 2.5, output: "webp", initialQuality: 0.9 },
  gallery: { maxDimension: 1800, targetSizeMB: 2, output: "webp", initialQuality: 0.9 },
  lesson: { maxDimension: 1800, targetSizeMB: 2, output: "webp", initialQuality: 0.9 },
  practice: { maxDimension: 1600, targetSizeMB: 1.5, output: "webp", initialQuality: 0.9 },
  category: { maxDimension: 1400, targetSizeMB: 1.2, output: "webp", initialQuality: 0.9 },
  instructor: { maxDimension: 1200, targetSizeMB: 1, output: "webp", initialQuality: 0.9 },
  "section-item": { maxDimension: 1400, targetSizeMB: 1.5, output: "webp", initialQuality: 0.9 },
  logo: { maxDimension: 1024, targetSizeMB: 0.8, output: "preserve", initialQuality: 0.95 },
  favicon: { maxDimension: 512, targetSizeMB: 0.2, output: "preserve", initialQuality: 0.95 },
  default: { maxDimension: 1800, targetSizeMB: 2, output: "webp", initialQuality: 0.9 },
};
