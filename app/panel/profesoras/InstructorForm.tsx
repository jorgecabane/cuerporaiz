"use client";

import { useFormStatus } from "react-dom";
import { createInstructor, updateInstructor } from "./actions";
import { Button } from "@/components/ui/Button";
import type { Instructor } from "@/lib/ports";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
    >
      {pending ? "Guardando…" : label}
    </button>
  );
}

export function InstructorForm({ instructor }: { instructor?: Instructor }) {
  const action = instructor ? updateInstructor : createInstructor;
  const isEditing = !!instructor;

  return (
    <form action={action} className="space-y-4">
      {instructor && <input type="hidden" name="id" value={instructor.id} />}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Nombre
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={instructor?.name ?? ""}
          placeholder="ej. María García"
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required={!isEditing}
          disabled={isEditing}
          defaultValue={instructor?.email ?? ""}
          placeholder="ej. maria@cuerporaiz.com"
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)] disabled:opacity-60 disabled:cursor-not-allowed"
        />
        {isEditing && (
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            El email no se puede modificar.
          </p>
        )}
      </div>
      <div>
        <label htmlFor="imageUrl" className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Imagen de perfil (URL)
        </label>
        <div className="flex flex-wrap items-start gap-3">
          {isEditing && instructor?.imageUrl && (
            <img
              src={instructor.imageUrl}
              alt=""
              className="h-14 w-14 rounded-full object-cover border border-[var(--color-border)]"
              width={56}
              height={56}
            />
          )}
          <input
            id="imageUrl"
            name="imageUrl"
            type="url"
            defaultValue={instructor?.imageUrl ?? ""}
            placeholder="https://…"
            className="flex-1 min-w-0 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
          />
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          Opcional. URL de una imagen para mostrar como avatar en las clases.
        </p>
      </div>
      <div className="flex gap-3 pt-2">
        <SubmitButton label={isEditing ? "Guardar cambios" : "Agregar profesora"} />
        <Button href="/panel/profesoras" variant="secondary">
          Cancelar
        </Button>
      </div>
    </form>
  );
}
