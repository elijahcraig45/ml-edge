import { notFound } from "next/navigation";
import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { LessonAudioPlayer } from "@/components/quiz/lesson-audio-player";
import { getDailyMiniLesson } from "@/lib/content";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ date: string }>;
}

export default async function MiniLessonDetailPage({ params }: Props) {
  const { date } = await params;
  const lesson = await getDailyMiniLesson(date);

  if (!lesson) notFound();

  return (
    <div className="console-grid min-h-full overflow-y-auto p-6 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Panel eyebrow={`Mini-lesson · ${lesson.date}`} title={lesson.headline}>
          <p className="text-sm font-medium text-indigo-400">{lesson.topic}</p>
          {lesson.curriculumTheme && (
            <p className="mt-1 text-xs text-slate-500">{lesson.curriculumTheme}</p>
          )}
          <p className="mt-3 text-sm leading-7 text-slate-300">{lesson.whyItMatters}</p>
        </Panel>

        {/* Audio player */}
        {lesson.audioUrl && (
          <LessonAudioPlayer audioUrl={lesson.audioUrl} topic={lesson.topic} />
        )}

        {/* Video embed */}
        {lesson.videoUrl && (
          <div className="overflow-hidden rounded-2xl border border-slate-700/50">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              controls
              className="w-full"
              preload="metadata"
              src={lesson.videoUrl}
            />
          </div>
        )}

        {lesson.sections.map((section, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6"
          >
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
              {section.title}
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
              {section.body}
            </p>
          </div>
        ))}

        {lesson.workedExample && (
          <div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/30 p-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-400">
              Worked example
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
              {lesson.workedExample}
            </p>
          </div>
        )}

        {lesson.commonPitfalls.length > 0 && (
          <div className="rounded-2xl border border-amber-700/40 bg-amber-950/30 p-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-400">
              Common pitfalls
            </h2>
            <ul className="space-y-2">
              {lesson.commonPitfalls.map((pitfall, i) => (
                <li key={i} className="flex gap-3 text-sm leading-6 text-slate-200">
                  <span className="mt-0.5 shrink-0 text-amber-400">⚠</span>
                  {pitfall}
                </li>
              ))}
            </ul>
          </div>
        )}

        {lesson.bridgeToQuiz && (
          <div className="rounded-2xl border border-slate-600/50 bg-slate-800/30 p-6">
            <p className="text-sm leading-7 text-slate-300">{lesson.bridgeToQuiz}</p>
          </div>
        )}

        <div className="flex gap-4">
          <Link
            href="/quiz/lessons"
            className="rounded-xl border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-400 hover:text-white"
          >
            ← All lessons
          </Link>
          <Link
            href="/quiz"
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Take today&apos;s quiz →
          </Link>
        </div>
      </div>
    </div>
  );
}
