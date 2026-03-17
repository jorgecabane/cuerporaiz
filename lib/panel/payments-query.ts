export type PaymentsType = "checkout" | "manual";
export type PaymentsDatePreset = "today" | "last7" | "thisMonth" | "custom";

export interface PaymentsSearchParamsInput {
  type?: string;
  status?: string;
  email?: string;
  datePreset?: string;
  from?: string;
  to?: string;
  page?: string;
}

export interface PaymentsSearchParams {
  type: PaymentsType;
  status?: string;
  email?: string;
  datePreset?: PaymentsDatePreset;
  from?: string;
  to?: string;
  page: number;
}

function isPaymentsType(v: string): v is PaymentsType {
  return v === "checkout" || v === "manual";
}

function isDatePreset(v: string): v is PaymentsDatePreset {
  return v === "today" || v === "last7" || v === "thisMonth" || v === "custom";
}

function normalizeEmail(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  return trimmed.toLowerCase();
}

export function parsePaymentsSearchParams(
  input: PaymentsSearchParamsInput
): PaymentsSearchParams {
  const type = input.type && isPaymentsType(input.type) ? input.type : "checkout";
  const datePreset =
    input.datePreset && isDatePreset(input.datePreset)
      ? input.datePreset
      : undefined;
  const parsedPage =
    typeof input.page === "string" && input.page ? Number(input.page) : 1;
  const page = Number.isFinite(parsedPage) && parsedPage >= 1 ? Math.floor(parsedPage) : 1;

  return {
    type,
    status: typeof input.status === "string" && input.status ? input.status : undefined,
    email: normalizeEmail(input.email),
    datePreset,
    from: typeof input.from === "string" && input.from ? input.from : undefined,
    to: typeof input.to === "string" && input.to ? input.to : undefined,
    page,
  };
}

export interface DateRangeInput {
  datePreset?: PaymentsDatePreset;
  from?: string;
  to?: string;
}

export interface DateRangeUtc {
  from: Date;
  to: Date;
}

function parseYYYYMMDD(s: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mm = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mm) || !Number.isFinite(d)) return null;
  if (mm < 1 || mm > 12) return null;
  if (d < 1 || d > 31) return null;
  return { y, m: mm, d };
}

function startOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function endOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function fromYMDStartUtc(ymd: string): Date | null {
  const parsed = parseYYYYMMDD(ymd);
  if (!parsed) return null;
  return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, 0, 0, 0, 0));
}

function fromYMDEndUtc(ymd: string): Date | null {
  const parsed = parseYYYYMMDD(ymd);
  if (!parsed) return null;
  return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, 23, 59, 59, 999));
}

export function computeDateRangeUtc(input: DateRangeInput): DateRangeUtc | null {
  const preset = input.datePreset;
  if (!preset) return null;

  const now = new Date();

  if (preset === "today") {
    const d = startOfDayUtc(now);
    return { from: d, to: endOfDayUtc(now) };
  }

  if (preset === "last7") {
    const to = endOfDayUtc(now);
    const fromDate = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate() - 6, 0, 0, 0, 0));
    return { from: fromDate, to };
  }

  if (preset === "thisMonth") {
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth(); // 0-based
    const from = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
    const lastDay = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
    return { from, to: lastDay };
  }

  // custom
  const from = input.from ? fromYMDStartUtc(input.from) : null;
  const to = input.to ? fromYMDEndUtc(input.to) : null;
  if (!from || !to) return null;
  return { from, to };
}

