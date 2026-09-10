import { Prose } from "./prose";
import type { FigureBlock } from "@/lib/curriculum/artifact";

/** SVG is inlined at build time, so a diagram costs no extra request. */
export function Figure({ block }: { block: FigureBlock }) {
  return (
    <figure className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
      <div
        role="img"
        aria-label={block.alt}
        className="overflow-x-auto [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
        dangerouslySetInnerHTML={{ __html: block.svg }}
      />
      {block.captionHtml ? (
        <figcaption className="mt-3 border-t border-white/10 pt-3">
          <Prose html={block.captionHtml} className="text-sm text-slate-400" />
        </figcaption>
      ) : null}
    </figure>
  );
}
