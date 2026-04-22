import openResourceCatalog from "@/data/open-resource-catalog.json";
import curriculumResourceTracks from "@/data/curriculum-resource-tracks.json";
import type {
  CurriculumDependencyEdge,
  CurriculumResourceTrack,
  OpenResource,
} from "@/lib/types";

export const OPEN_RESOURCE_CATALOG = openResourceCatalog as OpenResource[];

export const CURRICULUM_RESOURCE_TRACKS =
  curriculumResourceTracks as CurriculumResourceTrack[];

export const CURRICULUM_PREREQUISITE_GRAPH: CurriculumDependencyEdge[] = [
  {
    fromCourseId: "course-math-science-foundations",
    toCourseId: "course-ml-101",
    reason: "ML 101 becomes substantially stronger once the learner can reason with vectors, gradients, and uncertainty rather than just code patterns.",
  },
  {
    fromCourseId: "course-math-science-foundations",
    toCourseId: "course-statistical-inference",
    reason: "The deeper inference course assumes comfort with probability, optimization, and scientific notation.",
  },
  {
    fromCourseId: "course-scientific-computing-data-systems",
    toCourseId: "course-ml-systems",
    reason: "Practical MLE infrastructure habits should be formed before tackling full production ML platform design.",
  },
  {
    fromCourseId: "course-ml-101",
    toCourseId: "course-history-ai-ml",
    reason: "Historical context lands better after baseline ML vocabulary and math.",
  },
  {
    fromCourseId: "course-ml-101",
    toCourseId: "course-classical-ml",
    reason: "Classical ML depends on metrics, splits, and optimization basics.",
  },
  {
    fromCourseId: "course-statistical-inference",
    toCourseId: "course-classical-ml",
    reason: "A stronger inference background improves calibration, uncertainty reasoning, and experimental judgment in classical ML.",
  },
  {
    fromCourseId: "course-classical-ml",
    toCourseId: "course-deep-learning",
    reason: "A strong engineer should understand why simple models fail before escalating to neural systems.",
  },
  {
    fromCourseId: "course-deep-learning",
    toCourseId: "course-computer-vision-multimodal",
    reason: "Perception and multimodal work depend on strong neural representation, optimization, and embedding intuition.",
  },
  {
    fromCourseId: "course-deep-learning",
    toCourseId: "course-ml-systems",
    reason: "Production design is more meaningful once training behavior and model artifacts are understood.",
  },
  {
    fromCourseId: "course-deep-learning",
    toCourseId: "course-reinforcement-learning-decision-making",
    reason: "Modern RL work often relies on function approximation and deep optimization behavior that should already feel familiar.",
  },
  {
    fromCourseId: "course-ml-systems",
    toCourseId: "course-llm-systems",
    reason: "LLM and agent systems inherit deployment, monitoring, and data quality concerns from general ML systems.",
  },
  {
    fromCourseId: "course-statistical-inference",
    toCourseId: "course-reinforcement-learning-decision-making",
    reason: "Sequential decision systems require stronger intuition for uncertainty, experimentation, and evidence quality than static prediction alone.",
  },
  {
    fromCourseId: "course-llm-systems",
    toCourseId: "course-reliable-ml-2026",
    reason: "Frontier reliability work requires prior understanding of retrieval, orchestration, and evaluation failures.",
  },
  {
    fromCourseId: "course-computer-vision-multimodal",
    toCourseId: "course-reliable-ml-2026",
    reason: "Reliable frontier work increasingly includes multimodal systems with perception-specific robustness and grounding failures.",
  },
  {
    fromCourseId: "course-reinforcement-learning-decision-making",
    toCourseId: "course-reliable-ml-2026",
    reason: "Advanced reliability work should include reward misspecification, feedback-loop risk, and deployment caution for decision policies.",
  },
];
