import Link from "next/link";

export default function LearnNotFound() {
  return (
    <div className="px-6 py-16 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-indigo-300">
        404
      </p>
      <h1 className="mt-3 text-xl font-semibold text-slate-100">
        That lesson isn&apos;t published yet
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
        The curriculum ships one stage at a time, so this page may not exist yet.
      </p>
      <Link
        href="/learn"
        className="mt-6 inline-block rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-5 py-2.5 text-sm text-indigo-100 hover:border-indigo-300"
      >
        Back to the ladder
      </Link>
    </div>
  );
}
