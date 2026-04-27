import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { getAuthoredAcademyCourses } from "@/lib/authored-academy";

export const dynamic = "force-dynamic";

export default function AuthoredAcademyPage() {
  const courses = getAuthoredAcademyCourses();
  const orderedTitles = courses.map((course) => course.shortTitle).join(" -> ");

  return (
    <div className="console-grid min-h-full overflow-y-auto p-6 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Panel eyebrow="Start here" title="Authored academy">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-sm leading-7 text-slate-300">
                This is the fully authored learning path inside The ML Edge. It is smaller
                than the source-backed library on purpose: every lesson here is meant to read
                like a real lecture and tutorial, not a placeholder or outline.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-400">
                The authored path has a real core sequence: start with{" "}
                <span className="font-semibold text-slate-100">{courses[0]?.shortTitle}</span>,
                move through the main ML courses in order, then use the standalone elective
                courses for extra depth when you want targeted reinforcement.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/curriculum/authored/${courses[0]?.slug ?? ""}`}
                  className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-50 hover:border-indigo-300 hover:bg-indigo-500/25"
                >
                  Begin authored path
                </Link>
                <Link
                  href="/curriculum/library"
                  className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800/80"
                >
                  Browse source-backed library
                </Link>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">
                  Authored courses
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">{courses.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">
                  Authored lessons
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">
                  {courses.reduce((count, course) => count + course.lessons.length, 0)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">
                  Badge exams
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">{courses.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:col-span-2">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">
                  Core sequence
                </p>
                <p className="mt-3 text-sm font-semibold text-white">{orderedTitles}</p>
              </div>
            </div>
          </div>
        </Panel>

        <div className="space-y-6">
          {courses.map((course) => (
            <Panel key={course.slug} eyebrow={course.availability} title={course.title}>
              <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <div>
                  <p className="text-sm leading-7 text-slate-300">{course.summary}</p>
                  <p className="mt-4 text-sm leading-7 text-slate-400">{course.audience}</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={`/curriculum/authored/${course.slug}`}
                      className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-50 hover:border-indigo-300 hover:bg-indigo-500/25"
                    >
                      Open course
                    </Link>
                    <Link
                      href={`/curriculum/authored/${course.slug}/lessons/${course.lessons[0]?.id}`}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800/80"
                    >
                      Start first lesson
                    </Link>
                  </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-indigo-300">
                        Lessons
                      </p>
                      <p className="mt-3 text-3xl font-semibold text-white">
                        {course.lessons.length}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-300">
                        Badge
                      </p>
                      <p className="mt-3 text-sm font-semibold text-white">{course.badge.emblem}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-slate-100">What you will leave with</p>
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
          ))}
        </div>
      </div>
    </div>
  );
}
