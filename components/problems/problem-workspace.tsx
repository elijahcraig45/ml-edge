"use client";

import Link from "next/link";
import { emptyExerciseProgress } from "@/lib/progress/curriculum-progress";
import { useProblemProgress } from "@/lib/progress/use-problem-progress";
import { PythonExercise } from "@/components/learn/python-exercise";
import { SqlExercise } from "@/components/learn/sql-exercise";
import type { CompiledDataset, ProblemEntry } from "@/lib/curriculum/artifact";

/**
 * A single problem, outside any lesson.
 *
 * Reuses the same exercise components the curriculum uses, so a problem grades
 * identically whether it is met inside a lesson or in the bank.
 */
export function ProblemWorkspace({
  entry,
  datasets,
}: {
  entry: ProblemEntry;
  datasets: Record<string, CompiledDataset>;
}) {
  const { progress, update } = useProblemProgress(entry.exercise.id);
  const exerciseProgress = progress ?? emptyExerciseProgress();

  return (
    <div className="space-y-4">
      {entry.lesson ? (
        <p className="text-xs text-slate-500">
          From{" "}
          <Link
            href={`/learn/${entry.lesson.tierId}/${entry.lesson.stageId}/${entry.lesson.slug}`}
            className="text-indigo-300 underline underline-offset-2 hover:text-indigo-200"
          >
            {entry.lesson.title}
          </Link>
          . The lesson explains the idea; this page is just the problem.
        </p>
      ) : null}

      {entry.exercise.kind === "python" ? (
        <PythonExercise
          exercise={entry.exercise}
          progress={exerciseProgress}
          onProgress={update}
        />
      ) : datasets[entry.exercise.datasetId] ? (
        <SqlExercise
          exercise={entry.exercise}
          dataset={datasets[entry.exercise.datasetId]}
          progress={exerciseProgress}
          onProgress={update}
        />
      ) : null}
    </div>
  );
}
