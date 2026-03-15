import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import { centerRepository, disciplineRepository, instructorRepository } from "@/lib/adapters/db";
import { CalendarShell } from "./CalendarShell";

export default async function PanelHorariosPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/horarios");
  if (!isAdminRole(session.user.role)) redirect("/panel");

  const centerId = session.user.centerId as string;
  const [center, disciplines, instructors] = await Promise.all([
    centerRepository.findById(centerId),
    disciplineRepository.findActiveByCenterId(centerId),
    instructorRepository.findByCenterId(centerId),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <CalendarShell
        centerId={centerId}
        calendarStartHour={center?.calendarStartHour ?? 7}
        calendarEndHour={center?.calendarEndHour ?? 22}
        weekStartDay={center?.calendarWeekStartDay ?? 1}
        disciplines={disciplines}
        instructors={instructors}
      />
    </div>
  );
}
