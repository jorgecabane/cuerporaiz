import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import { listClassAttendanceUseCase } from "@/lib/application/attendance";
import { AttendanceClient } from "./AttendanceClient";

export default async function AttendancePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.centerId) redirect("/auth/login?callbackUrl=/panel/horarios");

  const role = session.user.role;
  if (!isAdminRole(role) && role !== "INSTRUCTOR") redirect("/panel");

  const liveClassId = params.id;
  const result = await listClassAttendanceUseCase(liveClassId, session.user.centerId);
  const attendees = result.success && result.attendees ? result.attendees : [];

  return (
    <AttendanceClient
      liveClassId={liveClassId}
      initialAttendees={attendees}
    />
  );
}
