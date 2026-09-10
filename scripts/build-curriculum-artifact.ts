/**
 * Compiles the curriculum once and writes it to disk for the build to read.
 *
 * Compilation means markdown, KaTeX and Shiki over every lesson — tens of
 * seconds at full size. Next prerenders with a pool of workers, each its own
 * process, and React's `cache()` is per-render-pass, so without this every
 * worker recompiled everything and pages blew past the 60s export timeout.
 *
 * With the artifact on disk each worker parses JSON once instead.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { compileCurriculum } from "../lib/curriculum/compile";
import { ARTIFACT_PATH } from "../lib/curriculum/paths";

async function main() {
  const started = Date.now();
  const curriculum = await compileCurriculum();

  if (curriculum.contentErrors.length > 0) {
    console.error("Curriculum compiled with errors:");
    for (const failure of curriculum.contentErrors) {
      console.error(`  ✗ ${failure.id}: ${failure.message}`);
    }
    process.exit(1);
  }

  await fs.mkdir(path.dirname(ARTIFACT_PATH), { recursive: true });
  const json = JSON.stringify(curriculum);
  await fs.writeFile(ARTIFACT_PATH, json, "utf8");

  const lessons = curriculum.tiers.reduce(
    (sum, tier) => sum + tier.stages.reduce((s, st) => s + st.lessons.length, 0),
    0,
  );
  console.log(
    `curriculum artifact: ${lessons} lessons, ${curriculum.problems.length} problems, ` +
      `${(json.length / 1024 / 1024).toFixed(1)} MB in ${((Date.now() - started) / 1000).toFixed(1)}s`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
