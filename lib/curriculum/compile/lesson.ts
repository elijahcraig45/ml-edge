import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import matter from "gray-matter";
import YAML from "yaml";
import { lessonFrontmatterSchema, type Runtime } from "../schema";
import type {
  CompiledExercise,
  CompiledLesson,
  LessonBlock,
} from "../artifact";
import type { DepthTrack } from "../types";
import { compileExercise, formatIssues } from "./exercise";
import { segmentNodes, type RawBlock } from "./blocks";
import {
  extractHeadings,
  parseToNodes,
  renderInlineAll,
  renderMarkdown,
  toPlainText,
} from "./markdown";

/** Compiles one lesson directory into its renderable artifact. */
export async function compileLesson(
  dir: string,
  slug: string,
): Promise<CompiledLesson> {
  const lessonPath = path.join(dir, "lesson.md");
  const rawFile = await fs.readFile(lessonPath, "utf8");
  const { data, content } = matter(rawFile);

  const parsed = lessonFrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      `Invalid frontmatter in ${lessonPath}:\n${formatIssues(parsed.error.issues)}`,
    );
  }
  const fm = parsed.data;

  const exercises = await loadExercises(dir);
  const rawBlocks = segmentNodes(parseToNodes(content), content);
  const blocks = await compileBlocks(rawBlocks, dir, exercises, lessonPath);

  const [misconceptionsHtml, objectivesHtml, masteryChecklistHtml] =
    await Promise.all([
      Promise.all(fm.misconceptions.map((m) => renderMarkdown(m))),
      renderInlineAll(fm.objectives),
      renderInlineAll(fm.masteryChecklist),
    ]);

  return {
    id: fm.id,
    slug,
    tierId: fm.tier,
    stageId: fm.stage,
    title: fm.title,
    status: fm.status,
    estimatedMinutes: fm.estimatedMinutes,
    objectives: fm.objectives,
    objectivesHtml,
    prerequisiteLessonIds: fm.prerequisites,
    misconceptionsHtml,
    masteryChecklistHtml,
    availableTracks: collectTracks(blocks, exercises),
    blocks,
    exercises,
    runtimes: fm.runtimes,
    // Covers prose and every exercise file, so editing a test invalidates
    // saved block completion for that lesson.
    contentHash: hashContent(rawFile, exercises),
  };
}

async function loadExercises(
  dir: string,
): Promise<Record<string, CompiledExercise>> {
  const exercisesDir = path.join(dir, "exercises");
  const entries = await fs.readdir(exercisesDir, { withFileTypes: true }).catch(() => []);
  const out: Record<string, CompiledExercise> = {};
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const exercise = await compileExercise(path.join(exercisesDir, entry.name));
    if (exercise.id !== entry.name) {
      throw new Error(
        `Exercise id "${exercise.id}" must match its directory name "${entry.name}"`,
      );
    }
    out[exercise.id] = exercise;
  }
  return out;
}

async function compileBlocks(
  raw: RawBlock[],
  dir: string,
  exercises: Record<string, CompiledExercise>,
  lessonPath: string,
): Promise<LessonBlock[]> {
  const seen = new Set<string>();
  const blocks: LessonBlock[] = [];

  for (const [index, block] of raw.entries()) {
    const id = block.id ?? `${block.kind}-${index + 1}`;
    if (seen.has(id)) {
      throw new Error(`Duplicate block id "${id}" in ${lessonPath}`);
    }
    seen.add(id);

    switch (block.kind) {
      case "prose": {
        blocks.push({
          kind: "prose",
          id,
          tracks: block.tracks,
          html: await renderMarkdown(block.markdown),
          headings: extractHeadings(block.markdown),
          plain: toPlainText(block.markdown),
        });
        break;
      }
      case "callout": {
        blocks.push({
          kind: "callout",
          id,
          tracks: block.tracks,
          variant: block.variant as "note",
          title: block.title,
          html: await renderMarkdown(block.markdown),
        });
        break;
      }
      case "figure": {
        const svgPath = path.resolve(dir, block.src);
        const svg = await fs.readFile(svgPath, "utf8").catch(() => {
          throw new Error(`Figure not found: ${block.src} (from ${lessonPath})`);
        });
        blocks.push({
          kind: "figure",
          id,
          tracks: block.tracks,
          svg,
          alt: block.alt,
          captionHtml: block.captionMarkdown
            ? await renderMarkdown(block.captionMarkdown)
            : undefined,
        });
        break;
      }
      case "runnable": {
        const runtime: Runtime =
          block.lang === "python"
            ? { engine: "python", packages: [], timeoutMs: 10_000 }
            : {
                engine: "duckdb",
                datasetId: block.datasetId!,
                timeoutMs: 15_000,
              };
        blocks.push({
          kind: "runnable",
          id,
          tracks: block.tracks,
          runtime,
          source: block.source,
          html: await renderMarkdown(
            `\`\`\`${block.lang}\n${block.source}\n\`\`\``,
          ),
          editable: block.editable,
        });
        break;
      }
      case "quiz": {
        const questions = YAML.parse(stripYamlFence(block.yaml)) as Array<{
          id: string;
          prompt: string;
          options: string[];
          answerIndex: number;
          explanation: string;
        }>;
        if (!Array.isArray(questions) || questions.length === 0) {
          throw new Error(`:::quiz ${id} has no questions (${lessonPath})`);
        }
        blocks.push({
          kind: "quiz",
          id,
          tracks: block.tracks,
          passing: block.passing ?? Math.ceil(questions.length * 0.6),
          questions: await Promise.all(
            questions.map(async (q) => ({
              id: q.id,
              promptHtml: await renderMarkdown(q.prompt),
              optionsHtml: await renderInlineAll(q.options),
              answerIndex: q.answerIndex,
              explanationHtml: await renderMarkdown(q.explanation),
            })),
          ),
        });
        break;
      }
      case "checkpoint": {
        blocks.push({
          kind: "checkpoint",
          id,
          tracks: block.tracks,
          promptHtml: await renderMarkdown(block.markdown),
          rubricHtml: await renderInlineAll(block.rubric),
        });
        break;
      }
      case "dataset": {
        blocks.push({
          kind: "dataset",
          id,
          tracks: block.tracks,
          datasetId: block.datasetId,
          tables: block.tables,
        });
        break;
      }
      case "exercise": {
        if (!exercises[block.ref]) {
          throw new Error(
            `:::exercise{ref=${block.ref}} has no matching directory in ${dir}/exercises`,
          );
        }
        blocks.push({
          kind: "exercise",
          id,
          tracks: block.tracks ?? exercises[block.ref].tracks,
          exerciseId: block.ref,
        });
        break;
      }
    }
  }

  return blocks;
}

/** Directive containers arrive wrapped in a code fence when authors indent them. */
function stripYamlFence(source: string): string {
  return source.replace(/^```(?:yaml|yml)?\n/, "").replace(/\n```$/, "");
}

function collectTracks(
  blocks: LessonBlock[],
  exercises: Record<string, CompiledExercise>,
): DepthTrack[] {
  const tracks = new Set<DepthTrack>(["core"]);
  for (const block of blocks) block.tracks?.forEach((t) => tracks.add(t));
  for (const ex of Object.values(exercises)) ex.tracks?.forEach((t) => tracks.add(t));
  return Array.from(tracks);
}

function hashContent(
  rawFile: string,
  exercises: Record<string, CompiledExercise>,
): string {
  const hash = createHash("sha256").update(rawFile);
  for (const id of Object.keys(exercises).sort()) {
    hash.update(id).update(JSON.stringify(exercises[id]));
  }
  return hash.digest("hex").slice(0, 16);
}
