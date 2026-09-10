import "server-only";

import { cache } from "react";
import type {
  CompiledCurriculum,
  CompiledLesson,
  CompiledStage,
  CompiledTier,
  ProblemBank,
  ProblemEntry,
} from "./artifact";
import { promises as fs } from "node:fs";
import { compileCurriculum } from "./compile";
import { ARTIFACT_PATH, includeDrafts } from "./paths";
import type { TierId } from "./types";

/**
 * Read access to the compiled curriculum.
 *
 * Deliberately function-based with NO top-level side effects. v1's
 * `lib/authored-academy.ts` builds its course list while evaluating a top-level
 * array literal and throws when a lesson id is missing, so one bad record turns
 * every route that imports it into a 500. Here a bad lesson resolves to
 * `{ ok: false }`, the page calls `notFound()`, and the rest of the site is
 * unaffected.
 */

export type LoadResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: "not-found" | "draft" | "invalid"; detail?: string };

/**
 * Process-wide, not per-request.
 *
 * React's `cache()` is scoped to a render pass, which meant every prerender
 * worker recompiled the whole curriculum for every page. This promise is
 * created once per process and reused.
 */
let curriculumPromise: Promise<LoadResult<CompiledCurriculum>> | null = null;

/**
 * Prefers the prebuilt artifact and falls back to compiling.
 *
 * The fallback is what makes `next dev` pick up content edits without a
 * separate build step; in production the artifact always exists.
 */
async function readCurriculum(): Promise<CompiledCurriculum> {
  try {
    const raw = await fs.readFile(ARTIFACT_PATH, "utf8");
    return JSON.parse(raw) as CompiledCurriculum;
  } catch {
    return compileCurriculum();
  }
}

const loadCurriculum = (): Promise<LoadResult<CompiledCurriculum>> => {
  if (!curriculumPromise) curriculumPromise = buildLoadResult();
  return curriculumPromise;
};

const buildLoadResult = cache(async (): Promise<LoadResult<CompiledCurriculum>> => {
  try {
    const curriculum = await readCurriculum();
    // Surfaced loudly here and fatal in `curriculum:check`; the site still
    // serves everything that did compile.
    for (const failure of curriculum.contentErrors) {
      console.error(`[curriculum] skipping "${failure.id}": ${failure.message}`);
    }
    return { ok: true, value: visibleOnly(curriculum) };
  } catch (error) {
    // Surfaced loudly in dev and in `curriculum:check`; degraded in prod.
    console.error("[curriculum] compile failed:", error);
    return {
      ok: false,
      reason: "invalid",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
});

/** Drops draft content unless previewing, so half-built stages 404 in prod. */
function visibleOnly(curriculum: CompiledCurriculum): CompiledCurriculum {
  if (includeDrafts()) return curriculum;
  const tiers = curriculum.tiers
    .map((tier) => ({
      ...tier,
      stages: tier.stages
        .filter((stage) => stage.status === "published")
        .map((stage) => ({
          ...stage,
          lessons: stage.lessons.filter((l) => l.status === "published"),
        }))
        .filter((stage) => stage.lessons.length > 0),
    }))
    .filter((tier) => tier.stages.length > 0);
  return { ...curriculum, tiers };
}

export async function getCurriculum(): Promise<LoadResult<CompiledCurriculum>> {
  return loadCurriculum();
}

export async function getTier(tierId: string): Promise<LoadResult<CompiledTier>> {
  const curriculum = await loadCurriculum();
  if (!curriculum.ok) return curriculum;
  const tier = curriculum.value.tiers.find((t) => t.id === tierId);
  return tier ? { ok: true, value: tier } : { ok: false, reason: "not-found" };
}

export async function getStage(
  tierId: string,
  stageId: string,
): Promise<LoadResult<{ tier: CompiledTier; stage: CompiledStage }>> {
  const tier = await getTier(tierId);
  if (!tier.ok) return tier;
  const stage = tier.value.stages.find((s) => s.id === stageId);
  return stage
    ? { ok: true, value: { tier: tier.value, stage } }
    : { ok: false, reason: "not-found" };
}

export type LessonContext = {
  tier: CompiledTier;
  stage: CompiledStage;
  lesson: CompiledLesson;
  previous?: { tierId: string; stageId: string; slug: string; title: string };
  next?: { tierId: string; stageId: string; slug: string; title: string };
};

export async function getLesson(
  tierId: string,
  stageId: string,
  lessonSlug: string,
): Promise<LoadResult<LessonContext>> {
  const found = await getStage(tierId, stageId);
  if (!found.ok) return found;
  const { tier, stage } = found.value;

  const index = stage.lessons.findIndex((l) => l.slug === lessonSlug);
  if (index === -1) return { ok: false, reason: "not-found" };

  const flat = await getLessonOrder();
  if (!flat.ok) return flat;
  const lesson = stage.lessons[index];
  const position = flat.value.findIndex((l) => l.lesson.id === lesson.id);

  return {
    ok: true,
    value: {
      tier,
      stage,
      lesson,
      previous: position > 0 ? toLink(flat.value[position - 1]) : undefined,
      next:
        position >= 0 && position < flat.value.length - 1
          ? toLink(flat.value[position + 1])
          : undefined,
    },
  };
}

type FlatLesson = { tier: CompiledTier; stage: CompiledStage; lesson: CompiledLesson };

function toLink(entry: FlatLesson) {
  return {
    tierId: entry.tier.id,
    stageId: entry.stage.id,
    slug: entry.lesson.slug,
    title: entry.lesson.title,
  };
}

/** Every visible lesson in ladder order. Drives prev/next and static params. */
export const getLessonOrder = cache(async (): Promise<LoadResult<FlatLesson[]>> => {
  const curriculum = await loadCurriculum();
  if (!curriculum.ok) return curriculum;
  const flat: FlatLesson[] = [];
  for (const tier of curriculum.value.tiers) {
    for (const stage of tier.stages) {
      for (const lesson of stage.lessons) flat.push({ tier, stage, lesson });
    }
  }
  return { ok: true, value: flat };
});

/** Static params for `/learn/[tier]/[stage]/[lesson]`. */
export async function getAllLessonParams(): Promise<
  Array<{ tier: TierId; stage: string; lesson: string }>
> {
  const flat = await getLessonOrder();
  if (!flat.ok) return [];
  return flat.value.map(({ tier, stage, lesson }) => ({
    tier: tier.id,
    stage: stage.id,
    lesson: lesson.slug,
  }));
}

/**
 * The problem bank.
 *
 * Merges standalone problems with the graded exercises already inside lessons —
 * a learner filtering for "sliding window" should not need to know which of
 * those happen to be embedded in a lesson.
 */
export const getProblemBank = cache(async (): Promise<ProblemBank> => {
  const curriculum = await loadCurriculum();
  if (!curriculum.ok) return { problems: [], patterns: [], topics: [] };

  const problems: ProblemEntry[] = curriculum.value.problems.map((exercise) => ({
    exercise,
    source: "bank" as const,
    stageId: exercise.stage,
  }));

  const flat = await getLessonOrder();
  if (flat.ok) {
    for (const { tier, stage, lesson } of flat.value) {
      for (const exercise of Object.values(lesson.exercises)) {
        problems.push({
          exercise,
          source: "lesson",
          lesson: {
            id: lesson.id,
            slug: lesson.slug,
            title: lesson.title,
            tierId: tier.id,
            stageId: stage.id,
            stageTitle: stage.title,
            stageOrder: stage.order,
          },
          stageId: stage.id,
        });
      }
    }
  }

  problems.sort(
    (a, b) =>
      a.exercise.difficulty - b.exercise.difficulty ||
      a.exercise.title.localeCompare(b.exercise.title),
  );

  const patterns = new Set<string>();
  const topics = new Set<string>();
  for (const entry of problems) {
    if (entry.exercise.pattern) patterns.add(entry.exercise.pattern);
    for (const topic of entry.exercise.topics) topics.add(topic);
  }

  return {
    problems,
    patterns: [...patterns].sort(),
    topics: [...topics].sort(),
  };
});

export async function getProblem(id: string): Promise<LoadResult<ProblemEntry>> {
  const bank = await getProblemBank();
  const entry = bank.problems.find((p) => p.exercise.id === id);
  return entry ? { ok: true, value: entry } : { ok: false, reason: "not-found" };
}
