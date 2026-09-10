import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProblemWorkspace } from "@/components/problems/problem-workspace";
import { getCurriculum, getProblem, getProblemBank } from "@/lib/curriculum/load";

export const dynamicParams = false;

export async function generateStaticParams() {
  const bank = await getProblemBank();
  return bank.problems.map((p) => ({ problemId: p.exercise.id }));
}

type Params = Promise<{ problemId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { problemId } = await params;
  const result = await getProblem(problemId);
  if (!result.ok) return { title: "Problem not found" };
  return { title: result.value.exercise.title };
}

export default async function ProblemPage({ params }: { params: Params }) {
  const { problemId } = await params;
  const [result, curriculum] = await Promise.all([getProblem(problemId), getCurriculum()]);
  if (!result.ok || !curriculum.ok) notFound();

  return (
    <div className="px-5 py-8 lg:px-8">
      <Link
        href="/problems"
        className="font-mono text-[11px] text-slate-500 hover:text-slate-300"
      >
        ← All problems
      </Link>
      <div className="mt-6">
        <ProblemWorkspace entry={result.value} datasets={curriculum.value.datasets} />
      </div>
    </div>
  );
}
