/**
 * v2 curriculum type vocabulary.
 *
 * These types are inferred from the Zod schemas in `./schema.ts` wherever a
 * value is parsed from disk, so there is exactly one definition of each shape.
 * The handful of types declared directly here are runtime-only (they never
 * cross the disk boundary).
 *
 * Deliberately independent of `lib/types.ts` — see `lib/curriculum/README.md`.
 */

/** Ordered. A tier's index in this array is its position on the ladder. */
export const TIER_ORDER = [
  "t1-foundations",
  "t2-core-structures",
  "t3-algorithms",
  "t4-scale-systems",
  "t5-graduate",
] as const;

export type TierId = (typeof TIER_ORDER)[number];

/**
 * Optional passes through the same lesson.
 *
 * `core` blocks render in every pass. The others are additive: choosing
 * `interview` renders core + interview, never interview alone.
 */
export const DEPTH_TRACKS = ["core", "interview", "proof", "systems"] as const;
export type DepthTrack = (typeof DEPTH_TRACKS)[number];

/**
 * The learner-facing path selector.
 *
 * `core` is the required spine on its own and is the default: a first-time
 * visitor should meet the lesson, not three simultaneous digressions. Every
 * other path is core PLUS one pass, so choosing a path can only ever add
 * content — it never hides anything a learner needs.
 */
export const LEARNER_PATHS = [
  "core",
  "interview",
  "graduate",
  "systems",
  "everything",
] as const;
export type LearnerPath = (typeof LEARNER_PATHS)[number];

export const DEFAULT_LEARNER_PATH: LearnerPath = "core";

export function tracksForPath(path: LearnerPath): DepthTrack[] {
  switch (path) {
    case "core":
      return ["core"];
    case "interview":
      return ["core", "interview"];
    case "graduate":
      return ["core", "proof"];
    case "systems":
      return ["core", "systems"];
    case "everything":
      return ["core", "interview", "proof", "systems"];
  }
}

export type PublishStatus = "draft" | "published";

export type LessonBlockKind =
  | "prose"
  | "callout"
  | "figure"
  | "code"
  | "runnable"
  | "quiz"
  | "checkpoint"
  | "dataset"
  | "exercise";
