/**
 * Generates lib/runtime/python/harness.generated.ts from harness.py.
 *
 * The harness stays a real .py file so it is readable and lintable, but
 * Turbopack has no raw-text import, and a custom webpack config would fail the
 * build in Next 16 — so we inline it through codegen instead. The output is
 * committed, so a fresh clone builds without running this first.
 */
import { promises as fs } from "node:fs";
import path from "node:path";

const SOURCE = path.join(process.cwd(), "lib/runtime/python/harness.py");
const OUTPUT = path.join(process.cwd(), "lib/runtime/python/harness.generated.ts");

async function main() {
  const python = await fs.readFile(SOURCE, "utf8");
  const body = [
    "// GENERATED FILE — do not edit.",
    "// Source: lib/runtime/python/harness.py",
    "// Regenerate: npm run harness:generate",
    "",
    `const HARNESS_SOURCE = ${JSON.stringify(python)};`,
    "",
    "export default HARNESS_SOURCE;",
    "",
  ].join("\n");
  await fs.writeFile(OUTPUT, body, "utf8");
  console.log(`generated ${path.relative(process.cwd(), OUTPUT)} (${python.length} bytes)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
