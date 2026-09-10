"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fires once when the element first approaches the viewport.
 *
 * Used to defer runtime downloads. v1 booted Pyodide on mount for every runner
 * on the page, which meant a lesson paid for the interpreter whether or not
 * the learner ever scrolled to an exercise.
 */
export function useLazyVisible(rootMargin = "400px") {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const element = ref.current;
    if (!element) return;

    if (typeof IntersectionObserver === "undefined") {
      // jsdom and very old browsers: load eagerly rather than never. Deferred a
      // tick so this is not a synchronous setState inside the effect body.
      queueMicrotask(() => setVisible(true));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible, rootMargin]);

  return { ref, visible };
}
