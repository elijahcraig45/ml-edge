import Link from "next/link";

export default function NotFound() {
  return (
    <div className="px-6 py-20 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-indigo-300">
        404
      </p>
      <h1 className="mt-3 text-2xl font-semibold text-slate-100">
        Nothing here
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
        That page doesn&apos;t exist. The curriculum ships one stage at a time,
        so it may not have been written yet.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/learn"
          className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-5 py-2.5 text-sm text-indigo-100 hover:border-indigo-300"
        >
          The ladder
        </Link>
        <Link
          href="/problems"
          className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-slate-300 hover:border-slate-500"
        >
          Problem bank
        </Link>
      </div>
    </div>
  );
}
