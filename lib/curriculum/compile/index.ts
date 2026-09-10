import { promises as fs } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { curriculumManifestSchema, stageManifestSchema } from "../schema";
import type {
  CompiledCurriculum,
  CompiledDataset,
  CompiledStage,
  CompiledTier,
} from "../artifact";
import { CONTENT_ROOT, CURRICULUM_MANIFEST } from "../paths";
import { compileDatasets } from "./dataset";
import { compileProblems } from "./problems";
import { compileLesson } from "./lesson";
import { formatIssues } from "./exercise";

/**
 * Compiles the whole authored curriculum.
 *
 * Called at build time by `generateStaticParams` / page rendering, and by
 * `scripts/curriculum-check.ts`. Never called at request time in production:
 * `/learn` routes set `dynamicParams = false`, so every page is prerendered.
 */
export async function compileCurriculum(): Promise<CompiledCurriculum> {
  const manifestRaw = await fs.readFile(CURRICULUM_MANIFEST, "utf8");
  const manifest = curriculumManifestSchema.safeParse(YAML.parse(manifestRaw));
  if (!manifest.success) {
    throw new Error(
      `Invalid content/curriculum.yaml:\n${formatIssues(manifest.error.issues)}`,
    );
  }

  const datasets = await compileDatasets();
  const problemResult = await compileProblems();
  const tiers: CompiledTier[] = [];

  const contentErrors: Array<{ id: string; message: string }> = [];

  for (const [tierOrder, tier] of manifest.data.tiers.entries()) {
    const stages: CompiledStage[] = [];
    for (const stageSlug of tier.stages) {
      // Collected, not thrown: a stage that is mid-edit must not be able to
      // 404 every other stage on the site. `curriculum:check` fails on these.
      try {
        stages.push(await compileStage(path.join(CONTENT_ROOT, tier.id, stageSlug)));
      } catch (error) {
        contentErrors.push({
          id: `${tier.id}/${stageSlug}`,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    stages.sort((a, b) => a.order - b.order);
    tiers.push({
      id: tier.id,
      order: tierOrder,
      title: tier.title,
      audience: tier.audience,
      stages,
    });
  }

  const curriculum: CompiledCurriculum = {
    version: manifest.data.version,
    title: manifest.data.title,
    builtAt: new Date().toISOString(),
    tiers,
    datasets,
    problems: problemResult.problems,
    contentErrors: [...problemResult.errors, ...contentErrors],
  };

  assertReferentialIntegrity(curriculum);
  return curriculum;
}

/**
 * Compiles one stage directory in isolation.
 *
 * Lets a stage be authored and validated while its siblings are half-written —
 * `compileCurriculum` needs every stage listed in curriculum.yaml to be
 * complete, which would otherwise serialise all content work.
 */
export async function compileStageStandalone(dir: string): Promise<CompiledStage> {
  return compileStage(dir);
}

/**
 * Integrity checks that make sense for one stage in isolation.
 *
 * Prerequisites are skipped: a stage under construction legitimately points at
 * lessons in stages that are not written yet, and the full check catches any
 * that never materialise.
 */
export function assertStageIntegrity(
  stage: CompiledStage,
  datasets: Record<string, CompiledDataset>,
): void {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const lesson of stage.lessons) {
    if (seen.has(lesson.id)) errors.push(`Duplicate lesson id: ${lesson.id}`);
    seen.add(lesson.id);
    for (const exercise of Object.values(lesson.exercises)) {
      if (exercise.kind === "sql" && !datasets[exercise.datasetId]) {
        errors.push(`${lesson.id}/${exercise.id}: unknown dataset "${exercise.datasetId}"`);
      }
    }
  }
  if (errors.length > 0) {
    throw new Error(`Stage integrity errors:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  }
}

async function compileStage(dir: string): Promise<CompiledStage> {
  const raw = await fs.readFile(path.join(dir, "stage.yaml"), "utf8");
  const parsed = stageManifestSchema.safeParse(YAML.parse(raw));
  if (!parsed.success) {
    throw new Error(`Invalid stage.yaml at ${dir}:\n${formatIssues(parsed.error.issues)}`);
  }
  const stage = parsed.data;

  const lessons = [];
  for (const lessonSlug of stage.lessons) {
    lessons.push(await compileLesson(path.join(dir, lessonSlug), lessonSlug));
  }

  for (const lesson of lessons) {
    if (lesson.stageId !== stage.id) {
      throw new Error(
        `Lesson ${lesson.id} declares stage "${lesson.stageId}" but lives in "${stage.id}"`,
      );
    }
  }

  return {
    id: stage.id,
    tierId: stage.tier,
    order: stage.order,
    title: stage.title,
    thesis: stage.thesis,
    summary: stage.summary,
    status: stage.status,
    outcomes: stage.outcomes,
    lessons,
  };
}

/**
 * Cross-file checks the per-file schemas cannot express: unique ids, resolvable
 * prerequisites, and every referenced dataset actually existing.
 */
function assertReferentialIntegrity(curriculum: CompiledCurriculum): void {
  const errors: string[] = [];
  const lessonIds = new Set<string>();

  for (const tier of curriculum.tiers) {
    for (const stage of tier.stages) {
      for (const lesson of stage.lessons) {
        if (lessonIds.has(lesson.id)) {
          errors.push(`Duplicate lesson id: ${lesson.id}`);
        }
        lessonIds.add(lesson.id);

        for (const runtime of lesson.runtimes) {
          if (runtime.engine === "duckdb" && !curriculum.datasets[runtime.datasetId]) {
            errors.push(
              `${lesson.id} declares unknown dataset "${runtime.datasetId}"`,
            );
          }
        }
        for (const block of lesson.blocks) {
          if (block.kind === "dataset" && !curriculum.datasets[block.datasetId]) {
            errors.push(`${lesson.id} block ${block.id} references unknown dataset "${block.datasetId}"`);
          }
          if (
            block.kind === "runnable" &&
            block.runtime.engine === "duckdb" &&
            !curriculum.datasets[block.runtime.datasetId]
          ) {
            errors.push(
              `${lesson.id} block ${block.id} references unknown dataset "${block.runtime.datasetId}"`,
            );
          }
        }
        for (const exercise of Object.values(lesson.exercises)) {
          if (exercise.kind === "sql" && !curriculum.datasets[exercise.datasetId]) {
            errors.push(
              `${lesson.id} exercise ${exercise.id} references unknown dataset "${exercise.datasetId}"`,
            );
          }
        }
      }
    }
  }

  // Second pass: prerequisites can point forward or backward, so resolve last.
  for (const tier of curriculum.tiers) {
    for (const stage of tier.stages) {
      for (const lesson of stage.lessons) {
        for (const prereq of lesson.prerequisiteLessonIds) {
          if (!lessonIds.has(prereq)) {
            errors.push(`${lesson.id} lists unknown prerequisite "${prereq}"`);
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Curriculum integrity errors:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  }
}
