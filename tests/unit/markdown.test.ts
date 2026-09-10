import { describe, expect, it } from "vitest";
import {
  extractHeadings,
  renderMarkdown,
  slugifyHeading,
  toPlainText,
} from "@/lib/curriculum/compile/markdown";

describe("markdown compilation", () => {
  it("highlights fenced code at build time", async () => {
    const html = await renderMarkdown("```python\nx = 1\n```");
    expect(html).toContain('data-language="python"');
    // Per-token spans mean Shiki ran; no highlighter ships to the browser.
    expect(html).toMatch(/<span style="color:/);
  });

  it("renders math to markup rather than leaving raw LaTeX", async () => {
    const html = await renderMarkdown("The bound is $O(n \\log n)$ here.");
    expect(html).toContain("katex");
    expect(html).not.toContain("$O(n");
  });

  it("supports GFM tables", async () => {
    const html = await renderMarkdown("| a | b |\n| - | - |\n| 1 | 2 |");
    expect(html).toContain("<table>");
  });

  it("adds anchors to headings", async () => {
    const html = await renderMarkdown("## Cost models");
    expect(html).toContain('id="cost-models"');
    expect(html).toContain("heading-anchor");
  });
});

describe("heading extraction", () => {
  it("collects h2 to h4 with slugs matching rehype-slug", () => {
    const headings = extractHeadings("# Title\n\n## Cost models\n\n### Big-O\n\n##### Too deep");
    expect(headings).toEqual([
      { depth: 2, text: "Cost models", slug: "cost-models" },
      { depth: 3, text: "Big-O", slug: "big-o" },
    ]);
  });

  it("slugifies punctuation the same way rehype-slug does", () => {
    expect(slugifyHeading("NULL, and three-valued logic")).toBe(
      "null-and-three-valued-logic",
    );
  });
});

describe("plain text extraction", () => {
  it("strips markup for the search index", () => {
    expect(toPlainText("A **bold** claim with `code`.")).toBe("A bold claim with code.");
  });
});

describe("inline markdown", () => {
  it("strips the wrapping paragraph so it can sit inside a label", async () => {
    const { renderInlineMarkdown } = await import(
      "@/lib/curriculum/compile/markdown"
    );
    const html = await renderInlineMarkdown("Use `dict` here");
    expect(html).not.toMatch(/^<p>/);
    expect(html).toContain("<code>dict</code>");
  });

  it("renders math in a quiz option rather than shipping literal LaTeX", async () => {
    const { renderInlineMarkdown } = await import(
      "@/lib/curriculum/compile/markdown"
    );
    const html = await renderInlineMarkdown("The bound is $\\Theta(n^2)$");
    expect(html).toContain("katex");
    expect(html).not.toContain("$\\Theta");
  });

  it("keeps multi-paragraph input intact rather than mangling it", async () => {
    const { renderInlineMarkdown } = await import(
      "@/lib/curriculum/compile/markdown"
    );
    const html = await renderInlineMarkdown("First para.\n\nSecond para.");
    expect(html).toContain("First para.");
    expect(html).toContain("Second para.");
  });
});
