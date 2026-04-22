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
        criterion: "Technical correctness",
        points: 4,
        description: "Uses the right ML concepts, equations, or system tradeoffs.",
      },
      {
        criterion: "Depth of reasoning",
        points: 3,
        description:
          "Explains failure modes, assumptions, and alternatives instead of only presenting a result.",
      },
      {
        criterion: "Reproducibility",
        points: 2,
        description:
          "Includes code, configuration, or process detail that another engineer could reproduce.",
      },
      {
        criterion: "Communication",
        points: 1,
        description:
          "Presents findings clearly enough for an engineering or research review.",
      },
    ],
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

function scriptVideo(title: string, objective: string, outline: string[]): CurriculumVideo {
  return {
    kind: "script",
    title,
    objective,
    outline,
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
        criterion: "Problem framing",
        points: 3,
        description:
          "Defines the business, scientific, or product objective and selects a defensible success metric.",
      },
      {
        criterion: "Method quality",
        points: 3,
        description:
          "Implements a technically sound pipeline with justified modeling and data choices.",
      },
      {
        criterion: "Evaluation rigor",
        points: 2,
        description:
          "Uses strong baselines, ablations, error analysis, and uncertainty around conclusions.",
      },
      {
        criterion: "Production realism",
        points: 2,
        description:
          "Addresses deployment constraints, monitoring, costs, and operational failure modes.",
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

export const ML_ENGINEER_CURRICULUM: CurriculumCourse[] = [
  {
    id: "course-ml-101",
    slug: "ml-101",
    title: "ML 101: Mathematical and Practical Foundations",
    level: "Beginner",
    timeframe: "4-6 weeks",
    summary:
      "A rigorous onboarding course for engineers who need to move from intuition to disciplined ML practice: framing problems, building baselines, understanding metrics, and shipping trustworthy experiments.",
    whyItMatters:
      "Most weak ML systems fail before model choice. They fail in framing, data splits, leakage, sloppy metrics, and a lack of honest baselines.",
    prerequisites: [
      "Comfort with Python and basic programming",
      "High-school algebra and introductory probability",
      "Willingness to write experiment notes and critique your own results",
    ],
    outcomes: [
      "Frame ML problems as prediction, ranking, generation, or decision problems",
      "Choose metrics that match risk and business reality",
      "Design a leakage-resistant train/validation/test process",
      "Build simple baselines before model escalation",
    ],
    tags: ["math", "evaluation", "baselines", "classification", "regression"],
    modules: [
      module(
        "ml101-mod-1",
        "Beginner",
        "Problem Framing, Data, and Metrics",
        "Translate messy product ideas into testable ML problems and evaluate them honestly.",
        [
          lesson(
            "ml101-lesson-1",
            "From Product Question to Learnable Objective",
            "90 min",
            "Map ambiguous requests into labels, targets, loss functions, and constraints while resisting the urge to optimize the wrong thing.",
            [
              "Distinguish prediction, ranking, anomaly detection, and generation tasks.",
              "Define labels, horizons, interventions, and feedback loops.",
              "Surface hidden costs: false positives, false negatives, latency, and operator burden.",
            ],
            [
              "A good ML engineer starts by shrinking ambiguity, not by selecting a model family.",
              "Targets are product choices disguised as technical variables.",
            ],
            [
              video("Andrew Ng - Machine Learning Specialization", "Use a classical introduction to anchor task framing.", {
                creator: "Andrew Ng",
                platform: "Coursera",
              }),
              scriptVideo("Internal lecture script: Framing ML like a systems engineer", "Generate a lecture outline you can later turn into slides or narration.", [
                "Open with three bad ML product pitches and diagnose why each is underspecified.",
                "Convert one pitch into a target variable, data schema, and evaluation plan.",
                "End with a checklist for whether the problem should be ML at all.",
              ]),
            ],
            [
              exercise(
                "ml101-ex-1",
                "Rewrite three vague AI features into measurable tasks",
                "analysis",
                "Take three feature ideas such as 'smart recommendations' or 'detect risky claims' and rewrite each into one primary metric, one guardrail metric, one failure mode, and one simplest non-ML baseline.",
                [
                  "A one-page task framing memo",
                  "A table of labels, metrics, and failure modes",
                  "A baseline recommendation for each feature",
                ],
                [
                  "What would a no-model rules engine achieve first?",
                  "Which stakeholder pays the cost when the model is wrong?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "ml101-q1",
                  "Which is the strongest reason to prefer precision@k over accuracy for a moderation triage model?",
                  [
                    "Accuracy is not differentiable",
                    "Operators only review a fixed budget of top-ranked items",
                    "Accuracy cannot be measured on imbalanced data",
                    "Precision@k guarantees causal validity",
                  ],
                  1,
                  "If downstream review capacity is bounded, ranking quality in the reviewed slice matters more than global accuracy.",
                ),
                question(
                  "ml101-q2",
                  "What is the cleanest signal that a proposed ML task may actually be a product policy problem?",
                  [
                    "The model uses text embeddings",
                    "Stakeholders cannot agree on labels or utility",
                    "The dataset is larger than memory",
                    "The baseline is logistic regression",
                  ],
                  1,
                  "Unclear labels often mean the organization has not decided what success means.",
                ),
              ],
              "Rework the task framing memo until each objective has a clear label, metric, and operating constraint.",
            ),
          ),
          lesson(
            "ml101-lesson-2",
            "Splits, Leakage, and Honest Baselines",
            "100 min",
            "Build the habit of distrusting early wins by stress-testing evaluation design before celebrating model performance.",
            [
              "Identify temporal leakage, target leakage, and post-treatment leakage.",
              "Pick split strategies for IID, time series, user-grouped, and panel data.",
              "Use dummy models, simple heuristics, and linear models as sanity checks.",
            ],
            [
              "Evaluation pipelines fail more often from invalid data partitioning than from bad optimizers.",
              "A sophisticated model beating a weak baseline can still be a broken system.",
            ],
            [
              video("StatQuest - Data Leakage and Train/Test Split", "Reinforce practical leakage intuition.", {
                creator: "Josh Starmer",
                platform: "YouTube",
              }),
              scriptVideo("Internal lecture script: Baselines as anti-self-deception", "Outline a lecture on how teams fool themselves with bad experiments.", [
                "Show a suspiciously strong model and trace the leakage source.",
                "Compare a trivial heuristic to a complex model on a corrected split.",
                "Discuss why baseline culture is a social habit, not just a technical step.",
              ]),
            ],
            [
              exercise(
                "ml101-ex-2",
                "Leakage audit on a synthetic churn dataset",
                "lab",
                "Build a churn classifier twice: once with an intentionally leaky post-cancellation feature, once without it. Quantify the delta and document what changed.",
                [
                  "Notebook with both experiments",
                  "Leakage postmortem",
                  "Final baseline leaderboard",
                ],
                [
                  "How would this leakage sneak into a real feature store?",
                  "Which offline metric changed the most after the leak was removed?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "ml101-q3",
                  "Why is a user-level grouped split preferable to a random row split in many recommendation tasks?",
                  [
                    "It reduces GPU memory use",
                    "It prevents the same user's behavior from leaking across train and test",
                    "It always raises measured accuracy",
                    "It makes calibration unnecessary",
                  ],
                  1,
                  "Without grouping, memorized user behavior can make offline performance look unrealistically strong.",
                ),
                question(
                  "ml101-q4",
                  "What is the best role for a trivial heuristic baseline?",
                  [
                    "It should replace train/test splits",
                    "It proves the task is linearly separable",
                    "It sets a floor that any credible ML system should beat honestly",
                    "It eliminates the need for error analysis",
                  ],
                  2,
                  "Heuristic baselines are cheap reality checks, not full evaluations.",
                ),
              ],
              "Re-run your experiment with stricter splits and at least two non-neural baselines.",
            ),
          ),
        ],
        project(
          "ML 101 capstone: Ship a baseline-first prediction system",
          "Choose a small tabular or text dataset, frame the problem, build three baselines, justify your metric suite, and write an engineering memo on what should be deployed first.",
          [
            "Define the product problem and decision boundary",
            "Implement train/validation/test with leakage checks",
            "Compare at least three baselines and perform error analysis",
            "Write a deployment recommendation with monitoring metrics",
          ],
        ),
      ),
      module(
        "ml101-mod-2",
        "Beginner",
        "Core Math and Optimization Intuition",
        "Learn the minimum math and optimization intuition an engineer needs to debug models instead of treating training as magic.",
        [
          lesson(
            "ml101-lesson-3",
            "Linear Algebra, Probability, and Loss Functions That Actually Matter",
            "90 min",
            "Focus on vectors, matrices, expectations, variance, and objective functions from the perspective of implementation and debugging.",
            [
              "Interpret dot products, norms, and matrix multiplication in model pipelines.",
              "Understand expectation, variance, covariance, and conditional probability operationally.",
              "Connect MSE, cross-entropy, hinge, and ranking losses to system behavior.",
            ],
            [
              "Math matters because it explains failure signatures and tradeoffs.",
              "Loss functions are product assumptions encoded as optimization targets.",
            ],
            [
              video("3Blue1Brown - Essence of Linear Algebra", "Refresh geometric intuition for vectors and transformations.", {
                creator: "3Blue1Brown",
                platform: "YouTube",
              }),
              scriptVideo("Internal lecture script: Why cross-entropy feels different from MSE", "Outline a conceptual walk-through of loss behavior.", [
                "Compare losses on easy and hard examples.",
                "Show how confidence interacts with penalty shape.",
                "Tie the penalty curve back to calibration and decision thresholds.",
              ]),
            ],
            [
              exercise(
                "ml101-ex-3",
                "Loss function stress test",
                "lab",
                "Train two simple classifiers with different losses and compare their confidence distributions, calibration, and robustness to label noise.",
                [
                  "Training code and metric plots",
                  "Calibration comparison",
                  "A short memo on when each loss is preferable",
                ],
                [
                  "What failure pattern appears first under noisy labels?",
                  "How does threshold movement change the ranking of the models?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "ml101-q5",
                  "Why is cross-entropy often preferred over MSE for classification?",
                  [
                    "It uses fewer parameters",
                    "It aligns better with probabilistic classification and penalizes overconfident errors sharply",
                    "It makes train/test leakage impossible",
                    "It guarantees fairness",
                  ],
                  1,
                  "Cross-entropy better reflects probability estimation and punishes confident mistakes more strongly.",
                ),
                question(
                  "ml101-q6",
                  "What does variance capture in model evaluation?",
                  [
                    "Only the number of features",
                    "How much a statistic or model result changes across samples or perturbations",
                    "Whether the model is causal",
                    "The deployment latency",
                  ],
                  1,
                  "Variance tells you how unstable your estimate or model is under resampling or data shifts.",
                ),
              ],
              "Review probability and loss geometry until you can explain both calibration and optimization behavior in plain language.",
            ),
          ),
          lesson(
            "ml101-lesson-4",
            "Optimization, Generalization, and Error Analysis",
            "100 min",
            "Turn underfitting and overfitting into diagnosable engineering states rather than vague textbook terms.",
            [
              "Interpret learning curves and validation gaps.",
              "Use regularization, early stopping, and feature simplification to control generalization.",
              "Perform structured error analysis by cohort, slice, and root cause.",
            ],
            [
              "Generalization is a pipeline property, not just a model property.",
              "Error analysis is where real engineering judgment starts.",
            ],
            [
              video("Google ML Crash Course", "Use a concise reference for optimization and generalization fundamentals.", {
                creator: "Google",
                platform: "Web",
              }),
              scriptVideo("Internal lecture script: Error analysis as model debugging", "Define a methodical workflow for post-training investigation.", [
                "Bucket false positives and false negatives by semantic cause.",
                "Separate data quality, representation, and objective issues.",
                "Choose the next experiment based on the largest avoidable error bucket.",
              ]),
            ],
            [
              exercise(
                "ml101-ex-4",
                "Cohort-level error analysis review",
                "analysis",
                "Take a classifier with decent headline metrics and discover which user or content segments it consistently harms or mishandles.",
                [
                  "Slice metrics table",
                  "Top three error clusters",
                  "Next-experiment proposal grounded in error evidence",
                ],
                [
                  "Which slices reveal blind spots hidden by the aggregate score?",
                  "Would more data, better labeling, or a different objective help most?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "ml101-q7",
                  "A training score keeps improving while validation degrades. What is the most likely diagnosis?",
                  [
                    "The model is underfitting",
                    "The data loader is broken",
                    "The model is overfitting or the validation split is mismatched",
                    "The loss is convex",
                  ],
                  2,
                  "A widening train/validation gap usually points to overfitting or evaluation mismatch.",
                ),
                question(
                  "ml101-q8",
                  "What is the best first step after finding a severe failure on a specific cohort?",
                  [
                    "Hide the cohort from reporting",
                    "Replace the model with a larger one immediately",
                    "Verify the slice, inspect examples, and trace the likely mechanism before changing architecture",
                    "Tune the learning rate only",
                  ],
                  2,
                  "You need evidence about the mechanism before you can choose the right fix.",
                ),
              ],
              "Repeat the slice analysis until you can articulate a prioritized fix plan tied to specific error buckets.",
            ),
          ),
        ],
      ),
    ],
    capstone: project(
      "Course capstone: Baseline-first ML playbook",
      "Create a reusable engineering playbook that includes problem framing, split design, baseline templates, metric selection, and error analysis checklists.",
      [
        "Implement a template repo or notebook pack",
        "Demonstrate it on one real dataset",
        "Write a deployment/no-deployment recommendation",
      ],
    ),
  },
  {
    id: "course-history-ai-ml",
    slug: "history-of-ai-ml",
    title: "History of AI and Machine Learning",
    level: "Beginner",
    timeframe: "2-3 weeks",
    summary:
      "A critical history course on the cycles of optimism, winter, rebranding, and technical breakthroughs that shaped AI and ML through April 2026.",
    whyItMatters:
      "Engineers repeat old mistakes when they forget the field's history: symbolic brittleness, benchmark theater, compute fetishism, and hype without evaluation.",
    prerequisites: ["General technical literacy", "Some curiosity about scientific history"],
    outcomes: [
      "Explain the major technical eras of AI and ML",
      "Distinguish symbolic, statistical, and neural traditions",
      "Connect historical limits to present-day failure modes",
      "Critique hype cycles with technical specificity",
    ],
    tags: ["history", "symbolic ai", "deep learning", "hype cycles", "evaluation"],
    modules: [
      module(
        "history-mod-1",
        "Beginner",
        "From Symbolic AI to Statistical Learning",
        "Understand why early AI systems were impressive, brittle, and ultimately constrained.",
        [
          lesson(
            "history-lesson-1",
            "Cybernetics, Symbolic AI, Expert Systems, and the First Winters",
            "80 min",
            "Trace the rise of symbolic reasoning, the promise of knowledge engineering, and the hard limits exposed by scaling, uncertainty, and brittle rules.",
            [
              "Read the Dartmouth framing of AI and the optimism it created.",
              "Contrast symbolic planning and expert systems with real-world uncertainty.",
              "Explain why maintenance costs and brittleness helped drive AI winters.",
            ],
            [
              "Expert systems were not foolish; they solved the wrong scaling regime.",
              "Brittleness and knowledge capture remain live issues in modern agents.",
            ],
            [
              scriptVideo("Internal lecture script: Why expert systems worked until they didn't", "Turn history into engineering heuristics.", [
                "Reconstruct a simple expert system and show its local strengths.",
                "Demonstrate brittleness under slight distribution change.",
                "Connect knowledge engineering debt to modern prompt and tool maintenance debt.",
              ]),
            ],
            [
              exercise(
                "history-ex-1",
                "Postmortem an expert system",
                "analysis",
                "Choose a classic expert system and write a technical postmortem: what assumptions made it viable, what distribution shifts broke it, and what a modern replacement would keep or discard.",
                [
                  "Historical summary",
                  "Failure taxonomy",
                  "Modern redesign proposal",
                ],
                [
                  "Which assumptions were actually reasonable at the time?",
                  "Which failure patterns still show up in LLM toolchains?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "history-q1",
                  "What was a core weakness of classic expert systems?",
                  [
                    "They required too little domain knowledge",
                    "They struggled to handle uncertainty, novelty, and maintenance at scale",
                    "They could not run on CPUs",
                    "They always underfit small datasets",
                  ],
                  1,
                  "The brittleness and maintenance burden of hand-authored rules were central weaknesses.",
                ),
                question(
                  "history-q2",
                  "Why should a modern ML engineer care about the AI winters?",
                  [
                    "They prove neural networks are wrong",
                    "They show how hype outruns generalization, infrastructure, and evaluation discipline",
                    "They explain compiler design",
                    "They imply all AI funding should stop",
                  ],
                  1,
                  "The winters are reminders that performance demos do not equal durable capability.",
                ),
              ],
              "Review how brittle symbolic assumptions map to current tool-use and prompt-maintenance issues.",
            ),
          ),
          lesson(
            "history-lesson-2",
            "The Probabilistic Turn and the Rise of Empirical ML",
            "90 min",
            "Study the shift toward data-driven inference, statistical learning theory, and benchmark-driven progress.",
            [
              "Explain why probabilistic models and empirical evaluation became dominant.",
              "Understand the role of VC-style thinking, regularization, and benchmark datasets.",
              "See how the field moved from handcrafted knowledge to learned representations.",
            ],
            [
              "The statistical turn made uncertainty and generalization central.",
              "Benchmarks accelerated progress but also encouraged narrow optimization.",
            ],
            [
              video("CS229 lectures", "Use a canonical bridge from classical statistics to ML practice.", {
                creator: "Stanford",
                platform: "Course videos",
              }),
            ],
            [
              exercise(
                "history-ex-2",
                "Benchmark critique memo",
                "paper-review",
                "Choose a landmark benchmark and critique what it measured well, what it hid, and how it shaped the field's incentives.",
                [
                  "Benchmark summary",
                  "Incentive analysis",
                  "A redesigned evaluation proposal",
                ],
                [
                  "What did leaderboard pressure optimize for?",
                  "Which real-world capability was missing from the benchmark?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "history-q3",
                  "What did the probabilistic turn add that symbolic AI often lacked?",
                  [
                    "A way to represent uncertainty and learn from data",
                    "The ability to write code",
                    "Guaranteed causal inference",
                    "Freedom from benchmarks",
                  ],
                  0,
                  "Probabilistic modeling introduced uncertainty-aware inference and empirical learning from data.",
                ),
                question(
                  "history-q4",
                  "What is a major risk of benchmark-driven progress?",
                  [
                    "It makes reproducibility impossible",
                    "It can reward narrow optimization that does not transfer to deployment reality",
                    "It removes the need for theory",
                    "It eliminates bias",
                  ],
                  1,
                  "Benchmarks are useful but can distort incentives when treated as the goal rather than a measurement tool.",
                ),
              ],
              "Revisit benchmark history with a focus on incentive design, not just performance numbers.",
            ),
          ),
        ],
      ),
      module(
        "history-mod-2",
        "Advanced",
        "Deep Learning, Foundation Models, and the 2026 Lens",
        "Critically evaluate what changed after GPUs, large datasets, transformers, and agentic systems became central.",
        [
          lesson(
            "history-lesson-3",
            "Why Deep Learning Won",
            "90 min",
            "Analyze the convergence of data availability, compute, architectures, optimization tricks, and software ecosystems that made deep learning dominant.",
            [
              "Study the ImageNet era and representation learning shift.",
              "Understand why compute and data pipelines mattered as much as architecture insight.",
              "Learn the role of frameworks and hardware in accelerating research translation.",
            ],
            [
              "Deep learning won through systems leverage as much as through math.",
              "Scale changed what was feasible, but not every scaling claim generalizes cleanly.",
            ],
            [
              video("Fast.ai Practical Deep Learning", "Anchor deep learning progress in practical implementation.", {
                creator: "fast.ai",
                platform: "Course videos",
              }),
            ],
            [
              exercise(
                "history-ex-3",
                "Timeline of deep learning enablers",
                "analysis",
                "Create a timeline showing how GPUs, datasets, frameworks, regularization advances, and architectural changes interacted to make deep learning practical.",
                [
                  "Annotated timeline",
                  "One-page causal narrative",
                  "Counterfactual analysis of which enabler mattered most",
                ],
                [
                  "Would transformers have mattered without modern data/compute stacks?",
                  "Which enabling factor is most underrated in popular histories?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "history-q5",
                  "Which statement best explains deep learning's rise?",
                  [
                    "One architecture alone solved intelligence",
                    "Progress came from the interaction of scale, optimization, software, hardware, and data",
                    "Symbolic AI disappeared overnight",
                    "Benchmarks became unnecessary",
                  ],
                  1,
                  "The rise was systemic, not attributable to a single isolated breakthrough.",
                ),
                question(
                  "history-q6",
                  "Why is software infrastructure part of AI history?",
                  [
                    "Because model code has no effect on research velocity",
                    "Because frameworks and accelerators lowered iteration cost and widened access",
                    "Because history only concerns algorithms",
                    "Because infrastructure makes data irrelevant",
                  ],
                  1,
                  "Infrastructure changes what researchers and engineers can practically try.",
                ),
              ],
              "Review deep learning history through a systems lens rather than a single-paper lens.",
            ),
          ),
          lesson(
            "history-lesson-4",
            "Foundation Models, Agents, and Critical Perspectives Through 2026",
            "100 min",
            "Place transformers, LLMs, multimodal systems, retrieval, and agents in historical context and separate durable capability from theater.",
            [
              "Trace the transformer to foundation-model pipeline.",
              "Study the return of tool use, memory, and planning in agent systems.",
              "Critique hallucination, evaluation gaps, data provenance issues, and deployment economics.",
            ],
            [
              "Modern systems reintroduce old AI questions under a new statistical interface.",
              "An ML engineer in 2026 must reason about evaluation, retrieval quality, latency, and governance together.",
            ],
            [
              video("Full Stack Deep Learning", "Bridge model advances to real-world systems concerns.", {
                creator: "Full Stack Deep Learning",
                platform: "Course videos",
              }),
              scriptVideo("Internal lecture script: The return of symbolic problems inside LLM systems", "Connect modern agent systems to older AI debates.", [
                "Show how tool use reintroduces planning and verification problems.",
                "Compare retrieval and external memory to earlier knowledge engineering goals.",
                "End with a framework for identifying 'demo intelligence' vs durable capability.",
              ]),
            ],
            [
              exercise(
                "history-ex-4",
                "Hype audit: one modern AI product claim",
                "paper-review",
                "Select a 2025-2026 AI product claim, reconstruct the likely underlying system, identify hidden dependencies, and evaluate whether the claim represents progress, packaging, or benchmark leakage.",
                [
                  "System diagram",
                  "Capability vs constraint analysis",
                  "Evaluation critique",
                ],
                [
                  "What part is actual model capability versus retrieval, UX, or human review?",
                  "Which missing benchmark would most likely break the claim?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "history-q7",
                  "What is a recurring historical pattern in AI progress?",
                  [
                    "Strong demos are often mistaken for robust general capability",
                    "Compute never matters",
                    "Evaluation always keeps pace with deployment",
                    "Old ideas never return",
                  ],
                  0,
                  "History repeatedly shows that showcase performance can outrun reliability and understanding.",
                ),
                question(
                  "history-q8",
                  "Why is retrieval important in the foundation-model era?",
                  [
                    "It removes the need for evaluation",
                    "It externalizes knowledge access and changes quality bottlenecks from raw model memory to context quality and ranking",
                    "It guarantees truthfulness",
                    "It makes tool use obsolete",
                  ],
                  1,
                  "Retrieval shifts system quality toward indexing, ranking, and context-grounding performance.",
                ),
              ],
              "Tie current LLM and agent claims back to older issues around grounding, reasoning, and maintainability.",
            ),
          ),
        ],
      ),
    ],
    capstone: project(
      "Course capstone: Historical critique of an AI stack",
      "Write a technical essay that locates one modern AI system in the longer history of symbolic AI, statistical learning, and deep learning, and explains which old problems it still inherits.",
      [
        "Select one modern system category",
        "Trace at least three historical antecedents",
        "Identify recurring failure modes and new constraints",
      ],
    ),
  },
  {
    id: "course-classical-ml",
    slug: "classical-ml-and-statistical-learning",
    title: "Classical ML and Statistical Learning for Engineers",
    level: "Advanced",
    timeframe: "5-7 weeks",
    summary:
      "A deep course on linear models, trees, boosting, calibration, ranking, feature engineering, and model selection that prevents engineers from skipping directly to deep nets where simpler methods dominate.",
    whyItMatters:
      "Production ML still leans heavily on classical methods for tabular data, ranking, calibrated prediction, and interpretable decision support.",
    prerequisites: [
      "ML 101 material",
      "Basic calculus and probability",
      "Ability to work with Python notebooks or scripts",
    ],
    outcomes: [
      "Choose classical models by data regime and constraints",
      "Understand calibration, ranking, and thresholding",
      "Build strong tabular and sparse-feature baselines",
      "Perform robust ablations and feature audits",
    ],
    tags: ["linear models", "trees", "boosting", "calibration", "ranking"],
    modules: [
      module(
        "classical-mod-1",
        "Advanced",
        "Linear Models, Sparse Features, and Calibration",
        "Master models that remain essential for tabular and sparse high-dimensional systems.",
        [
          lesson(
            "classical-lesson-1",
            "Linear and Logistic Regression Beyond the Textbook",
            "100 min",
            "Study linear models as reliable workhorses: regularization, interpretability limits, thresholding, calibration, and failure under interaction-heavy problems.",
            [
              "Use L1/L2 regularization and understand its operational effect.",
              "Connect coefficients to directional influence without overclaiming causality.",
              "Calibrate probabilities and pick thresholds using business constraints.",
            ],
            [
              "Linear models are strong baselines because they fail in understandable ways.",
              "Calibration is often more important than squeezing out a tiny AUC improvement.",
            ],
            [
              video("StatQuest - Logistic Regression", "Refresh the mechanics and intuition of logistic models.", {
                creator: "Josh Starmer",
                platform: "YouTube",
              }),
            ],
            [
              exercise(
                "classical-ex-1",
                "Calibration and thresholding lab",
                "lab",
                "Train a logistic model, then calibrate it with Platt scaling or isotonic regression. Select thresholds for three different operating constraints.",
                [
                  "Calibration plot",
                  "Threshold policy memo",
                  "Comparison against an uncalibrated baseline",
                ],
                [
                  "What business choice is encoded by each threshold?",
                  "How does calibration change trust in downstream automation?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "classical-q1",
                  "Why can a model with strong ROC-AUC still be operationally weak?",
                  [
                    "ROC-AUC is only for regression",
                    "Good ranking does not guarantee well-calibrated probabilities or a suitable threshold policy",
                    "ROC-AUC measures latency only",
                    "ROC-AUC prevents feature engineering",
                  ],
                  1,
                  "Ranking quality and probability quality are different properties.",
                ),
                question(
                  "classical-q2",
                  "What does L1 regularization often encourage?",
                  [
                    "Denser feature usage",
                    "Sparser solutions that can aid feature selection",
                    "Guaranteed causal coefficients",
                    "Perfect calibration",
                  ],
                  1,
                  "L1 tends to drive some coefficients to zero, encouraging sparsity.",
                ),
              ],
              "Revisit calibration and thresholding until you can defend a decision policy under operational constraints.",
            ),
          ),
          lesson(
            "classical-lesson-2",
            "Feature Engineering, Interaction Effects, and Honest Interpretation",
            "95 min",
            "Build feature pipelines that help without creating leakage, interpretation theater, or unsustainable complexity.",
            [
              "Use transformations, cross-features, and sensible encodings.",
              "Detect when interaction-heavy data is stretching linear assumptions too far.",
              "Separate helpful interpretation from unjustified causal narratives.",
            ],
            [
              "Feature engineering is domain modeling, not spreadsheet decoration.",
              "Interpretability claims weaken quickly when features are correlated, transformed, or policy-entangled.",
            ],
            [
              scriptVideo("Internal lecture script: Feature engineering as theory of the domain", "Teach when manual features still outperform brute-force scaling.", [
                "Start with weak raw features and identify domain-informed transformations.",
                "Show one interaction term that matters and one that leaks policy information.",
                "Explain why interpretability is conditional on feature design choices.",
              ]),
            ],
            [
              exercise(
                "classical-ex-2",
                "Tabular feature ablation study",
                "lab",
                "Construct a feature pipeline for a tabular problem, then ablate each feature family and document where performance and calibration move.",
                [
                  "Pipeline code",
                  "Ablation table",
                  "Interpretation memo with caveats",
                ],
                [
                  "Which feature family carries the real signal?",
                  "Which features look interpretable but are proxies for hidden policy variables?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "classical-q3",
                  "What is the clearest warning sign that a model explanation may be misleading?",
                  [
                    "The model uses fewer than 100 features",
                    "Features are correlated, transformed, or post-treatment but explanations are presented as causal facts",
                    "The loss is convex",
                    "The training loop converged",
                  ],
                  1,
                  "Explanations become fragile when the feature pipeline itself entangles mechanisms and proxies.",
                ),
                question(
                  "classical-q4",
                  "Why are ablation studies valuable?",
                  [
                    "They replace the test set",
                    "They identify which components actually contribute signal and robustness",
                    "They guarantee fairness",
                    "They prevent concept drift",
                  ],
                  1,
                  "Ablations expose whether complexity is earning its keep.",
                ),
              ],
              "Repeat the ablation until your explanation claims are narrower and better supported.",
            ),
          ),
        ],
      ),
      module(
        "classical-mod-2",
        "Advanced",
        "Trees, Boosting, Ranking, and Retrieval Foundations",
        "Understand high-performance non-neural systems that power large fractions of real production ML.",
        [
          lesson(
            "classical-lesson-3",
            "Decision Trees, Random Forests, and Gradient Boosting",
            "105 min",
            "Learn why boosted trees dominate many tabular competitions and production systems, and where they break under drift, imbalance, or missing semantics.",
            [
              "Understand bias/variance behavior across tree ensembles.",
              "Tune depth, learning rate, and sampling without leaderboard superstition.",
              "Interpret gain-based importance cautiously and compare with permutation tests.",
            ],
            [
              "Boosted trees are often the correct default for structured tabular problems.",
              "Their power can hide data quality issues and extrapolation weakness.",
            ],
            [
              video("XGBoost documentation and tutorials", "Connect ensemble theory to practical implementation.", {
                creator: "XGBoost",
                platform: "Web",
              }),
            ],
            [
              exercise(
                "classical-ex-3",
                "Gradient boosting under distribution shift",
                "lab",
                "Train a boosted tree model on a stable slice, then evaluate it under a shifted slice. Document which features fail to extrapolate and propose mitigations.",
                [
                  "Training notebook",
                  "Shift analysis",
                  "Mitigation plan",
                ],
                [
                  "Which feature interactions were overfit to the training regime?",
                  "Would monotonic constraints, simpler features, or retraining cadence help more?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "classical-q5",
                  "Why do boosted trees often outperform linear models on tabular data?",
                  [
                    "They can capture nonlinear interactions with little manual feature construction",
                    "They make train/test splits unnecessary",
                    "They never overfit",
                    "They provide causal guarantees",
                  ],
                  0,
                  "Trees naturally model interactions and nonlinearities that linear models must be hand-engineered to capture.",
                ),
                question(
                  "classical-q6",
                  "What is a major weakness of many tree ensembles?",
                  [
                    "They cannot handle tabular data",
                    "They extrapolate poorly outside the observed training regime",
                    "They do not support classification",
                    "They are always slower than deep nets",
                  ],
                  1,
                  "Tree models can be strong interpolators but weak extrapolators under shift.",
                ),
              ],
              "Compare tree-based models and linear models under drift, not just static validation.",
            ),
          ),
          lesson(
            "classical-lesson-4",
            "Ranking, Retrieval, and Candidate Generation Before LLMs",
            "90 min",
            "Study the ranking and retrieval foundations that still matter in search, recommenders, ads, and modern RAG pipelines.",
            [
              "Understand candidate generation, scoring, re-ranking, and offline ranking metrics.",
              "Learn why retrieval quality can dominate system quality.",
              "Connect classical ranking infrastructure to modern vector retrieval systems.",
            ],
            [
              "Retrieval pipelines are ML systems even when the final model is not a giant neural net.",
              "RAG quality depends on ranking fundamentals as much as on generator quality.",
            ],
            [
              scriptVideo("Internal lecture script: Ranking systems before and after transformers", "Create a bridge from ads/search systems to RAG.", [
                "Walk through a two-stage ranker.",
                "Map classical ranking metrics to RAG retrieval metrics.",
                "Explain why bad candidates doom the generator.",
              ]),
            ],
            [
              exercise(
                "classical-ex-4",
                "Build a two-stage retrieval pipeline",
                "systems-design",
                "Design a retrieval pipeline with a cheap candidate generator and a richer reranker. Include latency budgets, evaluation metrics, and failure cases.",
                [
                  "Architecture diagram",
                  "Metric plan",
                  "Latency and cost budget",
                ],
                [
                  "Where does recall die first?",
                  "What metrics reveal retrieval failure before users do?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "classical-q7",
                  "Why are candidate generation errors especially dangerous?",
                  [
                    "Because rerankers can always recover missed documents",
                    "Because missed candidates are invisible to downstream stages",
                    "Because they only affect latency",
                    "Because they improve fairness automatically",
                  ],
                  1,
                  "If the right item never enters the candidate set, later stages cannot rescue it.",
                ),
                question(
                  "classical-q8",
                  "Which idea transfers directly from classic ranking systems to RAG?",
                  [
                    "Context quality depends heavily on recall and ranking quality",
                    "Generative models eliminate candidate generation",
                    "Offline metrics are never useful",
                    "Approximate search removes all system tradeoffs",
                  ],
                  0,
                  "RAG still lives or dies by retrieval quality and candidate coverage.",
                ),
              ],
              "Strengthen your ranking intuition before treating retrieval as a solved subroutine.",
            ),
          ),
        ],
      ),
    ],
    capstone: project(
      "Course capstone: Tabular or ranking system deep dive",
      "Ship a competitive classical ML system with calibrated outputs, ablations, and an error analysis that justifies when you would or would not graduate to deep learning.",
      [
        "Implement at least two model families",
        "Perform calibration and slice analysis",
        "Write a graduation-to-deep-learning decision memo",
      ],
    ),
  },
  {
    id: "course-deep-learning",
    slug: "deep-learning-and-representation-engineering",
    title: "Deep Learning and Representation Engineering",
    level: "Advanced",
    timeframe: "6-8 weeks",
    summary:
      "A systems-minded deep learning course covering optimization, architectures, embeddings, transformers, and the engineering discipline needed to train and debug modern neural models.",
    whyItMatters:
      "Neural systems dominate perception, language, multimodality, and large-scale representation learning, but they punish shallow understanding with expensive failures.",
    prerequisites: ["ML 101", "Classical ML", "Linear algebra", "Basic PyTorch or equivalent"],
    outcomes: [
      "Train and debug neural models with principled diagnostics",
      "Understand embeddings, representation quality, and architecture tradeoffs",
      "Reason about compute, memory, and scaling constraints",
      "Connect training decisions to downstream deployment behavior",
    ],
    tags: ["deep learning", "pytorch", "transformers", "optimization", "embeddings"],
    modules: [
      module(
        "dl-mod-1",
        "Advanced",
        "Optimization and Representation Learning",
        "Build the optimization intuition needed to train real neural networks without superstition.",
        [
          lesson(
            "dl-lesson-1",
            "Backpropagation, Initialization, and Training Instability",
            "110 min",
            "Understand gradient flow, exploding and vanishing gradients, normalization, initialization, and why your model sometimes collapses for reasons unrelated to architecture novelty.",
            [
              "Trace gradients through layered computation graphs.",
              "Study initialization and normalization as stability tools.",
              "Use diagnostics for exploding gradients, dead activations, and optimizer mismatch.",
            ],
            [
              "Training failure is often a systems problem in disguise: scale, initialization, data order, or numeric precision.",
              "You do not understand a neural model until you can explain how it fails to train.",
            ],
            [
              video("Andrej Karpathy - Neural Networks: Zero to Hero", "Ground modern deep learning intuition in implementation.", {
                creator: "Andrej Karpathy",
                platform: "YouTube",
              }),
            ],
            [
              exercise(
                "dl-ex-1",
                "Training instability debugging notebook",
                "debugging",
                "Intentionally destabilize a neural training run using poor initialization, high learning rate, and no normalization. Recover it step by step and document the signal from each diagnostic.",
                [
                  "Notebook with failure and repair phases",
                  "Gradient/statistics dashboard",
                  "Debugging narrative",
                ],
                [
                  "Which metrics told you the model was sick before loss diverged visibly?",
                  "Which fixes improved stability but hurt generalization?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "dl-q1",
                  "Why does poor initialization matter in deep networks?",
                  [
                    "It changes the GPU driver version",
                    "It can destroy gradient flow and make early training unstable or stagnant",
                    "It removes the need for normalization",
                    "It only affects inference latency",
                  ],
                  1,
                  "Initialization shapes activation and gradient scales before learning has any chance to help.",
                ),
                question(
                  "dl-q2",
                  "What is a useful first move when loss becomes NaN during training?",
                  [
                    "Increase model width only",
                    "Inspect gradients, learning rate, normalization, and numerical precision",
                    "Delete the validation set",
                    "Add more dropout blindly",
                  ],
                  1,
                  "NaNs are often numerical or optimization-pathology signals that require direct inspection.",
                ),
              ],
              "Repeat the debugging notebook until you can connect each failure signature to a likely mechanism.",
            ),
          ),
          lesson(
            "dl-lesson-2",
            "Embeddings, Contrastive Learning, and Representation Quality",
            "100 min",
            "Study how embeddings become useful, what geometry tells you, and why representation quality depends on the task, objective, and negative sampling strategy.",
            [
              "Interpret embedding spaces and retrieval behavior.",
              "Understand contrastive learning, triplet loss, and negative selection.",
              "Evaluate representations through probing, retrieval, clustering, and transfer tasks.",
            ],
            [
              "Embeddings are interfaces between tasks, not magic semantic objects.",
              "A good embedding for retrieval may be a weak one for calibration or fine-grained classification.",
            ],
            [
              video("Hugging Face Course", "Anchor embedding practice in modern NLP tooling.", {
                creator: "Hugging Face",
                platform: "Course",
              }),
              scriptVideo("Internal lecture script: What makes an embedding useful?", "Design a lecture around geometric intuition and task dependence.", [
                "Visualize neighborhoods that look semantic but fail on retrieval.",
                "Compare cosine similarity with downstream supervised performance.",
                "End with an evaluation matrix for representation quality.",
              ]),
            ],
            [
              exercise(
                "dl-ex-2",
                "Embedding evaluation suite",
                "lab",
                "Generate embeddings for a small text or image dataset and compare them across retrieval, clustering, and simple linear probe tasks.",
                [
                  "Embedding generation code",
                  "Three evaluation views",
                  "A memo on which tasks the representation is actually good at",
                ],
                [
                  "Does neighborhood coherence imply downstream usefulness?",
                  "What evaluation would expose representational collapse earliest?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "dl-q3",
                  "Why are hard negatives important in contrastive learning?",
                  [
                    "They reduce disk usage",
                    "They force the representation to learn more discriminative boundaries than trivial negatives provide",
                    "They eliminate the need for evaluation",
                    "They guarantee causality",
                  ],
                  1,
                  "Hard negatives prevent the task from becoming too easy and semantically uninformative.",
                ),
                question(
                  "dl-q4",
                  "What is a healthy attitude toward embedding quality?",
                  [
                    "Assume one embedding is universally good for every downstream task",
                    "Evaluate representation quality against the actual downstream task family and failure modes",
                    "Use only t-SNE screenshots",
                    "Ignore calibration and retrieval quality",
                  ],
                  1,
                  "Embedding usefulness is task-relative and should be measured across relevant downstream behaviors.",
                ),
              ],
              "Strengthen your representation evaluation beyond visualization and anecdotal retrieval examples.",
            ),
          ),
        ],
      ),
      module(
        "dl-mod-2",
        "Advanced",
        "CNNs, Transformers, and Practical Scaling",
        "Understand why architecture choices matter and when scaling helps or hurts.",
        [
          lesson(
            "dl-lesson-3",
            "Architectures That Matter: CNNs, Sequence Models, and Transformers",
            "110 min",
            "Learn what inductive biases each architecture buys, why transformers became dominant, and where specialized structures still outperform generic sequence models.",
            [
              "Compare convolutional locality priors with attention-based flexibility.",
              "Understand sequence bottlenecks in RNNs and the parallelism advantage of transformers.",
              "Choose architectures by modality, latency, and data regime rather than trend.",
            ],
            [
              "Architectures are bets about what structure matters and what compute you can afford.",
              "Transformer dominance does not make every prior obsolete.",
            ],
            [
              video("Annotated Transformer", "Bridge theoretical transformer mechanics to implementation.", {
                creator: "Harvard NLP",
                platform: "Web",
              }),
            ],
            [
              exercise(
                "dl-ex-3",
                "Architecture choice memo",
                "systems-design",
                "Given three product scenarios, choose an architecture family for each and defend the decision using data regime, latency, interpretability, and update cadence.",
                [
                  "Architecture comparison matrix",
                  "Per-scenario recommendation",
                  "Risk register for each choice",
                ],
                [
                  "What bias or structure does each model encode?",
                  "When would a simpler architecture outperform a larger transformer?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "dl-q5",
                  "Why did transformers scale so effectively in language?",
                  [
                    "They made data unnecessary",
                    "Their attention mechanism and training parallelism paired well with large-scale compute and corpora",
                    "They guarantee reasoning",
                    "They remove hallucination by design",
                  ],
                  1,
                  "Transformers fit the hardware and data regime of large-scale sequence learning unusually well.",
                ),
                question(
                  "dl-q6",
                  "When might a transformer not be the best default?",
                  [
                    "When local inductive bias, latency, or limited data make a more structured model preferable",
                    "Never",
                    "Only when labels are unavailable",
                    "Only in reinforcement learning",
                  ],
                  0,
                  "Architecture should follow constraints, not fashion.",
                ),
              ],
              "Review architectural tradeoffs until you can defend a non-transformer choice without embarrassment.",
            ),
          ),
          lesson(
            "dl-lesson-4",
            "Scaling Laws, Fine-Tuning, and Inference Tradeoffs",
            "100 min",
            "Study the engineering economics of neural systems: batch size, memory, quantization, fine-tuning methods, and where scale stops paying clean dividends.",
            [
              "Connect scaling trends to compute budgets and deployment latency.",
              "Compare full fine-tuning, adapters, LoRA-style methods, and prompt-based adaptation.",
              "Understand quantization and serving tradeoffs.",
            ],
            [
              "The best model is not the largest model; it is the one whose capability-cost-reliability profile matches the job.",
              "Fine-tuning strategy is a product decision dressed as optimization.",
            ],
            [
              video("Full Stack Deep Learning - LLMs and deployment", "Bridge training choices to serving reality.", {
                creator: "Full Stack Deep Learning",
                platform: "Course videos",
              }),
            ],
            [
              exercise(
                "dl-ex-4",
                "Model selection under budget constraints",
                "analysis",
                "Compare three hypothetical model serving plans across quality, latency, VRAM, and tuning effort. Recommend one for a real product scenario.",
                [
                  "Cost-quality matrix",
                  "Recommendation memo",
                  "Rollback and monitoring plan",
                ],
                [
                  "What metric would justify stepping up to a larger model?",
                  "What failure mode gets worse as you quantize or distill?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "dl-q7",
                  "Why is model scaling not a free lunch?",
                  [
                    "Bigger models often increase cost, latency, and operational fragility even when quality rises",
                    "Scaling always reduces capability",
                    "Scaling makes monitoring irrelevant",
                    "Bigger models cannot be fine-tuned",
                  ],
                  0,
                  "Quality gains must be weighed against operational and economic constraints.",
                ),
                question(
                  "dl-q8",
                  "What is a strong reason to use parameter-efficient fine-tuning?",
                  [
                    "It always beats full fine-tuning in every regime",
                    "It reduces adaptation cost and infrastructure burden when full updates are unnecessary",
                    "It removes the need for evaluation",
                    "It guarantees no catastrophic forgetting",
                  ],
                  1,
                  "PEFT methods can be the right tradeoff when infrastructure and iteration cost dominate.",
                ),
              ],
              "Rework your cost-quality analysis until you can defend the choice financially and technically.",
            ),
          ),
        ],
      ),
    ],
    capstone: project(
      "Course capstone: Train, adapt, and serve a neural model responsibly",
      "Take one neural problem from training through adaptation and deployment planning, documenting optimization pathology, evaluation results, and serving constraints.",
      [
        "Train or adapt a model",
        "Produce diagnostics and error analysis",
        "Recommend a serving plan with cost and latency tradeoffs",
      ],
    ),
  },
  {
    id: "course-ml-systems",
    slug: "ml-systems-and-mlops",
    title: "ML Systems, MLOps, and Production Reliability",
    level: "Advanced",
    timeframe: "5-7 weeks",
    summary:
      "A production engineering course on data pipelines, feature stores, experiment tracking, CI/CD for models, observability, and failure management.",
    whyItMatters:
      "A model without data contracts, observability, and rollback discipline is a demo. Production ML is mostly software, data, and operational rigor.",
    prerequisites: ["ML 101", "Software engineering fundamentals", "Basic cloud literacy"],
    outcomes: [
      "Design robust training and serving pipelines",
      "Operate models with monitoring, rollback, and incident response",
      "Manage feature drift, label delay, and offline-online skew",
      "Tie ML deployment decisions to product and cost constraints",
    ],
    tags: ["mlops", "feature stores", "monitoring", "drift", "deployment"],
    modules: [
      module(
        "systems-mod-1",
        "Advanced",
        "Data Contracts, Features, and Experimentation",
        "Build the data and experimentation spine that every production ML system needs.",
        [
          lesson(
            "systems-lesson-1",
            "Data Pipelines, Feature Stores, and Offline-Online Consistency",
            "95 min",
            "Learn how features are created, versioned, validated, and served without quietly drifting away from the training environment.",
            [
              "Design feature computation with reproducibility and freshness in mind.",
              "Understand point-in-time correctness and feature leakage in feature stores.",
              "Detect offline-online skew and data contract violations early.",
            ],
            [
              "Feature engineering becomes an infrastructure problem as soon as you need consistency and reuse.",
              "Point-in-time correctness is non-negotiable in any serious prediction system.",
            ],
            [
              video("Chip Huyen - Designing ML Systems", "Bridge data pipelines to deployed ML.", {
                creator: "Chip Huyen",
                platform: "Talks / book material",
              }),
            ],
            [
              exercise(
                "systems-ex-1",
                "Point-in-time feature design review",
                "systems-design",
                "Design features for a fraud or churn model and prove how each feature will be computed consistently in both training and serving.",
                [
                  "Feature spec",
                  "Point-in-time correctness checklist",
                  "Offline-online skew detection plan",
                ],
                [
                  "Which feature is most likely to leak future information?",
                  "How would you version a feature whose business definition changes?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "systems-q1",
                  "What does point-in-time correctness protect against?",
                  [
                    "GPU memory fragmentation",
                    "Training on information that would not have been available at prediction time",
                    "Model compression loss",
                    "Prompt injection",
                  ],
                  1,
                  "It prevents hidden future information from contaminating feature computation.",
                ),
                question(
                  "systems-q2",
                  "Why is offline-online skew dangerous?",
                  [
                    "Because it makes Python slower",
                    "Because the model is effectively trained and served on different feature definitions or distributions",
                    "Because it increases batch size",
                    "Because it forces you to use deep learning",
                  ],
                  1,
                  "Skew breaks the assumptions behind offline evaluation and causes silent deployment regressions.",
                ),
              ],
              "Trace your feature lineage until you can show exactly how each feature is produced in both environments.",
            ),
          ),
          lesson(
            "systems-lesson-2",
            "Experiment Tracking, Reproducibility, and Release Discipline",
            "90 min",
            "Turn experimentation from notebook chaos into disciplined engineering with artifacts, configs, lineage, and release criteria.",
            [
              "Track data versions, code versions, parameters, and metrics together.",
              "Define reproducible training runs and promotion criteria.",
              "Build release checklists that combine model quality and operational readiness.",
            ],
            [
              "If you cannot reproduce a run, you do not have a system; you have a rumor.",
              "Promotion criteria must include business and operational risk, not just offline score deltas.",
            ],
            [
              scriptVideo("Internal lecture script: From notebook archaeology to experiment lineage", "Teach experiment rigor as software engineering.", [
                "Compare an irreproducible notebook with a tracked run.",
                "List the metadata required to recreate a model exactly.",
                "Define a promotion checklist that includes rollback criteria.",
              ]),
            ],
            [
              exercise(
                "systems-ex-2",
                "Experiment lineage template",
                "analysis",
                "Design a template for experiment tracking that captures code revision, dataset fingerprint, environment, hyperparameters, metrics, artifacts, and sign-off status.",
                [
                  "Tracking schema",
                  "Promotion checklist",
                  "Example run record",
                ],
                [
                  "Which missing field would be most likely to cause an irreproducible release?",
                  "What evidence is needed before promotion to production?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "systems-q3",
                  "What is a strong indicator that an experiment tracking setup is insufficient?",
                  [
                    "It stores too many metrics",
                    "You cannot recreate a released model from versioned code, data, and config",
                    "It uses cloud storage",
                    "It logs latency",
                  ],
                  1,
                  "Reproducibility is the baseline requirement for any serious experiment system.",
                ),
                question(
                  "systems-q4",
                  "Why should release criteria include operational metrics?",
                  [
                    "Because accuracy makes latency irrelevant",
                    "Because a model that wins offline can still fail on latency, cost, or observability requirements",
                    "Because release checklists are only for auditors",
                    "Because operations teams choose the loss function",
                  ],
                  1,
                  "Production viability is broader than offline predictive quality.",
                ),
              ],
              "Strengthen your release checklist until it blocks unsafe promotions for non-model reasons too.",
            ),
          ),
        ],
      ),
      module(
        "systems-mod-2",
        "Advanced",
        "Monitoring, Drift, and Incident Response",
        "Operate ML services as living systems rather than static artifacts.",
        [
          lesson(
            "systems-lesson-3",
            "Drift, Label Delay, and Service Health",
            "95 min",
            "Monitor models when labels are delayed, data shifts are messy, and failures emerge long before traditional accuracy numbers catch them.",
            [
              "Distinguish data drift, concept drift, and metric drift.",
              "Use proxy metrics, slice metrics, and retrieval diagnostics under label delay.",
              "Connect health checks to alerting and rollback choices.",
            ],
            [
              "Production monitoring without label realism is wishful thinking.",
              "Proxy metrics should be explicit stopgaps, not permanent substitutes for truth.",
            ],
            [
              video("Google SRE / ML reliability talks", "Bridge model health to reliability engineering.", {
                creator: "Google",
                platform: "Talks",
              }),
            ],
            [
              exercise(
                "systems-ex-3",
                "Monitoring spec for a delayed-label system",
                "systems-design",
                "Design a monitoring plan for a system where true labels arrive weeks later. Include proxies, alerts, slice metrics, and escalation rules.",
                [
                  "Monitoring spec",
                  "Alert thresholds",
                  "Fallback and rollback plan",
                ],
                [
                  "Which proxy is most likely to drift away from the real objective?",
                  "What triggers an emergency rollback before labels arrive?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "systems-q5",
                  "Why is delayed-label monitoring hard?",
                  [
                    "Because models stop producing predictions",
                    "Because the most meaningful quality signal arrives too late to support immediate incident response",
                    "Because drift disappears",
                    "Because feature stores become unnecessary",
                  ],
                  1,
                  "You need interim proxies and operational heuristics before the ground truth catches up.",
                ),
                question(
                  "systems-q6",
                  "What is concept drift?",
                  [
                    "A GPU memory leak",
                    "A change in the relationship between inputs and the target or decision outcome",
                    "A stable data schema",
                    "A model export format",
                  ],
                  1,
                  "Concept drift changes the predictive mapping itself, not just the feature distribution.",
                ),
              ],
              "Review drift types until you can map each alert to a plausible causal mechanism.",
            ),
          ),
          lesson(
            "systems-lesson-4",
            "Incident Response, Human Override, and Safe Rollback",
            "85 min",
            "Learn how to respond when model behavior becomes unsafe, expensive, biased, or operationally unstable.",
            [
              "Design kill switches, shadow mode, and safe fallback paths.",
              "Write ML-specific incident playbooks and postmortems.",
              "Integrate human review and escalation without hiding systemic problems.",
            ],
            [
              "Rollback is a product feature, not an admission of failure.",
              "Human review should absorb uncertainty, not mask unknown model breakage indefinitely.",
            ],
            [
              scriptVideo("Internal lecture script: ML incident command", "Teach incident response for model-driven systems.", [
                "Walk through a model regression from detection to rollback.",
                "Define owners, telemetry, and evidence needed during triage.",
                "End with a postmortem template focused on systemic fixes.",
              ]),
            ],
            [
              exercise(
                "systems-ex-4",
                "Write an ML incident playbook",
                "analysis",
                "Author a playbook for one high-risk model including triggers, severity levels, fallback behavior, communication paths, and recovery validation.",
                [
                  "Incident playbook",
                  "Rollback checklist",
                  "Postmortem template",
                ],
                [
                  "What evidence is enough to rollback before root cause is known?",
                  "How do you stop human override from becoming permanent technical debt?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "systems-q7",
                  "What is a strong reason to maintain a non-ML fallback path?",
                  [
                    "It removes the need for monitoring",
                    "It gives the product a safer degraded mode when the model becomes unreliable or unavailable",
                    "It guarantees better accuracy",
                    "It replaces incident response",
                  ],
                  1,
                  "Fallback paths preserve service continuity under uncertainty or outage.",
                ),
                question(
                  "systems-q8",
                  "Why should ML postmortems focus on systems, not blame?",
                  [
                    "Because models fail randomly",
                    "Because lasting reliability comes from fixing data, process, tooling, and ownership gaps",
                    "Because root cause does not matter",
                    "Because only leadership should read them",
                  ],
                  1,
                  "Blameless postmortems improve the system that allowed the incident to happen.",
                ),
              ],
              "Refine the playbook until it is executable by someone other than the original author.",
            ),
          ),
        ],
      ),
    ],
    capstone: project(
      "Course capstone: Production ML service blueprint",
      "Design a full training-to-serving ML platform slice with feature lineage, release controls, monitoring, and incident response for a chosen use case.",
      [
        "Define the training and serving architecture",
        "Write the release and monitoring plan",
        "Simulate one incident and document the response",
      ],
    ),
  },
  {
    id: "course-llm-systems",
    slug: "llm-rag-and-agentic-systems",
    title: "LLMs, Retrieval, and Agentic Systems",
    level: "Advanced",
    timeframe: "6-8 weeks",
    summary:
      "A practical and critical course on LLM architectures, prompting, retrieval, fine-tuning, evaluation, tool use, and the engineering realities of agentic systems in 2026.",
    whyItMatters:
      "Modern ML engineering increasingly means building model-plus-system stacks where retrieval, orchestration, evaluation, and cost management matter as much as the model itself.",
    prerequisites: ["Deep learning foundations", "ML systems basics", "Comfort with APIs and distributed services"],
    outcomes: [
      "Design robust RAG and tool-use systems",
      "Evaluate LLMs with task-aligned and adversarial protocols",
      "Manage latency, cost, retrieval quality, and safety together",
      "Recognize the boundary between useful automation and brittle theater",
    ],
    tags: ["llm", "rag", "agents", "evaluation", "retrieval"],
    modules: [
      module(
        "llm-mod-1",
        "Advanced",
        "Retrieval-Augmented Generation and Grounded Reasoning",
        "Treat RAG as a retrieval and evaluation problem first, not a prompt template problem.",
        [
          lesson(
            "llm-lesson-1",
            "RAG Architecture, Indexing, and Context Quality",
            "100 min",
            "Learn the true bottlenecks of RAG: chunking, indexing, recall, re-ranking, context packing, and grounding verification.",
            [
              "Compare lexical, dense, and hybrid retrieval.",
              "Choose chunking and metadata strategies based on task and document structure.",
              "Measure context quality using retrieval-level and answer-level metrics.",
            ],
            [
              "Most RAG failures begin before generation starts.",
              "Chunking is a representation decision, not an implementation footnote.",
            ],
            [
              video("LangChain / LlamaIndex ecosystem talks", "Survey common RAG building blocks with a critical eye.", {
                creator: "Various",
                platform: "Talks",
              }),
              scriptVideo("Internal lecture script: Debugging a bad RAG stack", "Build a lecture around failure decomposition.", [
                "Start with a wrong answer and trace the failure to retrieval, chunking, or synthesis.",
                "Measure context relevance and citation grounding separately.",
                "Close with a checklist for shipping RAG without self-deception.",
              ]),
            ],
            [
              exercise(
                "llm-ex-1",
                "RAG failure decomposition lab",
                "debugging",
                "Build a small RAG system and analyze at least ten failure cases by assigning each to chunking, retrieval, reranking, prompt construction, or synthesis.",
                [
                  "Failure case log",
                  "Retrieval metrics",
                  "Fix prioritization memo",
                ],
                [
                  "How many failures were really generator problems?",
                  "Which change improved groundedness most per unit of latency or cost?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "llm-q1",
                  "What is the most dangerous misconception in RAG engineering?",
                  [
                    "That retrieval quality heavily influences final answer quality",
                    "That prompt wording alone can compensate for weak retrieval and context selection",
                    "That chunking matters",
                    "That latency is a constraint",
                  ],
                  1,
                  "Prompt tuning cannot reliably rescue missing or poor-quality evidence.",
                ),
                question(
                  "llm-q2",
                  "Why is hybrid retrieval often attractive?",
                  [
                    "It combines semantic and lexical strengths to improve recall across heterogeneous queries",
                    "It removes the need for reranking",
                    "It guarantees faithfulness",
                    "It makes embeddings unnecessary",
                  ],
                  0,
                  "Dense and lexical signals often fail in complementary ways.",
                ),
              ],
              "Revisit retrieval evaluation until you can explain answer failures without defaulting to 'the model hallucinated.'",
            ),
          ),
          lesson(
            "llm-lesson-2",
            "Evaluation for LLM and RAG Systems",
            "95 min",
            "Build a serious evaluation stack for systems that mix generation, retrieval, and tool use.",
            [
              "Distinguish exact-match tasks, rubric-based judging, pairwise preference, and groundedness checks.",
              "Build eval sets that reflect user intent, edge cases, and abuse cases.",
              "Use model-based graders carefully and audit them against human review.",
            ],
            [
              "If you cannot evaluate the system, you cannot improve it responsibly.",
              "LLM-as-judge can be useful but should never be treated as unquestionable truth.",
            ],
            [
              video("DeepLearning.AI / LLM eval talks", "Ground LLM evaluation practice in current industry discourse.", {
                creator: "DeepLearning.AI and guests",
                platform: "Talks",
              }),
            ],
            [
              exercise(
                "llm-ex-2",
                "Design an eval suite for a knowledge assistant",
                "systems-design",
                "Create a multi-layer evaluation plan covering retrieval, answer groundedness, factuality, latency, and user trust for an internal knowledge assistant.",
                [
                  "Eval taxonomy",
                  "Gold-set specification",
                  "Human-review escalation plan",
                ],
                [
                  "Which metrics are cheap enough for every deploy and which require periodic audits?",
                  "How will you catch prompt regressions caused by retrieval changes?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "llm-q3",
                  "Why should retrieval and answer evaluation be separated?",
                  [
                    "Because answer quality reveals retrieval quality perfectly",
                    "Because you need to know whether failure came from missing evidence or poor synthesis",
                    "Because retrieval metrics are always enough",
                    "Because generators cannot be evaluated",
                  ],
                  1,
                  "Separating stages makes failure attribution possible.",
                ),
                question(
                  "llm-q4",
                  "What is a core risk of using an LLM judge without auditing?",
                  [
                    "It will never finish",
                    "It can introduce hidden biases and brittle scoring behavior that look authoritative",
                    "It deletes the dataset",
                    "It prevents human review",
                  ],
                  1,
                  "Model-based graders are fallible components and require calibration too.",
                ),
              ],
              "Strengthen your evaluation design until each metric has a clear purpose and known failure mode.",
            ),
          ),
        ],
      ),
      module(
        "llm-mod-2",
        "Advanced",
        "Tools, Agents, and Workflow Automation",
        "Treat agents as orchestrated systems with planning, verification, and reliability constraints rather than autonomous magic.",
        [
          lesson(
            "llm-lesson-3",
            "Tool Use, Planning, and Workflow Decomposition",
            "100 min",
            "Design systems where an LLM decides when to call tools, how to plan multi-step work, and how to recover from partial failure.",
            [
              "Represent tools with schemas, permissions, and cost awareness.",
              "Choose between single-agent, router, and workflow-based orchestration.",
              "Separate useful decomposition from overengineered loops.",
            ],
            [
              "Agents are often software architecture problems wrapped in language interfaces.",
              "Unbounded autonomy is usually a reliability bug, not a feature.",
            ],
            [
              video("Anthropic / OpenAI / engineering talks on tool use", "Observe real agent patterns with a skeptical systems lens.", {
                creator: "Various",
                platform: "Talks",
              }),
            ],
            [
              exercise(
                "llm-ex-3",
                "Design a bounded agent workflow",
                "systems-design",
                "Design an agent workflow for a course-assistant task that uses search, retrieval, quiz generation, and answer verification under latency and permission constraints.",
                [
                  "Tool schema definitions",
                  "State-machine or workflow diagram",
                  "Failure and escalation plan",
                ],
                [
                  "Which tasks deserve fixed workflows instead of autonomous planning?",
                  "Where should the system force verification before side effects?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "llm-q5",
                  "What is a strong reason to prefer workflow orchestration over a free-form agent loop?",
                  [
                    "It always improves creativity",
                    "It makes cost, state transitions, and failure handling more controllable",
                    "It removes the need for tools",
                    "It guarantees truthfulness",
                  ],
                  1,
                  "Workflows trade some flexibility for reliability and observability.",
                ),
                question(
                  "llm-q6",
                  "Why should tool schemas be explicit?",
                  [
                    "Because the model can infer everything from prose",
                    "Because clear inputs, outputs, and permissions reduce ambiguity and side-effect risk",
                    "Because schemas improve GPU throughput",
                    "Because they eliminate evaluation needs",
                  ],
                  1,
                  "Structured tool contracts make the orchestration layer safer and easier to inspect.",
                ),
              ],
              "Refine the workflow until each tool call has explicit purpose, bounds, and verification.",
            ),
          ),
          lesson(
            "llm-lesson-4",
            "Agent Reliability, Cost Discipline, and Security",
            "100 min",
            "Study the production hazards of agentic systems: prompt injection, permission misuse, looping, stale memory, and runaway cost.",
            [
              "Threat-model prompt injection and tool misuse.",
              "Track token, latency, and retry budgets.",
              "Use verification, sandboxes, and human checkpoints where they matter most.",
            ],
            [
              "Agents fail like distributed systems with unreliable planners.",
              "Security and cost controls are central design constraints, not afterthoughts.",
            ],
            [
              scriptVideo("Internal lecture script: Why agents need guardrails that feel boring", "Turn reliability and security into a first-class systems topic.", [
                "Walk through a prompt-injection chain that reaches a sensitive tool.",
                "Show how permission boundaries and verification cut the attack chain.",
                "Close with a cost runaway incident and how to cap it.",
              ]),
            ],
            [
              exercise(
                "llm-ex-4",
                "Threat model an agentic assistant",
                "analysis",
                "Write a threat model for an internal agent that can browse, write docs, update data, and trigger workflows. Include abuse cases, cost failures, and approval boundaries.",
                [
                  "Threat model table",
                  "Control recommendations",
                  "Verification and approval policy",
                ],
                [
                  "Where can untrusted text become instructions?",
                  "What budget or permission boundary would stop the worst plausible failure?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "llm-q7",
                  "Why is prompt injection especially serious in tool-using systems?",
                  [
                    "Because it only affects style",
                    "Because untrusted text can manipulate tool decisions or exfiltrate data if the system lacks separation and verification",
                    "Because it makes embeddings larger",
                    "Because it only matters in chatbots",
                  ],
                  1,
                  "Tool-calling systems convert language into action, which raises the stakes dramatically.",
                ),
                question(
                  "llm-q8",
                  "What is a sane approach to agent cost management?",
                  [
                    "Unlimited retries improve quality",
                    "Use bounded retries, token budgets, and observability on failure loops",
                    "Avoid logging",
                    "Only optimize the largest model",
                  ],
                  1,
                  "Agent systems can silently burn budget without tighter controls than ordinary inference services.",
                ),
              ],
              "Rework the threat model until both security and cost failure modes have concrete controls.",
            ),
          ),
        ],
      ),
    ],
    capstone: project(
      "Course capstone: Build a verifiable course assistant",
      "Design and implement a bounded agent or workflow-based assistant that can retrieve course content, generate a quiz, explain answers, and provide verifiable citations.",
      [
        "Design the orchestration layer",
        "Build an evaluation suite for retrieval and answer quality",
        "Add safety, cost, and rollback controls",
      ],
    ),
  },
  {
    id: "course-reliable-ml-2026",
    slug: "reliable-responsible-and-frontier-ml-2026",
    title: "Reliable, Responsible, and Frontier ML Engineering (2026)",
    level: "Advanced",
    timeframe: "4-6 weeks",
    summary:
      "The final course in the path: robustness, fairness, security, multimodal systems, weak supervision, synthetic data, and the critical engineering mindset needed for frontier ML work in April 2026.",
    whyItMatters:
      "Strong ML engineers are not defined by model fluency alone. They can identify hidden assumptions, defend evaluation choices, and build systems that remain useful under pressure.",
    prerequisites: ["All earlier courses or equivalent experience"],
    outcomes: [
      "Design robust evaluation and governance loops",
      "Understand ML security and adversarial risk at a systems level",
      "Reason about multimodal and frontier-model deployment constraints",
      "Operate as a skeptical, evidence-driven ML engineer",
    ],
    tags: ["robustness", "safety", "security", "multimodal", "frontier systems"],
    modules: [
      module(
        "frontier-mod-1",
        "Advanced",
        "Robustness, Fairness, and Security",
        "Treat reliability, misuse resistance, and social impact as engineering domains with measurable practices.",
        [
          lesson(
            "frontier-lesson-1",
            "Robustness, Fairness, and Distribution Shift",
            "95 min",
            "Build a concrete engineering approach to subgroup performance, counterfactual thinking, and robustness under real deployment variability.",
            [
              "Measure subgroup performance and cohort harms.",
              "Understand robustness benchmarks and out-of-distribution evaluation.",
              "Use fairness discussions precisely, with explicit policy tradeoffs.",
            ],
            [
              "Fairness is not a single metric; it is a set of incompatible choices that must be made explicit.",
              "Robustness work matters because deployment never resembles the benchmark perfectly.",
            ],
            [
              video("Responsible AI talks from major labs and conferences", "Anchor fairness and robustness in modern engineering discourse.", {
                creator: "Various",
                platform: "Talks",
              }),
            ],
            [
              exercise(
                "frontier-ex-1",
                "Subgroup performance audit",
                "analysis",
                "Take a model and evaluate it across carefully chosen cohorts. Identify tradeoffs among performance, calibration, and operational cost of mitigation.",
                [
                  "Cohort metrics report",
                  "Mitigation proposal",
                  "Policy and tradeoff note",
                ],
                [
                  "Which performance gap is statistically meaningful and operationally serious?",
                  "What intervention improves harms without degrading the whole system irresponsibly?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "frontier-q1",
                  "Why is fairness engineering difficult?",
                  [
                    "Because all fairness metrics agree",
                    "Because fairness goals often encode competing policy choices and tradeoffs rather than one universal optimum",
                    "Because models cannot be measured",
                    "Because subgroup labels never exist",
                  ],
                  1,
                  "Fairness requires explicit normative choices in addition to technical analysis.",
                ),
                question(
                  "frontier-q2",
                  "What is a useful robustness practice?",
                  [
                    "Only report aggregate validation accuracy",
                    "Test across realistic shifts, edge cases, and cohorts that matter operationally",
                    "Avoid stress tests",
                    "Assume large models generalize automatically",
                  ],
                  1,
                  "Robustness appears in stress tests and slices, not just aggregate metrics.",
                ),
              ],
              "Revisit subgroup and shift analysis until you can distinguish technical evidence from policy choice.",
            ),
          ),
          lesson(
            "frontier-lesson-2",
            "ML Security, Adversarial Risk, and Supply Chain Integrity",
            "100 min",
            "Study prompt injection, data poisoning, model theft, unsafe model updates, and the software supply chain of modern ML stacks.",
            [
              "Threat-model data pipelines, training artifacts, and inference endpoints.",
              "Understand poisoning, model extraction, adversarial prompts, and unsafe dependencies.",
              "Build controls around data provenance, model provenance, and release integrity.",
            ],
            [
              "ML security spans classic AppSec, data governance, and model-specific attack surfaces.",
              "The training and evaluation pipeline is part of the attack surface.",
            ],
            [
              scriptVideo("Internal lecture script: ML security is not separate from software security", "Frame ML security as a continuation of systems security.", [
                "Threat-model the data pipeline, model registry, and serving endpoint.",
                "Compare classical input attacks with prompt and retrieval attacks.",
                "Close with provenance and attestation practices for models.",
              ]),
            ],
            [
              exercise(
                "frontier-ex-2",
                "Threat-model the ML supply chain",
                "systems-design",
                "Produce a threat model covering data ingestion, training artifacts, model registry, CI/CD, and inference APIs for a production ML service.",
                [
                  "Threat model",
                  "Prioritized controls",
                  "Detection and recovery plan",
                ],
                [
                  "Which compromise would stay invisible longest?",
                  "What provenance control would reduce both accidental and malicious risk?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "frontier-q3",
                  "Why should model registries and training artifacts be security concerns?",
                  [
                    "Because they are purely academic",
                    "Because compromised artifacts can poison or replace production models silently",
                    "Because models cannot be versioned",
                    "Because inference is the only attack surface",
                  ],
                  1,
                  "Model artifacts are deployable code equivalents and deserve similar integrity controls.",
                ),
                question(
                  "frontier-q4",
                  "What makes data poisoning dangerous?",
                  [
                    "It always raises accuracy",
                    "It can alter model behavior upstream in ways that are hard to detect downstream",
                    "It only matters in reinforcement learning",
                    "It is fixed by larger batch sizes",
                  ],
                  1,
                  "Training data compromise can create persistent, covert model behavior changes.",
                ),
              ],
              "Strengthen the threat model until it covers artifacts, data, endpoints, and orchestration paths together.",
            ),
          ),
        ],
      ),
      module(
        "frontier-mod-2",
        "Advanced",
        "Frontier Modalities and 2026 Engineering Practice",
        "Synthesize what a serious ML engineer should know about multimodality, synthetic data, evaluation debt, and frontier deployment choices by April 2026.",
        [
          lesson(
            "frontier-lesson-3",
            "Multimodal Systems, Synthetic Data, and Weak Supervision",
            "100 min",
            "Study the expanding role of multimodal models, synthetic data generation, and weak supervision in practical ML pipelines.",
            [
              "Understand multimodal fusion and retrieval patterns.",
              "Use synthetic data and weak labels carefully, with contamination and bias audits.",
              "Assess when synthetic pipelines accelerate progress and when they amplify nonsense.",
            ],
            [
              "Synthetic data is an amplifier: it can accelerate good supervision or compound bad assumptions.",
              "Multimodal quality often depends more on data alignment and evaluation than on brute-force model size.",
            ],
            [
              video("Open multimodal systems talks", "Survey practical multimodal engineering patterns.", {
                creator: "Various",
                platform: "Talks",
              }),
            ],
            [
              exercise(
                "frontier-ex-3",
                "Synthetic data governance memo",
                "paper-review",
                "Design a synthetic data pipeline for a constrained domain, then write a memo analyzing contamination, bias, coverage, and eval risks.",
                [
                  "Pipeline design",
                  "Governance memo",
                  "Eval gate proposal",
                ],
                [
                  "What failure would synthetic augmentation hide rather than solve?",
                  "How would you detect evaluation contamination?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "frontier-q5",
                  "What is the main risk of careless synthetic data use?",
                  [
                    "It reduces storage cost too much",
                    "It can reinforce existing blind spots and create misleadingly optimistic evaluation results",
                    "It makes labeling easier",
                    "It only affects images",
                  ],
                  1,
                  "Synthetic data can amplify biases or cause contamination if governance is weak.",
                ),
                question(
                  "frontier-q6",
                  "Why are multimodal systems especially evaluation-heavy?",
                  [
                    "Because multiple modalities introduce more ways to align poorly, fail silently, or appear impressive without grounded competence",
                    "Because they need no labels",
                    "Because images are always easy",
                    "Because text metrics are enough",
                  ],
                  0,
                  "Cross-modal alignment and task design create complex failure surfaces that require careful measurement.",
                ),
              ],
              "Strengthen synthetic-data and multimodal evaluation instincts before trusting headline gains.",
            ),
          ),
          lesson(
            "frontier-lesson-4",
            "What an ML Engineer Should Know in April 2026",
            "120 min",
            "A synthesis lesson: tie together math, modeling, retrieval, systems, evaluation, safety, and economics into a working profile of a credible 2026 ML engineer.",
            [
              "Define the skill matrix across modeling, systems, evaluation, and reliability.",
              "Understand how product, economics, and governance shape engineering choices.",
              "Build a self-audit for strengths, blind spots, and next projects.",
            ],
            [
              "The best ML engineers are bilingual in research and production.",
              "By 2026, depth means you can critique an end-to-end system, not just fine-tune a model.",
            ],
            [
              scriptVideo("Internal lecture script: The 2026 ML engineer profile", "Generate a closing lecture that synthesizes the entire program.", [
                "Define the knowledge graph of a strong ML engineer.",
                "Walk one end-to-end system from data to incident response.",
                "End with a personal roadmap for the next 12 months of deliberate practice.",
              ]),
            ],
            [
              exercise(
                "frontier-ex-4",
                "Personal engineering roadmap",
                "analysis",
                "Create a brutally honest self-assessment across this curriculum. Choose one capstone project that would best expose your weakest area and one that would showcase your strongest.",
                [
                  "Skill matrix",
                  "Evidence-backed self-assessment",
                  "12-month roadmap with projects and reading",
                ],
                [
                  "Which weakness is technical versus process versus judgment?",
                  "What project would force you to integrate the most missing skills?",
                ],
              ),
            ],
            quiz(
              [
                question(
                  "frontier-q7",
                  "What most distinguishes a strong ML engineer from a model tinkerer in 2026?",
                  [
                    "Owning the end-to-end system: data, evaluation, deployment, reliability, and tradeoffs",
                    "Knowing only the newest foundation model",
                    "Avoiding documentation",
                    "Using the biggest GPU available",
                  ],
                  0,
                  "Serious ML engineering is integrative and operational, not just model-centric.",
                ),
                question(
                  "frontier-q8",
                  "Which habit best protects against hype-driven engineering?",
                  [
                    "Assuming bigger models solve all product issues",
                    "Demanding explicit evaluation, baselines, failure analysis, and cost reasoning",
                    "Avoiding historical context",
                    "Skipping postmortems",
                  ],
                  1,
                  "Evidence and disciplined evaluation are the antidotes to hype.",
                ),
              ],
              "Use the final synthesis to build a real roadmap, not just a list of fashionable tools.",
            ),
          ),
        ],
      ),
    ],
    capstone: project(
      "Program capstone: Full-stack ML system with adversarial review",
      "Build or design a complete ML system that includes data ingestion, training, evaluation, serving, monitoring, and a security/fairness review. Present it as if to a principal engineer or thesis committee.",
      [
        "Select a high-value use case",
        "Produce the full system design and evaluation plan",
        "Run an adversarial review covering robustness, cost, and safety",
      ],
    ),
  },
];
