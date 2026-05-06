"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import {
  approveOrderManually,
  approveEventTicketManually,
  rejectTransferOrderAction,
  rejectTransferEventTicketAction,
} from "./actions";

type Kind = "order" | "ticket";

interface ApproveProps {
  kind: Kind;
  id: string;
  buyerName: string;
  itemName: string;
  amountFormatted: string;
}

const inputCls =
  "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

export function ApproveTransferButton(props: ApproveProps) {
  const [open, setOpen] = useState(false);
  const action =
    props.kind === "order" ? approveOrderManually : approveEventTicketManually;
  const idField = props.kind === "order" ? "orderId" : "ticketId";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer rounded-[var(--radius-md)] bg-[var(--color-success)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-success-hover)]"
      >
        Aprobar
      </button>
      {open && (
        <Modal title="Aprobar transferencia" onClose={() => setOpen(false)}>
          <p className="mb-3 text-sm text-[var(--color-text)]">
            <strong>{props.itemName}</strong> · {props.amountFormatted}
          </p>
          <p className="mb-4 text-sm text-[var(--color-text-muted)]">
            {props.buyerName}
          </p>
          <form action={action} className="space-y-4">
            <input type="hidden" name={idField} value={props.id} readOnly />
            {props.kind === "order" && (
              <input type="hidden" name="method" value="transfer" readOnly />
            )}
            <div>
              <label
                htmlFor={`approve-note-${props.id}`}
                className="block text-sm font-medium text-[var(--color-text)] mb-1"
              >
                Nota <span className="text-[var(--color-text-muted)]">(opcional)</span>
              </label>
              <input
                id={`approve-note-${props.id}`}
                name="note"
                type="text"
                placeholder="Ej: confirmé el depósito en cuenta"
                className={inputCls}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-border)]"
              >
                Cancelar
              </button>
              <SubmitButton label="Confirmar aprobación" pendingLabel="Guardando..." variant="success" />
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

interface RejectProps {
  kind: Kind;
  id: string;
  itemName: string;
}

export function RejectTransferButton(props: RejectProps) {
  const [open, setOpen] = useState(false);
  const action =
    props.kind === "order" ? rejectTransferOrderAction : rejectTransferEventTicketAction;
  const idField = props.kind === "order" ? "orderId" : "ticketId";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-error)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-error-text)] hover:bg-[var(--color-error-bg)]"
      >
        Rechazar
      </button>
      {open && (
        <Modal title="Rechazar transferencia" onClose={() => setOpen(false)}>
          <p className="mb-4 text-sm text-[var(--color-text-muted)]">
            <strong className="text-[var(--color-text)]">{props.itemName}</strong> · el motivo se le envía
            literal a la estudiante por mail. Mínimo 10 caracteres.
          </p>
          <form action={action} className="space-y-4">
            <input type="hidden" name={idField} value={props.id} readOnly />
            <div>
              <label
                htmlFor={`reject-reason-${props.id}`}
                className="block text-sm font-medium text-[var(--color-text)] mb-1"
              >
                Motivo del rechazo
              </label>
              <textarea
                id={`reject-reason-${props.id}`}
                name="reason"
                rows={3}
                required
                minLength={10}
                placeholder="Ej: el monto recibido fue $19.900 en lugar de $29.900"
                className={`${inputCls} resize-none`}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-border)]"
              >
                Cancelar
              </button>
              <SubmitButton label="Confirmar rechazo" pendingLabel="Rechazando..." variant="error" />
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function SubmitButton({
  label,
  pendingLabel,
  variant,
}: {
  label: string;
  pendingLabel: string;
  variant: "success" | "error";
}) {
  const { pending } = useFormStatus();
  const cls =
    variant === "success"
      ? "bg-[var(--color-success)] hover:bg-[var(--color-success-hover)]"
      : "bg-[var(--color-error)] hover:bg-[#b91c1c]";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`cursor-pointer rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${cls}`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
