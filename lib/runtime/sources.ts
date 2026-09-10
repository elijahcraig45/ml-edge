/**
 * Where the wasm runtimes are fetched from.
 *
 * Delivered from a public CDN rather than from our own origin, deliberately:
 * Cloud Run bills egress per byte, and Pyodide plus DuckDB are tens of
 * megabytes each. jsDelivr serves them free, from an edge close to the learner,
 * with far better cache hit rates than a single us-central1 region — so this is
 * both cheaper to run and faster to load.
 *
 * Versions are pinned exactly. `EXPLAIN` output and Python stdlib behaviour are
 * version-sensitive, and `curriculum:check` asserts plan shapes against the
 * pinned DuckDB, so a floating version would break content silently.
 *
 * `npm run runtimes:vendor` mirrors these into `public/runtime/` for offline
 * and CI use; set NEXT_PUBLIC_RUNTIME_ORIGIN=self to serve from there instead.
 */

export const PYODIDE_VERSION = "0.26.2";
/** Must match the pinned @duckdb/duckdb-wasm in package.json. */
export const DUCKDB_VERSION = "1.32.0";

function selfHosted(): boolean {
  return process.env.NEXT_PUBLIC_RUNTIME_ORIGIN === "self";
}

export function pyodideIndexURL(): string {
  return selfHosted()
    ? `/runtime/pyodide/${PYODIDE_VERSION}/`
    : `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
}

export function duckdbBundleBase(): string {
  return selfHosted()
    ? `/runtime/duckdb/${DUCKDB_VERSION}`
    : `https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@${DUCKDB_VERSION}/dist`;
}
