"use client";

import { useEffect, useRef } from "react";
import { EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  HighlightStyle,
  bracketMatching,
  indentUnit,
  syntaxHighlighting,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { python } from "@codemirror/lang-python";
import { sql, PostgreSQL } from "@codemirror/lang-sql";
import type { CodeEditorProps } from "./code-editor";

/**
 * The real editor, loaded lazily behind `code-editor.tsx`.
 *
 * Composed extension by extension rather than via `basicSetup`, which pulls in
 * autocomplete, search, lint and folding — most of the bundle, none of it
 * useful for a twenty-line snippet.
 *
 * `history()` is included specifically so Tab-to-indent no longer destroys the
 * undo stack, which is what the textarea implementation did.
 */

const editorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "transparent",
      color: "#e2e8f0",
      fontSize: "0.85rem",
    },
    ".cm-content": {
      fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
      padding: "0.75rem 0",
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: "#475569",
      border: "none",
      paddingRight: "0.5rem",
    },
    ".cm-activeLine": { backgroundColor: "rgba(148,163,184,0.06)" },
    ".cm-activeLineGutter": { backgroundColor: "transparent", color: "#94a3b8" },
    "&.cm-focused": { outline: "none" },
    ".cm-cursor": { borderLeftColor: "#a5b4fc" },
    ".cm-selectionBackground, ::selection": {
      backgroundColor: "rgba(129,140,248,0.28)",
    },
    ".cm-matchingBracket": {
      backgroundColor: "rgba(129,140,248,0.22)",
      outline: "none",
    },
  },
  { dark: true },
);

/** Tuned to sit alongside the Shiki `github-dark-dimmed` prose blocks. */
const highlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#f47067" },
  { tag: [tags.controlKeyword, tags.moduleKeyword], color: "#f47067" },
  { tag: [tags.definitionKeyword, tags.operatorKeyword], color: "#f47067" },
  { tag: [tags.string, tags.special(tags.string)], color: "#96d0ff" },
  { tag: tags.number, color: "#6cb6ff" },
  { tag: [tags.bool, tags.null], color: "#6cb6ff" },
  { tag: tags.comment, color: "#768390", fontStyle: "italic" },
  { tag: tags.function(tags.variableName), color: "#dcbdfb" },
  { tag: tags.definition(tags.variableName), color: "#adbac7" },
  { tag: tags.propertyName, color: "#dcbdfb" },
  { tag: tags.className, color: "#f69d50" },
  { tag: tags.operator, color: "#f47067" },
  { tag: tags.punctuation, color: "#adbac7" },
]);

function languageExtension(language: CodeEditorProps["language"]): Extension {
  return language === "python" ? python() : sql({ dialect: PostgreSQL });
}

export default function CodeMirrorEditor({
  value,
  onChange,
  language,
  readOnly = false,
  minRows = 12,
  ariaLabel,
}: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  // Kept in a ref so changing the handler never rebuilds the editor.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!host.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        history(),
        bracketMatching(),
        highlightActiveLine(),
        indentUnit.of("    "),
        syntaxHighlighting(highlightStyle),
        languageExtension(language),
        // indentWithTab last so it wins over the default Tab binding.
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        editorTheme,
        EditorView.lineWrapping,
        EditorState.readOnly.of(readOnly),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChangeRef.current(update.state.doc.toString());
        }),
        EditorView.contentAttributes.of({ "aria-label": ariaLabel }),
      ],
    });

    const instance = new EditorView({ state, parent: host.current });
    view.current = instance;
    return () => {
      instance.destroy();
      view.current = null;
    };
    // `value` is intentionally omitted: the editor owns the document after
    // mount, and re-creating it on every keystroke would lose the cursor.
    // External resets are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, readOnly, ariaLabel]);

  // Sync external changes (Reset, loading a saved draft) without clobbering
  // what the learner is currently typing.
  useEffect(() => {
    const instance = view.current;
    if (!instance) return;
    const current = instance.state.doc.toString();
    if (current === value) return;
    instance.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    });
  }, [value]);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute right-3 top-2 z-10 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-600">
        {language === "python" ? "solution.py" : "query.sql"}
      </span>
      <div
        ref={host}
        style={{ minHeight: `${minRows * 1.5 + 1.5}rem` }}
        className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/80 focus-within:border-indigo-400/40"
      />
    </div>
  );
}
