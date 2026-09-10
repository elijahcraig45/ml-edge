"use client";

import * as duckdb from "@duckdb/duckdb-wasm";
import type { CompiledDataset } from "@/lib/curriculum/artifact";
import { duckdbBundleBase } from "../sources";
import type { QueryRunner } from "./grade";

/**
 * DuckDB-WASM lifecycle.
 *
 * One instance per tab, one connection per lesson, and each dataset is
 * materialized at most once even when several exercises reference it. The
 * instance is created lazily — on viewport entry, not on mount — so a
 * Python-only lesson never downloads the SQL engine.
 *
 * The `eh` bundle is selected deliberately over `coi`: cross-origin isolation
 * would require COEP headers that break the font loader and any CDN script.
 */

let instance: Promise<duckdb.AsyncDuckDB> | null = null;
const materialized = new Map<string, Promise<void>>();

async function createInstance(): Promise<duckdb.AsyncDuckDB> {
  const base = duckdbBundleBase();
  const bundle = await duckdb.selectBundle({
    mvp: {
      mainModule: `${base}/duckdb-mvp.wasm`,
      mainWorker: `${base}/duckdb-browser-mvp.worker.js`,
    },
    eh: {
      mainModule: `${base}/duckdb-eh.wasm`,
      mainWorker: `${base}/duckdb-browser-eh.worker.js`,
    },
  });

  // The worker script is cross-origin (CDN), so it cannot be passed to
  // `new Worker` directly; wrap it in a same-origin blob shim.
  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker!}");`], {
      type: "text/javascript",
    }),
  );

  const worker = new Worker(workerUrl);
  const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(workerUrl);
  return db;
}

export function getDuckDB(): Promise<duckdb.AsyncDuckDB> {
  if (!instance) instance = createInstance();
  return instance;
}

/** Loads a dataset's tables once per tab. */
export async function ensureDataset(dataset: CompiledDataset): Promise<void> {
  const existing = materialized.get(dataset.id);
  if (existing) return existing;

  const loading = (async () => {
    const db = await getDuckDB();
    const conn = await db.connect();
    try {
      for (const table of dataset.tables) {
        if (table.source.kind === "sql") {
          await conn.query(table.source.statements);
          continue;
        }
        const url = new URL(table.source.url, window.location.origin).toString();
        // Registering the URL lets DuckDB HTTP-range-read, so a LIMIT 5 preview
        // does not download the whole file.
        await db.registerFileURL(
          `${table.name}.${table.source.format}`,
          url,
          duckdb.DuckDBDataProtocol.HTTP,
          false,
        );
        const reader =
          table.source.format === "parquet" ? "read_parquet" : "read_csv_auto";
        await conn.query(
          `CREATE OR REPLACE TABLE "${table.name}" AS SELECT * FROM ${reader}('${table.name}.${table.source.format}')`,
        );
      }
    } finally {
      await conn.close();
    }
  })();

  materialized.set(dataset.id, loading);
  try {
    await loading;
  } catch (error) {
    // Let a later attempt retry rather than caching the failure forever.
    materialized.delete(dataset.id);
    throw error;
  }
}

/** A grader-compatible runner bound to its own connection. */
export async function openRunner(): Promise<QueryRunner & { close: () => Promise<void> }> {
  const db = await getDuckDB();
  const conn = await db.connect();
  return {
    async query(sql: string) {
      const table = await conn.query(sql);
      const columns = table.schema.fields.map((f) => f.name);
      const rows = table.toArray().map((row) => {
        const record = row.toJSON() as Record<string, unknown>;
        return columns.map((c) => record[c]);
      });
      return { columns, rows };
    },
    async exec(sql: string) {
      await conn.query(sql);
    },
    async close() {
      await conn.close();
    },
  };
}

/** Runs an ungraded scratchpad query for a `runnable` block. */
export async function runScratchQuery(sql: string, limit = 100) {
  const runner = await openRunner();
  try {
    return await runner.query(
      /\blimit\b/i.test(sql) ? sql : `SELECT * FROM (${sql.trim().replace(/;\s*$/, "")}) LIMIT ${limit}`,
    );
  } finally {
    await runner.close();
  }
}
