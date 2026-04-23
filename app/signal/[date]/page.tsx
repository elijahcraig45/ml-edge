import { notFound } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  Brain,
  ExternalLink,
  ArrowLeft,
  Radio,
} from "lucide-react";
import { getDailyContent } from "@/lib/content";
import { DailyDeepDivePanels } from "@/components/news/daily-deep-dive";
import { Panel } from "@/components/ui/panel";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ date: string }>;
}

export default async function SignalDetailPage({ params }: Props) {
  const { date } = await params;

  // Basic validation — expect YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    notFound();
  }

  const signal = await getDailyContent(date);

  // If it fell back to seeded content for a non-today date, treat as 404
  if (signal.status === "seeded" && date !== new Date().toISOString().slice(0, 10)) {
    notFound();
  }

  const dateLabel = new Date(signal.date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="min-h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Back */}
        <Link
          href="/signal"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All signals
        </Link>

        {/* Hero */}
        <div className="rounded-2xl border border-white/8 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-indigo-950/40 p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            <CalendarDays className="h-3 w-3" />
            {dateLabel}
          </div>

          <h1 className="mt-4 text-xl font-bold leading-8 tracking-tight text-white sm:text-2xl">
            {signal.headline}
          </h1>

          <div className="mt-5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
              TL;DR
            </p>
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            {signal.deepDive.tldr}
          </p>

          <div className="mt-6">
            <Link
              href="/quiz"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400"
            >
              <Brain className="h-4 w-4" />
              Take today&apos;s foundations quiz
            </Link>
          </div>
        </div>

        <DailyDeepDivePanels deepDive={signal.deepDive} showTldr={false} />

        {/* Source articles */}
        {signal.sourceArticles.length > 0 && (
          <Panel eyebrow="Latest news" title="Top stories behind this signal">
            <div className="space-y-2">
              {signal.sourceArticles.map((article) => (
                <a
                  key={article.url}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3 rounded-xl border border-white/8 bg-slate-900/50 p-3.5 text-sm transition-colors hover:border-indigo-400/20"
                >
                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600 transition-colors group-hover:text-indigo-300" />
                  <div className="min-w-0">
                    <p className="font-medium leading-6 text-slate-200 group-hover:text-white">
                      {article.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{article.source}</p>
                  </div>
                </a>
              ))}
            </div>
          </Panel>
        )}

        {/* Footer nav */}
        <div className="flex items-center justify-between border-t border-white/6 pt-4">
          <Link
            href="/signal"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300"
          >
            <Radio className="h-3.5 w-3.5" />
            Signal archive
          </Link>
          <Link
            href="/quiz"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 transition-colors hover:text-indigo-300"
          >
            <Brain className="h-3.5 w-3.5" />
            Take today&apos;s quiz
          </Link>
        </div>
      </div>
    </div>
  );
}
