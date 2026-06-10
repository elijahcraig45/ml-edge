import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { LearningPathView } from "@/components/curriculum/learning-path-view";
import { getMlEngineerTrack } from "@/lib/learning-paths";

export const dynamic = "force-dynamic";

export default function LearningPathPage() {
  const track = getMlEngineerTrack();

  return (
    <div className="console-grid min-h-full overflow-y-auto p-6 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Panel
          eyebrow="Your path"
          title={track.title}
          action={
            <Link
              href="/curriculum/authored"
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800/80"
            >
              All authored courses
            </Link>
          }
        >
          <p className="max-w-3xl text-sm leading-7 text-slate-300">{track.summary}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">
                Phases
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">{track.phases.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">
                Courses
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">{track.totalCourses}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">
                Lessons
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">{track.totalLessons}</p>
            </div>
          </div>
        </Panel>

        <LearningPathView path={track} />
      </div>
    </div>
  );
}
