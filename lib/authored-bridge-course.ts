import type {
  CurriculumExercise,
  CurriculumLesson,
  CurriculumVideo,
  LessonQuiz,
  QuizQuestion,
} from "@/lib/types";
import type { HostedLessonContent } from "@/lib/hosted-lessons";

type AuthoredBridgeLessonBundle = {
  lesson: CurriculumLesson;
  hostedLesson: HostedLessonContent;
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
  url: string,
  creator: string,
  platform = "YouTube",
): CurriculumVideo {
  return { kind: "external", title, objective, url, creator, platform };
}

function scriptVideo(
  title: string,
  objective: string,
  outline: string[],
): CurriculumVideo {
  return { kind: "script", title, objective, outline };
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
        criterion: "Correctness",
        points: 4,
        description: "Solution is functionally correct and handles edge cases.",
      },
      {
        criterion: "Reasoning",
        points: 3,
        description: "Explains the why behind design choices, not just the what.",
      },
      {
        criterion: "Engineering discipline",
        points: 2,
        description: "Code is clean, typed where possible, and respects memory/performance constraints.",
      },
      {
        criterion: "Communication",
        points: 1,
        description: "Would hold up in a code review or team walkthrough.",
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
  return { id, title, duration, summary, sections, takeaways, videos, exercises, quiz: lessonQuiz };
}

export const AUTHORED_BRIDGE_LESSONS: Record<string, AuthoredBridgeLessonBundle> = {
  "bridge-lesson-1": {
    lesson: lesson(
      "bridge-lesson-1",
      "Functional Python & Lazy Loading",
      "75 min",
      "Shift from procedural list-building to memory-safe, composable data pipelines using generators, iterators, and decorators — the foundational patterns of MLE-grade infrastructure.",
      [
        "Generators and the iterator protocol: lazy evaluation vs. eager materialization",
        "Decorators as pipeline composition primitives",
        "Memory profiling: when a Python list becomes an infrastructure liability",
        "Real-world patterns: chunked file reads, streaming ETL, lazy feature transforms",
      ],
      [
        "A generator produces one item at a time; a list holds everything at once. At 100GB of data, that difference is the difference between working and crashing.",
        "Decorators are not magic — they are higher-order functions that wrap behavior without mutating the original callable.",
        "Memory safety is not a premature optimization in ML. It is a correctness constraint when datasets exceed available RAM.",
      ],
      [
        video(
          "Python Generators and Iterators — Corey Schafer",
          "Build intuition for lazy evaluation with practical generator examples.",
          "https://www.youtube.com/watch?v=bD05uGo_sVI",
          "Corey Schafer",
        ),
        scriptVideo(
          "Internal lecture: From DS&A lists to ML data pipelines",
          "Walk through the memory cost model of lists vs. generators on realistic dataset sizes.",
          [
            "Open with a concrete crash scenario: materializing 100GB Statcast data into a Python list.",
            "Refactor step-by-step to a generator pipeline. Profile memory usage at each step.",
            "Introduce decorators as a way to add logging, caching, and retry logic without polluting pipeline logic.",
            "Close with the engineering rule: materialize only when you must.",
          ],
        ),
      ],
      [
        exercise(
          "bridge-ex-1",
          "Refactor an eager ETL pipeline to a lazy generator pipeline",
          "lab",
          "You are given an eager Python script that loads a full CSV of simulated game log data into a list, filters rows, and computes aggregates. Refactor it to use generators throughout. Profile both versions with memory_profiler and document the difference.",
          [
            "Refactored pipeline script using generators and yield",
            "Memory profile comparison (before vs. after)",
            "One-paragraph write-up: at what dataset size does the eager version become untenable?",
          ],
          [
            "Where is the first point in the pipeline that data must be fully materialized?",
            "Could a decorator handle the logging and retry logic you added manually?",
            "What invariant does each generator stage need to preserve to keep the pipeline correct?",
          ],
        ),
      ],
      quiz(
        [
          question(
            "bridge-q1",
            "Why does a generator expression use less memory than an equivalent list comprehension for large inputs?",
            [
              "Generators use compiled C code internally",
              "Generators produce values one at a time instead of building the full collection in memory",
              "Generators bypass Python's garbage collector",
              "List comprehensions always copy the input twice",
            ],
            1,
            "A generator suspends execution after each yield and only computes the next value when asked, so it never holds more than one item at a time.",
          ),
          question(
            "bridge-q2",
            "What is the primary engineering reason to use a decorator on a data-loading function in an ML pipeline?",
            [
              "To make the function run faster by default",
              "To separate cross-cutting concerns (retry, caching, logging) from the core loading logic",
              "To convert the function into a generator automatically",
              "To enforce type annotations at runtime",
            ],
            1,
            "Decorators let you layer operational concerns around a function without entangling them with the domain logic. A loader should load; retry behavior belongs in a wrapper.",
          ),
        ],
        "Rebuild the pipeline exercise until the memory profile is flat regardless of input size.",
      ),
    ),
    hostedLesson: {
      hook:
        "Every DS&A problem you solved assumed the data fit in memory. In production ML, that assumption is almost never true. This lesson teaches you to think in streams instead of arrays — which is the first real shift from competitive programming to production engineering.",
      teachingPromise:
        "By the end of this lesson you will be able to build generator-based data pipelines that stay flat in memory regardless of input size, and use decorators to add operational behavior without polluting your pipeline logic.",
      learningObjectives: [
        "Explain the difference between eager and lazy evaluation in terms of memory allocation timing.",
        "Build a multi-stage generator pipeline that processes data row-by-row from source to output.",
        "Write a decorator that adds retry or caching behavior to any callable.",
        "Profile memory consumption of eager vs. lazy pipelines and state the break-even dataset size.",
      ],
      lectureSegments: [
        {
          title: "Generators and the iterator protocol",
          explanation: [
            "Python's iterator protocol is a contract: any object with __iter__ and __next__ can participate in a for-loop, a list comprehension, or a pipeline. Generators implement this contract automatically via yield.",
            "The key insight is timing. A list comprehension evaluates every element immediately and stores results in a contiguous block. A generator expression evaluates nothing until you ask for the next value. For 100 rows that difference is invisible. For 100 million rows it is the difference between a working pipeline and an OOM crash.",
            "Chaining generators creates a lazy pipeline. When the consumer asks for the next value, the request propagates up the chain: each stage pulls one item from the previous stage, transforms it, and passes it forward. No intermediate collection is created.",
          ],
          appliedLens:
            "In an ML feature pipeline, most transformations — normalization, encoding, windowing — can be expressed as generator stages. Materialization should happen at the last possible moment: when writing to a feature store or batching for a training loop.",
        },
        {
          title: "Decorators as pipeline composition primitives",
          explanation: [
            "A decorator is a function that takes a function and returns a new function. That is the whole model. The @syntax is syntactic sugar for wrapping the original callable at definition time.",
            "In ML infrastructure, decorators are the right tool for cross-cutting concerns: retry on transient failures, caching expensive lookups, logging input/output shapes, enforcing timeouts. These behaviors belong on the boundary between your pipeline stage and the rest of the world, not inside it.",
            "The cost of not using decorators is that retry logic, logging, and error handling get copy-pasted into every stage. A single decorator applied at the framework level handles every stage uniformly.",
          ],
          appliedLens:
            "Think of decorators as the ML equivalent of middleware. Just as a web framework applies auth and logging to every endpoint without each handler implementing it, a decorator applies operational behavior to every pipeline stage without each stage implementing it.",
        },
      ],
      managerBriefing: {
        businessContext:
          "Memory blowouts are one of the most common causes of unplanned infrastructure cost spikes. A single engineer who defaults to eager list-based processing on a growing dataset can silently double the memory footprint of a service, triggering autoscale events and larger instance tiers. Generator-based pipelines prevent this class of problem at the architecture level.",
        riskIfSkipped:
          "Teams that do not internalize lazy evaluation patterns tend to write pipelines that work fine in development (small datasets) and fail in production (full datasets). The failure mode is often non-obvious: the service does not crash immediately, it just consumes more and more memory until it is killed.",
        kpiImpact:
          "Memory-efficient pipelines reduce compute costs directly (smaller instances) and indirectly (fewer OOM restarts, more predictable latency). This is one of the highest-leverage engineering habits in terms of cost per engineer.",
      },
    },
  },

  "bridge-lesson-2": {
    lesson: lesson(
      "bridge-lesson-2",
      "Robust Data Contracts with Pydantic & Type Hints",
      "70 min",
      "Use Python's type system and Pydantic's runtime validation to build ML data pipelines that reject bad data at the boundary instead of propagating corrupt state into training runs.",
      [
        "Python type hints: what the interpreter sees vs. what type checkers enforce",
        "Pydantic models as schema validators for ML inputs and outputs",
        "Failure modes: how a single mistyped field can corrupt a training batch",
        "Field-level validators, coercion rules, and strict mode",
        "Designing contracts for feature vectors, API payloads, and Firestore documents",
      ],
      [
        "Type hints are documentation; Pydantic is enforcement. Both are necessary.",
        "Validate at the boundary — the moment data enters your system from an external source. Never trust a field you did not check.",
        "A schema failure that is caught at ingest time costs milliseconds to fix. The same failure caught after a 10-hour training run costs days.",
      ],
      [
        video(
          "Pydantic v2 Tutorial — ArjanCodes",
          "Ground the Pydantic model API with practical examples before moving to ML-specific patterns.",
          "https://www.youtube.com/watch?v=yj-nSbbDamA",
          "ArjanCodes",
        ),
        scriptVideo(
          "Internal lecture: Data contracts as your first line of defense in ML systems",
          "Walk through a real ML input corruption scenario and show how Pydantic stops it at the boundary.",
          [
            "Show a Firestore document with a field type mismatch. Trace the bug through feature engineering into a NaN loss value.",
            "Introduce a Pydantic model for the same document. Show the ValidationError that fires immediately.",
            "Add field validators for domain-specific constraints: non-negative pitch velocity, valid date ranges, enum membership.",
            "Close with the engineering contract: every external data source gets a schema. No exceptions.",
          ],
        ),
      ],
      [
        exercise(
          "bridge-ex-2",
          "Design and harden a Pydantic schema for an ML training record",
          "analysis",
          "You are given a JSON dataset of simulated baseball pitch records that intentionally contains type mismatches, out-of-range values, and missing fields. Build a Pydantic model that validates the schema, add custom field validators for domain invariants, and write a report documenting every failure mode you caught.",
          [
            "Pydantic model definition with type annotations and field validators",
            "Validation harness that processes all records and collects errors",
            "Failure report: count and description of each error category found",
            "Recommendation: which errors should hard-fail vs. be coerced vs. be dropped?",
          ],
          [
            "What is the difference between a missing field and a None field in your schema?",
            "Which fields need domain-specific validators beyond what the type system provides?",
            "How would you extend this schema to version it as the upstream source evolves?",
          ],
        ),
      ],
      quiz(
        [
          question(
            "bridge-q3",
            "What is the primary advantage of validating ML inputs with Pydantic at ingest time rather than relying on downstream type errors?",
            [
              "Pydantic runs faster than Python's built-in type system",
              "Validation errors surface immediately with clear field-level context instead of as silent corruption deep in the pipeline",
              "Pydantic automatically fixes type mismatches using coercion",
              "Type annotations alone are sufficient for runtime safety",
            ],
            1,
            "Catching schema violations at the boundary gives you a precise error location and message. Silent type coercion or NaN propagation downstream makes the same bug nearly impossible to trace.",
          ),
          question(
            "bridge-q4",
            "When designing a Pydantic model for a feature vector, which approach is most defensible?",
            [
              "Use Optional[float] for all fields to maximize flexibility",
              "Use strict types and explicit validators; allow Optional only where absence is semantically meaningful",
              "Skip validation for fields that are already typed in the upstream source",
              "Use dict[str, Any] to avoid schema maintenance overhead",
            ],
            1,
            "Optional should mean 'this field may legitimately be absent'. Using it universally as a type escape hatch defeats the purpose of a schema contract.",
          ),
        ],
        "Revise your schema until every record in the dataset either passes cleanly or fails with a precise, actionable error message.",
      ),
    ),
    hostedLesson: {
      hook:
        "In DS&A you dealt with inputs that were always the right type because the problem statement guaranteed it. In production ML, the database gives you whatever it has. This lesson is about building the wall between 'whatever it has' and 'what your model expects'.",
      teachingPromise:
        "After this lesson you will be able to define a Pydantic schema for any ML input source, add domain-specific validators, and build a validation harness that collects all errors in a single pass instead of failing on the first bad record.",
      learningObjectives: [
        "Explain what Python type hints enforce at runtime vs. at static analysis time.",
        "Define a Pydantic BaseModel with typed fields, defaults, and field validators.",
        "Build a validation harness that processes a batch of records and returns a structured error report.",
        "Decide which validation failures should hard-fail, coerce, or be dropped based on downstream impact.",
      ],
      lectureSegments: [
        {
          title: "Python type hints: annotation vs. enforcement",
          explanation: [
            "Python type hints are not runtime constraints. Annotating a function parameter as float does not prevent a caller from passing a string. The annotation is a contract that type checkers like mypy and pyright can verify statically, but Python itself ignores it at runtime.",
            "This gap is exactly where production bugs hide. A developer adds a type hint in good faith. A data source sends a string where a float was expected. Python happily proceeds. The string gets passed into a NumPy operation and the pipeline silently produces NaN.",
            "Pydantic closes this gap by re-running validation at runtime. When you instantiate a Pydantic model, it checks every field against its type and any declared validators. Mismatches raise a ValidationError immediately, with a structured report of every field that failed.",
          ],
          appliedLens:
            "Think of type hints as the API contract you publish to teammates and to your future self. Think of Pydantic as the bouncer who actually enforces it. You need both.",
        },
      ],
      managerBriefing: {
        businessContext:
          "Data quality failures are the leading cause of silent ML model degradation in production. A model that was trained on clean data and then receives corrupted inference inputs does not fail loudly — it just returns subtly wrong predictions. Catching this at the schema layer prevents the far more expensive path of diagnosing degraded model behavior weeks later.",
        riskIfSkipped:
          "Without schema enforcement, every new upstream data source is a potential source of silent corruption. The risk compounds as the system grows: more sources, more fields, more ways for a type mismatch to reach a training batch or an inference request.",
        kpiImpact:
          "Teams with robust schema validation at ingest typically catch data quality regressions within hours rather than days. The operational cost of a missed data contract — a bad training run, a corrupted feature store, a degraded model in production — almost always exceeds the cost of writing the schema in the first place.",
      },
    },
  },

  "bridge-lesson-3": {
    lesson: lesson(
      "bridge-lesson-3",
      "NumPy and the Death of the Loop",
      "85 min",
      "Internalize vectorization as the primary performance primitive in numerical ML code, replacing Python loops with NumPy operations that delegate to optimized C and BLAS backends.",
      [
        "Vectorization: replacing element-wise loops with array operations",
        "Broadcasting: how NumPy applies operations across mismatched shapes",
        "Universal functions (ufuncs) and their role in numeric pipelines",
        "When vectorization fails: object arrays, ragged inputs, and the fallback to loops",
        "Profiling: measuring the actual speedup in your specific workload",
      ],
      [
        "A vectorized NumPy operation runs in C. A Python loop runs in Python. The performance gap is typically 50–200x — not a micro-optimization, a system design constraint.",
        "Broadcasting is not magic; it is a set of shape-alignment rules. Master the rules and you will never need to write an explicit outer product loop again.",
        "Profile before you claim a speedup. NumPy has overhead for small arrays where a Python loop is actually faster.",
      ],
      [
        video(
          "NumPy Vectorization and Broadcasting — Jake VanderPlas",
          "Ground vectorization and broadcasting with canonical examples from the Python Data Science Handbook.",
          "https://jakevdp.github.io/PythonDataScienceHandbook/02.05-computation-on-arrays-broadcasting.html",
          "Jake VanderPlas",
          "Python Data Science Handbook",
        ),
        scriptVideo(
          "Internal lecture: Loop-to-vector refactoring workshop",
          "Walk through six progressively harder loop-to-vector rewrites on ML-relevant computations.",
          [
            "Baseline: time a naive Python loop computing row-wise L2 norms on a 1M x 128 matrix.",
            "Rewrite with np.linalg.norm. Show the 100x speedup in a live profile.",
            "Introduce broadcasting with a batch normalization example: subtract the column mean, divide by std, no loops.",
            "Show a broadcasting mistake (shape mismatch) and how to read the error.",
            "Close with the rule: if you are writing a for-loop over a NumPy array, ask whether a ufunc or broadcast expression can replace it.",
          ],
        ),
      ],
      [
        exercise(
          "bridge-ex-3",
          "Vectorize a feature engineering pipeline end-to-end",
          "lab",
          "You are given a Python script that computes five ML features from a simulated pitch dataset using explicit for-loops: L2 norm of velocity components, z-score normalization, pairwise cosine similarity for a small candidate set, a rolling 5-pitch mean, and a one-hot encoding. Rewrite each using NumPy operations, profile both versions with timeit, and document the speedup for each feature.",
          [
            "Vectorized implementation of all five features",
            "timeit benchmark table: loop vs. vectorized, dataset sizes 1k / 10k / 100k",
            "Written explanation of the broadcasting rule used in each computation",
            "At least one case where the loop version is defensible (small input or clarity)",
          ],
          [
            "For the cosine similarity computation, what shape do your input matrices need to be and why?",
            "When does broadcasting require you to insert a new axis with np.newaxis or reshape?",
            "What is the NumPy equivalent of the rolling mean and why is it faster than a loop?",
          ],
        ),
      ],
      quiz(
        [
          question(
            "bridge-q5",
            "Why is a NumPy vectorized operation typically 50–200x faster than an equivalent Python for-loop?",
            [
              "NumPy skips Python's garbage collector",
              "NumPy operations are compiled C or Fortran code operating on contiguous memory, bypassing Python interpreter overhead per element",
              "NumPy automatically distributes work across CPU cores",
              "NumPy stores arrays in GPU memory by default",
            ],
            1,
            "The speed advantage comes from delegating element-wise work to pre-compiled C/BLAS routines that operate on contiguous memory without per-element Python overhead.",
          ),
          question(
            "bridge-q6",
            "A (3, 1) array and a (1, 4) array are added with NumPy broadcasting. What shape is the result?",
            [
              "(3, 1)",
              "(1, 4)",
              "(3, 4)",
              "A shape mismatch error is raised",
            ],
            2,
            "Broadcasting stretches the size-1 dimensions of each array to match the other: (3,1) → (3,4) and (1,4) → (3,4), yielding a (3,4) result.",
          ),
        ],
        "Re-run the benchmark until you can explain the speedup by pointing to the specific C operation that replaced the Python loop.",
      ),
    ),
    hostedLesson: {
      hook:
        "The gap between a DS&A solution and an ML implementation is not just structural — it is computational. Your O(n) loop analysis is correct. Your Python loop running that O(n) operation is 100x slower than the NumPy equivalent. This lesson is where you stop thinking in iterations and start thinking in shapes.",
      teachingPromise:
        "After this lesson you will be able to identify every Python loop in a numerical pipeline that can be replaced by a vectorized operation, write the replacement using broadcasting and ufuncs, and measure the speedup.",
      learningObjectives: [
        "Replace element-wise Python loops with equivalent NumPy ufunc calls.",
        "Apply broadcasting rules to compute batch operations without writing outer loops.",
        "Profile loop vs. vectorized implementations and attribute the speedup to the underlying mechanism.",
        "Identify cases where vectorization is not appropriate (object arrays, ragged input, tiny datasets).",
      ],
      lectureSegments: [
        {
          title: "Vectorization: why the loop has to die",
          explanation: [
            "Python loops are slow for numerical work for a precise reason: each iteration has to go through the Python interpreter, check the type of every operand, allocate a new Python object for the result, and increment a reference count. For a 1 million element array, that overhead runs 1 million times.",
            "NumPy sidesteps this by storing arrays in contiguous C-typed memory and delegating operations to pre-compiled C and BLAS routines. The Python interpreter is only invoked once per operation, not once per element. The per-element work happens in C at memory bandwidth speed.",
            "This is not a minor convenience. A feature pipeline that computes 10 features over a 100k-row dataset will run in under a second with NumPy and several minutes with Python loops. That is the difference between interactive iteration and a blocking batch job.",
          ],
          appliedLens:
            "If you are reviewing ML code and you see a for-loop iterating over rows of a DataFrame or NumPy array to compute a numeric feature, that is almost always a vectorization bug waiting to be fixed.",
        },
      ],
      managerBriefing: {
        businessContext:
          "Vectorization is the most direct path from slow feature pipelines to real-time AI products. A feature that takes 5 minutes to compute in a Python loop takes 3 seconds vectorized. That is the difference between a batch feature and a live inference feature. Speed is not just a developer experience issue — it is a product capability issue.",
        riskIfSkipped:
          "Teams that do not internalize vectorization end up with feature pipelines that can never be brought online. The pipeline works fine for offline batch jobs but is too slow to serve inference requests. Refactoring a mature pipeline from loops to vectors is expensive and disruptive.",
        kpiImpact:
          "Vectorized feature pipelines reduce compute cost (fewer CPU-hours per batch run) and expand what is possible (features that were only viable offline become viable online). The engineering investment in this skill compounds across every ML product the team builds.",
      },
    },
  },

  "bridge-lesson-4": {
    lesson: lesson(
      "bridge-lesson-4",
      "Memory Layout & Tensor Geometry",
      "80 min",
      "Build the mental model for how arrays live in memory — row-major vs. column-major layout, contiguity, strides, and the performance implications of reshape vs. transpose — so you can reason about GPU kernel performance and avoid silent copy overhead.",
      [
        "Row-major (C-order) and column-major (Fortran-order) memory layout",
        "Strides: how NumPy navigates an array without copying",
        "Contiguous vs. non-contiguous arrays and when NumPy forces a copy",
        "Reshape vs. transpose: which modifies the data and which modifies the view",
        "CPU cache lines, spatial locality, and why matrix multiply prefers column access",
        "Practical implications for PyTorch tensor layout in model training",
      ],
      [
        "A transposed NumPy array shares memory with the original. A reshaped array may share memory if contiguous, but may force a copy if not.",
        "CPU and GPU performance is dominated by memory access patterns. Code that accesses memory sequentially uses hardware prefetchers effectively; code that jumps around does not.",
        "Every time you call .contiguous() in PyTorch, you are paying a copy cost that could have been avoided by thinking about layout earlier.",
      ],
      [
        video(
          "NumPy Internals: Memory Layout and Strides — Sebastian Raschka",
          "Visualize stride mechanics and understand the copy conditions with clear diagrams.",
          "https://sebastianraschka.com/blog/2020/numpy-intro.html",
          "Sebastian Raschka",
          "sebastianraschka.com",
        ),
        scriptVideo(
          "Internal lecture: How tensors live in memory",
          "Trace a matrix transpose through its stride representation and show where accidental copies happen in real model code.",
          [
            "Draw a 3×4 matrix in row-major memory. Show how strides index each element without movement.",
            "Transpose it. Show that the data did not move — only the strides changed.",
            "Demonstrate a non-contiguous array being passed to a function that requires contiguous input. Show the forced copy.",
            "Connect to PyTorch: show a NCHW vs. NHWC layout difference and its kernel performance impact.",
            "Close with the rule: reshape on contiguous arrays is free; reshape on non-contiguous arrays is not.",
          ],
        ),
      ],
      [
        exercise(
          "bridge-ex-4",
          "Audit a model preprocessing pipeline for accidental copies",
          "analysis",
          "You are given a preprocessing pipeline for image batches that performs several reshape, transpose, and slice operations before feeding tensors to a model. Use np.shares_memory, the .flags attribute, and torch.Tensor.is_contiguous to audit every operation. Identify which steps produce copies, which produce views, and propose a reordering that eliminates the unnecessary copies.",
          [
            "Annotated pipeline with copy/view label on each operation",
            "Total count of accidental copies and estimated memory overhead per batch",
            "Reordered pipeline that achieves the same result with fewer copies",
            "Explanation of why the reordering works in terms of contiguity rules",
          ],
          [
            "Which operation forces a copy because the input is non-contiguous?",
            "When a transpose is followed immediately by a reshape, can NumPy avoid a copy? Under what condition?",
            "How would you design the pipeline from scratch to stay contiguous throughout?",
          ],
        ),
      ],
      quiz(
        [
          question(
            "bridge-q7",
            "When you call np.transpose(A), what happens to the underlying data?",
            [
              "The data is copied into a new row-major array",
              "The data is unchanged; only the strides are swapped to reflect the transposed access pattern",
              "The data is moved into column-major order",
              "A new view is created with the same strides as the original",
            ],
            1,
            "NumPy transpose returns a view with swapped strides. No data is copied unless you explicitly call np.ascontiguousarray or an operation that requires contiguity.",
          ),
          question(
            "bridge-q8",
            "Why does iterating over the rows of a C-order (row-major) matrix have better cache performance than iterating over the columns?",
            [
              "Rows are stored in contiguous memory, so sequential row access hits the CPU prefetcher; column access jumps by a full row stride",
              "C-order matrices are always stored in L1 cache",
              "NumPy automatically reorders columns for cache efficiency",
              "The difference only matters for matrices larger than 1GB",
            ],
            0,
            "In row-major order, all elements of a row are contiguous. Accessing them sequentially allows the CPU hardware prefetcher to load the next cache line before it is needed. Column access jumps by the row width, defeating the prefetcher.",
          ),
        ],
        "Re-run the pipeline audit until you can explain the copy/view decision for every operation by citing the contiguity rule that governs it.",
      ),
    ),
    hostedLesson: {
      hook:
        "You know that a transposed matrix has different dimensions than the original. Do you know whether transposing it copies any data? The answer determines whether your preprocessing pipeline has a hidden 2x memory overhead. This lesson is about what arrays actually are — not shapes, but memory.",
      teachingPromise:
        "After this lesson you will be able to predict whether any NumPy or PyTorch operation produces a view or a copy, trace strides through a sequence of operations, and redesign a pipeline to avoid accidental copy overhead.",
      learningObjectives: [
        "Explain row-major and column-major layout in terms of physical memory address sequences.",
        "Read a NumPy array's strides and predict how it navigates to each element.",
        "Determine whether a given sequence of reshape/transpose/slice operations produces a view or forces a copy.",
        "Identify and eliminate accidental copies in a preprocessing pipeline.",
      ],
      lectureSegments: [
        {
          title: "Strides: the real representation of an array",
          explanation: [
            "A NumPy array is not really a shape. It is a pointer to a block of memory plus a tuple of strides. The shape tells you how many elements are in each dimension. The strides tell you how many bytes to advance in memory to get to the next element in each dimension.",
            "For a 3×4 float64 array in row-major order, the strides are (32, 8): advance 32 bytes to move to the next row, 8 bytes to move to the next column. The data sits in 96 bytes of contiguous memory in row-major order.",
            "Transpose swaps the strides: (8, 32). The data is identical. You are just traversing the same memory in a different order. No copy needed. But now if you try to reshape the transposed array, NumPy cannot rearrange the strides to represent the new shape from the existing non-contiguous layout — it must copy.",
          ],
          appliedLens:
            "Every time you profile a model training step and see unexpected memory spikes, look for accidental copies first. A single misplaced transpose before a reshape can double your working memory on every batch.",
        },
      ],
      managerBriefing: {
        businessContext:
          "GPU memory is the most expensive and constrained resource in model training. Wasting it on accidental tensor copies from suboptimal memory layout directly increases the minimum GPU tier required for a training job. This translates to real cost: an A100 80GB vs. an A100 40GB can be a 2x difference in hourly compute cost.",
        riskIfSkipped:
          "Teams that do not understand tensor memory layout tend to debug GPU OOM errors by increasing batch size limits or upgrading hardware, when the real fix is eliminating accidental copies in preprocessing. This is a systematic over-spend on infrastructure.",
        kpiImpact:
          "Optimizing memory layout in a preprocessing pipeline can reduce GPU memory usage by 20–40% on vision model training tasks, directly enabling larger batch sizes, faster training, or lower-cost hardware.",
      },
    },
  },

  "bridge-lesson-5": {
    lesson: lesson(
      "bridge-lesson-5",
      "Pandas for Relational Data at Scale",
      "80 min",
      "Move from thinking in individual records to thinking in vectorized relational operations — joins, groupby aggregations, and window functions — the transformations that convert raw logs into ML features.",
      [
        "Vectorized aggregations: groupby, transform, and agg compared",
        "Joins and merges: performance characteristics and common pitfalls",
        "Window functions: rolling, expanding, and shift for time-series features",
        "Index-aware operations: why a well-set index makes joins and lookups faster",
        "Memory and dtype optimization: reducing DataFrame size before you scale out",
      ],
      [
        "GroupBy + agg is the ML engineer's primary tool for turning event logs into features. Understand it at the operation level, not just the syntax level.",
        "A poorly written pandas join can silently produce a Cartesian product and multiply your DataFrame size by 1000x. Always check the shape after a merge.",
        "Window functions are the correct abstraction for time-series features. A rolling mean in pandas is not a loop — it is a vectorized sliding kernel.",
      ],
      [
        video(
          "Pandas GroupBy Explained — Corey Schafer",
          "Build a solid mental model of split-apply-combine before moving to ML-specific aggregation patterns.",
          "https://www.youtube.com/watch?v=Wb2Tp35dZ-I",
          "Corey Schafer",
        ),
        scriptVideo(
          "Internal lecture: From game logs to ML signals",
          "Walk through a complete feature engineering pipeline that turns raw pitch-by-pitch data into per-pitcher rolling features.",
          [
            "Start with a raw event log: one row per pitch, pitcher_id, velocity, spin_rate, outcome.",
            "Compute per-pitcher career averages with groupby + agg. Check the shape.",
            "Add rolling 5-game ERA using groupby + rolling. Trace the window logic step by step.",
            "Join the rolling features back to the pitch-level log using a merge. Verify no row explosion.",
            "Close with the engineering question: what is the time-to-insight cost of computing each feature?",
          ],
        ),
      ],
      [
        exercise(
          "bridge-ex-5",
          "Build a pitcher feature store from raw pitch logs",
          "lab",
          "You are given a CSV of simulated pitch-level data for 50 pitchers over 162 games. Build a feature engineering pipeline that produces: (1) career-level stats per pitcher via groupby aggregation, (2) 5-game rolling stats via groupby + rolling, (3) a merged feature DataFrame at the pitch level with both career and rolling context. The pipeline must produce correct shapes at every step and handle pitchers who appear in fewer than 5 games.",
          [
            "Feature engineering pipeline script",
            "Shape and dtypes check at each step with assertions",
            "Five-row sample of the final merged DataFrame",
            "Short write-up: which features are time-leaky if you forget to shift the rolling window by one game?",
          ],
          [
            "What happens to the rolling window when a pitcher has fewer games than the window size? How should you handle it?",
            "When you join rolling features back to the pitch log, how do you verify you did not produce a Cartesian product?",
            "Which dtypes in the raw CSV are wasting memory and how would you downcast them?",
          ],
        ),
      ],
      quiz(
        [
          question(
            "bridge-q9",
            "You compute a rolling 5-game ERA per pitcher to use as a training feature. What data leakage risk must you address?",
            [
              "Rolling windows always include the current game in the window, leaking future information into past features",
              "Rolling functions in pandas are not vectorized and introduce randomness",
              "A rolling window computed on the full dataset includes data from the current row, requiring a shift to use as a predictor without leaking the target",
              "Pitcher ID grouping causes data to be shuffled randomly",
            ],
            2,
            "A rolling window that includes the current game uses information from the game being predicted to compute the feature. Shifting the window by one game ensures the feature only reflects history the model could legitimately have at prediction time.",
          ),
          question(
            "bridge-q10",
            "What is the risk of a many-to-many merge in pandas if you do not check shapes?",
            [
              "The merge fails silently and returns an empty DataFrame",
              "The merge produces a Cartesian product between matching rows, silently multiplying the DataFrame size",
              "Pandas automatically deduplicates the result",
              "The merge is rejected unless both DataFrames have unique indices",
            ],
            1,
            "A many-to-many merge matches every row on the left with every row on the right that shares the key. If both sides have 100 rows per key, the result has 10,000 rows per key. Pandas does not warn you. Always check the shape after a merge.",
          ),
        ],
        "Re-run the feature pipeline until every shape assertion passes and the leakage write-up correctly identifies all time-leaky features.",
      ),
    ),
    hostedLesson: {
      hook:
        "You can sort a list and binary search it. Now sort a billion rows of event logs and extract the 5-game rolling ERA for every pitcher at every point in the season without looking at the future. That is what this lesson teaches — and it is what every ML feature pipeline in sports analytics actually needs to do.",
      teachingPromise:
        "After this lesson you will be able to build a complete pandas feature engineering pipeline from raw event logs to a merged, time-correct feature store, handling groupby aggregations, rolling windows, and join shape validation.",
      learningObjectives: [
        "Build vectorized groupby aggregations using agg and transform.",
        "Compute time-aware rolling features with groupby + rolling, correctly shifted to avoid leakage.",
        "Merge DataFrames and validate that no Cartesian product explosion occurred.",
        "Optimize DataFrame memory footprint by downcasting dtypes before scaling.",
      ],
      lectureSegments: [],
      managerBriefing: {
        businessContext:
          "The speed at which an ML team can turn a raw database into a trained model is a direct competitive advantage. Teams that write manual for-loops over DataFrames spend days on feature engineering that vectorized pandas teams finish in hours. 'Time to feature' is one of the most actionable metrics in ML product development.",
        riskIfSkipped:
          "Engineers who do not understand pandas window functions and join semantics tend to write feature pipelines that are either too slow to run interactively, or silently incorrect due to leakage or shape errors. Both outcomes delay model deployment.",
        kpiImpact:
          "Efficient pandas pipelines reduce the time from 'raw data available' to 'features ready for training' from days to hours. This compounds across every model iteration, which in a fast-moving product context can mean the difference between shipping weekly and shipping monthly.",
      },
    },
  },

  "bridge-lesson-6": {
    lesson: lesson(
      "bridge-lesson-6",
      "SQL & BigQuery for ML Engineers",
      "75 min",
      "Move computation to the data. Learn to express ML-relevant transformations — aggregations, window functions, feature joins — as SQL queries that BigQuery executes over terabytes without moving data into Python memory.",
      [
        "When to use SQL instead of pandas: the data gravity principle",
        "Window functions in SQL: ROW_NUMBER, RANK, LAG, LEAD, and rolling aggregates",
        "Query optimization: partitioning, clustering, and avoiding full table scans",
        "Approximate aggregations for large-scale feature engineering",
        "Exporting query results to GCS for training pipelines",
        "Cost governance: estimating and controlling BigQuery slot usage",
      ],
      [
        "If the data lives in a database and you only need a fraction of it, do the filtering and aggregation in SQL. Do not pay to move terabytes to Python to then filter them.",
        "SQL window functions are the database equivalent of pandas rolling + groupby. Anything you can express as a sliding aggregate over ordered rows belongs in SQL.",
        "Every BigQuery query scans bytes and costs money. Partition pruning and column selection are not premature optimizations — they are cost governance.",
      ],
      [
        video(
          "BigQuery for Data Engineers — Google Cloud Tech",
          "Understand BigQuery's distributed execution model and cost model before writing queries for ML pipelines.",
          "https://www.youtube.com/watch?v=d3MDxC13wow",
          "Google Cloud Tech",
        ),
        scriptVideo(
          "Internal lecture: Moving the feature engineering to the data",
          "Walk through a complete rewrite of the pandas feature pipeline from Lesson 5 as BigQuery SQL.",
          [
            "Start with the same pitcher feature store problem. Estimate the pandas memory cost at 1TB of logs.",
            "Rewrite career aggregations as a BigQuery GROUP BY query. Show the execution plan.",
            "Rewrite the rolling 5-game window using SQL OVER clause with ROWS BETWEEN. Note the leakage shift.",
            "Show partition pruning on a date-partitioned table: the cost difference between a full scan and a filtered scan.",
            "Close with the engineering principle: SQL is not slow; poorly written SQL is slow. Well-written SQL is often faster than any Python alternative at the data scale that matters.",
          ],
        ),
      ],
      [
        exercise(
          "bridge-ex-6",
          "Translate a pandas feature pipeline to BigQuery SQL",
          "analysis",
          "You are given the pandas feature pipeline you built in Lesson 5 (career stats + rolling window + merge). Rewrite it as a single BigQuery SQL query using CTEs, GROUP BY, and OVER window functions. Estimate the cost of the query on a 1TB simulated logs table. Identify two query optimizations (partitioning or clustering strategies) that would reduce cost by at least 80%.",
          [
            "BigQuery SQL query using CTEs for career stats and rolling window",
            "Cost estimate for a 1TB table (full scan vs. partition-pruned scan)",
            "Two optimization strategies with rationale",
            "Comparison table: pandas pipeline vs. SQL pipeline by memory used, runtime, and cost",
          ],
          [
            "How would you express the leakage-safe rolling window (shift by one game) in SQL OVER syntax?",
            "What partitioning scheme would make per-pitcher queries cheapest?",
            "When would you choose to export query results to GCS vs. reading them directly into a Python training script?",
          ],
        ),
      ],
      quiz(
        [
          question(
            "bridge-q11",
            "What is the 'data gravity' principle and how does it apply to ML feature engineering?",
            [
              "Large datasets should always be replicated to multiple regions for speed",
              "Compute should move to the data rather than moving large data to compute — especially when you only need a summary or subset",
              "SQL is faster than Python for all operations regardless of data size",
              "Data gravity means BigQuery stores all data in memory for fast access",
            ],
            1,
            "Data gravity means that once data reaches a certain scale, it is cheaper and faster to run transformations where the data lives (the database) than to move the data to where your code lives (Python). This is the core argument for SQL-first feature engineering.",
          ),
          question(
            "bridge-q12",
            "How does BigQuery's column-oriented storage affect the cost of SELECT * queries?",
            [
              "SELECT * is free because BigQuery compresses all columns equally",
              "SELECT * scans every column in the table, charging for all bytes. Selecting only needed columns reduces cost proportionally",
              "SELECT * triggers a full index rebuild",
              "Column-oriented storage makes SELECT * faster than selecting individual columns",
            ],
            1,
            "BigQuery charges by bytes scanned. Column-oriented storage means each column is stored separately. SELECT * reads every column. Selecting only the columns you need can reduce cost by 90% or more on wide tables.",
          ),
        ],
        "Rewrite the query until it correctly handles the leakage-safe window and uses partition pruning to scan less than 10% of the table.",
      ),
    ),
    hostedLesson: {
      hook:
        "Lesson 5 taught you to build feature pipelines in pandas. This lesson teaches you when not to use pandas. When the data is already in a database and you only need the aggregated result, writing Python to move a terabyte of data is the wrong answer. SQL is not a legacy tool — it is the right abstraction for data that lives at scale.",
      teachingPromise:
        "After this lesson you will be able to express ML feature engineering transformations as BigQuery SQL, estimate query cost, and apply partition pruning to reduce cost by an order of magnitude.",
      learningObjectives: [
        "Identify when a feature engineering task should be done in SQL rather than Python.",
        "Write a multi-CTE BigQuery query with GROUP BY aggregations and OVER window functions.",
        "Apply partition pruning and column selection to reduce query cost.",
        "Export query results to GCS for use in a downstream training pipeline.",
      ],
      lectureSegments: [],
      managerBriefing: {
        businessContext:
          "Cloud SQL query costs are directly auditable in the billing console. An ML team that writes efficient BigQuery queries can run feature engineering pipelines for cents. A team that scans full tables unnecessarily can spend hundreds of dollars per pipeline run. This is one of the most directly controllable ML infrastructure costs.",
        riskIfSkipped:
          "Without SQL proficiency, ML engineers treat every data problem as a Python problem. At scale, this means downloading terabytes of raw data to transform it, paying for both the egress and the compute. The cost multiplies with every new model iteration.",
        kpiImpact:
          "Teams with strong SQL skills typically reduce feature engineering compute costs by 70–90% compared to pandas-on-raw-exports. At even moderate scale (10+ model iterations per week), this is tens of thousands of dollars per year.",
      },
    },
  },

  "bridge-lesson-7": {
    lesson: lesson(
      "bridge-lesson-7",
      "Determinism vs. Stochasticity",
      "70 min",
      "Build the habit of managing randomness explicitly — seeds, reproducible pipelines, and the discipline of separating experiments that must be repeatable from those that are intentionally stochastic.",
      [
        "Sources of randomness in ML pipelines: data splits, initialization, dropout, data augmentation",
        "Seeding strategies: Python random, NumPy, PyTorch, and the global vs. local seed debate",
        "Reproducibility contracts: what it means for an experiment to be reproducible",
        "Non-determinism from hardware: CUDA non-determinism and when it matters",
        "Experiment tracking: why seeds are a first-class metadata field",
      ],
      [
        "An experiment that cannot be reproduced is an anecdote, not evidence. Seed discipline is the minimum viable scientific practice for ML.",
        "Seeding globally is not enough. Parallel data loaders, dropout layers, and augmentation pipelines each have their own random state that can break reproducibility if not managed independently.",
        "Some non-determinism is acceptable. Understand when you need bit-exact reproducibility vs. statistical reproducibility vs. directional reproducibility.",
      ],
      [
        video(
          "Reproducibility in Deep Learning — Full Stack Deep Learning",
          "Survey the sources of non-determinism in modern ML and the engineering patterns that control them.",
          "https://fullstackdeeplearning.com/course/2022/lecture-6-continual-learning/",
          "Full Stack Deep Learning",
          "fullstackdeeplearning.com",
        ),
        scriptVideo(
          "Internal lecture: The reproducibility contract",
          "Walk through a debugging session where a model 'regressed' between runs due to an unseeded augmentation pipeline.",
          [
            "Show two training runs with identical hyperparameters but different final metrics. Ask: is this a bug?",
            "Trace the source of variance: an unseeded random crop in the data augmentation pipeline.",
            "Fix the seed chain: Python random, NumPy, PyTorch, and the data loader worker init fn.",
            "Rerun both experiments. Show bit-exact reproducibility.",
            "Discuss when to use fixed seeds (experiments comparing configs) vs. random seeds (robustness sweeps).",
          ],
        ),
      ],
      [
        exercise(
          "bridge-ex-7",
          "Audit and fix a non-reproducible training pipeline",
          "lab",
          "You are given a PyTorch training script that produces different validation loss curves on every run despite no intentional randomness. Use a bisection approach to identify all sources of non-determinism. Fix each source. Document the fix. Then demonstrate that two consecutive runs produce identical loss curves.",
          [
            "Annotated list of all non-determinism sources found and how each was fixed",
            "Two identical loss curve plots from consecutive runs",
            "Written recommendation: which fixes are always justified and which incur a performance tradeoff?",
          ],
          [
            "Which CUDA operations are non-deterministic by default and what flag enables deterministic mode?",
            "How does PyTorch DataLoader's num_workers > 1 interact with reproducibility?",
            "At what point in the training loop does dropout become a reproducibility concern?",
          ],
        ),
      ],
      quiz(
        [
          question(
            "bridge-q13",
            "Setting torch.manual_seed(42) at the start of a training script guarantees reproducible results. True or false?",
            [
              "True — a global seed controls all random operations",
              "False — parallel DataLoader workers, CUDA operations, and augmentation pipelines have independent random states that also need to be seeded",
              "True, but only if the model has no dropout layers",
              "False — PyTorch seeds are deprecated in favor of numpy seeds",
            ],
            1,
            "A global seed only controls the main process random state. Worker processes initialize their own random states independently. CUDA has separate non-determinism sources. Full reproducibility requires seeding every random state in the pipeline.",
          ),
          question(
            "bridge-q14",
            "When comparing two model configurations, why is it important to use the same seed for both runs?",
            [
              "Different seeds produce different batch sizes",
              "Seed differences introduce variance in data order, initialization, and dropout masks that can mask or exaggerate the real performance difference between configurations",
              "Same seeds prevent gradient overflow",
              "Different seeds invalidate the loss function",
            ],
            1,
            "When comparing configurations, the goal is to isolate the variable being tested. Seed-induced variance (different data orders, initializations, dropout patterns) is a confounder that can make an inferior configuration look better by luck.",
          ),
        ],
        "Rerun the pipeline audit until two consecutive identical runs produce loss curves that overlap within floating-point precision.",
      ),
    ),
    hostedLesson: {
      hook:
        "You ran your model. It got 94% validation accuracy. You ran it again with the exact same hyperparameters. It got 91%. Now you do not know if the first run was good or lucky. This lesson is about never being in that position.",
      teachingPromise:
        "After this lesson you will be able to audit any ML training pipeline for sources of non-determinism, fix each source, and produce an experiment result that you can reproduce on demand.",
      learningObjectives: [
        "Enumerate the sources of randomness in a typical PyTorch training pipeline.",
        "Implement a complete seed chain that covers Python, NumPy, PyTorch, and DataLoader workers.",
        "Enable CUDA deterministic mode and explain the performance tradeoff.",
        "Distinguish experiments that require bit-exact reproducibility from those where statistical reproducibility is sufficient.",
      ],
      lectureSegments: [],
      managerBriefing: {
        businessContext:
          "Reproducibility is the foundation of ML quality assurance. An experiment that cannot be reproduced cannot be audited, defended to stakeholders, or confidently deployed. In regulated industries, reproducibility is often a compliance requirement. In competitive product development, it is the minimum standard for trusting your own results.",
        riskIfSkipped:
          "Without seed discipline, A/B model comparisons become unreliable. Teams can spend weeks debating whether a model improvement is real or a random seed artifact. Worse, a model that performed well in one experiment may never be reproducible for deployment.",
        kpiImpact:
          "Reproducible experiments reduce the number of re-runs needed to confirm a result, directly reducing compute cost per model iteration. More importantly, they enable confident deployment: you know the model you deploy is the model you tested.",
      },
    },
  },

  "bridge-lesson-8": {
    lesson: lesson(
      "bridge-lesson-8",
      "Baselines as Anti-Self-Deception",
      "65 min",
      "Build the culture of always testing a trivial baseline before celebrating a sophisticated model. Learn the Dummy Model Rule and how heuristic baselines expose whether your ML system is actually doing useful work.",
      [
        "The Dummy Model Rule: always implement the simplest possible baseline first",
        "Baseline taxonomy: majority class, mean prediction, last-value carry-forward, simple heuristics",
        "Evaluation discipline: comparing baselines on the same metric, split, and time horizon",
        "When baselines win: the cases where a well-designed heuristic beats a neural network",
        "Communicating baseline results to stakeholders without undermining confidence",
      ],
      [
        "If your model does not beat a well-designed heuristic, the model is not solving the problem — it is memorizing the training distribution.",
        "A baseline that performs surprisingly well is not a failure. It is a discovery that the problem is simpler than you thought. Ship the simple solution.",
        "Baselines are not about being humble. They are about being right. The ML system that barely beats a heuristic should raise more questions than the model that loses to one.",
      ],
      [
        video(
          "Always Start with a Stupid Baseline — Rachel Thomas (fast.ai)",
          "Build the intuition for why sophisticated models so often lose to simple baselines and what to do about it.",
          "https://www.fast.ai/posts/2017-11-13-validation-sets.html",
          "Rachel Thomas",
          "fast.ai",
        ),
        scriptVideo(
          "Internal lecture: The if-statement that beat the neural network",
          "Walk through a real-world case study where a rule-based system outperformed a trained model until the problem framing was corrected.",
          [
            "Present a binary classification problem. Show the 'winning' model: 87% accuracy.",
            "Implement the majority class baseline. It gets 83%. Discuss: is 4% lift worth a model?",
            "Implement a domain heuristic baseline. It gets 89%. The model lost.",
            "Diagnose why: the model learned the heuristic imperfectly instead of the true signal.",
            "Fix the problem framing. Retrain. The model now beats the heuristic by 12%.",
            "Close with the rule: the baseline is your first hypothesis about what the problem is actually asking.",
          ],
        ),
      ],
      [
        exercise(
          "bridge-ex-8",
          "Design a baseline ladder for three ML product features",
          "analysis",
          "You are given three vague product specifications: (1) a pitcher fatigue detection system, (2) a next-pitch recommendation for broadcast analysts, (3) an injury risk score for starting pitchers. For each feature, design a baseline ladder with at least three rungs: a trivial statistical baseline, a domain heuristic baseline, and a simple ML baseline. Estimate the cost and time to implement each rung. Argue which rung should be shipped first.",
          [
            "Baseline ladder table for each of the three features",
            "Cost and time estimate per rung",
            "Ship-first recommendation with justification",
            "Failure mode analysis: what does each baseline get wrong and how would you detect it in production?",
          ],
          [
            "For the injury risk score, what is the simplest possible statistical baseline and how good do you expect it to be?",
            "At what point on the baseline ladder does a model become worth its maintenance overhead?",
            "How would you communicate a 'baseline wins' result to a product manager who expected a neural network?",
          ],
        ),
      ],
      quiz(
        [
          question(
            "bridge-q15",
            "Your binary classifier achieves 92% accuracy. Your majority class baseline achieves 91.5%. What is the correct conclusion?",
            [
              "The classifier is excellent and ready for deployment",
              "The 0.5% lift is probably real and worth deploying",
              "The classifier barely outperforms guessing the majority class, suggesting the problem may be trivially structured or the model is not learning useful signal",
              "The baseline is invalid because it does not use any features",
            ],
            2,
            "A majority class baseline does not use any features. If a fully trained classifier only barely beats it, the classifier is likely not learning meaningful patterns — it may be exploiting the class imbalance rather than the signal.",
          ),
          question(
            "bridge-q16",
            "Why is it important to evaluate baselines on the same train/test split as your ML model?",
            [
              "Different splits make baselines run slower",
              "Comparing on different splits introduces data distribution differences that can make the baseline look worse or better than it really is, invalidating the comparison",
              "Baselines require the same training data as the model",
              "The evaluation metric changes with different splits",
            ],
            1,
            "The whole point of the baseline comparison is to isolate the contribution of model complexity. Using different splits introduces a confounding variable (data distribution) that makes the comparison meaningless.",
          ),
        ],
        "Revise the baseline ladder until each rung has a concrete evaluation plan that uses the same metric and split as the final model.",
      ),
    ),
    hostedLesson: {
      hook:
        "Every ML engineer has shipped a model that turned out to be a very expensive way to replicate a simple if-statement. This lesson is about building the discipline to find that if-statement first, before you invest in the model. It is not pessimism — it is engineering.",
      teachingPromise:
        "After this lesson you will be able to design a baseline ladder for any ML product problem, correctly evaluate each rung on the same metric and split as the final model, and communicate baseline results — including 'baseline wins' — in a way that improves the product decision rather than undermining confidence.",
      learningObjectives: [
        "Implement majority class, mean regression, and last-value carry-forward baselines for classification and regression problems.",
        "Design a domain heuristic baseline from product knowledge alone.",
        "Evaluate all baselines on the same metric, split, and time horizon as the candidate model.",
        "Communicate a 'baseline beats model' result constructively as a problem framing signal rather than a failure.",
      ],
      lectureSegments: [],
      managerBriefing: {
        businessContext:
          "The engineering cost of a neural network is not just training time and GPU compute. It is the deployment pipeline, monitoring, retraining cadence, and debugging complexity. If a heuristic achieves 95% of the model's performance, the total cost of ownership of the heuristic is typically 10x lower. Baseline discipline is how teams avoid building expensive infrastructure for problems that do not require it.",
        riskIfSkipped:
          "Without baseline culture, teams optimize models against each other rather than against the actual business need. A model that beats last month's model but loses to a simple rule is still a waste of resources. Baseline discipline surfaces this before production deployment.",
        kpiImpact:
          "Teams with strong baseline discipline ship simpler solutions faster and spend model complexity budget only where it generates measurable lift. This produces a portfolio of products where complexity is commensurate with value — a key indicator of ML team maturity.",
      },
    },
  },
};

export const BRIDGE_LESSON_IDS = Object.keys(AUTHORED_BRIDGE_LESSONS);
