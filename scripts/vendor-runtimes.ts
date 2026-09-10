/**
 * Mirrors the pinned wasm runtimes into public/runtime/.
 *
 * Not needed for normal operation: the browser loads Pyodide and DuckDB from a
 * CDN, which is free to serve and cached at the edge, whereas serving tens of
 * megabytes from Cloud Run is billed egress on every cache miss.
 *
 * Run this when you need the site to work offline, or in an environment with no
 * outbound network, then set NEXT_PUBLIC_RUNTIME_ORIGIN=self.
 *
 * Note the two halves behave differently: DuckDB is copied out of node_modules
 * and always works, while Pyodide is downloaded and will fail behind a TLS
 * intercepting proxy with SELF_SIGNED_CERT_IN_CHAIN. On such a machine, fetch
 * the Pyodide files by hand or run this somewhere without the proxy.
 */
import { promises as fs } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { DUCKDB_VERSION, PYODIDE_VERSION } from "../lib/runtime/sources";

const require = createRequire(import.meta.url);

const PYODIDE_FILES = [
  "pyodide.js",
  "pyodide.asm.js",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json",
];

async function main() {
  const publicRoot = path.join(process.cwd(), "public", "runtime");

  // DuckDB ships inside the npm package, so it is a copy rather than a download.
  const duckdbDist = path.dirname(
    require.resolve("@duckdb/duckdb-wasm/dist/duckdb-browser.mjs"),
  );
  const duckdbOut = path.join(publicRoot, "duckdb", DUCKDB_VERSION);
  await fs.mkdir(duckdbOut, { recursive: true });
  for (const file of [
    "duckdb-mvp.wasm",
    "duckdb-eh.wasm",
    "duckdb-browser-mvp.worker.js",
    "duckdb-browser-eh.worker.js",
  ]) {
    await fs.copyFile(path.join(duckdbDist, file), path.join(duckdbOut, file));
    console.log(`copied duckdb/${DUCKDB_VERSION}/${file}`);
  }

  // Pyodide is not an npm dependency, so these come over the network once.
  const pyodideOut = path.join(publicRoot, "pyodide", PYODIDE_VERSION);
  await fs.mkdir(pyodideOut, { recursive: true });
  const base = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full`;
  for (const file of PYODIDE_FILES) {
    const response = await fetch(`${base}/${file}`);
    if (!response.ok) {
      throw new Error(`Failed to download ${file}: ${response.status}`);
    }
    await fs.writeFile(
      path.join(pyodideOut, file),
      Buffer.from(await response.arrayBuffer()),
    );
    console.log(`downloaded pyodide/${PYODIDE_VERSION}/${file}`);
  }

  console.log("\nDone. Set NEXT_PUBLIC_RUNTIME_ORIGIN=self to use these.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
