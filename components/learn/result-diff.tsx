import type { ResultDiff as ResultDiffData } from "@/lib/runtime/protocol";
import { ResultTable } from "./result-table";

/**
 * Shows what is missing and what is extra, side by side.
 *
 * A bare red X teaches nothing; seeing the specific rows you failed to produce
 * is what turns a failed submission into a diagnosis.
 */
export function ResultDiff({ diff }: { diff: ResultDiffData }) {
  if (diff.shapeMessage) {
    return (
      <p className="rounded-xl border border-rose-400/25 bg-rose-500/5 px-3 py-2 text-xs text-rose-200">
        {diff.shapeMessage}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {diff.missing.length > 0 ? (
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-amber-300/80">
            Expected, but missing from your result
          </p>
          <ResultTable
            data={{
              columns: diff.columns,
              rows: diff.missing,
              truncated: false,
              totalRows: diff.missing.length,
            }}
          />
        </div>
      ) : null}
      {diff.unexpected.length > 0 ? (
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-rose-300/80">
            Returned, but not expected
          </p>
          <ResultTable
            data={{
              columns: diff.columns,
              rows: diff.unexpected,
              truncated: false,
              totalRows: diff.unexpected.length,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
