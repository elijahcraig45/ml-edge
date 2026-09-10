"use client";

import { useCallback, useState } from "react";
import { openRunner } from "@/lib/runtime/sql/client";

/**
 * Shows the execution plan for the learner's own query.
 *
 * A slow query is not diagnosable by reading the SQL — you have to read what
 * the engine decided to do with it. Making the plan one click away is the
 * difference between "optimization" being a story and being a skill.
 */
export function PlanViewer({ sql, ready }: { sql: string; ready: boolean }) {
  const [plan, setPlan] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const explain = useCallback(async () => {
    if (!ready || loading) return;
    setLoading(true);
    const runner = await openRunner();
    try {
      const result = await runner.query(
        `EXPLAIN ${sql.trim().replace(/;\s*$/, "")}`,
      );
      setPlan(result.rows.map((row) => row.map(String).join("  ")).join("\n"));
      setOpen(true);
    } catch (error) {
      setPlan(error instanceof Error ? error.message : String(error));
      setOpen(true);
    } finally {
      await runner.close().catch(() => undefined);
      setLoading(false);
    }
  }, [sql, ready, loading]);

  return (
    <div>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : void explain())}
        disabled={!ready}
        className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-400 hover:border-slate-500 disabled:cursor-not-allowed disabled:text-slate-600"
      >
        {loading ? "Explaining…" : open ? "Hide plan" : "Explain"}
      </button>

      {open && plan ? (
        <pre className="mt-3 max-h-72 overflow-auto rounded-xl border border-white/10 bg-slate-950/70 p-3 font-mono text-[11px] leading-5 text-slate-300 whitespace-pre">
          {plan}
        </pre>
      ) : null}
    </div>
  );
}
