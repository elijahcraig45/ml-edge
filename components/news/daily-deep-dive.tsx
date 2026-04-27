import { Panel } from "@/components/ui/panel";
import type { DailyDeepDive } from "@/lib/types";

type DailyDeepDiveProps = {
  deepDive: DailyDeepDive;
  showTldr?: boolean;
};

export function DailyDeepDivePanels({
  deepDive,
  showTldr = true,
}: DailyDeepDiveProps) {
  return (
    <div className="space-y-5">
      {showTldr ? (
        <Panel eyebrow="TL;DR" title="Daily deep dive">
          <p className="whitespace-pre-line text-sm leading-7 text-slate-300">
            {deepDive.tldr}
          </p>
        </Panel>
      ) : null}

      {/* Key takeaways */}
      {deepDive.keyTakeaways && deepDive.keyTakeaways.length > 0 && (
        <div className="rounded-3xl border border-indigo-400/20 bg-indigo-500/8 p-5 sm:p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-indigo-300">
            Key takeaways for ML engineers
          </p>
          <ul className="mt-4 space-y-3">
            {deepDive.keyTakeaways.map((takeaway, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-500/15 font-mono text-[10px] font-semibold text-indigo-300">
                  {i + 1}
                </span>
                <p className="text-sm leading-6 text-slate-200">{takeaway}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Themes */}
      {deepDive.themes.length > 0 && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 sm:p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-indigo-300">
            Deep dive &mdash; {deepDive.themes.length} themes
          </p>
          <div className="mt-5 space-y-8">
            {deepDive.themes.map((theme, index) => (
              <div key={`${theme.title}-${index}`} className="relative pl-10">
                <div className="absolute left-0 top-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-500/15 font-mono text-[11px] font-semibold text-indigo-300">
                  {index + 1}
                </div>

                <h3 className="text-base font-semibold text-slate-50">{theme.title}</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-300">
                  {theme.analysis}
                </p>

                {/* Practical implication callout */}
                {theme.practicalImplication && (
                  <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/8 px-4 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-400">For engineers building today</p>
                    <p className="mt-1.5 text-sm leading-6 text-emerald-100">{theme.practicalImplication}</p>
                  </div>
                )}

                {theme.sourceArticleNumbers.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-slate-500">
                      Sources:
                    </span>
                    {theme.sourceArticleNumbers.map((n) => (
                      <span
                        key={n}
                        className="rounded-full border border-white/10 bg-slate-800/60 px-2.5 py-0.5 font-mono text-[11px] text-slate-400"
                      >
                        [{n}]
                      </span>
                    ))}
                  </div>
                )}

                {index < deepDive.themes.length - 1 && (
                  <div className="mt-8 border-t border-white/6" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {deepDive.industryState ? (
        <Panel eyebrow="Industry context" title="Where the field is heading">
          <p className="whitespace-pre-line text-sm leading-7 text-slate-300">
            {deepDive.industryState}
          </p>
        </Panel>
      ) : null}
    </div>
  );
}

