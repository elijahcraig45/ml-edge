import path from "node:path";

/** Root of authored content. Read at build time only. */
export const CONTENT_ROOT = path.join(process.cwd(), "content");
export const DATASETS_SOURCE_ROOT = path.join(CONTENT_ROOT, "datasets");
/**
 * Where built dataset files are served from.
 *
 * Deliberately NOT under /curriculum: that prefix now permanently redirects to
 * /learn for the retired v1 routes, and a 308 on an asset path is invisible
 * until a dataset silently fails to load.
 */
export const DATASETS_PUBLIC_DIR = path.join(
  process.cwd(),
  "public",
  "assets",
  "datasets",
);
export const DATASETS_PUBLIC_URL = "/assets/datasets";

export const CURRICULUM_MANIFEST = path.join(CONTENT_ROOT, "curriculum.yaml");

/**
 * Where `scripts/build-curriculum-artifact.ts` writes the compiled curriculum.
 * Read by the loader during `next build` so each prerender worker parses JSON
 * instead of recompiling every lesson.
 */
export const ARTIFACT_PATH = path.join(
  process.cwd(),
  ".curriculum",
  "artifact.json",
);

/** Draft content is visible locally but excluded from production builds. */
export function includeDrafts(): boolean {
  return process.env.NEXT_PUBLIC_CURRICULUM_PREVIEW === "1";
}
