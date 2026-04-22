import { GoogleGenerativeAI } from "@google/generative-ai";
import { getRequiredServerEnv } from "@/lib/env";
import type {
  CurriculumExercise,
  CurriculumLibraryLesson,
  CurriculumTrackLabel,
  CurriculumVideo,
  GradingCriterion,
  IngestedQuizQuestion,
  LessonCoreTheory,
  LessonVideoScript,
  SourceFormat,
} from "@/lib/types";

export type IngestedCurriculumLesson = CurriculumLibraryLesson;

export type LessonIngestionInput = {
  sourceText: string;
  sourceFormat: SourceFormat;
  sourceTitle?: string;
  lessonId?: string;
  courseTitle?: string;
  moduleTitle?: string;
  targetAudience?: string;
  duration?: string;
  curriculumTrack?: CurriculumTrackLabel;
  practiceProblemCount?: number;
  sourcePath?: string;
  repository?: string;
  allowRepair?: boolean;
};

type GenerativeModelLike = {
  generateContent: (prompt: string) => Promise<{
    response: {
      text(): string;
    };
  }>;
};

export type IngestedLessonResult = {
  lesson: IngestedCurriculumLesson;
  requestCount: number;
};

export class IngestLessonError extends Error {
  requestCount: number;

  constructor(message: string, requestCount: number) {
    super(message);
    this.name = "IngestLessonError";
    this.requestCount = requestCount;
  }
}

type GeminiEquation = {
  latex?: unknown;
  explanation?: unknown;
};

type GeminiLab = {
  title?: unknown;
  brief?: unknown;
  deliverables?: unknown;
  starterPrompts?: unknown;
  gradingRubric?: unknown;
};

type GeminiQuestion = {
  prompt?: unknown;
  options?: unknown;
  answerIndex?: unknown;
  explanation?: unknown;
  optionRationales?: unknown;
};

type GeminiVideoScript = {
  intro?: unknown;
  coreConcept?: unknown;
  outro?: unknown;
};

type GeminiLessonShape = {
  title?: unknown;
  summary?: unknown;
  duration?: unknown;
  sections?: unknown;
  takeaways?: unknown;
  briefing?: unknown;
  coreTheory?: {
    equations?: unknown;
    whyThisMattersForYourMasters?: unknown;
  };
  softwareEngineersLab?: GeminiLab;
  practiceProblems?: unknown;
  questions?: unknown;
  videoScript?: GeminiVideoScript;
  youtubeSearchQuery?: unknown;
  dailyEdge?: unknown;
};

export const DEFAULT_INGEST_MODEL = "gemini-flash-latest";

export function resolveIngestModel() {
  const configuredModel =
    process.env.GEMINI_INGEST_MODEL ??
    process.env.GEMINI_MODEL ??
    DEFAULT_INGEST_MODEL;

  return configuredModel.trim();
}

function repairJsonEscapes(value: string) {
  return value.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
}

function removeTrailingCommas(value: string) {
  return value.replace(/,\s*([}\]])/g, "$1");
}

function parseJsonCandidate(value: string) {
  return JSON.parse(value) as GeminiLessonShape;
}

function parseJsonPayload(text: string) {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const candidate =
    start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;

  try {
    return parseJsonCandidate(candidate);
  } catch {
    const repairedCandidate = removeTrailingCommas(repairJsonEscapes(candidate));
    return parseJsonCandidate(repairedCandidate);
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function requireString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Gemini field "${field}" must be a non-empty string.`);
  }

  return value.trim();
}

function requireStringArray(
  value: unknown,
  field: string,
  min: number,
  max?: number,
) {
  if (!Array.isArray(value)) {
    throw new Error(`Gemini field "${field}" must be an array of strings.`);
  }

  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (items.length < min || (typeof max === "number" && items.length > max)) {
    throw new Error(
      `Gemini field "${field}" must contain between ${min} and ${max ?? "many"} strings.`,
    );
  }

  return items;
}

function normalizeRubric(
  value: unknown,
  field: string,
  minimumItems = 3,
): GradingCriterion[] {
  if (!Array.isArray(value) || value.length < minimumItems) {
    throw new Error(
      `Gemini field "${field}" must contain at least ${minimumItems} rubric items.`,
    );
  }

  return value.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Rubric item ${index + 1} in "${field}" is invalid.`);
    }

    const record = item as Record<string, unknown>;
    const parsedPoints =
      typeof record.points === "number"
        ? record.points
        : typeof record.points === "string"
          ? Number(record.points)
          : Number.NaN;

    return {
      criterion: requireString(record.criterion, `${field}[${index}].criterion`),
      points: Number.isFinite(parsedPoints) && parsedPoints > 0 ? parsedPoints : 1,
      description: requireString(
        record.description,
        `${field}[${index}].description`,
      ),
    };
  });
}

function ensureMinimumRubricItems(
  items: GradingCriterion[],
  minimumItems: number,
): GradingCriterion[] {
  if (items.length >= minimumItems) {
    return items;
  }

  const fallbackRubric: GradingCriterion[] = [
    {
      criterion: "Technical correctness",
      points: 4,
      description: "The implementation or analysis is correct, consistent, and technically sound.",
    },
    {
      criterion: "Engineering quality",
      points: 3,
      description: "The work is structured clearly, uses sensible abstractions, and is easy to reason about.",
    },
    {
      criterion: "Explanation and reflection",
      points: 3,
      description: "The solution explains why the method works, what assumptions it makes, and where it can fail.",
    },
  ];

  return [...items, ...fallbackRubric.slice(items.length, minimumItems)];
}

function normalizeTheory(value: GeminiLessonShape["coreTheory"]): LessonCoreTheory {
  if (!value || typeof value !== "object") {
    throw new Error('Gemini field "coreTheory" is missing.');
  }

  const equations = Array.isArray(value.equations) ? value.equations : [];

  if (equations.length < 2 || equations.length > 3) {
    throw new Error('Gemini field "coreTheory.equations" must contain 2-3 equations.');
  }

  return {
    equations: equations.map((item, index) => {
      const equation = item as GeminiEquation;

      return {
        latex: requireString(equation.latex, `coreTheory.equations[${index}].latex`),
        explanation: requireString(
          equation.explanation,
          `coreTheory.equations[${index}].explanation`,
        ),
      };
    }),
    whyThisMattersForYourMasters: requireString(
      value.whyThisMattersForYourMasters,
      "coreTheory.whyThisMattersForYourMasters",
    ),
  };
}

function normalizeLab(value: GeminiLab | undefined): CurriculumExercise {
  if (!value || typeof value !== "object") {
    throw new Error('Gemini field "softwareEngineersLab" is missing.');
  }

  const gradingRubric = ensureMinimumRubricItems(
    normalizeRubric(
      value.gradingRubric,
      "softwareEngineersLab.gradingRubric",
      1,
    ),
    3,
  );

  return {
    id: "software-engineers-lab",
    title: requireString(value.title, "softwareEngineersLab.title"),
    type: "lab",
    brief: requireString(value.brief, "softwareEngineersLab.brief"),
    deliverables: requireStringArray(
      value.deliverables,
      "softwareEngineersLab.deliverables",
      3,
      6,
    ),
    starterPrompts: requireStringArray(
      value.starterPrompts,
      "softwareEngineersLab.starterPrompts",
      2,
      5,
    ),
    gradingRubric,
  };
}

function normalizePracticeProblems(
  value: unknown,
  expectedCount: number,
): CurriculumExercise[] {
  if (expectedCount === 0) {
    return [];
  }

  if (!Array.isArray(value) || value.length !== expectedCount) {
    throw new Error(
      `Gemini field "practiceProblems" must contain exactly ${expectedCount} items.`,
    );
  }

  return value.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Practice problem ${index + 1} is invalid.`);
    }

    const problem = item as GeminiLab;

    return {
      id: `practice-problem-${index + 1}`,
      title: requireString(problem.title, `practiceProblems[${index}].title`),
      type: "analysis",
      brief: requireString(problem.brief, `practiceProblems[${index}].brief`),
      deliverables: requireStringArray(
        problem.deliverables,
        `practiceProblems[${index}].deliverables`,
        1,
        5,
      ),
      starterPrompts: requireStringArray(
        problem.starterPrompts,
        `practiceProblems[${index}].starterPrompts`,
        1,
        5,
      ),
      gradingRubric: normalizeRubric(
        problem.gradingRubric,
        `practiceProblems[${index}].gradingRubric`,
        1,
      ),
    };
  });
}

function normalizeQuestions(value: unknown): IngestedQuizQuestion[] {
  if (!Array.isArray(value) || value.length !== 5) {
    throw new Error("Gemini must return exactly 5 quiz questions.");
  }

  return value.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Gemini question ${index + 1} is invalid.`);
    }

    const question = item as GeminiQuestion;
    const options = requireStringArray(question.options, `questions[${index}].options`, 4, 4);
    const optionRationales = requireStringArray(
      question.optionRationales,
      `questions[${index}].optionRationales`,
      4,
      4,
    );
    const answerIndex =
      typeof question.answerIndex === "number" ? question.answerIndex : -1;

    if (answerIndex < 0 || answerIndex >= options.length) {
      throw new Error(`Gemini question ${index + 1} has an invalid answerIndex.`);
    }

    return {
      id: `ingested-question-${index + 1}`,
      prompt: requireString(question.prompt, `questions[${index}].prompt`),
      options,
      answerIndex,
      explanation: requireString(
        question.explanation,
        `questions[${index}].explanation`,
      ),
      optionRationales,
    };
  });
}

function normalizeVideoScript(value: GeminiVideoScript | undefined): LessonVideoScript {
  if (!value || typeof value !== "object") {
    throw new Error('Gemini field "videoScript" is missing.');
  }

  return {
    intro: requireStringArray(value.intro, "videoScript.intro", 2, 5),
    coreConcept: requireStringArray(
      value.coreConcept,
      "videoScript.coreConcept",
      3,
      7,
    ),
    outro: requireStringArray(value.outro, "videoScript.outro", 2, 4),
  };
}

function buildScriptVideo(
  title: string,
  videoScript: LessonVideoScript,
): CurriculumVideo {
  return {
    kind: "script",
    title,
    objective: "A 2-minute direct explainer for the lesson's main sub-topic.",
    outline: [
      ...videoScript.intro.map((line) => `Intro: ${line}`),
      ...videoScript.coreConcept.map((line) => `Core concept: ${line}`),
      ...videoScript.outro.map((line) => `Outro: ${line}`),
    ],
  };
}

function clipSourceText(value: string, limit = 24000) {
  const trimmed = value.trim();

  if (trimmed.length <= limit) {
    return trimmed;
  }

  return `${trimmed.slice(0, limit)}\n\n[truncated for ingestion]`;
}

function buildPrompt(input: LessonIngestionInput) {
  const sourceContext = clipSourceText(input.sourceText);
  const practiceProblemCount = input.practiceProblemCount ?? 0;
  const includePracticeProblems = practiceProblemCount > 0;

  return `
You are a Georgia Tech TA who is also a Senior Staff Engineer at Google.
You are direct, zero-fluff, rigorous, and allergic to vague pedagogy.

Task:
Transform the raw technical source into a single high-utility ML lesson for a senior software engineer preparing for graduate-level ML work.

Source metadata:
- Source format: ${input.sourceFormat}
- Source title: ${input.sourceTitle ?? "Untitled source"}
- Course title: ${input.courseTitle ?? "Unspecified course"}
- Module title: ${input.moduleTitle ?? "Unspecified module"}
- Target audience: ${input.targetAudience ?? "Senior software engineer preparing for a Georgia Tech ML track"}
- Curriculum track: ${input.curriculumTrack ?? "Unspecified"}
- Repository: ${input.repository ?? "Unspecified"}
- Source path: ${input.sourcePath ?? "Unspecified"}

Return strict JSON only. No markdown fences. No commentary.

Return this exact JSON shape:
{
  "title": "string",
  "summary": "string",
  "duration": "string",
  "sections": ["string", "string", "string"],
  "takeaways": ["string", "string", "string"],
  "briefing": ["paragraph 1", "paragraph 2", "paragraph 3"],
  "coreTheory": {
    "equations": [
      {
        "latex": "string",
        "explanation": "string"
      }
    ],
    "whyThisMattersForYourMasters": "string"
  },
  "softwareEngineersLab": {
    "title": "string",
    "brief": "string",
    "deliverables": ["string", "string", "string"],
    "starterPrompts": ["string", "string"],
    "gradingRubric": [
      {
        "criterion": "string",
        "points": 1,
        "description": "string"
      }
    ]
  },
  ${
    includePracticeProblems
      ? `"practiceProblems": [
    {
      "title": "string",
      "brief": "string",
      "deliverables": ["string", "string"],
      "starterPrompts": ["string", "string"],
      "gradingRubric": [
        {
          "criterion": "string",
          "points": 1,
          "description": "string"
        }
      ]
    }
  ],`
      : ""
  }
  "questions": [
    {
      "prompt": "string",
      "options": ["string", "string", "string", "string"],
      "answerIndex": 0,
      "explanation": "string",
      "optionRationales": ["string", "string", "string", "string"]
    }
  ],
  "videoScript": {
    "intro": ["string", "string"],
    "coreConcept": ["string", "string", "string"],
    "outro": ["string", "string"]
  },
  "youtubeSearchQuery": "string",
  "dailyEdge": "string"
}

Requirements:
- "briefing" must be exactly 3 paragraphs aimed at a senior SWE.
- "coreTheory.equations" must contain 2 or 3 LaTeX equations, each chosen for conceptual importance rather than decoration.
- "whyThisMattersForYourMasters" must explicitly connect the theory to graduate-level ML reasoning.
- "softwareEngineersLab" must be a Python implementation task, concrete enough to build immediately.
- Categorize the material through the explicit curriculum track above. If the source is math/theory heavy, think like a Science Track TA. If it is notebook/code heavy, think like a Functional Track TA.
  ${
    includePracticeProblems
      ? `- "practiceProblems" must contain exactly ${practiceProblemCount} unique practice problems for this chapter, all non-duplicative and progressively useful.`
      : ""
  }
- "questions" must be exactly 5 difficult ML interview-style multiple-choice questions.
- Each question must include detailed reasoning in "optionRationales" for every option, not just the correct one.
- "videoScript" must support a 2-minute explainer with intro, core concept, and outro beats.
- "youtubeSearchQuery" must target either "GATech lecture style" or "visual intuition" for the specific sub-topic.
- "dailyEdge" must be a one-sentence did-you-know snippet tied to the lesson.
- Keep the lesson technically grounded, implementation-aware, and useful to a practicing engineer.
- The output should fit naturally into an existing curriculum lesson document for Firestore.

Raw source:
${sourceContext}
`;
}

function buildJsonRepairPrompt(rawResponse: string, parseError: string) {
  return `
You repair malformed JSON generated for a curriculum-ingestion pipeline.
Return valid JSON only. No markdown fences. No commentary.
Do not change the lesson meaning, remove fields, or invent new sections.
Only fix JSON syntax and escaping issues so the payload parses as strict JSON.

Parser error:
${parseError}

Malformed JSON candidate:
${rawResponse}
`;
}

async function parseGeminiLessonPayload(
  model: GenerativeModelLike,
  rawResponse: string,
  allowRepair: boolean,
) {
  try {
    return {
      parsed: parseJsonPayload(rawResponse),
      requestCount: 1,
    };
  } catch (error) {
    if (!allowRepair) {
      throw new IngestLessonError(
        error instanceof Error ? error.message : String(error),
        1,
      );
    }

    const parseError = error instanceof Error ? error.message : String(error);
    try {
      const repairResult = await model.generateContent(
        buildJsonRepairPrompt(rawResponse, parseError),
      );
      const repairedRaw = repairResult.response.text();

      return {
        parsed: parseJsonPayload(repairedRaw),
        requestCount: 2,
      };
    } catch (repairError) {
      throw new IngestLessonError(
        repairError instanceof Error ? repairError.message : String(repairError),
        2,
      );
    };
  }
}

export async function ingestLessonSource(
  input: LessonIngestionInput,
): Promise<IngestedLessonResult> {
  if (input.sourceText.trim().length === 0) {
    throw new Error("sourceText is required for curriculum ingestion.");
  }

  const client = new GoogleGenerativeAI(getRequiredServerEnv("GEMINI_API_KEY"));
  const model = client.getGenerativeModel({
    model: resolveIngestModel(),
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  let raw: string;

  try {
    const result = await model.generateContent(buildPrompt(input));
    raw = result.response.text();
  } catch (error) {
    throw new IngestLessonError(
      error instanceof Error ? error.message : String(error),
      1,
    );
  }

  const { parsed, requestCount } = await parseGeminiLessonPayload(
    model,
    raw,
    input.allowRepair !== false,
  );

  const title = requireString(parsed.title, "title");
  const summary = requireString(parsed.summary, "summary");
  const duration = requireString(parsed.duration, "duration");
  const sections = requireStringArray(parsed.sections, "sections", 3, 6);
  const takeaways = requireStringArray(parsed.takeaways, "takeaways", 3, 5);
  const briefing = requireStringArray(parsed.briefing, "briefing", 3, 3) as [
    string,
    string,
    string,
  ];
  const coreTheory = normalizeTheory(parsed.coreTheory);
  const softwareEngineersLab = normalizeLab(parsed.softwareEngineersLab);
  const practiceProblems = normalizePracticeProblems(
    parsed.practiceProblems,
    input.practiceProblemCount ?? 0,
  );
  const questions = normalizeQuestions(parsed.questions);
  const videoScript = normalizeVideoScript(parsed.videoScript);
  const youtubeSearchQuery = requireString(
    parsed.youtubeSearchQuery,
    "youtubeSearchQuery",
  );
  const dailyEdge = requireString(parsed.dailyEdge, "dailyEdge");

  return {
    requestCount,
    lesson: {
      id: input.lessonId ?? slugify(title),
      title,
      duration: input.duration ?? duration,
      summary,
      sections,
      takeaways,
      videos: [buildScriptVideo(`${title} - 2 minute explainer`, videoScript)],
      exercises: [softwareEngineersLab, ...practiceProblems],
      quiz: {
        questions,
        grading: {
          passingScore: 4,
          maxScore: questions.length,
          remediation:
            "Revisit the briefing, derive the core equations by hand, and complete the software engineer's lab before attempting the quiz again.",
        },
      },
      briefing,
      coreTheory,
      softwareEngineersLab,
      practiceProblems,
      videoScript,
      youtubeSearchQuery,
      dailyEdge,
      curriculumTrack: input.curriculumTrack,
      sourceFormat: input.sourceFormat,
      sourceTitle: input.sourceTitle,
    },
  };
}
