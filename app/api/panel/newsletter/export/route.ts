import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain/role";
import { newsletterSubscriberRepository } from "@/lib/adapters/db";
import { toSubscribersCsv } from "@/lib/domain/newsletter";

export async function GET() {
  const session = await auth();
  if (!session?.user?.centerId || !isAdminRole(session.user.role)) {
    return new Response("No autorizado", { status: 401 });
  }
  const subscribers = await newsletterSubscriberRepository.listByCenter(session.user.centerId);
  return new Response(toSubscribersCsv(subscribers), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="suscriptores-newsletter.csv"',
    },
  });
}
