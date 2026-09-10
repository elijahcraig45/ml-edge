"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useProblemBankProgress } from "@/lib/progress/use-problem-progress";
import type { ProblemBank } from "@/lib/curriculum/artifact";

const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Warm-up",
  2: "Easy",
  3: "Medium",
  4: "Hard",
  5: "Brutal",
};

type LanguageFilter = "all" | "python" | "sql";
type StatusFilter = "all" | "unsolved" | "solved";

export function ProblemFilters({ bank }: { bank: ProblemBank }) {
  const [language, setLanguage] = useState<LanguageFilter>("all");
  const [pattern, setPattern] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<number | "all">("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");

  const solved = useProblemBankProgress();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return bank.problems.filter(({ exercise }) => {
      if (language !== "all" && exercise.kind !== language) return false;
      if (pattern !== "all" && exercise.pattern !== pattern) return false;
      if (difficulty !== "all" && exercise.difficulty !== difficulty) return false;
      if (status === "solved" && !solved[exercise.id]?.solved) return false;
      if (status === "unsolved" && solved[exercise.id]?.solved) return false;
      if (needle && !exercise.title.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [bank.problems, language, pattern, difficulty, status, query, solved]);

  const solvedCount = bank.problems.filter((p) => solved[p.exercise.id]?.solved).length;

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search problems…"
          aria-label="Search problems"
          className="w-full max-w-xs rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-indigo-400/40"
        />
        <Select
          label="Language"
          value={language}
          onChange={(v) => setLanguage(v as LanguageFilter)}
          options={[
            { value: "all", label: "Any language" },
            { value: "python", label: "Python" },
            { value: "sql", label: "SQL" },
          ]}
        />
        <Select
          label="Pattern"
          value={pattern}
          onChange={setPattern}
          options={[
            { value: "all", label: "Any pattern" },
            ...bank.patterns.map((p) => ({ value: p, label: p.replace(/-/g, " ") })),
          ]}
        />
        <Select
          label="Difficulty"
          value={String(difficulty)}
          onChange={(v) => setDifficulty(v === "all" ? "all" : Number(v))}
          options={[
            { value: "all", label: "Any difficulty" },
            ...[1, 2, 3, 4, 5].map((d) => ({
              value: String(d),
              label: DIFFICULTY_LABELS[d],
            })),
          ]}
        />
        <Select
          label="Status"
          value={status}
          onChange={(v) => setStatus(v as StatusFilter)}
          options={[
            { value: "all", label: "Any status" },
            { value: "unsolved", label: "Unsolved" },
            { value: "solved", label: "Solved" },
          ]}
        />
      </div>

      <p className="mt-4 font-mono text-[11px] text-slate-500">
        {filtered.length} of {bank.problems.length} problems · {solvedCount} solved
      </p>

      <ul className="mt-4 space-y-2">
        {filtered.map(({ exercise, source, lesson }) => (
          <li key={exercise.id}>
            <Link
              href={`/problems/${exercise.id}`}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 hover:border-indigo-400/40",
                solved[exercise.id]?.solved
                  ? "border-emerald-400/25 bg-emerald-500/5"
                  : "border-white/10 bg-slate-900/40",
              )}
            >
              <span className="font-mono text-xs text-slate-600">
                {solved[exercise.id]?.solved ? "✓" : "○"}
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium text-slate-100">
                {exercise.title}
              </span>
              <Pill className={difficultyClass(exercise.difficulty)}>
                {DIFFICULTY_LABELS[exercise.difficulty]}
              </Pill>
              <Pill
                className={
                  exercise.kind === "python"
                    ? "border-violet-400/30 text-violet-300"
                    : "border-sky-400/30 text-sky-300"
                }
              >
                {exercise.kind === "python" ? "Python" : "SQL"}
              </Pill>
              {exercise.pattern ? (
                <Pill className="border-white/10 text-slate-400">
                  {exercise.pattern.replace(/-/g, " ")}
                </Pill>
              ) : null}
              {source === "bank" ? (
                <span className="shrink-0 font-mono text-[10px] text-slate-700">
                  bank
                </span>
              ) : null}
              {lesson ? (
                <span
                  className="shrink-0 font-mono text-[10px] text-slate-600"
                  title={lesson.stageTitle}
                >
                  Stage {lesson.stageOrder}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">
          Nothing matches those filters yet.
        </p>
      ) : null}
    </div>
  );
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]",
        className,
      )}
    >
      {children}
    </span>
  );
}

function difficultyClass(difficulty: number): string {
  return (
    {
      1: "border-sky-400/30 text-sky-300",
      2: "border-cyan-400/30 text-cyan-300",
      3: "border-amber-400/30 text-amber-300",
      4: "border-orange-400/30 text-orange-300",
      5: "border-rose-400/30 text-rose-300",
    }[difficulty] ?? "border-white/10 text-slate-400"
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-400/40"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} className="bg-slate-900">
          {option.label}
        </option>
      ))}
    </select>
  );
}
