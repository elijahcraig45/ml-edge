import Link from "next/link";
import { Brain, BookOpen, Zap, ArrowRight, Newspaper, Target, ExternalLink, CalendarDays } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { getCurriculum, getDailyContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [dailyContent, curriculum] = await Promise.all([
    getDailyContent(),
    getCurriculum(),
  ]);

  const isLive = dailyContent.status === "generated";
  const dateLabel = new Date(dailyContent.date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="console-grid min-h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-5">

        {/* Hero */}
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-indigo-950/40 p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
                <CalendarDays className="h-3 w-3" />
                {isLive ? dateLabel : "Daily briefing"}
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Turn today&apos;s AI news into{" "}
                <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-sky-300 bg-clip-text text-transparent">
                  a learning edge.
                </span>
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-400">
                Read the signal, internalize the tradeoffs, complete the quiz, and keep
                your understanding sharp every day.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/quiz"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400"
                >
                  <Brain className="h-4 w-4" />
                  Run today&apos;s quiz
                </Link>
                <Link
                  href="/news"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-800/60 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
                >
                  <Newspaper className="h-4 w-4 text-slate-400" />
                  Inspect the news feed
                </Link>
              </div>
            </div>

            {/* Live headline */}
            <div className="rounded-xl border border-white/8 bg-slate-950/50 p-5">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                  Today&apos;s signal
                </p>
              </div>
              <h2 className="mt-3 text-base font-semibold leading-7 text-slate-100">
                {dailyContent.headline}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {dailyContent.technicalSummary}
              </p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Link href="/quiz" className="group rounded-xl border border-white/8 bg-slate-900/50 p-4 transition-colors hover:border-indigo-400/30 hover:bg-slate-900/80">
            <div className="flex items-start justify-between">
              <div className="rounded-lg bg-indigo-500/15 p-2">
                <Brain className="h-4 w-4 text-indigo-300" />
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600 transition-colors group-hover:text-slate-400" />
            </div>
            <p className="mt-3 text-2xl font-bold text-white">
              {dailyContent.quiz.questions.length}
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-300">Quiz questions</p>
            <p className="mt-1 text-xs text-slate-500">From today&apos;s deep dive</p>
          </Link>

          <Link href="/curriculum" className="group rounded-xl border border-white/8 bg-slate-900/50 p-4 transition-colors hover:border-violet-400/30 hover:bg-slate-900/80">
            <div className="flex items-start justify-between">
              <div className="rounded-lg bg-violet-500/15 p-2">
                <BookOpen className="h-4 w-4 text-violet-300" />
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600 transition-colors group-hover:text-slate-400" />
            </div>
            <p className="mt-3 text-2xl font-bold text-white">{curriculum.length}</p>
            <p className="mt-0.5 text-sm font-medium text-slate-300">Curriculum modules</p>
            <p className="mt-1 text-xs text-slate-500">Beginner and advanced tracks</p>
          </Link>

          <Link href="/practice" className="group rounded-xl border border-white/8 bg-slate-900/50 p-4 transition-colors hover:border-emerald-400/30 hover:bg-slate-900/80">
            <div className="flex items-start justify-between">
              <div className="rounded-lg bg-emerald-500/15 p-2">
                <Target className="h-4 w-4 text-emerald-300" />
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600 transition-colors group-hover:text-slate-400" />
            </div>
            <p className="mt-3 text-2xl font-bold text-white">3×</p>
            <p className="mt-0.5 text-sm font-medium text-slate-300">New today</p>
            <p className="mt-1 text-xs text-slate-500">Questions added to practice bank</p>
          </Link>
        </div>

        {/* Bottom row */}
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          {/* Source articles */}
          <Panel eyebrow="Today's sources" title="What fed the deep dive">
            <div className="space-y-2">
              {dailyContent.sourceArticles.length > 0 ? (
                dailyContent.sourceArticles.slice(0, 4).map((article) => (
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
                ))
              ) : (
                <p className="text-sm text-slate-500">Source articles will appear here after the daily cron runs.</p>
              )}
            </div>
          </Panel>

          <Panel eyebrow="Suggested actions" title="Where to start">
            <div className="space-y-3">
              <Link
                href="/quiz"
                className="flex items-start gap-3 rounded-xl border border-white/8 bg-slate-900/50 p-4 text-sm text-slate-300 transition-colors hover:border-indigo-400/20 hover:text-slate-100"
              >
                <Brain className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" />
                <span>
                  Review the deep dive, then hit the quiz to turn reading into
                  retrieval practice.
                </span>
              </Link>
              <Link
                href="/curriculum"
                className="flex items-start gap-3 rounded-xl border border-white/8 bg-slate-900/50 p-4 text-sm text-slate-300 transition-colors hover:border-violet-400/20 hover:text-slate-100"
              >
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
                <span>
                  Browse the curriculum to find a lesson that aligns with
                  today&apos;s signal.
                </span>
              </Link>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
