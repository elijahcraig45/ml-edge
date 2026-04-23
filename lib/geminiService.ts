import "server-only";

import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import { getRequiredServerEnv } from "@/lib/env";
import type { NewsArticle, QuizQuestion, QuestionLevel } from "@/lib/types";

type GeminiQuestion = QuizQuestion & {
  topic: string;
  level: QuestionLevel;
};

type GeminiDailyContent = {
  headline: string;
  technicalSummary: string;
  questions: GeminiQuestion[];
};

type GeminiResponseShape = {
  headline?: unknown;
  technicalSummary?: unknown;
  questions?: unknown;
};

const DAILY_CONTENT_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  required: ["headline", "technicalSummary", "questions"],
  properties: {
    headline: { type: SchemaType.STRING },
    technicalSummary: { type: SchemaType.STRING },
    questions: {
      type: SchemaType.ARRAY,
      minItems: 3,
      maxItems: 3,
      items: {
        type: SchemaType.OBJECT,
        required: [
          "prompt",
          "options",
          "answerIndex",
          "explanation",
          "topic",
          "level",
        ],
        properties: {
          prompt: { type: SchemaType.STRING },
          options: {
            type: SchemaType.ARRAY,
            minItems: 4,
            maxItems: 4,
            items: { type: SchemaType.STRING },
          },
          answerIndex: { type: SchemaType.INTEGER },
          explanation: { type: SchemaType.STRING },
          topic: { type: SchemaType.STRING },
          level: { type: SchemaType.STRING },
        },
      },
    },
  },
};

function parseJsonPayload(text: string) {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  return JSON.parse(cleaned) as GeminiResponseShape;
}

async function parseWithRepair(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  text: string,
) {
  try {
    return parseJsonPayload(text);
  } catch {
    const repairPrompt = `
You are a strict JSON formatter.
Fix the payload below so it becomes valid JSON matching this schema exactly:
{
  "headline": "string",
  "technicalSummary": "string",
  "questions": [
    {
      "prompt": "string",
      "options": ["string", "string", "string", "string"],
      "answerIndex": 0,
      "explanation": "string",
      "topic": "string",
      "level": "foundational | intermediate | advanced"
    }
  ]
}

Return JSON only. Do not add markdown fences.

Payload:
${text}
`;
    const repaired = await model.generateContent(repairPrompt);
    return parseJsonPayload(repaired.response.text());
  }
}

const VALID_LEVELS = new Set<string>(["foundational", "intermediate", "advanced"]);

function normalizeQuestions(value: unknown): GeminiQuestion[] {
  if (!Array.isArray(value) || value.length < 3) {
    throw new Error("Gemini must return at least 3 quiz questions.");
  }

  return value.slice(0, 3).map((item, index) => {
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

    const rawLevel = question.level;
    const level: QuestionLevel =
      typeof rawLevel === "string" && VALID_LEVELS.has(rawLevel)
        ? (rawLevel as QuestionLevel)
        : "intermediate";

    return {
      id: `generated-question-${index + 1}`,
      prompt: question.prompt,
      options,
      answerIndex,
      explanation: question.explanation,
      topic:
        typeof question.topic === "string" ? question.topic : "Machine Learning",
      level,
    } satisfies GeminiQuestion;
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
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: DAILY_CONTENT_RESPONSE_SCHEMA,
      temperature: 0.2,
      maxOutputTokens: 2200,
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
You are a Senior Machine Learning Engineer and technical analyst.
I will provide a list of raw news snippets from the last 24 hours.
Generate a Daily Deep Dive for software engineers and ML researchers.

Return valid JSON matching this schema exactly:
{
  "headline": "string",
  "technicalSummary": "string",
  "questions": [
    {
      "prompt": "string",
      "options": ["string", "string", "string", "string"],
      "answerIndex": 0,
      "explanation": "string",
      "topic": "string",
      "level": "foundational | intermediate | advanced"
    }
  ]
}

Requirements:
- Headline: one sentence, dense and technical, grounded in the biggest cross-cutting shift of the day.
- Technical summary: a structured plaintext report with these sections in order:
  TL;DR:
  Theme 1:
  Theme 2:
  Theme 3:
  Industry state:
  Each theme must explain both WHY this matters and HOW it works (architecture, math, infra, library/runtime implications).
- Use a rigorous, objective tone. Avoid hype, buzzwords, and marketing phrasing.
- Explicitly reference article numbers in each theme (for example, "[1], [4], [7]").
- Use at least 4 distinct article numbers across the full technical summary when 4+ articles are provided.
- Questions: exactly 3 challenging technical MCQs that test comprehension of these specific developments.
- topic: a short noun phrase describing the ML concept tested (e.g. "Transformer attention", "RAG pipelines", "Model quantization").
- level: classify each question as foundational (core concept), intermediate (applied reasoning), or advanced (systems/research depth).
- No markdown fences, no extra keys, no commentary outside the JSON.

Articles:
${articleDigest}
`;

  let raw = (await model.generateContent(prompt)).response.text();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const parsed = await parseWithRepair(model, raw);

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
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === 1) {
        break;
      }

      const retryPrompt = `
The previous output failed schema validation: ${lastError.message}
Regenerate the full response as strict JSON only.
You must include exactly 3 questions and preserve the same required schema.
Do not include markdown fences.

Articles:
${articleDigest}
`;
      raw = (await model.generateContent(retryPrompt)).response.text();
    }
  }

  throw new Error(
    `Gemini failed to produce valid daily content after retry: ${lastError?.message ?? "unknown error"}.`,
  );
}

