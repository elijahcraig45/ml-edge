import type { CompiledExercise, CompiledStage, QuizBlock } from "./artifact";

/**
 * A stage gate, derived from the stage's own content.
 *
 * Deriving rather than separately authoring means every stage gets a gate for
 * free, including ones written later, and the gate can never drift from the
 * lessons — a question can only appear here if it is still in a lesson.
 *
 * It draws from the CORE track only. A learner who took the interview path
 * should not be gated on a proof they were never shown.
 */

export type AssessmentQuestion = {
  id: string;
  lessonId: string;
  promptHtml: string;
  optionsHtml: string[];
  answerIndex: number;
  explanationHtml: string;
};

export type StageAssessment = {
  stageId: string;
  stageTitle: string;
  questions: AssessmentQuestion[];
  exercises: Array<{ exercise: CompiledExercise; lessonId: string }>;
  /** Correct answers needed, out of `questions.length`. */
  passingScore: number;
  /** Minutes; advisory, not enforced. */
  timeboxMinutes: number;
};

const MAX_QUESTIONS = 8;
const MAX_EXERCISES = 2;

export function buildStageAssessment(stage: CompiledStage): StageAssessment | null {
  const questions: AssessmentQuestion[] = [];
  const candidates: Array<{ exercise: CompiledExercise; lessonId: string }> = [];

  for (const lesson of stage.lessons) {
    for (const block of lesson.blocks) {
      if (block.kind === "quiz" && isCore(block)) {
        for (const q of block.questions) {
          questions.push({
            id: `${lesson.id}:${q.id}`,
            lessonId: lesson.id,
            promptHtml: q.promptHtml,
            optionsHtml: q.optionsHtml,
            answerIndex: q.answerIndex,
            explanationHtml: q.explanationHtml,
          });
        }
      }
    }
    for (const exercise of Object.values(lesson.exercises)) {
      if (exercise.tracks && !exercise.tracks.includes("core")) continue;
      candidates.push({ exercise, lessonId: lesson.id });
    }
  }

  if (questions.length < 3 || candidates.length === 0) return null;

  // Spread questions across lessons rather than taking the first N, so the gate
  // covers the stage instead of over-testing its opening.
  const spread = roundRobinByLesson(questions).slice(0, MAX_QUESTIONS);

  // Hardest exercises, and prefer covering both languages.
  const sorted = [...candidates].sort(
    (a, b) => b.exercise.difficulty - a.exercise.difficulty,
  );
  const exercises: typeof candidates = [];
  const python = sorted.find((c) => c.exercise.kind === "python");
  const sql = sorted.find((c) => c.exercise.kind === "sql");
  for (const pick of [python, sql]) if (pick) exercises.push(pick);
  for (const candidate of sorted) {
    if (exercises.length >= MAX_EXERCISES) break;
    if (!exercises.includes(candidate)) exercises.push(candidate);
  }

  return {
    stageId: stage.id,
    stageTitle: stage.title,
    questions: spread,
    exercises: exercises.slice(0, MAX_EXERCISES),
    passingScore: Math.ceil(spread.length * 0.75),
    timeboxMinutes: 30,
  };
}

function isCore(block: QuizBlock): boolean {
  return !block.tracks || block.tracks.includes("core");
}

function roundRobinByLesson(questions: AssessmentQuestion[]): AssessmentQuestion[] {
  const byLesson = new Map<string, AssessmentQuestion[]>();
  for (const q of questions) {
    const list = byLesson.get(q.lessonId) ?? [];
    list.push(q);
    byLesson.set(q.lessonId, list);
  }
  const lists = [...byLesson.values()];
  const out: AssessmentQuestion[] = [];
  let index = 0;
  while (out.length < questions.length) {
    let added = false;
    for (const list of lists) {
      if (list[index]) {
        out.push(list[index]);
        added = true;
      }
    }
    if (!added) break;
    index += 1;
  }
  return out;
}
