"use client";

import { useMemo, useState } from "react";
import { doc, runTransaction, serverTimestamp } from "@firebase/firestore";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { useFirebase } from "@/context/firebase-context";
import { firestore } from "@/lib/firebase/client";
import type { DailyQuizDocument } from "@/lib/types";

type QuizComponentProps = {
  content: DailyQuizDocument;
};

type StoredQuizState = {
  answers: number[];
  date: string;
};

function storageKey(date: string) {
  return `mledge:quiz:${date}`;
}

function loadStoredState(date: string): StoredQuizState | null {
  try {
    const raw = localStorage.getItem(storageKey(date));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "answers" in parsed &&
      Array.isArray((parsed as StoredQuizState).answers) &&
      (parsed as StoredQuizState).date === date
    ) {
      return parsed as StoredQuizState;
    }
  } catch {
    // ignore
  }
  return null;
}

function saveState(date: string, answers: number[]) {
  try {
    localStorage.setItem(storageKey(date), JSON.stringify({ answers, date }));
  } catch {
    // ignore
  }
}

function clearState(date: string) {
  try {
    localStorage.removeItem(storageKey(date));
  } catch {
    // ignore
  }
}

export function QuizComponent({ content }: QuizComponentProps) {
  const questions = content.questions;
  const { isConfigured, user } = useFirebase();
  const storedState =
    typeof window === "undefined" ? null : loadStoredState(content.date);

  const [answers, setAnswers] = useState<Array<number | null>>(() =>
    storedState && storedState.answers.length === questions.length
      ? storedState.answers.map((answer) =>
          typeof answer === "number" ? answer : null,
        )
      : questions.map(() => null),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(
    storedState !== null && storedState.answers.length === questions.length,
  );
  const [message, setMessage] = useState<string | null>(null);

  const score = useMemo(
    () =>
      answers.reduce<number>((total, answer, index) => {
        return total + (answer === questions[index]?.answerIndex ? 1 : 0);
      }, 0),
    [answers, questions],
  );

  function setAnswer(questionIndex: number, answerIndex: number) {
    setAnswers((current) =>
      current.map((value, index) =>
        index === questionIndex ? answerIndex : value,
      ),
    );
  }

  function handleRetake() {
    clearState(content.date);
    setAnswers(questions.map(() => null));
    setIsSubmitted(false);
    setMessage(null);
  }

  async function handleSubmit() {
    if (answers.some((answer) => answer === null)) {
      setMessage("Complete every question before finalizing today's streak.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      if (user && firestore) {
        const quizToken = `quiz:${content.date}`;
        const userRef = doc(firestore, "users", user.uid);

        await runTransaction(firestore, async (transaction) => {
          const snapshot = await transaction.get(userRef);
          const data = snapshot.data();
          const completedModules = Array.isArray(data?.completedModules)
            ? data.completedModules.filter(
                (value): value is string => typeof value === "string",
              )
            : [];
          const streakCount =
            typeof data?.streakCount === "number" ? data.streakCount : 0;
          const hasCompletedQuiz = completedModules.includes(quizToken);

          transaction.set(
            userRef,
            {
              uid: user.uid,
              email: user.email ?? "",
              lastLogin: serverTimestamp(),
              streakCount: hasCompletedQuiz ? streakCount : streakCount + 1,
              completedModules: hasCompletedQuiz
                ? completedModules
                : [...completedModules, quizToken],
            },
            { merge: true },
          );
        });

        setMessage("Streak locked in.");
      } else if (!isConfigured) {
        setMessage("Completed locally — add Firebase config to track your streak.");
      } else {
        setMessage("Sign in to persist your streak across devices.");
      }

      saveState(content.date, answers as number[]);
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Score summary banner — shown after submission */}
      {isSubmitted && (
        <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-slate-900/60 px-5 py-4">
          <div className="flex items-center gap-3">
            {score === questions.length ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : score >= questions.length / 2 ? (
              <CheckCircle2 className="h-5 w-5 text-indigo-400" />
            ) : (
              <XCircle className="h-5 w-5 text-rose-400" />
            )}
            <div>
              <p className="text-sm font-semibold text-white">
                {score}/{questions.length} correct
              </p>
              {message && (
                <p className="mt-0.5 text-xs text-slate-400">{message}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleRetake}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/60 px-4 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retake
          </button>
        </div>
      )}

      {questions.map((question, questionIndex) => {
        const userAnswer = answers[questionIndex];
        const isCorrect = userAnswer === question.answerIndex;

        return (
          <div
            key={question.id}
            className="rounded-3xl border border-white/10 bg-slate-900/70 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-indigo-300">
                  Question {questionIndex + 1}
                </p>
                <h3 className="mt-3 text-lg font-semibold text-slate-50">
                  {question.prompt}
                </h3>
              </div>
              {isSubmitted && (
                <span className={`mt-1 shrink-0 ${isCorrect ? "text-emerald-400" : "text-rose-400"}`}>
                  {isCorrect ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                </span>
              )}
            </div>

            <div className="mt-5 grid gap-3">
              {question.options.map((option, optionIndex) => {
                const isSelected = answers[questionIndex] === optionIndex;
                const isCorrectOption = question.answerIndex === optionIndex;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAnswer(questionIndex, optionIndex)}
                    disabled={isSubmitted}
                    className={[
                      "rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
                      isSubmitted && isCorrectOption
                        ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-100"
                        : isSubmitted && isSelected && !isCorrectOption
                          ? "border-rose-400/60 bg-rose-500/10 text-rose-200"
                          : isSelected
                            ? "border-indigo-400 bg-indigo-500/15 text-white"
                            : "border-white/10 bg-slate-950/60 text-slate-300 hover:border-slate-600",
                    ].join(" ")}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {isSubmitted && (
              <p className="mt-4 text-sm leading-6 text-slate-300">
                <span className="font-semibold text-slate-100">Why it matters:</span>{" "}
                {question.explanation}
              </p>
            )}
          </div>
        );
      })}

      {/* Submit row — hidden after submission */}
      {!isSubmitted && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-400">
                Result
              </p>
              <p className="mt-2 text-sm text-slate-300">
                Answer each question and finalize to advance your daily streak.
              </p>
              {message && (
                <p className="mt-2 text-sm text-rose-300">{message}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-5 py-3 text-sm font-semibold text-indigo-100 hover:border-indigo-300 hover:bg-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Syncing..." : "Finalize quiz"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

