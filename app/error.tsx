"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Last-resort boundary.
 *
 * The runtimes are the most likely source of an unhandled failure — a wasm
 * download blocked by a network, or a worker that could not start — so the copy
 * points at that first rather than saying "something went wrong".
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ml-edge] unhandled error:", error);
  }, [error]);

  return (
    <div className="px-6 py-20 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-rose-300">
        Something broke
      </p>
      <h1 className="mt-3 text-2xl font-semibold text-slate-100">
        This page hit an error
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
        If you were running code, the most likely cause is that the Python or
        SQL runtime could not be downloaded — check your connection, or whether
        a network policy blocks <code className="text-slate-300">cdn.jsdelivr.net</code>.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-[11px] text-slate-600">
          Reference: {error.digest}
        </p>
      ) : null}
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-5 py-2.5 text-sm text-indigo-100 hover:border-indigo-300"
        >
          Try again
        </button>
        <Link
          href="/learn"
          className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-slate-300 hover:border-slate-500"
        >
          Back to the ladder
        </Link>
      </div>
    </div>
  );
}
