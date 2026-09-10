import Link from "next/link";
import { notFound } from "next/navigation";
import { StageAssessmentView } from "@/components/learn/stage-assessment";
import { buildStageAssessment } from "@/lib/curriculum/assessment";
import { getCurriculum, getStage } from "@/lib/curriculum/load";

export const dynamicParams = false;

export async function generateStaticParams() {
  const result = await getCurriculum();
  if (!result.ok) return [];
  return result.value.tiers.flatMap((tier) =>
    tier.stages.map((stage) => ({ tier: tier.id, stage: stage.id })),
  );
}

export default async function StagePage({
  params,
}: {
  params: Promise<{ tier: string; stage: string }>;
}) {
  const { tier: tierId, stage: stageId } = await params;
  const result = await getStage(tierId, stageId);
  if (!result.ok) notFound();
  const { tier, stage } = result.value;

  const totalMinutes = stage.lessons.reduce((s, l) => s + l.estimatedMinutes, 0);
  const assessment = buildStageAssessment(stage);

  return (
    <div className="px-5 py-8 lg:px-8">
      <Link
        href={`/learn/${tier.id}`}
        className="font-mono text-[11px] text-slate-500 hover:text-slate-300"
      >
        ← {tier.title}
      </Link>

      <header className="mt-4 max-w-2xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-indigo-300">
          Stage {stage.order}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">
          {stage.title}
        </h1>
        <p className="mt-3 text-base italic leading-7 text-slate-300">{stage.thesis}</p>
        <p className="mt-3 text-sm leading-7 text-slate-400">{stage.summary}</p>
        <p className="mt-3 font-mono text-[11px] text-slate-600">
          {stage.lessons.length} lessons · about {Math.round(totalMinutes / 60)}h{" "}
          {totalMinutes % 60}m
        </p>
      </header>

      <section className="mt-8 rounded-2xl border border-white/10 bg-slate-900/40 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
          When you finish this stage you can
        </p>
        <ul className="mt-3 space-y-2">
          {stage.outcomes.map((outcome) => (
            <li key={outcome} className="flex gap-2.5 text-sm text-slate-300">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-indigo-400" />
              {outcome}
            </li>
          ))}
        </ul>
      </section>

      <ol className="mt-8 space-y-3">
        {stage.lessons.map((lesson, index) => (
          <li key={lesson.id}>
            <Link
              href={`/learn/${tier.id}/${stage.id}/${lesson.slug}`}
              className="flex items-start gap-4 rounded-2xl border border-white/10 bg-slate-900/40 p-5 hover:border-indigo-400/40"
            >
              <span className="mt-0.5 font-mono text-xs tabular-nums text-slate-600">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-medium text-slate-100">
                  {lesson.title}
                </span>
                <span className="mt-1.5 block text-sm leading-6 text-slate-400">
                  {lesson.objectives[0]}
                </span>
                <span className="mt-2 flex flex-wrap gap-2">
                  <span className="font-mono text-[10px] text-slate-600">
                    {lesson.estimatedMinutes} min
                  </span>
                  {lesson.runtimes.map((runtime) => (
                    <span
                      key={runtime.engine}
                      className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500"
                    >
                      {runtime.engine === "python" ? "Python" : "SQL"}
                    </span>
                  ))}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>

      {assessment ? <StageAssessmentView assessment={assessment} /> : null}
    </div>
  );
}
