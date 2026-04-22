"use client";

import { useMemo, useState } from "react";
import { doc, runTransaction, serverTimestamp } from "@firebase/firestore";
import { useFirebase } from "@/context/firebase-context";
import { firestore } from "@/lib/firebase/client";
import type { DailyContentDocument } from "@/lib/types";

type QuizComponentProps = {
  content: DailyContentDocument;
};

export function QuizComponent({ content }: QuizComponentProps) {
  const questions = content.quiz.questions;
  const { isConfigured, user } = useFirebase();
  const [answers, setAnswers] = useState<Array<number | null>>(
    questions.map(() => null),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
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

        setMessage("Quiz locked in. Firestore streak updated.");
      } else if (!isConfigured) {
        setMessage(
          "Quiz completed locally. Add Firebase config and sign in to persist your streak.",
        );
      } else {
        setMessage("Quiz completed locally. Sign in to sync your streak.");
      }

      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {questions.map((question, questionIndex) => (
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
            <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-slate-400">
              ML
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            {question.options.map((option, optionIndex) => {
              const isSelected = answers[questionIndex] === optionIndex;
              const isCorrect = question.answerIndex === optionIndex;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setAnswer(questionIndex, optionIndex)}
                  disabled={isSubmitted}
                  className={[
                    "rounded-2xl border px-4 py-3 text-left text-sm",
                    isSelected
                      ? "border-indigo-400 bg-indigo-500/15 text-white"
                      : "border-white/10 bg-slate-950/60 text-slate-300 hover:border-slate-600",
                    isSubmitted && isCorrect
                      ? "border-emerald-400/60 bg-emerald-500/10"
                      : "",
                    isSubmitted && isSelected && !isCorrect
                      ? "border-rose-400/60 bg-rose-500/10"
                      : "",
                  ].join(" ")}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {isSubmitted ? (
            <p className="mt-4 text-sm leading-6 text-slate-300">
              <span className="font-semibold text-slate-100">Why it matters:</span>{" "}
              {question.explanation}
            </p>
          ) : null}
        </div>
      ))}

      <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-400">
              Result
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {isSubmitted
                ? `Score: ${score}/${questions.length}`
                : "Answer each question and finalize to advance your daily streak."}
            </p>
            {message ? <p className="mt-2 text-sm text-indigo-200">{message}</p> : null}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isSubmitted}
            className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-5 py-3 text-sm font-semibold text-indigo-100 hover:border-indigo-300 hover:bg-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitted
              ? "Submitted"
              : isSubmitting
                ? "Syncing..."
                : "Finalize quiz"}
          </button>
        </div>
      </div>
    </div>
  );
}
