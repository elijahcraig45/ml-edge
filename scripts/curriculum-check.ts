/**
 * The content contract.
 *
 * Validates every authored file, then EXECUTES every exercise:
 *   - a solution that fails its own tests is a build failure
 *   - a starter that already passes is a build failure (the exercise is a no-op)
 *
 * This is what makes "broken content cannot merge" true rather than aspirational.
 * Python runs under real CPython here; wasm-specific behaviour is covered by
 * the Playwright suite instead.
 */
import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import {
  assertStageIntegrity,
  compileCurriculum,
  compileStageStandalone,
} from "../lib/curriculum/compile";
import { compileDatasets } from "../lib/curriculum/compile/dataset";
import { openNodeRunner } from "../lib/runtime/sql/node-runner";
import { gradeSql } from "../lib/runtime/sql/grade";
import { allPassed } from "../lib/runtime/protocol";
import type {
  CompiledCurriculum,
  CompiledExercise,
  CompiledLesson,
  CompiledPythonExercise,
  CompiledSqlExercise,
} from "../lib/curriculum/artifact";

type Failure = { where: string; message: string };

const failures: Failure[] = [];
const notes: string[] = [];

function fail(where: string, message: string) {
  failures.push({ where, message });
}

function stageFilter(): string | null {
  const index = process.argv.indexOf("--stage");
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

/** Wraps one stage in a minimal curriculum so the same checks apply to it. */
async function compileSingleStage(spec: string): Promise<CompiledCurriculum> {
  const dir = path.join(process.cwd(), "content", spec);
  const stage = await compileStageStandalone(dir);
  const datasets = await compileDatasets();
  assertStageIntegrity(stage, datasets);
  return {
    version: "stage-check",
    title: `Stage check: ${spec}`,
    builtAt: new Date().toISOString(),
    tiers: [
      {
        id: stage.tierId,
        order: 0,
        title: stage.tierId,
        audience: "",
        stages: [stage],
      },
    ],
    datasets,
    problems: [],
    contentErrors: [],
  };
}

async function main() {
  const started = Date.now();

  const hasContent = await fs
    .stat(path.join(process.cwd(), "content"))
    .then(() => true)
    .catch(() => false);
  if (!hasContent) {
    console.log("curriculum:check — no content/ directory yet, nothing to validate.");
    return;
  }

  // Compile with drafts included: a draft that does not compile is still broken,
  // it just is not shipped yet.
  process.env.NEXT_PUBLIC_CURRICULUM_PREVIEW = "1";

  // `--stage <tier>/<stage>` validates one stage on its own, so several stages
  // can be authored in parallel without each needing the others to compile.
  const only = stageFilter();
  const curriculum = only
    ? await compileSingleStage(only)
    : await compileCurriculum();

  for (const failure of curriculum.contentErrors) {
    fail(failure.id, failure.message);
  }

  // Exercise ids must be globally unique, not just unique within a lesson.
  // /problems/[id] is keyed on the id, and so is bank progress — a collision
  // makes one exercise unreachable and marks the other solved alongside it.
  const exerciseOwners = new Map<string, string[]>();
  const claimId = (id: string, owner: string) =>
    exerciseOwners.set(id, [...(exerciseOwners.get(id) ?? []), owner]);

  let lessonCount = 0;
  let exerciseCount = 0;
  const python = await resolvePython();

  for (const tier of curriculum.tiers) {
    for (const stage of tier.stages) {
      for (const lesson of stage.lessons) {
        lessonCount += 1;
        checkLessonShape(lesson.id, lesson);
        checkMathRenders(lesson.id, lesson);

        for (const exercise of Object.values(lesson.exercises)) {
          exerciseCount += 1;
          claimId(exercise.id, lesson.id);
          const where = `${lesson.id} › ${exercise.id}`;
          if (exercise.kind === "python") {
            if (!python) {
              notes.push(`skipped Python execution for ${where} (no python3 found)`);
              continue;
            }
            await checkPythonExercise(python, where, exercise);
          } else {
            checkSqlExerciseShape(where, exercise);
            await checkSqlExercise(curriculum, where, exercise);
          }
        }
      }
    }
  }

  // Standalone bank problems get exactly the same treatment as lesson exercises.
  for (const problem of curriculum.problems) {
    exerciseCount += 1;
    claimId(problem.id, "content/problems");
    const where = `content/problems/${problem.id}`;
    if (problem.kind === "python") {
      if (!python) {
        notes.push(`skipped Python execution for ${where} (no python3 found)`);
        continue;
      }
      await checkPythonExercise(python, where, problem);
    } else {
      checkSqlExerciseShape(where, problem);
      await checkSqlExercise(curriculum, where, problem);
    }
  }

  for (const [id, owners] of exerciseOwners) {
    if (owners.length > 1) {
      fail(
        `exercise id "${id}"`,
        `used by ${owners.join(" and ")}. Exercise ids are global: /problems/${id} ` +
          "can only resolve to one of them, and bank progress is keyed on the id, " +
          "so solving one would mark the other solved. Rename one.",
      );
    }
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `curriculum:check — ${lessonCount} lesson(s), ${exerciseCount} exercise(s), ` +
      `${Object.keys(curriculum.datasets).length} dataset(s) in ${elapsed}s`,
  );
  for (const note of notes) console.log(`  note: ${note}`);

  if (failures.length > 0) {
    console.error(`\n${failures.length} problem(s):\n`);
    for (const f of failures) console.error(`  ✗ ${f.where}\n    ${f.message}\n`);
    process.exit(1);
  }
  console.log("  all content checks passed");
}

/**
 * KaTeX failures are silent by default — rehype-katex renders a red error span
 * rather than throwing, so malformed math ships and only a reader notices.
 * A `$$` block whose delimiters are not on their own lines is the common cause.
 */
function checkMathRenders(where: string, lesson: CompiledLesson) {
  const html: string[] = [
    ...lesson.misconceptionsHtml,
    ...lesson.objectivesHtml,
    ...lesson.masteryChecklistHtml,
  ];
  for (const block of lesson.blocks) {
    if ("html" in block && typeof block.html === "string") html.push(block.html);
    if (block.kind === "quiz") {
      for (const q of block.questions) {
        html.push(q.promptHtml, q.explanationHtml, ...q.optionsHtml);
      }
    }
    if (block.kind === "checkpoint") html.push(block.promptHtml, ...block.rubricHtml);
    if (block.kind === "figure" && block.captionHtml) html.push(block.captionHtml);
  }
  for (const exercise of Object.values(lesson.exercises)) {
    html.push(exercise.promptHtml, exercise.solutionWalkthroughHtml, ...exercise.hintsHtml);
  }

  const broken = html.filter((h) => h.includes("katex-error"));
  if (broken.length > 0) {
    const sample = broken[0].match(/title="([^"]{0,160})"/)?.[1] ?? "(no detail)";
    fail(
      where,
      `${broken.length} block(s) contain malformed math that KaTeX could not parse. ` +
        `First error: ${sample}. Check that $$ delimiters sit on their own lines.`,
    );
  }
}

/** Structural expectations the per-file schemas cannot express. */
function checkLessonShape(
  where: string,
  lesson: { blocks: unknown[]; exercises: Record<string, unknown>; objectives: string[] },
) {
  if (lesson.blocks.length === 0) fail(where, "lesson has no content blocks");
  if (lesson.objectives.length === 0) fail(where, "lesson has no objectives");
}

function checkSqlExerciseShape(where: string, exercise: CompiledExercise) {
  if (exercise.kind !== "sql") return;
  if (exercise.starter.trim() === exercise.solution.trim()) {
    fail(where, "starter.sql is identical to solution.sql — the exercise is a no-op");
  }
}

/**
 * Runs the exercise through the real grader against the real dataset.
 * Asserts the solution scores full marks and the starter does not — the same
 * contract the Python exercises are held to.
 */
async function checkSqlExercise(
  curriculum: CompiledCurriculum,
  where: string,
  exercise: CompiledSqlExercise,
) {
  const dataset = curriculum.datasets[exercise.datasetId];
  if (!dataset) {
    fail(where, `unknown dataset "${exercise.datasetId}"`);
    return;
  }

  let runner: Awaited<ReturnType<typeof openNodeRunner>> | null = null;
  try {
    runner = await openNodeRunner(dataset);

    const solved = await gradeSql(
      runner,
      exercise.solution,
      exercise.grading,
      exercise.solution,
      exercise.id,
    );
    if (!allPassed(solved)) {
      const detail = solved.tests
        .filter((t) => t.status !== "passed")
        .map((t) => `${t.label}: ${t.message ?? "failed"}`)
        .join("; ");
      fail(
        where,
        `solution.sql does not pass its own grading: ${detail || solved.stderr}`,
      );
    }

    const starter = await gradeSql(
      runner,
      exercise.starter,
      exercise.grading,
      exercise.solution,
      exercise.id,
    );
    if (allPassed(starter)) {
      fail(where, "starter.sql already grades as correct — there is nothing to solve");
    }
  } catch (error) {
    fail(where, `SQL grading threw: ${error instanceof Error ? error.message : error}`);
  } finally {
    await runner?.close().catch(() => undefined);
  }
}

async function checkPythonExercise(
  python: string,
  where: string,
  exercise: CompiledPythonExercise,
) {
  if (exercise.starter.trim() === exercise.solution.trim()) {
    fail(where, "starter.py is identical to solution.py — the exercise is a no-op");
  }

  const solutionResult = await runPythonTests(python, exercise.solution, exercise);
  if (solutionResult.failed.length > 0) {
    fail(
      where,
      `solution.py does not pass its own tests: ${solutionResult.failed.join(", ")}\n    ${solutionResult.detail}`,
    );
  }

  // A budget that the reference solution cannot meet would reject correct
  // answers, so it has to be checked as carefully as the tests are.
  if (exercise.complexityBudget) {
    const budget = await runComplexityBudget(python, exercise.solution, exercise);
    if (!budget.ok) {
      fail(where, `solution.py exceeds its own complexity budget: ${budget.detail}`);
    }
  }

  const starterResult = await runPythonTests(python, exercise.starter, exercise);
  if (starterResult.errored) {
    // A starter that raises on import is fine only if it is meant to; a
    // TODO-shaped starter should run and fail assertions, not explode.
    notes.push(`${where}: starter.py raises before tests run (${starterResult.detail.slice(0, 80)})`);
    return;
  }

  if (starterResult.failed.length > 0) return;

  // The starter passed every correctness test. That is legitimate only when the
  // exercise is about efficiency rather than correctness — in which case the
  // budget must reject it. Checking this also proves the budget is tight enough
  // to catch the naive approach it was written to catch.
  if (!exercise.complexityBudget) {
    fail(where, "starter.py already passes every test — there is nothing to solve");
    return;
  }
  const starterBudget = await runComplexityBudget(python, exercise.starter, exercise);
  if (starterBudget.ok) {
    fail(
      where,
      "starter.py passes every test AND meets the complexity budget — the budget " +
        "is too loose to reject the naive solution it was written for",
    );
  }
}

/** Mirrors the browser harness: count line events, fail past the ceiling. */
async function runComplexityBudget(
  python: string,
  code: string,
  exercise: CompiledPythonExercise,
): Promise<{ ok: boolean; detail: string }> {
  const budget = exercise.complexityBudget!;
  const script = [
    "import json, sys, time",
    "ns = {}",
    `exec(compile(${JSON.stringify(code)}, '<learner>', 'exec'), ns)`,
    `exec(compile(${JSON.stringify(budget.setup)}, '<setup>', 'exec'), ns)`,
    "ops = [0]",
    `max_ops = ${budget.maxOps ?? 0}`,
    "def tracer(frame, event, arg):",
    "    if event == 'line':",
    "        ops[0] += 1",
    "        if max_ops and ops[0] > max_ops:",
    "            raise RuntimeError('budget exceeded')",
    "    return tracer",
    "ok = True",
    "detail = ''",
    "started = time.perf_counter()",
    "try:",
    "    if max_ops: sys.settrace(tracer)",
    `    exec(compile(${JSON.stringify(budget.call)}, '<call>', 'exec'), ns)`,
    "except BaseException as exc:",
    "    ok = False",
    "    detail = '%s: %s' % (type(exc).__name__, exc)",
    "finally:",
    "    sys.settrace(None)",
    "elapsed = (time.perf_counter() - started) * 1000",
    `max_ms = ${budget.maxMs ?? 0}`,
    "if ok and max_ms and elapsed > max_ms:",
    "    ok = False",
    "    detail = 'took %.0fms, budget %dms' % (elapsed, max_ms)",
    "print(json.dumps({'ok': ok, 'detail': detail, 'ops': ops[0]}))",
  ].join("\n");

  const tmp = path.join(os.tmpdir(), `budget-${process.pid}-${Math.random().toString(36).slice(2)}.py`);
  await fs.writeFile(tmp, script, "utf8");
  try {
    const { stdout, stderr, code: exitCode } = await exec(python, [tmp]);
    if (exitCode !== 0) return { ok: false, detail: stderr.trim().slice(0, 200) };
    const parsed = JSON.parse(stdout.trim()) as { ok: boolean; detail: string; ops: number };
    return { ok: parsed.ok, detail: parsed.detail || `${parsed.ops} ops` };
  } finally {
    await fs.unlink(tmp).catch(() => undefined);
  }
}

type TestRun = { failed: string[]; errored: boolean; detail: string };

async function runPythonTests(
  python: string,
  code: string,
  exercise: CompiledPythonExercise,
): Promise<TestRun> {
  const script = [
    "import json, sys",
    "ns = {}",
    `code = ${JSON.stringify(code)}`,
    "failed = []",
    "errored = False",
    "detail = ''",
    "try:",
    "    exec(compile(code, '<learner>', 'exec'), ns)",
    "except BaseException as exc:",
    "    errored = True",
    "    detail = '%s: %s' % (type(exc).__name__, exc)",
    "if not errored:",
    `    tests = json.loads(${JSON.stringify(JSON.stringify(exercise.tests))})`,
    "    for test in tests:",
    "        local = dict(ns)",
    "        try:",
    "            exec(compile(test['code'], '<test>', 'exec'), local)",
    "        except BaseException as exc:",
    "            failed.append(test['id'])",
    "            if not detail:",
    "                detail = '%s -> %s: %s' % (test['id'], type(exc).__name__, exc)",
    "print(json.dumps({'failed': failed, 'errored': errored, 'detail': detail}))",
  ].join("\n");

  const tmp = path.join(os.tmpdir(), `curriculum-check-${process.pid}-${Math.random().toString(36).slice(2)}.py`);
  await fs.writeFile(tmp, script, "utf8");
  try {
    const { stdout, stderr, code: exitCode } = await exec(python, [tmp]);
    if (exitCode !== 0) {
      return { failed: ["<harness>"], errored: true, detail: stderr.trim() };
    }
    return JSON.parse(stdout.trim()) as TestRun;
  } finally {
    await fs.unlink(tmp).catch(() => undefined);
  }
}

function exec(
  command: string,
  args: string[],
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { timeout: 30_000 });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => resolve({ stdout, stderr, code: code ?? 1 }));
    child.on("error", (err) => resolve({ stdout, stderr: String(err), code: 1 }));
  });
}

async function resolvePython(): Promise<string | null> {
  for (const candidate of ["python3", "python"]) {
    const { code } = await exec(candidate, ["--version"]);
    if (code === 0) return candidate;
  }
  return null;
}

main().catch((error) => {
  console.error("curriculum:check failed:\n", error instanceof Error ? error.message : error);
  process.exit(1);
});
