import { cn } from "@/lib/utils";
import type { ResultTable as ResultTableData } from "@/lib/runtime/protocol";

function renderCell(value: string | number | boolean | null) {
  if (value === null) {
    // NULL must be visually distinct from the empty string — half of the
    // three-valued-logic lesson is learning to see the difference.
    return <span className="font-mono text-[11px] italic text-slate-600">NULL</span>;
  }
  if (typeof value === "boolean") {
    return <span className="font-mono text-[11px] text-amber-300">{String(value)}</span>;
  }
  if (typeof value === "number") {
    return <span className="font-mono text-[11px] tabular-nums text-sky-200">{value}</span>;
  }
  return <span className="text-[11px] text-slate-300">{value}</span>;
}

export function ResultTable({
  data,
  emptyMessage = "No rows returned.",
  className,
}: {
  data: ResultTableData;
  emptyMessage?: string;
  className?: string;
}) {
  if (data.rows.length === 0) {
    return (
      <p className={cn("font-mono text-[11px] text-slate-500", className)}>{emptyMessage}</p>
    );
  }
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-white/10", className)}>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-white/5">
            {data.columns.map((column) => (
              <th
                key={column}
                className="whitespace-nowrap px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-white/5">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="whitespace-nowrap px-3 py-1.5">
                  {renderCell(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.truncated ? (
        <p className="border-t border-white/10 px-3 py-1.5 font-mono text-[10px] text-slate-500">
          Showing {data.rows.length} of {data.totalRows} rows
        </p>
      ) : null}
    </div>
  );
}
