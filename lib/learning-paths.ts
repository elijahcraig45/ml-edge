import { getAuthoredAcademyCourses } from "@/lib/authored-academy";

/**
 * Curated, goal-oriented tracks layered on top of the authored academy.
 *
 * A track is an *ordered* journey through existing authored courses, grouped
 * into phases with explicit rationale. Courses still live in
 * `AUTHORED_ACADEMY_COURSES`; a track only references them by slug and tells the
 * learner what to study, in what order, and why.
 */

export type LearningPathPhase = {
  id: string;
  /** Short label, e.g. "Phase 0 — Foundations". */
  title: string;
  /** When this phase fits in the learner's timeline. */
  timeframe: string;
  /** One or two sentences on why this phase comes here. */
  rationale: string;
  /** Authored course slugs, in the order they should be taken. */
  courseSlugs: string[];
};

export type LearningPath = {
  slug: string;
  title: string;
  shortTitle: string;
  /** Who the track is for and what it optimizes toward. */
  summary: string;
  /** The "north star" outcome of finishing the whole track. */
  outcome: string;
  phases: LearningPathPhase[];
};

/**
 * The ML Engineer / Applied Scientist track.
 *
 * Phasing is sequenced so each phase unlocks the next: math + framing + DS&A
 * are the vocabulary the rest of ML is written in; core ML builds the modeling
 * spine; production/systems makes models that actually ship; the frontier phase
 * is breadth you reach for once the core is solid. Timeframe notes anchor the
 * sequence to the OMSCS ML start (Aug 2026) — Phase 0 is the "before you start"
 * warmup, the rest runs alongside coursework.
 */
export const ML_ENGINEER_TRACK: LearningPath = {
  slug: "ml-engineer",
  title: "ML Engineer / Applied Scientist Track",
  shortTitle: "ML Engineer Track",
  summary:
    "An ordered path from working software engineer to ML-Engineer-capable. It prioritizes modeling that ships to production over pure analytics, and sequences the authored academy so each course builds on the last.",
  outcome:
    "Able to frame an ML problem, build and evaluate classical + deep models, ship them as reliable production systems, and reason about modern LLM / frontier work.",
  phases: [
    {
      id: "foundations",
      title: "Phase 0 — Foundations",
      timeframe: "Before OMSCS starts (now → Aug 2026)",
      rationale:
        "The vocabulary the rest of ML is written in. Get math intuition, problem framing, and algorithmic fluency solid first so later courses feel structural instead of memorized.",
      courseSlugs: [
        "mathematical-thinking-for-ml",
        "ml-problem-framing-and-evaluation",
        "data-structures-and-algorithms",
      ],
    },
    {
      id: "core-ml",
      title: "Phase 1 — Core ML",
      timeframe: "First terms alongside OMSCS",
      rationale:
        "The modeling spine: how to reason under uncertainty, fit and interpret classical models, then move into deep learning. This is the heart of an Applied Scientist's toolkit.",
      courseSlugs: [
        "statistical-inference-and-probabilistic-modeling",
        "classical-ml-and-statistical-learning",
        "deep-learning-and-representation-engineering",
      ],
    },
    {
      id: "production-systems",
      title: "Phase 2 — Production & Systems",
      timeframe: "Once core modeling feels comfortable",
      rationale:
        "Where your existing SWE strength compounds: turn models into reliable, observable, maintainable production systems. This is the differentiator that separates ML Engineers from notebook-only practitioners.",
      courseSlugs: [
        "scientific-computing-and-data-systems-for-mle",
        "ml-systems-and-mlops",
      ],
    },
    {
      id: "frontier-breadth",
      title: "Phase 3 — Frontier & Breadth",
      timeframe: "Breadth — reach for these once the core is solid",
      rationale:
        "Modern surface area and optionality: LLM/RAG/agentic systems, responsible/frontier practice, plus vision, RL, and historical context. Take in any order based on the role you're targeting.",
      courseSlugs: [
        "llm-rag-and-agentic-systems",
        "reliable-responsible-and-frontier-ml-2026",
        "computer-vision-and-multimodal-systems",
        "reinforcement-learning-and-sequential-decision-making",
        "history-of-ai-ml",
      ],
    },
  ],
};

export const LEARNING_PATHS: LearningPath[] = [ML_ENGINEER_TRACK];

/** A course resolved into the serializable shape the path UI needs. */
export type ResolvedPathCourse = {
  slug: string;
  title: string;
  shortTitle: string;
  summary: string;
  outcomes: string[];
  badgeEmblem: string;
  lessonIds: string[];
  firstLessonId: string | null;
  lessonCount: number;
};

export type ResolvedPathPhase = Omit<LearningPathPhase, "courseSlugs"> & {
  courses: ResolvedPathCourse[];
};

export type ResolvedLearningPath = Omit<LearningPath, "phases"> & {
  phases: ResolvedPathPhase[];
  totalCourses: number;
  totalLessons: number;
};

/**
 * Join a track's slug references against the authored academy so the UI gets
 * concrete, serializable course data. Slugs with no matching authored course
 * are skipped (keeps the track resilient to course renames). Server-side only —
 * it pulls the full authored academy.
 */
export function resolveLearningPath(path: LearningPath): ResolvedLearningPath {
  const coursesBySlug = new Map(
    getAuthoredAcademyCourses().map((course) => [course.slug, course]),
  );

  const phases: ResolvedPathPhase[] = path.phases.map((phase) => ({
    id: phase.id,
    title: phase.title,
    timeframe: phase.timeframe,
    rationale: phase.rationale,
    courses: phase.courseSlugs
      .map((slug) => coursesBySlug.get(slug))
      .filter((course): course is NonNullable<typeof course> => Boolean(course))
      .map((course) => ({
        slug: course.slug,
        title: course.title,
        shortTitle: course.shortTitle,
        summary: course.summary,
        outcomes: course.outcomes,
        badgeEmblem: course.badge.emblem,
        lessonIds: course.lessons.map((lesson) => lesson.id),
        firstLessonId: course.lessons[0]?.id ?? null,
        lessonCount: course.lessons.length,
      })),
  }));

  const totalCourses = phases.reduce((sum, phase) => sum + phase.courses.length, 0);
  const totalLessons = phases.reduce(
    (sum, phase) =>
      sum + phase.courses.reduce((acc, course) => acc + course.lessonCount, 0),
    0,
  );

  return {
    slug: path.slug,
    title: path.title,
    shortTitle: path.shortTitle,
    summary: path.summary,
    outcome: path.outcome,
    phases,
    totalCourses,
    totalLessons,
  };
}

export function getMlEngineerTrack(): ResolvedLearningPath {
  return resolveLearningPath(ML_ENGINEER_TRACK);
}
