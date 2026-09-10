import { cn } from "@/lib/utils";
import type { RunOutcome, TestOutcome } from "@/lib/runtime/protocol";

const STATUS_MARK: Record<TestOutcome["status"], string> = {
  passed: "✓",
  failed: "✗",
  errored: "!",
  skipped: "–",
};

export function TestResults({
  outcome,
  pendingLabels,
}: {
  outcome: RunOutcome | null;
  /** Shown before the first run so the learner knows what will be checked. */
  pendingLabels: Array<{ id: string; label: string; hidden: boolean }>;
}) {
  if (!outcome) {
    return (
      <ul className="space-y-2">
        {pendingLabels
          .filter((t) => !t.hidden)
          .map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-xs text-slate-400"
            >
              <span className="text-slate-600">○</span>
              {t.label}
            </li>
          ))}
        {pendingLabels.some((t) => t.hidden) ? (
          <li className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-xs text-slate-600">
            + {pendingLabels.filter((t) => t.hidden).length} hidden test
            {pendingLabels.filter((t) => t.hidden).length === 1 ? "" : "s"}
          </li>
        ) : null}
      </ul>
    );
  }

  return (
    <ul className="space-y-2">
      {outcome.tests.map((test) => (
        <li
          key={test.id}
          className={cn(
            "rounded-xl border px-3 py-2",
            test.status === "passed"
              ? "border-emerald-400/30 bg-emerald-500/10"
              : "border-rose-400/30 bg-rose-500/10",
          )}
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-mono text-xs",
                test.status === "passed" ? "text-emerald-400" : "text-rose-400",
              )}
            >
              {STATUS_MARK[test.status]}
            </span>
            <span className={cn("text-xs", test.hidden ? "text-slate-400" : "text-slate-300")}>
              {test.hidden ? `[hidden] ${test.label}` : test.label}
            </span>
          </div>
          {test.status !== "passed" && test.message ? (
            <p className="mt-1 pl-5 font-mono text-[11px] leading-5 text-rose-300">
              {test.message}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
