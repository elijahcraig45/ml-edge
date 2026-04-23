"use client";

import { useRef, useMemo, useState, useSyncExternalStore } from "react";
import { doc, runTransaction, serverTimestamp } from "@firebase/firestore";
import { useFirebase } from "@/context/firebase-context";
import { firestore } from "@/lib/firebase/client";
import {
  buildLessonProgressStorageKey,
  readLessonProgressSnapshot,
  subscribeToLessonProgress,
  writeLessonProgressSnapshot,
} from "@/lib/lesson-progress";
import type { HostedLessonContent } from "@/lib/hosted-lessons";
import type { LessonQuiz } from "@/lib/types";

type PhaseId = "lecture" | "tutorial" | "practice" | "quiz" | "mastery";

type StoredLessonState = {
  completedLectureSegments: boolean[];
  completedTutorialSteps: boolean[];
  completedMasteryItems: boolean[];
  quizAnswers: Array<number | null>;
  quizSubmitted: boolean;
  lessonCompleted: boolean;
  reflection: string;
  checkpointResponsesBySegmentTitle: Record<string, string>;
  practiceRevealedHintsByProblemId: Record<string, boolean>;
  practiceRevealedSolutionsByProblemId: Record<string, boolean>;
  practiceSelfAssessmentByProblemId: Record<string, "got-it" | "needs-work">;
};

type InteractiveLessonExperienceProps = {
  courseSlug: string;
  lessonId: string;
  hostedLesson: HostedLessonContent;
  quiz: LessonQuiz;
};

function normalizeBooleanArray(value: unknown, length: number) {
  const values = Array.isArray(value) ? value : [];
  return Array.from({ length }, (_, index) => values[index] === true);
}

function normalizeAnswerArray(value: unknown, length: number) {
  const values = Array.isArray(value) ? value : [];
  return Array.from({ length }, (_, index) =>
    typeof values[index] === "number" ? values[index] : null,
  );
}

function buildDefaultState(
  hostedLesson: HostedLessonContent,
  quiz: LessonQuiz,
): StoredLessonState {
  return {
    completedLectureSegments: Array.from(
      { length: hostedLesson.lectureSegments.length },
      () => false,
    ),
    completedTutorialSteps: Array.from(
      { length: hostedLesson.tutorialSteps.length },
      () => false,
    ),
    completedMasteryItems: Array.from(
      { length: hostedLesson.masteryChecklist.length },
      () => false,
    ),
    quizAnswers: Array.from({ length: quiz.questions.length }, () => null),
    quizSubmitted: false,
    lessonCompleted: false,
    reflection: "",
    checkpointResponsesBySegmentTitle: {},
    practiceRevealedHintsByProblemId: {},
    practiceRevealedSolutionsByProblemId: {},
    practiceSelfAssessmentByProblemId: {},
  };
}

function normalizeStoredState(
  value: unknown,
  hostedLesson: HostedLessonContent,
  quiz: LessonQuiz,
): StoredLessonState {
  const defaults = buildDefaultState(hostedLesson, quiz);

  if (!value || typeof value !== "object") {
    return defaults;
  }

  const stored = value as Record<string, unknown>;

  return {
    completedLectureSegments: normalizeBooleanArray(
      stored.completedLectureSegments,
      hostedLesson.lectureSegments.length,
    ),
    completedTutorialSteps: normalizeBooleanArray(
      stored.completedTutorialSteps,
      hostedLesson.tutorialSteps.length,
    ),
    completedMasteryItems: normalizeBooleanArray(
      stored.completedMasteryItems,
      hostedLesson.masteryChecklist.length,
    ),
    quizAnswers: normalizeAnswerArray(stored.quizAnswers, quiz.questions.length),
    quizSubmitted: stored.quizSubmitted === true,
    lessonCompleted: stored.lessonCompleted === true,
    reflection: typeof stored.reflection === "string" ? stored.reflection : "",
    checkpointResponsesBySegmentTitle:
      stored.checkpointResponsesBySegmentTitle &&
      typeof stored.checkpointResponsesBySegmentTitle === "object" &&
      !Array.isArray(stored.checkpointResponsesBySegmentTitle)
        ? (stored.checkpointResponsesBySegmentTitle as Record<string, string>)
        : {},
    practiceRevealedHintsByProblemId:
      stored.practiceRevealedHintsByProblemId &&
      typeof stored.practiceRevealedHintsByProblemId === "object" &&
      !Array.isArray(stored.practiceRevealedHintsByProblemId)
        ? (stored.practiceRevealedHintsByProblemId as Record<string, boolean>)
        : {},
    practiceRevealedSolutionsByProblemId:
      stored.practiceRevealedSolutionsByProblemId &&
      typeof stored.practiceRevealedSolutionsByProblemId === "object" &&
      !Array.isArray(stored.practiceRevealedSolutionsByProblemId)
        ? (stored.practiceRevealedSolutionsByProblemId as Record<string, boolean>)
        : {},
    practiceSelfAssessmentByProblemId:
      stored.practiceSelfAssessmentByProblemId &&
      typeof stored.practiceSelfAssessmentByProblemId === "object" &&
      !Array.isArray(stored.practiceSelfAssessmentByProblemId)
        ? (stored.practiceSelfAssessmentByProblemId as Record<
            string,
            "got-it" | "needs-work"
          >)
        : {},
  };
}

function readStoredLessonState(
  storageSnapshot: string | null,
  hostedLesson: HostedLessonContent,
  quiz: LessonQuiz,
) {
  if (!storageSnapshot) {
    return buildDefaultState(hostedLesson, quiz);
  }

  try {
    const parsed = JSON.parse(storageSnapshot) as unknown;
    return normalizeStoredState(parsed, hostedLesson, quiz);
  } catch {
    return buildDefaultState(hostedLesson, quiz);
  }
}

function computeInitialPhase(
  storageKey: string,
  hostedLesson: HostedLessonContent,
  quiz: LessonQuiz,
): PhaseId {
  const snapshot = readLessonProgressSnapshot(storageKey);
  if (!snapshot) return "lecture";
  try {
    const parsed = JSON.parse(snapshot) as unknown;
    const s = normalizeStoredState(parsed, hostedLesson, quiz);
    if (!s.completedLectureSegments.every(Boolean)) return "lecture";
    if (!s.completedTutorialSteps.every(Boolean)) return "tutorial";
    const practiceCount = (hostedLesson.practiceProblems ?? []).length;
    if (
      practiceCount > 0 &&
      Object.keys(s.practiceSelfAssessmentByProblemId).length < practiceCount
    )
      return "practice";
    if (!s.quizSubmitted) return "quiz";
    return "mastery";
  } catch {
    return "lecture";
  }
}

function computeInitialExpansion(
  storageKey: string,
  hostedLesson: HostedLessonContent,
  quiz: LessonQuiz,
) {
  const snapshot = readLessonProgressSnapshot(storageKey);
  const defaultLecture = Array.from(
    { length: hostedLesson.lectureSegments.length },
    () => true,
  );
  const defaultTutorial = Array.from(
    { length: hostedLesson.tutorialSteps.length },
    () => true,
  );
  if (!snapshot) return { lecture: defaultLecture, tutorial: defaultTutorial };
  try {
    const parsed = JSON.parse(snapshot) as unknown;
    const s = normalizeStoredState(parsed, hostedLesson, quiz);
    return {
      lecture: s.completedLectureSegments.map((done) => !done),
      tutorial: s.completedTutorialSteps.map((done) => !done),
    };
  } catch {
    return { lecture: defaultLecture, tutorial: defaultTutorial };
  }
}

export function InteractiveLessonExperience({
  courseSlug,
  lessonId,
  hostedLesson,
  quiz,
}: InteractiveLessonExperienceProps) {
  const { isConfigured, user } = useFirebase();
  const storageKey = buildLessonProgressStorageKey(courseSlug, lessonId);
  const completionToken = `lesson:${courseSlug}:${lessonId}`;

  const topRef = useRef<HTMLDivElement>(null);

  const storageSnapshot = useSyncExternalStore(
    subscribeToLessonProgress,
    () => readLessonProgressSnapshot(storageKey),
    () => null,
  );
  const state = useMemo(
    () => readStoredLessonState(storageSnapshot, hostedLesson, quiz),
    [hostedLesson, quiz, storageSnapshot],
  );

  const practiceProblems = hostedLesson.practiceProblems ?? [];
  const hasPractice = practiceProblems.length > 0;

  const [activePhase, setActivePhase] = useState<PhaseId>(() =>
    computeInitialPhase(storageKey, hostedLesson, quiz),
  );

  const initialExpansion = useMemo(
    () => computeInitialExpansion(storageKey, hostedLesson, quiz),
    // intentionally only on mount — storageKey is stable per lesson
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [expandedLectureSegments, setExpandedLectureSegments] = useState<boolean[]>(
    () => initialExpansion.lecture,
  );
  const [expandedTutorialSteps, setExpandedTutorialSteps] = useState<boolean[]>(
    () => initialExpansion.tutorial,
  );

  const [message, setMessage] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  function updateState(updater: (current: StoredLessonState) => StoredLessonState) {
    const nextState = updater(state);
    writeLessonProgressSnapshot(storageKey, JSON.stringify(nextState));
  }

  const answeredCount = state.quizAnswers.filter((answer) => answer !== null).length;
  const score = useMemo(
    () =>
      state.quizAnswers.reduce<number>((total, answer, index) => {
        return total + (answer === quiz.questions[index]?.answerIndex ? 1 : 0);
      }, 0),
    [quiz.questions, state.quizAnswers],
  );

  const completedUnits =
    state.completedLectureSegments.filter(Boolean).length +
    state.completedTutorialSteps.filter(Boolean).length +
    state.completedMasteryItems.filter(Boolean).length +
    (state.quizSubmitted ? 1 : 0);
  const totalUnits =
    hostedLesson.lectureSegments.length +
    hostedLesson.tutorialSteps.length +
    hostedLesson.masteryChecklist.length +
    1;
  const progressPercent = Math.round((completedUnits / Math.max(totalUnits, 1)) * 100);

  const readyToComplete =
    state.completedLectureSegments.every(Boolean) &&
    state.completedTutorialSteps.every(Boolean) &&
    state.completedMasteryItems.every(Boolean) &&
    state.quizSubmitted &&
    score >= quiz.grading.passingScore;

  // Phase completion — quiz requires passing score, practice requires any self-assessment
  const lectureComplete = state.completedLectureSegments.every(Boolean);
  const tutorialComplete = state.completedTutorialSteps.every(Boolean);
  const assessedCount = Object.keys(state.practiceSelfAssessmentByProblemId).length;
  const practiceComplete = hasPractice && assessedCount === practiceProblems.length;
  const quizComplete = state.quizSubmitted && score >= quiz.grading.passingScore;
  const masteryComplete = state.completedMasteryItems.every(Boolean);

  type PhaseInfo = {
    id: PhaseId;
    label: string;
    done: number;
    total: number;
    complete: boolean;
  };

  const phases: PhaseInfo[] = [
    {
      id: "lecture",
      label: "Lecture",
      done: state.completedLectureSegments.filter(Boolean).length,
      total: hostedLesson.lectureSegments.length,
      complete: lectureComplete,
    },
    {
      id: "tutorial",
      label: "Tutorial",
      done: state.completedTutorialSteps.filter(Boolean).length,
      total: hostedLesson.tutorialSteps.length,
      complete: tutorialComplete,
    },
    ...(hasPractice
      ? [
          {
            id: "practice" as PhaseId,
            label: "Practice",
            done: assessedCount,
            total: practiceProblems.length,
            complete: practiceComplete,
          },
        ]
      : []),
    {
      id: "quiz",
      label: "Quiz",
      done: state.quizSubmitted ? score : answeredCount,
      total: quiz.questions.length,
      complete: quizComplete,
    },
    {
      id: "mastery",
      label: "Mastery",
      done: state.completedMasteryItems.filter(Boolean).length,
      total: hostedLesson.masteryChecklist.length,
      complete: masteryComplete,
    },
  ];

  const currentPhaseIndex = phases.findIndex((p) => p.id === activePhase);
  const nextPhase = phases[currentPhaseIndex + 1] ?? null;
  const currentPhaseComplete = phases[currentPhaseIndex]?.complete ?? false;

  function changePhase(phase: PhaseId) {
    setActivePhase(phase);
    setMessage(null);
    setTimeout(
      () => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      0,
    );
  }

  function toggleLectureSegment(index: number) {
    updateState((current) => ({
      ...current,
      completedLectureSegments: current.completedLectureSegments.map((v, i) =>
        i === index ? !v : v,
      ),
    }));
    // Auto-collapse when marking done; re-expand when un-marking
    setExpandedLectureSegments((prev) =>
      prev.map((v, i) => (i === index ? state.completedLectureSegments[index] : v)),
    );
  }

  function toggleTutorialStep(index: number) {
    updateState((current) => ({
      ...current,
      completedTutorialSteps: current.completedTutorialSteps.map((v, i) =>
        i === index ? !v : v,
      ),
    }));
    setExpandedTutorialSteps((prev) =>
      prev.map((v, i) => (i === index ? state.completedTutorialSteps[index] : v)),
    );
  }

  function toggleMasteryItem(index: number) {
    updateState((current) => ({
      ...current,
      completedMasteryItems: current.completedMasteryItems.map((v, i) =>
        i === index ? !v : v,
      ),
    }));
  }

  function setQuizAnswer(questionIndex: number, answerIndex: number) {
    updateState((current) => ({
      ...current,
      quizAnswers: current.quizAnswers.map((value, index) =>
        index === questionIndex ? answerIndex : value,
      ),
    }));
  }

  function submitQuiz() {
    if (state.quizAnswers.some((answer) => answer === null)) {
      setMessage("Answer every question before grading.");
      return;
    }
    updateState((current) => ({ ...current, quizSubmitted: true }));
    setMessage(
      score >= quiz.grading.passingScore
        ? "Quiz passed — move to the Mastery phase."
        : `Score: ${score}/${quiz.questions.length}. Review the explanations, then reset to try again.`,
    );
  }

  function resetQuiz() {
    updateState((current) => ({
      ...current,
      quizAnswers: Array.from({ length: quiz.questions.length }, () => null),
      quizSubmitted: false,
    }));
    setMessage(null);
  }

  async function completeLesson() {
    if (!readyToComplete) {
      setMessage(
        "Complete the lecture, tutorial, mastery checklist, and pass the quiz first.",
      );
      return;
    }

    setIsCompleting(true);
    setMessage(null);

    try {
      if (user && firestore) {
        const userRef = doc(firestore, "users", user.uid);

        await runTransaction(firestore, async (transaction) => {
          const snapshot = await transaction.get(userRef);
          const data = snapshot.data();
          const completedModules = Array.isArray(data?.completedModules)
            ? data.completedModules.filter(
                (value): value is string => typeof value === "string",
              )
            : [];

          transaction.set(
            userRef,
            {
              uid: user.uid,
              email: user.email ?? "",
              lastLogin: serverTimestamp(),
              completedModules: completedModules.includes(completionToken)
                ? completedModules
                : [...completedModules, completionToken],
            },
            { merge: true },
          );
        });

        setMessage("Lesson completed and synced to your Firebase progress record.");
      } else if (!isConfigured) {
        setMessage(
          "Lesson completed locally. Add Firebase config and sign in to persist progress.",
        );
      } else {
        setMessage("Lesson completed locally. Sign in to sync your progress.");
      }

      updateState((current) => ({ ...current, lessonCompleted: true }));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Lesson progress could not sync: ${error.message}`
          : "Lesson progress could not sync. Please try again.",
      );
    } finally {
      setIsCompleting(false);
    }
  }

  return (
    <div ref={topRef} className="space-y-5">
      {/* Overall progress */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2 rounded-3xl border border-white/10 bg-slate-900/60 p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-indigo-300">
                Lesson progress
              </p>
              <p className="mt-1 text-3xl font-semibold text-white">{progressPercent}%</p>
            </div>
            <p className="mb-1 text-sm text-slate-500">
              {completedUnits}/{totalUnits} checkpoints
            </p>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-950/80">
            <div
              className="h-2 rounded-full bg-indigo-400 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">
            Quiz
          </p>
          <p className="mt-1 text-3xl font-semibold text-white">
            {state.quizSubmitted
              ? `${score}/${quiz.questions.length}`
              : `${answeredCount}/${quiz.questions.length}`}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {state.quizSubmitted ? "Graded" : "Answered"}
          </p>
        </div>
      </div>

      {/* Phase tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {phases.map((phase) => (
          <button
            key={phase.id}
            type="button"
            onClick={() => changePhase(phase.id)}
            className={[
              "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
              activePhase === phase.id
                ? "border-indigo-400/60 bg-indigo-500/20 text-indigo-100"
                : phase.complete
                  ? "border-emerald-400/30 bg-emerald-500/5 text-emerald-200 hover:border-emerald-400/50"
                  : "border-white/10 bg-slate-900/60 text-slate-300 hover:border-slate-500",
            ].join(" ")}
          >
            {phase.complete ? <span className="text-[10px] text-emerald-400">✓</span> : null}
            {phase.label}
            <span
              className={[
                "font-mono text-[10px]",
                activePhase === phase.id ? "text-indigo-300/70" : "text-slate-600",
              ].join(" ")}
            >
              {phase.done}/{phase.total}
            </span>
          </button>
        ))}
      </div>

      {/* ═══ LECTURE PHASE ═══ */}
      {activePhase === "lecture" && (
        <div className="space-y-3">
          {hostedLesson.lectureSegments.map((segment, index) => {
            const isDone = state.completedLectureSegments[index];
            const isExpanded = expandedLectureSegments[index];

            return (
              <div
                key={segment.title}
                className={[
                  "rounded-3xl border transition-colors",
                  isDone ? "border-emerald-400/20 bg-slate-900/40" : "border-white/10 bg-slate-900/60",
                ].join(" ")}
              >
                {/* Header — always visible */}
                <div className="flex items-center gap-3 p-4 sm:p-5">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedLectureSegments((prev) =>
                        prev.map((v, i) => (i === index ? !v : v)),
                      )
                    }
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span
                      className={[
                        "shrink-0 font-mono text-[11px] uppercase tracking-[0.2em]",
                        isDone ? "text-emerald-400" : "text-indigo-300",
                      ].join(" ")}
                    >
                      {isDone ? "✓" : `Seg ${index + 1}`}
                    </span>
                    <h3
                      className={[
                        "text-base font-semibold truncate",
                        isDone ? "text-slate-400" : "text-slate-100",
                      ].join(" ")}
                    >
                      {segment.title}
                    </h3>
                    <span className="ml-auto shrink-0 text-xs text-slate-600">
                      {isExpanded ? "↑" : "↓"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleLectureSegment(index)}
                    className={[
                      "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                      isDone
                        ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300 hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-300"
                        : "border-white/10 bg-slate-950/60 text-slate-400 hover:border-emerald-400/30 hover:text-emerald-300",
                    ].join(" ")}
                  >
                    {isDone ? "Undo" : "Done"}
                  </button>
                </div>

                {/* Body — collapsible */}
                {isExpanded && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                    <div className="space-y-4">
                      {segment.explanation.map((paragraph) => (
                        <p key={paragraph} className="text-sm leading-7 text-slate-300">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Applied lens
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          {segment.appliedLens}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Checkpoint question
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          {segment.checkpoint}
                        </p>
                        <textarea
                          value={
                            state.checkpointResponsesBySegmentTitle[segment.title] ?? ""
                          }
                          onChange={(event) =>
                            updateState((current) => ({
                              ...current,
                              checkpointResponsesBySegmentTitle: {
                                ...current.checkpointResponsesBySegmentTitle,
                                [segment.title]: event.target.value,
                              },
                            }))
                          }
                          rows={3}
                          placeholder="Write your response before moving on..."
                          className="mt-3 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-600 focus:border-indigo-400/40"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {nextPhase && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => changePhase(nextPhase.id)}
                className={[
                  "rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors",
                  currentPhaseComplete
                    ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-100 hover:border-indigo-300"
                    : "border-white/10 text-slate-400 hover:border-slate-500",
                ].join(" ")}
              >
                {currentPhaseComplete
                  ? `Continue to ${nextPhase.label} →`
                  : `Skip to ${nextPhase.label} →`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ TUTORIAL PHASE ═══ */}
      {activePhase === "tutorial" && (
        <div className="space-y-3">
          {hostedLesson.tutorialSteps.map((step, index) => {
            const isDone = state.completedTutorialSteps[index];
            const isExpanded = expandedTutorialSteps[index];

            return (
              <div
                key={step.title}
                className={[
                  "rounded-3xl border transition-colors",
                  isDone ? "border-emerald-400/20 bg-slate-900/40" : "border-white/10 bg-slate-900/60",
                ].join(" ")}
              >
                <div className="flex items-center gap-3 p-4 sm:p-5">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedTutorialSteps((prev) =>
                        prev.map((v, i) => (i === index ? !v : v)),
                      )
                    }
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span
                      className={[
                        "shrink-0 font-mono text-[11px] uppercase tracking-[0.2em]",
                        isDone ? "text-emerald-400" : "text-indigo-300",
                      ].join(" ")}
                    >
                      {isDone ? "✓" : `Step ${index + 1}`}
                    </span>
                    <h3
                      className={[
                        "text-base font-semibold truncate",
                        isDone ? "text-slate-400" : "text-slate-100",
                      ].join(" ")}
                    >
                      {step.title}
                    </h3>
                    <span className="ml-auto shrink-0 text-xs text-slate-600">
                      {isExpanded ? "↑" : "↓"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleTutorialStep(index)}
                    className={[
                      "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                      isDone
                        ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300 hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-300"
                        : "border-white/10 bg-slate-950/60 text-slate-400 hover:border-emerald-400/30 hover:text-emerald-300",
                    ].join(" ")}
                  >
                    {isDone ? "Undo" : "Done"}
                  </button>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                    <p className="text-sm leading-6 text-slate-300">{step.purpose}</p>
                    <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
                      {step.instructions.map((instruction) => (
                        <li key={instruction}>- {instruction}</li>
                      ))}
                    </ul>
                    <div className="mt-4 grid gap-4">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Success signal
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          {step.successSignal}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/70">
                          Common failure mode
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          {step.failureMode}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {nextPhase && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => changePhase(nextPhase.id)}
                className={[
                  "rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors",
                  currentPhaseComplete
                    ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-100 hover:border-indigo-300"
                    : "border-white/10 text-slate-400 hover:border-slate-500",
                ].join(" ")}
              >
                {currentPhaseComplete
                  ? `Continue to ${nextPhase.label} →`
                  : `Skip to ${nextPhase.label} →`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ PRACTICE PHASE ═══ */}
      {activePhase === "practice" && hasPractice && (
        <div className="space-y-4">
          {practiceProblems.map((problem) => {
            const hintRevealed = state.practiceRevealedHintsByProblemId[problem.id] === true;
            const solutionRevealed =
              state.practiceRevealedSolutionsByProblemId[problem.id] === true;
            const selfAssessment = state.practiceSelfAssessmentByProblemId[problem.id];

            return (
              <div
                key={problem.id}
                className={[
                  "rounded-3xl border p-5 transition-colors",
                  selfAssessment === "got-it"
                    ? "border-emerald-400/20 bg-slate-900/40"
                    : selfAssessment === "needs-work"
                      ? "border-amber-400/20 bg-slate-900/40"
                      : "border-white/10 bg-slate-900/60",
                ].join(" ")}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={[
                      "rounded-full border px-3 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em]",
                      problem.difficulty === "warm-up"
                        ? "border-sky-400/30 text-sky-300"
                        : "border-violet-400/30 text-violet-300",
                    ].join(" ")}
                  >
                    {problem.difficulty}
                  </span>
                  {problem.formatLabel ? (
                    <span className="rounded-full border border-white/10 px-3 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-300">
                      {problem.formatLabel}
                    </span>
                  ) : null}
                  {selfAssessment && (
                    <span
                      className={[
                        "rounded-full border px-3 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em]",
                        selfAssessment === "got-it"
                          ? "border-emerald-400/30 text-emerald-300"
                          : "border-amber-400/30 text-amber-300",
                      ].join(" ")}
                    >
                      {selfAssessment === "got-it" ? "Got it" : "Needs work"}
                    </span>
                  )}
                </div>

                <p className="mt-3 text-sm font-semibold leading-7 text-slate-100">
                  {problem.prompt}
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  {!hintRevealed && (
                    <button
                      type="button"
                      onClick={() =>
                        updateState((current) => ({
                          ...current,
                          practiceRevealedHintsByProblemId: {
                            ...current.practiceRevealedHintsByProblemId,
                            [problem.id]: true,
                          },
                        }))
                      }
                      className="rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-200 hover:border-amber-300/50"
                    >
                      Show hint
                    </button>
                  )}
                  {!solutionRevealed && (
                    <button
                      type="button"
                      onClick={() =>
                        updateState((current) => ({
                          ...current,
                          practiceRevealedSolutionsByProblemId: {
                            ...current.practiceRevealedSolutionsByProblemId,
                            [problem.id]: true,
                          },
                        }))
                      }
                      className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-200 hover:border-emerald-300/50"
                    >
                      Show solution
                    </button>
                  )}
                </div>

                {hintRevealed && (
                  <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/70">
                      Hint
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{problem.hint}</p>
                  </div>
                )}

                {solutionRevealed && (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/70">
                        Solution
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {problem.solution}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Check your work
                      </p>
                      <ul className="mt-3 space-y-2">
                        {problem.checkYourWork.map((criterion) => (
                          <li
                            key={criterion}
                            className="flex items-start gap-2 text-sm leading-6 text-slate-300"
                          >
                            <span className="mt-1 text-xs text-slate-500">—</span>
                            {criterion}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {!selfAssessment && (
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-sm text-slate-400">Did you solve it?</p>
                        <button
                          type="button"
                          onClick={() =>
                            updateState((current) => ({
                              ...current,
                              practiceSelfAssessmentByProblemId: {
                                ...current.practiceSelfAssessmentByProblemId,
                                [problem.id]: "got-it",
                              },
                            }))
                          }
                          className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-200 hover:border-emerald-300/50"
                        >
                          Got it ✓
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateState((current) => ({
                              ...current,
                              practiceSelfAssessmentByProblemId: {
                                ...current.practiceSelfAssessmentByProblemId,
                                [problem.id]: "needs-work",
                              },
                            }))
                          }
                          className="rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-200 hover:border-amber-300/50"
                        >
                          Needs work
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {nextPhase && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => changePhase(nextPhase.id)}
                className={[
                  "rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors",
                  currentPhaseComplete
                    ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-100 hover:border-indigo-300"
                    : "border-white/10 text-slate-400 hover:border-slate-500",
                ].join(" ")}
              >
                {currentPhaseComplete
                  ? `Continue to ${nextPhase.label} →`
                  : `Skip to ${nextPhase.label} →`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ QUIZ PHASE ═══ */}
      {activePhase === "quiz" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-indigo-300">
                Assessment
              </p>
              <h3 className="mt-1 text-lg font-semibold text-slate-100">
                Interactive lesson quiz
              </h3>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-slate-400">
              Pass {quiz.grading.passingScore}/{quiz.grading.maxScore}
            </span>
          </div>

          <div className="space-y-4">
            {quiz.questions.map((question, questionIndex) => (
              <div
                key={question.id}
                className="rounded-3xl border border-white/10 bg-slate-950/55 p-5"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-indigo-300">
                  Check {questionIndex + 1}
                </p>
                <p className="mt-2 text-base font-semibold text-slate-100">
                  {question.prompt}
                </p>
                <div className="mt-4 grid gap-3">
                  {question.options.map((option, optionIndex) => {
                    const isSelected = state.quizAnswers[questionIndex] === optionIndex;
                    const isCorrect = question.answerIndex === optionIndex;

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setQuizAnswer(questionIndex, optionIndex)}
                        disabled={state.quizSubmitted}
                        className={[
                          "rounded-2xl border px-4 py-3 text-left text-sm",
                          isSelected
                            ? "border-indigo-400 bg-indigo-500/15 text-white"
                            : "border-white/10 bg-slate-900/60 text-slate-300 hover:border-slate-600",
                          state.quizSubmitted && isCorrect
                            ? "border-emerald-400/60 bg-emerald-500/10"
                            : "",
                          state.quizSubmitted && isSelected && !isCorrect
                            ? "border-rose-400/60 bg-rose-500/10"
                            : "",
                        ].join(" ")}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
                {state.quizSubmitted && (
                  <p className="mt-4 text-sm leading-6 text-slate-300">
                    <span className="font-semibold text-slate-100">Why it matters: </span>
                    {question.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm text-slate-300">
                  {state.quizSubmitted
                    ? `Score: ${score}/${quiz.questions.length} · Pass mark: ${quiz.grading.passingScore}`
                    : "Answer each question, then grade your lesson checkpoints."}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {quiz.grading.remediation}
                </p>
                {message ? (
                  <p className="mt-2 text-sm text-indigo-200">{message}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3">
                {state.quizSubmitted && score < quiz.grading.passingScore && (
                  <button
                    type="button"
                    onClick={resetQuiz}
                    className="rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-200 hover:border-amber-300/50"
                  >
                    Reset quiz
                  </button>
                )}
                <button
                  type="button"
                  onClick={submitQuiz}
                  disabled={state.quizSubmitted}
                  className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-5 py-2.5 text-sm font-semibold text-indigo-100 hover:border-indigo-300 hover:bg-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {state.quizSubmitted ? "Quiz graded" : "Grade lesson quiz"}
                </button>
              </div>
            </div>
          </div>

          {nextPhase && quizComplete && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => changePhase(nextPhase.id)}
                className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-5 py-2.5 text-sm font-semibold text-indigo-100 hover:border-indigo-300"
              >
                Continue to {nextPhase.label} →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ MASTERY PHASE ═══ */}
      {activePhase === "mastery" && (
        <div className="space-y-5">
          {/* Misconceptions — informational, not gating */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-indigo-300">
              Concept review
            </p>
            <h3 className="mt-2 text-base font-semibold text-slate-100">Common traps</h3>
            <div className="mt-3 space-y-3">
              {hostedLesson.misconceptions.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-sm leading-6 text-slate-300"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Reflection — informational, not gating */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-indigo-300">
              Reflection journal
            </p>
            <textarea
              value={state.reflection}
              onChange={(event) =>
                updateState((current) => ({
                  ...current,
                  reflection: event.target.value,
                }))
              }
              rows={6}
              placeholder="Write what clicked, what still feels fuzzy, and how you would apply this in a real system."
              className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400/40"
            />
            <ul className="mt-3 space-y-1 text-sm leading-6 text-slate-400">
              {hostedLesson.reflectionPrompts.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>

          {/* Mastery checklist */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-indigo-300">
              Mastery
            </p>
            <h3 className="mt-2 text-lg font-semibold text-slate-100">Lesson checklist</h3>
            <div className="mt-4 space-y-3">
              {hostedLesson.masteryChecklist.map((item, index) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleMasteryItem(index)}
                  className={[
                    "flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left",
                    state.completedMasteryItems[index]
                      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-50"
                      : "border-white/10 bg-slate-950/55 text-slate-300 hover:border-slate-500",
                  ].join(" ")}
                >
                  <span className="mt-0.5 text-xs">
                    {state.completedMasteryItems[index] ? "●" : "○"}
                  </span>
                  <span className="text-sm leading-6">{item}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Completion */}
          <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-100">Finish this lesson</p>
                <p className="mt-1 text-sm text-slate-400">
                  {state.lessonCompleted
                    ? "Lesson completion has been recorded."
                    : "Stores progress locally and syncs when you are signed in."}
                </p>
                {message ? (
                  <p className="mt-2 text-sm text-indigo-200">{message}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={completeLesson}
                disabled={isCompleting || state.lessonCompleted}
                className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-5 py-3 text-sm font-semibold text-indigo-100 hover:border-indigo-300 hover:bg-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {state.lessonCompleted
                  ? "Lesson completed"
                  : isCompleting
                    ? "Saving progress..."
                    : readyToComplete
                      ? "Complete lesson"
                      : "Finish checklist first"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
