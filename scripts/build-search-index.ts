/**
 * Emits public/curriculum/search-index.json at build time.
 *
 * The index was previously passed from a server component into the client, so
 * every visitor downloaded it inside the RSC payload of every curriculum page —
 * about 150KB at 38 lessons and growing linearly. As a static file it costs
 * nothing until someone actually focuses the search box.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { compileCurriculum } from "../lib/curriculum/compile";
import { ARTIFACT_PATH } from "../lib/curriculum/paths";
import type { CompiledCurriculum } from "../lib/curriculum/artifact";

// Under /assets, not /curriculum: that prefix redirects to /learn.
const OUT_DIR = path.join(process.cwd(), "public", "assets");
const OUT_FILE = path.join(OUT_DIR, "search-index.json");
const MAX_PROSE_CHARS = 4000;

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Reuses the artifact `prebuild` just wrote rather than recompiling. */
async function readCurriculum(): Promise<CompiledCurriculum> {
  try {
    return JSON.parse(await fs.readFile(ARTIFACT_PATH, "utf8")) as CompiledCurriculum;
  } catch {
    return compileCurriculum();
  }
}

async function main() {
  const curriculum = await readCurriculum();
  const entries = [];

  for (const tier of curriculum.tiers) {
    for (const stage of tier.stages) {
      for (const lesson of stage.lessons) {
        if (lesson.status !== "published") continue;
        const prose = lesson.blocks
          .map((b) => (b.kind === "prose" ? b.plain : ""))
          .join(" ")
          .slice(0, MAX_PROSE_CHARS);
        entries.push({
          id: lesson.id,
          kind: "lesson" as const,
          title: lesson.title,
          href: `/learn/${tier.id}/${stage.id}/${lesson.slug}`,
          context: stage.title,
          haystack: [
            lesson.title,
            ...lesson.objectives,
            ...lesson.masteryChecklistHtml.map(stripTags),
            ...lesson.misconceptionsHtml.map(stripTags),
            prose,
          ]
            .join(" ")
            .toLowerCase(),
        });
      }
    }
  }

  const problems = [
    ...curriculum.problems,
    ...curriculum.tiers.flatMap((t) =>
      t.stages.flatMap((s) =>
        s.lessons.flatMap((l) => Object.values(l.exercises)),
      ),
    ),
  ];
  const seen = new Set<string>();
  for (const exercise of problems) {
    if (seen.has(exercise.id)) continue;
    seen.add(exercise.id);
    entries.push({
      id: exercise.id,
      kind: "problem" as const,
      title: exercise.title,
      href: `/problems/${exercise.id}`,
      context: exercise.pattern?.replace(/-/g, " ") ?? "problem",
      haystack: [exercise.title, exercise.pattern ?? "", ...exercise.topics]
        .join(" ")
        .toLowerCase(),
    });
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  const json = JSON.stringify(entries);
  await fs.writeFile(OUT_FILE, json, "utf8");
  console.log(
    `search index: ${entries.length} entries, ${(json.length / 1024).toFixed(0)} KB ` +
      `-> ${path.relative(process.cwd(), OUT_FILE)}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
