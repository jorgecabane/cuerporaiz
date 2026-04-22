"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { GripVertical, Star } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";

import { reorderPlans } from "./actions";
import { DeletePlanForm } from "./DeletePlanForm";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

type PlanRow = {
  id: string;
  name: string;
  slug: string;
  type: string;
  amountCents: number;
  currency: string;
  isPopular: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  LIVE: "En vivo",
  ON_DEMAND: "Biblioteca virtual",
  MEMBERSHIP_ON_DEMAND: "Membresía biblioteca virtual",
};

function formatPrice(cents: number, currency: string): string {
  if (currency === "CLP") return `$${cents.toLocaleString("es-CL")}`;
  return `${cents / 100} ${currency}`;
}

export function PlanesSortableList({ initialPlans }: { initialPlans: PlanRow[] }) {
  const [items, setItems] = useState<PlanRow[]>(initialPlans);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((p) => p.id === active.id);
    const newIndex = items.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items, oldIndex, newIndex);
    const prev = items;
    setItems(next);
    startTransition(async () => {
      try {
        await reorderPlans(next.map((p) => p.id));
      } catch {
        setItems(prev);
        toast.error("No se pudo guardar el nuevo orden");
      }
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
    >
      <SortableContext items={items.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-3">
          {items.map((plan) => (
            <SortablePlanRow key={plan.id} plan={plan} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortablePlanRow({ plan }: { plan: PlanRow }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: plan.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-md)] flex flex-wrap items-center gap-3"
    >
      <button
        type="button"
        aria-label={`Reordenar ${plan.name}`}
        className="cursor-grab touch-none rounded-[var(--radius-sm)] p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-tertiary)] active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" aria-hidden />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-semibold text-[var(--color-text)]">{plan.name}</h2>
          {plan.isPopular && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-secondary)] px-2 py-0.5 text-xs font-medium text-white">
              <Star className="h-3 w-3" aria-hidden /> Popular
            </span>
          )}
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">
          {TYPE_LABELS[plan.type] ?? plan.type} · {plan.slug} ·{" "}
          {formatPrice(plan.amountCents, plan.currency)}
        </p>
      </div>
      <div className="flex gap-2">
        <Link
          href={`/panel/planes/${plan.id}/editar`}
          className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-tertiary)]"
        >
          Editar
        </Link>
        <DeletePlanForm planId={plan.id} planName={plan.name} />
      </div>
    </li>
  );
}
