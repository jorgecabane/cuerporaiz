/**
 * Plan de pago por centro.
 * LIVE = con profe en vivo (físico o online). ON_DEMAND = grabado. MEMBERSHIP_ON_DEMAND = acceso videoteca.
 */
export type PlanType = "LIVE" | "ON_DEMAND" | "MEMBERSHIP_ON_DEMAND";
export type BillingMode = "ONE_TIME" | "RECURRING" | "BOTH";
export type ValidityPeriod = "MONTHLY" | "QUARTERLY" | "QUADRIMESTRAL" | "SEMESTER" | "ANNUAL";

export interface Plan {
  id: string;
  centerId: string;
  name: string;
  slug: string;
  description: string | null;
  amountCents: number;
  currency: string;
  type: PlanType;
  validityDays: number | null;
  validityPeriod: ValidityPeriod | null;
  billingMode: BillingMode | null;
  /** Descuento % (0-100) si el cliente elige pago recurrente; solo si billingMode RECURRING o BOTH */
  recurringDiscountPercent: number | null;
  maxReservations: number | null;       // null = ilimitado en el período
  maxReservationsPerDay: number | null;
  maxReservationsPerWeek: number | null;
}

export interface PlanCreateInput {
  name: string;
  slug: string;
  description?: string | null;
  amountCents: number;
  currency?: string;
  type: PlanType;
  validityDays?: number | null;
  validityPeriod?: ValidityPeriod | null;
  billingMode?: BillingMode | null;
  recurringDiscountPercent?: number | null;
  maxReservations?: number | null;
  maxReservationsPerDay?: number | null;
  maxReservationsPerWeek?: number | null;
}

export interface PlanUpdateInput {
  name?: string;
  slug?: string;
  description?: string | null;
  amountCents?: number;
  currency?: string;
  type?: PlanType;
  validityDays?: number | null;
  validityPeriod?: ValidityPeriod | null;
  billingMode?: BillingMode | null;
  recurringDiscountPercent?: number | null;
  maxReservations?: number | null;
  maxReservationsPerDay?: number | null;
  maxReservationsPerWeek?: number | null;
}

export interface IPlanRepository {
  findById(id: string): Promise<Plan | null>;
  findManyByIds(ids: string[]): Promise<Plan[]>;
  findByCenterAndSlug(centerId: string, slug: string): Promise<Plan | null>;
  findManyByCenterId(centerId: string): Promise<Plan[]>;
  create(centerId: string, data: PlanCreateInput): Promise<Plan>;
  update(id: string, centerId: string, data: PlanUpdateInput): Promise<Plan | null>;
  delete(id: string, centerId: string): Promise<boolean>;
}
