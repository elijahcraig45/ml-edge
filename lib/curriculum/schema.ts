/**
 * Zod schemas for authored curriculum content.
 *
 * These are the source of truth: every TypeScript type for on-disk content is
 * inferred from a schema here, so a schema change cannot silently drift from
 * the types. `scripts/curriculum-check.ts` runs these over every content file.
 *
 * Required-vs-optional is the main pedagogical lever. Fields that produced
 * filler prose in v1 (`buildLectureSegments` and friends) are REQUIRED here, so
 * a half-authored lesson fails validation instead of shipping placeholder text.
 */
import { z } from "zod";
import { DEPTH_TRACKS, TIER_ORDER } from "./types";

export const tierIdSchema = z.enum(TIER_ORDER);
export const depthTrackSchema = z.enum(DEPTH_TRACKS);
export const publishStatusSchema = z.enum(["draft", "published"]);

/** "t2/s05/l01" — globally unique, and the localStorage progress key. */
export const lessonIdSchema = z
  .string()
  .regex(/^t[1-5]\/s\d{2}\/l\d{2}$/, 'lesson id must look like "t2/s05/l01"');

const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be kebab-case");

const blockIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "block ids must be kebab-case");

/* ------------------------------------------------------------------ */
/* Runtimes                                                            */
/* ------------------------------------------------------------------ */

export const runtimeSchema = z.discriminatedUnion("engine", [
  z.object({
    engine: z.literal("python"),
    /** Pyodide package names, e.g. ["numpy"]. Loaded before the first run. */
    packages: z.array(z.string()).default([]),
    timeoutMs: z.number().int().positive().max(60_000).default(10_000),
  }),
  z.object({
    engine: z.literal("duckdb"),
    datasetId: slugSchema,
    timeoutMs: z.number().int().positive().max(60_000).default(15_000),
  }),
]);

export type Runtime = z.infer<typeof runtimeSchema>;

/* ------------------------------------------------------------------ */
/* Exercises                                                           */
/* ------------------------------------------------------------------ */

const exerciseBase = {
  id: slugSchema,
  title: z.string().min(1),
  /** 1..5 rather than easy/medium/hard: the ladder spans 11 stages. */
  difficulty: z.union([
    z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5),
  ]),
  tracks: z.array(depthTrackSchema).optional(),
  /** Interview-pattern tag; also drives filtering on /problems. */
  pattern: slugSchema.optional(),
  /**
   * Standalone problems only (content/problems/*). Names the stage whose
   * material the problem assumes, so the bank can order by prerequisite rather
   * than dumping every problem on a beginner.
   */
  stage: slugSchema.optional(),
  /** Extra filter facets beyond `pattern`, e.g. "recursion", "strings". */
  topics: z.array(slugSchema).default([]),
  prompt: z.string().min(1),
  /** Revealed one at a time, cheapest nudge first. */
  hints: z.array(z.string().min(1)).min(1),
  solutionWalkthrough: z.string().min(1),
  timeLimitMs: z.number().int().positive().max(120_000).default(15_000),
};

export const pythonTestSchema = z.object({
  id: slugSchema,
  label: z.string().min(1),
  hidden: z.boolean().default(false),
  /** Executed verbatim in a namespace seeded from the learner's definitions. */
  code: z.string().min(1),
  points: z.number().int().positive().default(1),
});

/** Enforces a stated complexity claim instead of leaving it decorative. */
export const complexityBudgetSchema = z.object({
  /** Python snippet that builds the large input, bound to `data`. */
  setup: z.string().min(1),
  /** Expression the learner's solution is called with, e.g. "solve(data)". */
  call: z.string().min(1),
  maxOps: z.number().int().positive().optional(),
  maxMs: z.number().int().positive().optional(),
  message: z.string().min(1),
});

export const pythonExerciseSchema = z.object({
  ...exerciseBase,
  kind: z.literal("python"),
  packages: z.array(z.string()).default([]),
  starter: z.string().min(1),
  solution: z.string().min(1),
  tests: z.array(pythonTestSchema).min(1),
  /** Literal substrings rejected before execution, e.g. "sorted(" in a sort lab. */
  forbid: z.array(z.string()).optional(),
  complexityBudget: complexityBudgetSchema.optional(),
});

export const sqlAssertionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("syntax"),
    pattern: z.string().min(1),
    flags: z.string().optional(),
    /** true => the pattern must NOT match. */
    negate: z.boolean().default(false),
    message: z.string().min(1),
  }),
  z.object({
    type: z.literal("plan"),
    contains: z.array(z.string()).optional(),
    notContains: z.array(z.string()).optional(),
    message: z.string().min(1),
  }),
  z.object({
    type: z.literal("predicate"),
    /** SQL over __learner returning exactly one BOOLEAN. */
    sql: z.string().min(1),
    message: z.string().min(1),
  }),
  z.object({
    type: z.literal("rowcount"),
    equals: z.number().int().nonnegative().optional(),
    max: z.number().int().nonnegative().optional(),
    min: z.number().int().nonnegative().optional(),
    message: z.string().min(1),
  }),
]);

export type SqlAssertion = z.infer<typeof sqlAssertionSchema>;

export const sqlGradingSchema = z.object({
  /** "ordered" only when the exercise is genuinely about ORDER BY. */
  compare: z.enum(["multiset", "ordered"]).default("multiset"),
  columnMatch: z.enum(["byName", "byPosition", "ignoreNames"]).default("byName"),
  floatTolerance: z.number().nonnegative().default(1e-6),
  maxRowsCompared: z.number().int().positive().default(50_000),
  require: z.array(sqlAssertionSchema).optional(),
  forbid: z.array(z.string()).optional(),
});

export const sqlExerciseSchema = z.object({
  ...exerciseBase,
  kind: z.literal("sql"),
  datasetId: slugSchema,
  starter: z.string().min(1),
  /** The grading oracle. Run live in the learner's own engine at grade time. */
  solution: z.string().min(1),
  grading: sqlGradingSchema.prefault({}),
});

export const exerciseSchema = z.discriminatedUnion("kind", [
  pythonExerciseSchema,
  sqlExerciseSchema,
]);

export type AuthoredExercise = z.infer<typeof exerciseSchema>;
export type AuthoredPythonExercise = z.infer<typeof pythonExerciseSchema>;
export type AuthoredSqlExercise = z.infer<typeof sqlExerciseSchema>;

/* ------------------------------------------------------------------ */
/* Datasets                                                            */
/* ------------------------------------------------------------------ */

export const datasetColumnSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  description: z.string().min(1),
});

export const datasetTableSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  columns: z.array(datasetColumnSchema).min(1),
  /** Relative to the dataset directory. Omitted when `seedSql` is used. */
  file: z.string().optional(),
  /** Inline DDL+DML for tiny tables: no network round trip at all. */
  seedSql: z.string().optional(),
});

export const datasetSpecSchema = z.object({
  id: slugSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  license: z.string().min(1),
  tables: z.array(datasetTableSchema).min(1),
});

export type AuthoredDataset = z.infer<typeof datasetSpecSchema>;

/* ------------------------------------------------------------------ */
/* Lesson frontmatter                                                  */
/* ------------------------------------------------------------------ */

export const quizQuestionSchema = z.object({
  id: slugSchema,
  prompt: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  answerIndex: z.number().int().nonnegative(),
  /** Required: a quiz that does not explain itself teaches nothing. */
  explanation: z.string().min(1),
});

export const lessonFrontmatterSchema = z.object({
  id: lessonIdSchema,
  title: z.string().min(1),
  tier: tierIdSchema,
  stage: slugSchema,
  status: publishStatusSchema.default("draft"),
  estimatedMinutes: z.number().int().positive().max(180),
  /** Required. The single strongest signal that a lesson was actually designed. */
  objectives: z.array(z.string().min(1)).min(1),
  prerequisites: z.array(lessonIdSchema).default([]),
  /** Named misconceptions. v1's best-differentiated content; now mandatory. */
  misconceptions: z.array(z.string().min(1)).min(1),
  masteryChecklist: z.array(z.string().min(1)).min(1),
  runtimes: z.array(runtimeSchema).default([]),
});

export type LessonFrontmatter = z.infer<typeof lessonFrontmatterSchema>;

/* ------------------------------------------------------------------ */
/* Stage + curriculum manifests                                        */
/* ------------------------------------------------------------------ */

export const stageManifestSchema = z.object({
  id: slugSchema,
  tier: tierIdSchema,
  order: z.number().int().nonnegative(),
  title: z.string().min(1),
  thesis: z.string().min(1),
  summary: z.string().min(1),
  status: publishStatusSchema.default("draft"),
  outcomes: z.array(z.string().min(1)).min(1),
  /** Lesson directory slugs, in teaching order. */
  lessons: z.array(slugSchema).min(1),
});

export type StageManifest = z.infer<typeof stageManifestSchema>;

export const curriculumManifestSchema = z.object({
  version: z.string().min(1),
  title: z.string().min(1),
  tiers: z
    .array(
      z.object({
        id: tierIdSchema,
        title: z.string().min(1),
        audience: z.string().min(1),
        /** Stage directory names, relative to the tier directory. */
        stages: z.array(slugSchema),
      }),
    )
    .min(1),
});

export type CurriculumManifest = z.infer<typeof curriculumManifestSchema>;

export { blockIdSchema, slugSchema };
