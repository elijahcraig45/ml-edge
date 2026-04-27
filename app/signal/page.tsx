import Link from "next/link";
import { Radio, ExternalLink, ArrowRight, Layers, Brain, CalendarDays } from "lucide-react";
import { getSignalHistory } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function SignalHistoryPage() {
  const signals = await getSignalHistory(30);
  const [latest, ...archive] = signals;

  return (
    <div className="min-h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            <Radio className="h-3 w-3" />
            Daily signal
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            ML &amp; AI news, decoded
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Each signal is a structured deep dive into that day&apos;s most important AI/ML
            developments — themes, industry context, and source articles in one place.
          </p>
        </div>

        {/* Latest signal — hero card */}
        {latest ? (() => {
          const latestDateLabel = new Date(latest.date).toLocaleDateString("en-US", {
            weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
          });
          return (
            <Link
              href={`/signal/${latest.date}`}
              className="group block rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-indigo-950/40 p-6 transition-all hover:border-indigo-400/40 sm:p-8"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
                  <CalendarDays className="h-3 w-3" />
                  {latestDateLabel}
                </div>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                  Latest
                </span>
              </div>

              <h2 className="mt-4 text-xl font-bold leading-8 tracking-tight text-white group-hover:text-indigo-50 sm:text-2xl">
                {latest.headline}
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-300">
                {latest.deepDive.tldr}
              </p>

              {latest.deepDive.themes.length > 0 && (
                <div className="mt-5 space-y-2">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">Themes covered</p>
                  <div className="flex flex-wrap gap-2">
                    {latest.deepDive.themes.map((theme, i) => (
                      <span
                        key={i}
                        className="rounded-full border border-white/10 bg-slate-800/60 px-3 py-1 text-xs text-slate-300"
                      >
                        {theme.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-[11px] text-slate-500">
                  {latest.deepDive.themes.length > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-3 w-3" />
                      {latest.deepDive.themes.length} themes
                    </span>
                  )}
                  {latest.sourceArticles.length > 0 && (
                    <span className="flex items-center gap-1.5">
                      <ExternalLink className="h-3 w-3" />
                      {latest.sourceArticles.length} sources
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Brain className="h-3 w-3" />
                    Daily quiz available
                  </span>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 transition-colors group-hover:text-indigo-300">
                  Read full signal
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          );
        })() : null}

        {/* Archive */}
        {archive.length > 0 && (
          <div>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">Archive</p>
            <div className="space-y-3">
              {archive.map((signal) => {
                const dateLabel = new Date(signal.date).toLocaleDateString("en-US", {
                  weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
                });

                return (
                  <Link
                    key={signal.date}
                    href={`/signal/${signal.date}`}
                    className="group block rounded-2xl border border-white/8 bg-slate-900/50 p-5 transition-all hover:border-indigo-400/25 hover:bg-slate-900/80"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                              signal.status === "generated" ? "bg-emerald-400" : "bg-slate-500"
                            }`}
                          />
                          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-slate-500">
                            {dateLabel}
                          </p>
                        </div>
                        <h2 className="mt-2 text-sm font-semibold leading-6 text-slate-100 group-hover:text-white">
                          {signal.headline}
                        </h2>
                        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-400">
                          {signal.deepDive.tldr}
                        </p>
                        {signal.deepDive.themes.length > 0 && (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {signal.deepDive.themes.slice(0, 3).map((theme, i) => (
                              <span
                                key={i}
                                className="rounded-full border border-white/8 bg-slate-800/50 px-2.5 py-0.5 text-[11px] text-slate-400"
                              >
                                {theme.title}
                              </span>
                            ))}
                            {signal.deepDive.themes.length > 3 && (
                              <span className="text-[11px] text-slate-600">
                                +{signal.deepDive.themes.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                        <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-600">
                          {signal.sourceArticles.length > 0 && (
                            <span className="flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" />
                              {signal.sourceArticles.length} sources
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-600 transition-colors group-hover:text-indigo-300" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
