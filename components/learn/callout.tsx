import { cn } from "@/lib/utils";
import { Prose } from "./prose";
import type { CalloutBlock } from "@/lib/curriculum/artifact";

const VARIANTS: Record<
  CalloutBlock["variant"],
  { label: string; wrapper: string; accent: string }
> = {
  note: {
    label: "Note",
    wrapper: "border-slate-400/25 bg-slate-400/5",
    accent: "text-slate-300",
  },
  warning: {
    label: "Watch out",
    wrapper: "border-amber-400/30 bg-amber-500/5",
    accent: "text-amber-300",
  },
  pitfall: {
    label: "Common pitfall",
    wrapper: "border-rose-400/30 bg-rose-500/5",
    accent: "text-rose-300",
  },
  insight: {
    label: "The idea",
    wrapper: "border-indigo-400/30 bg-indigo-500/5",
    accent: "text-indigo-300",
  },
  interview: {
    label: "In an interview",
    wrapper: "border-emerald-400/30 bg-emerald-500/5",
    accent: "text-emerald-300",
  },
  proof: {
    label: "Proof",
    wrapper: "border-violet-400/30 bg-violet-500/5",
    accent: "text-violet-300",
  },
};

export function Callout({ block }: { block: CalloutBlock }) {
  const variant = VARIANTS[block.variant] ?? VARIANTS.note;
  return (
    <aside className={cn("rounded-2xl border px-5 py-4", variant.wrapper)}>
      <p
        className={cn(
          "font-mono text-[11px] uppercase tracking-[0.18em]",
          variant.accent,
        )}
      >
        {block.title ?? variant.label}
      </p>
      <Prose html={block.html} className="mt-2 text-[0.925rem]" />
    </aside>
  );
}
