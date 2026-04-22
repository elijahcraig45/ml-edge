"use client";

import { useMemo, useState } from "react";
import type { BankQuestion, QuestionLevel } from "@/lib/types";

type LevelFilter = "all" | QuestionLevel;

const LEVEL_TABS: { value: LevelFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "foundational", label: "Foundational" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const LEVEL_COLORS: Record<QuestionLevel, string> = {
  foundational: "text-emerald-300 border-emerald-400/30 bg-emerald-500/10",
  intermediate: "text-indigo-300 border-indigo-400/30 bg-indigo-500/10",
  advanced: "text-amber-300 border-amber-400/30 bg-amber-500/10",
};

type PracticeDrillProps = {
  questions: BankQuestion[];
};

export function PracticeDrill({ questions }: PracticeDrillProps) {
  const [activeLevel, setActiveLevel] = useState<LevelFilter>("all");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);

  const filteredQuestions = useMemo(
    () =>
      activeLevel === "all"
        ? questions
        : questions.filter((q) => q.level === activeLevel),
    [questions, activeLevel],
  );

  function handleLevelChange(level: LevelFilter) {
    setActiveLevel(level);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsChecked(false);
    setResults([]);
  }

  function handleCheck() {
    if (selectedOption === null) return;
    setIsChecked(true);
    const question = filteredQuestions[currentIndex];
    setResults((prev) => [...prev, selectedOption === question?.answerIndex]);
  }

  function handleNext() {
    setCurrentIndex((prev) => prev + 1);
    setSelectedOption(null);
    setIsChecked(false);
  }

  function handleRestart() {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsChecked(false);
    setResults([]);
  }

  const levelCounts = useMemo(
    () =>
      LEVEL_TABS.reduce<Record<LevelFilter, number>>(
        (acc, tab) => {
          acc[tab.value] =
            tab.value === "all"
              ? questions.length
              : questions.filter((q) => q.level === tab.value).length;
          return acc;
        },
        { all: 0, foundational: 0, intermediate: 0, advanced: 0 },
      ),
    [questions],
  );

  const isDrillComplete = currentIndex >= filteredQuestions.length && filteredQuestions.length > 0;
  const question = filteredQuestions[currentIndex];
  const correctCount = results.filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Level filter tabs */}
      <div className="flex flex-wrap gap-2">
        {LEVEL_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => handleLevelChange(tab.value)}
            className={[
              "rounded-full border px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] transition-colors",
              activeLevel === tab.value
                ? "border-indigo-400/60 bg-indigo-500/20 text-indigo-100"
                : "border-white/10 bg-slate-950/40 text-slate-400 hover:border-slate-600 hover:text-slate-300",
            ].join(" ")}
          >
            {tab.label}
            <span className="ml-2 opacity-60">{levelCounts[tab.value]}</span>
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filteredQuestions.length === 0 && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
            No questions yet
          </p>
          <p className="mt-3 text-sm text-slate-400">
            {questions.length === 0
              ? "The question bank is empty. Questions accumulate each time the daily quiz cron runs."
              : `No ${activeLevel} questions in the bank. Try a different level.`}
          </p>
        </div>
      )}

      {/* Drill complete */}
      {isDrillComplete && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-indigo-300">
            Drill complete
          </p>
          <h3 className="mt-3 text-2xl font-bold text-slate-50">
            {correctCount}/{filteredQuestions.length} correct
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            {correctCount === filteredQuestions.length
              ? "Perfect run. Solid fundamentals."
              : correctCount >= filteredQuestions.length * 0.7
                ? "Good work. Review the ones you missed."
                : "Keep drilling — repetition builds pattern recognition."}
          </p>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={handleRestart}
              className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-5 py-2.5 text-sm font-semibold text-indigo-100 hover:border-indigo-300 hover:bg-indigo-500/25"
            >
              Drill again
            </button>
            <button
              type="button"
              onClick={() => handleLevelChange(activeLevel === "all" ? "foundational" : "all")}
              className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:border-slate-500"
            >
              Change level
            </button>
          </div>
        </div>
      )}

      {/* Question card */}
      {question && !isDrillComplete && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
          {/* Header */}
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Question {currentIndex + 1} of {filteredQuestions.length}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  {question.topic}
                </span>
                <span
                  className={[
                    "rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]",
                    LEVEL_COLORS[question.level],
                  ].join(" ")}
                >
                  {question.level}
                </span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="flex w-24 flex-col items-end gap-1">
              <span className="font-mono text-[10px] text-slate-500">
                {results.filter(Boolean).length}/{results.length}
              </span>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{
                    width:
                      filteredQuestions.length > 0
                        ? `${(currentIndex / filteredQuestions.length) * 100}%`
                        : "0%",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Prompt */}
          <h3 className="text-lg font-semibold leading-7 text-slate-50">
            {question.prompt}
          </h3>

          {/* Options */}
          <div className="mt-5 grid gap-3">
            {question.options.map((option, optionIndex) => {
              const isSelected = selectedOption === optionIndex;
              const isCorrect = question.answerIndex === optionIndex;

              return (
                <button
                  key={`${question.id}-${optionIndex}`}
                  type="button"
                  onClick={() => !isChecked && setSelectedOption(optionIndex)}
                  disabled={isChecked}
                  className={[
                    "rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
                    isChecked && isCorrect
                      ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-100"
                      : isChecked && isSelected && !isCorrect
                        ? "border-rose-400/60 bg-rose-500/10 text-rose-200"
                        : isSelected
                          ? "border-indigo-400 bg-indigo-500/15 text-white"
                          : "border-white/10 bg-slate-950/60 text-slate-300 hover:border-slate-600",
                    isChecked ? "cursor-default" : "cursor-pointer",
                  ].join(" ")}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {isChecked && (
            <div className="mt-4 rounded-2xl border border-white/5 bg-slate-800/50 px-4 py-3">
              <p className="text-sm leading-6 text-slate-300">
                <span className="font-semibold text-slate-100">Why it matters: </span>
                {question.explanation}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-5 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {isChecked
                ? selectedOption === question.answerIndex
                  ? "✓ Correct"
                  : "✗ Incorrect"
                : "Select an answer to continue"}
            </p>
            {!isChecked ? (
              <button
                type="button"
                onClick={handleCheck}
                disabled={selectedOption === null}
                className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-5 py-2 text-sm font-semibold text-indigo-100 hover:border-indigo-300 hover:bg-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Check answer
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-5 py-2 text-sm font-semibold text-indigo-100 hover:border-indigo-300 hover:bg-indigo-500/25"
              >
                {currentIndex + 1 < filteredQuestions.length ? "Next question →" : "See results"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
