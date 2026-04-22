"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "@/components/ui/Toast";

const MESSAGES: Record<string, string> = {
  has_dependents: "No se pudo eliminar el plan: tiene alumnos u órdenes activas. Deshabilítalo en su lugar.",
  delete_failed: "No se pudo eliminar el plan. Intenta deshabilitarlo.",
  slug: "Ese identificador ya existe en este centro.",
};

export function PlanesPageErrorBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const error = searchParams.get("error");

  useEffect(() => {
    if (!error) return;
    const msg = MESSAGES[error] ?? "Ocurrió un error.";
    toast.error(msg);
    router.replace(pathname);
  }, [error, pathname, router]);

  return null;
}
