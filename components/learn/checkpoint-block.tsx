"use client";

import type { CheckpointBlock as CheckpointBlockData } from "@/lib/curriculum/artifact";
import { Prose } from "./prose";

/**
 * Free-text self-assessment. Never auto-graded — the value is in articulating
 * the answer before reading on, and a rubric the learner scores themselves
 * against beats a score they can game.
 */
export function CheckpointBlock({
  block,
  value,
  onChange,
}: {
  block: CheckpointBlockData;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-indigo-400/25 bg-indigo-500/5 px-5 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-indigo-300">
        Say it in your own words
      </p>
      <Prose html={block.promptHtml} className="mt-2 text-sm" />
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder="Write your answer before scrolling on…"
        className="mt-3 w-full resize-y rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-indigo-400/40"
      />
      {block.rubricHtml.length > 0 && value.trim().length > 0 ? (
        <div className="mt-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
            A good answer mentions
          </p>
          <ul className="mt-1.5 space-y-1">
            {block.rubricHtml.map((item, index) => (
              <li key={index} className="flex gap-2 text-xs text-slate-400">
                <span className="text-indigo-400">·</span>
                <span dangerouslySetInnerHTML={{ __html: item }} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
