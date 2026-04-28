"use client";

import { doc, runTransaction, serverTimestamp } from "@firebase/firestore";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useFirebase } from "@/context/firebase-context";
import {
  buildCourseAssessmentStorageKey,
  readCourseAchievementSnapshot,
  subscribeToCourseAchievements,
  writeCourseAchievementSnapshot,
} from "@/lib/course-achievements";
import { firestore } from "@/lib/firebase/client";
import {
  buildLessonProgressStorageKey,
  readLessonProgressSnapshot,
  subscribeToLessonProgress,
} from "@/lib/lesson-progress";
import { PythonCodeRunner } from "@/components/curriculum/python-code-runner";
import type { AuthoredAcademyCourse } from "@/lib/authored-academy";

type StoredAssessmentState = {
  answers: Array<number | null>;
  submitted: boolean;
  passed: boolean;
  badgeAwarded: boolean;
  earnedAt: string | null;
  codingProblemsPassedById: Record<string, boolean>;
};

type CourseBadgeAssessmentProps = {
  course: AuthoredAcademyCourse;
};

function buildDefaultState(course: AuthoredAcademyCourse): StoredAssessmentState {
  return {
    answers: Array.from({ length: course.finalAssessment.questions.length }, () => null),
    submitted: false,
    passed: false,
    badgeAwarded: false,
    earnedAt: null,
    codingProblemsPassedById: {},
  };
}

function normalizeStoredAssessmentState(
  value: unknown,
  course: AuthoredAcademyCourse,
): StoredAssessmentState {
  const defaults = buildDefaultState(course);

  if (!value || typeof value !== "object") {
    return defaults;
  }

  const stored = value as Record<string, unknown>;
  const answers = Array.isArray(stored.answers) ? stored.answers : [];

  return {
    answers: Array.from({ length: course.finalAssessment.questions.length }, (_, index) =>
      typeof answers[index] === "number" ? answers[index] : null,
    ),
    submitted: stored.submitted === true,
    passed: stored.passed === true,
    badgeAwarded: stored.badgeAwarded === true,
    earnedAt: typeof stored.earnedAt === "string" ? stored.earnedAt : null,
    codingProblemsPassedById:
      stored.codingProblemsPassedById &&
      typeof stored.codingProblemsPassedById === "object" &&
      !Array.isArray(stored.codingProblemsPassedById)
        ? (stored.codingProblemsPassedById as Record<string, boolean>)
        : {},
  };
}

function readAssessmentState(snapshot: string | null, course: AuthoredAcademyCourse) {
  if (!snapshot) {
    return buildDefaultState(course);
  }

  try {
    const parsed = JSON.parse(snapshot) as unknown;
    return normalizeStoredAssessmentState(parsed, course);
  } catch {
    return buildDefaultState(course);
  }
}

export function CourseBadgeAssessment({ course }: CourseBadgeAssessmentProps) {
  const { isConfigured, user } = useFirebase();
  const storageKey = buildCourseAssessmentStorageKey(course.slug);
  const badgeToken = `badge:authored:${course.slug}`;
  const assessmentSnapshot = useSyncExternalStore(
    subscribeToCourseAchievements,
    () => readCourseAchievementSnapshot(storageKey),
    () => null,
  );
  const completedLessons = useSyncExternalStore(
    subscribeToLessonProgress,
    () =>
      course.lessons.filter((lesson) => {
        const raw = readLessonProgressSnapshot(
          buildLessonProgressStorageKey(course.slug, lesson.id),
        );

        if (!raw) {
          return false;
        }

        try {
          const parsed = JSON.parse(raw) as { lessonCompleted?: boolean };
          return parsed.lessonCompleted === true;
        } catch {
          return false;
        }
      }).length,
    () => 0,
  );
  const state = useMemo(
    () => readAssessmentState(assessmentSnapshot, course),
    [assessmentSnapshot, course],
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  function updateState(updater: (current: StoredAssessmentState) => StoredAssessmentState) {
    writeCourseAchievementSnapshot(storageKey, JSON.stringify(updater(state)));
  }

  const score = state.answers.reduce<number>((total, answer, index) => {
    return total + (answer === course.finalAssessment.questions[index]?.answerIndex ? 1 : 0);
  }, 0);
  const readyForAssessment = completedLessons === course.lessons.length;
  const passingScore = course.finalAssessment.passingScore;
  const codingProblems = course.finalAssessment.codingProblems ?? [];
  const allCodingPassed =
    codingProblems.length === 0 ||
    codingProblems.every((p) => state.codingProblemsPassedById[p.id] === true);
  const codingPassedCount = codingProblems.filter(
    (p) => state.codingProblemsPassedById[p.id] === true,
  ).length;

  function setAnswer(questionIndex: number, answerIndex: number) {
    updateState((current) => ({
      ...current,
      answers: current.answers.map((value, index) =>
        index === questionIndex ? answerIndex : value,
      ),
      submitted: false,
      passed: false,
    }));
  }

  async function syncBadge() {
    if (!user || !firestore) {
      return false;
    }

    const userRef = doc(firestore, "users", user.uid);

    await runTransaction(firestore, async (transaction) => {
      const snapshot = await transaction.get(userRef);
      const data = snapshot.data();
      const completedModules = Array.isArray(data?.completedModules)
        ? data.completedModules.filter((value): value is string => typeof value === "string")
        : [];

      transaction.set(
        userRef,
        {
          uid: user.uid,
          email: user.email ?? "",
          lastLogin: serverTimestamp(),
          completedModules: completedModules.includes(badgeToken)
            ? completedModules
            : [...completedModules, badgeToken],
        },
        { merge: true },
      );
    });

    return true;
  }

  async function submitAssessment() {
    if (!readyForAssessment) {
      setMessage("Finish every lesson in this course before taking the badge test.");
      return;
    }

    if (state.answers.some((answer) => answer === null)) {
      setMessage("Answer every question before grading the badge test.");
      return;
    }

    if (!allCodingPassed) {
      setMessage(
        `Pass all coding challenges before submitting (${codingPassedCount}/${codingProblems.length} complete).`,
      );
      return;
    }

    const passed = score >= passingScore;

    updateState((current) => ({
      ...current,
      submitted: true,
      passed,
      badgeAwarded: passed ? true : current.badgeAwarded,
      earnedAt: passed ? current.earnedAt ?? new Date().toISOString() : current.earnedAt,
    }));

    if (!passed) {
      setMessage(
        `Not yet. You scored ${score}/${course.finalAssessment.questions.length}. Review the lessons and try again.`,
      );
      return;
    }

    setIsSyncing(true);

    try {
      const synced = await syncBadge();

      if (synced) {
        setMessage(`Badge earned and synced: ${course.badge.title}.`);
      } else if (!isConfigured) {
        setMessage(`Badge earned locally: ${course.badge.title}. Add Firebase later to sync it.`);
      } else {
        setMessage(`Badge earned locally: ${course.badge.title}. Sign in to sync it.`);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Badge earned locally, but sync failed: ${error.message}`
          : "Badge earned locally, but sync failed.",
      );
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-300">
            Badge
          </p>
          <p className="mt-3 text-lg font-semibold text-white">{course.badge.title}</p>
          <p className="mt-2 text-sm text-slate-400">{course.badge.emblem}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">
            Lessons complete
          </p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {completedLessons}/{course.lessons.length}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {readyForAssessment ? "Assessment unlocked" : "Finish the course to unlock"}
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">
            Status
          </p>
          <p className="mt-3 text-lg font-semibold text-white">
            {state.badgeAwarded ? "Badge earned" : readyForAssessment ? "Ready for test" : "In progress"}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {state.earnedAt
              ? `Earned ${new Date(state.earnedAt).toLocaleDateString()}`
              : course.badge.description}
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-indigo-300">
          Final assessment
        </p>
        <h3 className="mt-2 text-lg font-semibold text-slate-100">
          {course.finalAssessment.title}
        </h3>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          {course.finalAssessment.description}
        </p>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Pass {passingScore}/{course.finalAssessment.questions.length} multiple-choice
          {codingProblems.length > 0
            ? ` + all ${codingProblems.length} coding challenge${codingProblems.length > 1 ? "s" : ""}`
            : ""}{" "}
          to earn the badge.
        </p>
      </div>

      {codingProblems.length > 0 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/5 px-5 py-4">
            <p className="text-sm font-semibold text-indigo-200">
              Coding Challenges — {codingPassedCount}/{codingProblems.length} passed
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Implement both solutions and pass all test cases before submitting the badge
              test. Python runs in-browser via Pyodide.
            </p>
          </div>
          {codingProblems.map((problem) => {
            const passed = state.codingProblemsPassedById[problem.id] === true;
            return (
              <div key={problem.id} className="space-y-2">
                {passed && (
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-sm text-emerald-400">✓</span>
                    <span className="text-sm text-emerald-300">
                      {problem.title} — all tests passed
                    </span>
                  </div>
                )}
                <PythonCodeRunner
                  problem={problem}
                  onAllPassed={() =>
                    updateState((current) => ({
                      ...current,
                      codingProblemsPassedById: {
                        ...current.codingProblemsPassedById,
                        [problem.id]: true,
                      },
                    }))
                  }
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-4">
        {course.finalAssessment.questions.map((question, index) => (
          <div
            key={question.id}
            className="rounded-3xl border border-white/10 bg-slate-900/60 p-5"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-indigo-300">
              Question {index + 1}
            </p>
            <h4 className="mt-2 text-base font-semibold text-slate-100">
              {question.prompt}
            </h4>
            <div className="mt-4 grid gap-3">
              {question.options.map((option, optionIndex) => {
                const isSelected = state.answers[index] === optionIndex;
                const revealCorrect = state.submitted && optionIndex === question.answerIndex;

                return (
                  <button
                    key={`${question.id}-${option}`}
                    type="button"
                    onClick={() => setAnswer(index, optionIndex)}
                    className={[
                      "rounded-2xl border px-4 py-3 text-left text-sm",
                      revealCorrect
                        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-50"
                        : isSelected
                          ? "border-indigo-400/40 bg-indigo-500/10 text-slate-100"
                          : "border-white/10 bg-slate-950/60 text-slate-300 hover:border-slate-500",
                    ].join(" ")}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {state.submitted ? (
              <p className="mt-3 text-sm leading-6 text-slate-400">{question.explanation}</p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-100">Earn your badge</p>
            <p className="mt-2 text-sm text-slate-400">
              {state.submitted
                ? `Latest score: ${score}/${course.finalAssessment.questions.length}`
                : "Complete the course lessons, then pass the final assessment."}
            </p>
            {message ? <p className="mt-2 text-sm text-indigo-200">{message}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => void submitAssessment()}
            disabled={!readyForAssessment || isSyncing}
            className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-5 py-3 text-sm font-semibold text-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state.badgeAwarded ? "Retake assessment" : "Grade badge test"}
          </button>
        </div>
      </div>
    </div>
  );
}
