/** Skeleton shaped like a lesson, so the layout does not jump when it lands. */
export default function LearnLoading() {
  return (
    <div className="animate-pulse px-5 py-8 lg:px-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="h-3 w-32 rounded bg-white/10" />
      <div className="mt-4 h-8 w-2/3 rounded bg-white/10" />
      <div className="mt-8 space-y-3">
        <div className="h-3 w-full rounded bg-white/5" />
        <div className="h-3 w-11/12 rounded bg-white/5" />
        <div className="h-3 w-4/5 rounded bg-white/5" />
      </div>
      <div className="mt-8 h-48 rounded-2xl bg-white/5" />
    </div>
  );
}
