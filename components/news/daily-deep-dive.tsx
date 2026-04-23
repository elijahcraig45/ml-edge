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

      {deepDive.themes.map((theme, index) => (
        <Panel
          key={`${theme.title}-${index}`}
          eyebrow={`Theme ${index + 1}`}
          title={theme.title}
        >
          <p className="whitespace-pre-line text-sm leading-7 text-slate-300">
            {theme.analysis}
          </p>
          {theme.sourceArticleNumbers.length > 0 ? (
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Sources:{" "}
              {theme.sourceArticleNumbers
                .map((articleNumber) => `[${articleNumber}]`)
                .join(" ")}
            </p>
          ) : null}
        </Panel>
      ))}

      {deepDive.industryState ? (
        <Panel eyebrow="Industry state" title="What today means">
          <p className="whitespace-pre-line text-sm leading-7 text-slate-300">
            {deepDive.industryState}
          </p>
        </Panel>
      ) : null}
    </div>
  );
}
