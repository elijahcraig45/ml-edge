import { promises as fs } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { exerciseSchema } from "../schema";
import type { CompiledExercise } from "../artifact";
import { renderInlineAll, renderMarkdown } from "./markdown";

/**
 * Loads one exercise directory.
 *
 * Code lives in real `.py` / `.sql` files rather than in strings, which is what
 * lets `curriculum:check` execute a solution against its own tests in CI. An
 * exercise whose solution does not pass, or whose starter already passes, is a
 * build failure rather than a broken lesson discovered by a learner.
 */
export async function compileExercise(dir: string): Promise<CompiledExercise> {
  const metaPath = path.join(dir, "exercise.yaml");
  const raw = await fs.readFile(metaPath, "utf8");
  const parsed = YAML.parse(raw) as Record<string, unknown>;

  const kind = parsed.kind;
  const ext = kind === "sql" ? "sql" : "py";
  const [starter, solution] = await Promise.all([
    readCode(dir, `starter.${ext}`),
    readCode(dir, `solution.${ext}`),
  ]);

  const withCode: Record<string, unknown> = { ...parsed, starter, solution };

  // Python tests live in tests.py as a list of named cases in tests.yaml.
  if (kind !== "sql" && !parsed.tests) {
    const testsPath = path.join(dir, "tests.yaml");
    const testsRaw = await fs.readFile(testsPath, "utf8").catch(() => null);
    if (testsRaw) withCode.tests = YAML.parse(testsRaw);
  }

  const result = exerciseSchema.safeParse(withCode);
  if (!result.success) {
    throw new Error(
      `Invalid exercise at ${dir}:\n${formatIssues(result.error.issues)}`,
    );
  }
  const exercise = result.data;

  const [promptHtml, solutionWalkthroughHtml, hintsHtml] = await Promise.all([
    renderMarkdown(exercise.prompt),
    renderMarkdown(exercise.solutionWalkthrough),
    renderInlineAll(exercise.hints),
  ]);

  const base = {
    id: exercise.id,
    title: exercise.title,
    difficulty: exercise.difficulty,
    tracks: exercise.tracks,
    pattern: exercise.pattern,
    stage: exercise.stage,
    topics: exercise.topics,
    promptHtml,
    hintsHtml,
    solutionWalkthroughHtml,
    timeLimitMs: exercise.timeLimitMs,
  };

  if (exercise.kind === "python") {
    return {
      ...base,
      kind: "python",
      packages: exercise.packages,
      starter: exercise.starter,
      solution: exercise.solution,
      tests: exercise.tests,
      forbid: exercise.forbid,
      complexityBudget: exercise.complexityBudget,
    };
  }

  return {
    ...base,
    kind: "sql",
    datasetId: exercise.datasetId,
    starter: exercise.starter,
    solution: exercise.solution,
    grading: exercise.grading,
  };
}

async function readCode(dir: string, file: string): Promise<string> {
  try {
    return await fs.readFile(path.join(dir, file), "utf8");
  } catch {
    throw new Error(`Exercise at ${dir} is missing ${file}`);
  }
}

export function formatIssues(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
): string {
  return issues
    .map((i) => `  - ${i.path.map(String).join(".") || "(root)"}: ${i.message}`)
    .join("\n");
}
