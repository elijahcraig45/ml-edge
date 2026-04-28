import type {
  CodingProblem,
  CurriculumCourse,
  CurriculumExercise,
  CurriculumLesson,
  CurriculumModule,
} from "@/lib/types";

type HostedLectureSegment = {
  title: string;
  explanation: string[];
  appliedLens: string;
  checkpoint?: string;
};

type HostedTutorialStep = {
  title: string;
  purpose: string;
  instructions: string[];
  successSignal: string;
  failureMode: string;
};

export type PracticeProblem = {
  id: string;
  prompt: string;
  hint: string;
  solution: string;
  checkYourWork: string[];
  difficulty: "warm-up" | "challenge";
  formatLabel?: string;
};

export type HostedLessonContent = {
  hook: string;
  teachingPromise: string;
  learningObjectives: string[];
  lectureSegments: HostedLectureSegment[];
  tutorialSteps?: HostedTutorialStep[];
  misconceptions?: string[];
  reflectionPrompts?: string[];
  masteryChecklist?: string[];
  practiceProblems?: PracticeProblem[];
  codingProblems?: CodingProblem[];
  videoUrl?: string;
  /** Optional manager briefing for courses targeting experienced practitioners */
  managerBriefing?: {
    businessContext: string;
    riskIfSkipped: string;
    kpiImpact: string;
  };
};

function sentenceCase(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "the lesson material";
  }

  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

function compactClause(value: string) {
  return value
    .replace(/[.]+$/g, "")
    .replace(/^[-\s]+/, "")
    .trim();
}

function buildLearningObjectives(
  course: CurriculumCourse,
  lesson: CurriculumLesson,
): string[] {
  const sectionObjectives = lesson.sections
    .slice(0, 3)
    .map(
      (section) =>
        `Explain ${sentenceCase(section)} in the context of ${course.title}.`,
    );
  const takeawayObjectives = lesson.takeaways
    .slice(0, 2)
    .map((takeaway) => `Apply this lesson's guidance: ${compactClause(takeaway)}.`);

  return [...sectionObjectives, ...takeawayObjectives];
}

function buildLectureSegments(
  course: CurriculumCourse,
  module: CurriculumModule,
  lesson: CurriculumLesson,
): HostedLectureSegment[] {
  return lesson.sections.map((section, index) => {
    const pairedTakeaway =
      lesson.takeaways[index] ??
      lesson.takeaways[lesson.takeaways.length - 1] ??
      "Connect the concept to real engineering decisions rather than memorizing it in isolation.";
    const relatedQuestion =
      lesson.quiz.questions[index]?.prompt ??
      lesson.quiz.questions[0]?.prompt ??
      "What would you need to inspect to tell whether you truly understand this concept?";

    return {
      title: section,
      explanation: [
        `Start this segment by anchoring it to the lesson summary: ${lesson.summary} In practice, ${sentenceCase(section)} is not just a fact to recall; it is a decision surface that changes how you design, debug, and evaluate systems.`,
        `Teach this section as a layered explanation. First define the mechanism, then explain the assumptions it smuggles in, and finally connect those assumptions to a real failure pattern an ML engineer might see when the data, objective, or deployment context shifts.`,
        `Close the segment by linking it back to the course arc. ${course.title} is trying to build judgment, and ${module.title} gives the surrounding lens for when this concept is central versus when it is merely supporting machinery.`,
      ],
      appliedLens: pairedTakeaway,
      checkpoint: relatedQuestion,
    };
  });
}

function buildTutorialFromExercise(
  exercise: CurriculumExercise,
  lesson: CurriculumLesson,
  index: number,
): HostedTutorialStep {
  return {
    title: exercise.title,
    purpose: `Use this step to turn the lecture into practice through ${exercise.type} work rather than passive reading.`,
    instructions: [
      `Re-state the task in your own words before touching code or notes: ${exercise.brief}`,
      `Produce the requested artifact with evidence. Your minimum outputs are: ${exercise.deliverables.join("; ")}.`,
      `Use the starter prompts to keep the work analytical instead of mechanical: ${exercise.starterPrompts.join(" ")}`,
    ],
    successSignal:
      exercise.gradingRubric[0]?.description ??
      "Another engineer should be able to inspect your work and see clear technical reasoning.",
    failureMode:
      lesson.quiz.questions[index]?.explanation ??
      "The most common failure mode is producing activity without showing a defensible chain of reasoning.",
  };
}

function buildFallbackTutorialSteps(
  course: CurriculumCourse,
  lesson: CurriculumLesson,
): HostedTutorialStep[] {
  return lesson.sections.slice(0, 3).map((section, index) => ({
    title: `Tutorial step ${index + 1}: ${section}`,
    purpose: `Convert the concept into working intuition for ${course.title}.`,
    instructions: [
      `Read the segment and rewrite the main mechanism behind ${sentenceCase(section)} in your own words.`,
      `Create a concrete example, derivation sketch, or code fragment that makes the concept operational instead of abstract.`,
      `Use one takeaway from the lesson to critique your own example and note where it would fail under pressure.`,
    ],
    successSignal:
      lesson.takeaways[index] ??
      "You can now explain the concept, demonstrate it, and critique its limits.",
    failureMode:
      lesson.quiz.questions[index]?.explanation ??
      "If you cannot explain the tradeoff or failure mode, the concept is not yet internalized.",
  }));
}

export function buildHostedLessonContent(
  course: CurriculumCourse,
  module: CurriculumModule,
  lesson: CurriculumLesson,
): HostedLessonContent {
  const tutorialSteps =
    lesson.exercises.length > 0
      ? lesson.exercises.map((exercise, index) =>
          buildTutorialFromExercise(exercise, lesson, index),
        )
      : buildFallbackTutorialSteps(course, lesson);

  const misconceptions = lesson.quiz.questions.slice(0, 3).map((question) => {
    const wrongOption =
      question.options.find((option, index) => index !== question.answerIndex) ??
      "a shallow answer choice";

    return `Do not default to "${wrongOption}." ${question.explanation}`;
  });

  return {
    hook: `${lesson.title} should feel like an engineer's working session, not a glossary entry. The goal is to understand ${sentenceCase(lesson.summary)} well enough to reason under uncertainty and pressure.`,
    teachingPromise: `By the end of this lesson, you should be able to explain the concept, work through a guided tutorial, and defend your decisions the way a strong reviewer or graduate-level instructor would expect.`,
    learningObjectives: buildLearningObjectives(course, lesson),
    lectureSegments: buildLectureSegments(course, module, lesson),
    tutorialSteps,
    misconceptions,
    reflectionPrompts: [
      `Which part of ${lesson.title} still feels like vocabulary rather than intuition?`,
      `If this lesson showed up in a real project, what evidence would convince you that your implementation is sound?`,
      `Where would the first failure appear if a teammate misunderstood one of today's concepts?`,
    ],
    masteryChecklist: [
      `Explain the lesson's core mechanism without reading from the page.`,
      `Work through the tutorial steps and produce evidence-backed outputs.`,
      `Use the quiz explanations to identify at least one misconception you were vulnerable to.`,
      `State when the lesson's ideas apply, when they do not, and what you would monitor in production.`,
    ],
    practiceProblems: [],
  };
}
