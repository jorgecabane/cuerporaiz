import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  centerRepository,
  siteConfigRepository,
  planRepository,
  disciplineRepository,
} from "@/lib/adapters/db";
import { buildSiteMetadata } from "@/lib/seo/metadata";
import { getPublicCenterTimezone } from "@/lib/datetime/center-timezone";
import { AgendaSection } from "@/components/sections/home";
import { AboutClassesSection } from "@/components/sections/horarios/AboutClassesSection";
import { FirstClassSection } from "@/components/sections/horarios/FirstClassSection";
import { loadWeekSchedule, toLivePlans } from "@/lib/server/schedule";
import { splitLines } from "@/lib/domain/embeds";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return buildSiteMetadata({
    path: "/horarios",
    title: "Horarios",
    description: "Clases presenciales de la semana, planes y qué esperar de cada práctica.",
  });
}

export default async function HorariosPage() {
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
  const center = slug ? await centerRepository.findBySlug(slug) : null;
  if (!center) notFound();

  const tz = await getPublicCenterTimezone();
  const [siteConfig, plans, disciplines, schedule] = await Promise.all([
    siteConfigRepository.findByCenterId(center.id),
    planRepository.findManyByCenterId(center.id),
    disciplineRepository.findActiveByCenterId(center.id),
    loadWeekSchedule(center.id, tz),
  ]);
  const livePlans = toLivePlans(plans);

  return (
    <div className="pt-[var(--header-height)]">
      <AgendaSection
        headingLevel="h1"
        title="Horarios"
        subtitle={siteConfig?.contactAddress ? `Presencial — ${siteConfig.contactAddress}` : undefined}
        livePlans={livePlans.length > 0 ? livePlans : undefined}
        classes={schedule.classes}
      />
      <AboutClassesSection
        classTypes={disciplines.map((d) => ({
          id: d.id,
          name: d.name,
          color: d.color,
          description: d.description,
          schedule: schedule.scheduleByDiscipline.get(d.id) ?? null,
        }))}
      />
      <FirstClassSection lines={splitLines(siteConfig?.firstClassInfo)} />
    </div>
  );
}
