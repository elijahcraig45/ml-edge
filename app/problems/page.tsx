import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProblemFilters } from "@/components/problems/problem-filters";
import { getProblemBank } from "@/lib/curriculum/load";

export const dynamicParams = false;

export const metadata: Metadata = {
  title: "Problems",
  description:
    "Auto-graded Python and SQL problems, filterable by pattern and difficulty, run entirely in your browser.",
};

export default async function ProblemsPage() {
  const bank = await getProblemBank();
  if (bank.problems.length === 0) notFound();

  return (
    <div className="px-5 py-8 lg:px-8">
      <header className="max-w-2xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-indigo-300">
          Problem bank
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50">
          Practice
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-400">
          Every problem runs and grades in your browser — Python against hidden
          tests, SQL against a real database. Filter by the pattern you are
          drilling. Problems tagged with a stage assume that stage&apos;s material,
          so if one feels unfair, the lesson is linked at the top of it.
        </p>
      </header>

      <ProblemFilters bank={bank} />
    </div>
  );
}
