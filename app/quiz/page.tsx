import { QuizComponent } from "@/components/quiz/quiz-component";
import { Panel } from "@/components/ui/panel";
import { getDailyContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function QuizPage() {
  const dailyContent = await getDailyContent();

  return (
    <div className="console-grid min-h-full overflow-y-auto p-6 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Panel eyebrow="Daily quiz" title={dailyContent.headline}>
          <p className="text-sm leading-7 text-slate-300">
            Work through all three prompts, then finalize to update your streak in
            Firestore when you&apos;re signed in.
          </p>
        </Panel>
        <QuizComponent content={dailyContent} />
      </div>
    </div>
  );
}
