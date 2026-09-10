"use client";

import Link from "next/link";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useBadges } from "@/lib/progress/badges";
import { useProblemBankProgress } from "@/lib/progress/use-problem-progress";
import {
  PROGRESS_NAMESPACE,
  readProgressSnapshot,
} from "@/lib/progress/curriculum-progress";
import { useSyncExternalStore } from "react";
import { subscribeToProgress } from "@/lib/progress/curriculum-progress";

export type LadderStage = {
  tierId: string;
  tierTitle: string;
  stageId: string;
  stageTitle: string;
  order: number;
  lessons: Array<{ id: string; slug: string; title: string }>;
};

/**
 * Ladder progress, read from the same localStorage the lessons write.
 *
 * A single snapshot key would be cheaper, but reading per-lesson keeps the
 * dashboard truthful even if a lesson is edited or removed.
 */
export function LadderProgress({ stages }: { stages: LadderStage[] }) {
  const raw = useSyncExternalStore(
    subscribeToProgress,
    () => stages.map((s) => s.lessons.map((l) => completedFlag(l.id)).join("")).join("|"),
    () => "",
  );
  const { badges } = useBadges();
  const solvedProblems = useProblemBankProgress();

  const summary = useMemo(() => {
    let done = 0;
    let total = 0;
    for (const stage of stages) {
      for (const lesson of stage.lessons) {
        total += 1;
        if (completedFlag(lesson.id) === "1") done += 1;
      }
    }
    return { done, total };
    // `raw` is the reactive trigger; the computation reads storage directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stages, raw]);

  const solvedCount = Object.values(solvedProblems).filter((p) => p.solved).length;
  const nextLesson = findNext(stages);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-6">
        <Stat label="Lessons complete" value={`${summary.done}/${summary.total}`} />
        <Stat label="Stage badges" value={String(Object.keys(badges).length)} />
        <Stat label="Problems solved" value={String(solvedCount)} />
      </div>

      {nextLesson ? (
        <Link
          href={nextLesson.href}
          className="flex items-center gap-3 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 px-5 py-4 hover:border-indigo-300"
        >
          <span className="min-w-0 flex-1">
            <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-indigo-300">
              {summary.done === 0 ? "Start here" : "Pick up where you left off"}
            </span>
            <span className="mt-1 block text-sm font-medium text-slate-100">
              {nextLesson.title}
            </span>
          </span>
          <span className="text-indigo-300">→</span>
        </Link>
      ) : (
        <p className="text-sm text-slate-400">
          Every published lesson is complete. More stages are on the way.
        </p>
      )}

      <ul className="space-y-2">
        {stages.map((stage) => {
          const done = stage.lessons.filter(
            (l) => completedFlag(l.id) === "1",
          ).length;
          const pct = Math.round((done / Math.max(stage.lessons.length, 1)) * 100);
          return (
            <li key={stage.stageId}>
              <Link
                href={`/learn/${stage.tierId}/${stage.stageId}`}
                className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-2.5 hover:border-slate-500"
              >
                <span className="font-mono text-[10px] text-slate-600">
                  {String(stage.order).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-300">
                  {stage.stageTitle}
                </span>
                {badges[stage.stageId] ? (
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-300">
                    badge
                  </span>
                ) : null}
                <span className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      pct === 100 ? "bg-emerald-400" : "bg-indigo-400",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="w-12 text-right font-mono text-[10px] tabular-nums text-slate-500">
                  {done}/{stage.lessons.length}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-50">{value}</p>
    </div>
  );
}

function completedFlag(lessonId: string): "1" | "0" {
  const raw = readProgressSnapshot(`${PROGRESS_NAMESPACE}:${lessonId}`);
  if (!raw) return "0";
  try {
    return (JSON.parse(raw) as { completedAt?: string }).completedAt ? "1" : "0";
  } catch {
    return "0";
  }
}

function findNext(stages: LadderStage[]) {
  for (const stage of stages) {
    for (const lesson of stage.lessons) {
      if (completedFlag(lesson.id) === "0") {
        return {
          title: lesson.title,
          href: `/learn/${stage.tierId}/${stage.stageId}/${lesson.slug}`,
        };
      }
    }
  }
  return null;
}
