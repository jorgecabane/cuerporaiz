/**
 * Plan de pago (pack o membresía) por centro.
 */
export type PlanType = "PACK" | "MEMBERSHIP";

export interface Plan {
  id: string;
  centerId: string;
  name: string;
  slug: string;
  description: string | null;
  amountCents: number;
  currency: string;
  type: PlanType;
}

export interface PlanCreateInput {
  name: string;
  slug: string;
  description?: string | null;
  amountCents: number;
  currency?: string;
  type: PlanType;
}

export interface PlanUpdateInput {
  name?: string;
  slug?: string;
  description?: string | null;
  amountCents?: number;
  currency?: string;
  type?: PlanType;
}

export interface IPlanRepository {
  findById(id: string): Promise<Plan | null>;
  findByCenterAndSlug(centerId: string, slug: string): Promise<Plan | null>;
  findManyByCenterId(centerId: string): Promise<Plan[]>;
  create(centerId: string, data: PlanCreateInput): Promise<Plan>;
  update(id: string, centerId: string, data: PlanUpdateInput): Promise<Plan | null>;
  delete(id: string, centerId: string): Promise<boolean>;
}
