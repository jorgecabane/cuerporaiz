/**
 * Formato de montos guardados en "centavos" (unidad mínima de la moneda).
 * CLP no tiene decimales: amountCents ya son pesos.
 */
export function formatMoney(amountCents: number, currency = "CLP"): string {
  if (currency === "CLP") return `$${amountCents.toLocaleString("es-CL")}`;
  return `${(amountCents / 100).toFixed(2)} ${currency}`;
}

/** Igual que formatMoney, pero 0 se muestra como "Gratis" (eventos). */
export function formatPriceOrFree(amountCents: number, currency = "CLP"): string {
  return amountCents === 0 ? "Gratis" : formatMoney(amountCents, currency);
}
