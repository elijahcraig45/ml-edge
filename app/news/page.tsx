import { Panel } from "@/components/ui/panel";
import { getDailyContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const dailyContent = await getDailyContent();

  return (
    <div className="console-grid min-h-full overflow-y-auto p-6 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Panel eyebrow="AI news feed" title={dailyContent.headline}>
          <p className="text-sm leading-7 text-slate-300">
            The news pipeline pulls current AI headlines, then Gemini condenses the
            signal into a technical learning brief and quiz.
          </p>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Panel eyebrow="Technical summary" title="Daily deep dive">
            <p className="whitespace-pre-line text-sm leading-7 text-slate-300">
              {dailyContent.technicalSummary}
            </p>
          </Panel>

          <Panel
            eyebrow="Ingested sources"
            title={`${dailyContent.sourceArticles.length} tracked articles`}
          >
            <div className="space-y-4">
              {dailyContent.sourceArticles.map((article) => (
                <a
                  key={article.url}
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-3xl border border-white/10 bg-slate-900/60 p-4 hover:border-indigo-400/40 hover:bg-slate-900"
                >
                  <p className="text-sm font-semibold text-slate-100">
                    {article.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {article.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    <span>{article.source}</span>
                    <span>{article.publishedAt.slice(0, 10)}</span>
                  </div>
                </a>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
