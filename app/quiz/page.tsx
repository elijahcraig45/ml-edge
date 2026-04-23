import { QuizComponentClient } from "@/components/quiz/quiz-component-client";
import { Panel } from "@/components/ui/panel";
import { getDailyQuiz } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function QuizPage() {
  const dailyQuiz = await getDailyQuiz();

  return (
    <div className="console-grid min-h-full overflow-y-auto p-6 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Panel eyebrow="Daily quiz" title={dailyQuiz.title}>
          <p className="text-sm leading-7 text-slate-300">
            {dailyQuiz.summary} Work through the easy, medium, and hard prompts, then
            finalize to update your streak in Firestore when you&apos;re signed in.
          </p>
        </Panel>
        <QuizComponentClient content={dailyQuiz} />
      </div>
    </div>
  );
}
