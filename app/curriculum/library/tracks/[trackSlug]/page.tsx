import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel } from "@/components/ui/panel";
import { getCurriculumLibraryTrack } from "@/lib/content";

export const dynamic = "force-dynamic";

type LibraryTrackPageProps = {
  params: Promise<{
    trackSlug: string;
  }>;
};

export default async function CurriculumLibraryTrackPage({
  params,
}: LibraryTrackPageProps) {
  const { trackSlug } = await params;
  const track = await getCurriculumLibraryTrack(trackSlug);

  if (!track) {
    notFound();
  }

  const firstLesson = track.stages[0]?.lessons[0];

  return (
    <div className="console-grid min-h-full overflow-y-auto p-6 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Panel eyebrow={track.trackLabel ?? "Library track"} title={track.title}>
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <p className="text-sm leading-7 text-slate-300">{track.description}</p>
              <p className="text-sm leading-7 text-slate-400">{track.audience}</p>
              <p className="text-sm leading-7 text-slate-400">
                <span className="font-semibold text-slate-100">Track focus:</span>{" "}
                {track.focus}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/curriculum/library"
                  className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800/80"
                >
                  Back to library
                </Link>
                {firstLesson ? (
                  <Link
                    href={`/curriculum/library/${firstLesson.id}`}
                    className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-50 hover:border-indigo-300 hover:bg-indigo-500/25"
                  >
                    Start track
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Lessons
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">{track.lessonCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Stages
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">{track.stages.length}</p>
              </div>
            </div>
          </div>
        </Panel>

        <div className="space-y-6">
          {track.stages.map((stage, stageIndex) => (
            <Panel key={stage.id} eyebrow={`Stage ${stageIndex + 1}`} title={stage.title}>
              <p className="text-sm leading-7 text-slate-300">{stage.objective}</p>
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {stage.lessons.map((lesson, lessonIndex) => (
                  <div
                    key={lesson.id}
                    className="rounded-3xl border border-white/10 bg-slate-900/60 p-5"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-slate-400">
                        Lesson {lessonIndex + 1}
                      </span>
                      <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-slate-400">
                        {lesson.duration}
                      </span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-white">{lesson.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-300">{lesson.summary}</p>
                    <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-400">
                      {lesson.sections.slice(0, 3).map((section) => (
                        <li key={section}>- {section}</li>
                      ))}
                    </ul>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        href={`/curriculum/library/${lesson.id}`}
                        className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-50 hover:border-indigo-300 hover:bg-indigo-500/25"
                      >
                        Open lesson
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </div>
  );
}
