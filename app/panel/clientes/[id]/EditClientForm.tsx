"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateClient } from "../actions";

interface Props {
  userId: string;
  currentName: string | null;
  currentLastName: string | null;
  currentEmail: string;
  currentPhone: string | null;
  currentRut: string | null;
  currentBirthday: string | null;
  currentSex: string | null;
  currentNotes: string | null;
}

export function EditClientForm({
  userId,
  currentName,
  currentLastName,
  currentEmail,
  currentPhone,
  currentRut,
  currentBirthday,
  currentSex,
  currentNotes,
}: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await updateClient({
        userId,
        name: (fd.get("name") as string)?.trim(),
        lastName: (fd.get("lastName") as string)?.trim(),
        email: (fd.get("email") as string)?.trim(),
        phone: (fd.get("phone") as string)?.trim(),
        rut: (fd.get("rut") as string)?.trim(),
        birthday: (fd.get("birthday") as string)?.trim(),
        sex: (fd.get("sex") as string)?.trim(),
        notes: (fd.get("notes") as string)?.trim(),
      });
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-[var(--color-primary)] hover:underline"
      >
        Editar datos
      </button>
    );
  }

  const inputCls =
    "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]";

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 rounded-[var(--radius-md)] border border-[var(--color-border,#e5e7eb)] p-4 space-y-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="edit-name" className="block text-xs font-medium text-[var(--color-text)] mb-1">
            Nombre
          </label>
          <input id="edit-name" name="name" type="text" defaultValue={currentName ?? ""} className={inputCls} />
        </div>
        <div>
          <label htmlFor="edit-lastName" className="block text-xs font-medium text-[var(--color-text)] mb-1">
            Apellido
          </label>
          <input id="edit-lastName" name="lastName" type="text" defaultValue={currentLastName ?? ""} className={inputCls} />
        </div>
      </div>

      <div>
        <label htmlFor="edit-email" className="block text-xs font-medium text-[var(--color-text)] mb-1">
          Email
        </label>
        <input id="edit-email" name="email" type="email" required defaultValue={currentEmail} className={inputCls} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="edit-phone" className="block text-xs font-medium text-[var(--color-text)] mb-1">
            Teléfono
          </label>
          <input id="edit-phone" name="phone" type="tel" defaultValue={currentPhone ?? ""} placeholder="+56 9 1234 5678" className={inputCls} />
        </div>
        <div>
          <label htmlFor="edit-rut" className="block text-xs font-medium text-[var(--color-text)] mb-1">
            RUT
          </label>
          <input id="edit-rut" name="rut" type="text" defaultValue={currentRut ?? ""} placeholder="12.345.678-9" className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="edit-birthday" className="block text-xs font-medium text-[var(--color-text)] mb-1">
            Fecha de nacimiento
          </label>
          <input id="edit-birthday" name="birthday" type="date" defaultValue={currentBirthday ?? ""} className={inputCls} />
        </div>
        <div>
          <label htmlFor="edit-sex" className="block text-xs font-medium text-[var(--color-text)] mb-1">
            Sexo
          </label>
          <select id="edit-sex" name="sex" defaultValue={currentSex ?? ""} className={inputCls}>
            <option value="">—</option>
            <option value="F">Femenino</option>
            <option value="M">Masculino</option>
            <option value="X">Otro</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="edit-notes" className="block text-xs font-medium text-[var(--color-text)] mb-1">
          Observaciones
        </label>
        <textarea
          id="edit-notes"
          name="notes"
          rows={2}
          defaultValue={currentNotes ?? ""}
          className={inputCls}
        />
      </div>

      {error && <p className="text-xs text-[var(--color-error,#dc2626)]">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="text-sm px-4 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm px-4 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border,#e5e7eb)] text-[var(--color-text-muted)]"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
