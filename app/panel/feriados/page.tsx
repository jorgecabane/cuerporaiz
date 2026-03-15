import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import { centerHolidayRepository } from "@/lib/adapters/db";
import { HolidayList } from "./HolidayList";

export default async function FeriadosPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/feriados");
  if (!isAdminRole(session.user.role)) redirect("/panel");
  const centerId = session.user.centerId as string;

  const holidays = await centerHolidayRepository.findByCenterId(centerId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-section text-[var(--color-primary)] mb-2">
        Feriados
      </h1>
      <p className="text-[var(--color-text-muted)] mb-6">
        Los días feriados no muestran clases en el calendario y bloquean la creación de nuevas.
      </p>
      <HolidayList holidays={holidays} />
    </div>
  );
}
