import Link from "next/link";
import { notFound } from "next/navigation";
import { InteractiveLessonExperience } from "@/components/curriculum/interactive-lesson-experience";
import { Panel } from "@/components/ui/panel";
import { getAuthoredAcademyCourse } from "@/lib/authored-academy";

export const dynamic = "force-dynamic";

type AuthoredLessonPageProps = {
  params: Promise<{
    courseSlug: string;
    lessonId: string;
  }>;
};

export default async function AuthoredLessonPage({ params }: AuthoredLessonPageProps) {
  const { courseSlug, lessonId } = await params;
  const course = getAuthoredAcademyCourse(courseSlug);

  if (!course) {
    notFound();
  }

  const currentIndex = course.lessons.findIndex((lesson) => lesson.id === lessonId);

  if (currentIndex === -1) {
    notFound();
  }

  const lesson = course.lessons[currentIndex];
  const previousLesson = currentIndex > 0 ? course.lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < course.lessons.length - 1 ? course.lessons[currentIndex + 1] : null;

  return (
    <div className="console-grid min-h-full overflow-y-auto p-6 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Panel eyebrow={course.shortTitle} title={lesson.title}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-slate-400">
              {course.title}
            </span>
            <span className="rounded-full border border-emerald-400/30 px-3 py-1 font-mono text-xs text-emerald-200">
              Authored lesson
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-slate-400">
              {lesson.duration}
            </span>
          </div>
          <p className="mt-5 max-w-4xl text-base leading-8 text-slate-300">{lesson.summary}</p>
          <div className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-white/10 bg-slate-900/55 p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-indigo-300">
                Lecture framing
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-200">{lesson.hostedLesson.hook}</p>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                {lesson.hostedLesson.teachingPromise}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/55 p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-indigo-300">
                Learning objectives
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                {lesson.hostedLesson.learningObjectives.map((objective) => (
                  <li key={objective}>- {objective}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/curriculum/authored/${course.slug}`}
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800/80"
            >
              Back to course
            </Link>
            {previousLesson ? (
              <Link
                href={`/curriculum/authored/${course.slug}/lessons/${previousLesson.id}`}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800/80"
              >
                Previous lesson
              </Link>
            ) : null}
            {nextLesson ? (
              <Link
                href={`/curriculum/authored/${course.slug}/lessons/${nextLesson.id}`}
                className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-50 hover:border-indigo-300 hover:bg-indigo-500/25"
              >
                Next lesson
              </Link>
            ) : (
              <Link
                href={`/curriculum/authored/${course.slug}`}
                className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-50 hover:border-indigo-300 hover:bg-indigo-500/25"
              >
                Unlock badge test
              </Link>
            )}
          </div>
        </Panel>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <InteractiveLessonExperience
            key={lesson.id}
            courseSlug={course.slug}
            lessonId={lesson.id}
            hostedLesson={lesson.hostedLesson}
            quiz={lesson.quiz}
          />

          <div className="space-y-6">
            <Panel eyebrow="Lesson map" title="What this lesson covers">
              <div className="space-y-3">
                {lesson.sections.map((section) => (
                  <div
                    key={section}
                    className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                  >
                    <p className="text-sm leading-6 text-slate-300">{section}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel eyebrow="Exercises" title="Apply it like an engineer">
              <div className="space-y-3">
                {lesson.exercises.map((exercise) => (
                  <div
                    key={exercise.title}
                    className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-100">{exercise.title}</p>
                      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-indigo-300">
                        {exercise.type}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{exercise.brief}</p>
                    {exercise.deliverables[0] ? (
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Deliverable: {exercise.deliverables[0]}
                      </p>
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
