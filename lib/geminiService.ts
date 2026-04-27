import "server-only";

import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import { getRequiredServerEnv } from "@/lib/env";
import type { DailyDeepDive, DailyMiniLesson, MiniLessonSection, NewsArticle } from "@/lib/types";

type GeminiDailyContent = {
  headline: string;
  technicalSummary: string;
  deepDive: DailyDeepDive;
};

type GeminiThemeShape = {
  title?: unknown;
  analysis?: unknown;
  practicalImplication?: unknown;
  sourceArticleNumbers?: unknown;
};

type GeminiResponseShape = {
  headline?: unknown;
  deepDive?: {
    tldr?: unknown;
    themes?: unknown;
    industryState?: unknown;
    keyTakeaways?: unknown;
  };
};

const DAILY_CONTENT_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  required: ["headline", "deepDive"],
  properties: {
    headline: { type: SchemaType.STRING },
    deepDive: {
      type: SchemaType.OBJECT,
      required: ["tldr", "themes", "industryState", "keyTakeaways"],
      properties: {
        tldr: { type: SchemaType.STRING },
        industryState: { type: SchemaType.STRING },
        keyTakeaways: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
        themes: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            required: ["title", "analysis", "practicalImplication", "sourceArticleNumbers"],
            properties: {
              title: { type: SchemaType.STRING },
              analysis: { type: SchemaType.STRING },
              practicalImplication: { type: SchemaType.STRING },
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
    practicalImplication: typeof theme.practicalImplication === "string" ? theme.practicalImplication : undefined,
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
      temperature: 0.3,
      maxOutputTokens: 6000,
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
You are a Senior Machine Learning Engineer and technical analyst writing for an audience of working ML engineers and researchers.
I will provide raw news snippets from the last 24 hours. Generate a rigorous Daily Deep Dive.

Return valid JSON matching this schema exactly:
{
  "headline": "string",
  "deepDive": {
    "tldr": "string",
    "themes": [
      {
        "title": "string",
        "analysis": "string",
        "practicalImplication": "string",
        "sourceArticleNumbers": [1, 2]
      }
    ],
    "industryState": "string",
    "keyTakeaways": ["string"]
  }
}

Requirements:
- headline: One dense, technical sentence grounded in the biggest cross-cutting shift of the day. No hype.
- deepDive.tldr: 3 sentences. What happened, why it's significant, what it changes.
- deepDive.themes: exactly 3 themes. Each theme must:
  - Have a short, specific technical title (not a generic label like "AI Progress").
  - analysis: at least 6 substantial sentences covering: what the development is, the underlying mechanism or architecture involved, why it matters to ML systems in production, what tradeoffs or open questions it surfaces, and how it connects to adjacent work. Include inline citations like [1] or [4] inside the analysis text.
  - practicalImplication: 2-3 sentences specifically for an ML engineer building systems today — what they should watch, reconsider, or act on as a result of this theme.
  - sourceArticleNumbers: array of cited article indices for this theme.
- deepDive.industryState: 4-5 sentences. Step back from the individual stories and describe the broader directional signal — what is the field optimizing for right now, what tensions are visible, and what comes next.
- deepDive.keyTakeaways: exactly 4 short, concrete, actionable takeaways for an ML engineer. Each one should be a single sentence starting with an action verb or a claim that is immediately useful.
- Use at least 5 distinct article numbers across the full response when 5+ articles are provided.
- Rigorous, objective, precise tone. No buzzwords, no marketing language, no vague superlatives.
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
      const themes: DailyDeepDive["themes"] = Array.isArray(deepDive?.themes)
        ? deepDive.themes
            .map(normalizeTheme)
            .filter((item): item is NonNullable<ReturnType<typeof normalizeTheme>> => item !== null)
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

      const keyTakeaways = Array.isArray(deepDive.keyTakeaways)
        ? deepDive.keyTakeaways.filter((item): item is string => typeof item === "string")
        : [];

      return {
        headline: parsed.headline,
        technicalSummary: deepDive.tldr,
        deepDive: {
          tldr: deepDive.tldr,
          themes: themes.slice(0, 3),
          industryState: deepDive.industryState,
          keyTakeaways: keyTakeaways.length > 0 ? keyTakeaways : undefined,
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

const MINI_LESSON_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  required: ["headline", "whyItMatters", "sections", "workedExample", "commonPitfalls", "bridgeToQuiz"],
  properties: {
    headline: { type: SchemaType.STRING },
    whyItMatters: { type: SchemaType.STRING },
    sections: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        required: ["title", "body"],
        properties: {
          title: { type: SchemaType.STRING },
          body: { type: SchemaType.STRING },
        },
      },
    },
    workedExample: { type: SchemaType.STRING },
    commonPitfalls: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    bridgeToQuiz: { type: SchemaType.STRING },
  },
};

type GeminiMiniLessonShape = {
  headline?: unknown;
  whyItMatters?: unknown;
  sections?: unknown;
  workedExample?: unknown;
  commonPitfalls?: unknown;
  bridgeToQuiz?: unknown;
};

export async function generateDailyMiniLesson(
  topic: string,
  quizSummary: string,
  date: string,
): Promise<DailyMiniLesson> {
  const client = new GoogleGenerativeAI(getRequiredServerEnv("GEMINI_API_KEY"));
  const model = client.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: MINI_LESSON_RESPONSE_SCHEMA,
      temperature: 0.4,
      maxOutputTokens: 4000,
    },
  });

  const prompt = `
You are a senior ML/AI engineer writing a short technical lesson for a working software engineer preparing for a multiple-choice quiz.

Topic: "${topic}"
Quiz summary: ${quizSummary}

This lesson is STRICTLY about machine learning, deep learning, or data science fundamentals relevant to building and deploying AI/ML systems. Do NOT include policy, regulation, governance, news, or societal commentary — only technical content an ML engineer can implement or reason about directly.

Generate a mini-lesson that teaches this topic from first principles.

Return valid JSON matching this schema exactly:
{
  "headline": "string",
  "whyItMatters": "string",
  "sections": [{ "title": "string", "body": "string" }],
  "workedExample": "string",
  "commonPitfalls": ["string"],
  "bridgeToQuiz": "string"
}

Requirements:
- headline: One sharp sentence describing the specific technical concept and why a practitioner must understand it.
- whyItMatters: 2-3 sentences explaining the practical engineering consequence of this concept — what breaks or degrades if you get it wrong.
- sections: exactly 3 sections covering distinct layers of the topic (e.g. mathematical foundation → algorithmic mechanism → implementation consideration). Each body is 4-6 sentences. Use precise ML/math terminology, specific shapes/dimensions, or pseudocode where it clarifies. No vague summaries.
- workedExample: A concrete 5-8 sentence example with specific numbers, dataset shapes, or pseudocode. Walk through a real calculation or decision an engineer would make.
- commonPitfalls: exactly 3 one-sentence mistakes engineers actually make with this specific topic, grounded in the technical details above.
- bridgeToQuiz: 1-2 sentences telling the learner exactly what concept or definition to keep in mind as they answer the quiz questions.

Tone: precise, technical, direct. No filler, no policy/news, no marketing language. Full paragraphs only inside bodies.
No markdown fences, no extra keys.
`;

  const raw = (await model.generateContent(prompt)).response.text();

  let parsed: GeminiMiniLessonShape;
  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
    parsed = JSON.parse(cleaned) as GeminiMiniLessonShape;
  } catch {
    throw new Error("Gemini returned invalid JSON for mini-lesson.");
  }

  const sections: MiniLessonSection[] = Array.isArray(parsed.sections)
    ? (parsed.sections as Array<Record<string, unknown>>)
        .filter((s) => typeof s.title === "string" && typeof s.body === "string")
        .map((s) => ({ title: s.title as string, body: s.body as string }))
    : [];

  const commonPitfalls: string[] = Array.isArray(parsed.commonPitfalls)
    ? (parsed.commonPitfalls as unknown[]).filter((p): p is string => typeof p === "string")
    : [];

  if (
    typeof parsed.headline !== "string" ||
    typeof parsed.whyItMatters !== "string" ||
    typeof parsed.workedExample !== "string" ||
    typeof parsed.bridgeToQuiz !== "string" ||
    sections.length < 2 ||
    commonPitfalls.length === 0
  ) {
    throw new Error("Gemini mini-lesson response failed schema validation.");
  }

  return {
    date,
    topic,
    headline: parsed.headline,
    whyItMatters: parsed.whyItMatters,
    sections,
    workedExample: parsed.workedExample,
    commonPitfalls,
    bridgeToQuiz: parsed.bridgeToQuiz,
  };
}
