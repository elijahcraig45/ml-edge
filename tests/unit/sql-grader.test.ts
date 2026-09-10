// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { gradeSql, stripSqlComments, checkSqlForbidden, type SqlGradingSpec } from "@/lib/runtime/sql/grade";
import { openNodeRunner } from "@/lib/runtime/sql/node-runner";
import { compileDatasets } from "@/lib/curriculum/compile/dataset";
import { allPassed } from "@/lib/runtime/protocol";

/**
 * Graded against a real DuckDB, not a mock. The grader's whole job is to agree
 * with an actual engine about what a query returns, so a mock would test the
 * mock.
 */
let runner: Awaited<ReturnType<typeof openNodeRunner>>;

const SPEC: SqlGradingSpec = {
  compare: "multiset",
  columnMatch: "byName",
  floatTolerance: 1e-6,
  maxRowsCompared: 50_000,
};

beforeAll(async () => {
  const datasets = await compileDatasets();
  runner = await openNodeRunner(datasets["package-registry"]);
}, 120_000);

afterAll(async () => {
  await runner?.close().catch(() => undefined);
});

const REFERENCE = "SELECT name FROM packages WHERE language = 'rust'";

describe("result comparison", () => {
  it("passes an equivalent query written differently", async () => {
    const outcome = await gradeSql(
      runner,
      "SELECT p.name FROM packages p WHERE p.language IN ('rust')",
      SPEC,
      REFERENCE,
      "t",
    );
    expect(allPassed(outcome)).toBe(true);
  });

  it("fails a query returning the wrong rows, and reports the diff", async () => {
    const outcome = await gradeSql(
      runner,
      "SELECT name FROM packages WHERE language = 'python'",
      SPEC,
      REFERENCE,
      "t",
    );
    expect(allPassed(outcome)).toBe(false);
    expect(outcome.diff?.missing.length).toBeGreaterThan(0);
    expect(outcome.diff?.unexpected.length).toBeGreaterThan(0);
  });

  it("reports a column-count mismatch in plain language", async () => {
    const outcome = await gradeSql(
      runner,
      "SELECT name, language FROM packages WHERE language = 'rust'",
      SPEC,
      REFERENCE,
      "t",
    );
    expect(allPassed(outcome)).toBe(false);
    expect(outcome.diff?.shapeMessage).toMatch(/2 columns, expected 1/);
  });

  it("requires a matching column name when columnMatch is byName", async () => {
    const outcome = await gradeSql(
      runner,
      "SELECT name AS pkg FROM packages WHERE language = 'rust'",
      SPEC,
      REFERENCE,
      "t",
    );
    expect(outcome.diff?.shapeMessage).toMatch(/alias/i);
  });

  it("ignores row order under multiset comparison", async () => {
    const outcome = await gradeSql(
      runner,
      `${REFERENCE} ORDER BY name DESC`,
      SPEC,
      REFERENCE,
      "t",
    );
    expect(allPassed(outcome)).toBe(true);
  });

  it("enforces row order under ordered comparison", async () => {
    const ordered: SqlGradingSpec = { ...SPEC, compare: "ordered" };
    const reference = "SELECT name FROM packages WHERE language = 'rust' ORDER BY name";
    const outcome = await gradeSql(
      runner,
      "SELECT name FROM packages WHERE language = 'rust' ORDER BY name DESC",
      ordered,
      reference,
      "t",
    );
    expect(allPassed(outcome)).toBe(false);
  });

  it("counts duplicates, so EXCEPT ALL semantics are preserved", async () => {
    const outcome = await gradeSql(
      runner,
      "SELECT 1 AS n UNION ALL SELECT 1",
      SPEC,
      "SELECT 1 AS n",
      "t",
    );
    expect(allPassed(outcome)).toBe(false);
  });
});

describe("assertions", () => {
  it("checks row counts", async () => {
    const spec: SqlGradingSpec = {
      ...SPEC,
      require: [{ type: "rowcount", equals: 99, message: "wrong count" }],
    };
    const outcome = await gradeSql(runner, REFERENCE, spec, REFERENCE, "t");
    expect(outcome.tests.find((t) => t.message === "wrong count")).toBeDefined();
  });

  it("checks the execution plan", async () => {
    const spec: SqlGradingSpec = {
      ...SPEC,
      require: [
        { type: "plan", notContains: ["CROSS_PRODUCT"], message: "no cross join" },
      ],
    };
    const outcome = await gradeSql(runner, REFERENCE, spec, REFERENCE, "t");
    expect(allPassed(outcome)).toBe(true);
  });

  it("supports a negated syntax requirement", async () => {
    const spec: SqlGradingSpec = {
      ...SPEC,
      require: [
        { type: "syntax", pattern: "\\bwhere\\b", negate: true, message: "no WHERE allowed" },
      ],
    };
    const outcome = await gradeSql(runner, REFERENCE, spec, REFERENCE, "t");
    expect(outcome.tests.some((t) => t.message === "no WHERE allowed")).toBe(true);
  });
});

describe("guards", () => {
  it("rejects forbidden constructs before executing", async () => {
    const spec: SqlGradingSpec = { ...SPEC, forbid: ["limit"] };
    const outcome = await gradeSql(runner, `${REFERENCE} LIMIT 1`, spec, REFERENCE, "t");
    expect(outcome.status).toBe("forbidden");
  });

  it("does not trip a forbid guard on a comment", () => {
    expect(checkSqlForbidden("SELECT 1 -- no LIMIT here", ["limit"])).toBeNull();
  });

  it("strips both comment styles", () => {
    expect(stripSqlComments("SELECT 1 /* x */ -- y").trim()).toBe("SELECT 1");
  });

  it("rolls back learner DDL so later exercises see clean data", async () => {
    await gradeSql(runner, "SELECT 1 AS n", SPEC, "SELECT 1 AS n", "t");
    // A destructive statement inside the graded transaction must not survive.
    await gradeSql(runner, "DELETE FROM packages RETURNING name", SPEC, REFERENCE, "t").catch(
      () => undefined,
    );
    const after = await runner.query("SELECT count(*) FROM packages");
    expect(Number(after.rows[0][0])).toBe(20);
  });

  it("reports a SQL syntax error instead of throwing", async () => {
    const outcome = await gradeSql(runner, "SELECT FROM WHERE", SPEC, REFERENCE, "t");
    expect(outcome.status).toBe("exception");
    expect(outcome.stderr.length).toBeGreaterThan(0);
  });
});
