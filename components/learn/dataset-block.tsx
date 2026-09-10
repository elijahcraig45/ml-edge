import type { CompiledDataset } from "@/lib/curriculum/artifact";
import { Prose } from "./prose";

/** Schema reference so a learner never has to guess column names. */
export function DatasetBlock({
  dataset,
  tables,
}: {
  dataset: CompiledDataset;
  tables: string[];
}) {
  const shown =
    tables.length > 0
      ? dataset.tables.filter((t) => tables.includes(t.name))
      : dataset.tables;

  return (
    <section className="rounded-2xl border border-sky-400/20 bg-sky-500/5 px-5 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-sky-300">
        Dataset · {dataset.title}
      </p>
      <Prose html={dataset.descriptionHtml} className="mt-2 text-sm" />
      <div className="mt-4 space-y-4">
        {shown.map((table) => (
          <div key={table.name}>
            <p className="font-mono text-xs text-sky-200">{table.name}</p>
            <p className="mt-0.5 text-xs text-slate-400">{table.description}</p>
            <div className="mt-2 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full border-collapse text-left">
                <tbody>
                  {table.columns.map((column) => (
                    <tr key={column.name} className="border-b border-white/5 last:border-0">
                      <td className="whitespace-nowrap px-3 py-1.5 font-mono text-[11px] text-slate-200">
                        {column.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 font-mono text-[11px] text-violet-300">
                        {column.type}
                      </td>
                      <td className="px-3 py-1.5 text-[11px] text-slate-400">
                        {column.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 font-mono text-[10px] text-slate-600">{dataset.license}</p>
    </section>
  );
}
