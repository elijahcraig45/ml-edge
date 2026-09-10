import type { RootContent } from "mdast";
import { toString as mdastToString } from "mdast-util-to-string";
import type { DepthTrack } from "../types";
import { DEPTH_TRACKS } from "../types";

/**
 * Segments an authored lesson body into ordered, typed block sources.
 *
 * Authors write ordinary markdown plus `remark-directive` containers. This pass
 * only *classifies* — it produces raw sources; `lesson.ts` compiles them. Prose
 * between directives is accumulated into prose blocks so the block list stays a
 * faithful, ordered representation of the page.
 */

export type RawBlock =
  | { kind: "prose"; id?: string; markdown: string; tracks?: DepthTrack[] }
  | {
      kind: "callout";
      id?: string;
      variant: string;
      title?: string;
      markdown: string;
      tracks?: DepthTrack[];
    }
  | { kind: "figure"; id?: string; src: string; alt: string; captionMarkdown: string; tracks?: DepthTrack[] }
  | {
      kind: "runnable";
      id?: string;
      lang: "python" | "sql";
      datasetId?: string;
      source: string;
      editable: boolean;
      tracks?: DepthTrack[];
    }
  | { kind: "quiz"; id?: string; yaml: string; passing?: number; tracks?: DepthTrack[] }
  | { kind: "checkpoint"; id?: string; markdown: string; rubric: string[]; tracks?: DepthTrack[] }
  | { kind: "dataset"; id?: string; datasetId: string; tables: string[]; tracks?: DepthTrack[] }
  | { kind: "exercise"; id?: string; ref: string; tracks?: DepthTrack[] };

type DirectiveNode = RootContent & {
  type: "containerDirective" | "leafDirective" | "textDirective";
  name: string;
  attributes?: Record<string, string | null | undefined>;
  children: RootContent[];
};

function isDirective(node: RootContent): node is DirectiveNode {
  return (
    node.type === "containerDirective" ||
    node.type === "leafDirective" ||
    node.type === "textDirective"
  );
}

function parseTracks(raw: string | null | undefined): DepthTrack[] | undefined {
  if (!raw) return undefined;
  const parsed = raw
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const invalid = parsed.filter(
    (t) => !(DEPTH_TRACKS as readonly string[]).includes(t),
  );
  if (invalid.length > 0) {
    throw new Error(
      `Unknown depth track(s): ${invalid.join(", ")}. Valid: ${DEPTH_TRACKS.join(", ")}`,
    );
  }
  return parsed as DepthTrack[];
}

function parseList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);
}

/** Serialize a directive's children back to markdown-ish source. */
function childrenToMarkdown(node: DirectiveNode, source: string): string {
  const first = node.children[0];
  const last = node.children[node.children.length - 1];
  if (!first?.position || !last?.position) return mdastToString(node);
  return source.slice(first.position.start.offset, last.position.end.offset);
}

function nodeSource(node: RootContent, source: string): string {
  if (!node.position?.start.offset || node.position.end.offset === undefined) {
    return mdastToString(node);
  }
  return source.slice(node.position.start.offset, node.position.end.offset);
}

/**
 * `:::track{depth=proof}` wraps ordinary content and tags it for a depth track.
 * Nested blocks inherit the track, which is what lets one lesson serve three
 * curricula without duplicating prose.
 */
function expandTrackContainer(
  node: DirectiveNode,
  source: string,
  inherited: DepthTrack[] | undefined,
): RawBlock[] {
  const depth = parseTracks(node.attributes?.depth);
  if (!depth || depth.length === 0) {
    throw new Error(':::track requires a depth attribute, e.g. :::track{depth=proof}');
  }
  const merged = inherited ? Array.from(new Set([...inherited, ...depth])) : depth;
  return segmentNodes(node.children, source, merged);
}

/** Parse `runnable id=x dataset=y readonly` off a fenced code block's meta. */
function parseRunnableFence(
  lang: string | null | undefined,
  meta: string,
  value: string,
  tracks: DepthTrack[] | undefined,
): RawBlock {
  if (lang !== "python" && lang !== "sql") {
    throw new Error(
      `A runnable fence must be \`\`\`python or \`\`\`sql, got \`\`\`${lang ?? "(none)"}`,
    );
  }
  const attrs: Record<string, string> = {};
  for (const match of meta.matchAll(/(\w+)=("[^"]*"|\S+)/g)) {
    attrs[match[1]] = match[2].replace(/^"|"$/g, "");
  }
  if (lang === "sql" && !attrs.dataset) {
    throw new Error("A runnable sql fence requires dataset=<datasetId>");
  }
  return {
    kind: "runnable",
    id: attrs.id,
    lang,
    datasetId: attrs.dataset,
    source: value,
    editable: !/\breadonly\b/.test(meta),
    tracks,
  };
}

export function segmentNodes(
  nodes: RootContent[],
  source: string,
  inheritedTracks?: DepthTrack[],
): RawBlock[] {
  const blocks: RawBlock[] = [];
  let proseBuffer: string[] = [];

  const flushProse = () => {
    const markdown = proseBuffer.join("\n\n").trim();
    proseBuffer = [];
    if (markdown) {
      blocks.push({ kind: "prose", markdown, tracks: inheritedTracks });
    }
  };

  for (const node of nodes) {
    // ```python runnable id=foo  /  ```sql runnable dataset=bar
    // A fence without `runnable` stays in prose and renders as highlighted code.
    if (node.type === "code" && node.meta && /\brunnable\b/.test(node.meta)) {
      flushProse();
      blocks.push(parseRunnableFence(node.lang, node.meta, node.value, inheritedTracks));
      continue;
    }

    if (!isDirective(node)) {
      proseBuffer.push(nodeSource(node, source));
      continue;
    }

    const attrs = node.attributes ?? {};
    const id = attrs.id ?? undefined;
    const tracks = parseTracks(attrs.tracks) ?? inheritedTracks;

    switch (node.name) {
      case "track": {
        flushProse();
        blocks.push(...expandTrackContainer(node, source, inheritedTracks));
        break;
      }
      case "note":
      case "warning":
      case "pitfall":
      case "insight":
      case "interview":
      case "proof": {
        flushProse();
        blocks.push({
          kind: "callout",
          id,
          variant: node.name,
          title: attrs.title ?? undefined,
          markdown: childrenToMarkdown(node, source),
          tracks,
        });
        break;
      }
      case "figure": {
        flushProse();
        if (!attrs.src) throw new Error(":::figure requires a src attribute");
        if (!attrs.alt) throw new Error(":::figure requires an alt attribute");
        blocks.push({
          kind: "figure",
          id,
          src: attrs.src,
          alt: attrs.alt,
          captionMarkdown: childrenToMarkdown(node, source),
          tracks,
        });
        break;
      }
      case "quiz": {
        flushProse();
        blocks.push({
          kind: "quiz",
          id,
          yaml: childrenToMarkdown(node, source),
          passing: attrs.passing ? Number(attrs.passing) : undefined,
          tracks,
        });
        break;
      }
      case "checkpoint": {
        flushProse();
        blocks.push({
          kind: "checkpoint",
          id,
          markdown: childrenToMarkdown(node, source),
          rubric: parseList(attrs.rubric),
          tracks,
        });
        break;
      }
      case "dataset": {
        flushProse();
        if (!attrs.id) throw new Error(":::dataset requires an id attribute");
        blocks.push({
          kind: "dataset",
          datasetId: attrs.id,
          tables: parseList(attrs.tables),
          tracks,
        });
        break;
      }
      case "exercise": {
        flushProse();
        if (!attrs.ref) throw new Error(":::exercise requires a ref attribute");
        blocks.push({ kind: "exercise", id, ref: attrs.ref, tracks });
        break;
      }
      default:
        throw new Error(`Unknown directive :::${node.name}`);
    }
  }

  flushProse();
  return blocks;
}
