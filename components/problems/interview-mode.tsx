"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { emptyExerciseProgress } from "@/lib/progress/curriculum-progress";
import { useProblemProgress } from "@/lib/progress/use-problem-progress";
import { PythonExercise } from "@/components/learn/python-exercise";
import { SqlExercise } from "@/components/learn/sql-exercise";
import type { CompiledDataset, ProblemBank, ProblemEntry } from "@/lib/curriculum/artifact";

const SESSION_MINUTES = 45;
const PROBLEMS_PER_SESSION = 2;

const COMPLEXITIES = [
  "O(1)",
  "O(log n)",
  "O(n)",
  "O(n log n)",
  "O(n²)",
  "O(2ⁿ)",
] as const;

/**
 * A timed set drawn from the bank.
 *
 * The complexity claim is taken BEFORE the tests run and scored separately from
 * the code, because committing to a bound before you know whether the code
 * works is the actual interview skill — and nothing else grades it.
 */
export function InterviewMode({
  bank,
  datasets,
}: {
  bank: ProblemBank;
  datasets: Record<string, CompiledDataset>;
}) {
  const [session, setSession] = useState<ProblemEntry[] | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const start = useCallback(() => {
    // Prefer problems tagged with an interview pattern; fall back to the rest
    // so a thin bank still produces a session.
    const pool = bank.problems.filter((p) => p.exercise.pattern);
    const source = pool.length >= PROBLEMS_PER_SESSION ? pool : bank.problems;
    const picked = [...source]
      .sort(() => Math.random() - 0.5)
      .slice(0, PROBLEMS_PER_SESSION);
    setSession(picked);
    setStartedAt(Date.now());
    setNow(Date.now());
  }, [bank.problems]);

  const remainingMs = startedAt
    ? Math.max(0, SESSION_MINUTES * 60_000 - (now - startedAt))
    : SESSION_MINUTES * 60_000;
  const expired = startedAt !== null && remainingMs === 0;

  if (!session) {
    return (
      <div className="mt-8 max-w-xl rounded-2xl border border-white/10 bg-slate-900/40 p-6">
        <h2 className="text-base font-semibold text-slate-100">How it works</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-400">
          <li>· {PROBLEMS_PER_SESSION} problems, {SESSION_MINUTES} minutes, drawn at random.</li>
          <li>
            · Before you run anything, you state the time and space complexity you
            are aiming for. That claim is scored on its own.
          </li>
          <li>· The clock keeps running. Nothing stops you working past it.</li>
        </ul>
        <button
          type="button"
          onClick={start}
          disabled={bank.problems.length === 0}
          className="mt-5 rounded-full border border-indigo-400/40 bg-indigo-500/15 px-5 py-2 text-sm font-semibold text-indigo-100 hover:border-indigo-300 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-slate-500"
        >
          Start a session
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-8">
      <div
        className={cn(
          "sticky top-0 z-10 flex items-center gap-4 rounded-2xl border px-5 py-3 backdrop-blur",
          expired
            ? "border-rose-400/30 bg-rose-500/10"
            : "border-white/10 bg-slate-950/85",
        )}
      >
        <span className="font-mono text-lg tabular-nums text-slate-100">
          {formatDuration(remainingMs)}
        </span>
        <span className="text-xs text-slate-500">
          {expired ? "Time is up — finish anyway, then review." : "remaining"}
        </span>
        <button
          type="button"
          onClick={start}
          className="ml-auto rounded-full border border-white/10 px-4 py-1.5 text-xs text-slate-400 hover:border-slate-500"
        >
          New session
        </button>
      </div>

      {session.map((entry, index) => (
        <TimedProblem
          key={entry.exercise.id}
          index={index}
          entry={entry}
          datasets={datasets}
        />
      ))}
    </div>
  );
}

function TimedProblem({
  index,
  entry,
  datasets,
}: {
  index: number;
  entry: ProblemEntry;
  datasets: Record<string, CompiledDataset>;
}) {
  const { progress, update } = useProblemProgress(entry.exercise.id);
  const [timeClaim, setTimeClaim] = useState<string>("");
  const [spaceClaim, setSpaceClaim] = useState<string>("");
  const [committed, setCommitted] = useState(false);

  const exerciseProgress = progress ?? emptyExerciseProgress();
  const solved = exerciseProgress.solved;

  const verdict = useMemo(() => {
    if (!committed || !solved) return null;
    return { timeClaim, spaceClaim };
  }, [committed, solved, timeClaim, spaceClaim]);

  return (
    <section>
      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">
        Problem {index + 1}
      </p>

      {!committed ? (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-500/5 p-5">
          <h3 className="text-sm font-semibold text-amber-100">
            Commit to a complexity first
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            Read the problem below, decide on your approach, and state its bounds
            before you write code. You cannot change this once you continue.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <ClaimSelect label="Time" value={timeClaim} onChange={setTimeClaim} />
            <ClaimSelect label="Space" value={spaceClaim} onChange={setSpaceClaim} />
            <button
              type="button"
              disabled={!timeClaim || !spaceClaim}
              onClick={() => setCommitted(true)}
              className="self-end rounded-full border border-amber-400/40 bg-amber-500/15 px-5 py-2 text-xs font-semibold text-amber-100 hover:border-amber-300 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-slate-500"
            >
              Lock it in
            </button>
          </div>
          <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-sm font-medium text-slate-200">{entry.exercise.title}</p>
            <div
              className="lesson-prose mt-2 text-sm"
              dangerouslySetInnerHTML={{ __html: entry.exercise.promptHtml }}
            />
          </div>
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-slate-500">
            You claimed{" "}
            <span className="font-mono text-amber-300">{timeClaim}</span> time and{" "}
            <span className="font-mono text-amber-300">{spaceClaim}</span> space.
          </p>
          {entry.exercise.kind === "python" ? (
            <PythonExercise
              exercise={entry.exercise}
              progress={exerciseProgress}
              onProgress={update}
            />
          ) : datasets[entry.exercise.datasetId] ? (
            <SqlExercise
              exercise={entry.exercise}
              dataset={datasets[entry.exercise.datasetId]}
              progress={exerciseProgress}
              onProgress={update}
            />
          ) : null}
          {verdict ? (
            <div className="mt-3 rounded-xl border border-emerald-400/25 bg-emerald-500/5 px-4 py-3 text-sm text-slate-300">
              Solved. Now check your claim against the walkthrough: did your
              solution actually run in {verdict.timeClaim} time and{" "}
              {verdict.spaceClaim} space? Being right about the code and wrong
              about the bound is the most common way to lose an interview you
              technically passed.
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function ClaimSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-400/40"
      >
        <option value="" className="bg-slate-900">
          Choose…
        </option>
        {COMPLEXITIES.map((c) => (
          <option key={c} value={c} className="bg-slate-900">
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}
