"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LiveClassDto } from "@/lib/dto/reservation-dto";
import { AdaptiveSheet } from "@/components/ui/AdaptiveSheet";
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from "./Tabs";

const TAB_HOY = "hoy";
const TAB_PROXIMAS = "proximas";
const TAB_HISTORICAS = "historicas";

function getDayStart(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function getDayEnd(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function segmentClasses(items: LiveClassDto[]): {
  hoy: LiveClassDto[];
  proximas: LiveClassDto[];
  historicas: LiveClassDto[];
} {
  const now = new Date();
  const todayStart = getDayStart(now);
  const todayEnd = getDayEnd(now);
  const hoy: LiveClassDto[] = [];
  const proximas: LiveClassDto[] = [];
  const historicas: LiveClassDto[] = [];
  for (const c of items) {
    const start = new Date(c.startsAt);
    if (start >= todayStart && start <= todayEnd) hoy.push(c);
    else if (start > todayEnd) proximas.push(c);
    else historicas.push(c);
  }
  const sortByStart = (a: LiveClassDto, b: LiveClassDto) =>
    new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
  hoy.sort(sortByStart);
  proximas.sort(sortByStart);
  historicas.sort(sortByStart);
  return { hoy, proximas, historicas };
}

function ClassRow({ c }: { c: LiveClassDto }) {
  const start = new Date(c.startsAt);
  const dateStr = start.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" });
  const timeStr = start.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <p className="font-medium text-[var(--color-text)]">{c.title}</p>
      <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
        {dateStr} · {timeStr}
        {c.durationMinutes ? ` (${c.durationMinutes} min)` : ""}
      </p>
    </div>
  );
}

export interface MisClasesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MisClasesSheet({ open, onOpenChange }: MisClasesSheetProps) {
  const [items, setItems] = useState<LiveClassDto[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const from = new Date();
      from.setMonth(from.getMonth() - 1);
      const to = new Date();
      to.setMonth(to.getMonth() + 3);
      const res = await fetch(
        `/api/panel/staff/calendar-classes?from=${from.toISOString()}&to=${to.toISOString()}`
      );
      if (!res.ok) throw new Error("Error al cargar clases");
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchClasses();
  }, [open, fetchClasses]);

  const segmented = useMemo(() => segmentClasses(items), [items]);

  return (
    <AdaptiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Mis clases"
      variant="auto"
    >
      <div className="px-4 py-5 pb-6">
        {loading ? (
          <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
            Cargando clases…
          </p>
        ) : (
          <TabsRoot defaultValue={TAB_HOY} aria-label="Tabs de mis clases">
            <TabsList className="mb-2">
              <TabsTrigger value={TAB_HOY} id="mis-clases-hoy">
                Hoy
              </TabsTrigger>
              <TabsTrigger value={TAB_PROXIMAS} id="mis-clases-proximas">
                Próximas
              </TabsTrigger>
              <TabsTrigger value={TAB_HISTORICAS} id="mis-clases-historicas">
                Históricas
              </TabsTrigger>
            </TabsList>
            <TabsContent value={TAB_HOY} className="pt-2 space-y-2">
              {segmented.hoy.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">No tienes clases hoy.</p>
              ) : (
                segmented.hoy.map((c) => <ClassRow key={c.id} c={c} />)
              )}
            </TabsContent>
            <TabsContent value={TAB_PROXIMAS} className="pt-2 space-y-2">
              {segmented.proximas.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">No tienes próximas clases.</p>
              ) : (
                segmented.proximas.map((c) => <ClassRow key={c.id} c={c} />)
              )}
            </TabsContent>
            <TabsContent value={TAB_HISTORICAS} className="pt-2 space-y-2">
              {segmented.historicas.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">No hay historial de clases.</p>
              ) : (
                segmented.historicas.map((c) => <ClassRow key={c.id} c={c} />)
              )}
            </TabsContent>
          </TabsRoot>
        )}
      </div>
    </AdaptiveSheet>
  );
}
