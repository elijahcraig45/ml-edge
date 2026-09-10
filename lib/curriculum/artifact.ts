/**
 * The compiled curriculum artifact.
 *
 * Authored content (`./schema.ts`) is markdown + YAML on disk. Compiling turns
 * prose into HTML, resolves exercise references, and emits these shapes. The
 * renderer only ever sees compiled types, so no markdown/KaTeX/Shiki JavaScript
 * ships to the browser.
 */
import type { Runtime, SqlAssertion } from "./schema";
import type { DepthTrack, PublishStatus, TierId } from "./types";

export type CompiledHeading = {
  depth: 2 | 3 | 4;
  text: string;
  slug: string;
};

type BlockBase = {
  /**
   * Stable and author-controlled. Progress is keyed by this, never by array
   * index, so inserting a block mid-lesson cannot shift saved checkmarks onto
   * the wrong content (which is exactly what v1's positional arrays did).
   */
  id: string;
  /** Undefined => renders in every track. Otherwise only in the listed ones. */
  tracks?: DepthTrack[];
  /** Excluded from the progress denominator. */
  optional?: boolean;
};

export type ProseBlock = BlockBase & {
  kind: "prose";
  html: string;
  headings: CompiledHeading[];
  /** Plain text, for the search index only. */
  plain: string;
};

export type CalloutBlock = BlockBase & {
  kind: "callout";
  variant: "note" | "warning" | "pitfall" | "insight" | "interview" | "proof";
  title?: string;
  html: string;
};

export type FigureBlock = BlockBase & {
  kind: "figure";
  /** Inlined at build time so figures need no extra request. */
  svg: string;
  alt: string;
  captionHtml?: string;
};

export type StaticCodeBlock = BlockBase & {
  kind: "code";
  lang: string;
  /** Shiki-highlighted markup. */
  html: string;
  /** Raw source, for the copy button. */
  source: string;
};

/** Author-provided, learner-runnable, ungraded. The scratchpad affordance. */
export type RunnableBlock = BlockBase & {
  kind: "runnable";
  runtime: Runtime;
  source: string;
  html: string;
  editable: boolean;
};

export type QuizBlock = BlockBase & {
  kind: "quiz";
  questions: Array<{
    id: string;
    promptHtml: string;
    /** Inline-compiled: options carry code spans and math in practice. */
    optionsHtml: string[];
    answerIndex: number;
    explanationHtml: string;
  }>;
  passing: number;
};

/** Free-text self-assessment. Never auto-graded; stored locally. */
export type CheckpointBlock = BlockBase & {
  kind: "checkpoint";
  promptHtml: string;
  rubricHtml: string[];
};

export type DatasetBlock = BlockBase & {
  kind: "dataset";
  datasetId: string;
  tables: string[];
};

export type ExerciseBlock = BlockBase & {
  kind: "exercise";
  exerciseId: string;
};

export type LessonBlock =
  | ProseBlock
  | CalloutBlock
  | FigureBlock
  | StaticCodeBlock
  | RunnableBlock
  | QuizBlock
  | CheckpointBlock
  | DatasetBlock
  | ExerciseBlock;

/* ------------------------------------------------------------------ */

type CompiledExerciseBase = {
  id: string;
  title: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  tracks?: DepthTrack[];
  pattern?: string;
  stage?: string;
  topics: string[];
  promptHtml: string;
  hintsHtml: string[];
  solutionWalkthroughHtml: string;
  timeLimitMs: number;
};

export type CompiledPythonExercise = CompiledExerciseBase & {
  kind: "python";
  packages: string[];
  starter: string;
  solution: string;
  tests: Array<{
    id: string;
    label: string;
    hidden: boolean;
    code: string;
    points: number;
  }>;
  forbid?: string[];
  complexityBudget?: {
    setup: string;
    call: string;
    maxOps?: number;
    maxMs?: number;
    message: string;
  };
};

export type CompiledSqlExercise = CompiledExerciseBase & {
  kind: "sql";
  datasetId: string;
  starter: string;
  solution: string;
  grading: {
    compare: "multiset" | "ordered";
    columnMatch: "byName" | "byPosition" | "ignoreNames";
    floatTolerance: number;
    maxRowsCompared: number;
    require?: SqlAssertion[];
    forbid?: string[];
  };
};

export type CompiledExercise = CompiledPythonExercise | CompiledSqlExercise;

/* ------------------------------------------------------------------ */

export type CompiledDatasetTable = {
  name: string;
  description: string;
  columns: Array<{ name: string; type: string; description: string }>;
  /** Either an HTTP-fetched file or inline seed SQL. */
  source:
    | { kind: "file"; url: string; bytes: number; format: "parquet" | "csv" }
    | { kind: "sql"; statements: string };
};

export type CompiledDataset = {
  id: string;
  title: string;
  descriptionHtml: string;
  license: string;
  tables: CompiledDatasetTable[];
  totalBytes: number;
};

/* ------------------------------------------------------------------ */

export type CompiledLesson = {
  /** "t1/s01/l01" — globally unique; the progress key. */
  id: string;
  slug: string;
  tierId: TierId;
  stageId: string;
  title: string;
  status: PublishStatus;
  estimatedMinutes: number;
  objectives: string[];
  objectivesHtml: string[];
  prerequisiteLessonIds: string[];
  misconceptionsHtml: string[];
  masteryChecklistHtml: string[];
  /** Which depth tracks this lesson actually has content for. */
  availableTracks: DepthTrack[];
  blocks: LessonBlock[];
  exercises: Record<string, CompiledExercise>;
  /** Every runtime any block needs, so the page can preload deliberately. */
  runtimes: Runtime[];
  /** Hash of the authored source; invalidates stale saved progress. */
  contentHash: string;
};

export type CompiledStage = {
  id: string;
  tierId: TierId;
  order: number;
  title: string;
  thesis: string;
  summary: string;
  status: PublishStatus;
  outcomes: string[];
  lessons: CompiledLesson[];
};

export type CompiledTier = {
  id: TierId;
  order: number;
  title: string;
  audience: string;
  stages: CompiledStage[];
};

export type CompiledCurriculum = {
  version: string;
  title: string;
  builtAt: string;
  tiers: CompiledTier[];
  datasets: Record<string, CompiledDataset>;
  /** Standalone problems from content/problems/. */
  problems: CompiledExercise[];
  /**
   * Stages and problems that failed to compile. Collected rather than thrown so
   * one bad file cannot 404 the whole curriculum; `curriculum:check` turns
   * every entry here into a build failure.
   */
  contentErrors: Array<{ id: string; message: string }>;
};

/** Lesson stripped of body, for nav and listings. */
export type LessonSummary = Pick<
  CompiledLesson,
  "id" | "slug" | "title" | "tierId" | "stageId" | "status" | "estimatedMinutes"
>;

export function toLessonSummary(lesson: CompiledLesson): LessonSummary {
  return {
    id: lesson.id,
    slug: lesson.slug,
    title: lesson.title,
    tierId: lesson.tierId,
    stageId: lesson.stageId,
    status: lesson.status,
    estimatedMinutes: lesson.estimatedMinutes,
  };
}


/* ------------------------------------------------------------------ */
/* The problem bank                                                    */
/* ------------------------------------------------------------------ */

/**
 * One entry in /problems.
 *
 * The bank draws from two places: standalone problems in `content/problems/`,
 * and the graded exercises already embedded in lessons. Lesson exercises are
 * included deliberately — a learner who wants "all the sliding-window problems"
 * should not have to know which of them happen to live inside a lesson.
 */
export type ProblemEntry = {
  exercise: CompiledExercise;
  source: "bank" | "lesson";
  /** Present when the problem came from a lesson. */
  lesson?: {
    id: string;
    slug: string;
    title: string;
    tierId: string;
    stageId: string;
    stageTitle: string;
    stageOrder: number;
  };
  /** Stage the problem assumes knowledge of, for prerequisite ordering. */
  stageId?: string;
};

export type ProblemBank = {
  problems: ProblemEntry[];
  patterns: string[];
  topics: string[];
};
