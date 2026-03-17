import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import { instructorBankAccountRepository, instructorRepository } from "@/lib/adapters/db";
import { Button } from "@/components/ui/Button";
import { InstructorForm } from "../../InstructorForm";
import { InstructorBankAccountForm } from "../../InstructorBankAccountForm";

export default async function EditarProfesoraPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/profesoras");
  if (!isAdminRole(session.user.role)) redirect("/panel");
  const { id } = await params;
  const instructor = await instructorRepository.findById(id, session.user.centerId as string);
  if (!instructor) redirect("/panel/profesoras");
  const bank = await instructorBankAccountRepository.findByCenterIdAndUserId(
    session.user.centerId as string,
    instructor.userId
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-section text-[var(--color-primary)] mb-2">
        Editar profesora
      </h1>
      <p className="text-[var(--color-text-muted)] mb-6">
        Modificá los datos de esta profesora.
      </p>

      <div className="space-y-6">
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)]">
          <InstructorForm instructor={instructor} />
        </div>

        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)]">
          <h2 className="text-sm font-medium text-[var(--color-text)] mb-2">
            Datos bancarios (depósito)
          </h2>
          <InstructorBankAccountForm
            instructorUserId={instructor.userId}
            defaultValues={{
              bankName: bank?.bankName ?? null,
              bankAccountType: bank?.bankAccountType ?? null,
              bankAccountNumber: bank?.bankAccountNumber ?? null,
              bankAccountHolder: bank?.bankAccountHolder ?? null,
              bankAccountRut: bank?.bankAccountRut ?? null,
              bankAccountEmail: bank?.bankAccountEmail ?? null,
            }}
          />
        </div>
      </div>
      <div className="mt-6">
        <Button href="/panel/profesoras" variant="secondary">
          Volver a profesoras
        </Button>
      </div>
    </div>
  );
}
