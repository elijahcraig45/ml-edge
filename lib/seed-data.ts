import { getDateKey } from "@/lib/date";
import type { DailyContentDocument } from "@/lib/types";

const today = getDateKey();

export const FALLBACK_DAILY_CONTENT: DailyContentDocument = {
  date: today,
  headline: "Agentic ML tooling is shifting from demos to durable workflows.",
  technicalSummary:
    "Production-grade ML advantage now comes from systems that connect retrieval, evaluation, orchestration, and operational feedback into one durable workflow rather than from isolated model quality alone.",
  deepDive: {
    tldr:
      "Production-grade ML advantage now comes from systems that connect retrieval, evaluation, orchestration, and operational feedback into one durable workflow rather than from isolated model quality alone.",
    themes: [
      {
        title: "Tool use is becoming workflow infrastructure",
        analysis:
          "The important shift is not that agents can call tools, but that teams are standardizing the contracts around those calls. Once tool invocation, state handoff, and auditability become stable interfaces, agentic systems stop being demos and start looking like operable software.",
        sourceArticleNumbers: [1],
      },
      {
        title: "Retrieval quality is now a first-class engineering problem",
        analysis:
          "As more teams ship RAG-style products, the bottleneck moves upstream from generation quality to evidence quality. Chunking, indexing, recall, ranking, and grounding checks increasingly determine whether downstream answers are useful or misleading.",
        sourceArticleNumbers: [2],
      },
      {
        title: "Cheap daily intelligence depends on pipeline discipline",
        analysis:
          "The operational edge comes from keeping ingestion, summarization, evaluation, and delivery inexpensive enough to run every day. That favors architectures with narrow writes, reusable storage artifacts, and clear separation between generated news analysis and authored learning content.",
        sourceArticleNumbers: [1, 2],
      },
    ],
    industryState:
      "The market is moving away from single-model thinking toward end-to-end systems thinking. Teams that can keep signals fresh, grounded, and operationally cheap are the ones most likely to compound quality over time.",
  },
  status: "seeded",
  sourceArticles: [
    {
      title: "LLM agent frameworks are converging on tool-use patterns",
      description:
        "A survey of how orchestration layers standardize reasoning, tool calls, and memory.",
      url: "https://example.com/agent-frameworks",
      source: "Seed Feed",
      publishedAt: today,
    },
    {
      title: "Retrieval evaluation becomes the hidden bottleneck",
      description:
        "Teams are spending more time measuring context quality than model throughput.",
      url: "https://example.com/retrieval-eval",
      source: "Seed Feed",
      publishedAt: today,
    },
  ],
};

