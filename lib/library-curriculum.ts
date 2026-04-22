import type {
  CurriculumLibraryLesson,
  CurriculumLibraryTrack,
  CurriculumLibraryTrackStage,
  CurriculumTrackLabel,
} from "@/lib/types";

type TrackStageSpec = {
  id: string;
  title: string;
  objective: string;
  sourcePaths: string[];
};

type TrackSpec = {
  slug: string;
  title: string;
  description: string;
  audience: string;
  focus: string;
  trackLabel?: CurriculumTrackLabel;
  stages: TrackStageSpec[];
};

const TRACK_SPECS: TrackSpec[] = [
  {
    slug: "mathematical-foundations",
    title: "Mathematical Foundations for ML",
    description:
      "A source-backed path through linear algebra, differential calculus, expectation calculus, and the first rigorous supervised learning formulations.",
    audience: "Engineers who want the math to feel operational rather than ceremonial.",
    focus: "Build the mathematical reflexes needed for graduate-level ML reasoning.",
    trackLabel: "Science Track",
    stages: [
      {
        id: "math-primitives",
        title: "Linear algebra and calculus primitives",
        objective: "Rebuild the language of vectors, derivatives, and sensitivity before model-heavy content.",
        sourcePaths: [
          "math_linear_algebra.ipynb",
          "math_differential_calculus.ipynb",
          "slopes-expectations.md",
        ],
      },
      {
        id: "supervised-core",
        title: "Supervised learning foundations",
        objective: "Move from mathematical objects to linear regression and supervised learning theory.",
        sourcePaths: [
          "tex/chapter/ch0-introduction.tex",
          "tex/chapter/ch1-supervised-learning.tex",
          "04_training_linear_models.ipynb",
          "tutorials/tutorial_linear_regression.ipynb",
          "tutorials/tutorial_linear_regression.solution.ipynb",
        ],
      },
    ],
  },
  {
    slug: "classical-machine-learning",
    title: "Classical Machine Learning Systems",
    description:
      "A sequence through classification, support vector machines, trees, ensembles, and the framing decisions that still matter in production.",
    audience: "Engineers who need strong baselines and interpretable model behavior before deep learning scale.",
    focus: "Develop model-selection judgment and baseline discipline.",
    trackLabel: "Functional Track",
    stages: [
      {
        id: "problem-framing",
        title: "Landscape and framing",
        objective: "Understand what makes a problem learnable before reaching for a model.",
        sourcePaths: [
          "01_the_machine_learning_landscape.ipynb",
          "02_end_to_end_machine_learning_project.ipynb",
          "03_classification.ipynb",
        ],
      },
      {
        id: "margin-and-kernel-methods",
        title: "Margins, kernels, and strong classical baselines",
        objective: "Build a real understanding of kernel methods and margin-based learning.",
        sourcePaths: [
          "tex/chapter/ch3-kernel-methods.tex",
          "tex/chapter/ch4-svm.tex",
          "05_support_vector_machines.ipynb",
        ],
      },
      {
        id: "trees-and-ensembles",
        title: "Decision trees and ensemble learning",
        objective: "Connect greedy partitioning methods to practical boosting and ensemble behavior.",
        sourcePaths: [
          "06_decision_trees.ipynb",
          "07_ensemble_learning_and_random_forests.ipynb",
          "tex/chapter/boosting.tex",
        ],
      },
    ],
  },
  {
    slug: "probabilistic-unsupervised-learning",
    title: "Probabilistic and Unsupervised Learning",
    description:
      "A full track for mixture models, EM, factor methods, PCA, ICA, and unsupervised reasoning from both theory and notebooks.",
    audience: "Learners who want to reason about latent variables, density models, and representation structure.",
    focus: "Build fluency in probabilistic modeling and unsupervised representation discovery.",
    trackLabel: "Science Track",
    stages: [
      {
        id: "generative-models",
        title: "Generative models and EM",
        objective: "Learn why latent-variable models need iterative inference and how EM operationalizes it.",
        sourcePaths: [
          "tex/chapter/ch2-generative-algorithms.tex",
          "tutorials/tutorial_gmm.ipynb",
          "tutorials/tutorial_gmm.solution.ipynb",
          "tex/chapter/ch8-the-em-algorithm.tex",
        ],
      },
      {
        id: "representation-structure",
        title: "PCA, factor analysis, and ICA",
        objective: "Separate variance structure, latent-factor structure, and source separation ideas.",
        sourcePaths: [
          "08_dimensionality_reduction.ipynb",
          "tutorials/tutorial_pca.ipynb",
          "tutorials/tutorial_pca.solution.ipynb",
          "09_unsupervised_learning.ipynb",
          "tex/chapter/ch9-factor-analysis.tex",
          "tex/chapter/ch10-pca.tex",
          "tex/chapter/ch11-ica.tex",
        ],
      },
    ],
  },
  {
    slug: "deep-learning-engineering",
    title: "Deep Learning Engineering",
    description:
      "A sequence from neural network basics through optimization behavior, autodiff, architecture choices, and implementation details.",
    audience: "Engineers who want to understand deep learning as systems-plus-optimization, not cookbook framework use.",
    focus: "Turn backprop, optimization, and architecture trade-offs into engineering intuition.",
    trackLabel: "Functional Track",
    stages: [
      {
        id: "neural-network-basics",
        title: "Neural networks and optimization mechanics",
        objective: "Ground network training in gradients, curvature, and numerical behavior.",
        sourcePaths: [
          "10_neural_nets_with_keras.ipynb",
          "11_training_deep_neural_networks.ipynb",
          "extra_gradient_descent_comparison.ipynb",
          "extra_autodiff.ipynb",
          "tex/chapter/ch5-deep-learning.tex",
        ],
      },
      {
        id: "models-and-training-loops",
        title: "Custom models and architecture design",
        objective: "Move from framework APIs to model-building control and design choice.",
        sourcePaths: [
          "12_custom_models_and_training_with_tensorflow.ipynb",
          "extra_ann_architectures.ipynb",
          "13_loading_and_preprocessing_data.ipynb",
        ],
      },
    ],
  },
  {
    slug: "applied-ml-systems",
    title: "Applied ML Systems and Modern Modalities",
    description:
      "Vision, sequence models, NLP, generative models, RL, and deployment-at-scale organized as an advanced continuation path.",
    audience: "Learners who already have fundamentals and want to expand into modern modality-specific systems.",
    focus: "Connect advanced model families to deployment and systems reality.",
    trackLabel: "Functional Track",
    stages: [
      {
        id: "vision-and-sequences",
        title: "Vision and sequence modeling",
        objective: "Understand how convolutional and sequence architectures change representation learning.",
        sourcePaths: [
          "14_deep_computer_vision_with_cnns.ipynb",
          "15_processing_sequences_using_rnns_and_cnns.ipynb",
          "16_nlp_with_rnns_and_attention.ipynb",
        ],
      },
      {
        id: "generative-rl-and-ops",
        title: "Generative models, RL, and production scale",
        objective: "Bridge modern generative modeling, decision-making, and large-scale training/deployment concerns.",
        sourcePaths: [
          "17_autoencoders_gans_and_diffusion_models.ipynb",
          "18_reinforcement_learning.ipynb",
          "tex/chapter/ch12-rl.tex",
          "19_training_and_deploying_at_scale.ipynb",
        ],
      },
    ],
  },
];

function normalizePath(value: string) {
  return value.replace(/\\/g, "/").trim().toLowerCase();
}

function buildTrackStages(
  stageSpecs: TrackStageSpec[],
  lessonByPath: Map<string, CurriculumLibraryLesson>,
): CurriculumLibraryTrackStage[] {
  return stageSpecs
    .map((stage) => ({
      id: stage.id,
      title: stage.title,
      objective: stage.objective,
      lessons: stage.sourcePaths
        .map((sourcePath) => lessonByPath.get(normalizePath(sourcePath)))
        .filter((lesson): lesson is CurriculumLibraryLesson => lesson !== undefined),
    }))
    .filter((stage) => stage.lessons.length > 0);
}

export function buildCurriculumLibraryTracks(
  lessons: CurriculumLibraryLesson[],
): CurriculumLibraryTrack[] {
  const lessonByPath = new Map(
    lessons
      .filter((lesson): lesson is CurriculumLibraryLesson & { sourcePath: string } =>
        typeof lesson.sourcePath === "string" && lesson.sourcePath.length > 0,
      )
      .map((lesson) => [normalizePath(lesson.sourcePath), lesson]),
  );
  const usedLessonIds = new Set<string>();

  const tracks = TRACK_SPECS.map((track) => {
    const stages = buildTrackStages(track.stages, lessonByPath);

    stages.forEach((stage) => {
      stage.lessons.forEach((lesson) => {
        usedLessonIds.add(lesson.id);
      });
    });

    return {
      slug: track.slug,
      title: track.title,
      description: track.description,
      audience: track.audience,
      focus: track.focus,
      trackLabel: track.trackLabel,
      lessonCount: stages.reduce((count, stage) => count + stage.lessons.length, 0),
      stages,
    } satisfies CurriculumLibraryTrack;
  }).filter((track) => track.lessonCount > 0);

  const remainingLessons = lessons.filter((lesson) => !usedLessonIds.has(lesson.id));

  if (remainingLessons.length > 0) {
    tracks.push({
      slug: "additional-source-studies",
      title: "Additional Source Studies",
      description:
        "Imported lessons that do not yet belong to one of the main curated tracks but are still available as study material.",
      audience: "Learners who want extra depth beyond the main curriculum path.",
      focus: "Capture the remaining imported lesson corpus without hiding it.",
      trackLabel: undefined,
      lessonCount: remainingLessons.length,
      stages: [
        {
          id: "additional-lessons",
          title: "Additional lessons",
          objective: "Explore the rest of the imported corpus for targeted reinforcement.",
          lessons: remainingLessons.sort((left, right) => left.title.localeCompare(right.title)),
        },
      ],
    });
  }

  return tracks;
}

export function getCurriculumLibraryTrackBySlug(
  tracks: CurriculumLibraryTrack[],
  slug: string,
) {
  return tracks.find((track) => track.slug === slug) ?? null;
}
