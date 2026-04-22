import { Panel } from "@/components/ui/panel";
import { PracticeDrill } from "@/components/practice/practice-drill";
import { getQuestionBank } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function PracticePage() {
  const questions = await getQuestionBank();

  return (
    <div className="console-grid min-h-full overflow-y-auto p-6 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Panel eyebrow="Practice space" title="Question Bank Drill">
          <p className="text-sm leading-7 text-slate-300">
            Work through accumulated daily quiz questions. Filter by level, check your
            answer, and review the explanation before moving on.
          </p>
        </Panel>
        <PracticeDrill questions={questions} />
      </div>
    </div>
  );
}
