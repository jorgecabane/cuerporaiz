import type { Center } from "@/lib/domain";

export interface ICenterRepository {
  findById(id: string): Promise<Center | null>;
  findBySlug(slug: string): Promise<Center | null>;
  create(data: { name: string; slug: string }): Promise<Center>;
  findAll(): Promise<Center[]>;
}
