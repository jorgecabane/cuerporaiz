export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2026-04-23";
export const readToken = process.env.SANITY_API_READ_TOKEN;
export const writeToken = process.env.SANITY_API_WRITE_TOKEN;
export const studioUrl = "/studio";

export function isSanityConfigured(): boolean {
  return Boolean(projectId);
}

export function assertProjectId(): string {
  if (!projectId) {
    throw new Error(
      "Missing NEXT_PUBLIC_SANITY_PROJECT_ID. Ver docs/sanity-setup.md para configurar Sanity.",
    );
  }
  return projectId;
}
