import type { RunOutcome } from "@/lib/runtime/protocol";

/** stdout / stderr / traceback panel, shared by both engines. */
export function RunConsole({ outcome }: { outcome: RunOutcome | null }) {
  const hasError = outcome?.error;
  return (
    <div className="border-t border-white/10 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
        Output
      </p>
      <pre className="mt-2 max-h-56 min-h-[2.5rem] overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-5 text-slate-300">
        {outcome?.stdout || (outcome ? "(no output)" : "Run your code to see output.")}
      </pre>
      {hasError ? (
        <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/5 px-3 py-2">
          <p className="font-mono text-[11px] text-rose-300">
            {outcome.error!.type}
            {outcome.error!.line ? ` on line ${outcome.error!.line}` : ""}:{" "}
            {outcome.error!.message}
          </p>
        </div>
      ) : null}
      {outcome?.stderr && !hasError ? (
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-5 text-rose-300">
          {outcome.stderr}
        </pre>
      ) : null}
    </div>
  );
}
