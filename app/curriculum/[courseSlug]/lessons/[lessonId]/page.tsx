import Link from "next/link";
import { notFound } from "next/navigation";
import { InteractiveLessonExperienceClient } from "@/components/curriculum/interactive-lesson-experience-client";
import { Panel } from "@/components/ui/panel";
import {
  getAuthoredHostedLessonContent,
  hasAuthoredHostedLessonContent,
} from "@/lib/authored-hosted-lessons";
import { getCurriculumExperience } from "@/lib/content";

export const dynamic = "force-dynamic";

type LessonPageProps = {
  params: Promise<{
    courseSlug: string;
    lessonId: string;
  }>;
};

export default async function LessonPage({ params }: LessonPageProps) {
  const { courseSlug, lessonId } = await params;
  const curriculum = await getCurriculumExperience();
  const course = curriculum.courses.find((item) => item.slug === courseSlug);

  if (!course) {
    notFound();
  }

  const lessonEntries = course.modules.flatMap((module) =>
    module.lessons
      .filter((lesson) => hasAuthoredHostedLessonContent(lesson.id))
      .map((lesson) => ({ module, lesson })),
  );
  const currentIndex = lessonEntries.findIndex((entry) => entry.lesson.id === lessonId);

  if (currentIndex === -1) {
    notFound();
  }

  const currentEntry = lessonEntries[currentIndex];
  const hostedLesson = getAuthoredHostedLessonContent(currentEntry.lesson.id);

  if (!hostedLesson) {
    notFound();
  }

  const previousLesson = currentIndex > 0 ? lessonEntries[currentIndex - 1].lesson : null;
  const nextLesson =
    currentIndex < lessonEntries.length - 1 ? lessonEntries[currentIndex + 1].lesson : null;
  const track = curriculum.tracks.find((item) => item.courseId === course.id);
  const resourceIds = track
    ? [...new Set(track.stages.flatMap((stage) => stage.resourceIds))]
    : [];
  const courseResources = resourceIds
    .map((resourceId) => curriculum.resources.find((item) => item.id === resourceId))
    .filter((resource): resource is NonNullable<typeof resource> => resource !== undefined)
    .slice(0, 4);

  return (
    <div className="console-grid min-h-full overflow-y-auto p-6 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Panel eyebrow={currentEntry.module.title} title={currentEntry.lesson.title}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-slate-400">
              {course.title}
            </span>
            <span className="rounded-full border border-emerald-400/30 px-3 py-1 font-mono text-xs text-emerald-200">
              Authored lesson
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-slate-400">
              {currentEntry.lesson.duration}
            </span>
          </div>
          <p className="mt-5 max-w-4xl text-base leading-8 text-slate-300">
            {currentEntry.lesson.summary}
          </p>
          <div className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-white/10 bg-slate-900/55 p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-indigo-300">
                Lecture framing
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-200">{hostedLesson.hook}</p>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                {hostedLesson.teachingPromise}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/55 p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-indigo-300">
                Learning objectives
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                {hostedLesson.learningObjectives.map((objective) => (
                  <li key={objective}>- {objective}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/curriculum/${course.slug}`}
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800/80"
            >
              Back to course
            </Link>
            {previousLesson ? (
              <Link
                href={`/curriculum/${course.slug}/lessons/${previousLesson.id}`}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800/80"
              >
                Previous lesson
              </Link>
            ) : null}
            {nextLesson ? (
              <Link
                href={`/curriculum/${course.slug}/lessons/${nextLesson.id}`}
                className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-50 hover:border-indigo-300 hover:bg-indigo-500/25"
              >
                Next lesson
              </Link>
            ) : null}
          </div>
        </Panel>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <InteractiveLessonExperienceClient
            courseSlug={course.slug}
            lessonId={currentEntry.lesson.id}
            hostedLesson={hostedLesson}
            quiz={currentEntry.lesson.quiz}
          />

          <div className="space-y-6">
            <Panel eyebrow="Supplemental source support" title="Use alongside the authored lesson">
              <div className="space-y-3">
                {courseResources.map((resource) => (
                  <a
                    key={resource.id}
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-white/10 bg-slate-900/60 p-4 hover:border-emerald-400/30"
                  >
                    <p className="text-sm font-semibold text-slate-100">{resource.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{resource.provider}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{resource.notes}</p>
                  </a>
                ))}
              </div>
            </Panel>

            <Panel eyebrow="Video plan" title="Optional reinforcement">
              <div className="space-y-3">
                {currentEntry.lesson.videos.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-indigo-300">
                        {item.kind}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{item.objective}</p>
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex text-sm font-medium text-indigo-300 hover:text-indigo-200"
                      >
                        Open source
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
