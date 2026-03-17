import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminRole } from "@/lib/domain/role";
import { centerRepository } from "@/lib/adapters/db";
import { BankTransferForm } from "./BankTransferForm";

export default async function TransferenciaPluginPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/plugins/transferencia");
  if (!isAdminRole(session.user.role)) redirect("/panel");

  const centerId = session.user.centerId;
  const center = await centerRepository.findById(centerId);
  if (!center) redirect("/panel");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href="/panel/plugins"
        className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] mb-4 inline-block"
      >
        &larr; Plugins
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[#2D3B2A] flex items-center justify-center">
          <span className="text-white font-bold">TB</span>
        </div>
        <div>
          <h1 className="font-display text-section text-[var(--color-primary)]">
            Transferencia bancaria
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">Pagos por transferencia</p>
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)]">
        <BankTransferForm center={center} />
      </div>
    </div>
  );
}
