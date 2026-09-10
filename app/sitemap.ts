import type { MetadataRoute } from "next";
import { getLessonOrder, getProblemBank } from "@/lib/curriculum/load";

const SITE = "https://mle-edge.dev";

/**
 * Only the curriculum is listed. The legacy routes are still deployed but are
 * being retired, and pointing search engines at them would outlive them.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE}/learn`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/problems`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/interview`, changeFrequency: "monthly", priority: 0.6 },
  ];

  const lessons = await getLessonOrder();
  if (lessons.ok) {
    const stages = new Set<string>();
    for (const { tier, stage, lesson } of lessons.value) {
      stages.add(`${tier.id}/${stage.id}`);
      entries.push({
        url: `${SITE}/learn/${tier.id}/${stage.id}/${lesson.slug}`,
        changeFrequency: "monthly",
        priority: 0.9,
      });
    }
    for (const stage of stages) {
      entries.push({
        url: `${SITE}/learn/${stage}`,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  }

  const bank = await getProblemBank();
  for (const entry of bank.problems) {
    entries.push({
      url: `${SITE}/problems/${entry.exercise.id}`,
      changeFrequency: "monthly",
      priority: 0.5,
    });
  }

  return entries;
}
