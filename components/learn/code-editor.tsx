"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { cn } from "@/lib/utils";

export type CodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  language: "python" | "sql";
  readOnly?: boolean;
  minRows?: number;
  ariaLabel: string;
};

/**
 * CodeMirror is loaded lazily, and the fallback is a FULLY FUNCTIONAL textarea
 * rather than a spinner — if the editor bundle never arrives, a learner can
 * still type and run their code. Progressive enhancement, not a loading state.
 */
/**
 * Imported manually rather than through `next/dynamic` so the fallback can be a
 * real, working editor rather than a placeholder: `dynamic`'s `loading` cannot
 * see the component's props, and building the wrapper per-render to close over
 * them creates a new component type on every render.
 */
let editorModule: ComponentType<CodeEditorProps> | null = null;
let editorRequest: Promise<void> | null = null;

function loadEditor(): Promise<void> {
  if (!editorRequest) {
    editorRequest = import("./codemirror-editor")
      .then((mod) => {
        editorModule = mod.default;
      })
      .catch(() => {
        // Leave editorModule null; the textarea keeps working.
      });
  }
  return editorRequest;
}

export function CodeEditor(props: CodeEditorProps) {
  const [Editor, setEditor] = useState<ComponentType<CodeEditorProps> | null>(
    () => editorModule,
  );

  useEffect(() => {
    if (Editor) return;
    let cancelled = false;
    void loadEditor().then(() => {
      if (!cancelled && editorModule) setEditor(() => editorModule);
    });
    return () => {
      cancelled = true;
    };
  }, [Editor]);

  return Editor ? <Editor {...props} /> : <PlainTextEditor {...props} />;
}

/**
 * The fallback, and the reference behaviour.
 *
 * Tab inserts spaces via `setRangeText` rather than by rebuilding the value in
 * React state — the latter wipes the native undo stack, so Ctrl-Z after a Tab
 * did the wrong thing in v1.
 */
export function PlainTextEditor({
  value,
  onChange,
  language,
  readOnly = false,
  minRows = 12,
  ariaLabel,
}: CodeEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Tab") return;
      event.preventDefault();
      const el = ref.current;
      if (!el) return;
      el.setRangeText("    ", el.selectionStart, el.selectionEnd, "end");
      onChange(el.value);
    },
    [onChange],
  );

  return (
    <div className="relative">
      <span className="pointer-events-none absolute right-3 top-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-600">
        {language === "python" ? "solution.py" : "query.sql"}
      </span>
      <textarea
        ref={ref}
        aria-label={ariaLabel}
        value={value}
        readOnly={readOnly}
        rows={minRows}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full resize-y rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 font-mono text-[0.85rem] leading-6 text-slate-100 outline-none",
          "focus:border-indigo-400/40 focus:ring-1 focus:ring-indigo-400/30",
          readOnly && "opacity-70",
        )}
        style={{ tabSize: 4 }}
      />
    </div>
  );
}
