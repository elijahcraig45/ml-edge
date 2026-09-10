"use client";

import { cn } from "@/lib/utils";

/** Track-aware: the denominator is the active path's required blocks. */
export function LessonProgressRail({
  done,
  total,
  completed,
  onComplete,
}: {
  done: number;
  total: number;
  completed: boolean;
  onComplete: () => void;
}) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/85 px-5 py-2.5 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              completed ? "bg-emerald-400" : "bg-indigo-400",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-mono text-[10px] tabular-nums text-slate-500">
          {done}/{total}
        </span>
        {done === total && total > 0 && !completed ? (
          <button
            type="button"
            onClick={onComplete}
            className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-200 hover:border-emerald-300"
          >
            Mark complete
          </button>
        ) : null}
        {completed ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-300">
            ✓ Complete
          </span>
        ) : null}
      </div>
    </div>
  );
}
