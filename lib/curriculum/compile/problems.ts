import { promises as fs } from "node:fs";
import path from "node:path";
import type { CompiledExercise } from "../artifact";
import { CONTENT_ROOT } from "../paths";
import { compileExercise } from "./exercise";

export type ProblemCompileResult = {
  problems: CompiledExercise[];
  /** One entry per problem that failed to compile. */
  errors: Array<{ id: string; message: string }>;
};

/**
 * Standalone problems live in `content/problems/<id>/` and use exactly the same
 * directory format as a lesson's exercises — same schema, same grading, same
 * `curriculum:check` guarantees. Only their placement differs.
 *
 * Failures are COLLECTED rather than thrown. One malformed problem must not be
 * able to take down every lesson on the site: `curriculum:check` turns these
 * errors into a build failure, while the running site skips the bad problem and
 * serves everything else.
 */
export async function compileProblems(): Promise<ProblemCompileResult> {
  const dir = path.join(CONTENT_ROOT, "problems");
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const problems: CompiledExercise[] = [];
  const errors: ProblemCompileResult["errors"] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const problem = await compileExercise(path.join(dir, entry.name));
      if (problem.id !== entry.name) {
        throw new Error(
          `Problem id "${problem.id}" must match its directory name "${entry.name}"`,
        );
      }
      problems.push(problem);
    } catch (error) {
      errors.push({
        id: entry.name,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { problems, errors };
}
