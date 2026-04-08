"use client";

import { useState, useEffect } from "react";
import { toast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";

type Student = {
  id: string;
  name: string | null;
  email: string;
};

export function ManualTicketForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/panel/staff/students")
      .then((r) => r.json())
      .then((data: Student[]) => setStudents(data))
      .catch(() => toast.error("No se pudieron cargar los estudiantes"))
      .finally(() => setLoadingStudents(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/manual-ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === "ALREADY_PURCHASED") {
          toast.error("El estudiante ya tiene una entrada para este evento");
        } else if (data.code === "EVENT_FULL") {
          toast.error("El evento está lleno");
        } else {
          toast.error(data.message ?? "Error al registrar la entrada");
        }
        return;
      }

      toast.success("Entrada registrada correctamente");
      setSelectedUserId("");
      router.refresh();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="manual-ticket-student"
          className="block text-sm font-medium text-[var(--color-text)] mb-1"
        >
          Estudiante
        </label>
        {loadingStudents ? (
          <div className="h-9 w-full animate-pulse rounded-[var(--radius-md)] bg-[var(--color-border)]" />
        ) : (
          <select
            id="manual-ticket-student"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            required
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="">Seleccionar estudiante…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name ? `${s.name} (${s.email})` : s.email}
              </option>
            ))}
          </select>
        )}
      </div>

      <button
        type="submit"
        disabled={!selectedUserId || submitting || loadingStudents}
        className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        {submitting ? "Registrando…" : "Registrar entrada"}
      </button>
    </form>
  );
}
