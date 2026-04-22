import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel } from "@/components/ui/panel";
import { getCurriculumLibraryLesson } from "@/lib/content";

export const dynamic = "force-dynamic";

type LibraryLessonPageProps = {
  params: Promise<{
    lessonId: string;
  }>;
};

export default async function CurriculumLibraryLessonPage({
  params,
}: LibraryLessonPageProps) {
  const { lessonId } = await params;
  const lesson = await getCurriculumLibraryLesson(lessonId);

  if (!lesson) {
    notFound();
  }

  return (
    <div className="console-grid min-h-full overflow-y-auto p-6 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Panel eyebrow={lesson.curriculumTrack ?? "Library lesson"} title={lesson.title}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-slate-400">
              {lesson.duration}
            </span>
            {lesson.repositoryName ? (
              <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-slate-400">
                {lesson.repositoryOwner}/{lesson.repositoryName}
              </span>
            ) : null}
            {lesson.sourceTitle ? (
              <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-slate-400">
                {lesson.sourceTitle}
              </span>
            ) : null}
          </div>
          <p className="mt-5 text-base leading-8 text-slate-300">{lesson.summary}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/curriculum/library"
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800/80"
            >
              Back to library
            </Link>
            {lesson.sourceUrl ? (
              <a
                href={lesson.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800/80"
              >
                Open original source
              </a>
            ) : null}
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                lesson.youtubeSearchQuery,
              )}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-50 hover:border-indigo-300 hover:bg-indigo-500/25"
            >
              Search reinforcement video
            </a>
          </div>
        </Panel>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <Panel eyebrow="The briefing" title="What matters and why">
              <div className="space-y-4">
                {lesson.briefing.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-slate-300">
                    {paragraph}
                  </p>
                ))}
              </div>
            </Panel>

            <Panel eyebrow="Core theory" title="Equations you should actually understand">
              <div className="space-y-4">
                {lesson.coreTheory.equations.map((equation) => (
                  <div
                    key={`${equation.latex}-${equation.explanation}`}
                    className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                  >
                    <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm text-emerald-200">
                      {equation.latex}
                    </pre>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {equation.explanation}
                    </p>
                  </div>
                ))}
                <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-4">
                  <p className="text-sm font-semibold text-indigo-100">
                    Why this matters for your Masters
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    {lesson.coreTheory.whyThisMattersForYourMasters}
                  </p>
                </div>
              </div>
            </Panel>

            <Panel eyebrow="Software engineer's lab" title={lesson.softwareEngineersLab.title}>
              <div className="space-y-4">
                <p className="text-sm leading-7 text-slate-300">
                  {lesson.softwareEngineersLab.brief}
                </p>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Deliverables
                    </p>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-300">
                      {lesson.softwareEngineersLab.deliverables.map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Starter prompts
                    </p>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-300">
                      {lesson.softwareEngineersLab.starterPrompts.map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel eyebrow="Practice set" title={`${lesson.practiceProblems.length} problems to work through`}>
              <div className="space-y-4">
                {lesson.practiceProblems.map((problem, index) => (
                  <div
                    key={problem.id}
                    className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                  >
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-indigo-300">
                      Problem {index + 1}
                    </p>
                    <h3 className="mt-2 text-sm font-semibold text-slate-100">
                      {problem.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{problem.brief}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel eyebrow="Quiz" title="Check your understanding">
              <div className="space-y-4">
                {lesson.quiz.questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                  >
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-indigo-300">
                      Question {index + 1}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-100">
                      {question.prompt}
                    </p>
                    <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
                      {question.options.map((option, optionIndex) => (
                        <li
                          key={`${question.id}-${option}`}
                          className={`rounded-xl border px-3 py-3 ${
                            optionIndex === question.answerIndex
                              ? "border-emerald-400/30 bg-emerald-500/10"
                              : "border-white/10 bg-slate-950/60"
                          }`}
                        >
                          <p className="font-medium text-slate-100">{option}</p>
                          <p className="mt-2 text-xs leading-5 text-slate-400">
                            {question.optionRationales[optionIndex]}
                          </p>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      {question.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel eyebrow="Video script" title="2-minute reinforcement plan">
              <div className="space-y-4">
                {[
                  { label: "Intro", lines: lesson.videoScript.intro },
                  { label: "Core concept", lines: lesson.videoScript.coreConcept },
                  { label: "Outro", lines: lesson.videoScript.outro },
                ].map(({ label, lines }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                  >
                    <p className="text-sm font-semibold text-slate-100">{label}</p>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                      {lines.map((line) => (
                        <li key={line}>- {line}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel eyebrow="Daily edge" title="One thing to remember">
              <p className="text-sm leading-7 text-slate-300">{lesson.dailyEdge}</p>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
