export const MANUAL_PAYMENT_METHODS = [
  { value: "transfer", label: "Transferencia" },
  { value: "cash", label: "Efectivo" },
  { value: "other", label: "Otro" },
];

export const manualPaymentMethodLabel = (method: string) =>
  MANUAL_PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
