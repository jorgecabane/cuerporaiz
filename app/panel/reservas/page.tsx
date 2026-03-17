import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { centerRepository } from "@/lib/adapters/db";
import { ReservasPanel } from "./ReservasPanel";

export default async function PanelReservasPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/panel/reservas");
  }
  const centerId = session.user.centerId as string;
  const center = await centerRepository.findById(centerId);
  const weekStartDay = center?.calendarWeekStartDay ?? 1;

  return (
    <ReservasPanel
      role={session.user.role}
      centerId={centerId}
      weekStartDay={weekStartDay}
    />
  );
}
