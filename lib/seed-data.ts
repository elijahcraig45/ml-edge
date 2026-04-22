import { getDateKey } from "@/lib/date";
import type { DailyContentDocument } from "@/lib/types";

const today = getDateKey();

export const FALLBACK_DAILY_CONTENT: DailyContentDocument = {
  date: today,
  headline: "Agentic ML tooling is shifting from demos to durable workflows.",
  technicalSummary:
    "Today's deep dive focuses on how production-grade ML teams compose retrieval, evaluation, and orchestration into one repeatable delivery system. The durable advantage is not the model alone; it is the pipeline that keeps insights fresh, measurable, and cheap enough to run every day.",
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
  quiz: {
    questions: [
      {
        id: "seed-q1",
        prompt:
          "Which system choice most improves long-term reliability for a daily ML learning assistant?",
        options: [
          "Switching models every day",
          "Automating ingestion, generation, storage, and review in one pipeline",
          "Only storing the final summary",
          "Removing persistence to save cost",
        ],
        answerIndex: 1,
        explanation:
          "Reliability comes from repeatable ingestion and persistence, not from model churn or stateless operation.",
      },
      {
        id: "seed-q2",
        prompt:
          "Why is structured quiz output from Gemini more useful than free-form prose for this app?",
        options: [
          "It avoids needing Firestore",
          "It guarantees lower token usage",
          "It can be rendered, validated, and scored without extra parsing logic in the UI",
          "It removes the need for authentication",
        ],
        answerIndex: 2,
        explanation:
          "Structured output lets the UI score answers directly and keeps the cron pipeline predictable.",
      },
      {
        id: "seed-q3",
        prompt: "Which free-tier-friendly deployment pattern best fits this project?",
        options: [
          "A permanently running VM",
          "Cloud Run for the app plus Cloud Scheduler for the daily trigger",
          "A GPU notebook kept online all day",
          "A monolithic on-premise server",
        ],
        answerIndex: 1,
        explanation:
          "Cloud Run scales to zero and Scheduler handles the recurring content update without always-on infrastructure.",
      },
    ],
  },
};

