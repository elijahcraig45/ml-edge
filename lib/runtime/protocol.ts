/**
 * One result shape for both engines.
 *
 * The Python worker and the SQL client both return `RunOutcome`, so the run
 * console, the test list, and the progress reducer are engine-agnostic and are
 * written once rather than twice.
 */

export type TestStatus = "passed" | "failed" | "errored" | "skipped";

export type TestOutcome = {
  id: string;
  label: string;
  hidden: boolean;
  status: TestStatus;
  message?: string;
  durationMs: number;
};

export type RunStatus =
  | "ok"
  /** User code raised before tests could run. */
  | "exception"
  /** Killed by the timeout; the worker was terminated. */
  | "timeout"
  /** Rejected by a `forbid` guard before execution. */
  | "forbidden"
  /** The runtime itself failed to load or crashed. */
  | "engine-error";

export type RunError = {
  type: string;
  message: string;
  /** 1-indexed line in the learner's editor, when it can be recovered. */
  line?: number;
  traceback: string;
};

/** Tabular result of a SQL run, for the result grid. */
export type ResultTable = {
  columns: string[];
  rows: Array<Array<string | number | boolean | null>>;
  /** True when `rows` was capped for display. */
  truncated: boolean;
  totalRows: number;
};

/** Row-level difference against the reference solution. */
export type ResultDiff = {
  missing: Array<Array<string | number | boolean | null>>;
  unexpected: Array<Array<string | number | boolean | null>>;
  columns: string[];
  /** Plain-English shape mismatch, e.g. "you returned 4 columns, expected 3". */
  shapeMessage?: string;
};

export type RunOutcome = {
  id: string;
  status: RunStatus;
  stdout: string;
  stderr: string;
  error?: RunError;
  tests: TestOutcome[];
  score: { earned: number; possible: number };
  durationMs: number;
  /** SQL only. */
  resultTable?: ResultTable;
  diff?: ResultDiff;
};

export function allPassed(outcome: RunOutcome): boolean {
  return (
    outcome.status === "ok" &&
    outcome.tests.length > 0 &&
    outcome.tests.every((t) => t.status === "passed")
  );
}

export function emptyOutcome(id: string, status: RunStatus): RunOutcome {
  return {
    id,
    status,
    stdout: "",
    stderr: "",
    tests: [],
    score: { earned: 0, possible: 0 },
    durationMs: 0,
  };
}

/* ---------------- Python worker message protocol ---------------- */

export type PythonTestSpec = {
  id: string;
  label: string;
  hidden: boolean;
  code: string;
  points: number;
};

export type PythonRunRequest = {
  id: string;
  code: string;
  tests: PythonTestSpec[];
  packages: string[];
  complexityBudget?: {
    setup: string;
    call: string;
    maxOps?: number;
    maxMs?: number;
    message: string;
  };
  /** Seed `random` and freeze wall-clock so a correct solution can't flake. */
  deterministic: boolean;
};

export type WorkerInbound =
  | { type: "init"; indexURL: string; packages: string[] }
  | { type: "run"; request: PythonRunRequest };

export type WorkerOutbound =
  | { type: "ready" }
  | { type: "init-error"; message: string }
  | { type: "result"; outcome: RunOutcome };
