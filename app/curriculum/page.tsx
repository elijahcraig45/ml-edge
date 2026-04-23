import Link from "next/link";
import {
  getAuthoredAcademyCourses,
  type AuthoredAcademyCourse,
} from "@/lib/authored-academy";
import { hasAuthoredHostedLessonContent } from "@/lib/authored-hosted-lessons";
import { getCurriculumExperience, getCurriculumLibraryOverview } from "@/lib/content";
import type { CurriculumCourse } from "@/lib/types";
import { Panel } from "@/components/ui/panel";

export const dynamic = "force-dynamic";

const FEATURED_ELECTIVE_SLUGS = ["data-structures-and-algorithms"];

function formatPublishedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
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

function getRoadmapLessonCount(course: CurriculumCourse) {
  return course.modules.reduce((count, module) => count + module.lessons.length, 0);
}

function sortElectiveCourses(left: AuthoredAcademyCourse, right: AuthoredAcademyCourse) {
  const featuredLeftIndex = FEATURED_ELECTIVE_SLUGS.indexOf(left.slug);
  const featuredRightIndex = FEATURED_ELECTIVE_SLUGS.indexOf(right.slug);

  if (featuredLeftIndex !== -1 || featuredRightIndex !== -1) {
    if (featuredLeftIndex === -1) {
      return 1;
    }

    if (featuredRightIndex === -1) {
      return -1;
    }

    return featuredLeftIndex - featuredRightIndex;
  }

  return left.order - right.order;
}

export default async function CurriculumPage() {
  const authoredAcademyCourses = getAuthoredAcademyCourses();
  const coreAuthoredCourses = authoredAcademyCourses.filter((course) => !course.canTakeAnytime);
  const electiveAuthoredCourses = authoredAcademyCourses
    .filter((course) => course.canTakeAnytime)
    .sort(sortElectiveCourses);
  const dsaCourse = authoredAcademyCourses.find(
    (course) => course.slug === "data-structures-and-algorithms",
  );
  const secondaryElectives = electiveAuthoredCourses.filter(
    (course) => course.slug !== "data-structures-and-algorithms",
  );

  const [curriculum, libraryOverview] = await Promise.all([
    getCurriculumExperience(),
    getCurriculumLibraryOverview(),
  ]);

  const { courses, generatedAt, tracks, strategy } = curriculum;
  const totalRoadmapLessons = courses.reduce(
    (count, course) => count + getRoadmapLessonCount(course),
    0,
  );
  const totalAuthoredLessons = authoredAcademyCourses.reduce(
    (count, course) => count + course.lessons.length,
    0,
  );
  const summaryStats = [
    { label: "Authored courses", value: String(authoredAcademyCourses.length) },
    { label: "Authored lessons", value: String(totalAuthoredLessons) },
    { label: "Roadmap courses", value: String(courses.length) },
    { label: "Roadmap entries", value: String(totalRoadmapLessons) },
    { label: "Library lessons", value: String(libraryOverview.lessonCount) },
    { label: "Last updated", value: formatPublishedAt(generatedAt), emphasis: "text-base" },
  ];

  return (
    <div className="console-grid min-h-full overflow-y-auto p-6 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <h1 className="sr-only">ML engineer curriculum</h1>
        <Panel
          eyebrow="Recommended flow"
          title="Start with foundations, then branch with intent"
        >
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-sm leading-7 text-slate-300">
                This page now reads as a progression instead of a dump. The clearest path is
                to complete the authored foundations sequence first, then layer on the depth
                tracks that matter for your goals: DS&amp;A for core CS rigor, classical and
                deep learning for modeling breadth, systems for production judgment, and the
                library for repetition and alternate explanations.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-400">
                If you want to cover what an ML engineer must keep learning as they move
                forward, follow the core sequence in order, then treat the roadmap below as
                the capability map you should eventually fill in.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/curriculum/authored/${coreAuthoredCourses[0]?.slug ?? ""}`}
                  className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-50 hover:border-indigo-300 hover:bg-indigo-500/25"
                >
                  Start the authored path
                </Link>
                {dsaCourse ? (
                  <Link
                    href={`/curriculum/authored/${dsaCourse.slug}`}
                    className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 hover:border-emerald-300 hover:bg-emerald-500/20"
                  >
                    Jump to DS&amp;A
                  </Link>
                ) : null}
                <Link
                  href="/curriculum/library"
                  className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800/80"
                >
                  Open lesson library
                </Link>
              </div>
            </div>

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
        </Panel>

        <Panel eyebrow="Phase 1" title="Do these core authored courses in order">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {coreAuthoredCourses.map((course) => {
              const firstLessonId = course.lessons[0]?.id;

              return (
                <div
                  key={course.slug}
                  className="rounded-3xl border border-white/10 bg-slate-900/55 p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-indigo-300">
                      Step {course.order}
                    </span>
                    <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-slate-300">
                      {course.availability}
                    </span>
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold text-white">{course.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{course.startGuidance}</p>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                    <span className="rounded-full border border-white/10 px-3 py-1">
                      {course.lessons.length} lessons
                    </span>
                    <span className="rounded-full border border-white/10 px-3 py-1">
                      {course.badge.emblem}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/curriculum/authored/${course.slug}`}
                      className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-50 hover:border-indigo-300 hover:bg-indigo-500/25"
                    >
                      Open course
                    </Link>
                    {firstLessonId ? (
                      <Link
                        href={`/curriculum/authored/${course.slug}/lessons/${firstLessonId}`}
                        className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800/80"
                      >
                        Start first lesson
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel eyebrow="Phase 2" title="Add parallel tracks after foundations">
          <p className="text-sm leading-7 text-slate-300">
            These are the authored depth courses to add once the first sequence makes sense.
            DS&amp;A is surfaced here on purpose: it is a real authored course now, and it is
            one of the best parallel tracks for strengthening debugging, invariants, and
            implementation discipline.
          </p>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            {dsaCourse ? (
              <div className="rounded-3xl border border-emerald-400/25 bg-emerald-500/10 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-200">
                    Featured parallel track
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-slate-200">
                    {dsaCourse.lessons.length} lessons
                  </span>
                </div>

                <h2 className="mt-4 text-2xl font-semibold text-white">{dsaCourse.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-300">{dsaCourse.summary}</p>
                <p className="mt-3 text-sm leading-7 text-slate-400">{dsaCourse.startGuidance}</p>

                <div className="mt-5">
                  <p className="text-sm font-semibold text-slate-100">Why take it now</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                    {dsaCourse.outcomes.slice(0, 3).map((outcome) => (
                      <li key={outcome}>- {outcome}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/curriculum/authored/${dsaCourse.slug}`}
                    className="rounded-full border border-emerald-300/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-50 hover:border-emerald-200 hover:bg-emerald-500/25"
                  >
                    Open DS&amp;A
                  </Link>
                  {dsaCourse.lessons[0]?.id ? (
                    <Link
                      href={`/curriculum/authored/${dsaCourse.slug}/lessons/${dsaCourse.lessons[0].id}`}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800/80"
                    >
                      Start first lesson
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              {secondaryElectives.map((course) => {
                const firstLessonId = course.lessons[0]?.id;

                return (
                  <div
                    key={course.slug}
                    className="rounded-3xl border border-white/10 bg-slate-900/55 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-indigo-300">
                        {course.shortTitle}
                      </span>
                      <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-slate-300">
                        {course.lessons.length} lessons
                      </span>
                    </div>

                    <h3 className="mt-3 text-lg font-semibold text-white">{course.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{course.outcomes[0]}</p>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href={`/curriculum/authored/${course.slug}`}
                        className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-50 hover:border-indigo-300 hover:bg-indigo-500/25"
                      >
                        Open course
                      </Link>
                      {firstLessonId ? (
                        <Link
                          href={`/curriculum/authored/${course.slug}/lessons/${firstLessonId}`}
                          className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800/80"
                        >
                          Start
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>

        <Panel
          eyebrow="Capability map"
          title="Everything you should eventually cover as you move forward"
        >
          <p className="text-sm leading-7 text-slate-300">
            Treat this as the broader ML engineer map. Each course below marks an area you
            should understand, even when the fully authored version is still being expanded.
            Open the course when you want the full roadmap, then use authored lessons and the
            library wherever live coverage already exists.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => {
              const authoredModules = getAuthoredModules(course);
              const authoredLessons = authoredModules.flatMap((module) => module.lessons);
              const authoredCount = authoredLessons.length;
              const roadmapCount = getRoadmapLessonCount(course);
              const firstLessonId = authoredLessons[0]?.id;
              const track = tracks.find((item) => item.courseId === course.id);

              return (
                <div
                  key={course.id}
                  className="rounded-3xl border border-white/10 bg-slate-900/55 p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-indigo-300">
                      {course.level} track
                    </span>
                    <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-slate-300">
                      {course.timeframe}
                    </span>
                  </div>

                  <h2 className="mt-4 text-2xl font-semibold text-white">{course.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{course.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                    <span className="rounded-full border border-white/10 px-3 py-1">
                      {authoredCount} live lessons
                    </span>
                    <span className="rounded-full border border-white/10 px-3 py-1">
                      {roadmapCount} roadmap entries
                    </span>
                    {course.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-indigo-100"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {track ? (
                    <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/8 p-4">
                      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                        Open-resource reinforcement
                      </p>
                      <p className="mt-2 text-sm font-semibold text-emerald-50">
                        {track.title}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/curriculum/${course.slug}`}
                      className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-50 hover:border-indigo-300 hover:bg-indigo-500/25"
                    >
                      Open course roadmap
                    </Link>
                    {firstLessonId ? (
                      <Link
                        href={`/curriculum/${course.slug}/lessons/${firstLessonId}`}
                        className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800/80"
                      >
                        Start live lesson
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
              );
            })}
          </div>
        </Panel>

        <Panel
          eyebrow="Practice depth"
          title="Use the lesson library for repetition, labs, and alternate explanations"
        >
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-sm leading-7 text-slate-300">
                Alongside the authored path, the platform has a Firestore-backed lesson
                library generated from open technical sources. These lessons are useful when
                you want another explanation, more exercises, or extra depth around a concept
                you are already studying in the main flow.
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
      </div>
    </div>
  );
}
