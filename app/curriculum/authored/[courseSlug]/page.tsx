import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseBadgeAssessment } from "@/components/curriculum/course-badge-assessment";
import { CourseOutline } from "@/components/curriculum/course-outline";
import { Panel } from "@/components/ui/panel";
import { getAuthoredAcademyCourse } from "@/lib/authored-academy";

export const dynamic = "force-dynamic";

type AuthoredCoursePageProps = {
  params: Promise<{
    courseSlug: string;
  }>;
};

export default async function AuthoredCoursePage({ params }: AuthoredCoursePageProps) {
  const { courseSlug } = await params;
  const course = getAuthoredAcademyCourse(courseSlug);

  if (!course) {
    notFound();
  }

  return (
    <div className="console-grid min-h-full overflow-y-auto p-6 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Panel eyebrow={course.availability} title={course.title}>
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-sm leading-7 text-slate-300">{course.summary}</p>
              <p className="mt-4 text-sm leading-7 text-slate-400">{course.startGuidance}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/curriculum/authored"
                  className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800/80"
                >
                  Back to authored academy
                </Link>
                <Link
                  href={`/curriculum/authored/${course.slug}/lessons/${course.lessons[0]?.id}`}
                  className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-50 hover:border-indigo-300 hover:bg-indigo-500/25"
                >
                  Start course
                </Link>
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    Course order
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-white">{course.order}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-300">
                    Badge
                  </p>
                  <p className="mt-3 text-sm font-semibold text-white">{course.badge.title}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-semibold text-slate-100">Outcomes</p>
                <ul className="mt-3 list-none space-y-2 text-sm leading-6 text-slate-300">
                  {course.outcomes.map((outcome) => (
                    <li key={outcome} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                      {outcome}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Panel>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Panel eyebrow="Course path" title="Complete the authored lessons in order">
            <CourseOutline
              courseSlug={course.slug}
              lessonPathPrefix={`/curriculum/authored/${course.slug}/lessons`}
              modules={[
                {
                  id: `${course.slug}-module`,
                  title: `${course.shortTitle} core sequence`,
                  level: course.availability,
                  focus: course.audience,
                  lessons: course.lessons.map((lesson) => ({
                    id: lesson.id,
                    title: lesson.title,
                    summary: lesson.summary,
                    duration: lesson.duration,
                  })),
                },
              ]}
            />
          </Panel>

          <Panel eyebrow="How to use this course" title="Getting the most out of it">
            <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/60 p-5">
              <p className="text-sm leading-7 text-slate-300">
                {course.canTakeAnytime
                  ? "This course is standalone — you can start it at any point without needing to complete other courses first."
                  : "Work through every lesson in order. Each one builds on the previous, so skipping ahead will leave gaps in the reasoning you need for later courses."}
              </p>
              <p className="text-sm leading-7 text-slate-400">
                {course.startGuidance}
              </p>
              <div>
                <p className="text-sm font-semibold text-slate-100">Badge exam</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Complete every lesson, then pass the final assessment to earn the{" "}
                  <span className="text-emerald-300">{course.badge.title}</span> badge.
                </p>
              </div>
            </div>
          </Panel>
        </div>

        <Panel eyebrow="Badge milestone" title="Earn the course badge">
          <CourseBadgeAssessment course={course} />
        </Panel>
      </div>
    </div>
  );
}
