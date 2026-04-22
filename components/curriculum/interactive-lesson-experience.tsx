"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
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

export function InteractiveLessonExperience({
  courseSlug,
  lessonId,
  hostedLesson,
  quiz,
}: InteractiveLessonExperienceProps) {
  const { isConfigured, user } = useFirebase();
  const storageKey = buildLessonProgressStorageKey(courseSlug, lessonId);
  const completionToken = `lesson:${courseSlug}:${lessonId}`;
  const storageSnapshot = useSyncExternalStore(
    subscribeToLessonProgress,
    () => readLessonProgressSnapshot(storageKey),
    () => null,
  );
  const state = useMemo(
    () => readStoredLessonState(storageSnapshot, hostedLesson, quiz),
    [hostedLesson, quiz, storageSnapshot],
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

  function updateBooleanArray(
    key:
      | "completedLectureSegments"
      | "completedTutorialSteps"
      | "completedMasteryItems",
    index: number,
  ) {
    updateState((current) => ({
      ...current,
      [key]: current[key].map((value, currentIndex) =>
        currentIndex === index ? !value : value,
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
      setMessage("Finish each checkpoint before grading the lesson quiz.");
      return;
    }

    updateState((current) => ({ ...current, quizSubmitted: true }));
    setMessage(
      score >= quiz.grading.passingScore
        ? "Quiz passed. You can now finish the lesson after clearing the mastery checklist."
        : "Quiz submitted. Review the explanations and remediation notes, then try again on the next pass.",
    );
  }

  async function completeLesson() {
    if (!readyToComplete) {
      setMessage("Complete the lecture, tutorial, mastery checklist, and quiz before finishing the lesson.");
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
          "Lesson completed locally. Add Firebase config and sign in later to sync progress.",
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
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-4 lg:col-span-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-indigo-300">
            Lesson progress
          </p>
          <p className="mt-3 text-3xl font-semibold text-white">{progressPercent}%</p>
          <p className="mt-2 text-sm text-slate-400">
            {completedUnits}/{totalUnits} guided checkpoints completed
          </p>
          <div className="mt-4 h-2 rounded-full bg-slate-950/80">
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
          <p className="mt-3 text-3xl font-semibold text-white">
            {state.quizSubmitted ? `${score}/${quiz.questions.length}` : `${answeredCount}/${quiz.questions.length}`}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {state.quizSubmitted ? "Graded checkpoints" : "Questions answered"}
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">
            Status
          </p>
          <p className="mt-3 text-lg font-semibold text-white">
            {state.lessonCompleted ? "Completed" : readyToComplete ? "Ready to finish" : "In progress"}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {state.lessonCompleted
              ? "Stored locally and ready to sync across sessions."
              : "Use the checklist to move from reading to mastery."}
          </p>
        </div>
      </div>

      <section className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-slate-100">Guided lecture arc</p>
          <div className="mt-3 space-y-4">
            {hostedLesson.lectureSegments.map((segment, index) => (
              <div
                key={segment.title}
                className="rounded-3xl border border-white/10 bg-slate-900/60 p-5"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-indigo-300">
                      Segment {index + 1}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-100">
                      {segment.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateBooleanArray("completedLectureSegments", index)}
                    className={[
                      "rounded-full border px-4 py-2 text-sm font-semibold",
                      state.completedLectureSegments[index]
                        ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                        : "border-white/10 bg-slate-950/60 text-slate-300 hover:border-slate-500",
                    ].join(" ")}
                  >
                    {state.completedLectureSegments[index] ? "Segment done" : "Mark segment done"}
                  </button>
                </div>
                <div className="mt-4 space-y-4">
                  {segment.explanation.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-7 text-slate-300">
                      {paragraph}
                    </p>
                  ))}
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
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
                      value={state.checkpointResponsesBySegmentTitle[segment.title] ?? ""}
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
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-slate-100">Guided tutorial path</p>
          <div className="mt-3 space-y-4">
            {hostedLesson.tutorialSteps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-3xl border border-white/10 bg-slate-900/60 p-5"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-indigo-300">
                      Step {index + 1}
                    </p>
                    <h3 className="mt-2 text-base font-semibold text-slate-100">
                      {step.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateBooleanArray("completedTutorialSteps", index)}
                    className={[
                      "rounded-full border px-4 py-2 text-sm font-semibold",
                      state.completedTutorialSteps[index]
                        ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                        : "border-white/10 bg-slate-950/60 text-slate-300 hover:border-slate-500",
                    ].join(" ")}
                  >
                    {state.completedTutorialSteps[index] ? "Step done" : "Mark step done"}
                  </button>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{step.purpose}</p>
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
            ))}
          </div>
        </div>
      </section>

      {(hostedLesson.practiceProblems ?? []).length > 0 ? (
        <section className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-slate-100">Practice problems</p>
            <div className="mt-3 space-y-4">
              {(hostedLesson.practiceProblems ?? []).map((problem) => {
                const hintRevealed = state.practiceRevealedHintsByProblemId[problem.id] === true;
                const solutionRevealed = state.practiceRevealedSolutionsByProblemId[problem.id] === true;

                return (
                  <div
                    key={problem.id}
                    className="rounded-3xl border border-white/10 bg-slate-900/60 p-5"
                  >
                    <div className="flex items-center gap-3">
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
                    </div>
                    <p className="mt-3 text-sm font-semibold leading-7 text-slate-100">
                      {problem.prompt}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {!hintRevealed ? (
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
                      ) : null}
                      {!solutionRevealed ? (
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
                      ) : null}
                    </div>
                    {hintRevealed ? (
                      <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/70">
                          Hint
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{problem.hint}</p>
                      </div>
                    ) : null}
                    {solutionRevealed ? (
                      <div className="mt-4 space-y-4">
                        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/70">
                            Solution
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-300">{problem.solution}</p>
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
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-indigo-300">
            Concept review
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-100">
            Misconceptions and reflection
          </h3>
          <div className="mt-4 space-y-5">
            <div>
              <p className="text-sm font-semibold text-slate-100">Common traps</p>
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
            <div>
              <p className="text-sm font-semibold text-slate-100">Reflection journal</p>
              <textarea
                value={state.reflection}
                onChange={(event) =>
                  updateState((current) => ({
                    ...current,
                    reflection: event.target.value,
                  }))
                }
                rows={7}
                placeholder="Write what clicked, what still feels fuzzy, and how you would apply this in a real system."
                className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400/40"
              />
              <ul className="mt-3 space-y-1 text-sm leading-6 text-slate-400">
                {hostedLesson.reflectionPrompts.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-indigo-300">
            Mastery
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-100">
            Lesson checklist and completion
          </h3>
          <div className="mt-4 space-y-3">
            {hostedLesson.masteryChecklist.map((item, index) => (
              <button
                key={item}
                type="button"
                onClick={() => updateBooleanArray("completedMasteryItems", index)}
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
          <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/55 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  Finish this lesson
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {state.lessonCompleted
                    ? "Lesson completion has been recorded."
                    : "Completing the lesson stores progress locally and syncs it when you are signed in."}
                </p>
                {message ? <p className="mt-2 text-sm text-indigo-200">{message}</p> : null}
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
        </section>
      </div>

      <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-indigo-300">
              Assessment
            </p>
            <h3 className="mt-2 text-lg font-semibold text-slate-100">
              Interactive lesson quiz
            </h3>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-slate-400">
            Pass {quiz.grading.passingScore}/{quiz.grading.maxScore}
          </span>
        </div>
        <div className="mt-4 space-y-4">
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
              {state.quizSubmitted ? (
                <p className="mt-4 text-sm leading-6 text-slate-300">
                  <span className="font-semibold text-slate-100">Why it matters:</span>{" "}
                  {question.explanation}
                </p>
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/55 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-slate-300">
                {state.quizSubmitted
                  ? `Current score: ${score}/${quiz.questions.length}`
                  : "Answer each question, then grade your lesson checkpoints."}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {quiz.grading.remediation}
              </p>
            </div>
            <button
              type="button"
              onClick={submitQuiz}
              disabled={state.quizSubmitted}
              className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-5 py-3 text-sm font-semibold text-indigo-100 hover:border-indigo-300 hover:bg-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {state.quizSubmitted ? "Quiz graded" : "Grade lesson quiz"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
