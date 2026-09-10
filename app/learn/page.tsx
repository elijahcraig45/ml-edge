import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurriculum } from "@/lib/curriculum/load";

/** Fully prerendered: content is static and progress lives in the browser. */
export const dynamicParams = false;

export default async function LearnIndexPage() {
  const result = await getCurriculum();
  if (!result.ok) notFound();
  const curriculum = result.value;

  const lessonCount = curriculum.tiers.reduce(
    (sum, tier) =>
      sum + tier.stages.reduce((s, stage) => s + stage.lessons.length, 0),
    0,
  );

  return (
    <div className="px-5 py-8 lg:px-8">
      <header className="max-w-2xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-indigo-300">
          The ladder
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50">
          {curriculum.title}
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-400">
          Every data structure has a relational twin. A hash join is a hash table; a
          window function is a sliding-window scan; a recursive CTE is breadth-first
          search. This curriculum teaches both halves together, in Python and SQL,
          with every exercise runnable and graded in your browser.
        </p>
        <p className="mt-3 font-mono text-[11px] text-slate-600">
          {lessonCount} lesson{lessonCount === 1 ? "" : "s"} published · built one stage at a time
        </p>
      </header>

      <div className="mt-10 space-y-10">
        {curriculum.tiers.map((tier) => (
          <section key={tier.id}>
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="text-lg font-semibold text-slate-100">{tier.title}</h2>
              <p className="text-xs text-slate-500">{tier.audience}</p>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {tier.stages.map((stage) => (
                <Link
                  key={stage.id}
                  href={`/learn/${tier.id}/${stage.id}`}
                  className="group rounded-2xl border border-white/10 bg-slate-900/40 p-5 hover:border-indigo-400/40"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-indigo-300">
                    Stage {stage.order}
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-slate-100 group-hover:text-white">
                    {stage.title}
                  </h3>
                  <p className="mt-2 text-sm italic leading-6 text-slate-400">
                    {stage.thesis}
                  </p>
                  <p className="mt-3 font-mono text-[10px] text-slate-600">
                    {stage.lessons.length} lesson{stage.lessons.length === 1 ? "" : "s"}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
