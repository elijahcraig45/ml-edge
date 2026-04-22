import { ML_ENGINEER_CURRICULUM } from "@/lib/curriculum-catalog";
import type {
  CurriculumCourse,
  CurriculumExercise,
  CurriculumLesson,
  CurriculumModule,
  CurriculumProject,
  CurriculumVideo,
  LessonQuiz,
  QuizQuestion,
} from "@/lib/types";

function question(
  id: string,
  prompt: string,
  options: string[],
  answerIndex: number,
  explanation: string,
): QuizQuestion {
  return { id, prompt, options, answerIndex, explanation };
}

function quiz(questions: QuizQuestion[], remediation: string): LessonQuiz {
  return {
    questions,
    grading: {
      passingScore: Math.ceil(questions.length * 0.7),
      maxScore: questions.length,
      remediation,
    },
  };
}

function video(
  title: string,
  objective: string,
  options?: Partial<CurriculumVideo>,
): CurriculumVideo {
  return {
    kind: "external",
    title,
    objective,
    ...options,
  };
}

function exercise(
  id: string,
  title: string,
  type: CurriculumExercise["type"],
  brief: string,
  deliverables: string[],
  starterPrompts: string[],
): CurriculumExercise {
  return {
    id,
    title,
    type,
    brief,
    deliverables,
    starterPrompts,
    gradingRubric: [
      {
        criterion: "Technical depth",
        points: 4,
        description: "Shows correct use of core concepts, notation, and assumptions.",
      },
      {
        criterion: "Analytical rigor",
        points: 3,
        description: "Justifies conclusions, limitations, and alternatives instead of hand-waving.",
      },
      {
        criterion: "Reproducibility",
        points: 2,
        description: "Includes enough process detail, code, or derivation for another learner to reproduce the work.",
      },
      {
        criterion: "Clarity",
        points: 1,
        description: "Communicates reasoning crisply enough for engineering review.",
      },
    ],
  };
}

function lesson(
  id: string,
  title: string,
  duration: string,
  summary: string,
  sections: string[],
  takeaways: string[],
  videos: CurriculumVideo[],
  exercises: CurriculumExercise[],
  lessonQuiz: LessonQuiz,
): CurriculumLesson {
  return {
    id,
    title,
    duration,
    summary,
    sections,
    takeaways,
    videos,
    exercises,
    quiz: lessonQuiz,
  };
}

function project(
  title: string,
  brief: string,
  milestones: string[],
): CurriculumProject {
  return {
    title,
    brief,
    milestones,
    gradingRubric: [
      {
        criterion: "Scientific rigor",
        points: 3,
        description:
          "Uses the right mathematical or statistical framing and states assumptions clearly.",
      },
      {
        criterion: "Engineering quality",
        points: 3,
        description:
          "Implements or designs the solution with maintainability and reproducibility in mind.",
      },
      {
        criterion: "Evaluation quality",
        points: 2,
        description: "Uses evidence, diagnostics, and failure analysis rather than anecdotal success.",
      },
      {
        criterion: "Communication",
        points: 2,
        description:
          "Produces a report or artifact that would hold up in a team review or graduate course setting.",
      },
    ],
  };
}

function module(
  id: string,
  level: CurriculumModule["level"],
  title: string,
  focus: string,
  lessons: CurriculumLesson[],
  moduleProject?: CurriculumProject,
): CurriculumModule {
  return {
    id,
    level,
    title,
    focus,
    lessons,
    ...(moduleProject !== undefined ? { project: moduleProject } : {}),
  };
}

const additionalCourses: CurriculumCourse[] = [
  {
    id: "course-math-science-foundations",
    slug: "math-and-science-foundations",
    title: "Mathematics and Scientific Foundations for ML",
    level: "Beginner",
    timeframe: "6-8 weeks",
    summary:
      "A serious preparation course for learners with a CS background who need the mathematical maturity, scientific mindset, and optimization intuition expected in graduate-level ML work.",
    whyItMatters:
      "Without linear algebra, calculus, probability, and optimization discipline, ML becomes pattern memorization instead of reasoning. This course closes that gap.",
    prerequisites: [
      "Comfort with programming and discrete mathematics from a CS degree",
      "Willingness to review calculus and probability rigorously",
    ],
    outcomes: [
      "Reason about gradients, Jacobians, decompositions, and vector geometry in model design",
      "Use probability and expectation to explain uncertainty and evaluation",
      "Read optimization results with enough fluency to connect them to training behavior",
      "Approach ML as an empirical science rather than a collection of recipes",
    ],
    tags: ["linear algebra", "calculus", "probability", "optimization", "scientific thinking"],
    modules: [
      module(
        "math-foundations-mod-1",
        "Beginner",
        "Linear Algebra, Calculus, and Geometry for Models",
        "Learn the mathematical objects that appear everywhere in embeddings, gradients, optimization, and representation learning.",
        [
          lesson(
            "math-foundations-lesson-1",
            "Vector Spaces, Projections, and Matrix Thinking",
            "100 min",
            "Build the linear algebra vocabulary required to understand features, latent spaces, decompositions, and geometry-driven intuition in ML.",
            [
              "Vectors, bases, spans, and subspaces as modeling language",
              "Matrix multiplication, linear maps, and change of basis",
              "Orthogonality, projections, and why PCA is a geometric story",
            ],
            [
              "Linear algebra is the language of representation, not a prerequisite hurdle to clear once and forget.",
              "Good ML intuition is often geometric before it becomes algorithmic.",
            ],
            [
              video("MIT OCW Linear Algebra", "Use a full open course to build geometric understanding before algorithm memorization.", {
                creator: "MIT OpenCourseWare",
                platform: "Open course",
                url: "https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/",
              }),
            ],
            [
              exercise(
                "math-foundations-ex-1",
                "Derive PCA from geometry, not library calls",
                "analysis",
                "Write a derivation and short computational demonstration of why PCA directions maximize projected variance and where that intuition breaks under nonlinear structure.",
                [
                  "One derivation write-up",
                  "A notebook demonstrating PCA on at least two datasets",
                  "A note on when PCA is the wrong tool",
                ],
                [
                  "What does variance preservation miss about downstream usefulness?",
                  "How would you explain eigenvectors to an engineer who only knows arrays and loops?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "math-foundations-q1",
                  "Why are orthogonal projections so important in ML?",
                  [
                    "They are only useful for graphics",
                    "They appear in approximation, least squares, dimensionality reduction, and representation geometry",
                    "They eliminate the need for optimization",
                    "They guarantee causal inference",
                  ],
                  1,
                  "Projection ideas sit underneath regression, PCA, and many approximation arguments.",
                ),
                question(
                  "math-foundations-q2",
                  "What does an eigenvector represent in a decomposition context?",
                  [
                    "Any arbitrary direction",
                    "A direction preserved by a linear transformation up to scaling",
                    "A probability distribution",
                    "A classification threshold",
                  ],
                  1,
                  "Eigenvectors identify stable directions under a transformation, which matters in variance and dynamical analysis.",
                ),
              ],
              "Re-derive the key geometric relationships until you can explain them without appealing to library functions.",
            ),
          ),
          lesson(
            "math-foundations-lesson-2",
            "Gradients, Vector Calculus, and Optimization Landscapes",
            "110 min",
            "Learn the derivative machinery that makes backpropagation and objective-based learning intelligible.",
            [
              "Gradients, directional derivatives, Jacobians, and Hessians",
              "Chain rule as the backbone of backpropagation",
              "Optimization surfaces, curvature, and local approximation",
            ],
            [
              "Backpropagation is bookkeeping over compositions, not magic.",
              "Optimization intuition matters because training failures are often calculus failures in disguise.",
            ],
            [
              video("MIT OCW Multivariable Calculus", "Build calculus fluency from an openly licensed course rather than only informal blog intuition.", {
                creator: "MIT OpenCourseWare",
                platform: "Open course",
                url: "https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/",
              }),
            ],
            [
              exercise(
                "math-foundations-ex-2",
                "Backprop by hand on a tiny network",
                "lab",
                "Implement a tiny multilayer network without autograd, derive each gradient by hand, and compare the manual result to a numerical gradient check.",
                [
                  "Hand derivation",
                  "Reference implementation",
                  "Gradient check report",
                ],
                [
                  "Which derivative term would be easiest to get wrong under time pressure?",
                  "What does the numerical check reveal about silent implementation mistakes?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "math-foundations-q3",
                  "Why is the chain rule central to neural network training?",
                  [
                    "Because it removes the need for loss functions",
                    "Because it lets you propagate sensitivity through composed operations",
                    "Because it guarantees convexity",
                    "Because it chooses the architecture automatically",
                  ],
                  1,
                  "The chain rule is exactly what makes layered gradient propagation possible.",
                ),
                question(
                  "math-foundations-q4",
                  "What is a Hessian most directly telling you?",
                  [
                    "Only the model latency",
                    "Local curvature information of the objective",
                    "The final test accuracy",
                    "The data schema",
                  ],
                  1,
                  "The Hessian captures second-order curvature structure, which helps explain optimization behavior.",
                ),
              ],
              "Repeat the manual derivation until the relationship among loss, chain rule, and gradient flow is intuitive.",
            ),
          ),
        ],
      ),
      module(
        "math-foundations-mod-2",
        "Beginner",
        "Probability, Statistical Thinking, and Optimization Theory",
        "Use probabilistic reasoning and scientific discipline to avoid confusing anecdotes with evidence.",
        [
          lesson(
            "math-foundations-lesson-3",
            "Random Variables, Estimation, and Generalization Thinking",
            "100 min",
            "Study the statistical lens needed to interpret data, uncertainty, confidence, bias, and variance correctly.",
            [
              "Random variables, expectations, variance, covariance, and conditioning",
              "Sampling, estimation error, confidence, and uncertainty",
              "Bias-variance and the limits of one split, one metric, one story",
            ],
            [
              "ML engineers need scientific skepticism, not just code speed.",
              "Every evaluation result is an estimate conditioned on a data-generation process.",
            ],
            [
              video("MIT OCW Probability and Statistics", "Ground inference and uncertainty in a fully open course.", {
                creator: "MIT OpenCourseWare",
                platform: "Open course",
                url: "https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2014/",
              }),
            ],
            [
              exercise(
                "math-foundations-ex-3",
                "Confidence and fragility audit",
                "analysis",
                "Take a model evaluation you are tempted to celebrate and reframe it in terms of sampling uncertainty, slice sensitivity, and possible hidden confounders.",
                [
                  "A confidence audit memo",
                  "Resampling or bootstrap analysis",
                  "A revised claim about what the model result actually proves",
                ],
                [
                  "What part of your claim is evidence versus extrapolation?",
                  "Which missing slice or dataset would most likely change your conclusion?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "math-foundations-q5",
                  "Why is one test-set result not the same as scientific certainty?",
                  [
                    "Because metrics are always useless",
                    "Because the observed result is still an estimate influenced by sampling, slice composition, and possible shift",
                    "Because test sets should be avoided",
                    "Because confidence intervals are only for physics",
                  ],
                  1,
                  "A single held-out score is informative but still contingent on data, assumptions, and shift.",
                ),
                question(
                  "math-foundations-q6",
                  "What is the main benefit of a bootstrap or resampling view of evaluation?",
                  [
                    "It changes the labels",
                    "It helps expose uncertainty and stability in the metric estimates",
                    "It guarantees better models",
                    "It removes the need for domain knowledge",
                  ],
                  1,
                  "Resampling gives you a better sense of how stable your measured result is.",
                ),
              ],
              "Practice uncertainty-aware reporting until every claim you make has a clear evidentiary boundary.",
            ),
          ),
          lesson(
            "math-foundations-lesson-4",
            "Convexity, Constraints, and Lagrangian Thinking",
            "95 min",
            "Learn enough optimization theory to read advanced ML papers and understand what assumptions make some problems easier than others.",
            [
              "Convex sets, convex objectives, and why they matter",
              "Constrained optimization and Lagrangian formulation",
              "Why real deep learning is not convex and why local methods still work surprisingly well",
            ],
            [
              "Optimization theory gives you a language for problem difficulty and guarantees.",
              "Knowing where guarantees end is just as important as knowing where they hold.",
            ],
            [
              video("MIT OCW Nonlinear Programming", "Use an advanced open course to bridge engineering intuition and formal optimization ideas.", {
                creator: "MIT OpenCourseWare",
                platform: "Open course",
                url: "https://ocw.mit.edu/courses/6-252j-nonlinear-programming-spring-2003/",
              }),
            ],
            [
              exercise(
                "math-foundations-ex-4",
                "Constraint-aware objective design",
                "analysis",
                "Reformulate one ML objective with explicit operational constraints such as latency, fairness, or calibration, and explain how a Lagrangian view changes the problem statement.",
                [
                  "Objective reformulation memo",
                  "Constraint analysis",
                  "Tradeoff discussion",
                ],
                [
                  "Which operational constraint is usually hidden rather than modeled directly?",
                  "What does your reformulation make visible that the original objective hid?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "math-foundations-q7",
                  "Why is convexity useful when it exists?",
                  [
                    "It always improves generalization",
                    "It can make optimization behavior and guarantees easier to reason about",
                    "It removes all modeling assumptions",
                    "It makes data collection unnecessary",
                  ],
                  1,
                  "Convexity gives structure and often stronger guarantees about optimization.",
                ),
                question(
                  "math-foundations-q8",
                  "What is a Lagrangian useful for?",
                  [
                    "Only drawing graphs",
                    "Encoding constrained optimization problems into an objective framework",
                    "Replacing train/test splits",
                    "Computing embeddings",
                  ],
                  1,
                  "Lagrangian reasoning helps you formalize constraint tradeoffs directly.",
                ),
              ],
              "Review optimization with a focus on what assumptions create guarantees and what happens when those assumptions fail.",
            ),
          ),
        ],
        project(
          "Math foundations capstone: Scientific note for ML readiness",
          "Write a technical note that explains one ML learning algorithm from the perspectives of geometry, calculus, probability, and optimization assumptions.",
          [
            "Choose a concrete algorithm",
            "Explain the math from four angles",
            "Discuss what breaks when assumptions fail",
          ],
        ),
      ),
    ],
    capstone: project(
      "Course capstone: Graduate-readiness math dossier",
      "Assemble a compact portfolio showing that you can move between derivation, code, and scientific interpretation for one core ML method.",
      [
        "Complete one derivation-heavy notebook",
        "Write one uncertainty-aware evaluation memo",
        "Present one optimization tradeoff analysis",
      ],
    ),
  },
  {
    id: "course-statistical-inference",
    slug: "statistical-inference-and-probabilistic-modeling",
    title: "Statistical Inference and Probabilistic Modeling",
    level: "Advanced",
    timeframe: "4-6 weeks",
    summary:
      "A deeper science-oriented course covering estimation, Bayesian reasoning, causal caution, experiment design, and uncertainty-aware ML judgment.",
    whyItMatters:
      "A model engineer who cannot reason about inference, uncertainty, and experiment validity will confuse motion with knowledge.",
    prerequisites: [
      "Math and science foundations or equivalent background",
      "Comfort with basic probability and regression concepts",
    ],
    outcomes: [
      "Design better experiments and interpret uncertainty honestly",
      "Distinguish predictive performance from causal or scientific claims",
      "Use probabilistic modeling as a way of thinking, not just a library feature",
      "Read graduate-level ML papers with stronger statistical judgment",
    ],
    tags: ["statistics", "inference", "bayesian", "causal caution", "experiments"],
    modules: [
      module(
        "stats-mod-1",
        "Advanced",
        "Inference, Bayesian Thinking, and Experiment Design",
        "Strengthen the scientific side of ML by learning what evidence does and does not justify.",
        [
          lesson(
            "stats-lesson-1",
            "Frequentist Inference, Bayesian Updating, and What Your Metrics Really Mean",
            "100 min",
            "Compare the major statistical viewpoints and tie them back to evaluation, uncertainty, and model comparison in practical ML.",
            [
              "Confidence intervals versus credible intervals",
              "Hypothesis testing, multiple comparisons, and false confidence",
              "Bayesian updating as a tool for sequential evidence and prior-aware reasoning",
            ],
            [
              "Different statistical frames answer different questions; they are not interchangeable decorations.",
              "Good science in ML means knowing which uncertainty statement you are actually making.",
            ],
            [
              video("MIT OCW Probability and Statistics", "Use a strong open course as the anchor for inference rather than ad hoc blog intuition.", {
                creator: "MIT OpenCourseWare",
                platform: "Open course",
                url: "https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2014/",
              }),
            ],
            [
              exercise(
                "stats-ex-1",
                "Interpret uncertainty three ways",
                "analysis",
                "Take one model comparison and analyze it using a classical confidence interval, a resampling estimate, and a Bayesian posterior-style interpretation.",
                [
                  "Three-interpretation memo",
                  "A comparison table of claims each method permits",
                  "A conclusion about what you are actually confident about",
                ],
                [
                  "Which interpretation would a product team misuse most easily?",
                  "How do your conclusions change when the prior or sample size changes?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "stats-q1",
                  "Why is a p-value often misused in ML reporting?",
                  [
                    "Because it directly measures production latency",
                    "Because people overread it as proof of importance or truth instead of a narrow statement under a null model",
                    "Because it is only defined for neural networks",
                    "Because it replaces evaluation metrics",
                  ],
                  1,
                  "P-values are frequently treated as stronger and broader evidence than they really are.",
                ),
                question(
                  "stats-q2",
                  "What does a Bayesian update contribute conceptually?",
                  [
                    "It removes prior assumptions",
                    "It makes the role of prior beliefs and new evidence explicit in the posterior view",
                    "It guarantees better accuracy",
                    "It eliminates label noise",
                  ],
                  1,
                  "Bayesian reasoning is valuable because it makes assumptions and evidence combination explicit.",
                ),
              ],
              "Revisit inference until you can say exactly what uncertainty statement your evaluation supports.",
            ),
          ),
          lesson(
            "stats-lesson-2",
            "Causal Caution, A/B Testing, and Claims You Should Not Make",
            "95 min",
            "Learn to separate prediction from intervention logic and resist causal storytelling where the evidence does not support it.",
            [
              "Difference between association, prediction, and causal effect",
              "Pitfalls in observational data and policy-entangled labels",
              "A/B tests, sequential testing, and experiment contamination",
            ],
            [
              "A predictive model can be useful without being causal, but you must know the difference.",
              "A/B tests can still mislead when instrumentation, segmentation, or stopping rules are sloppy.",
            ],
            [
              video("MIT OCW Probability and Statistics", "Reuse the statistical base to frame causal caution and experiment validity.", {
                creator: "MIT OpenCourseWare",
                platform: "Open course",
                url: "https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2014/",
              }),
            ],
            [
              exercise(
                "stats-ex-2",
                "Rewrite an overclaimed ML result",
                "analysis",
                "Take a model evaluation or product case study and rewrite the claims so that they are scientifically defensible. Identify which claims are predictive, which are causal, and which are not justified at all.",
                [
                  "Claim taxonomy",
                  "A revised evidence-based write-up",
                  "One experiment design that would actually test a causal question",
                ],
                [
                  "What assumption would have to be true for the strongest claim to hold?",
                  "Which missing experiment blocks you from saying more?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "stats-q3",
                  "What is the biggest danger of causal language in ordinary predictive ML work?",
                  [
                    "It makes the code slower",
                    "It can lead teams to intervene based on relationships the model never established as causal",
                    "It reduces dataset size",
                    "It changes the license of the model",
                  ],
                  1,
                  "Causal overclaiming can produce bad product and policy decisions.",
                ),
                question(
                  "stats-q4",
                  "Why can an A/B test still mislead?",
                  [
                    "Because randomized experiments are magic",
                    "Because poor instrumentation, segmentation, leakage, or stopping rules can invalidate interpretation",
                    "Because experiments never help in ML",
                    "Because significance thresholds are optional",
                  ],
                  1,
                  "Experiment quality depends on implementation discipline as much as on the idea of randomization.",
                ),
              ],
              "Practice identifying what evidence supports predictive claims versus intervention claims before making product recommendations.",
            ),
          ),
        ],
      ),
    ],
    capstone: project(
      "Course capstone: Evidence and claims review",
      "Audit one ML case study or project as if you were the most skeptical reviewer on the team, with explicit sections on uncertainty, causal caution, and what additional evidence is needed.",
      [
        "Choose a case study or internal project",
        "Separate descriptive, predictive, and causal claims",
        "Propose the smallest next experiment that would strengthen the evidence",
      ],
    ),
  },
  {
    id: "course-scientific-computing-data-systems",
    slug: "scientific-computing-and-data-systems-for-mle",
    title: "Scientific Computing and Data Systems for MLE",
    level: "Advanced",
    timeframe: "4-6 weeks",
    summary:
      "A practical engineering course on the compute, data, experiment, and orchestration layer that turns model work into dependable ML engineering.",
    whyItMatters:
      "Many capable software engineers underestimate how much MLE depends on data pipelines, reproducibility, framework fluency, and operational discipline.",
    prerequisites: [
      "General software engineering experience",
      "Familiarity with Python",
      "Basic ML modeling exposure",
    ],
    outcomes: [
      "Build reproducible pipelines and training workflows",
      "Use modern ML tooling without losing scientific rigor",
      "Understand orchestration, model packaging, and lifecycle management",
      "Close the gap between notebook experimentation and production operation",
    ],
    tags: ["scientific computing", "data systems", "mlflow", "pytorch", "kubeflow", "reproducibility"],
    modules: [
      module(
        "compute-mod-1",
        "Advanced",
        "Tooling, Pipelines, and Experiment Discipline",
        "Learn the practical workflow stack that supports modern MLE work.",
        [
          lesson(
            "compute-lesson-1",
            "Framework Fluency, Reproducible Pipelines, and Numeric Hygiene",
            "100 min",
            "Treat numerical computing, training code, and pipeline hygiene as engineering domains that require design, not copy-paste.",
            [
              "Project structure for experiments, configs, and repeatability",
              "Pipeline composition, transforms, and data contracts",
              "Common numeric and reproducibility footguns in real ML code",
            ],
            [
              "A notebook that cannot be rerun is not a reliable engineering artifact.",
              "Framework fluency matters because the model only exists through code, data, and runtime behavior.",
            ],
            [
              video("PyTorch Tutorials", "Use framework-native tutorials to reinforce implementation correctness and debug discipline.", {
                creator: "PyTorch",
                platform: "Docs",
                url: "https://docs.pytorch.org/tutorials/",
              }),
              video("scikit-learn User Guide", "Use structured pipeline material to keep classical ML and preprocessing production-ready.", {
                creator: "scikit-learn",
                platform: "Docs",
                url: "https://scikit-learn.org/stable/user_guide.html",
              }),
            ],
            [
              exercise(
                "compute-ex-1",
                "Refactor a notebook into a reproducible training package",
                "lab",
                "Take one messy exploratory notebook and turn it into a reproducible training run with explicit configuration, data assumptions, and evaluation outputs.",
                [
                  "Refactored project structure",
                  "A config-driven run command",
                  "A short note on what hidden assumptions were made explicit",
                ],
                [
                  "Which hidden path or environment dependency would have broken someone else’s run?",
                  "How would you prove two runs are meaningfully comparable?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "compute-q1",
                  "What is a strong sign that an experiment workflow is not engineering-grade?",
                  [
                    "It uses Python",
                    "Results depend on undocumented manual steps, hidden paths, or ambiguous configs",
                    "It logs metrics",
                    "It uses a model registry",
                  ],
                  1,
                  "Reproducibility breaks when the path from code and data to results is not explicit.",
                ),
                question(
                  "compute-q2",
                  "Why is numeric hygiene part of MLE work?",
                  [
                    "Because numerical precision, batching, randomness, and framework behavior all affect whether conclusions are reliable",
                    "Because it only affects hardware teams",
                    "Because it replaces evaluation",
                    "Because it only matters in academic research",
                  ],
                  0,
                  "ML results are shaped by real numerical systems, not just elegant equations.",
                ),
              ],
              "Tighten your pipeline until another engineer could rerun it and trust the outputs.",
            ),
          ),
          lesson(
            "compute-lesson-2",
            "Experiment Tracking, Model Lifecycle, and Orchestration",
            "95 min",
            "Use open tooling to understand experiment lineage, model registry, workflow execution, and deployment handoff.",
            [
              "Tracking parameters, data versions, metrics, and artifacts",
              "Model registry concepts and promotion gates",
              "Orchestration tradeoffs in pipeline systems and training platforms",
            ],
            [
              "Lifecycle tooling is about preserving evidence, not adding ceremony.",
              "Orchestration should simplify repeatability, not hide system complexity from you.",
            ],
            [
              video("MLflow Documentation", "Use an open lifecycle tool as a concrete reference for tracking and registry concepts.", {
                creator: "MLflow",
                platform: "Docs",
                url: "https://mlflow.org/docs/latest/index.html",
              }),
              video("Kubeflow Documentation", "Use open orchestration docs to learn pipeline structure and training workflow design.", {
                creator: "Kubeflow",
                platform: "Docs",
                url: "https://www.kubeflow.org/docs/",
              }),
            ],
            [
              exercise(
                "compute-ex-2",
                "Design an experiment-to-release workflow",
                "systems-design",
                "Design an end-to-end workflow from data pull to training to evaluation to promotion, including where artifacts, metrics, and approvals live.",
                [
                  "Workflow diagram",
                  "Artifact and metadata inventory",
                  "A release gate policy",
                ],
                [
                  "What should block promotion even when the main metric improved?",
                  "What would you need to debug a six-month-old released model?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "compute-q3",
                  "Why is a model registry useful?",
                  [
                    "It replaces evaluation",
                    "It provides versioned model lineage, status, and release coordination",
                    "It makes drift impossible",
                    "It removes the need for reproducibility",
                  ],
                  1,
                  "Registries help you keep track of what was trained, approved, and deployed.",
                ),
                question(
                  "compute-q4",
                  "What is the main value of orchestration in ML systems?",
                  [
                    "It guarantees better models",
                    "It makes multi-step workflows repeatable, observable, and automatable",
                    "It replaces model design",
                    "It eliminates infrastructure cost",
                  ],
                  1,
                  "Orchestration adds structure and observability to complex recurring workflows.",
                ),
              ],
              "Refine the workflow design until lineage, review, and rollback are all explicit.",
            ),
          ),
        ],
      ),
    ],
    capstone: project(
      "Course capstone: MLE workflow blueprint",
      "Create a fully documented blueprint for a real ML engineering workflow, including project structure, experiment tracking, registry policy, and orchestration plan.",
      [
        "Refactor one experiment into a reproducible workflow",
        "Define lifecycle metadata and release gates",
        "Present the system as if onboarding a new MLE teammate",
      ],
    ),
  },
  {
    id: "course-computer-vision-multimodal",
    slug: "computer-vision-and-multimodal-systems",
    title: "Computer Vision and Multimodal ML Systems",
    level: "Advanced",
    timeframe: "5-7 weeks",
    summary:
      "A perception-focused course on visual representation learning, detection, segmentation, multimodal retrieval, and the failure modes that make real-world vision systems expensive and brittle.",
    whyItMatters:
      "A serious ML engineer should be able to reason about perception systems, not just language and tabular models. Vision and multimodal stacks surface distribution shift, labeling ambiguity, and latency constraints quickly.",
    prerequisites: [
      "Deep learning foundations",
      "Comfort with tensors, training loops, and embeddings",
      "Basic experience evaluating ML models",
    ],
    outcomes: [
      "Build intuition for vision architectures, features, and deployment tradeoffs",
      "Evaluate detection, segmentation, and retrieval systems beyond one headline metric",
      "Reason about multimodal representation alignment and cross-modal failure modes",
      "Design perception systems with operational constraints and dataset shift in mind",
    ],
    tags: ["computer vision", "multimodal", "retrieval", "embeddings", "evaluation", "perception"],
    modules: [
      module(
        "vision-mod-1",
        "Advanced",
        "Visual Representation Learning and Perception Tasks",
        "Move from generic deep learning to perception-specific design and evaluation choices.",
        [
          lesson(
            "vision-lesson-1",
            "Convolutions, Inductive Bias, and Feature Hierarchies",
            "95 min",
            "Learn why visual models historically relied on locality and hierarchy, what those priors buy you, and how modern architectures inherit or discard them.",
            [
              "Convolutions, receptive fields, and translational assumptions",
              "Feature hierarchies and representation reuse across tasks",
              "How data scale and compute changed the architecture story",
            ],
            [
              "Vision models succeed or fail partly because of how their inductive biases match the task and dataset.",
              "Architecture changes are only meaningful when connected to data regime, compute budget, and evaluation target.",
            ],
            [
              video("Dive into Deep Learning", "Use the open textbook to anchor core vision architectures and visual representation intuition.", {
                creator: "Dive into Deep Learning authors",
                platform: "Open textbook",
                url: "https://d2l.ai/",
              }),
              video("PyTorch Tutorials", "Ground perception concepts in runnable implementations and tensor-level debugging practice.", {
                creator: "PyTorch",
                platform: "Docs",
                url: "https://docs.pytorch.org/tutorials/",
              }),
            ],
            [
              exercise(
                "vision-ex-1",
                "Diagnose representation collapse in a small vision model",
                "debugging",
                "Train a small image classifier, intentionally induce overfitting or shortcut learning, and document how activation inspection, augmentation, and regularization change the failure profile.",
                [
                  "Training notebook or package",
                  "Failure analysis report with visual evidence",
                  "One memo explaining which interventions improved generalization and why",
                ],
                [
                  "Which errors came from weak representation learning versus bad data assumptions?",
                  "What changed in the learned features after augmentation or regularization changes?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "vision-q1",
                  "Why do inductive biases matter in vision models?",
                  [
                    "Because model architecture is just branding",
                    "Because assumptions about locality, hierarchy, and invariance shape what the model can learn efficiently",
                    "Because they only affect deployment cost",
                    "Because they eliminate the need for data",
                  ],
                  1,
                  "Architectural priors influence sample efficiency, optimization, and failure modes in perception tasks.",
                ),
                question(
                  "vision-q2",
                  "What is a common sign of shortcut learning in vision?",
                  [
                    "Stable generalization across domains",
                    "The model latches onto spurious backgrounds or artifacts instead of task-relevant structure",
                    "Lower training accuracy",
                    "A clean confusion matrix",
                  ],
                  1,
                  "Vision models often exploit background or collection artifacts unless evaluation is designed to catch it.",
                ),
              ],
              "Re-run the analysis until you can explain a vision failure in terms of both data assumptions and representation behavior.",
            ),
          ),
          lesson(
            "vision-lesson-2",
            "Detection, Segmentation, and Shift-Aware Evaluation",
            "100 min",
            "Treat perception tasks as structured prediction under uncertainty, annotation noise, and changing data distributions.",
            [
              "Detection and segmentation as localization plus classification problems",
              "Task-specific metrics and what they hide",
              "Domain shift, corruption robustness, and annotation ambiguity",
            ],
            [
              "A vision metric is only informative if you understand which errors it compresses away.",
              "Perception systems demand slice-based and shift-aware evaluation, not just aggregate scores.",
            ],
            [
              video("Dive into Deep Learning", "Use open chapters on computer vision tasks as a foundation for structured prediction thinking.", {
                creator: "Dive into Deep Learning authors",
                platform: "Open textbook",
                url: "https://d2l.ai/",
              }),
            ],
            [
              exercise(
                "vision-ex-2",
                "Build a perception evaluation scorecard",
                "analysis",
                "Create an evaluation scorecard for a detection or segmentation use case that includes task metrics, slices, corruption tests, latency constraints, and annotation uncertainty notes.",
                [
                  "Scorecard template",
                  "A critique of at least two misleading metric-only conclusions",
                  "A recommendation memo for ship/no-ship criteria",
                ],
                [
                  "What would your main metric miss if the environment changed next month?",
                  "Which user-visible failure is underweighted by the standard benchmark metric?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "vision-q3",
                  "Why is aggregate accuracy often insufficient for vision systems?",
                  [
                    "Because perception systems usually have no deployment context",
                    "Because it can hide failures on important slices, under shift, or on localization quality",
                    "Because it is mathematically invalid",
                    "Because all vision tasks use the same metric",
                  ],
                  1,
                  "Real perception systems fail unevenly across conditions, objects, and environments.",
                ),
                question(
                  "vision-q4",
                  "What makes annotation ambiguity especially important in perception work?",
                  [
                    "Perception labels are always exact",
                    "Bounding boxes, masks, and class boundaries often contain uncertainty that changes how you should interpret results",
                    "It only matters for reinforcement learning",
                    "It removes the need for evaluation",
                  ],
                  1,
                  "Visual labels often encode judgment calls, not perfect ground truth.",
                ),
              ],
              "Tighten your scorecard until deployment decisions are justified by slices, uncertainty, and task constraints rather than a single leaderboard number.",
            ),
          ),
        ],
      ),
      module(
        "vision-mod-2",
        "Advanced",
        "Multimodal Retrieval, Alignment, and Product Reality",
        "Study image-text systems as representation, retrieval, and evaluation pipelines rather than magic foundation models.",
        [
          lesson(
            "vision-lesson-3",
            "Contrastive Learning, Embedding Spaces, and Cross-Modal Retrieval",
            "100 min",
            "Understand how image-text systems align representations, why retrieval quality matters, and where multimodal systems break under weak grounding.",
            [
              "Contrastive objectives and representation alignment",
              "Embeddings for search, ranking, and retrieval-augmented multimodal systems",
              "Failure modes in cross-modal ambiguity and weak supervision",
            ],
            [
              "Multimodal systems are often retrieval and embedding-quality systems before they are generation systems.",
              "Alignment quality must be interrogated with hard negatives and task-specific error analysis.",
            ],
            [
              video("Hugging Face Course", "Use openly licensed transformer material to connect cross-modal representations to modern model tooling.", {
                creator: "Hugging Face",
                platform: "Course",
                url: "https://huggingface.co/learn",
              }),
              video("PyTorch Tutorials", "Keep multimodal ideas connected to framework-level implementation details.", {
                creator: "PyTorch",
                platform: "Docs",
                url: "https://docs.pytorch.org/tutorials/",
              }),
            ],
            [
              exercise(
                "vision-ex-3",
                "Design a multimodal retrieval benchmark",
                "systems-design",
                "Design a benchmark for an image-text retrieval product that defines hard negatives, ranking metrics, latency constraints, and human review loops.",
                [
                  "Benchmark design document",
                  "Failure taxonomy",
                  "A proposal for monitoring embedding drift or catalog drift",
                ],
                [
                  "What failure would look excellent on average but still break user trust?",
                  "How would you detect that the text encoder and image encoder are drifting apart in practice?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "vision-q5",
                  "Why are hard negatives valuable in contrastive or retrieval evaluation?",
                  [
                    "They make the task artificially easier",
                    "They expose whether the representation actually distinguishes semantically close alternatives",
                    "They remove the need for human review",
                    "They only matter for tabular models",
                  ],
                  1,
                  "Easy negatives can flatter a model that still fails on realistic retrieval ambiguity.",
                ),
                question(
                  "vision-q6",
                  "What is a common multimodal system failure?",
                  [
                    "Perfect grounding under noisy data",
                    "Seemingly strong retrieval scores that still miss the product-specific notion of relevance",
                    "Eliminating ambiguity from language",
                    "Needing no monitoring after launch",
                  ],
                  1,
                  "Multimodal systems often optimize a proxy that diverges from what the product or user actually needs.",
                ),
              ],
              "Stress-test your benchmark until you can defend why it reflects user-relevant multimodal quality rather than just generic embedding neatness.",
            ),
          ),
        ],
        project(
          "Module project: Perception deployment review",
          "Audit a vision or multimodal use case as if you were the engineer signing the launch decision, with explicit attention to shift, ambiguity, latency, and monitoring.",
          [
            "Choose a perception use case and define the failure surface",
            "Build the evaluation and monitoring plan",
            "Write the launch risk memo with rollback triggers",
          ],
        ),
      ),
    ],
    capstone: project(
      "Course capstone: Multimodal system ship review",
      "Produce a technical review for a vision or multimodal product, covering representation design, evaluation slices, retrieval or perception metrics, deployment risks, and post-launch monitoring.",
      [
        "Specify the perception or multimodal architecture and data assumptions",
        "Define the evaluation stack and red-team scenarios",
        "Write the operational review you would present before launch",
      ],
    ),
  },
  {
    id: "course-reinforcement-learning-decision-making",
    slug: "reinforcement-learning-and-sequential-decision-making",
    title: "Sequential Decision-Making and Reinforcement Learning",
    level: "Advanced",
    timeframe: "5-7 weeks",
    summary:
      "A critical course on bandits, MDPs, value functions, policy optimization, offline evaluation, and the engineering discipline required to use RL-like methods without fooling yourself.",
    whyItMatters:
      "Even engineers who never train a frontier RL agent benefit from understanding sequential decision-making, reward design, exploration, and why feedback loops can quietly corrupt systems.",
    prerequisites: [
      "Probability and optimization foundations",
      "Deep learning basics",
      "Comfort reasoning about experimental design and metrics",
    ],
    outcomes: [
      "Reason about sequential decision problems with the right abstractions",
      "Understand core RL algorithms and why they are often unstable or sample-inefficient",
      "Evaluate bandit and RL systems with stronger skepticism about feedback loops",
      "Identify when RL is justified versus when a simpler decision framework is better",
    ],
    tags: ["reinforcement learning", "bandits", "mdp", "policy gradients", "offline evaluation", "decision systems"],
    modules: [
      module(
        "rl-mod-1",
        "Advanced",
        "MDPs, Value Functions, and Optimization Under Feedback",
        "Build the conceptual and mathematical foundations behind sequential decision systems.",
        [
          lesson(
            "rl-lesson-1",
            "MDPs, Bellman Equations, and Credit Assignment",
            "100 min",
            "Learn how sequential decision problems differ from supervised learning and why value, return, horizon, and state abstractions matter.",
            [
              "Bandits versus MDPs and when the distinction matters",
              "Bellman equations, temporal structure, and credit assignment",
              "Policy, value function, and model distinctions",
            ],
            [
              "Sequential learning is hard because your actions change the data you will see next.",
              "Credit assignment is a representation and evaluation problem as much as an algorithm problem.",
            ],
            [
              video("Dive into Deep Learning", "Use open deep learning material to ground RL fundamentals in clear mathematical exposition.", {
                creator: "Dive into Deep Learning authors",
                platform: "Open textbook",
                url: "https://d2l.ai/",
              }),
              video("MIT OCW Probability and Statistics", "Reconnect RL uncertainty and return estimation to probability rather than folklore.", {
                creator: "MIT OpenCourseWare",
                platform: "Open course",
                url: "https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2014/",
              }),
            ],
            [
              exercise(
                "rl-ex-1",
                "Explain a sequential decision problem in MDP terms",
                "analysis",
                "Choose a real product or operations decision problem and formalize it as a bandit or MDP, including states, actions, rewards, transitions, horizon, and observability limits.",
                [
                  "Formal problem statement",
                  "One critique of what the abstraction misses",
                  "A recommendation on whether RL is actually warranted",
                ],
                [
                  "Which parts of the real system are lost when you compress it into an MDP?",
                  "Could a simpler supervised or rules-based approach solve enough of the problem?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "rl-q1",
                  "Why is credit assignment difficult in RL?",
                  [
                    "Because rewards may be delayed and actions alter future states and data",
                    "Because labels are always perfectly clean",
                    "Because RL has no metrics",
                    "Because the Bellman equation eliminates uncertainty",
                  ],
                  0,
                  "Delayed consequences and feedback loops make attribution much harder than in ordinary supervised tasks.",
                ),
                question(
                  "rl-q2",
                  "What does the Bellman perspective provide?",
                  [
                    "A way to decompose long-horizon value relationships recursively",
                    "A guarantee that training will be stable",
                    "A replacement for reward design",
                    "A shortcut around exploration",
                  ],
                  0,
                  "The Bellman equations let you reason recursively about value under temporal structure.",
                ),
              ],
              "Practice formalizing real decisions as sequential problems until you can also explain where the formalism breaks.",
            ),
          ),
          lesson(
            "rl-lesson-2",
            "Q-Learning, Policy Gradients, and Instability",
            "105 min",
            "Compare major RL update families and understand why function approximation, exploration, reward design, and non-stationarity make real training fragile.",
            [
              "Value-based versus policy-based methods",
              "Exploration-exploitation and reward shaping tradeoffs",
              "Instability from approximation error, off-policy learning, and sparse reward",
            ],
            [
              "Many RL papers hide how much tuning and environment design is doing the real work.",
              "If you cannot explain instability sources, you are not ready to trust an RL result.",
            ],
            [
              video("PyTorch Tutorials", "Use implementation-focused material to keep RL update rules connected to actual tensor code and debugging.", {
                creator: "PyTorch",
                platform: "Docs",
                url: "https://docs.pytorch.org/tutorials/",
              }),
              video("MIT OCW Nonlinear Programming", "Link policy optimization intuition back to constraints and objective geometry.", {
                creator: "MIT OpenCourseWare",
                platform: "Open course",
                url: "https://ocw.mit.edu/courses/6-252j-nonlinear-programming-spring-2003/",
              }),
            ],
            [
              exercise(
                "rl-ex-2",
                "Reward hacking and instability postmortem",
                "paper-review",
                "Write a postmortem for a hypothetical RL system failure caused by reward misspecification, simulator mismatch, or unstable training.",
                [
                  "Failure narrative",
                  "Root-cause analysis",
                  "A redesign proposal for reward, evaluation, or environment setup",
                ],
                [
                  "Which proxy was optimized instead of the real objective?",
                  "What evidence would you require before trusting the next training run?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "rl-q3",
                  "Why is reward design such a high-stakes choice?",
                  [
                    "Because the agent optimizes the exact operational objective automatically",
                    "Because agents often exploit the specified proxy rather than the intention behind it",
                    "Because rewards only affect logging",
                    "Because it matters only in games",
                  ],
                  1,
                  "Reward design is where many real-world RL failures begin.",
                ),
                question(
                  "rl-q4",
                  "What makes RL with function approximation especially tricky?",
                  [
                    "It always converges quickly",
                    "Approximation error, non-stationarity, and feedback loops can amplify instability",
                    "It removes the need for exploration",
                    "It turns RL into ordinary regression",
                  ],
                  1,
                  "Neural approximators can magnify the brittleness already present in sequential learning.",
                ),
              ],
              "Treat every apparently strong RL result as provisional until you have interrogated reward, environment, and instability sources.",
            ),
          ),
        ],
      ),
      module(
        "rl-mod-2",
        "Advanced",
        "Bandits, Offline Evaluation, and Real-World Decision Systems",
        "Focus on the forms of sequential learning most likely to appear in practical ML products.",
        [
          lesson(
            "rl-lesson-3",
            "Bandits, Counterfactual Evaluation, and Safer Deployment",
            "95 min",
            "Study contextual bandits, off-policy evaluation, and the evidence standards needed before deploying systems that influence the data they learn from.",
            [
              "Contextual bandits for recommendation and ranking-like problems",
              "Off-policy evaluation and why logged data can mislead",
              "Guardrails, canaries, and staged rollout for decision policies",
            ],
            [
              "A sequential system can improve the proxy while degrading the user experience if evaluation is weak.",
              "Counterfactual reasoning is fragile when logging policy coverage is poor.",
            ],
            [
              video("MIT OCW Probability and Statistics", "Ground counterfactual claims in sampling and uncertainty rather than intuition alone.", {
                creator: "MIT OpenCourseWare",
                platform: "Open course",
                url: "https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2014/",
              }),
            ],
            [
              exercise(
                "rl-ex-3",
                "Design a bandit rollout policy",
                "systems-design",
                "Design a rollout policy for a contextual bandit product feature, including exploration budget, logging requirements, offline checks, and rollback conditions.",
                [
                  "Rollout plan",
                  "Logging schema",
                  "A risk register covering feedback-loop failure modes",
                ],
                [
                  "What user segment is most likely to be harmed first by a weak policy?",
                  "Which offline signal would still be too weak to justify launch?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "rl-q5",
                  "Why is off-policy evaluation difficult?",
                  [
                    "Because logged data comes from a different policy and may have poor support for new decisions",
                    "Because evaluation is unnecessary in bandits",
                    "Because sequential systems never need logs",
                    "Because counterfactuals are always exact",
                  ],
                  0,
                  "Logged-policy bias and coverage limitations make counterfactual claims easy to overstate.",
                ),
                question(
                  "rl-q6",
                  "When is a contextual bandit often more appropriate than full RL?",
                  [
                    "When the action has limited long-term state effects and you mainly need one-step adaptation",
                    "When long-horizon planning dominates",
                    "When no feedback is available",
                    "When rewards are perfectly defined",
                  ],
                  0,
                  "Many practical product decisions are closer to bandits than to full long-horizon control problems.",
                ),
              ],
              "Keep tightening the rollout policy until the evidence standard and rollback path are explicit.",
            ),
          ),
        ],
        project(
          "Module project: Sequential decision launch review",
          "Prepare a launch review for a bandit or RL-style product feature with reward design critique, offline evidence limits, rollout safety plan, and fallback policy.",
          [
            "Choose a sequential decision use case",
            "Define the evaluation and rollout evidence you would require",
            "Write the launch and rollback recommendation memo",
          ],
        ),
      ),
    ],
    capstone: project(
      "Course capstone: Decision policy evidence dossier",
      "Build an evidence dossier for a sequential decision system covering formulation, reward design, offline evidence, online rollout plan, user-risk analysis, and the case against overclaiming what the policy can do.",
      [
        "Formalize the decision problem and justify the chosen learning framework",
        "Specify reward, evaluation, and rollout safeguards",
        "Write the skeptical review that would accompany any deployment recommendation",
      ],
    ),
  },
];

const [
  mathScienceFoundationsCourse,
  statisticalInferenceCourse,
  scientificComputingCourse,
  computerVisionCourse,
  reinforcementLearningCourse,
] = additionalCourses;

function getBaseCourse(courseId: string): CurriculumCourse {
  const course = ML_ENGINEER_CURRICULUM.find((item) => item.id === courseId);

  if (!course) {
    throw new Error(`Missing base curriculum course: ${courseId}`);
  }

  return course;
}

export const ML_ENGINEER_PROGRAM: CurriculumCourse[] = [
  mathScienceFoundationsCourse,
  getBaseCourse("course-ml-101"),
  getBaseCourse("course-history-ai-ml"),
  statisticalInferenceCourse,
  getBaseCourse("course-classical-ml"),
  getBaseCourse("course-deep-learning"),
  scientificComputingCourse,
  computerVisionCourse,
  getBaseCourse("course-ml-systems"),
  getBaseCourse("course-llm-systems"),
  reinforcementLearningCourse,
  getBaseCourse("course-reliable-ml-2026"),
];
