import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import {
  getCurriculumLibraryLessons,
  getCurriculumLibraryOverview,
  getCurriculumLibraryTracks,
} from "@/lib/content";

export const dynamic = "force-dynamic";

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not imported yet";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default async function CurriculumLibraryPage() {
  const [overview, lessons, tracks] = await Promise.all([
    getCurriculumLibraryOverview(),
    getCurriculumLibraryLessons(),
    getCurriculumLibraryTracks(),
  ]);

  return (
    <div className="console-grid min-h-full overflow-y-auto p-6 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Panel
          eyebrow="Imported lesson library"
          title="Real external lessons, organized into a source-backed curriculum"
        >
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <p className="text-sm leading-7 text-slate-300">
                These are not just references. Each library lesson includes a TA-style
                briefing, theory equations, an implementation lab, ten practice problems,
                a graded quiz, and a short video script generated from the source material.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/curriculum"
                  className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800/80"
                >
                  Back to curriculum
                </Link>
                {tracks[0] ? (
                  <Link
                    href={`/curriculum/library/tracks/${tracks[0].slug}`}
                    className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-50 hover:border-indigo-300 hover:bg-indigo-500/25"
                  >
                    Start first track
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Library lessons", value: String(overview.lessonCount) },
                { label: "Repositories", value: String(overview.repositoryCount) },
                {
                  label: "Science track",
                  value: String(overview.trackCounts["Science Track"]),
                },
                {
                  label: "Functional track",
                  value: String(overview.trackCounts["Functional Track"]),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Latest import: {formatTimestamp(overview.latestImportAt)}
          </p>
        </Panel>

        <div className="grid gap-4 xl:grid-cols-2">
          {tracks.map((track) => (
            <Panel
              key={track.slug}
              eyebrow={track.trackLabel ?? "Library track"}
              title={track.title}
            >
              <div className="space-y-4">
                <p className="text-sm leading-7 text-slate-300">{track.description}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      Lessons
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-white">
                      {track.lessonCount}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      Stages
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-white">
                      {track.stages.length}
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-6 text-slate-400">{track.focus}</p>
                <ul className="space-y-2 text-sm leading-6 text-slate-400">
                  {track.stages.slice(0, 3).map((stage) => (
                    <li key={stage.id}>- {stage.title}</li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/curriculum/library/tracks/${track.slug}`}
                    className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-50 hover:border-indigo-300 hover:bg-indigo-500/25"
                  >
                    Open track
                  </Link>
                </div>
              </div>
            </Panel>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {lessons.map((lesson) => (
            <Panel
              key={lesson.id}
              eyebrow={lesson.curriculumTrack ?? "Library lesson"}
              title={lesson.title}
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-slate-400">
                    {lesson.duration}
                  </span>
                  {lesson.repositoryName ? (
                    <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-slate-400">
                      {lesson.repositoryOwner}/{lesson.repositoryName}
                    </span>
                  ) : null}
                  <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-slate-400">
                    {lesson.sourceFormat}
                  </span>
                </div>

                <p className="text-sm leading-7 text-slate-300">{lesson.summary}</p>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">What you will study</p>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
                      {lesson.sections.slice(0, 3).map((section) => (
                        <li key={section}>- {section}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-100">Why it teaches well</p>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
                      <li>- 3-paragraph senior-engineer briefing</li>
                      <li>- {lesson.coreTheory.equations.length} core equations with explanations</li>
                      <li>- {lesson.practiceProblems.length} practice problems + 5-question quiz</li>
                    </ul>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                  <p className="text-sm font-semibold text-slate-100">Preview</p>
                  <p className="mt-2 text-sm leading-7 text-slate-300">{lesson.briefing[0]}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/curriculum/library/${lesson.id}`}
                    className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-50 hover:border-indigo-300 hover:bg-indigo-500/25"
                  >
                    Open lesson
                  </Link>
                  {lesson.sourceUrl ? (
                    <a
                      href={lesson.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800/80"
                    >
                      View source
                    </a>
                  ) : null}
                </div>
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </div>
  );
}
