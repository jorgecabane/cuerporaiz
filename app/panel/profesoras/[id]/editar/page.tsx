import { redirect } from "next/navigation";

export default async function ProfesoresEditarRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/panel/profesores/${id}/editar`);
}

