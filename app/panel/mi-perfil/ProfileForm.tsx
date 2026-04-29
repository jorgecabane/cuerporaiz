"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SanityImagePicker } from "@/components/panel/SanityImagePicker";

interface ProfileFormProps {
  user: {
    name?: string | null;
    lastName?: string | null;
    phone?: string | null;
    rut?: string | null;
    birthday?: string | null;
    sex?: string | null;
    imageUrl?: string | null;
  };
}

const inputCls = "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]";
const labelCls = "block text-xs font-medium text-[var(--color-text)] mb-1";

export default function ProfileForm({ user }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(user.imageUrl ?? null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    setSuccess(false);

    const body: Record<string, string | null> = { imageUrl };
    for (const key of ["name", "lastName", "phone", "rut", "birthday", "sex"]) {
      const val = (fd.get(key) as string)?.trim();
      if (val !== undefined) body[key] = val || null;
    }

    startTransition(async () => {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Error al guardar");
      } else {
        setSuccess(true);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelCls}>Foto de perfil</label>
        <SanityImagePicker
          value={imageUrl}
          onChange={setImageUrl}
          label="Foto de perfil"
          mode="upload-only"
          uploadEndpoint="/api/me/sanity-upload"
          aspect="square"
          imageKind="instructor"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="prof-name" className={labelCls}>Nombre</label>
          <input id="prof-name" name="name" defaultValue={user.name ?? ""} className={inputCls} />
        </div>
        <div>
          <label htmlFor="prof-lastName" className={labelCls}>Apellido</label>
          <input id="prof-lastName" name="lastName" defaultValue={user.lastName ?? ""} className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="prof-phone" className={labelCls}>Teléfono</label>
          <input id="prof-phone" name="phone" type="tel" defaultValue={user.phone ?? ""} className={inputCls} />
        </div>
        <div>
          <label htmlFor="prof-rut" className={labelCls}>RUT</label>
          <input id="prof-rut" name="rut" defaultValue={user.rut ?? ""} className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="prof-birthday" className={labelCls}>Fecha de nacimiento</label>
          <input id="prof-birthday" name="birthday" type="date" defaultValue={user.birthday ?? ""} className={inputCls} />
        </div>
        <div>
          <label htmlFor="prof-sex" className={labelCls}>Sexo</label>
          <select id="prof-sex" name="sex" defaultValue={user.sex ?? ""} className={inputCls}>
            <option value="">—</option>
            <option value="F">Femenino</option>
            <option value="M">Masculino</option>
            <option value="X">Otro</option>
          </select>
        </div>
      </div>

      {error && <p className="text-xs text-[var(--color-error,#dc2626)]">{error}</p>}
      {success && <p className="text-xs text-green-600">Datos actualizados</p>}

      <button
        type="submit"
        disabled={isPending}
        className="text-sm px-4 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
