import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { PracticeDrill } from "@/components/practice/practice-drill";
import { getQuestionBank } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function PracticePage() {
  const questions = await getQuestionBank();
  const countsByLevel = questions.reduce<Record<string, number>>((acc, question) => {
    acc[question.level] = (acc[question.level] ?? 0) + 1;
    return acc;
  }, {});
  const topTopics = Array.from(
    questions.reduce((acc, question) => {
      acc.set(question.topic, (acc.get(question.topic) ?? 0) + 1);
      return acc;
    }, new Map<string, number>()),
  )
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 8);

  return (
    <div className="console-grid min-h-full overflow-y-auto p-6 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="sr-only">Practice question bank</h1>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Panel eyebrow="Practice space" title="Question Bank Drill">
            <p className="text-sm leading-7 text-slate-300">
              Work through the authored {questions.length}-question foundations bank
              across DS&amp;A and ML/AI. Filter by level, check your answer, and review
              the explanation before moving on.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/quiz"
                className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-50 hover:border-indigo-300 hover:bg-indigo-500/25"
              >
                Run today&apos;s quiz first
              </Link>
              <Link
                href="/curriculum"
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800/80"
              >
                Match a topic to the curriculum
              </Link>
            </div>
          </Panel>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "All questions", value: questions.length },
              { label: "Unique topics", value: topTopics.length > 0 ? new Set(questions.map((q) => q.topic)).size : 0 },
              { label: "Easy drills", value: countsByLevel.easy ?? 0 },
              { label: "Expert drills", value: countsByLevel.expert ?? 0 },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border border-white/10 bg-slate-900/60 p-4"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">
                  {item.label}
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <PracticeDrill questions={questions} />

          <div className="space-y-6">
            <Panel eyebrow="Coverage" title="What this bank helps you rehearse">
              <ul className="space-y-3 text-sm leading-6 text-slate-300">
                <li>- Complexity, arrays, recursion, trees, hashing, graphs, and DP.</li>
                <li>- Core ML math, evaluation, optimization, systems, and reliability.</li>
                <li>- Fast recall under difficulty filters before interviews, study, or coding work.</li>
              </ul>
            </Panel>

            <Panel eyebrow="Top topics" title="Heaviest coverage areas">
              <div className="flex flex-wrap gap-2">
                {topTopics.map(([topic, count]) => (
                  <span
                    key={topic}
                    className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-100"
                  >
                    {topic} · {count}
                  </span>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
