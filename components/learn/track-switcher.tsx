"use client";

import { cn } from "@/lib/utils";
import { LEARNER_PATHS, type DepthTrack, type LearnerPath } from "@/lib/curriculum/types";

const LABELS: Record<LearnerPath, { title: string; blurb: string }> = {
  core: { title: "Core", blurb: "The lesson itself, nothing optional" },
  interview: { title: "Interview", blurb: "Patterns, recognition triggers, timed drills" },
  graduate: { title: "Graduate", blurb: "Theorems, proofs, formal analysis" },
  systems: { title: "Systems", blurb: "How real engines implement this" },
  everything: { title: "Everything", blurb: "The spine plus every optional pass" },
};

/**
 * One curriculum, three ways through it. The spine is always rendered; a path
 * only adds its own optional blocks, so switching can never hide required
 * content or strand a learner mid-lesson.
 */
export function TrackSwitcher({
  available,
  active,
  onChange,
}: {
  available: DepthTrack[];
  active: LearnerPath;
  onChange: (path: LearnerPath) => void;
}) {
  // Only offer a pass this lesson actually has content for; offering an empty
  // pass makes the selector look broken.
  const options = LEARNER_PATHS.filter((path) => {
    if (path === "core") return true;
    if (path === "everything") return available.length > 2;
    const track = path === "graduate" ? "proof" : path;
    return available.includes(track as DepthTrack);
  });

  if (options.length <= 1) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
        Go deeper
      </span>
      {options.map((path) => (
        <button
          key={path}
          type="button"
          onClick={() => onChange(path)}
          title={LABELS[path].blurb}
          className={cn(
            "rounded-full border px-3.5 py-1 text-xs transition-colors",
            active === path
              ? "border-indigo-400/50 bg-indigo-500/15 text-indigo-100"
              : "border-white/10 text-slate-400 hover:border-slate-500",
          )}
        >
          {LABELS[path].title}
        </button>
      ))}
    </div>
  );
}
