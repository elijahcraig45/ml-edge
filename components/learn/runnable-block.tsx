"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { PythonRunner } from "@/lib/runtime/python/client";
import { ensureDataset, runScratchQuery } from "@/lib/runtime/sql/client";
import type { CompiledDataset, RunnableBlock as RunnableBlockData } from "@/lib/curriculum/artifact";
import type { ResultTable as ResultTableData } from "@/lib/runtime/protocol";
import { CodeEditor } from "./code-editor";
import { ResultTable } from "./result-table";
import { useLazyVisible } from "./use-lazy-visible";

/**
 * An ungraded scratchpad attached to the prose. Lets a learner poke at the
 * thing being explained in the same scroll position, without the ceremony of a
 * graded exercise.
 */
export function RunnableBlock({
  block,
  dataset,
}: {
  block: RunnableBlockData;
  dataset?: CompiledDataset;
}) {
  const [source, setSource] = useState(block.source);
  const [output, setOutput] = useState<string | null>(null);
  const [table, setTable] = useState<ResultTableData | null>(null);
  const [running, setRunning] = useState(false);
  const [ready, setReady] = useState(false);
  const runnerRef = useRef<PythonRunner | null>(null);
  const { ref, visible } = useLazyVisible();

  const isPython = block.runtime.engine === "python";

  useEffect(() => {
    if (!visible || ready) return;
    let cancelled = false;
    if (isPython) {
      const runner = new PythonRunner([]);
      runnerRef.current = runner;
      runner.boot().then(() => !cancelled && setReady(true)).catch(() => undefined);
      return () => {
        cancelled = true;
        runner.dispose();
        runnerRef.current = null;
      };
    }
    if (dataset) {
      ensureDataset(dataset).then(() => !cancelled && setReady(true)).catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [visible, ready, isPython, dataset]);

  const run = useCallback(async () => {
    setRunning(true);
    setOutput(null);
    setTable(null);
    try {
      if (isPython) {
        const runner = runnerRef.current;
        if (!runner) return;
        const result = await runner.run(
          { id: block.id, code: source, tests: [], packages: [], deterministic: true },
          block.runtime.timeoutMs,
        );
        setOutput(result.stdout || result.error?.message || "(no output)");
      } else {
        const result = await runScratchQuery(source);
        setTable({
          columns: result.columns,
          rows: result.rows.map((row) =>
            row.map((v) =>
              v === null || v === undefined
                ? null
                : typeof v === "bigint"
                  ? Number(v)
                  : typeof v === "number" || typeof v === "boolean"
                    ? v
                    : String(v),
            ),
          ),
          truncated: false,
          totalRows: result.rows.length,
        });
      }
    } catch (error) {
      setOutput(error instanceof Error ? error.message : String(error));
    } finally {
      setRunning(false);
    }
  }, [isPython, source, block.id, block.runtime.timeoutMs]);

  return (
    <div ref={ref} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
          {isPython ? "Try it — Python" : "Try it — SQL"}
        </span>
        <button
          type="button"
          onClick={() => void run()}
          disabled={!ready || running}
          className={cn(
            "ml-auto rounded-full border px-3.5 py-1 text-xs font-semibold",
            ready && !running
              ? "border-indigo-400/40 text-indigo-200 hover:border-indigo-300"
              : "cursor-not-allowed border-white/10 text-slate-600",
          )}
        >
          {running ? "Running…" : ready ? "▶ Run" : "Loading…"}
        </button>
      </div>

      {block.editable ? (
        <div className="px-3 py-3">
          <CodeEditor
            value={source}
            onChange={setSource}
            language={isPython ? "python" : "sql"}
            minRows={Math.min(14, Math.max(4, source.split("\n").length + 1))}
            ariaLabel="Scratchpad editor"
          />
        </div>
      ) : (
        <div
          className="lesson-prose px-3 py-3 text-sm"
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      )}

      {output !== null ? (
        <pre className="max-h-56 overflow-auto border-t border-white/10 px-4 py-3 font-mono text-[11px] leading-5 text-slate-300 whitespace-pre-wrap">
          {output}
        </pre>
      ) : null}
      {table ? (
        <div className="border-t border-white/10 px-4 py-3">
          <ResultTable data={table} />
        </div>
      ) : null}
    </div>
  );
}
