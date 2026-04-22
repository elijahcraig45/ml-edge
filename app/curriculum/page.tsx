import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { getAuthoredAcademyCourses } from "@/lib/authored-academy";
import { hasAuthoredHostedLessonContent } from "@/lib/authored-hosted-lessons";
import { getCurriculumExperience, getCurriculumLibraryOverview } from "@/lib/content";
import type { CurriculumCourse } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatPublishedAt(value: string) {
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

function getAuthoredModules(course: CurriculumCourse) {
  return course.modules
    .map((module) => ({
      ...module,
      lessons: module.lessons.filter((lesson) => hasAuthoredHostedLessonContent(lesson.id)),
    }))
    .filter((module) => module.lessons.length > 0);
}

export default async function CurriculumPage() {
  const authoredAcademyCourses = getAuthoredAcademyCourses();
  const authoredOrder = authoredAcademyCourses.map((course) => course.shortTitle).join(" -> ");
  const [curriculum, libraryOverview] = await Promise.all([
    getCurriculumExperience(),
    getCurriculumLibraryOverview(),
  ]);
  const { courses, generatedAt, resources, tracks, strategy, version } = curriculum;
  const totalModules = courses.reduce((count, course) => count + course.modules.length, 0);
  const totalLessons = courses.reduce(
    (count, course) =>
      count +
      course.modules.reduce((moduleCount, module) => moduleCount + module.lessons.length, 0),
    0,
  );
  const authoredLessonCount = courses.reduce(
    (count, course) =>
      count +
      getAuthoredModules(course).reduce(
        (moduleCount, module) => moduleCount + module.lessons.length,
        0,
      ),
    0,
  );
  const summaryStats = [
    { label: "Courses", value: String(courses.length) },
    { label: "Modules", value: String(totalModules) },
    { label: "Roadmap entries", value: String(totalLessons) },
    { label: "Real lessons", value: String(authoredLessonCount) },
    { label: "Sources", value: String(resources.length) },
    { label: "Published", value: formatPublishedAt(generatedAt), emphasis: "text-base" },
  ];

  return (
    <div className="console-grid min-h-full overflow-y-auto p-6 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Panel
          eyebrow="Curriculum graph"
          title="ML engineer path from fundamentals to April 2026 practice"
        >
          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <p className="text-sm leading-7 text-slate-300">
              This path is intentionally opinionated: strong ML engineers need math,
              statistical discipline, classical baselines, deep learning intuition,
              production systems judgment, retrieval and LLM evaluation rigor, and a
              skeptical view of hype. The curriculum catalog remains the roadmap, but the
              in-platform experience now links only to lessons that are actually authored.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {summaryStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">
                    {item.label}
                  </p>
                  <p
                    className={`mt-3 font-semibold text-white ${item.emphasis ?? "text-3xl"}`}
                  >
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">{strategy}</p>
          <p className="mt-2 break-all font-mono text-[11px] leading-5 text-slate-600">
            Artifact version: {version}
          </p>
        </Panel>

        <Panel eyebrow="Start here" title="Fully authored academy">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-sm leading-7 text-slate-300">
                If you want the part of the platform that is fully written like a real course,
                start in the authored academy. The order is deliberate: complete the authored
                sequence first, then use the larger source-backed library tracks as depth and
                reinforcement.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/curriculum/authored"
                  className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-50 hover:border-indigo-300 hover:bg-indigo-500/25"
                >
                  Open authored academy
                </Link>
                <Link
                  href={`/curriculum/authored/${authoredAcademyCourses[0]?.slug ?? ""}`}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800/80"
                >
                  Start at course 1
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">
                  Authored courses
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">
                  {authoredAcademyCourses.length}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">
                  Badge exams
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">
                  {authoredAcademyCourses.length}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">
                  Authored lessons
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">
                  {authoredAcademyCourses.reduce(
                    (count, course) => count + course.lessons.length,
                    0,
                  )}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">
                  Recommended order
                </p>
                <p className="mt-3 text-base font-semibold text-white">
                  {authoredOrder}
                </p>
              </div>
            </div>
          </div>
        </Panel>

        <Panel eyebrow="Lesson library" title="Imported ML lessons you can study directly">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-sm leading-7 text-slate-300">
                Alongside the authored curriculum, the platform has a Firestore-backed
                lesson library generated from open technical sources. These are full study
                objects with briefings, equations, labs, practice sets, quizzes, and
                reinforcement scripts.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/curriculum/library"
                  className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-50 hover:border-indigo-300 hover:bg-indigo-500/25"
                >
                  Open lesson library
                </Link>
                {libraryOverview.featuredLessons[0] ? (
                  <Link
                    href={`/curriculum/library/${libraryOverview.featuredLessons[0].id}`}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800/80"
                  >
                    Preview latest import
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Library lessons", value: String(libraryOverview.lessonCount) },
                { label: "Repositories", value: String(libraryOverview.repositoryCount) },
                {
                  label: "Science track",
                  value: String(libraryOverview.trackCounts["Science Track"]),
                },
                {
                  label: "Functional track",
                  value: String(libraryOverview.trackCounts["Functional Track"]),
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
        </Panel>

        <div className="space-y-6">
          {courses.map((course) => {
            const authoredModules = getAuthoredModules(course);
            const authoredLessons = authoredModules.flatMap((module) => module.lessons);
            const authoredCount = authoredLessons.length;
            const roadmapCount = course.modules.reduce(
              (count, module) => count + module.lessons.length,
              0,
            );
            const firstLessonId = authoredLessons[0]?.id;
            const track = tracks.find((item) => item.courseId === course.id);

            return (
              <Panel
                key={course.id}
                eyebrow={`${course.level} track`}
                title={course.title}
              >
                <div className="space-y-6">
                  <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                    <div>
                      <p className="text-sm leading-7 text-slate-300">{course.summary}</p>
                      <p className="mt-4 text-sm leading-7 text-slate-400">
                        <span className="font-semibold text-slate-100">Why it matters:</span>{" "}
                        {course.whyItMatters}
                      </p>
                      <div className="mt-5 flex flex-wrap gap-3">
                        <Link
                          href={`/curriculum/${course.slug}`}
                          className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-50 hover:border-indigo-300 hover:bg-indigo-500/25"
                        >
                          Open course
                        </Link>
                        {firstLessonId ? (
                          <Link
                            href={`/curriculum/${course.slug}/lessons/${firstLessonId}`}
                            className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800/80"
                          >
                            Start real lesson
                          </Link>
                        ) : (
                          <Link
                            href="/curriculum/library"
                            className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800/80"
                          >
                            Use lesson library
                          </Link>
                        )}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-indigo-300">
                          Duration
                        </span>
                        <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-slate-300">
                          {course.timeframe}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-300">
                            Real lessons
                          </p>
                          <p className="mt-3 text-3xl font-semibold text-white">{authoredCount}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
                            Roadmap entries
                          </p>
                          <p className="mt-3 text-3xl font-semibold text-white">{roadmapCount}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {course.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-100"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {track ? (
                    <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/8 p-5">
                      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-emerald-300">
                        Open-resource track
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-emerald-50">
                        {track.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-emerald-100/80">
                        {track.description}
                      </p>
                    </div>
                  ) : null}

                  {authoredModules.length > 0 ? (
                    <div className="space-y-4">
                      {authoredModules.map((module) => (
                        <div
                          key={module.id}
                          className="rounded-3xl border border-white/10 bg-slate-900/55 p-5"
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex items-center gap-3">
                                <h2 className="text-xl font-semibold text-slate-50">
                                  {module.title}
                                </h2>
                                <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-slate-400">
                                  {module.level}
                                </span>
                              </div>
                              <p className="mt-2 text-sm leading-6 text-slate-300">
                                {module.focus}
                              </p>
                            </div>
                            <span className="font-mono text-xs uppercase tracking-[0.24em] text-emerald-300">
                              {module.lessons.length} real lessons
                            </span>
                          </div>

                          <div className="mt-5 grid gap-4">
                            {module.lessons.map((lesson) => (
                              <div
                                key={lesson.id}
                                className="rounded-3xl border border-emerald-400/20 bg-slate-950/50 p-5"
                              >
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                  <div>
                                    <h3 className="text-lg font-semibold text-white">
                                      {lesson.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-300">
                                      {lesson.summary}
                                    </p>
                                  </div>
                                  <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-slate-400">
                                    {lesson.duration}
                                  </span>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-3">
                                  <Link
                                    href={`/curriculum/${course.slug}/lessons/${lesson.id}`}
                                    className="inline-flex rounded-full border border-indigo-400/40 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-100 hover:border-indigo-300 hover:bg-indigo-500/20"
                                  >
                                    Open real lesson
                                  </Link>
                                </div>
                                <ul className="mt-5 space-y-2 text-sm leading-6 text-slate-400">
                                  {lesson.sections.slice(0, 3).map((section) => (
                                    <li key={section}>- {section}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-amber-400/20 bg-amber-500/10 p-5">
                      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-amber-300">
                        Authoring in progress
                      </p>
                      <p className="mt-3 text-sm leading-7 text-slate-300">
                        This course remains on the roadmap, but the old generated lesson shells
                        have been hidden so the curriculum only advertises material that is
                        actually teachable today.
                      </p>
                    </div>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      </div>
    </div>
  );
}
