import Link from "next/link";
import type { Metadata } from "next";
import { Panel } from "@/components/ui/panel";
import { StreakCard } from "@/components/dashboard/streak-card";
import {
  LadderProgress,
  type LadderStage,
} from "@/components/dashboard/ladder-progress";
import { getCurriculum, getProblemBank } from "@/lib/curriculum/load";

export const dynamicParams = false;

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your progress through the DS&A ladder.",
};

export default async function DashboardPage() {
  const [curriculum, bank] = await Promise.all([getCurriculum(), getProblemBank()]);

  const stages: LadderStage[] = curriculum.ok
    ? curriculum.value.tiers.flatMap((tier) =>
        tier.stages.map((stage) => ({
          tierId: tier.id,
          tierTitle: tier.title,
          stageId: stage.id,
          stageTitle: stage.title,
          order: stage.order,
          lessons: stage.lessons.map((l) => ({
            id: l.id,
            slug: l.slug,
            title: l.title,
          })),
        })),
      )
    : [];

  const lessonCount = stages.reduce((sum, s) => sum + s.lessons.length, 0);

  return (
    <div className="space-y-6 px-5 py-8 lg:px-8">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-indigo-300">
          Your progress
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50">
          The ladder
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
          {lessonCount} lessons and {bank.problems.length} problems published so
          far. Progress is stored in this browser; sign in to carry it between
          devices.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Panel eyebrow="Curriculum" title="Where you are">
          {stages.length > 0 ? (
            <LadderProgress stages={stages} />
          ) : (
            <p className="text-sm text-slate-400">
              No stages are published yet.
            </p>
          )}
        </Panel>

        <div className="space-y-6">
          <StreakCard />
          <Panel eyebrow="Practice" title="Drill a pattern">
            <p className="text-sm leading-6 text-slate-400">
              {bank.problems.length} auto-graded problems across{" "}
              {bank.patterns.length} patterns, in Python and SQL.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/problems"
                className="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-2 text-xs font-semibold text-indigo-100 hover:border-indigo-300"
              >
                Problem bank
              </Link>
              <Link
                href="/interview"
                className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-300 hover:border-slate-500"
              >
                Interview mode
              </Link>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
