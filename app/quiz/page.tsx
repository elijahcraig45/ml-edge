import { QuizComponentClient } from "@/components/quiz/quiz-component-client";
import { MiniLessonGate } from "@/components/quiz/mini-lesson-gate";
import { Panel } from "@/components/ui/panel";
import { getDailyQuiz, getDailyMiniLesson } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function QuizPage() {
  const [dailyQuiz, miniLesson] = await Promise.all([
    getDailyQuiz(),
    getDailyMiniLesson(),
  ]);

  return (
    <div className="console-grid min-h-full overflow-y-auto p-6 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="sr-only">Daily foundations quiz</h1>
        <Panel eyebrow="Daily quiz" title={dailyQuiz.title}>
          <p className="text-sm leading-7 text-slate-300">
            {dailyQuiz.summary} Work through the easy, medium, and hard prompts, then
            finalize to update your streak in Firestore when you&apos;re signed in.
          </p>
        </Panel>
        {miniLesson ? (
          <MiniLessonGate lesson={miniLesson}>
            <QuizComponentClient content={dailyQuiz} />
          </MiniLessonGate>
        ) : (
          <>
            <div className="rounded-2xl border border-slate-700/40 bg-slate-800/30 px-5 py-3.5">
              <p className="text-xs text-slate-500">
                🕓 Today&apos;s mini-lesson generates at 4&nbsp;AM&nbsp;ET — check back
                then for the pre-quiz reading and podcast episode.
              </p>
            </div>
            <QuizComponentClient content={dailyQuiz} />
          </>
        )}
      </div>
    </div>
  );
}
