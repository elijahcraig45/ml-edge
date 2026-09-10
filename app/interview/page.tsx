import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InterviewMode } from "@/components/problems/interview-mode";
import { getCurriculum, getProblemBank } from "@/lib/curriculum/load";

export const dynamicParams = false;

export const metadata: Metadata = {
  title: "Interview mode",
  description:
    "Timed problem sets that score your stated complexity separately from your code.",
};

export default async function InterviewPage() {
  const [bank, curriculum] = await Promise.all([getProblemBank(), getCurriculum()]);
  if (!curriculum.ok || bank.problems.length === 0) notFound();

  return (
    <div className="px-5 py-8 lg:px-8">
      <header className="max-w-2xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-indigo-300">
          Interview mode
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50">
          Under the clock
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-400">
          Solving the problem is half of an interview. The other half is saying
          what your solution costs, out loud, before you know whether it works.
          This mode makes you commit to that claim first.
        </p>
      </header>

      <InterviewMode bank={bank} datasets={curriculum.value.datasets} />
    </div>
  );
}
