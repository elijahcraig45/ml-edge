import Link from "next/link";
import { Brain, BookOpen, ArrowRight, Newspaper, Layers, CalendarDays, ExternalLink } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { StreakCard } from "@/components/dashboard/streak-card";
import { getAuthoredAcademyCourses } from "@/lib/authored-academy";
import {
  getDailyContent,
  getDailyQuiz,
} from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [dailyContent, dailyQuiz] = await Promise.all([
    getDailyContent(),
    getDailyQuiz(),
  ]);
  const authoredAcademyCourses = getAuthoredAcademyCourses();
  const coreAuthoredCourses = authoredAcademyCourses.filter((c) => !c.canTakeAnytime);
  const firstCourse = coreAuthoredCourses[0];
  const firstLesson = firstCourse?.lessons[0];

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
                Read the signal, then run the daily foundations drill to keep
                retrieval, reasoning, and implementation instincts sharp every day.
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
                  Read today&apos;s signal
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
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">
                {dailyContent.deepDive.tldr}
              </p>
              <Link
                href={`/signal/${dailyContent.date}`}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 transition-colors hover:text-indigo-300"
              >
                Read full deep dive
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Three meaningful cards */}
        <div className="grid gap-3 sm:grid-cols-3">

          {/* Today's quiz topic */}
          <Link href="/quiz" className="group rounded-xl border border-white/8 bg-slate-900/50 p-4 transition-colors hover:border-indigo-400/30 hover:bg-slate-900/80">
            <div className="flex items-start justify-between">
              <div className="rounded-lg bg-indigo-500/15 p-2">
                <Brain className="h-4 w-4 text-indigo-300" />
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600 transition-colors group-hover:text-slate-400" />
            </div>
            <p className="mt-3 text-xs font-mono uppercase tracking-[0.15em] text-slate-500">Today&apos;s quiz</p>
            <p className="mt-1.5 text-sm font-semibold leading-6 text-white">{dailyQuiz.topic}</p>
            <p className="mt-1 text-xs text-slate-500">
              {dailyQuiz.questions.length} questions · easy → expert
            </p>
          </Link>

          {/* Today's deep dive themes */}
          <Link href="/news" className="group rounded-xl border border-white/8 bg-slate-900/50 p-4 transition-colors hover:border-violet-400/30 hover:bg-slate-900/80">
            <div className="flex items-start justify-between">
              <div className="rounded-lg bg-violet-500/15 p-2">
                <Layers className="h-4 w-4 text-violet-300" />
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600 transition-colors group-hover:text-slate-400" />
            </div>
            <p className="mt-3 text-xs font-mono uppercase tracking-[0.15em] text-slate-500">Deep dive themes</p>
            <ul className="mt-1.5 space-y-1">
              {dailyContent.deepDive.themes.slice(0, 3).map((theme, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs leading-5 text-slate-300">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-violet-400" />
                  {theme.title}
                </li>
              ))}
            </ul>
          </Link>

          {/* Streak */}
          <StreakCard />
        </div>

        {/* Bottom row */}
        <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
          {/* Source articles */}
          <Panel eyebrow="Latest news" title="Top stories behind today's deep dive">
            <div className="space-y-2">
              {dailyContent.sourceArticles.length > 0 ? (
                dailyContent.sourceArticles.slice(0, 8).map((article, index) => (
                  <a
                    key={article.url}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-3 rounded-xl border border-white/8 bg-slate-900/50 p-3.5 text-sm transition-colors hover:border-indigo-400/20 hover:bg-slate-900/80"
                  >
                    <span className="mt-0.5 font-mono text-[11px] font-semibold text-slate-600 group-hover:text-indigo-400">
                      [{index + 1}]
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-5 text-slate-200 group-hover:text-white">
                        {article.title}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-600">{article.source}</p>
                    </div>
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-700 transition-colors group-hover:text-indigo-400" />
                  </a>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Source links are unavailable for this digest.
                </p>
              )}
            </div>
          </Panel>

          {/* Today's path */}
          <Panel eyebrow="Today's recommended path" title="Three things to do">
            <div className="space-y-3">
              <div className="rounded-xl border border-white/8 bg-slate-900/50 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-indigo-300">Step 1 · Signal</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Read the deep dive. Understand what moved in the field today and why it matters.
                </p>
                <Link href="/news" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300">
                  Open signal <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="rounded-xl border border-white/8 bg-slate-900/50 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-violet-300">Step 2 · Quiz</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Run the foundations drill on <span className="font-semibold text-slate-100">{dailyQuiz.topic}</span>. Three questions, graded difficulty.
                </p>
                <Link href="/quiz" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-violet-400 hover:text-violet-300">
                  Take quiz <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="rounded-xl border border-white/8 bg-slate-900/50 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300">Step 3 · Learn</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Pick up the authored path. <span className="font-semibold text-slate-100">{firstCourse?.shortTitle}</span> is the right place to start.
                </p>
                <Link
                  href={firstLesson ? `/curriculum/authored/${firstCourse?.slug}/lessons/${firstLesson.id}` : "/curriculum"}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300"
                >
                  Start lesson <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}


