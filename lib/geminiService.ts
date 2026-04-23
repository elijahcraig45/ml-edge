import "server-only";

import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import { getRequiredServerEnv } from "@/lib/env";
import type { DailyDeepDive, NewsArticle } from "@/lib/types";

type GeminiDailyContent = {
  headline: string;
  technicalSummary: string;
  deepDive: DailyDeepDive;
};

type GeminiThemeShape = {
  title?: unknown;
  analysis?: unknown;
  sourceArticleNumbers?: unknown;
};

type GeminiResponseShape = {
  headline?: unknown;
  deepDive?: {
    tldr?: unknown;
    themes?: unknown;
    industryState?: unknown;
  };
};

const DAILY_CONTENT_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  required: ["headline", "deepDive"],
  properties: {
    headline: { type: SchemaType.STRING },
    deepDive: {
      type: SchemaType.OBJECT,
      required: ["tldr", "themes", "industryState"],
      properties: {
        tldr: { type: SchemaType.STRING },
        industryState: { type: SchemaType.STRING },
        themes: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            required: ["title", "analysis", "sourceArticleNumbers"],
            properties: {
              title: { type: SchemaType.STRING },
              analysis: { type: SchemaType.STRING },
              sourceArticleNumbers: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.INTEGER },
              },
            },
          },
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
  "deepDive": {
    "tldr": "string",
    "themes": [
      {
        "title": "string",
        "analysis": "string",
        "sourceArticleNumbers": [1, 2]
      }
    ],
    "industryState": "string"
  }
}

Return JSON only. Do not add markdown fences.

Payload:
${text}
`;
    const repaired = await model.generateContent(repairPrompt);
    return parseJsonPayload(repaired.response.text());
  }
}

function normalizeTheme(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const theme = value as GeminiThemeShape;
  const sourceArticleNumbers = Array.isArray(theme.sourceArticleNumbers)
    ? theme.sourceArticleNumbers.filter(
        (item): item is number => typeof item === "number" && Number.isInteger(item),
      )
    : [];

  if (
    typeof theme.title !== "string" ||
    typeof theme.analysis !== "string" ||
    sourceArticleNumbers.length === 0
  ) {
    return null;
  }

  return {
    title: theme.title,
    analysis: theme.analysis,
    sourceArticleNumbers: [...new Set(sourceArticleNumbers)].sort((left, right) => left - right),
  };
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
      maxOutputTokens: 2600,
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
  "deepDive": {
    "tldr": "string",
    "themes": [
      {
        "title": "string",
        "analysis": "string",
        "sourceArticleNumbers": [1, 2]
      }
    ],
    "industryState": "string"
  }
}

Requirements:
- Headline: one sentence, dense and technical, grounded in the biggest cross-cutting shift of the day.
- deepDive.tldr: 2-3 sentences, concise but technical.
- deepDive.themes: exactly 3 themes. Each theme must have:
  - a short technical title
  - analysis of at least 4 sentences
  - both WHY it matters and HOW it works
  - architectural, mathematical, systems, library, infra, or runtime implications
  - inline citations like [1], [4], [7] inside the analysis text
  - sourceArticleNumbers listing the cited article numbers for that theme
- deepDive.industryState: 3-4 sentences describing what today's mix of stories says about the direction of the field.
- Use at least 4 distinct article numbers across the full response when 4+ articles are provided.
- Use a rigorous, objective tone. Avoid hype, buzzwords, and marketing phrasing.
- Do not turn the deep dive into a single TL;DR or a short recap. It must read like a serious technical analysis.
- No markdown fences, no extra keys, no commentary outside the JSON.

Articles:
${articleDigest}
`;

  let raw = (await model.generateContent(prompt)).response.text();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const parsed = await parseWithRepair(model, raw);
      const deepDive =
        parsed.deepDive && typeof parsed.deepDive === "object" ? parsed.deepDive : null;
      const themes = Array.isArray(deepDive?.themes)
        ? deepDive.themes
            .map(normalizeTheme)
            .filter((item): item is DailyDeepDive["themes"][number] => item !== null)
        : [];

      if (
        typeof parsed.headline !== "string" ||
        !deepDive ||
        typeof deepDive.tldr !== "string" ||
        typeof deepDive.industryState !== "string" ||
        themes.length < 3
      ) {
        throw new Error("Gemini returned an invalid deep-dive payload.");
      }

      return {
        headline: parsed.headline,
        technicalSummary: deepDive.tldr,
        deepDive: {
          tldr: deepDive.tldr,
          themes: themes.slice(0, 3),
          industryState: deepDive.industryState,
        },
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === 1) {
        break;
      }

      const retryPrompt = `
The previous output failed schema validation: ${lastError.message}
Regenerate the full response as strict JSON only.
Preserve the same schema exactly.
Return exactly 3 deepDive themes.
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
