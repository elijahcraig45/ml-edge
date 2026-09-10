// @vitest-environment node
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const run = promisify(execFile);

/**
 * The grading harness, exercised under real CPython.
 *
 * It runs in Pyodide in production, but the logic is plain Python and these are
 * the behaviours that decide whether a learner's grade is correct — including
 * the test-isolation bug that v1 shipped for its whole life.
 */
const HARNESS = path.join(process.cwd(), "lib/runtime/python/harness.py");

type HarnessResult = {
  status: "ok" | "exception";
  stdout: string;
  stderr: string;
  error: { type: string; message: string; line: number | null } | null;
  tests: Array<{ id: string; status: string; message: string | null }>;
};

async function grade(
  code: string,
  tests: Array<{ id: string; label: string; code: string; hidden?: boolean }>,
  extra: Record<string, unknown> = {},
): Promise<HarnessResult> {
  const payload = JSON.stringify({
    code,
    tests: tests.map((t) => ({ hidden: false, ...t })),
    deterministic: true,
    ...extra,
  });
  const stem = path.join(
    os.tmpdir(),
    `harness-test-${process.pid}-${Math.random().toString(36).slice(2)}`,
  );
  const payloadPath = `${stem}.json`;
  const scriptPath = `${stem}.py`;
  // Passed via a file rather than stdin: execFile has no `input` option, so a
  // stdin-reading script would hang forever.
  const script = `
import json
exec(open(${JSON.stringify(HARNESS)}).read())
print(run(open(${JSON.stringify(payloadPath)}).read()))
`;
  await fs.writeFile(payloadPath, payload, "utf8");
  await fs.writeFile(scriptPath, script, "utf8");
  try {
    const { stdout } = await run("python3", [scriptPath], { timeout: 30_000 });
    return JSON.parse(stdout.trim()) as HarnessResult;
  } finally {
    await fs.unlink(payloadPath).catch(() => undefined);
    await fs.unlink(scriptPath).catch(() => undefined);
  }
}

describe("python grading harness", () => {
  it("passes a correct solution", async () => {
    const result = await grade("def f():\n    return 1\n", [
      { id: "t1", label: "returns 1", code: "assert f() == 1" },
    ]);
    expect(result.status).toBe("ok");
    expect(result.tests[0].status).toBe("passed");
  });

  it("reports an assertion failure with its message", async () => {
    const result = await grade("def f():\n    return 2\n", [
      { id: "t1", label: "returns 1", code: "assert f() == 1, 'expected 1'" },
    ]);
    expect(result.tests[0].status).toBe("failed");
    expect(result.tests[0].message).toBe("expected 1");
  });

  it("distinguishes an error from a failed assertion", async () => {
    const result = await grade("def f():\n    return 1\n", [
      { id: "t1", label: "boom", code: "f(1, 2, 3)" },
    ]);
    expect(result.tests[0].status).toBe("errored");
    expect(result.tests[0].message).toMatch(/TypeError/);
  });

  it("reports a syntax error in the learner's code before running tests", async () => {
    const result = await grade("def f(:\n", [
      { id: "t1", label: "never runs", code: "assert True" },
    ]);
    expect(result.status).toBe("exception");
    expect(result.error?.type).toMatch(/SyntaxError/);
    expect(result.tests).toHaveLength(0);
  });

  it("keeps tests isolated — a helper defined in one is invisible to the next", async () => {
    // v1 merged each test into module globals, so a later test could pass
    // because an earlier one had defined a helper. That is the bug this pins.
    const result = await grade("def f():\n    return 1\n", [
      { id: "t1", label: "defines a helper", code: "def helper():\n    return 42\nassert helper() == 42" },
      { id: "t2", label: "must not see it", code: "assert 'helper' not in dir()" },
    ]);
    expect(result.tests.map((t) => t.status)).toEqual(["passed", "passed"]);
  });

  it("handles multi-line test code containing string literals", async () => {
    // v1 re-indented assertion source, which corrupted multi-line strings.
    const result = await grade("def f():\n    return 'a\\nb'\n", [
      {
        id: "t1",
        label: "multiline",
        code: "expected = '''a\nb'''\nassert f() == expected",
      },
    ]);
    expect(result.tests[0].status).toBe("passed");
  });

  it("captures stdout from the learner's code", async () => {
    const result = await grade("print('hello from the learner')\n", []);
    expect(result.stdout).toContain("hello from the learner");
  });

  it("reports the learner's own line number on an exception", async () => {
    const result = await grade("x = 1\ny = 2\nraise ValueError('boom')\n", []);
    expect(result.error?.type).toBe("ValueError");
    expect(result.error?.line).toBe(3);
  });

  it("fails a complexity budget that is exceeded", async () => {
    const result = await grade(
      "def slow(data):\n    return [x for x in data if x in data]\n",
      [{ id: "t1", label: "works", code: "assert slow([1,2]) == [1,2]" }],
      {
        complexityBudget: {
          setup: "data = list(range(6000))",
          call: "slow(data)",
          maxMs: 10,
          message: "too slow",
        },
      },
    );
    const budget = result.tests.find((t) => t.id === "complexity-budget");
    expect(budget?.status).toBe("failed");
    expect(budget?.message).toBe("too slow");
  });

  it("passes a complexity budget that is met", async () => {
    const result = await grade(
      "def fast(data):\n    seen = set(data)\n    return [x for x in data if x in seen]\n",
      [{ id: "t1", label: "works", code: "assert fast([1,2]) == [1,2]" }],
      {
        complexityBudget: {
          setup: "data = list(range(6000))",
          call: "fast(data)",
          maxMs: 500,
          message: "too slow",
        },
      },
    );
    expect(result.tests.find((t) => t.id === "complexity-budget")?.status).toBe("passed");
  });

  it("skips the budget when correctness tests already failed", async () => {
    const result = await grade("def f():\n    return 0\n", [
      { id: "t1", label: "returns 1", code: "assert f() == 1" },
    ], {
      complexityBudget: {
        setup: "data = 1", call: "f()", maxMs: 1, message: "too slow",
      },
    });
    expect(result.tests.find((t) => t.id === "complexity-budget")).toBeUndefined();
  });
});
