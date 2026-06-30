"use client";

import { Download, FlaskConical, Clock } from "lucide-react";
import type { PracticeNotebook } from "@/lib/hosted-lessons";

type Props = {
  notebooks: PracticeNotebook[];
};

export function LessonNotebooksPanel({ notebooks }: Props) {
  if (notebooks.length === 0) return null;

  return (
    <div className="mt-8 rounded-2xl border border-violet-500/20 bg-violet-950/20 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="rounded-lg bg-violet-500/20 p-1.5">
          <FlaskConical className="h-4 w-4 text-violet-300" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Practice Labs</p>
          <p className="text-xs text-slate-400">
            Jupyter notebooks — download, open in Jupyter, and run alongside this lesson
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {notebooks.map((nb) => (
          <div
            key={nb.filename}
            className="flex items-start justify-between gap-4 rounded-xl border border-white/6 bg-slate-950/50 p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-100">{nb.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{nb.description}</p>
              {nb.duration && (
                <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
                  <Clock className="h-3 w-3" />
                  {nb.duration}
                </div>
              )}
            </div>
            <a
              href={`/notebooks/${nb.filename}`}
              download={nb.filename}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300 transition-colors hover:bg-violet-500/20 hover:text-violet-200"
            >
              <Download className="h-3 w-3" />
              Download
            </a>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] text-slate-600">
        Run with: <code className="font-mono text-slate-500">python3 -m jupyter notebook</code> — requires jupyter, numpy, sentence-transformers
      </p>
    </div>
  );
}
