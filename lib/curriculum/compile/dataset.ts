import { promises as fs } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { datasetSpecSchema } from "../schema";
import type { CompiledDataset, CompiledDatasetTable } from "../artifact";
import { DATASETS_PUBLIC_DIR, DATASETS_PUBLIC_URL, DATASETS_SOURCE_ROOT } from "../paths";
import { formatIssues } from "./exercise";
import { renderMarkdown } from "./markdown";

/** Per-lesson dataset budget. Keeps a SQL lesson from becoming a 40MB download. */
export const DATASET_BYTE_BUDGET = 5 * 1024 * 1024;

export async function compileDatasets(): Promise<Record<string, CompiledDataset>> {
  const entries = await fs
    .readdir(DATASETS_SOURCE_ROOT, { withFileTypes: true })
    .catch(() => []);
  const out: Record<string, CompiledDataset> = {};
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dataset = await compileDataset(path.join(DATASETS_SOURCE_ROOT, entry.name));
    out[dataset.id] = dataset;
  }
  return out;
}

async function compileDataset(dir: string): Promise<CompiledDataset> {
  const raw = await fs.readFile(path.join(dir, "dataset.yaml"), "utf8");
  const result = datasetSpecSchema.safeParse(YAML.parse(raw));
  if (!result.success) {
    throw new Error(`Invalid dataset at ${dir}:\n${formatIssues(result.error.issues)}`);
  }
  const spec = result.data;

  let totalBytes = 0;
  const tables: CompiledDatasetTable[] = [];

  for (const table of spec.tables) {
    if (table.seedSql) {
      // Inlined into the artifact: no network round trip for tiny tables.
      tables.push({
        name: table.name,
        description: table.description,
        columns: table.columns,
        source: { kind: "sql", statements: table.seedSql },
      });
      continue;
    }
    if (!table.file) {
      throw new Error(
        `Dataset table ${spec.id}.${table.name} needs either "file" or "seedSql"`,
      );
    }
    const builtPath = path.join(DATASETS_PUBLIC_DIR, spec.id, table.file);
    const stat = await fs.stat(builtPath).catch(() => null);
    if (!stat) {
      throw new Error(
        `Dataset file missing: ${builtPath}. File-backed tables must be built into ` +
          "public/curriculum/datasets/ before compiling; every dataset today uses " +
          "inline seedSql instead.",
      );
    }
    totalBytes += stat.size;
    tables.push({
      name: table.name,
      description: table.description,
      columns: table.columns,
      source: {
        kind: "file",
        url: `${DATASETS_PUBLIC_URL}/${spec.id}/${table.file}`,
        bytes: stat.size,
        format: table.file.endsWith(".parquet") ? "parquet" : "csv",
      },
    });
  }

  if (totalBytes > DATASET_BYTE_BUDGET) {
    throw new Error(
      `Dataset "${spec.id}" is ${(totalBytes / 1024 / 1024).toFixed(1)}MB, over the ` +
        `${DATASET_BYTE_BUDGET / 1024 / 1024}MB budget. Sample it down.`,
    );
  }

  return {
    id: spec.id,
    title: spec.title,
    descriptionHtml: await renderMarkdown(spec.description),
    license: spec.license,
    tables,
    totalBytes,
  };
}
