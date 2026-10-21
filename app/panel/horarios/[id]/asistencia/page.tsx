import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole, isInstructorRole } from "@/lib/domain/role";
import { listClassAttendanceUseCase } from "@/lib/application/attendance";
import { AttendanceClient } from "./AttendanceClient";

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.centerId) redirect("/auth/login?callbackUrl=/panel/horarios");

  const role = session.user.role;
  if (!isAdminRole(role) && !isInstructorRole(role)) redirect("/panel");

  const { id: liveClassId } = await params;
  const result = await listClassAttendanceUseCase(liveClassId, session.user.centerId);
  const attendees = result.success && result.attendees ? result.attendees : [];

  return (
    <AttendanceClient
      liveClassId={liveClassId}
      initialAttendees={attendees}
    />
  );
}
