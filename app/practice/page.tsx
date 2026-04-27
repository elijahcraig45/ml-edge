import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { PracticeDrill } from "@/components/practice/practice-drill";
import { getQuestionBank } from "@/lib/content";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ topic?: string }>;
}

export default async function PracticePage({ searchParams }: Props) {
  const { topic: topicParam } = await searchParams;
  const questions = await getQuestionBank();

  const topTopics = Array.from(
    questions.reduce((acc, q) => {
      acc.set(q.topic, (acc.get(q.topic) ?? 0) + 1);
      return acc;
    }, new Map<string, number>()),
  ).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const uniqueTopicCount = topTopics.length;
  const countsByLevel = questions.reduce<Record<string, number>>((acc, q) => {
    acc[q.level] = (acc[q.level] ?? 0) + 1;
    return acc;
  }, {});

  const activeTopic = topicParam
    ? topTopics.find(([t]) => t === topicParam)?.[0] ?? null
    : null;

  return (
    <div className="console-grid min-h-full overflow-y-auto p-6 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="sr-only">Practice question bank</h1>

        {/* Header */}
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Panel eyebrow="Practice space" title="Question Bank Drill">
            <p className="text-sm leading-7 text-slate-300">
              Work through the authored {questions.length}-question foundations bank
              across DS&amp;A and ML/AI. Filter by topic and difficulty, check your
              answer, and review the explanation before moving on.
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
              { label: "Unique topics", value: uniqueTopicCount },
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

        {/* Topic browser */}
        <div className="rounded-2xl border border-white/8 bg-slate-900/40 p-5">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
            Jump to a topic
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/practice"
              className={[
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                !activeTopic
                  ? "border-indigo-400/60 bg-indigo-500/20 text-indigo-100"
                  : "border-white/10 text-slate-400 hover:border-slate-500 hover:text-slate-300",
              ].join(" ")}
            >
              All
            </Link>
            {topTopics.map(([topic, count]) => (
              <Link
                key={topic}
                href={`/practice?topic=${encodeURIComponent(topic)}`}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  activeTopic === topic
                    ? "border-indigo-400/60 bg-indigo-500/20 text-indigo-100"
                    : "border-white/10 text-slate-400 hover:border-slate-500 hover:text-slate-300",
                ].join(" ")}
              >
                {topic}
                <span className="ml-1.5 opacity-50">{count}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Drill */}
        <PracticeDrill
          questions={questions}
          initialTopic={activeTopic ?? undefined}
        />
      </div>
    </div>
  );
}
