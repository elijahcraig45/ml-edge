import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkDirective from "remark-directive";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings, {
  type Options as AutolinkOptions,
} from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import { toString as mdastToString } from "mdast-util-to-string";
import type { Root as MdastRoot, RootContent } from "mdast";
import type { CompiledHeading } from "../artifact";

/**
 * Markdown -> HTML, run at BUILD TIME only.
 *
 * Nothing in this module reaches the browser: the compiled HTML string is what
 * ships. That is why remark/rehype/Shiki are devDependencies and why prose
 * costs zero client JavaScript.
 */

/** The site is dark-only (`color-scheme: dark`), so one theme is enough. */
const SHIKI_THEME = "github-dark-dimmed";

function baseProcessor() {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkDirective);
}

function htmlProcessor() {
  return baseProcessor()
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: "wrap",
      properties: { className: ["heading-anchor"] },
    } satisfies AutolinkOptions)
    .use(rehypeKatex)
    .use(rehypePrettyCode, {
      theme: SHIKI_THEME,
      // Let the site's own surface colors show through the code block.
      keepBackground: false,
    })
    .use(rehypeStringify, { allowDangerousHtml: true });
}

const processor = htmlProcessor();

/** Compile a markdown fragment to HTML. Used for prose, prompts, captions. */
export async function renderMarkdown(source: string): Promise<string> {
  const file = await processor.process(source);
  return String(file);
}

/**
 * Compile a short fragment for a context that is already inline — a quiz
 * option, an objective, a hint. Strips the wrapping paragraph so the markup
 * can sit inside a <li> or <label> without a stray block box.
 *
 * These fields carry backticks and `$math$` in practice; rendering them as
 * plain text shipped literal `$\Theta(n^2)$` to learners.
 */
export async function renderInlineMarkdown(source: string): Promise<string> {
  const html = await renderMarkdown(source);
  const match = html.trim().match(/^<p>([\s\S]*)<\/p>$/);
  return match ? match[1] : html;
}

/** Compile many fragments, preserving order. */
export async function renderMarkdownAll(sources: string[]): Promise<string[]> {
  return Promise.all(sources.map((s) => renderMarkdown(s)));
}

export async function renderInlineAll(sources: string[]): Promise<string[]> {
  return Promise.all(sources.map((s) => renderInlineMarkdown(s)));
}

/** Strip markdown to plain text for the search index. */
export function toPlainText(source: string): string {
  const tree = baseProcessor().parse(source) as MdastRoot;
  return mdastToString(tree).replace(/\s+/g, " ").trim();
}

/** Extract h2/h3/h4 for the table of contents. Slugs match rehype-slug's. */
export function extractHeadings(source: string): CompiledHeading[] {
  const tree = baseProcessor().parse(source) as MdastRoot;
  const headings: CompiledHeading[] = [];
  visit(tree, "heading", (node) => {
    if (node.depth < 2 || node.depth > 4) return;
    const text = mdastToString(node);
    headings.push({
      depth: node.depth as 2 | 3 | 4,
      text,
      slug: slugifyHeading(text),
    });
  });
  return headings;
}

/** Mirrors github-slugger, which rehype-slug uses. */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}

/** Parse markdown into a top-level node list, for block segmentation. */
export function parseToNodes(source: string): RootContent[] {
  const tree = baseProcessor().parse(source) as MdastRoot;
  return tree.children;
}
