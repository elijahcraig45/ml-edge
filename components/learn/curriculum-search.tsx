"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type SearchEntry = {
  id: string;
  kind: "lesson" | "problem";
  title: string;
  href: string;
  context: string;
  haystack: string;
};

const INDEX_URL = "/assets/search-index.json";
const MAX_RESULTS = 8;

/**
 * Substring search over a build-time index.
 *
 * The index is fetched on first interaction rather than embedded in the page.
 * It is ~250KB and grows with the curriculum; shipping it inside the RSC
 * payload meant every visitor downloaded it on every page whether or not they
 * ever searched.
 *
 * Deliberately not a search library: a few hundred entries scanned as
 * lowercase substrings is instant, and costs no bundle.
 */
export function CurriculumSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState<SearchEntry[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const container = useRef<HTMLDivElement>(null);

  const loadIndex = useCallback(async () => {
    if (status !== "idle") return;
    setStatus("loading");
    try {
      const response = await fetch(INDEX_URL);
      if (!response.ok) throw new Error(String(response.status));
      setIndex((await response.json()) as SearchEntry[]);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [status]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!index || needle.length < 2) return [];
    return index
      .map((entry) => {
        const titleHit = entry.title.toLowerCase().includes(needle);
        const bodyHit = entry.haystack.includes(needle);
        if (!titleHit && !bodyHit) return null;
        // Title matches rank above body matches; lessons above problems.
        return { entry, score: (titleHit ? 0 : 10) + (entry.kind === "lesson" ? 0 : 1) };
      })
      .filter((r): r is { entry: SearchEntry; score: number } => r !== null)
      .sort((a, b) => a.score - b.score)
      .slice(0, MAX_RESULTS)
      .map((r) => r.entry);
  }, [index, query]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const searching = query.trim().length >= 2;

  return (
    <div ref={container} className="relative w-full max-w-sm">
      <input
        type="search"
        value={query}
        onFocus={() => {
          setOpen(true);
          void loadIndex();
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          void loadIndex();
        }}
        placeholder="Search lessons and problems…"
        aria-label="Search the curriculum"
        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-indigo-400/40"
      />

      {open && searching ? (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-xl shadow-black/40">
          {status === "loading" ? (
            <p className="px-3 py-3 text-xs text-slate-500">Loading the index…</p>
          ) : status === "error" ? (
            <p className="px-3 py-3 text-xs text-rose-300">
              Search index could not be loaded.
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-xs text-slate-500">No matches.</p>
          ) : (
            <ul>
              {results.map((entry) => (
                <li key={`${entry.kind}-${entry.id}`}>
                  <Link
                    href={entry.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-white/5"
                  >
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em]",
                        entry.kind === "lesson"
                          ? "border-indigo-400/30 text-indigo-300"
                          : "border-emerald-400/30 text-emerald-300",
                      )}
                    >
                      {entry.kind}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                      {entry.title}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-slate-600">
                      {entry.context}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
