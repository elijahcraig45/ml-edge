import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { getCurriculum, getDailyContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [dailyContent, curriculum] = await Promise.all([
    getDailyContent(),
    getCurriculum(),
  ]);

  const stats = [
    {
      label: "Today's Quiz",
      value: `${dailyContent.quiz.questions.length} prompts`,
      detail: "Generated from the daily deep dive",
    },
    {
      label: "Curriculum Modules",
      value: `${curriculum.length}`,
      detail: "Beginner and advanced tracks",
    },
    {
      label: "Pipeline Status",
      value: dailyContent.status.toUpperCase(),
      detail:
        dailyContent.status === "generated"
          ? "Fresh content loaded from Firestore"
          : "Seeded content until the cron pipeline runs",
    },
  ];

  return (
    <div className="console-grid min-h-full overflow-y-auto p-6 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Panel className="overflow-hidden">
          <div className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-indigo-300">
                Daily briefing
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                The ML Edge turns AI news into a disciplined learning loop.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
                Read the signal, internalize the tradeoffs, complete the quiz, and
                keep your Master&apos;s pipeline moving every day.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/quiz"
                  className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-5 py-3 text-sm font-semibold text-indigo-50 hover:border-indigo-300 hover:bg-indigo-500/25"
                >
                  Run today&apos;s quiz
                </Link>
                <Link
                  href="/news"
                  className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800/80"
                >
                  Inspect the news feed
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-400">
                Live headline
              </p>
              <h2 className="mt-4 text-xl font-semibold text-slate-50">
                {dailyContent.headline}
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                {dailyContent.technicalSummary}
              </p>
            </div>
          </div>
        </Panel>

        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <Panel key={stat.label}>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-400">
                {stat.label}
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">{stat.value}</p>
              <p className="mt-2 text-sm text-slate-400">{stat.detail}</p>
            </Panel>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Panel eyebrow="Gemini course assistant" title="Why this lesson matters">
            <p className="text-sm leading-7 text-slate-300">
              {dailyContent.technicalSummary}
            </p>
          </Panel>

          <Panel eyebrow="Immediate next steps" title="Console actions">
            <div className="space-y-4 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                Review the daily deep dive, then switch to the quiz tab to turn
                passive reading into retrieval practice.
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                Browse the curriculum map to decide whether today supports core
                foundations or an advanced systems topic.
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
