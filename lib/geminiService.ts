import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getRequiredServerEnv } from "@/lib/env";
import type { NewsArticle, QuizQuestion } from "@/lib/types";

type GeminiDailyContent = {
  headline: string;
  technicalSummary: string;
  questions: QuizQuestion[];
};

type GeminiResponseShape = {
  headline?: unknown;
  technicalSummary?: unknown;
  questions?: unknown;
};

function parseJsonPayload(text: string) {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  return JSON.parse(cleaned) as GeminiResponseShape;
}

function normalizeQuestions(value: unknown) {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new Error("Gemini must return exactly 3 quiz questions.");
  }

  return value.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Gemini question ${index + 1} is invalid.`);
    }

    const question = item as Record<string, unknown>;
    const options = Array.isArray(question.options)
      ? question.options.filter(
          (option): option is string => typeof option === "string",
        )
      : [];
    const answerIndex =
      typeof question.answerIndex === "number" ? question.answerIndex : -1;

    if (
      typeof question.prompt !== "string" ||
      typeof question.explanation !== "string" ||
      options.length !== 4 ||
      answerIndex < 0 ||
      answerIndex >= options.length
    ) {
      throw new Error(`Gemini question ${index + 1} failed schema validation.`);
    }

    return {
      id: `generated-question-${index + 1}`,
      prompt: question.prompt,
      options,
      answerIndex,
      explanation: question.explanation,
    } satisfies QuizQuestion;
  });
}

export async function generateDailyDeepDive(
  articles: NewsArticle[],
): Promise<GeminiDailyContent> {
  if (articles.length === 0) {
    throw new Error("At least one article is required to generate daily content.");
  }

  const client = new GoogleGenerativeAI(getRequiredServerEnv("GEMINI_API_KEY"));
  const model = client.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const articleDigest = articles
    .map((article, index) => {
      return `${index + 1}. ${article.title}
Source: ${article.source}
Published: ${article.publishedAt}
Snippet: ${article.description}`;
    })
    .join("\n\n");

  const prompt = `
You are an automated Course Assistant for a software engineer pursuing an MSCS with an ML focus.
Use the AI news snippets below to produce one deeply technical daily lesson and exactly 3 multiple-choice quiz questions.

Return valid JSON matching this schema exactly:
{
  "headline": "string",
  "technicalSummary": "string",
  "questions": [
    {
      "prompt": "string",
      "options": ["string", "string", "string", "string"],
      "answerIndex": 0,
      "explanation": "string"
    }
  ]
}

Requirements:
- Headline: one sentence, dense and technical.
- Technical summary: 2-3 paragraphs, focused on systems, tradeoffs, and implementation implications.
- Questions: difficult but answerable by a software engineer; emphasize ML systems, evaluation, deployment, or retrieval reasoning.
- No markdown fences, no extra keys, no commentary outside the JSON.

Articles:
${articleDigest}
`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text();
  const parsed = parseJsonPayload(raw);

  if (
    typeof parsed.headline !== "string" ||
    typeof parsed.technicalSummary !== "string"
  ) {
    throw new Error("Gemini returned an invalid headline or technical summary.");
  }

  return {
    headline: parsed.headline,
    technicalSummary: parsed.technicalSummary,
    questions: normalizeQuestions(parsed.questions),
  };
}
