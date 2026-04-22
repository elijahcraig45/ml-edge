import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseOutline } from "@/components/curriculum/course-outline";
import { Panel } from "@/components/ui/panel";
import { hasAuthoredHostedLessonContent } from "@/lib/authored-hosted-lessons";
import { getCurriculumExperience } from "@/lib/content";

export const dynamic = "force-dynamic";

type CoursePageProps = {
  params: Promise<{
    courseSlug: string;
  }>;
};

export default async function CoursePage({ params }: CoursePageProps) {
  const { courseSlug } = await params;
  const curriculum = await getCurriculumExperience();
  const course = curriculum.courses.find((item) => item.slug === courseSlug);

  if (!course) {
    notFound();
  }

  const track = curriculum.tracks.find((item) => item.courseId === course.id);
  const resourceIds = track
    ? [...new Set(track.stages.flatMap((stage) => stage.resourceIds))]
    : [];
  const courseResources = resourceIds
    .map((resourceId) => curriculum.resources.find((item) => item.id === resourceId))
    .filter((resource): resource is NonNullable<typeof resource> => resource !== undefined);
  const authoredModules = course.modules
    .map((module) => ({
      ...module,
      lessons: module.lessons.filter((lesson) => hasAuthoredHostedLessonContent(lesson.id)),
    }))
    .filter((module) => module.lessons.length > 0);
  const authoredLessonCount = authoredModules.reduce(
    (count, module) => count + module.lessons.length,
    0,
  );
  const firstLesson = authoredModules[0]?.lessons[0];

  return (
    <div className="console-grid min-h-full overflow-y-auto p-6 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Panel eyebrow={`${course.level} course`} title={course.title}>
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-sm leading-7 text-slate-300">{course.summary}</p>
              <p className="mt-4 text-sm leading-7 text-slate-400">
                <span className="font-semibold text-slate-100">Why it matters:</span>{" "}
                {course.whyItMatters}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/curriculum"
                  className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800/80"
                >
                  Back to curriculum
                </Link>
                {firstLesson ? (
                  <Link
                    href={`/curriculum/${course.slug}/lessons/${firstLesson.id}`}
                    className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-50 hover:border-indigo-300 hover:bg-indigo-500/25"
                  >
                    Start authored lesson path
                  </Link>
                ) : (
                  <Link
                    href="/curriculum/library"
                    className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-50 hover:border-indigo-300 hover:bg-indigo-500/25"
                  >
                    Browse lesson library
                  </Link>
                )}
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-indigo-300">
                  Timeframe
                </span>
                <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-slate-300">
                  {course.timeframe}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-sm font-semibold text-slate-100">Outcomes</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                  {course.outcomes.map((outcome) => (
                    <li key={outcome}>- {outcome}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-300">
                  Authoring status
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">{authoredLessonCount}</p>
                <p className="mt-2 text-sm text-slate-400">Real in-platform lessons available</p>
              </div>
            </div>
          </div>
        </Panel>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Panel eyebrow="Authored course path" title="Learn inside the platform">
            {authoredLessonCount > 0 ? (
              <CourseOutline courseSlug={course.slug} modules={authoredModules} />
            ) : (
              <div className="space-y-4 rounded-3xl border border-amber-400/20 bg-amber-500/10 p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-300">
                  Roadmap only
                </p>
                <p className="text-sm leading-7 text-slate-300">
                  This course is still being authored. The old generated lesson shells have
                  been removed so the platform only links to real lessons you can actually
                  study from.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/curriculum/library"
                    className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-50 hover:border-indigo-300 hover:bg-indigo-500/25"
                  >
                    Study the lesson library
                  </Link>
                </div>
              </div>
            )}
          </Panel>

          <div className="space-y-6">
            {track ? (
              <Panel eyebrow="Source support" title={track.title}>
                <p className="text-sm leading-6 text-slate-300">{track.description}</p>
                <div className="mt-4 space-y-4">
                  {track.stages.map((stage) => (
                    <div
                      key={stage.id}
                      className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                    >
                      <p className="text-sm font-semibold text-slate-100">{stage.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {stage.objective}
                      </p>
                      <p className="mt-3 text-xs leading-5 text-slate-500">
                        {stage.feedbackLoop}
                      </p>
                    </div>
                  ))}
                </div>
              </Panel>
            ) : null}

            <Panel eyebrow="Open resources" title="Supplemental references">
              <div className="space-y-3">
                {courseResources.map((resource) => (
                  <a
                    key={resource.id}
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-white/10 bg-slate-900/60 p-4 hover:border-emerald-400/30"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-100">
                        {resource.title}
                      </p>
                      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-300">
                        {resource.accessModel}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{resource.provider}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{resource.notes}</p>
                  </a>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
