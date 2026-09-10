"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { CompiledHeading } from "@/lib/curriculum/artifact";

/**
 * Sticky heading rail.
 *
 * Built from the headings the compiler already extracted, so it reflects the
 * *active depth track* — switching to the proof pass adds its headings here
 * too, rather than showing a table of contents that disagrees with the page.
 */
export function LessonToc({ headings }: { headings: CompiledHeading[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (headings.length === 0) return;
    const elements = headings
      .map((h) => document.getElementById(h.slug))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // Bias toward the top of the viewport so the highlighted entry is the
      // section you are reading, not the one just scrolling into view.
      { rootMargin: "-80px 0px -70% 0px" },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 3) return null;

  return (
    <nav
      aria-label="On this page"
      className="hidden xl:block sticky top-20 max-h-[calc(100vh-6rem)] w-56 shrink-0 overflow-y-auto"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-600">
        On this page
      </p>
      <ul className="mt-3 space-y-1.5 border-l border-white/10">
        {headings.map((heading) => (
          <li key={heading.slug}>
            <a
              href={`#${heading.slug}`}
              className={cn(
                "-ml-px block border-l py-0.5 text-xs leading-5 transition-colors",
                heading.depth === 2 ? "pl-3" : "pl-6",
                active === heading.slug
                  ? "border-indigo-400 text-indigo-200"
                  : "border-transparent text-slate-500 hover:text-slate-300",
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
