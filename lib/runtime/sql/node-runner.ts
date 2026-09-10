/**
 * DuckDB in Node, for `curriculum:check`.
 *
 * Uses the SAME @duckdb/duckdb-wasm package and pinned version the browser
 * uses, so a query that grades correctly in CI grades identically for a
 * learner. A native duckdb binding would be faster and would drift — different
 * build, different version, subtly different EXPLAIN output — which would make
 * plan assertions untrustworthy, and grading SQL on its execution plan is the
 * whole reason those assertions exist.
 *
 * The blocking build is used deliberately: it needs no worker and no fetch, so
 * CI has one less moving part than the browser path.
 */
import { createRequire } from "node:module";
import path from "node:path";
import type { CompiledDataset } from "@/lib/curriculum/artifact";
import type { QueryRunner } from "./grade";

const require = createRequire(import.meta.url);

type ArrowResult = {
  schema: { fields: Array<{ name: string }> };
  toArray: () => Array<{ toJSON: () => Record<string, unknown> }>;
};

type BlockingConnection = {
  query: (sql: string) => ArrowResult;
  close: () => void;
};

type BlockingDuckDB = {
  instantiate: () => Promise<void>;
  connect: () => BlockingConnection;
};

let dbPromise: Promise<BlockingDuckDB> | null = null;

async function createDb(): Promise<BlockingDuckDB> {
  const duckdb = require("@duckdb/duckdb-wasm/blocking");
  const dist = path.dirname(
    require.resolve("@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs"),
  );
  const bundles = {
    mvp: { mainModule: path.join(dist, "duckdb-mvp.wasm"), mainWorker: null },
    eh: { mainModule: path.join(dist, "duckdb-eh.wasm"), mainWorker: null },
  };
  const db = (await duckdb.createDuckDB(
    bundles,
    new duckdb.VoidLogger(),
    duckdb.NODE_RUNTIME,
  )) as BlockingDuckDB;
  await db.instantiate();
  return db;
}

function getDb(): Promise<BlockingDuckDB> {
  if (!dbPromise) dbPromise = createDb();
  return dbPromise;
}

/**
 * Opens a connection with the dataset materialized.
 *
 * Each call gets its own connection, so one exercise's temp tables and its
 * rolled-back transaction cannot leak into the next.
 */
export async function openNodeRunner(
  dataset: CompiledDataset,
): Promise<QueryRunner & { close: () => Promise<void> }> {
  const db = await getDb();
  const conn = db.connect();

  for (const table of dataset.tables) {
    if (table.source.kind !== "sql") {
      throw new Error(
        `curriculum:check can only seed inline datasets; "${dataset.id}.${table.name}" ` +
          "uses a file. Add Parquet loading here when the first file-backed dataset lands.",
      );
    }
    conn.query(table.source.statements);
  }

  const toRows = (result: ArrowResult) => {
    const columns = result.schema.fields.map((f) => f.name);
    const rows = result.toArray().map((row) => {
      const record = row.toJSON();
      return columns.map((c) => record[c]);
    });
    return { columns, rows };
  };

  return {
    async query(sql: string) {
      return toRows(conn.query(sql));
    },
    async exec(sql: string) {
      conn.query(sql);
    },
    async close() {
      conn.close();
    },
  };
}
