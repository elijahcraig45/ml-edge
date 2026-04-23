import type { QuestionLevel } from "@/lib/types";

export type QuestionSeed = {
  key: string;
  concept: string;
  scenario: string;
  correct: string;
  distractors: [string, string, string];
  explanation: string;
};

export type TopicSpec = {
  slug: string;
  title: string;
  dailySummary: string;
  seeds: Record<QuestionLevel, QuestionSeed[]>;
};

export function seed(
  key: string,
  concept: string,
  scenario: string,
  correct: string,
  distractors: [string, string, string],
  explanation: string,
): QuestionSeed {
  return {
    key,
    concept,
    scenario,
    correct,
    distractors,
    explanation,
  };
}

export function topic(
  slug: string,
  title: string,
  dailySummary: string,
  seeds: Record<QuestionLevel, QuestionSeed[]>,
): TopicSpec {
  return {
    slug,
    title,
    dailySummary,
    seeds,
  };
}
