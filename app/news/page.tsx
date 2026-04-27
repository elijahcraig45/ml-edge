import Link from "next/link";
import { ExternalLink, Radio, CalendarDays, Layers } from "lucide-react";
import { DailyDeepDivePanels } from "@/components/news/daily-deep-dive";
import { Panel } from "@/components/ui/panel";
import { getDailyContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const dailyContent = await getDailyContent();

  const dateLabel = new Date(dailyContent.date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="console-grid min-h-full overflow-y-auto p-6 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="sr-only">AI/ML daily signal</h1>

        {/* Hero */}
        <div className="rounded-2xl border border-white/8 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-indigo-950/40 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
              <CalendarDays className="h-3 w-3" />
              {dateLabel}
            </div>
            <Link
              href="/signal"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300"
            >
              <Radio className="h-3 w-3" />
              Signal archive
            </Link>
          </div>

          <h1 className="mt-4 text-xl font-bold leading-8 tracking-tight text-white sm:text-2xl">
            {dailyContent.headline}
          </h1>

          <p className="mt-3 text-sm leading-7 text-slate-300">
            {dailyContent.deepDive.tldr}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
            {dailyContent.deepDive.themes.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Layers className="h-3 w-3" />
                {dailyContent.deepDive.themes.length} themes
              </span>
            )}
            {dailyContent.sourceArticles.length > 0 && (
              <span className="flex items-center gap-1.5">
                <ExternalLink className="h-3 w-3" />
                {dailyContent.sourceArticles.length} sources
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <DailyDeepDivePanels deepDive={dailyContent.deepDive} showTldr={false} />

          {/* Source articles */}
          <div className="space-y-3">
            <Panel
              eyebrow="Source articles"
              title={`${dailyContent.sourceArticles.length} stories behind today's signal`}
            >
              <div className="space-y-2">
                {dailyContent.sourceArticles.length > 0 ? (
                  dailyContent.sourceArticles.map((article, index) => {
                    const pubDate = new Date(article.publishedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    });
                    return (
                      <a
                        key={article.url}
                        href={article.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-start gap-3 rounded-2xl border border-white/8 bg-slate-900/50 p-3.5 transition-colors hover:border-indigo-400/20 hover:bg-slate-900/80"
                      >
                        <span className="mt-0.5 font-mono text-[11px] font-semibold text-slate-600 group-hover:text-indigo-400">
                          [{index + 1}]
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-5 text-slate-200 group-hover:text-white">
                            {article.title}
                          </p>
                          {article.description && (
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                              {article.description}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-2 font-mono text-[10px] text-slate-600">
                            <span>{article.source}</span>
                            <span>&middot;</span>
                            <span>{pubDate}</span>
                          </div>
                        </div>
                        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-700 transition-colors group-hover:text-indigo-400" />
                      </a>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-500">
                    Source links are unavailable for this digest.
                  </p>
                )}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
