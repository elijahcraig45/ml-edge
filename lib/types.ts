export type CurriculumLevel = "Beginner" | "Advanced";

export type NewsArticle = {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

export type QuestionLevel = "foundational" | "intermediate" | "advanced";

export type BankQuestion = QuizQuestion & {
  topic: string;
  level: QuestionLevel;
  date: string;
  source: "daily";
};

export type DailyContentDocument = {
  date: string;
  headline: string;
  technicalSummary: string;
  quiz: {
    questions: QuizQuestion[];
  };
  status: "generated" | "seeded";
  sourceArticles: NewsArticle[];
};

export type CurriculumVideo = {
  kind: "external" | "script";
  title: string;
  creator?: string;
  platform?: string;
  url?: string;
  objective: string;
  outline?: string[];
};

export type GradingCriterion = {
  criterion: string;
  points: number;
  description: string;
};

export type ExerciseType =
  | "lab"
  | "debugging"
  | "analysis"
  | "paper-review"
  | "systems-design";

export type CurriculumExercise = {
  id: string;
  title: string;
  type: ExerciseType;
  brief: string;
  deliverables: string[];
  starterPrompts: string[];
  gradingRubric: GradingCriterion[];
};

export type QuizGradingLogic = {
  passingScore: number;
  maxScore: number;
  remediation: string;
};

export type LessonQuiz = {
  questions: QuizQuestion[];
  grading: QuizGradingLogic;
};

export type CurriculumLesson = {
  id: string;
  title: string;
  duration: string;
  summary: string;
  sections: string[];
  takeaways: string[];
  videos: CurriculumVideo[];
  exercises: CurriculumExercise[];
  quiz: LessonQuiz;
};

export type CurriculumProject = {
  title: string;
  brief: string;
  milestones: string[];
  gradingRubric: GradingCriterion[];
};

export type CurriculumModule = {
  id: string;
  level: CurriculumLevel;
  title: string;
  focus: string;
  lessons: CurriculumLesson[];
  project?: CurriculumProject;
};

export type CurriculumCourse = {
  id: string;
  slug: string;
  title: string;
  level: CurriculumLevel;
  timeframe: string;
  summary: string;
  whyItMatters: string;
  prerequisites: string[];
  outcomes: string[];
  tags: string[];
  modules: CurriculumModule[];
  capstone: CurriculumProject;
};

export type ResourceAccessModel = "open-license" | "free-access" | "metadata-only";

export type OpenResource = {
  id: string;
  title: string;
  provider: string;
  url: string;
  format: "textbook" | "course" | "video-series" | "notes" | "interactive" | "docs";
  accessModel: ResourceAccessModel;
  license?: string;
  topics: string[];
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  notes: string;
};

export type ResourceTrackStage = {
  id: string;
  title: string;
  objective: string;
  resourceIds: string[];
  feedbackLoop: string;
};

export type CurriculumResourceTrack = {
  courseId: string;
  title: string;
  description: string;
  stages: ResourceTrackStage[];
};

export type CurriculumDependencyEdge = {
  fromCourseId: string;
  toCourseId: string;
  reason: string;
};

export type PublishedCurriculumArtifact = {
  version: string;
  generatedAt: string;
  strategy: string;
  resources: OpenResource[];
  tracks: CurriculumResourceTrack[];
  prerequisiteGraph: CurriculumDependencyEdge[];
  courses: CurriculumCourse[];
};

export type SourceFormat = "markdown" | "pdf-text" | "latex" | "notebook";

export type CurriculumTrackLabel = "Science Track" | "Functional Track";

export type LessonTheoryEquation = {
  latex: string;
  explanation: string;
};

export type LessonCoreTheory = {
  equations: LessonTheoryEquation[];
  whyThisMattersForYourMasters: string;
};

export type LessonVideoScript = {
  intro: string[];
  coreConcept: string[];
  outro: string[];
};

export type IngestedQuizQuestion = QuizQuestion & {
  optionRationales: string[];
};

export type CurriculumLibraryLesson = Omit<CurriculumLesson, "quiz"> & {
  quiz: {
    questions: IngestedQuizQuestion[];
    grading: QuizGradingLogic;
  };
  briefing: [string, string, string];
  coreTheory: LessonCoreTheory;
  softwareEngineersLab: CurriculumExercise;
  practiceProblems: CurriculumExercise[];
  videoScript: LessonVideoScript;
  youtubeSearchQuery: string;
  dailyEdge: string;
  curriculumTrack?: CurriculumTrackLabel;
  sourceFormat: SourceFormat;
  sourceTitle?: string;
  repositoryOwner?: string;
  repositoryName?: string;
  repositoryId?: string;
  sourcePath?: string;
  sourceSha?: string;
  sourceUrl?: string;
  importedAt?: string;
};

export type CurriculumLibraryOverview = {
  lessonCount: number;
  repositoryCount: number;
  latestImportAt: string | null;
  trackCounts: Record<CurriculumTrackLabel, number>;
  featuredLessons: CurriculumLibraryLesson[];
};

export type CurriculumLibraryTrackStage = {
  id: string;
  title: string;
  objective: string;
  lessons: CurriculumLibraryLesson[];
};

export type CurriculumLibraryTrack = {
  slug: string;
  title: string;
  description: string;
  audience: string;
  focus: string;
  trackLabel?: CurriculumTrackLabel;
  lessonCount: number;
  stages: CurriculumLibraryTrackStage[];
};
