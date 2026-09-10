import type { SqlAssertion } from "@/lib/curriculum/schema";
import type { ResultDiff, ResultTable, RunOutcome, TestOutcome } from "../protocol";

/**
 * SQL grading, written as pure functions over a minimal query interface so the
 * same code runs in the browser (DuckDB-WASM) and in Node during
 * `curriculum:check` — and could be lifted into a server route unchanged if
 * tamper-evident grading is ever needed.
 */

export type QueryRunner = {
  /** Runs a statement and returns rows as arrays, plus column names. */
  query: (sql: string) => Promise<{ columns: string[]; rows: unknown[][] }>;
  /** Runs a statement for effect. */
  exec: (sql: string) => Promise<void>;
};

export type SqlGradingSpec = {
  compare: "multiset" | "ordered";
  columnMatch: "byName" | "byPosition" | "ignoreNames";
  floatTolerance: number;
  maxRowsCompared: number;
  require?: SqlAssertion[];
  forbid?: string[];
};

const LEARNER = "__learner";
const EXPECTED = "__expected";
const PREVIEW_ROWS = 50;
const DIFF_ROWS = 5;

/** Rejects trivial cheats before anything executes. */
export function checkSqlForbidden(sql: string, forbid?: string[]): string | null {
  if (!forbid?.length) return null;
  const stripped = stripSqlComments(sql).toLowerCase();
  for (const needle of forbid) {
    if (stripped.includes(needle.toLowerCase())) {
      return `This exercise doesn't allow \`${needle}\`.`;
    }
  }
  return null;
}

export function stripSqlComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
}

export async function gradeSql(
  runner: QueryRunner,
  learnerSql: string,
  spec: SqlGradingSpec,
  solutionSql: string,
  runId: string,
): Promise<RunOutcome> {
  const started = Date.now();
  const tests: TestOutcome[] = [];
  const push = (
    id: string,
    label: string,
    status: TestOutcome["status"],
    message?: string,
  ) => tests.push({ id, label, hidden: false, status, message, durationMs: 0 });

  const forbidden = checkSqlForbidden(learnerSql, spec.forbid);
  if (forbidden) {
    return {
      id: runId,
      status: "forbidden",
      stdout: "",
      stderr: forbidden,
      tests: [],
      score: { earned: 0, possible: 1 },
      durationMs: Date.now() - started,
    };
  }

  // Everything runs inside a transaction that is always rolled back, so a
  // learner's stray INSERT/DROP cannot corrupt the dataset for later exercises.
  await runner.exec("BEGIN TRANSACTION");
  try {
    const syntaxFailures = checkSyntaxAssertions(learnerSql, spec.require);
    for (const failure of syntaxFailures) {
      push(failure.id, failure.label, "failed", failure.message);
    }

    await runner.exec(`CREATE TEMP TABLE ${LEARNER} AS (${stripTrailingSemicolon(learnerSql)})`);
    await runner.exec(`CREATE TEMP TABLE ${EXPECTED} AS (${stripTrailingSemicolon(solutionSql)})`);

    const [learnerHead, expectedHead] = await Promise.all([
      runner.query(`SELECT * FROM ${LEARNER} LIMIT ${PREVIEW_ROWS}`),
      runner.query(`SELECT * FROM ${EXPECTED} LIMIT ${PREVIEW_ROWS}`),
    ]);
    const totalRows = Number(
      (await runner.query(`SELECT count(*) FROM ${LEARNER}`)).rows[0][0],
    );

    const resultTable: ResultTable = {
      columns: learnerHead.columns,
      rows: learnerHead.rows.map(normalizeRow),
      truncated: totalRows > PREVIEW_ROWS,
      totalRows,
    };

    const shape = compareShape(learnerHead.columns, expectedHead.columns, spec.columnMatch);
    if (shape) {
      push("shape", "Result shape matches", "failed", shape);
      return finish(runId, tests, started, resultTable, {
        columns: expectedHead.columns,
        missing: [],
        unexpected: [],
        shapeMessage: shape,
      });
    }
    push("shape", "Result shape matches", "passed");

    const diff = await compareRows(runner, spec, learnerHead.columns);
    if (diff) {
      push(
        "rows",
        spec.compare === "ordered" ? "Rows match, in order" : "Rows match",
        "failed",
        describeDiff(diff, spec.compare),
      );
      return finish(runId, tests, started, resultTable, diff);
    }
    push("rows", spec.compare === "ordered" ? "Rows match, in order" : "Rows match", "passed");

    for (const [index, assertion] of (spec.require ?? []).entries()) {
      if (assertion.type === "syntax") continue; // already handled
      const outcome = await evaluateAssertion(runner, assertion, learnerSql);
      push(`require-${index}`, assertionLabel(assertion), outcome ? "passed" : "failed", outcome ? undefined : assertion.message);
    }

    return finish(runId, tests, started, resultTable);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      id: runId,
      status: "exception",
      stdout: "",
      stderr: message,
      error: { type: "SQLError", message, traceback: message },
      tests,
      score: { earned: 0, possible: Math.max(tests.length, 1) },
      durationMs: Date.now() - started,
    };
  } finally {
    await runner.exec("ROLLBACK").catch(() => undefined);
  }
}

function finish(
  runId: string,
  tests: TestOutcome[],
  started: number,
  resultTable: ResultTable,
  diff?: ResultDiff,
): RunOutcome {
  const earned = tests.filter((t) => t.status === "passed").length;
  return {
    id: runId,
    status: "ok",
    stdout: "",
    stderr: "",
    tests,
    score: { earned, possible: tests.length },
    durationMs: Date.now() - started,
    resultTable,
    diff,
  };
}

function stripTrailingSemicolon(sql: string): string {
  return sql.trim().replace(/;\s*$/, "");
}

function compareShape(
  learner: string[],
  expected: string[],
  mode: SqlGradingSpec["columnMatch"],
): string | null {
  if (learner.length !== expected.length) {
    return `You returned ${learner.length} column${learner.length === 1 ? "" : "s"}, expected ${expected.length}.`;
  }
  if (mode === "byName") {
    const mismatch = learner.findIndex(
      (c, i) => c.toLowerCase() !== expected[i].toLowerCase(),
    );
    if (mismatch !== -1) {
      return `Column ${mismatch + 1} is named "${learner[mismatch]}", expected "${expected[mismatch]}". Use an alias.`;
    }
  }
  return null;
}

/**
 * Row comparison is pushed into the engine rather than pulled into JS: EXCEPT
 * ALL respects duplicates, so a symmetric difference of zero proves multiset
 * equality without materializing either side in memory.
 */
async function compareRows(
  runner: QueryRunner,
  spec: SqlGradingSpec,
  columns: string[],
): Promise<ResultDiff | null> {
  const [left, right] =
    spec.compare === "ordered"
      ? [
          `SELECT row_number() OVER () AS __rn, * FROM ${LEARNER}`,
          `SELECT row_number() OVER () AS __rn, * FROM ${EXPECTED}`,
        ]
      : [`SELECT * FROM ${LEARNER}`, `SELECT * FROM ${EXPECTED}`];

  const missing = await runner.query(
    `SELECT * FROM ((${right}) EXCEPT ALL (${left})) LIMIT ${DIFF_ROWS}`,
  );
  const unexpected = await runner.query(
    `SELECT * FROM ((${left}) EXCEPT ALL (${right})) LIMIT ${DIFF_ROWS}`,
  );

  if (missing.rows.length === 0 && unexpected.rows.length === 0) return null;
  return {
    columns,
    missing: missing.rows.map(normalizeRow),
    unexpected: unexpected.rows.map(normalizeRow),
  };
}

function describeDiff(diff: ResultDiff, compare: SqlGradingSpec["compare"]): string {
  const parts: string[] = [];
  if (diff.missing.length > 0) parts.push(`${diff.missing.length} expected row(s) are missing`);
  if (diff.unexpected.length > 0) parts.push(`${diff.unexpected.length} unexpected row(s) returned`);
  if (compare === "ordered" && parts.length === 0) {
    return "The rows are right but the order is wrong — this exercise needs an ORDER BY.";
  }
  return parts.join("; ") + ".";
}

async function evaluateAssertion(
  runner: QueryRunner,
  assertion: SqlAssertion,
  learnerSql: string,
): Promise<boolean> {
  switch (assertion.type) {
    case "rowcount": {
      const count = Number((await runner.query(`SELECT count(*) FROM ${LEARNER}`)).rows[0][0]);
      if (assertion.equals !== undefined && count !== assertion.equals) return false;
      if (assertion.max !== undefined && count > assertion.max) return false;
      if (assertion.min !== undefined && count < assertion.min) return false;
      return true;
    }
    case "predicate": {
      const result = await runner.query(assertion.sql);
      return Boolean(result.rows[0]?.[0]);
    }
    case "plan": {
      const plan = await runner.query(`EXPLAIN ${stripTrailingSemicolon(learnerSql)}`);
      const text = plan.rows.flat().map(String).join("\n").toUpperCase();
      for (const needle of assertion.contains ?? []) {
        if (!text.includes(needle.toUpperCase())) return false;
      }
      for (const needle of assertion.notContains ?? []) {
        if (text.includes(needle.toUpperCase())) return false;
      }
      return true;
    }
    case "syntax":
      return true;
  }
}

function checkSyntaxAssertions(
  sql: string,
  require: SqlAssertion[] | undefined,
): Array<{ id: string; label: string; message: string }> {
  const failures: Array<{ id: string; label: string; message: string }> = [];
  const normalized = stripSqlComments(sql);
  for (const [index, assertion] of (require ?? []).entries()) {
    if (assertion.type !== "syntax") continue;
    const matched = new RegExp(assertion.pattern, assertion.flags ?? "i").test(normalized);
    if (matched === assertion.negate) {
      failures.push({
        id: `require-${index}`,
        label: "Uses the required construct",
        message: assertion.message,
      });
    }
  }
  return failures;
}

function assertionLabel(assertion: SqlAssertion): string {
  switch (assertion.type) {
    case "plan":
      return "Query plan meets the requirement";
    case "rowcount":
      return "Returns the expected number of rows";
    case "predicate":
      return "Satisfies the result check";
    case "syntax":
      return "Uses the required construct";
  }
}

function normalizeRow(row: unknown[]): Array<string | number | boolean | null> {
  return row.map((value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "bigint") return Number(value);
    if (typeof value === "number" || typeof value === "boolean") return value;
    if (value instanceof Date) return value.toISOString();
    return String(value);
  });
}
