import { getAuthoredHostedLessonContent } from "@/lib/authored-hosted-lessons";
import { ML_ENGINEER_CURRICULUM } from "@/lib/curriculum-catalog";
import { ML_ENGINEER_PROGRAM } from "@/lib/curriculum-program";
import type { HostedLessonContent } from "@/lib/hosted-lessons";
import type { CurriculumLesson, QuizQuestion } from "@/lib/types";

type AuthoredCourseAvailability =
  | "Start here"
  | "Take second"
  | "Take third"
  | "Take fourth"
  | "Take anytime after foundations";

type AuthoredCourseBadge = {
  id: string;
  title: string;
  description: string;
  emblem: string;
};

type AuthoredCourseAssessment = {
  title: string;
  description: string;
  passingScore: number;
  questions: QuizQuestion[];
};

export type AuthoredAcademyLesson = {
  id: string;
  title: string;
  summary: string;
  duration: string;
  sections: string[];
  takeaways: string[];
  videos: CurriculumLesson["videos"];
  exercises: CurriculumLesson["exercises"];
  quiz: CurriculumLesson["quiz"];
  hostedLesson: HostedLessonContent;
};

export type AuthoredAcademyCourse = {
  slug: string;
  title: string;
  shortTitle: string;
  order: number;
  availability: AuthoredCourseAvailability;
  summary: string;
  audience: string;
  outcomes: string[];
  startGuidance: string;
  canTakeAnytime: boolean;
  lessons: AuthoredAcademyLesson[];
  badge: AuthoredCourseBadge;
  finalAssessment: AuthoredCourseAssessment;
};

function question(
  id: string,
  prompt: string,
  options: string[],
  answerIndex: number,
  explanation: string,
): QuizQuestion {
  return { id, prompt, options, answerIndex, explanation };
}

function findLessonById(lessonId: string): CurriculumLesson | null {
  const programSources = [...ML_ENGINEER_PROGRAM, ...ML_ENGINEER_CURRICULUM];

  for (const course of programSources) {
    for (const courseModule of course.modules) {
      for (const lesson of courseModule.lessons) {
        if (lesson.id === lessonId) {
          return lesson;
        }
      }
    }
  }

  return null;
}

function buildAuthoredAcademyLesson(lessonId: string): AuthoredAcademyLesson {
  const lesson = findLessonById(lessonId);
  const hostedLesson = getAuthoredHostedLessonContent(lessonId);

  if (!lesson || !hostedLesson) {
    throw new Error(`Authored academy lesson "${lessonId}" is not fully available.`);
  }

  return {
    ...lesson,
    hostedLesson,
  };
}

const AUTHORED_ACADEMY_COURSES: AuthoredAcademyCourse[] = [
  {
    slug: "mathematical-thinking-for-ml",
    title: "Mathematical Thinking for Machine Learning",
    shortTitle: "Math for ML",
    order: 1,
    availability: "Start here",
    summary:
      "A fully authored foundations course on linear algebra, geometry, gradients, curvature, and optimization intuition for ML engineers.",
    audience:
      "Start here if you want the rest of ML to make structural sense instead of feeling like memorized tooling.",
    outcomes: [
      "Explain matrix operations, projections, and PCA geometrically.",
      "Read gradients, Jacobians, and curvature as model-behavior signals.",
      "Debug training behavior with calculus language instead of vague intuition.",
      "Enter later ML courses with stronger mathematical confidence.",
    ],
    startGuidance:
      "This is the first authored course. Take it before anything else if your math intuition feels rusty or fragmented.",
    canTakeAnytime: false,
    lessons: [
      buildAuthoredAcademyLesson("math-foundations-lesson-1"),
      buildAuthoredAcademyLesson("math-foundations-lesson-2"),
      buildAuthoredAcademyLesson("math-foundations-lesson-3"),
      buildAuthoredAcademyLesson("math-foundations-lesson-4"),
    ],
    badge: {
      id: "badge-math-for-ml",
      title: "Mathematical Thinking for ML",
      description:
        "Earned by completing the authored math foundations course and passing the end-of-course mastery test.",
      emblem: "Sigma Grid",
    },
    finalAssessment: {
      title: "Mathematical Thinking Badge Test",
      description:
        "A short mastery exam covering vector geometry, projection intuition, gradients, chain rule, and curvature.",
      passingScore: 4,
      questions: [
        question(
          "math-badge-q1",
          "Why is projection language central to linear regression and PCA?",
          [
            "Because both are special cases of sorting features by correlation",
            "Because both choose a subspace and approximate structure by projecting onto it",
            "Because both avoid all matrix multiplication",
            "Because both guarantee nonlinear expressivity",
          ],
          1,
          "Regression and PCA are both fundamentally approximation stories in subspaces, so projection is the clean geometric lens.",
        ),
        question(
          "math-badge-q2",
          "What does a gradient tell you during training?",
          [
            "The global optimum of the model",
            "The local sensitivity of the loss to parameter changes",
            "That the model is causal",
            "How many features should be removed",
          ],
          1,
          "A gradient is a local signal about how the loss changes with respect to parameters, not a full summary of the landscape.",
        ),
        question(
          "math-badge-q3",
          "Why is backpropagation best understood as structured chain rule bookkeeping?",
          [
            "Because it replaces calculus with heuristics",
            "Because it reuses local derivatives across a composed computation graph efficiently",
            "Because it only works for linear models",
            "Because it estimates Hessians exactly",
          ],
          1,
          "Backprop is the chain rule organized over a graph so the model can reuse intermediate sensitivities instead of recomputing everything.",
        ),
        question(
          "math-badge-q4",
          "What kind of training surface makes a single global learning rate especially fragile?",
          [
            "One with uniform curvature in every direction",
            "One with strong conditioning differences across directions",
            "One with no parameters",
            "One where the loss is already zero",
          ],
          1,
          "Poor conditioning means one learning rate can be too small in some directions and too aggressive in others.",
        ),
        question(
          "math-badge-q5",
          "When can PCA be misleading even if it explains a large amount of variance?",
          [
            "When the task depends on nonlinear or low-variance but highly discriminative structure",
            "When the dataset has more than two columns",
            "Whenever the data is normalized",
            "Whenever eigenvectors exist",
          ],
          0,
          "Variance preservation is not the same thing as task relevance; PCA can compress the wrong structure very confidently.",
        ),
        question(
          "math-badge-q6",
          "Why should one held-out metric never be treated as final scientific certainty?",
          [
            "Because evaluation metrics are always invalid",
            "Because the result is still a sample-dependent estimate influenced by uncertainty and shift",
            "Because test sets cannot measure model quality at all",
            "Because only Bayesian methods matter",
          ],
          1,
          "A held-out score is useful evidence, but it remains contingent on data generation, sampling, and shift assumptions.",
        ),
      ],
    },
  },
  {
    slug: "ml-problem-framing-and-evaluation",
    title: "ML Problem Framing and Honest Evaluation",
    shortTitle: "Problem Framing",
    order: 2,
    availability: "Take second",
    summary:
      "A fully authored course on task definition, label design, leakage, split strategy, baselines, and trustworthy evaluation.",
    audience:
      "Take this after the math course if you want to stop jumping straight from product requests to model selection.",
    outcomes: [
      "Turn vague product requests into learnable ML tasks.",
      "Choose metrics, horizons, and interventions that reflect deployment reality.",
      "Detect leakage and fix split strategies before trusting results.",
      "Use baseline ladders to keep experimentation honest.",
    ],
    startGuidance:
      "Take this immediately after the math course. It is the best next step before moving into the larger source-backed curriculum tracks.",
    canTakeAnytime: false,
    lessons: [
      buildAuthoredAcademyLesson("ml101-lesson-1"),
      buildAuthoredAcademyLesson("ml101-lesson-2"),
      buildAuthoredAcademyLesson("ml101-lesson-3"),
      buildAuthoredAcademyLesson("ml101-lesson-4"),
    ],
    badge: {
      id: "badge-ml-framing",
      title: "ML Problem Framing and Evaluation",
      description:
        "Earned by completing the authored ML framing course and passing the end-of-course badge test.",
      emblem: "Signal Compass",
    },
    finalAssessment: {
      title: "ML Framing Badge Test",
      description:
        "A final exam on task families, label quality, leakage, split design, and baseline discipline.",
      passingScore: 4,
      questions: [
        question(
          "framing-badge-q1",
          "Why is correctly identifying the task family the first serious ML engineering decision?",
          [
            "Because it determines model color palettes",
            "Because it determines labels, metrics, failure modes, and deployment assumptions",
            "Because it always forces deep learning",
            "Because it removes the need for stakeholder input",
          ],
          1,
          "Prediction, ranking, anomaly detection, and generation each imply different evaluation logic and operational behavior.",
        ),
        question(
          "framing-badge-q2",
          "What makes a target variable more than just a convenient column?",
          [
            "It encodes the chosen outcome, decision horizon, and intervention assumptions",
            "It guarantees causality",
            "It should always be hand-labeled by one team",
            "It removes the need for baselines",
          ],
          0,
          "Targets reflect what matters, when it matters, and how the organization will act on the prediction.",
        ),
        question(
          "framing-badge-q3",
          "Why can a random row split overstate performance in user-centric systems?",
          [
            "Because row order is always meaningful",
            "Because users may appear in both train and test, letting the model benefit from identity or behavior leakage",
            "Because metrics only work on grouped splits",
            "Because randomization makes training impossible",
          ],
          1,
          "If the same entity appears across sets, you may be measuring memorization rather than realistic generalization.",
        ),
        question(
          "framing-badge-q4",
          "What is the real purpose of a baseline ladder?",
          [
            "To satisfy documentation requirements only",
            "To protect the team from overclaiming and to justify added complexity honestly",
            "To replace deployment-aware evaluation",
            "To avoid using modern models forever",
          ],
          1,
          "Baselines create a reference floor and force teams to explain why extra complexity is earning its keep.",
        ),
        question(
          "framing-badge-q5",
          "What is the best response when a model’s offline score drops after you remove leakage?",
          [
            "Restore the leaked feature because the earlier result was better",
            "Treat the lower score as more honest and continue from the cleaned evaluation setup",
            "Ignore the score and ship anyway",
            "Switch metrics until the number rises again",
          ],
          1,
          "A lower but honest score is far more valuable than a strong offline number built on an invalid experiment.",
        ),
        question(
          "framing-badge-q6",
          "What is the real value of structured error analysis after training?",
          [
            "It decorates a report after the important work is done",
            "It helps identify which failure buckets matter most and should drive the next experiment",
            "It removes the need for validation data",
            "It guarantees the next model will be larger",
          ],
          1,
          "Error analysis is what turns aggregate failure into an actionable engineering plan.",
        ),
      ],
    },
  },
  {
    slug: "statistical-inference-and-probabilistic-modeling",
    title: "Statistical Inference and Probabilistic Modeling",
    shortTitle: "Statistical Inference",
    order: 3,
    availability: "Take third",
    summary:
      "A fully authored course on uncertainty statements, multiple comparisons, Bayesian updating, causal caution, and experiment validity for ML engineers.",
    audience:
      "Take this after the first two courses when you can already build and evaluate models but need stronger discipline about what your evidence really supports.",
    outcomes: [
      "Use confidence, credibility, and resampling language correctly.",
      "Spot overclaiming caused by weak statistical interpretation or exploratory fishing.",
      "Separate predictive usefulness from unsupported causal storytelling.",
      "Design more trustworthy experiments and product claims.",
    ],
    startGuidance:
      "Take this third. It sharpens your scientific discipline before you move deeper into systems-heavy or model-heavy tracks.",
    canTakeAnytime: false,
    lessons: [
      buildAuthoredAcademyLesson("stats-lesson-1"),
      buildAuthoredAcademyLesson("stats-lesson-2"),
    ],
    badge: {
      id: "badge-statistical-inference",
      title: "Statistical Inference and Probabilistic Modeling",
      description:
        "Earned by completing the authored inference course and passing the end-of-course badge assessment.",
      emblem: "Evidence Prism",
    },
    finalAssessment: {
      title: "Inference Badge Test",
      description:
        "A final exam on uncertainty statements, multiple comparisons, causal caution, and experiment validity.",
      passingScore: 4,
      questions: [
        question(
          "stats-badge-q1",
          "Why is it dangerous to talk about a confidence interval as if it were a Bayesian probability statement about the parameter?",
          [
            "Because intervals are only for regression",
            "Because confidence and credible intervals answer different questions under different interpretations",
            "Because Bayesian methods ban intervals",
            "Because parameters cannot be estimated",
          ],
          1,
          "Confidence intervals and credible intervals rely on different interpretations of uncertainty; treating them as interchangeable blurs the claim.",
        ),
        question(
          "stats-badge-q2",
          "What is the main risk of checking many models, slices, or prompts before highlighting one successful result?",
          [
            "It reduces dataset size automatically",
            "It inflates the chance of finding an apparently impressive result by luck",
            "It makes Bayesian reasoning impossible",
            "It guarantees causal validity",
          ],
          1,
          "Exploratory search raises the burden of proof because some good-looking results emerge by chance alone.",
        ),
        question(
          "stats-badge-q3",
          "What does Bayesian updating make explicit that teams often keep implicit anyway?",
          [
            "The role of prior beliefs and how new evidence changes them",
            "That data has no assumptions",
            "That experiments are unnecessary",
            "That all models should be generative",
          ],
          0,
          "Bayesian language is valuable partly because it forces assumptions and evidence combination into the open.",
        ),
        question(
          "stats-badge-q4",
          "Why is causal language risky in ordinary predictive ML work?",
          [
            "Because prediction and intervention are different claims, and predictive evidence may not justify action-level conclusions",
            "Because causal models cannot use data",
            "Because predictive models are always useless",
            "Because A/B tests are illegal",
          ],
          0,
          "A predictive relationship can support forecasting without supporting intervention claims about what would happen if you changed the system.",
        ),
        question(
          "stats-badge-q5",
          "Why can an A/B test still mislead even after randomization?",
          [
            "Because randomization guarantees nothing can go wrong",
            "Because instrumentation, interference, segmentation, and stopping logic can still distort interpretation",
            "Because treatment and control must always have identical outcomes",
            "Because experiments remove the need for metrics",
          ],
          1,
          "Randomization helps, but sloppy implementation and interpretation can still corrupt the evidence.",
        ),
      ],
    },
  },
  {
    slug: "scientific-computing-and-data-systems-for-mle",
    title: "Scientific Computing and Data Systems for MLE",
    shortTitle: "MLE Systems",
    order: 4,
    availability: "Take fourth",
    summary:
      "A fully authored course on reproducible training workflows, data contracts, numeric hygiene, experiment lineage, model promotion, and orchestration judgment.",
    audience:
      "Take this after the evidence-focused courses when you want your ML work to survive reruns, reviews, handoffs, and deployment pressure like real engineering.",
    outcomes: [
      "Build config-driven, reproducible experiment workflows.",
      "Define pipeline and data assumptions explicitly instead of leaving them in notebooks.",
      "Preserve lineage across code, data, metrics, and artifacts.",
      "Design release gates and orchestration flows with evidence and rollback in mind.",
    ],
    startGuidance:
      "Take this fourth. It is where the academy shifts from 'understand ML honestly' to 'run ML as dependable engineering work.'",
    canTakeAnytime: false,
    lessons: [
      buildAuthoredAcademyLesson("compute-lesson-1"),
      buildAuthoredAcademyLesson("compute-lesson-2"),
    ],
    badge: {
      id: "badge-mle-systems",
      title: "Scientific Computing and Data Systems for MLE",
      description:
        "Earned by completing the authored MLE systems course and passing the course badge assessment.",
      emblem: "Runtime Ledger",
    },
    finalAssessment: {
      title: "MLE Systems Badge Test",
      description:
        "A final exam on reproducibility, data contracts, numeric hygiene, experiment lineage, and promotion workflows.",
      passingScore: 4,
      questions: [
        question(
          "compute-badge-q1",
          "What is the clearest sign that an ML workflow is not reproducible enough for engineering use?",
          [
            "It uses Python notebooks somewhere",
            "Its results depend on undocumented manual steps, hidden paths, or ambiguous configuration",
            "It stores metrics in a dashboard",
            "It includes baseline models",
          ],
          1,
          "If another engineer cannot rerun the workflow from explicit code, config, and inputs, the result is too fragile.",
        ),
        question(
          "compute-badge-q2",
          "Why are data contracts important in ML pipelines?",
          [
            "Because they guarantee model fairness automatically",
            "Because they make schema, transform, and inference-time assumptions explicit and testable",
            "Because they replace evaluation",
            "Because they only matter for databases",
          ],
          1,
          "Data contracts prevent silent pipeline drift from masquerading as a model problem.",
        ),
        question(
          "compute-badge-q3",
          "Why is numeric hygiene part of scientific credibility?",
          [
            "Because floating-point and stochastic choices can materially affect whether a claimed improvement is real",
            "Because only infrastructure engineers care about precision",
            "Because determinism is always possible",
            "Because metrics ignore runtime behavior",
          ],
          0,
          "Randomness, precision, and runtime details shape the evidence behind the claim, especially when gains are small.",
        ),
        question(
          "compute-badge-q4",
          "What is the real value of a model registry?",
          [
            "It is just a directory of saved weights",
            "It preserves lineage, status, evidence, and release coordination for model versions",
            "It makes drift impossible",
            "It eliminates the need for approval workflows",
          ],
          1,
          "A registry is valuable because it captures release-relevant evidence and lineage, not merely because it stores files.",
        ),
        question(
          "compute-badge-q5",
          "When is orchestration worth introducing into an ML workflow?",
          [
            "Whenever the architecture diagram needs more boxes",
            "When recurring multi-step workflows need repeatability, observability, retries, and explicit handoffs",
            "Only after deep learning is added",
            "Whenever a workflow uses more than one script",
          ],
          1,
          "Orchestration earns its keep when it stabilizes a real recurring workflow with dependency and observability needs.",
        ),
      ],
    },
  },
// Academy courses 5-12: Advanced track courses
// To be inserted into AUTHORED_ACADEMY_COURSES array in authored-academy.ts
// Insert before the closing `];` on the last line of the array

  {
    slug: "history-of-ai-ml",
    title: "History of AI and Machine Learning",
    shortTitle: "AI/ML History",
    order: 5,
    availability: "Take anytime after foundations",
    summary:
      "A critical history course on the cycles of optimism, winter, rebranding, and technical breakthroughs that shaped AI and ML through April 2026.",
    audience:
      "Take this whenever you want historical context for why the field makes the choices it does. It pairs well with any of the technical courses.",
    outcomes: [
      "Explain the major technical eras of AI and ML with engineering specificity.",
      "Distinguish symbolic, statistical, and neural traditions and what each got right.",
      "Connect historical limits to present-day failure modes in LLMs and agents.",
      "Critique hype cycles using technical and economic evidence.",
    ],
    startGuidance:
      "Take anytime after the first four courses. History becomes richer once you have real engineering context to connect it to.",
    canTakeAnytime: true,
    lessons: [
      buildAuthoredAcademyLesson("history-lesson-1"),
      buildAuthoredAcademyLesson("history-lesson-2"),
      buildAuthoredAcademyLesson("history-lesson-3"),
      buildAuthoredAcademyLesson("history-lesson-4"),
    ],
    badge: {
      id: "badge-history-ai-ml",
      title: "History of AI and Machine Learning",
      description:
        "Earned by completing the AI/ML history course and passing the badge assessment.",
      emblem: "Field Archaeologist",
    },
    finalAssessment: {
      title: "AI/ML History Badge Test",
      description:
        "A final exam on the major eras of AI, key failure modes, and critical evaluation of modern ML claims.",
      passingScore: 4,
      questions: [
        question(
          "history-badge-q1",
          "Why did classical expert systems fail to scale despite impressive domain demonstrations?",
          [
            "They ran on hardware that was too slow",
            "They required hand-authored rules that could not handle uncertainty, novelty, and the maintenance cost of real-world complexity",
            "They were mathematically unsound from the start",
            "They required too much labeled data",
          ],
          1,
          "Expert systems were brittle because knowledge engineering does not scale gracefully under distribution change and novelty.",
        ),
        question(
          "history-badge-q2",
          "What did the probabilistic turn give machine learning that symbolic AI lacked?",
          [
            "Faster hardware and more memory",
            "The ability to represent and reason under uncertainty, and to improve from data",
            "Perfect interpretability of decisions",
            "The ability to write programs automatically",
          ],
          1,
          "Probabilistic modeling made uncertainty first-class and enabled empirical improvement from observed examples.",
        ),
        question(
          "history-badge-q3",
          "Which statement best describes why deep learning became dominant after 2012?",
          [
            "A single research paper solved the core problems of AI",
            "The convergence of scale, hardware, data pipelines, open frameworks, and optimization techniques lowered the barrier to practical results",
            "Neural networks had no weaknesses in the ImageNet era",
            "Symbolic AI was simply banned",
          ],
          1,
          "Deep learning's rise was a systems story as much as an algorithmic one.",
        ),
        question(
          "history-badge-q4",
          "What historical pattern do LLM and agent system failures most closely echo?",
          [
            "Benchmark overfitting and impressive demos masking brittleness under deployment conditions",
            "The proof that generalization is impossible",
            "The end of the statistical era",
            "The discovery that scale always works",
          ],
          0,
          "The gap between demo capability and deployment robustness is a recurring theme across every major AI era.",
        ),
        question(
          "history-badge-q5",
          "Why should an ML engineer in 2026 study AI winters?",
          [
            "To know which programming languages to avoid",
            "To recognize when capability claims outrun evaluation discipline, infrastructure readiness, and economic sustainability",
            "To understand that neural networks always work",
            "To avoid using symbolic methods entirely",
          ],
          1,
          "AI winters are engineering and economic cautionary tales about the gap between promising results and durable production capability.",
        ),
      ],
    },
  },
  {
    slug: "classical-ml-and-statistical-learning",
    title: "Classical ML and Statistical Learning for Engineers",
    shortTitle: "Classical ML",
    order: 6,
    availability: "Take anytime after foundations",
    summary:
      "A deep course on linear models, trees, boosting, calibration, ranking, and feature engineering that prevents engineers from skipping directly to deep nets where simpler methods dominate.",
    audience:
      "Take this before or alongside deep learning. Classical methods dominate tabular data, ranking systems, and calibrated prediction in production.",
    outcomes: [
      "Choose classical models by data regime and operational constraints.",
      "Understand calibration, ranking, and threshold policy beyond ROC curves.",
      "Build strong tabular and sparse-feature baselines.",
      "Perform robust ablations and honest feature audits.",
    ],
    startGuidance:
      "Take after the first four courses. Pairs well before or alongside the deep learning course.",
    canTakeAnytime: false,
    lessons: [
      buildAuthoredAcademyLesson("classical-lesson-1"),
      buildAuthoredAcademyLesson("classical-lesson-2"),
      buildAuthoredAcademyLesson("classical-lesson-3"),
      buildAuthoredAcademyLesson("classical-lesson-4"),
    ],
    badge: {
      id: "badge-classical-ml",
      title: "Classical ML and Statistical Learning",
      description:
        "Earned by completing the classical ML course and passing the badge assessment.",
      emblem: "Tabular Craftsman",
    },
    finalAssessment: {
      title: "Classical ML Badge Test",
      description:
        "A final exam on linear models, calibration, feature engineering, tree ensembles, and ranking systems.",
      passingScore: 4,
      questions: [
        question(
          "classical-badge-q1",
          "Why can a model with excellent ROC-AUC still fail operationally?",
          [
            "Because ROC-AUC measures training loss, not validation performance",
            "Because ranking quality does not guarantee well-calibrated probabilities or a useful decision threshold",
            "Because AUC only applies to binary classification",
            "Because calibration is only needed in regression",
          ],
          1,
          "Discrimination and calibration are separate properties; strong ranking can coexist with poor probability estimates.",
        ),
        question(
          "classical-badge-q2",
          "What does L1 regularization encourage that L2 does not?",
          [
            "Faster convergence without any other effect",
            "Sparsity: some coefficients are driven exactly to zero, which can act as implicit feature selection",
            "Guaranteed causal coefficients",
            "Perfect intercept estimation",
          ],
          1,
          "L1's penalty geometry creates sparse solutions where many coefficients vanish, unlike L2's smooth shrinkage.",
        ),
        question(
          "classical-badge-q3",
          "What makes feature interpretation risky when features are correlated or policy-entangled?",
          [
            "Correlation always improves model accuracy",
            "Coefficients and importance scores become unreliable guides to causal contribution when features share variance or encode institutional choices",
            "Policy features reduce overfitting automatically",
            "Correlation only matters in tree models",
          ],
          1,
          "Interpretation claims weaken when the feature pipeline entangles measurement with policy and collinear signals.",
        ),
        question(
          "classical-badge-q4",
          "Why are gradient boosted trees often the right default for tabular production systems?",
          [
            "They never require feature engineering",
            "They naturally model interaction effects and nonlinearities that linear models require hand-engineering to capture",
            "They extrapolate better than any other model family",
            "They eliminate the need for calibration",
          ],
          1,
          "Boosted trees efficiently capture the interaction structure common in real tabular datasets without extensive manual feature construction.",
        ),
        question(
          "classical-badge-q5",
          "Why are candidate generation errors more dangerous than reranking errors in retrieval systems?",
          [
            "Because rerankers are slower than generators",
            "Because items excluded from the candidate set are invisible to all downstream stages and can never be recovered",
            "Because candidate generation uses more compute",
            "Because reranking errors always cancel out",
          ],
          1,
          "A missed candidate is a permanent loss of recall; later stages can only reorder what they receive.",
        ),
      ],
    },
  },
  {
    slug: "deep-learning-and-representation-engineering",
    title: "Deep Learning and Representation Engineering",
    shortTitle: "Deep Learning",
    order: 7,
    availability: "Take anytime after foundations",
    summary:
      "A systems-minded deep learning course covering optimization, architectures, embeddings, transformers, and the engineering discipline needed to train and debug modern neural models.",
    audience:
      "Take this after Classical ML. Neural systems dominate perception, language, and large-scale representation learning, but they punish shallow understanding with expensive failures.",
    outcomes: [
      "Train and debug neural models with principled diagnostics.",
      "Understand embeddings, representation quality, and architecture tradeoffs.",
      "Reason about compute, memory, and scaling constraints.",
      "Connect training decisions to downstream deployment behavior.",
    ],
    startGuidance:
      "Take this after Classical ML. It builds on the same evaluation and baseline discipline but adds neural-specific failure modes and scale economics.",
    canTakeAnytime: false,
    lessons: [
      buildAuthoredAcademyLesson("dl-lesson-1"),
      buildAuthoredAcademyLesson("dl-lesson-2"),
      buildAuthoredAcademyLesson("dl-lesson-3"),
      buildAuthoredAcademyLesson("dl-lesson-4"),
    ],
    badge: {
      id: "badge-deep-learning",
      title: "Deep Learning and Representation Engineering",
      description:
        "Earned by completing the deep learning course and passing the badge assessment.",
      emblem: "Gradient Cartographer",
    },
    finalAssessment: {
      title: "Deep Learning Badge Test",
      description:
        "A final exam on backpropagation, embeddings, architectures, scaling, and inference tradeoffs.",
      passingScore: 4,
      questions: [
        question(
          "dl-badge-q1",
          "Why does poor weight initialization matter before any training begins?",
          [
            "It changes the GPU driver behavior",
            "It determines the initial gradient scale, which can destroy learning signal before the optimizer has any chance to help",
            "It only affects the final layer",
            "It only matters when batch normalization is absent",
          ],
          1,
          "Initialization sets the activation and gradient scales before any data is seen, making it a prerequisite for stable training.",
        ),
        question(
          "dl-badge-q2",
          "What is the most common mistake in evaluating embedding quality?",
          [
            "Using too many dimensions",
            "Assuming that visually coherent neighborhoods in a 2D t-SNE projection imply strong downstream task performance",
            "Normalizing embeddings before comparison",
            "Training with too many negative examples",
          ],
          1,
          "t-SNE visualizations are projections; downstream task alignment requires explicit evaluation against real task metrics.",
        ),
        question(
          "dl-badge-q3",
          "When might a CNN outperform a vision transformer on a production task?",
          [
            "Never: transformers are always better",
            "When the task benefits from local inductive bias, the dataset is small, or latency and memory constraints make attention heads too expensive",
            "Only when the dataset has more than 1 million images",
            "When the images are very large",
          ],
          1,
          "Architectural choice should follow task structure and operational constraints, not just benchmark leaderboards.",
        ),
        question(
          "dl-badge-q4",
          "What does parameter-efficient fine-tuning like LoRA accomplish that full fine-tuning cannot?",
          [
            "It always achieves higher quality than full updates",
            "It adapts a model to a new task while updating far fewer parameters, reducing memory, compute, and infrastructure burden",
            "It permanently freezes the base model",
            "It eliminates the need for evaluation on the downstream task",
          ],
          1,
          "PEFT methods lower the cost of adaptation when full-weight updates are unnecessary or prohibitive.",
        ),
        question(
          "dl-badge-q5",
          "Why is model scaling not a free lunch in production systems?",
          [
            "Larger models always reduce accuracy",
            "Quality gains from scale must be weighed against increased latency, VRAM, serving cost, and operational fragility",
            "Scaling makes monitoring irrelevant",
            "Larger models cannot be quantized",
          ],
          0,
          "Scale increases capability along some axes while creating real costs and constraints along others.",
        ),
      ],
    },
  },
  {
    slug: "ml-systems-and-mlops",
    title: "ML Systems, MLOps, and Production Reliability",
    shortTitle: "ML Systems",
    order: 8,
    availability: "Take anytime after foundations",
    summary:
      "A production engineering course on data pipelines, feature stores, experiment tracking, CI/CD for models, observability, and failure management.",
    audience:
      "Take this after the foundations courses. A model without data contracts, observability, and rollback discipline is a demo.",
    outcomes: [
      "Design robust training and serving pipelines.",
      "Operate models with monitoring, rollback, and incident response.",
      "Manage feature drift, label delay, and offline-online skew.",
      "Tie ML deployment decisions to product and cost constraints.",
    ],
    startGuidance:
      "Take this after the foundation courses and alongside or after Deep Learning. Production reliability is orthogonal to architecture knowledge.",
    canTakeAnytime: false,
    lessons: [
      buildAuthoredAcademyLesson("systems-lesson-1"),
      buildAuthoredAcademyLesson("systems-lesson-2"),
      buildAuthoredAcademyLesson("systems-lesson-3"),
      buildAuthoredAcademyLesson("systems-lesson-4"),
    ],
    badge: {
      id: "badge-ml-systems-mlops",
      title: "ML Systems and MLOps",
      description:
        "Earned by completing the ML systems course and passing the badge assessment.",
      emblem: "Pipeline Operator",
    },
    finalAssessment: {
      title: "ML Systems Badge Test",
      description:
        "A final exam on feature pipelines, experiment tracking, drift, incident response, and production release discipline.",
      passingScore: 4,
      questions: [
        question(
          "systems-badge-q1",
          "What does point-in-time correctness protect against in feature engineering?",
          [
            "Slow Python code",
            "Using information at training time that would not have been available when the model makes its prediction in serving",
            "GPU memory fragmentation",
            "Slow data loading",
          ],
          1,
          "Point-in-time correctness ensures training features only use data that was available at the time of prediction.",
        ),
        question(
          "systems-badge-q2",
          "What is the clearest sign that an experiment tracking system is insufficient?",
          [
            "It stores more than 100 metrics per run",
            "You cannot recreate a released model from versioned code, dataset fingerprint, environment, and configuration",
            "It uses cloud storage",
            "It logs validation accuracy",
          ],
          1,
          "Reproducibility is the baseline requirement; tracking is only useful if it captures everything needed to recreate the result.",
        ),
        question(
          "systems-badge-q3",
          "Why is concept drift more dangerous than data drift?",
          [
            "Because data drift does not affect model predictions",
            "Because concept drift changes the relationship between inputs and targets, which invalidates the model's learned mapping rather than just shifting the distribution",
            "Because concept drift only affects images",
            "Because data drift cannot be detected",
          ],
          1,
          "Concept drift corrupts the predictive mapping itself, not just the input statistics.",
        ),
        question(
          "systems-badge-q4",
          "Why should ML incident postmortems focus on systems rather than blame?",
          [
            "Because models fail randomly and blame is always wrong",
            "Because lasting reliability comes from fixing data quality, tooling gaps, process gaps, and ownership clarity",
            "Because only leadership reads postmortems",
            "Because root cause is always unknowable",
          ],
          1,
          "Blameless postmortems expose system-level weaknesses that allowed the incident to occur.",
        ),
        question(
          "systems-badge-q5",
          "What is a strong reason to maintain a non-ML fallback path in a production system?",
          [
            "It always produces better predictions",
            "It preserves service capability when the model is unavailable, unreliable, or under active incident investigation",
            "It reduces model training cost",
            "It eliminates the need for monitoring",
          ],
          1,
          "Fallback paths protect product continuity under model failure or uncertainty.",
        ),
      ],
    },
  },
  {
    slug: "llm-rag-and-agentic-systems",
    title: "LLMs, Retrieval, and Agentic Systems",
    shortTitle: "LLM Systems",
    order: 9,
    availability: "Take anytime after foundations",
    summary:
      "A practical and critical course on LLM architectures, prompting, retrieval, fine-tuning, evaluation, tool use, and the engineering realities of agentic systems in 2026.",
    audience:
      "Take this after Deep Learning and ML Systems. Modern ML engineering increasingly means building model-plus-system stacks where retrieval, orchestration, and cost management matter as much as the model itself.",
    outcomes: [
      "Design robust RAG and tool-use systems that fail predictably.",
      "Evaluate LLMs with task-aligned and adversarial protocols.",
      "Manage latency, cost, retrieval quality, and safety together.",
      "Recognize the boundary between useful automation and brittle theater.",
    ],
    startGuidance:
      "Take after Deep Learning and ML Systems. Agents are a combination of language model behavior, retrieval engineering, and distributed systems reliability.",
    canTakeAnytime: false,
    lessons: [
      buildAuthoredAcademyLesson("llm-lesson-1"),
      buildAuthoredAcademyLesson("llm-lesson-2"),
      buildAuthoredAcademyLesson("llm-lesson-3"),
      buildAuthoredAcademyLesson("llm-lesson-4"),
    ],
    badge: {
      id: "badge-llm-systems",
      title: "LLMs, Retrieval, and Agentic Systems",
      description:
        "Earned by completing the LLM systems course and passing the badge assessment.",
      emblem: "Context Architect",
    },
    finalAssessment: {
      title: "LLM Systems Badge Test",
      description:
        "A final exam on RAG architecture, LLM evaluation, tool use, and agent reliability.",
      passingScore: 4,
      questions: [
        question(
          "llm-badge-q1",
          "Where do most RAG system failures originate?",
          [
            "In the language model's generation step",
            "In retrieval quality: chunking, indexing, recall, reranking, or context packing before generation ever runs",
            "In the prompt template wording",
            "In API rate limiting",
          ],
          1,
          "Prompt engineering cannot recover from missing or poor-quality retrieved evidence.",
        ),
        question(
          "llm-badge-q2",
          "Why must retrieval evaluation be separated from answer evaluation in RAG systems?",
          [
            "Because retrieval metrics are faster to compute",
            "Because failure attribution requires knowing whether the problem was missing evidence or weak synthesis",
            "Because answer quality always reflects retrieval quality perfectly",
            "Because generators cannot be evaluated independently",
          ],
          1,
          "Separating stages enables precise failure attribution and targeted improvement.",
        ),
        question(
          "llm-badge-q3",
          "What is the primary advantage of fixed workflow orchestration over free-form agentic planning?",
          [
            "Workflows produce more creative outputs",
            "Workflows make cost, state transitions, and failure handling explicit and controllable rather than emergent and opaque",
            "Workflows eliminate the need for tools",
            "Workflows always run faster",
          ],
          1,
          "Structured workflows trade flexibility for predictability, observability, and debuggability.",
        ),
        question(
          "llm-badge-q4",
          "Why is prompt injection especially serious when an agent can call tools?",
          [
            "Because it only affects text outputs",
            "Because untrusted text entering the context can manipulate tool selection, parameters, or execution paths with real side effects",
            "Because tools are always sandboxed",
            "Because it only matters in multi-user systems",
          ],
          1,
          "Tool-calling converts language into action, making the injection surface directly consequential.",
        ),
        question(
          "llm-badge-q5",
          "What is the core risk of using an LLM as a judge without auditing it?",
          [
            "It will refuse to evaluate anything",
            "It can introduce systematic biases and brittle scoring behaviors that are hard to detect but look authoritative",
            "It prevents human review",
            "It makes evaluation slower",
          ],
          1,
          "Model-based graders are themselves fallible systems that require calibration and periodic human audit.",
        ),
      ],
    },
  },
  {
    slug: "reliable-responsible-and-frontier-ml-2026",
    title: "Reliable, Responsible, and Frontier ML Engineering (2026)",
    shortTitle: "Frontier ML",
    order: 10,
    availability: "Take anytime after foundations",
    summary:
      "The capstone course: robustness, fairness, security, multimodal systems, synthetic data, and the critical engineering mindset for frontier ML work in April 2026.",
    audience:
      "Take this last. It synthesizes every prior course into the profile of a principled senior ML engineer who can design, critique, and defend end-to-end systems.",
    outcomes: [
      "Design robust evaluation and governance loops for high-stakes systems.",
      "Understand ML security and adversarial risk at a systems level.",
      "Reason about multimodal and frontier-model deployment constraints.",
      "Operate as a skeptical, evidence-driven ML engineer.",
    ],
    startGuidance:
      "Take this last. It is the capstone that connects every earlier course into a coherent engineering posture.",
    canTakeAnytime: false,
    lessons: [
      buildAuthoredAcademyLesson("frontier-lesson-1"),
      buildAuthoredAcademyLesson("frontier-lesson-2"),
      buildAuthoredAcademyLesson("frontier-lesson-3"),
      buildAuthoredAcademyLesson("frontier-lesson-4"),
    ],
    badge: {
      id: "badge-frontier-ml-2026",
      title: "Reliable, Responsible, and Frontier ML Engineering",
      description:
        "Earned by completing the frontier ML course and passing the final badge assessment.",
      emblem: "Principal Engineer",
    },
    finalAssessment: {
      title: "Frontier ML Badge Test",
      description:
        "A final exam on robustness, fairness, ML security, multimodal systems, and 2026 engineering practice.",
      passingScore: 4,
      questions: [
        question(
          "frontier-badge-q1",
          "Why does fairness engineering not reduce to a single technical metric?",
          [
            "Because there are not enough examples of unfair outcomes",
            "Because different fairness criteria encode incompatible normative choices that cannot all be satisfied simultaneously",
            "Because fairness only applies to protected attributes",
            "Because technical metrics are always sufficient",
          ],
          1,
          "Fairness requires explicit normative choices, not just technical analysis.",
        ),
        question(
          "frontier-badge-q2",
          "Why should model registries and training artifacts be treated as security concerns?",
          [
            "Because they are purely academic outputs",
            "Because compromised training artifacts or registry entries can silently alter deployed model behavior in ways that are hard to detect",
            "Because models cannot be versioned",
            "Because only the inference endpoint matters",
          ],
          1,
          "Training artifacts are deployable code equivalents and deserve the same integrity controls.",
        ),
        question(
          "frontier-badge-q3",
          "What is the main risk of using synthetic data without governance?",
          [
            "It always reduces model accuracy",
            "It can amplify existing blind spots, introduce evaluation contamination, and create misleadingly optimistic results",
            "It only affects generative models",
            "It improves labeling quality automatically",
          ],
          1,
          "Synthetic data amplifies whatever bias or coverage gap already exists in the supervision signal.",
        ),
        question(
          "frontier-badge-q4",
          "What does it mean for an ML engineer to be 'bilingual in research and production' in 2026?",
          [
            "Using two programming languages simultaneously",
            "Being able to read and critique recent papers while also owning data quality, evaluation, deployment, and operational reliability",
            "Having a research degree and a software degree",
            "Running two experiments in parallel",
          ],
          1,
          "Bilingualism here means integrating research-level model understanding with production-level systems discipline.",
        ),
        question(
          "frontier-badge-q5",
          "Which habit best distinguishes an evidence-driven ML engineer from one who follows hype?",
          [
            "Using the largest available model for every problem",
            "Requiring explicit baselines, evaluation on task-relevant slices, cost analysis, and failure-mode documentation before declaring progress",
            "Avoiding open-source models",
            "Publishing only positive results",
          ],
          1,
          "Demanding rigorous evidence — not just headline metrics — is the defining engineering discipline.",
        ),
      ],
    },
  },
  {
    slug: "computer-vision-and-multimodal-systems",
    title: "Computer Vision and Multimodal ML Systems",
    shortTitle: "Computer Vision",
    order: 11,
    availability: "Take anytime after foundations",
    summary:
      "A perception-focused course on visual representation learning, detection, segmentation, multimodal retrieval, and the failure modes that make real-world vision systems expensive and brittle.",
    audience:
      "Take this after Deep Learning if you work with image, video, or image-text systems. Perception surfaces distribution shift and annotation ambiguity more directly than language tasks.",
    outcomes: [
      "Build intuition for vision architectures, features, and deployment tradeoffs.",
      "Evaluate detection, segmentation, and retrieval systems beyond one headline metric.",
      "Reason about multimodal representation alignment and cross-modal failure modes.",
      "Design perception systems with operational constraints and dataset shift in mind.",
    ],
    startGuidance:
      "Take after Deep Learning. Vision is a specialized track — take it when relevant to your work or GaTech coursework.",
    canTakeAnytime: true,
    lessons: [
      buildAuthoredAcademyLesson("vision-lesson-1"),
      buildAuthoredAcademyLesson("vision-lesson-2"),
      buildAuthoredAcademyLesson("vision-lesson-3"),
    ],
    badge: {
      id: "badge-computer-vision",
      title: "Computer Vision and Multimodal Systems",
      description:
        "Earned by completing the computer vision course and passing the badge assessment.",
      emblem: "Perception Engineer",
    },
    finalAssessment: {
      title: "Computer Vision Badge Test",
      description:
        "A final exam on visual representations, structured prediction, evaluation, and multimodal retrieval.",
      passingScore: 4,
      questions: [
        question(
          "vision-badge-q1",
          "What does a convolutional inductive bias assume that a pure attention mechanism does not?",
          [
            "That all tokens are equally important",
            "That local spatial structure and translational invariance are useful priors for the task",
            "That images have no semantic content",
            "That resolution does not matter",
          ],
          1,
          "Convolutions encode locality and translation equivariance as priors; attention builds these relationships from data.",
        ),
        question(
          "vision-badge-q2",
          "Why is mAP (mean Average Precision) potentially misleading as a standalone detection metric?",
          [
            "Because it is too hard to compute",
            "Because it can hide failures on important object classes, IoU thresholds, or real-world scale variations",
            "Because it only works for segmentation",
            "Because it is only computed at one threshold",
          ],
          1,
          "Aggregate detection metrics compress many failure modes and slice behaviors into one number.",
        ),
        question(
          "vision-badge-q3",
          "What is shortcut learning in a vision model?",
          [
            "Using a pretrained model instead of training from scratch",
            "When a model exploits spurious statistical patterns such as background textures or collection artifacts instead of task-relevant structure",
            "Skipping validation during training",
            "Using lower resolution images",
          ],
          1,
          "Shortcut learning produces good in-distribution metrics while remaining fragile under distribution shift.",
        ),
        question(
          "vision-badge-q4",
          "Why are hard negatives valuable in contrastive or cross-modal retrieval evaluation?",
          [
            "They make the dataset smaller",
            "They force the model to learn finer-grained discrimination rather than succeeding on trivially different alternatives",
            "They eliminate the need for human labels",
            "They reduce training compute",
          ],
          1,
          "Easy negatives allow a weak model to appear strong; hard negatives expose actual representational quality.",
        ),
        question(
          "vision-badge-q5",
          "What is the most important question to ask about a multimodal retrieval system before deployment?",
          [
            "How many parameters does the model have?",
            "Does the evaluation reflect the actual user-relevant notion of relevance, including hard cases, cross-modal ambiguity, and real query distributions?",
            "What GPU was used for training?",
            "Is the latency under 10ms?",
          ],
          1,
          "Multimodal retrieval quality depends on evaluation that mirrors the true product requirement, not just generic embedding coherence.",
        ),
      ],
    },
  },
  {
    slug: "reinforcement-learning-and-sequential-decision-making",
    title: "Sequential Decision-Making and Reinforcement Learning",
    shortTitle: "RL & Decisions",
    order: 12,
    availability: "Take anytime after foundations",
    summary:
      "A critical course on bandits, MDPs, value functions, policy optimization, offline evaluation, and the engineering discipline required to use RL-like methods without fooling yourself.",
    audience:
      "Take this after Deep Learning and Statistical Inference. Even engineers who never train frontier RL agents benefit from understanding sequential decision-making and why feedback loops corrupt systems.",
    outcomes: [
      "Reason about sequential decision problems with the right abstractions.",
      "Understand core RL algorithms and why they are often unstable or sample-inefficient.",
      "Evaluate bandit and RL systems with appropriate skepticism about feedback loops.",
      "Identify when RL is justified versus when a simpler decision framework is better.",
    ],
    startGuidance:
      "Take after Deep Learning and Statistical Inference. RL is a specialized track — most engineers encounter it through bandits and recommendation before full RL.",
    canTakeAnytime: true,
    lessons: [
      buildAuthoredAcademyLesson("rl-lesson-1"),
      buildAuthoredAcademyLesson("rl-lesson-2"),
      buildAuthoredAcademyLesson("rl-lesson-3"),
    ],
    badge: {
      id: "badge-rl-decision-making",
      title: "Sequential Decision-Making and Reinforcement Learning",
      description:
        "Earned by completing the RL and decision-making course and passing the badge assessment.",
      emblem: "Policy Skeptic",
    },
    finalAssessment: {
      title: "RL Badge Test",
      description:
        "A final exam on MDPs, Bellman equations, RL algorithms, instability, and bandit evaluation.",
      passingScore: 4,
      questions: [
        question(
          "rl-badge-q1",
          "Why is credit assignment harder in RL than in supervised learning?",
          [
            "Because RL uses more parameters",
            "Because rewards may be sparse and delayed while actions alter the future data distribution, making it hard to attribute outcomes to specific decisions",
            "Because supervised labels are always wrong",
            "Because RL has no loss function",
          ],
          1,
          "Temporal structure and feedback loops make attribution fundamentally harder than one-shot prediction tasks.",
        ),
        question(
          "rl-badge-q2",
          "What does the Bellman equation provide that direct model fitting does not?",
          [
            "A closed-form solution to every decision problem",
            "A recursive decomposition of long-horizon value that enables bootstrapping from future value estimates",
            "A guarantee of policy optimality",
            "A way to eliminate the need for exploration",
          ],
          1,
          "Bellman decomposition lets you reason about sequential value without rolling out entire trajectories.",
        ),
        question(
          "rl-badge-q3",
          "Why is reward design a high-stakes choice in real RL deployments?",
          [
            "Because rewards determine GPU memory requirements",
            "Because agents often exploit the specified proxy rather than the underlying intention, and reward misspecification can cause costly failures",
            "Because rewards are always binary",
            "Because rewards are only used during evaluation",
          ],
          1,
          "Reward misspecification is the most common root cause of real RL failures in production systems.",
        ),
        question(
          "rl-badge-q4",
          "What makes off-policy evaluation especially risky?",
          [
            "Off-policy data is always biased upward",
            "Logged data reflects a different policy, so counterfactual estimates for the new policy are unreliable wherever coverage is poor",
            "Off-policy evaluation does not use rewards",
            "It requires too much compute",
          ],
          1,
          "Poor logging policy coverage creates holes in the support needed for accurate counterfactual inference.",
        ),
        question(
          "rl-badge-q5",
          "When is a contextual bandit a better choice than a full MDP formulation?",
          [
            "When you want longer horizon planning",
            "When actions have limited long-term state effects and the primary problem is one-step or short-horizon adaptation rather than policy optimization over trajectories",
            "When rewards are always dense and immediate",
            "When compute is unlimited",
          ],
          0,
          "Many practical decision problems are closer to one-step adaptation than to full sequential control.",
        ),
      ],
    },
  },

];

export function getAuthoredAcademyCourses() {
  return [...AUTHORED_ACADEMY_COURSES].sort((left, right) => left.order - right.order);
}

export function getAuthoredAcademyCourse(courseSlug: string) {
  return getAuthoredAcademyCourses().find((course) => course.slug === courseSlug) ?? null;
}

export function getAuthoredAcademyLesson(courseSlug: string, lessonId: string) {
  const course = getAuthoredAcademyCourse(courseSlug);

  if (!course) {
    return null;
  }

  return course.lessons.find((lesson) => lesson.id === lessonId) ?? null;
}