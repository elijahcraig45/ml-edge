import Link from "next/link";
import { Radio, ExternalLink, ArrowRight, BookOpen } from "lucide-react";
import { getSignalHistory } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function SignalHistoryPage() {
  const signals = await getSignalHistory(30);

  return (
    <div className="min-h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            <Radio className="h-3 w-3" />
            Signal archive
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Daily signals
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Each entry is a Gemini-generated deep dive on that day&apos;s top AI/ML
            news. The daily quiz now runs independently from the authored
            foundations bank.
          </p>
        </div>

        {/* Signal list */}
        <div className="space-y-3">
          {signals.map((signal) => {
            const dateLabel = new Date(signal.date).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC",
            });

            return (
              <Link
                key={signal.date}
                href={`/signal/${signal.date}`}
                className="group block rounded-2xl border border-white/8 bg-slate-900/50 p-5 transition-all hover:border-indigo-400/25 hover:bg-slate-900/80"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          signal.status === "generated"
                            ? "bg-emerald-400"
                            : "bg-slate-500"
                        }`}
                      />
                      <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-slate-500">
                        {dateLabel}
                      </p>
                    </div>
                    <h2 className="mt-2 text-sm font-semibold leading-6 text-slate-100 group-hover:text-white">
                      {signal.headline}
                    </h2>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500">
                      {signal.technicalSummary}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-600">
                      {signal.sourceArticles.length > 0 && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          Deep dive
                        </span>
                      )}
                      {signal.sourceArticles.length > 0 && (
                        <span className="flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          {signal.sourceArticles.length} sources
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-600 transition-colors group-hover:text-indigo-300" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
