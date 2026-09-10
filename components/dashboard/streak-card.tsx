"use client";

import { useMemo, useSyncExternalStore } from "react";
import { Flame } from "lucide-react";
import { subscribeToProgress } from "@/lib/progress/curriculum-progress";
import { computeStreak } from "@/lib/progress/streak";

/** Days in a row with at least one completed lesson. */
export function StreakCard() {
  // The store snapshot is a primitive so it stays referentially stable; the
  // streak itself is derived in a memo.
  const marker = useSyncExternalStore(
    subscribeToProgress,
    () => computeStreak().days.join(","),
    () => "",
  );

  const streak = useMemo(
    () => computeStreak(),
    // `marker` changes only when a completion date changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [marker],
  );

  return (
    <div className="rounded-xl border border-white/8 bg-slate-900/50 p-4">
      <div className="flex items-center gap-2">
        <Flame
          className={streak.current > 0 ? "h-4 w-4 text-amber-400" : "h-4 w-4 text-slate-600"}
          strokeWidth={2}
        />
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
          Study streak
        </p>
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-50">
        {streak.current}
        <span className="ml-1.5 text-sm font-normal text-slate-500">
          {streak.current === 1 ? "day" : "days"}
        </span>
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {streak.days.length === 0
          ? "Finish a lesson to start one."
          : `${streak.days.length} day${streak.days.length === 1 ? "" : "s"} studied · longest ${streak.longest}`}
      </p>
    </div>
  );
}
