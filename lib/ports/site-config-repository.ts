import type { SiteConfig } from "@/lib/domain/site-config";
import type { UpsertSiteConfigInput } from "@/lib/dto/site-config-dto";

export interface ISiteConfigRepository {
  findByCenterId(centerId: string): Promise<SiteConfig | null>;
  upsert(centerId: string, data: UpsertSiteConfigInput): Promise<SiteConfig>;
}
