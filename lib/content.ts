import "server-only";

import {
  buildPublishedCurriculumArtifact,
  readPublishedCurriculumFromGcs,
} from "@/lib/curriculum-pipeline";
import { ML_ENGINEER_PROGRAM } from "@/lib/curriculum-program";
import { getDateKey } from "@/lib/date";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  buildCurriculumLibraryTracks,
  getCurriculumLibraryTrackBySlug,
} from "@/lib/library-curriculum";
import { FALLBACK_DAILY_CONTENT } from "@/lib/seed-data";
import type {
  CurriculumDependencyEdge,
  CurriculumCourse,
  CurriculumExercise,
  CurriculumLibraryLesson,
  CurriculumLibraryOverview,
  CurriculumLibraryTrack,
  CurriculumTrackLabel,
  CurriculumLesson,
  IngestedQuizQuestion,
  LessonCoreTheory,
  LessonVideoScript,
  CurriculumModule,
  CurriculumProject,
  CurriculumResourceTrack,
  CurriculumVideo,
  DailyContentDocument,
  NewsArticle,
  OpenResource,
  PublishedCurriculumArtifact,
  QuizQuestion,
  SourceFormat,
} from "@/lib/types";

function normalizeArticle(value: unknown): NewsArticle | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const article = value as Record<string, unknown>;

  return {
    title:
      typeof article.title === "string"
        ? article.title
        : "Untitled AI briefing",
    description:
      typeof article.description === "string" ? article.description : "",
    url: typeof article.url === "string" ? article.url : "#",
    source:
      typeof article.source === "string" ? article.source : "Unknown Source",
    publishedAt:
      typeof article.publishedAt === "string"
        ? article.publishedAt
        : getDateKey(),
  };
}

function normalizeQuestion(value: unknown, index: number): QuizQuestion | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const question = value as Record<string, unknown>;
  const options = Array.isArray(question.options)
    ? question.options.filter(
        (option): option is string => typeof option === "string",
      )
    : [];
  const answerIndex =
    typeof question.answerIndex === "number" ? question.answerIndex : 0;

  if (typeof question.prompt !== "string" || options.length < 2) {
    return null;
  }

  if (answerIndex < 0 || answerIndex >= options.length) {
    return null;
  }

  return {
    id:
      typeof question.id === "string" ? question.id : `daily-question-${index}`,
    prompt: question.prompt,
    options,
    answerIndex,
    explanation:
      typeof question.explanation === "string"
        ? question.explanation
        : "Use the answer that best reinforces reliable ML system design.",
  };
}

function normalizeDailyContent(
  value: Record<string, unknown>,
  date: string,
): DailyContentDocument {
  const rawQuiz = value.quiz;
  const questions = Array.isArray((rawQuiz as { questions?: unknown })?.questions)
    ? (rawQuiz as { questions: unknown[] }).questions
        .map(normalizeQuestion)
        .filter((question): question is QuizQuestion => question !== null)
    : [];
  const sourceArticles = Array.isArray(value.sourceArticles)
    ? value.sourceArticles
        .map(normalizeArticle)
        .filter((article): article is NewsArticle => article !== null)
    : [];

  return {
    date: typeof value.date === "string" ? value.date : date,
    headline:
      typeof value.headline === "string"
        ? value.headline
        : FALLBACK_DAILY_CONTENT.headline,
    technicalSummary:
      typeof value.technicalSummary === "string"
        ? value.technicalSummary
        : FALLBACK_DAILY_CONTENT.technicalSummary,
    status: value.status === "generated" ? "generated" : "seeded",
    quiz: {
      questions:
        questions.length > 0 ? questions : FALLBACK_DAILY_CONTENT.quiz.questions,
    },
    sourceArticles:
      sourceArticles.length > 0
        ? sourceArticles
        : FALLBACK_DAILY_CONTENT.sourceArticles,
  };
}

function normalizeVideo(value: unknown): CurriculumVideo | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const video = value as Record<string, unknown>;
  const kind = video.kind === "script" ? "script" : "external";
  const outline = Array.isArray(video.outline)
    ? video.outline.filter((item): item is string => typeof item === "string")
    : undefined;

  if (typeof video.title !== "string" || typeof video.objective !== "string") {
    return null;
  }

  return {
    kind,
    title: video.title,
    creator: typeof video.creator === "string" ? video.creator : undefined,
    platform: typeof video.platform === "string" ? video.platform : undefined,
    url: typeof video.url === "string" ? video.url : undefined,
    objective: video.objective,
    outline,
  };
}

function normalizeExercise(value: unknown): CurriculumExercise | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const exercise = value as Record<string, unknown>;
  const deliverables = Array.isArray(exercise.deliverables)
    ? exercise.deliverables.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
  const starterPrompts = Array.isArray(exercise.starterPrompts)
    ? exercise.starterPrompts.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
  const gradingRubric = Array.isArray(exercise.gradingRubric)
    ? exercise.gradingRubric
        .map((criterion) => {
          if (!criterion || typeof criterion !== "object") {
            return null;
          }

          const item = criterion as Record<string, unknown>;

          if (
            typeof item.criterion !== "string" ||
            typeof item.points !== "number" ||
            typeof item.description !== "string"
          ) {
            return null;
          }

          return {
            criterion: item.criterion,
            points: item.points,
            description: item.description,
          };
        })
        .filter(
          (item): item is CurriculumExercise["gradingRubric"][number] =>
            item !== null,
        )
    : [];

  if (
    typeof exercise.id !== "string" ||
    typeof exercise.title !== "string" ||
    typeof exercise.type !== "string" ||
    typeof exercise.brief !== "string"
  ) {
    return null;
  }

  return {
    id: exercise.id,
    title: exercise.title,
    type:
      exercise.type === "debugging" ||
      exercise.type === "analysis" ||
      exercise.type === "paper-review" ||
      exercise.type === "systems-design"
        ? exercise.type
        : "lab",
    brief: exercise.brief,
    deliverables,
    starterPrompts,
    gradingRubric,
  };
}

function normalizeProject(value: unknown): CurriculumProject | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const project = value as Record<string, unknown>;
  const milestones = Array.isArray(project.milestones)
    ? project.milestones.filter((item): item is string => typeof item === "string")
    : [];
  const gradingRubric = Array.isArray(project.gradingRubric)
    ? project.gradingRubric
        .map((criterion) => {
          if (!criterion || typeof criterion !== "object") {
            return null;
          }

          const item = criterion as Record<string, unknown>;

          if (
            typeof item.criterion !== "string" ||
            typeof item.points !== "number" ||
            typeof item.description !== "string"
          ) {
            return null;
          }

          return {
            criterion: item.criterion,
            points: item.points,
            description: item.description,
          };
        })
        .filter(
          (item): item is CurriculumProject["gradingRubric"][number] =>
            item !== null,
        )
    : [];

  if (typeof project.title !== "string" || typeof project.brief !== "string") {
    return null;
  }

  return {
    title: project.title,
    brief: project.brief,
    milestones,
    gradingRubric,
  };
}

function normalizeLesson(value: unknown): CurriculumLesson | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const lesson = value as Record<string, unknown>;
  const sections = Array.isArray(lesson.sections)
    ? lesson.sections.filter((item): item is string => typeof item === "string")
    : [];
  const takeaways = Array.isArray(lesson.takeaways)
    ? lesson.takeaways.filter((item): item is string => typeof item === "string")
    : [];
  const videos = Array.isArray(lesson.videos)
    ? lesson.videos
        .map(normalizeVideo)
        .filter((item): item is CurriculumVideo => item !== null)
    : [];
  const exercises = Array.isArray(lesson.exercises)
    ? lesson.exercises
        .map(normalizeExercise)
        .filter((item): item is CurriculumExercise => item !== null)
    : [];
  const quizRecord =
    lesson.quiz && typeof lesson.quiz === "object"
      ? (lesson.quiz as Record<string, unknown>)
      : null;
  const quizQuestions = Array.isArray(quizRecord?.questions)
    ? quizRecord.questions
        .map(normalizeQuestion)
        .filter((item): item is QuizQuestion => item !== null)
    : [];
  const grading =
    quizRecord?.grading && typeof quizRecord.grading === "object"
      ? (quizRecord.grading as Record<string, unknown>)
      : null;

  if (
    typeof lesson.id !== "string" ||
    typeof lesson.title !== "string" ||
    typeof lesson.duration !== "string" ||
    typeof lesson.summary !== "string" ||
    !grading ||
    typeof grading.passingScore !== "number" ||
    typeof grading.maxScore !== "number" ||
    typeof grading.remediation !== "string"
  ) {
    return null;
  }

  return {
    id: lesson.id,
    title: lesson.title,
    duration: lesson.duration,
    summary: lesson.summary,
    sections,
    takeaways,
    videos,
    exercises,
    quiz: {
      questions: quizQuestions,
      grading: {
        passingScore: grading.passingScore,
        maxScore: grading.maxScore,
        remediation: grading.remediation,
      },
    },
  };
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    : [];
}

function normalizeLibraryQuestion(
  value: unknown,
  index: number,
): IngestedQuizQuestion | null {
  const base = normalizeQuestion(value, index);

  if (!base || !value || typeof value !== "object") {
    return null;
  }

  const question = value as Record<string, unknown>;
  const optionRationales = normalizeStringArray(question.optionRationales);

  return {
    ...base,
    optionRationales:
      optionRationales.length === base.options.length
        ? optionRationales
        : base.options.map((_, optionIndex) =>
            optionIndex === base.answerIndex
              ? base.explanation
              : "Interrogate the assumptions in this answer and compare them to the underlying theory.",
          ),
  };
}

function normalizeLibraryCoreTheory(value: unknown): LessonCoreTheory | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const theory = value as Record<string, unknown>;
  const equations = Array.isArray(theory.equations)
    ? theory.equations
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }

          const equation = item as Record<string, unknown>;

          if (
            typeof equation.latex !== "string" ||
            typeof equation.explanation !== "string"
          ) {
            return null;
          }

          return {
            latex: equation.latex,
            explanation: equation.explanation,
          };
        })
        .filter(
          (item): item is LessonCoreTheory["equations"][number] => item !== null,
        )
    : [];

  if (
    equations.length < 2 ||
    equations.length > 3 ||
    typeof theory.whyThisMattersForYourMasters !== "string"
  ) {
    return null;
  }

  return {
    equations,
    whyThisMattersForYourMasters: theory.whyThisMattersForYourMasters,
  };
}

function normalizeLibraryVideoScript(value: unknown): LessonVideoScript | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const script = value as Record<string, unknown>;
  const intro = normalizeStringArray(script.intro);
  const coreConcept = normalizeStringArray(script.coreConcept);
  const outro = normalizeStringArray(script.outro);

  if (intro.length < 1 || coreConcept.length < 1 || outro.length < 1) {
    return null;
  }

  return {
    intro,
    coreConcept,
    outro,
  };
}

function normalizeSourceFormat(value: unknown): SourceFormat {
  return value === "pdf-text" ||
    value === "latex" ||
    value === "notebook"
    ? value
    : "markdown";
}

function normalizeTrackLabel(value: unknown): CurriculumTrackLabel | undefined {
  if (value === "Science Track" || value === "Functional Track") {
    return value;
  }

  return undefined;
}

function normalizeLibraryLesson(value: unknown): CurriculumLibraryLesson | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const lesson = value as Record<string, unknown>;
  const baseLesson = normalizeLesson(lesson);
  const briefing = normalizeStringArray(lesson.briefing);
  const coreTheory = normalizeLibraryCoreTheory(lesson.coreTheory);
  const softwareEngineersLab = normalizeExercise(lesson.softwareEngineersLab);
  const practiceProblems = Array.isArray(lesson.practiceProblems)
    ? lesson.practiceProblems
        .map(normalizeExercise)
        .filter((item): item is CurriculumExercise => item !== null)
    : [];
  const quizRecord =
    lesson.quiz && typeof lesson.quiz === "object"
      ? (lesson.quiz as Record<string, unknown>)
      : null;
  const quizQuestions = Array.isArray(quizRecord?.questions)
    ? quizRecord.questions
        .map(normalizeLibraryQuestion)
        .filter((item): item is IngestedQuizQuestion => item !== null)
    : [];
  const videoScript = normalizeLibraryVideoScript(lesson.videoScript);

  if (
    !baseLesson ||
    briefing.length !== 3 ||
    !coreTheory ||
    !softwareEngineersLab ||
    practiceProblems.length === 0 ||
    !videoScript ||
    typeof lesson.youtubeSearchQuery !== "string" ||
    typeof lesson.dailyEdge !== "string" ||
    quizQuestions.length === 0
  ) {
    return null;
  }

  return {
    ...baseLesson,
    quiz: {
      questions: quizQuestions,
      grading: baseLesson.quiz.grading,
    },
    briefing: briefing as [string, string, string],
    coreTheory,
    softwareEngineersLab,
    practiceProblems,
    videoScript,
    youtubeSearchQuery: lesson.youtubeSearchQuery,
    dailyEdge: lesson.dailyEdge,
    curriculumTrack: normalizeTrackLabel(lesson.curriculumTrack),
    sourceFormat: normalizeSourceFormat(lesson.sourceFormat),
    sourceTitle: typeof lesson.sourceTitle === "string" ? lesson.sourceTitle : undefined,
    repositoryOwner:
      typeof lesson.repositoryOwner === "string" ? lesson.repositoryOwner : undefined,
    repositoryName:
      typeof lesson.repositoryName === "string" ? lesson.repositoryName : undefined,
    repositoryId:
      typeof lesson.repositoryId === "string" ? lesson.repositoryId : undefined,
    sourcePath: typeof lesson.sourcePath === "string" ? lesson.sourcePath : undefined,
    sourceSha: typeof lesson.sourceSha === "string" ? lesson.sourceSha : undefined,
    sourceUrl: typeof lesson.sourceUrl === "string" ? lesson.sourceUrl : undefined,
    importedAt: typeof lesson.importedAt === "string" ? lesson.importedAt : undefined,
  };
}

function normalizeModule(value: unknown): CurriculumModule | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const moduleRecord = value as Record<string, unknown>;
  const lessons = Array.isArray(moduleRecord.lessons)
    ? moduleRecord.lessons
        .map(normalizeLesson)
        .filter((item): item is CurriculumLesson => item !== null)
    : [];

  if (
    typeof moduleRecord.id !== "string" ||
    typeof moduleRecord.title !== "string" ||
    typeof moduleRecord.focus !== "string"
  ) {
    return null;
  }

  const normalizedProject = normalizeProject(moduleRecord.project);

  return {
    id: moduleRecord.id,
    level: moduleRecord.level === "Advanced" ? "Advanced" : "Beginner",
    title: moduleRecord.title,
    focus: moduleRecord.focus,
    lessons,
    ...(normalizedProject !== null ? { project: normalizedProject } : {}),
  };
}

function normalizeCourse(value: unknown): CurriculumCourse | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const course = value as Record<string, unknown>;
  const prerequisites = Array.isArray(course.prerequisites)
    ? course.prerequisites.filter((item): item is string => typeof item === "string")
    : [];
  const outcomes = Array.isArray(course.outcomes)
    ? course.outcomes.filter((item): item is string => typeof item === "string")
    : [];
  const tags = Array.isArray(course.tags)
    ? course.tags.filter((item): item is string => typeof item === "string")
    : [];
  const modules = Array.isArray(course.modules)
    ? course.modules
        .map(normalizeModule)
        .filter((item): item is CurriculumModule => item !== null)
    : [];
  const capstone = normalizeProject(course.capstone);

  if (
    typeof course.id !== "string" ||
    typeof course.slug !== "string" ||
    typeof course.title !== "string" ||
    typeof course.timeframe !== "string" ||
    typeof course.summary !== "string" ||
    typeof course.whyItMatters !== "string" ||
    !capstone
  ) {
    return null;
  }

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    level: course.level === "Advanced" ? "Advanced" : "Beginner",
    timeframe: course.timeframe,
    summary: course.summary,
    whyItMatters: course.whyItMatters,
    prerequisites,
    outcomes,
    tags,
    modules,
    capstone,
  };
}

function normalizeOpenResource(value: unknown): OpenResource | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const resource = value as Record<string, unknown>;
  const topics = Array.isArray(resource.topics)
    ? resource.topics.filter((item): item is string => typeof item === "string")
    : [];

  if (
    typeof resource.id !== "string" ||
    typeof resource.title !== "string" ||
    typeof resource.provider !== "string" ||
    typeof resource.url !== "string" ||
    typeof resource.format !== "string" ||
    typeof resource.accessModel !== "string" ||
    typeof resource.notes !== "string"
  ) {
    return null;
  }

  return {
    id: resource.id,
    title: resource.title,
    provider: resource.provider,
    url: resource.url,
    format:
      resource.format === "course" ||
      resource.format === "video-series" ||
      resource.format === "notes" ||
      resource.format === "interactive" ||
      resource.format === "docs"
        ? resource.format
        : "textbook",
    accessModel:
      resource.accessModel === "open-license" ||
      resource.accessModel === "metadata-only"
        ? resource.accessModel
        : "free-access",
    license: typeof resource.license === "string" ? resource.license : undefined,
    topics,
    difficulty:
      resource.difficulty === "Intermediate" || resource.difficulty === "Advanced"
        ? resource.difficulty
        : "Beginner",
    notes: resource.notes,
  };
}

function normalizeTrack(value: unknown): CurriculumResourceTrack | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const track = value as Record<string, unknown>;
  const stages = Array.isArray(track.stages)
    ? track.stages
        .map((stage) => {
          if (!stage || typeof stage !== "object") {
            return null;
          }

          const stageRecord = stage as Record<string, unknown>;
          const resourceIds = Array.isArray(stageRecord.resourceIds)
            ? stageRecord.resourceIds.filter(
                (item): item is string => typeof item === "string",
              )
            : [];

          if (
            typeof stageRecord.id !== "string" ||
            typeof stageRecord.title !== "string" ||
            typeof stageRecord.objective !== "string" ||
            typeof stageRecord.feedbackLoop !== "string"
          ) {
            return null;
          }

          return {
            id: stageRecord.id,
            title: stageRecord.title,
            objective: stageRecord.objective,
            resourceIds,
            feedbackLoop: stageRecord.feedbackLoop,
          };
        })
        .filter(
          (
            item,
          ): item is CurriculumResourceTrack["stages"][number] => item !== null,
        )
    : [];

  if (
    typeof track.courseId !== "string" ||
    typeof track.title !== "string" ||
    typeof track.description !== "string"
  ) {
    return null;
  }

  return {
    courseId: track.courseId,
    title: track.title,
    description: track.description,
    stages,
  };
}

function normalizeEdge(value: unknown): CurriculumDependencyEdge | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const edge = value as Record<string, unknown>;

  if (
    typeof edge.fromCourseId !== "string" ||
    typeof edge.toCourseId !== "string" ||
    typeof edge.reason !== "string"
  ) {
    return null;
  }

  return {
    fromCourseId: edge.fromCourseId,
    toCourseId: edge.toCourseId,
    reason: edge.reason,
  };
}

function normalizePublishedCurriculumArtifact(
  value: unknown,
): PublishedCurriculumArtifact | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const artifact = value as Record<string, unknown>;
  const courses = Array.isArray(artifact.courses)
    ? artifact.courses
        .map(normalizeCourse)
        .filter((item): item is CurriculumCourse => item !== null)
    : [];
  const resources = Array.isArray(artifact.resources)
    ? artifact.resources
        .map(normalizeOpenResource)
        .filter((item): item is OpenResource => item !== null)
    : [];
  const tracks = Array.isArray(artifact.tracks)
    ? artifact.tracks
        .map(normalizeTrack)
        .filter((item): item is CurriculumResourceTrack => item !== null)
    : [];
  const prerequisiteGraph = Array.isArray(artifact.prerequisiteGraph)
    ? artifact.prerequisiteGraph
        .map(normalizeEdge)
        .filter((item): item is CurriculumDependencyEdge => item !== null)
    : [];

  if (
    typeof artifact.version !== "string" ||
    typeof artifact.generatedAt !== "string" ||
    typeof artifact.strategy !== "string"
  ) {
    return null;
  }

  return {
    version: artifact.version,
    generatedAt: artifact.generatedAt,
    strategy: artifact.strategy,
    courses: sortCourses(courses),
    resources,
    tracks,
    prerequisiteGraph,
  };
}

function sortCourses(courses: CurriculumCourse[]) {
  const authoredOrder = new Map(
    ML_ENGINEER_PROGRAM.map((course, index) => [course.id, index]),
  );

  return [...courses].sort((left, right) => {
    const leftIndex = authoredOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = authoredOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER;

    if (leftIndex === rightIndex) {
      return left.title.localeCompare(right.title);
    }

    return leftIndex - rightIndex;
  });
}

export async function getDailyContent(date = getDateKey()) {
  const db = getAdminFirestore();

  if (!db) {
    return {
      ...FALLBACK_DAILY_CONTENT,
      date,
    };
  }

  const snapshot = await db.collection("daily_content").doc(date).get();

  if (!snapshot.exists) {
    return {
      ...FALLBACK_DAILY_CONTENT,
      date,
    };
  }

  return normalizeDailyContent(snapshot.data() ?? {}, date);
}

export async function getCurriculumExperience() {
  const db = getAdminFirestore();

  if (db) {
    const [metaSnapshot, courseSnapshot, trackSnapshot, resourceSnapshot] =
      await Promise.all([
        db.collection("curriculum_meta").doc("current").get(),
        db.collection("curriculum_courses").get(),
        db.collection("curriculum_tracks").get(),
        db.collection("curriculum_resources").get(),
      ]);

    const courses = courseSnapshot.docs
      .map((document) => normalizeCourse(document.data()))
      .filter((course): course is CurriculumCourse => course !== null);
    const tracks = trackSnapshot.docs
      .map((document) => normalizeTrack(document.data()))
      .filter((track): track is CurriculumResourceTrack => track !== null);
    const resources = resourceSnapshot.docs
      .map((document) => normalizeOpenResource(document.data()))
      .filter((resource): resource is OpenResource => resource !== null);
    const fallbackArtifact = buildPublishedCurriculumArtifact();

    if (courses.length > 0) {
      const meta = metaSnapshot.data() ?? {};

      return {
        version:
          typeof meta.version === "string" ? meta.version : fallbackArtifact.version,
        generatedAt:
          typeof meta.generatedAt === "string"
            ? meta.generatedAt
            : fallbackArtifact.generatedAt,
        strategy:
          typeof meta.strategy === "string" ? meta.strategy : fallbackArtifact.strategy,
        courses: sortCourses(courses),
        tracks: tracks.length > 0 ? tracks : fallbackArtifact.tracks,
        resources: resources.length > 0 ? resources : fallbackArtifact.resources,
        prerequisiteGraph: fallbackArtifact.prerequisiteGraph,
      } satisfies PublishedCurriculumArtifact;
    }
  }

  const gcsArtifact = await readPublishedCurriculumFromGcs();
  const normalizedGcsArtifact = normalizePublishedCurriculumArtifact(gcsArtifact);

  if (normalizedGcsArtifact) {
    return normalizedGcsArtifact;
  }

  return buildPublishedCurriculumArtifact();
}

export async function getCurriculum() {
  const artifact = await getCurriculumExperience();

  return artifact.courses;
}

export async function getCurriculumLibraryLessons() {
  const db = getAdminFirestore();

  if (!db) {
    return [] as CurriculumLibraryLesson[];
  }

  const snapshot = await db.collection("curriculum_library_lessons").get();

  return snapshot.docs
    .map((document) =>
      normalizeLibraryLesson({
        ...document.data(),
        id: document.id,
      }),
    )
    .filter((lesson): lesson is CurriculumLibraryLesson => lesson !== null)
    .sort((left, right) => {
      const leftDate = left.importedAt ?? "";
      const rightDate = right.importedAt ?? "";

      if (leftDate !== rightDate) {
        return rightDate.localeCompare(leftDate);
      }

      return left.title.localeCompare(right.title);
    });
}

export async function getCurriculumLibraryLesson(lessonId: string) {
  const db = getAdminFirestore();

  if (!db) {
    return null;
  }

  const snapshot = await db.collection("curriculum_library_lessons").doc(lessonId).get();

  if (!snapshot.exists) {
    return null;
  }

  return normalizeLibraryLesson({
    ...snapshot.data(),
    id: snapshot.id,
  });
}

export async function getCurriculumLibraryOverview(): Promise<CurriculumLibraryOverview> {
  const db = getAdminFirestore();

  if (!db) {
    return {
      lessonCount: 0,
      repositoryCount: 0,
      latestImportAt: null,
      trackCounts: {
        "Science Track": 0,
        "Functional Track": 0,
      },
      featuredLessons: [],
    };
  }

  const [lessonSnapshot, repositorySnapshot] = await Promise.all([
    db.collection("curriculum_library_lessons").get(),
    db.collection("curriculum_library_repositories").get(),
  ]);
  const lessons = lessonSnapshot.docs
    .map((document) =>
      normalizeLibraryLesson({
        ...document.data(),
        id: document.id,
      }),
    )
    .filter((lesson): lesson is CurriculumLibraryLesson => lesson !== null)
    .sort((left, right) => (right.importedAt ?? "").localeCompare(left.importedAt ?? ""));
  const trackCounts = lessons.reduce(
    (counts, lesson) => {
      if (lesson.curriculumTrack) {
        counts[lesson.curriculumTrack] += 1;
      }

      return counts;
    },
    {
      "Science Track": 0,
      "Functional Track": 0,
    } satisfies Record<CurriculumTrackLabel, number>,
  );

  return {
    lessonCount: lessons.length,
    repositoryCount: repositorySnapshot.size,
    latestImportAt: lessons[0]?.importedAt ?? null,
    trackCounts,
    featuredLessons: lessons.slice(0, 4),
  };
}

export async function getCurriculumLibraryTracks(): Promise<CurriculumLibraryTrack[]> {
  const lessons = await getCurriculumLibraryLessons();

  return buildCurriculumLibraryTracks(lessons);
}

export async function getCurriculumLibraryTrack(trackSlug: string) {
  const tracks = await getCurriculumLibraryTracks();

  return getCurriculumLibraryTrackBySlug(tracks, trackSlug);
}

export async function seedCurriculum() {
  const db = getAdminFirestore();

  if (!db) {
    throw new Error("Firebase Admin is not configured.");
  }

  const artifact = buildPublishedCurriculumArtifact();
  const writes = [
    db.collection("curriculum_meta").doc("current").set({
      version: artifact.version,
      generatedAt: artifact.generatedAt,
      strategy: artifact.strategy,
      courseCount: artifact.courses.length,
      resourceCount: artifact.resources.length,
      trackCount: artifact.tracks.length,
    }),
    ...artifact.courses.map((course) =>
      db.collection("curriculum_courses").doc(course.id).set(course),
    ),
    ...artifact.tracks.map((track) =>
      db.collection("curriculum_tracks").doc(track.courseId).set(track),
    ),
    ...artifact.resources.map((resource) =>
      db.collection("curriculum_resources").doc(resource.id).set(resource),
    ),
  ];

  await Promise.all(writes);

  return {
    courseCount: artifact.courses.length,
    resourceCount: artifact.resources.length,
    trackCount: artifact.tracks.length,
    targetCollections: [
      "curriculum_meta",
      "curriculum_courses",
      "curriculum_tracks",
      "curriculum_resources",
    ],
  };
}
