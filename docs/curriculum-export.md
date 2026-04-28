# ML Edge — Full Curriculum Export

> Generated April 27, 2026 · 14 courses · 27 modules · 56 lessons

---

## Table of Contents

1. [Data Structures and Algorithms for ML Engineers](#datastructuresandalgorithms) — 6–8 weeks
2. [The Bridge: From DS&A to ML Engineering](#bridgedsatoml) — 4 weeks
3. [ML 101: Mathematical and Practical Foundations](#ml101) — 4-6 weeks
4. [History of AI and Machine Learning](#historyofaiml) — 2-3 weeks
5. [Classical ML and Statistical Learning for Engineers](#classicalmlandstatisticallearning) — 5-7 weeks
6. [Deep Learning and Representation Engineering](#deeplearningandrepresentationengineering) — 6-8 weeks
7. [ML Systems, MLOps, and Production Reliability](#mlsystemsandmlops) — 5-7 weeks
8. [LLMs, Retrieval, and Agentic Systems](#llmragandagenticsystems) — 6-8 weeks
9. [Reliable, Responsible, and Frontier ML Engineering (2026)](#reliableresponsibleandfrontierml2026) — 4-6 weeks
10. [Mathematics and Scientific Foundations for ML](#mathandsciencefoundations) — 6-8 weeks
11. [Statistical Inference and Probabilistic Modeling](#statisticalinferenceandprobabilisticmodeling) — 4-6 weeks
12. [Scientific Computing and Data Systems for MLE](#scientificcomputinganddatasystemsformle) — 4-6 weeks
13. [Computer Vision and Multimodal ML Systems](#computervisionandmultimodalsystems) — 5-7 weeks
14. [Sequential Decision-Making and Reinforcement Learning](#reinforcementlearningandsequentialdecisionmaking) — 5-7 weeks

---

## 1. Data Structures and Algorithms for ML Engineers
**Timeframe:** 6–8 weeks  

A rigorous DS&A course oriented towards ML engineering: cost models, sequences, trees, graphs, hash tables, sorting, and algorithm design — taught through the lens of what an ML system actually needs.

**Why it matters:** Underpins ML interview readiness and deep understanding of the computational complexity that governs model training, inference, and data pipeline design.

### Module 1: Core DS&A
*Level: Intermediate · Foundations through advanced structures*

#### Lesson 1: Cost Models, Recursion, and Sequence Structures
**Duration:** 95 min  
**Summary:** Build the mental model behind asymptotic analysis, recursive decomposition, and the tradeoffs between array-backed and pointer-backed sequence structures.

**Topics covered:**
- Cost models, Big-O, and why operation mix matters more than memorized tables
- Recursion, recurrences, and invariant-driven reasoning
- Arrays, dynamic arrays, and linked lists under real mutation pressure

**Key takeaways:**
- Choose data structures by access and mutation patterns, not by habit.
- Use recursion only when you can state the subproblem contract and base case precisely.
- Amortized and worst-case costs answer different engineering questions and both matter.

**Learning resources:**
- 🎬 **MIT 6.006: Algorithmic Thinking** — Reinforce asymptotic analysis and recurrence intuition with a rigorous open course.

**Exercises:**
- 🔍 **[ANALYSIS]** Compare sequence structures under workload pressure
  *Given three workloads, justify whether an array list, singly linked list, or doubly linked list is the right choice. Include asymptotic cost and bug-risk reasoning.*
  **Deliverables:**
  - One comparison table
  - One written recommendation memo
  - One edge-case note
  **Reflection prompts:**
  - What operations dominate?
  - What invariants are easiest to violate in each structure?
  - When does constant-factor locality beat pointer flexibility?

**Lesson quiz:**
- Q1: Why is appending to a dynamic array usually treated as amortized O(1) instead of worst-case O(1)?
    Because resizing never happens in practice
  ✓ Because occasional O(n) resizes are spread across many cheap appends
    Because array writes are constant time on every machine
    Because linked lists are slower
  *→ Dynamic arrays occasionally pay a full copy cost, but if capacity grows geometrically that cost is budgeted across many future appends.*
- Q2: When is a linked list genuinely preferable to an array-backed list?
    When you need fast random indexing
    When you need contiguous memory layout
  ✓ When you already have node references and frequently splice near them
    Whenever the input size is unknown
  *→ Linked lists earn their keep when the program naturally manipulates node positions and needs local structural edits, not when it needs indexed access.*

  **Capstone task:** Redo the workload analysis until you can justify each choice by access pattern, mutation pattern, and invariant cost.

#### Lesson 2: Stacks, Queues, Deques, and Amortized Thinking
**Duration:** 90 min  
**Summary:** Understand LIFO and FIFO adapters, circular-buffer implementations, and the operational meaning of amortized analysis.

**Topics covered:**
- Stack and queue semantics as interface contracts, not just container shapes
- Circular arrays, front/back indices, and off-by-one failure modes
- Amortized analysis as bookkeeping for resize-heavy structures

**Key takeaways:**
- Adapter structures are defined by allowed operations and invariants, not by the fact that they sit on top of an array or list.
- Most queue bugs are index and wraparound bugs long before they are asymptotic bugs.
- Amortized analysis is a credit argument about sequences of operations, not a claim about a single operation.

**Learning resources:**
- 🎬 **Princeton Algorithms: Stacks and Queues** — Ground LIFO/FIFO reasoning in canonical implementations and invariants.

**Exercises:**
- 🧪 **[LAB]** Design a deque without index confusion
  *Sketch an array-backed deque API and document the meaning of front, back, size, and empty/full states. Include resize behavior and wraparound rules.*
  **Deliverables:**
  - One invariant sheet
  - One index-update table
  - One bug checklist
  **Reflection prompts:**
  - What does front point at when the deque is empty?
  - Which index changes first during add/remove on each side?
  - How will you copy elements during resize without changing logical order?

**Lesson quiz:**
- Q1: Why do circular arrays show up so often in queue and deque implementations?
    Because they make all operations worst-case O(1) without any edge cases
  ✓ Because they reuse array space without shifting elements on every dequeue
    Because linked lists cannot represent FIFO order
    Because they remove the need for resizing
  *→ Wraparound indexing lets the structure reuse freed slots rather than treating the array as a one-way conveyor belt.*
- Q2: What does amortized O(1) enqueue on a resizing circular queue actually guarantee?
    Every single enqueue is constant time
  ✓ The average cost over a long valid sequence stays bounded even if occasional resizes cost O(n)
    The queue never copies elements
    The queue uses less memory than a linked list in every case
  *→ Amortized guarantees are about sequences of operations, not about ruling out occasional expensive steps.*

  **Capstone task:** Rework the deque invariants until you can update indices on paper without guessing.

#### Lesson 3: Trees, Balanced Search, and Priority Queues
**Duration:** 100 min  
**Summary:** Study BST ordering, AVL rebalancing, and heaps as two different ways to exploit tree structure.

**Topics covered:**
- Binary search tree ordering and traversal semantics
- AVL balance, rotations, and height guarantees
- Heaps and priority queues as partial-order data structures

**Key takeaways:**
- BSTs optimize ordered lookup when their shape stays healthy.
- Rotations preserve order while repairing height imbalance.
- Heaps are for extreme-priority access, not general search.

**Learning resources:**
- 🎬 **MIT 6.006: Binary Search Trees and Heaps** — Reinforce how tree shape governs search and update cost.

**Exercises:**
- 📌 **[DEBUGGING]** Diagnose a self-balancing tree by rotations
  *Given insertion logs and balance factors, identify where an AVL implementation skipped or chose the wrong rotation. Explain the resulting complexity risk.*
  **Deliverables:**
  - One rotation trace
  - One corrected rebalance sequence
  - One complexity note
  **Reflection prompts:**
  - Is the case LL, LR, RL, or RR?
  - Which rotation preserves in-order traversal?
  - How does one missed rebalance affect future operations?

**Lesson quiz:**
- Q1: Why do AVL rotations not break the binary-search-tree ordering invariant?
    Because rotations never move keys between nodes
    Because rotations only relabel heights
  ✓ Because rotations preserve in-order key ordering while changing local parent-child structure
    Because AVL trees do not use comparisons
  *→ A rotation is a local structural rewrite that preserves the sorted left-root-right relationship among the affected nodes.*
- Q2: Why is a binary heap a poor choice for checking whether an arbitrary key exists?
    Because heaps are unsorted
  ✓ Because the heap only guarantees parent priority relative to children, not global search order
    Because heap insert is O(n)
    Because heaps cannot store duplicates
  *→ A heap is a partial order built for extracting the minimum or maximum efficiently, not for general membership search.*

  **Capstone task:** Trace rotations and percolation until the invariants feel structural rather than procedural.

#### Lesson 4: Hash Tables, Sets, and Associative Lookup
**Duration:** 90 min  
**Summary:** Learn how hashing trades ordered structure for expected-time lookup, and why collision policy and load-factor management determine real behavior.

**Topics covered:**
- Hashing as deterministic dispersion into buckets or probes
- Collision resolution, deletion semantics, and load-factor discipline
- Choosing between maps, sets, and ordered structures

**Key takeaways:**
- A hash table is only fast when its distribution and resize policy stay healthy.
- Deletion is easy to get wrong because it interacts with the collision strategy.
- Expected O(1) lookup is not a substitute for order-sensitive queries.

**Learning resources:**
- 🎬 **VisuAlgo Hash Tables** — Use visual probe and collision traces to make open addressing and chaining concrete.

**Exercises:**
- 📌 **[DEBUGGING]** Review a hash-table deletion policy
  *Given an open-addressed hash table implementation, evaluate whether remove preserves successful future search. Focus on tombstones, probe termination, and resize timing.*
  **Deliverables:**
  - One deletion trace
  - One bug explanation
  - One corrected policy note
  **Reflection prompts:**
  - What tells a search to keep probing?
  - What tells a search it can stop?
  - How does deletion change those conditions?

**Lesson quiz:**
- Q1: Why can deleting an open-addressed table entry by simply clearing the slot break future lookups?
    Because hash codes become invalid
  ✓ Because later searches may stop early and fail to follow the probe chain past the cleared slot
    Because the table becomes unsorted
    Because resizing no longer works
  *→ Open addressing depends on uninterrupted probe sequences. Clearing a slot can falsely signal 'key not present' for items inserted later in the same cluster.*
- Q2: When is an ordered tree still better than a hash table?
    When you need expected constant-time membership only
    When your keys are integers
  ✓ When you need predecessor, successor, or sorted traversal queries
    Whenever collisions are possible
  *→ Hash tables optimize equality-based lookup; ordered trees are better when the application needs order-sensitive operations.*

  **Capstone task:** Trace collisions and deletions until you can say exactly when a probe continues and when it should stop.

#### Lesson 5: Sorting, Partitioning, and Selection
**Duration:** 100 min  
**Summary:** Compare elementary and advanced sorting algorithms, reason about partition invariants, and connect sorting ideas to selection.

**Topics covered:**
- Stability, adaptiveness, in-place behavior, and the comparison lower bound
- Merge sort, quicksort, heap sort, and radix sort as different design bets
- Partition invariants and quickselect for top-k style problems

**Key takeaways:**
- Sorting algorithms differ because they optimize for different constraints, not because one of them is 'the real one.'
- Partition-based algorithms live or die on local invariants.
- Selection often avoids the full cost of sorting when you only need one rank statistic or top-k slice.

**Learning resources:**
- 🎬 **MIT 6.006: Sorting** — Ground sort analysis and lower bounds in a rigorous open lecture sequence.

**Exercises:**
- 🔍 **[ANALYSIS]** Choose the right sort for the workload
  *For four workloads, justify whether you would pick merge sort, quicksort, heap sort, radix sort, or insertion sort. Include memory, stability, and input-shape reasoning.*
  **Deliverables:**
  - One decision table
  - One explanation per workload
  - One risk note
  **Reflection prompts:**
  - Do you need stability?
  - Is the data nearly sorted?
  - Are keys numeric with bounded digit structure?

**Lesson quiz:**
- Q1: Why is merge sort stable in its standard form?
    Because it uses recursion
  ✓ Because equal keys can be copied from the left subarray before equal keys from the right, preserving original relative order
    Because it is in-place
    Because it always runs in linear time
  *→ Stability is about preserving relative order for equal keys, which standard merge can do by choosing the left element first on ties.*
- Q2: When is quickselect preferable to fully sorting the array?
    When you need the entire array in sorted order
  ✓ When you only need one rank statistic or a small top-k frontier
    When keys are strings
    When stability is mandatory
  *→ Selection avoids paying for total order when the problem only asks for a single position or partial frontier.*

  **Capstone task:** Trace partitions until the loop invariants are clearer than the code syntax.

#### Lesson 6: Graphs, Shortest Paths, and Dynamic Programming
**Duration:** 110 min  
**Summary:** Connect graph traversal, weighted shortest paths, MST intuition, and dynamic programming as state-space reasoning rather than disconnected tricks.

**Topics covered:**
- Graph representations, BFS, DFS, and traversal invariants
- Dijkstra, minimum spanning trees, and greedy algorithm preconditions
- Dynamic programming, memoization, and state design

**Key takeaways:**
- Graph algorithms are about what structure the edges encode and what invariant the frontier maintains.
- Greedy algorithms work only when the problem admits a safe local choice.
- Dynamic programming starts with state design and recurrence quality, not with a table.

**Learning resources:**
- 🎬 **MIT 6.006: Graphs and Dynamic Programming** — Tie frontier-based graph reasoning to subproblem-based DP reasoning.

**Exercises:**
- 🔍 **[ANALYSIS]** Translate a problem into graph or DP state
  *Take one shortest-path problem and one recurrence problem. For each, define the state, transition rule, and invariant that makes the algorithm trustworthy.*
  **Deliverables:**
  - Two problem framings
  - One invariant per framing
  - One failure-mode note
  **Reflection prompts:**
  - What does each node or DP state mean?
  - What information is sufficient to move to the next state?
  - Which greedy or recursive shortcut would be invalid and why?

**Lesson quiz:**
- Q1: Why does Dijkstra's algorithm require nonnegative edge weights?
    Because heaps cannot store negative numbers
  ✓ Because the algorithm assumes once a node is extracted with smallest tentative distance, that distance will never later improve via a negative edge
    Because BFS already handles negative weights
    Because minimum spanning trees fail on negative graphs
  *→ The greedy finalization step in Dijkstra depends on distances only increasing along future paths, which negative edges can violate.*
- Q2: What is the first serious design decision in dynamic programming?
    Choosing between recursion and iteration syntax
    Choosing the table data type
  ✓ Defining a state that captures exactly the subproblem information needed for optimal recombination
    Sorting the input
  *→ If the state is wrong, the recurrence, memoization, and reconstruction logic will all be wrong no matter how clean the code looks.*

  **Capstone task:** Rework graph frontiers and DP states until you can name the invariant before you run the algorithm.

---

## 2. The Bridge: From DS&A to ML Engineering
**Timeframe:** 4 weeks  

Four phases — Modern Python, Vectorization, Data Plumbing, and Scientific Mindset — that close the gap between DS&A problem-solving fluency and production ML engineering. Each lesson is paired with a manager track that connects the technical shift to a business outcome.

**Why it matters:** DS&A teaches you to reason about computation. ML engineering requires you to reason about data at scale, memory under pressure, reproducible experiments, and the cost of being wrong. This bridge makes that transition explicit.

### Module 1: Phase 1: Modern Python
*Level: Intermediate · The Clean Code Shift — from procedural Python to MLE-grade infrastructure*

#### Lesson 1: Functional Python & Lazy Loading
**Duration:** 75 min  
**Summary:** Shift from procedural list-building to memory-safe, composable data pipelines using generators, iterators, and decorators — the foundational patterns of MLE-grade infrastructure.

**Topics covered:**
- Generators and the iterator protocol: lazy evaluation vs. eager materialization
- Decorators as pipeline composition primitives
- Memory profiling: when a Python list becomes an infrastructure liability
- Real-world patterns: chunked file reads, streaming ETL, lazy feature transforms

**Key takeaways:**
- A generator produces one item at a time; a list holds everything at once. At 100GB of data, that difference is the difference between working and crashing.
- Decorators are not magic — they are higher-order functions that wrap behavior without mutating the original callable.
- Memory safety is not a premature optimization in ML. It is a correctness constraint when datasets exceed available RAM.

**Learning resources:**
- 🎬 **Python Generators and Iterators — Corey Schafer** — Build intuition for lazy evaluation with practical generator examples.
- 📝 **Internal lecture: From DS&A lists to ML data pipelines** *(internal lecture script)* — Walk through the memory cost model of lists vs. generators on realistic dataset sizes.
  - Open with a concrete crash scenario: materializing 100GB Statcast data into a Python list.
  - Refactor step-by-step to a generator pipeline. Profile memory usage at each step.
  - Introduce decorators as a way to add logging, caching, and retry logic without polluting pipeline logic.
  - Close with the engineering rule: materialize only when you must.

**Exercises:**
- 🧪 **[LAB]** Refactor an eager ETL pipeline to a lazy generator pipeline
  *You are given an eager Python script that loads a full CSV of simulated game log data into a list, filters rows, and computes aggregates. Refactor it to use generators throughout. Profile both versions with memory_profiler and document the difference.*
  **Deliverables:**
  - Refactored pipeline script using generators and yield
  - Memory profile comparison (before vs. after)
  - One-paragraph write-up: at what dataset size does the eager version become untenable?
  **Reflection prompts:**
  - Where is the first point in the pipeline that data must be fully materialized?
  - Could a decorator handle the logging and retry logic you added manually?
  - What invariant does each generator stage need to preserve to keep the pipeline correct?

**Lesson quiz:**
- Q1: Why does a generator expression use less memory than an equivalent list comprehension for large inputs?
    Generators use compiled C code internally
  ✓ Generators produce values one at a time instead of building the full collection in memory
    Generators bypass Python's garbage collector
    List comprehensions always copy the input twice
  *→ A generator suspends execution after each yield and only computes the next value when asked, so it never holds more than one item at a time.*
- Q2: What is the primary engineering reason to use a decorator on a data-loading function in an ML pipeline?
    To make the function run faster by default
  ✓ To separate cross-cutting concerns (retry, caching, logging) from the core loading logic
    To convert the function into a generator automatically
    To enforce type annotations at runtime
  *→ Decorators let you layer operational concerns around a function without entangling them with the domain logic. A loader should load; retry behavior belongs in a wrapper.*

  **Capstone task:** Rebuild the pipeline exercise until the memory profile is flat regardless of input size.

#### Lesson 2: Robust Data Contracts with Pydantic & Type Hints
**Duration:** 70 min  
**Summary:** Use Python's type system and Pydantic's runtime validation to build ML data pipelines that reject bad data at the boundary instead of propagating corrupt state into training runs.

**Topics covered:**
- Python type hints: what the interpreter sees vs. what type checkers enforce
- Pydantic models as schema validators for ML inputs and outputs
- Failure modes: how a single mistyped field can corrupt a training batch
- Field-level validators, coercion rules, and strict mode
- Designing contracts for feature vectors, API payloads, and Firestore documents

**Key takeaways:**
- Type hints are documentation; Pydantic is enforcement. Both are necessary.
- Validate at the boundary — the moment data enters your system from an external source. Never trust a field you did not check.
- A schema failure that is caught at ingest time costs milliseconds to fix. The same failure caught after a 10-hour training run costs days.

**Learning resources:**
- 🎬 **Pydantic v2 Tutorial — ArjanCodes** — Ground the Pydantic model API with practical examples before moving to ML-specific patterns.
- 📝 **Internal lecture: Data contracts as your first line of defense in ML systems** *(internal lecture script)* — Walk through a real ML input corruption scenario and show how Pydantic stops it at the boundary.
  - Show a Firestore document with a field type mismatch. Trace the bug through feature engineering into a NaN loss value.
  - Introduce a Pydantic model for the same document. Show the ValidationError that fires immediately.
  - Add field validators for domain-specific constraints: non-negative pitch velocity, valid date ranges, enum membership.
  - Close with the engineering contract: every external data source gets a schema. No exceptions.

**Exercises:**
- 🔍 **[ANALYSIS]** Design and harden a Pydantic schema for an ML training record
  *You are given a JSON dataset of simulated baseball pitch records that intentionally contains type mismatches, out-of-range values, and missing fields. Build a Pydantic model that validates the schema, add custom field validators for domain invariants, and write a report documenting every failure mode you caught.*
  **Deliverables:**
  - Pydantic model definition with type annotations and field validators
  - Validation harness that processes all records and collects errors
  - Failure report: count and description of each error category found
  - Recommendation: which errors should hard-fail vs. be coerced vs. be dropped?
  **Reflection prompts:**
  - What is the difference between a missing field and a None field in your schema?
  - Which fields need domain-specific validators beyond what the type system provides?
  - How would you extend this schema to version it as the upstream source evolves?

**Lesson quiz:**
- Q1: What is the primary advantage of validating ML inputs with Pydantic at ingest time rather than relying on downstream type errors?
    Pydantic runs faster than Python's built-in type system
  ✓ Validation errors surface immediately with clear field-level context instead of as silent corruption deep in the pipeline
    Pydantic automatically fixes type mismatches using coercion
    Type annotations alone are sufficient for runtime safety
  *→ Catching schema violations at the boundary gives you a precise error location and message. Silent type coercion or NaN propagation downstream makes the same bug nearly impossible to trace.*
- Q2: When designing a Pydantic model for a feature vector, which approach is most defensible?
    Use Optional[float] for all fields to maximize flexibility
  ✓ Use strict types and explicit validators; allow Optional only where absence is semantically meaningful
    Skip validation for fields that are already typed in the upstream source
    Use dict[str, Any] to avoid schema maintenance overhead
  *→ Optional should mean 'this field may legitimately be absent'. Using it universally as a type escape hatch defeats the purpose of a schema contract.*

  **Capstone task:** Revise your schema until every record in the dataset either passes cleanly or fails with a precise, actionable error message.

### Module 2: Phase 2: Vectorization
*Level: Intermediate · The Hardware Performance Shift — from O(n) loops to O(1) tensors*

#### Lesson 1: NumPy and the Death of the Loop
**Duration:** 85 min  
**Summary:** Internalize vectorization as the primary performance primitive in numerical ML code, replacing Python loops with NumPy operations that delegate to optimized C and BLAS backends.

**Topics covered:**
- Vectorization: replacing element-wise loops with array operations
- Broadcasting: how NumPy applies operations across mismatched shapes
- Universal functions (ufuncs) and their role in numeric pipelines
- When vectorization fails: object arrays, ragged inputs, and the fallback to loops
- Profiling: measuring the actual speedup in your specific workload

**Key takeaways:**
- A vectorized NumPy operation runs in C. A Python loop runs in Python. The performance gap is typically 50–200x — not a micro-optimization, a system design constraint.
- Broadcasting is not magic; it is a set of shape-alignment rules. Master the rules and you will never need to write an explicit outer product loop again.
- Profile before you claim a speedup. NumPy has overhead for small arrays where a Python loop is actually faster.

**Learning resources:**
- 🎬 **NumPy Vectorization and Broadcasting — Jake VanderPlas** — Ground vectorization and broadcasting with canonical examples from the Python Data Science Handbook.
- 📝 **Internal lecture: Loop-to-vector refactoring workshop** *(internal lecture script)* — Walk through six progressively harder loop-to-vector rewrites on ML-relevant computations.
  - Baseline: time a naive Python loop computing row-wise L2 norms on a 1M x 128 matrix.
  - Rewrite with np.linalg.norm. Show the 100x speedup in a live profile.
  - Introduce broadcasting with a batch normalization example: subtract the column mean, divide by std, no loops.
  - Show a broadcasting mistake (shape mismatch) and how to read the error.
  - Close with the rule: if you are writing a for-loop over a NumPy array, ask whether a ufunc or broadcast expression can replace it.

**Exercises:**
- 🧪 **[LAB]** Vectorize a feature engineering pipeline end-to-end
  *You are given a Python script that computes five ML features from a simulated pitch dataset using explicit for-loops: L2 norm of velocity components, z-score normalization, pairwise cosine similarity for a small candidate set, a rolling 5-pitch mean, and a one-hot encoding. Rewrite each using NumPy operations, profile both versions with timeit, and document the speedup for each feature.*
  **Deliverables:**
  - Vectorized implementation of all five features
  - timeit benchmark table: loop vs. vectorized, dataset sizes 1k / 10k / 100k
  - Written explanation of the broadcasting rule used in each computation
  - At least one case where the loop version is defensible (small input or clarity)
  **Reflection prompts:**
  - For the cosine similarity computation, what shape do your input matrices need to be and why?
  - When does broadcasting require you to insert a new axis with np.newaxis or reshape?
  - What is the NumPy equivalent of the rolling mean and why is it faster than a loop?

**Lesson quiz:**
- Q1: Why is a NumPy vectorized operation typically 50–200x faster than an equivalent Python for-loop?
    NumPy skips Python's garbage collector
  ✓ NumPy operations are compiled C or Fortran code operating on contiguous memory, bypassing Python interpreter overhead per element
    NumPy automatically distributes work across CPU cores
    NumPy stores arrays in GPU memory by default
  *→ The speed advantage comes from delegating element-wise work to pre-compiled C/BLAS routines that operate on contiguous memory without per-element Python overhead.*
- Q2: A (3, 1) array and a (1, 4) array are added with NumPy broadcasting. What shape is the result?
    (3, 1)
    (1, 4)
  ✓ (3, 4)
    A shape mismatch error is raised
  *→ Broadcasting stretches the size-1 dimensions of each array to match the other: (3,1) → (3,4) and (1,4) → (3,4), yielding a (3,4) result.*

  **Capstone task:** Re-run the benchmark until you can explain the speedup by pointing to the specific C operation that replaced the Python loop.

#### Lesson 2: Memory Layout & Tensor Geometry
**Duration:** 80 min  
**Summary:** Build the mental model for how arrays live in memory — row-major vs. column-major layout, contiguity, strides, and the performance implications of reshape vs. transpose — so you can reason about GPU kernel performance and avoid silent copy overhead.

**Topics covered:**
- Row-major (C-order) and column-major (Fortran-order) memory layout
- Strides: how NumPy navigates an array without copying
- Contiguous vs. non-contiguous arrays and when NumPy forces a copy
- Reshape vs. transpose: which modifies the data and which modifies the view
- CPU cache lines, spatial locality, and why matrix multiply prefers column access
- Practical implications for PyTorch tensor layout in model training

**Key takeaways:**
- A transposed NumPy array shares memory with the original. A reshaped array may share memory if contiguous, but may force a copy if not.
- CPU and GPU performance is dominated by memory access patterns. Code that accesses memory sequentially uses hardware prefetchers effectively; code that jumps around does not.
- Every time you call .contiguous() in PyTorch, you are paying a copy cost that could have been avoided by thinking about layout earlier.

**Learning resources:**
- 🎬 **NumPy Internals: Memory Layout and Strides — Sebastian Raschka** — Visualize stride mechanics and understand the copy conditions with clear diagrams.
- 📝 **Internal lecture: How tensors live in memory** *(internal lecture script)* — Trace a matrix transpose through its stride representation and show where accidental copies happen in real model code.
  - Draw a 3×4 matrix in row-major memory. Show how strides index each element without movement.
  - Transpose it. Show that the data did not move — only the strides changed.
  - Demonstrate a non-contiguous array being passed to a function that requires contiguous input. Show the forced copy.
  - Connect to PyTorch: show a NCHW vs. NHWC layout difference and its kernel performance impact.
  - Close with the rule: reshape on contiguous arrays is free; reshape on non-contiguous arrays is not.

**Exercises:**
- 🔍 **[ANALYSIS]** Audit a model preprocessing pipeline for accidental copies
  *You are given a preprocessing pipeline for image batches that performs several reshape, transpose, and slice operations before feeding tensors to a model. Use np.shares_memory, the .flags attribute, and torch.Tensor.is_contiguous to audit every operation. Identify which steps produce copies, which produce views, and propose a reordering that eliminates the unnecessary copies.*
  **Deliverables:**
  - Annotated pipeline with copy/view label on each operation
  - Total count of accidental copies and estimated memory overhead per batch
  - Reordered pipeline that achieves the same result with fewer copies
  - Explanation of why the reordering works in terms of contiguity rules
  **Reflection prompts:**
  - Which operation forces a copy because the input is non-contiguous?
  - When a transpose is followed immediately by a reshape, can NumPy avoid a copy? Under what condition?
  - How would you design the pipeline from scratch to stay contiguous throughout?

**Lesson quiz:**
- Q1: When you call np.transpose(A), what happens to the underlying data?
    The data is copied into a new row-major array
  ✓ The data is unchanged; only the strides are swapped to reflect the transposed access pattern
    The data is moved into column-major order
    A new view is created with the same strides as the original
  *→ NumPy transpose returns a view with swapped strides. No data is copied unless you explicitly call np.ascontiguousarray or an operation that requires contiguity.*
- Q2: Why does iterating over the rows of a C-order (row-major) matrix have better cache performance than iterating over the columns?
  ✓ Rows are stored in contiguous memory, so sequential row access hits the CPU prefetcher; column access jumps by a full row stride
    C-order matrices are always stored in L1 cache
    NumPy automatically reorders columns for cache efficiency
    The difference only matters for matrices larger than 1GB
  *→ In row-major order, all elements of a row are contiguous. Accessing them sequentially allows the CPU hardware prefetcher to load the next cache line before it is needed. Column access jumps by the row width, defeating the prefetcher.*

  **Capstone task:** Re-run the pipeline audit until you can explain the copy/view decision for every operation by citing the contiguity rule that governs it.

### Module 3: Phase 3: Data Plumbing
*Level: Intermediate · The Feature Engineering Shift — from arrays to features*

#### Lesson 1: Pandas for Relational Data at Scale
**Duration:** 80 min  
**Summary:** Move from thinking in individual records to thinking in vectorized relational operations — joins, groupby aggregations, and window functions — the transformations that convert raw logs into ML features.

**Topics covered:**
- Vectorized aggregations: groupby, transform, and agg compared
- Joins and merges: performance characteristics and common pitfalls
- Window functions: rolling, expanding, and shift for time-series features
- Index-aware operations: why a well-set index makes joins and lookups faster
- Memory and dtype optimization: reducing DataFrame size before you scale out

**Key takeaways:**
- GroupBy + agg is the ML engineer's primary tool for turning event logs into features. Understand it at the operation level, not just the syntax level.
- A poorly written pandas join can silently produce a Cartesian product and multiply your DataFrame size by 1000x. Always check the shape after a merge.
- Window functions are the correct abstraction for time-series features. A rolling mean in pandas is not a loop — it is a vectorized sliding kernel.

**Learning resources:**
- 🎬 **Pandas GroupBy Explained — Corey Schafer** — Build a solid mental model of split-apply-combine before moving to ML-specific aggregation patterns.
- 📝 **Internal lecture: From game logs to ML signals** *(internal lecture script)* — Walk through a complete feature engineering pipeline that turns raw pitch-by-pitch data into per-pitcher rolling features.
  - Start with a raw event log: one row per pitch, pitcher_id, velocity, spin_rate, outcome.
  - Compute per-pitcher career averages with groupby + agg. Check the shape.
  - Add rolling 5-game ERA using groupby + rolling. Trace the window logic step by step.
  - Join the rolling features back to the pitch-level log using a merge. Verify no row explosion.
  - Close with the engineering question: what is the time-to-insight cost of computing each feature?

**Exercises:**
- 🧪 **[LAB]** Build a pitcher feature store from raw pitch logs
  *You are given a CSV of simulated pitch-level data for 50 pitchers over 162 games. Build a feature engineering pipeline that produces: (1) career-level stats per pitcher via groupby aggregation, (2) 5-game rolling stats via groupby + rolling, (3) a merged feature DataFrame at the pitch level with both career and rolling context. The pipeline must produce correct shapes at every step and handle pitchers who appear in fewer than 5 games.*
  **Deliverables:**
  - Feature engineering pipeline script
  - Shape and dtypes check at each step with assertions
  - Five-row sample of the final merged DataFrame
  - Short write-up: which features are time-leaky if you forget to shift the rolling window by one game?
  **Reflection prompts:**
  - What happens to the rolling window when a pitcher has fewer games than the window size? How should you handle it?
  - When you join rolling features back to the pitch log, how do you verify you did not produce a Cartesian product?
  - Which dtypes in the raw CSV are wasting memory and how would you downcast them?

**Lesson quiz:**
- Q1: You compute a rolling 5-game ERA per pitcher to use as a training feature. What data leakage risk must you address?
    Rolling windows always include the current game in the window, leaking future information into past features
    Rolling functions in pandas are not vectorized and introduce randomness
  ✓ A rolling window computed on the full dataset includes data from the current row, requiring a shift to use as a predictor without leaking the target
    Pitcher ID grouping causes data to be shuffled randomly
  *→ A rolling window that includes the current game uses information from the game being predicted to compute the feature. Shifting the window by one game ensures the feature only reflects history the model could legitimately have at prediction time.*
- Q2: What is the risk of a many-to-many merge in pandas if you do not check shapes?
    The merge fails silently and returns an empty DataFrame
  ✓ The merge produces a Cartesian product between matching rows, silently multiplying the DataFrame size
    Pandas automatically deduplicates the result
    The merge is rejected unless both DataFrames have unique indices
  *→ A many-to-many merge matches every row on the left with every row on the right that shares the key. If both sides have 100 rows per key, the result has 10,000 rows per key. Pandas does not warn you. Always check the shape after a merge.*

  **Capstone task:** Re-run the feature pipeline until every shape assertion passes and the leakage write-up correctly identifies all time-leaky features.

#### Lesson 2: SQL & BigQuery for ML Engineers
**Duration:** 75 min  
**Summary:** Move computation to the data. Learn to express ML-relevant transformations — aggregations, window functions, feature joins — as SQL queries that BigQuery executes over terabytes without moving data into Python memory.

**Topics covered:**
- When to use SQL instead of pandas: the data gravity principle
- Window functions in SQL: ROW_NUMBER, RANK, LAG, LEAD, and rolling aggregates
- Query optimization: partitioning, clustering, and avoiding full table scans
- Approximate aggregations for large-scale feature engineering
- Exporting query results to GCS for training pipelines
- Cost governance: estimating and controlling BigQuery slot usage

**Key takeaways:**
- If the data lives in a database and you only need a fraction of it, do the filtering and aggregation in SQL. Do not pay to move terabytes to Python to then filter them.
- SQL window functions are the database equivalent of pandas rolling + groupby. Anything you can express as a sliding aggregate over ordered rows belongs in SQL.
- Every BigQuery query scans bytes and costs money. Partition pruning and column selection are not premature optimizations — they are cost governance.

**Learning resources:**
- 🎬 **BigQuery for Data Engineers — Google Cloud Tech** — Understand BigQuery's distributed execution model and cost model before writing queries for ML pipelines.
- 📝 **Internal lecture: Moving the feature engineering to the data** *(internal lecture script)* — Walk through a complete rewrite of the pandas feature pipeline from Lesson 5 as BigQuery SQL.
  - Start with the same pitcher feature store problem. Estimate the pandas memory cost at 1TB of logs.
  - Rewrite career aggregations as a BigQuery GROUP BY query. Show the execution plan.
  - Rewrite the rolling 5-game window using SQL OVER clause with ROWS BETWEEN. Note the leakage shift.
  - Show partition pruning on a date-partitioned table: the cost difference between a full scan and a filtered scan.
  - Close with the engineering principle: SQL is not slow; poorly written SQL is slow. Well-written SQL is often faster than any Python alternative at the data scale that matters.

**Exercises:**
- 🔍 **[ANALYSIS]** Translate a pandas feature pipeline to BigQuery SQL
  *You are given the pandas feature pipeline you built in Lesson 5 (career stats + rolling window + merge). Rewrite it as a single BigQuery SQL query using CTEs, GROUP BY, and OVER window functions. Estimate the cost of the query on a 1TB simulated logs table. Identify two query optimizations (partitioning or clustering strategies) that would reduce cost by at least 80%.*
  **Deliverables:**
  - BigQuery SQL query using CTEs for career stats and rolling window
  - Cost estimate for a 1TB table (full scan vs. partition-pruned scan)
  - Two optimization strategies with rationale
  - Comparison table: pandas pipeline vs. SQL pipeline by memory used, runtime, and cost
  **Reflection prompts:**
  - How would you express the leakage-safe rolling window (shift by one game) in SQL OVER syntax?
  - What partitioning scheme would make per-pitcher queries cheapest?
  - When would you choose to export query results to GCS vs. reading them directly into a Python training script?

**Lesson quiz:**
- Q1: What is the 'data gravity' principle and how does it apply to ML feature engineering?
    Large datasets should always be replicated to multiple regions for speed
  ✓ Compute should move to the data rather than moving large data to compute — especially when you only need a summary or subset
    SQL is faster than Python for all operations regardless of data size
    Data gravity means BigQuery stores all data in memory for fast access
  *→ Data gravity means that once data reaches a certain scale, it is cheaper and faster to run transformations where the data lives (the database) than to move the data to where your code lives (Python). This is the core argument for SQL-first feature engineering.*
- Q2: How does BigQuery's column-oriented storage affect the cost of SELECT * queries?
    SELECT * is free because BigQuery compresses all columns equally
  ✓ SELECT * scans every column in the table, charging for all bytes. Selecting only needed columns reduces cost proportionally
    SELECT * triggers a full index rebuild
    Column-oriented storage makes SELECT * faster than selecting individual columns
  *→ BigQuery charges by bytes scanned. Column-oriented storage means each column is stored separately. SELECT * reads every column. Selecting only the columns you need can reduce cost by 90% or more on wide tables.*

  **Capstone task:** Rewrite the query until it correctly handles the leakage-safe window and uses partition pruning to scan less than 10% of the table.

### Module 4: Phase 4: Scientific Mindset
*Level: Intermediate · The Experimental Discipline Shift — from correct/incorrect to signal/noise*

#### Lesson 1: Determinism vs. Stochasticity
**Duration:** 70 min  
**Summary:** Build the habit of managing randomness explicitly — seeds, reproducible pipelines, and the discipline of separating experiments that must be repeatable from those that are intentionally stochastic.

**Topics covered:**
- Sources of randomness in ML pipelines: data splits, initialization, dropout, data augmentation
- Seeding strategies: Python random, NumPy, PyTorch, and the global vs. local seed debate
- Reproducibility contracts: what it means for an experiment to be reproducible
- Non-determinism from hardware: CUDA non-determinism and when it matters
- Experiment tracking: why seeds are a first-class metadata field

**Key takeaways:**
- An experiment that cannot be reproduced is an anecdote, not evidence. Seed discipline is the minimum viable scientific practice for ML.
- Seeding globally is not enough. Parallel data loaders, dropout layers, and augmentation pipelines each have their own random state that can break reproducibility if not managed independently.
- Some non-determinism is acceptable. Understand when you need bit-exact reproducibility vs. statistical reproducibility vs. directional reproducibility.

**Learning resources:**
- 🎬 **Reproducibility in Deep Learning — Full Stack Deep Learning** — Survey the sources of non-determinism in modern ML and the engineering patterns that control them.
- 📝 **Internal lecture: The reproducibility contract** *(internal lecture script)* — Walk through a debugging session where a model 'regressed' between runs due to an unseeded augmentation pipeline.
  - Show two training runs with identical hyperparameters but different final metrics. Ask: is this a bug?
  - Trace the source of variance: an unseeded random crop in the data augmentation pipeline.
  - Fix the seed chain: Python random, NumPy, PyTorch, and the data loader worker init fn.
  - Rerun both experiments. Show bit-exact reproducibility.
  - Discuss when to use fixed seeds (experiments comparing configs) vs. random seeds (robustness sweeps).

**Exercises:**
- 🧪 **[LAB]** Audit and fix a non-reproducible training pipeline
  *You are given a PyTorch training script that produces different validation loss curves on every run despite no intentional randomness. Use a bisection approach to identify all sources of non-determinism. Fix each source. Document the fix. Then demonstrate that two consecutive runs produce identical loss curves.*
  **Deliverables:**
  - Annotated list of all non-determinism sources found and how each was fixed
  - Two identical loss curve plots from consecutive runs
  - Written recommendation: which fixes are always justified and which incur a performance tradeoff?
  **Reflection prompts:**
  - Which CUDA operations are non-deterministic by default and what flag enables deterministic mode?
  - How does PyTorch DataLoader's num_workers > 1 interact with reproducibility?
  - At what point in the training loop does dropout become a reproducibility concern?

**Lesson quiz:**
- Q1: Setting torch.manual_seed(42) at the start of a training script guarantees reproducible results. True or false?
    True — a global seed controls all random operations
  ✓ False — parallel DataLoader workers, CUDA operations, and augmentation pipelines have independent random states that also need to be seeded
    True, but only if the model has no dropout layers
    False — PyTorch seeds are deprecated in favor of numpy seeds
  *→ A global seed only controls the main process random state. Worker processes initialize their own random states independently. CUDA has separate non-determinism sources. Full reproducibility requires seeding every random state in the pipeline.*
- Q2: When comparing two model configurations, why is it important to use the same seed for both runs?
    Different seeds produce different batch sizes
  ✓ Seed differences introduce variance in data order, initialization, and dropout masks that can mask or exaggerate the real performance difference between configurations
    Same seeds prevent gradient overflow
    Different seeds invalidate the loss function
  *→ When comparing configurations, the goal is to isolate the variable being tested. Seed-induced variance (different data orders, initializations, dropout patterns) is a confounder that can make an inferior configuration look better by luck.*

  **Capstone task:** Rerun the pipeline audit until two consecutive identical runs produce loss curves that overlap within floating-point precision.

#### Lesson 2: Baselines as Anti-Self-Deception
**Duration:** 65 min  
**Summary:** Build the culture of always testing a trivial baseline before celebrating a sophisticated model. Learn the Dummy Model Rule and how heuristic baselines expose whether your ML system is actually doing useful work.

**Topics covered:**
- The Dummy Model Rule: always implement the simplest possible baseline first
- Baseline taxonomy: majority class, mean prediction, last-value carry-forward, simple heuristics
- Evaluation discipline: comparing baselines on the same metric, split, and time horizon
- When baselines win: the cases where a well-designed heuristic beats a neural network
- Communicating baseline results to stakeholders without undermining confidence

**Key takeaways:**
- If your model does not beat a well-designed heuristic, the model is not solving the problem — it is memorizing the training distribution.
- A baseline that performs surprisingly well is not a failure. It is a discovery that the problem is simpler than you thought. Ship the simple solution.
- Baselines are not about being humble. They are about being right. The ML system that barely beats a heuristic should raise more questions than the model that loses to one.

**Learning resources:**
- 🎬 **Always Start with a Stupid Baseline — Rachel Thomas (fast.ai)** — Build the intuition for why sophisticated models so often lose to simple baselines and what to do about it.
- 📝 **Internal lecture: The if-statement that beat the neural network** *(internal lecture script)* — Walk through a real-world case study where a rule-based system outperformed a trained model until the problem framing was corrected.
  - Present a binary classification problem. Show the 'winning' model: 87% accuracy.
  - Implement the majority class baseline. It gets 83%. Discuss: is 4% lift worth a model?
  - Implement a domain heuristic baseline. It gets 89%. The model lost.
  - Diagnose why: the model learned the heuristic imperfectly instead of the true signal.
  - Fix the problem framing. Retrain. The model now beats the heuristic by 12%.
  - Close with the rule: the baseline is your first hypothesis about what the problem is actually asking.

**Exercises:**
- 🔍 **[ANALYSIS]** Design a baseline ladder for three ML product features
  *You are given three vague product specifications: (1) a pitcher fatigue detection system, (2) a next-pitch recommendation for broadcast analysts, (3) an injury risk score for starting pitchers. For each feature, design a baseline ladder with at least three rungs: a trivial statistical baseline, a domain heuristic baseline, and a simple ML baseline. Estimate the cost and time to implement each rung. Argue which rung should be shipped first.*
  **Deliverables:**
  - Baseline ladder table for each of the three features
  - Cost and time estimate per rung
  - Ship-first recommendation with justification
  - Failure mode analysis: what does each baseline get wrong and how would you detect it in production?
  **Reflection prompts:**
  - For the injury risk score, what is the simplest possible statistical baseline and how good do you expect it to be?
  - At what point on the baseline ladder does a model become worth its maintenance overhead?
  - How would you communicate a 'baseline wins' result to a product manager who expected a neural network?

**Lesson quiz:**
- Q1: Your binary classifier achieves 92% accuracy. Your majority class baseline achieves 91.5%. What is the correct conclusion?
    The classifier is excellent and ready for deployment
    The 0.5% lift is probably real and worth deploying
  ✓ The classifier barely outperforms guessing the majority class, suggesting the problem may be trivially structured or the model is not learning useful signal
    The baseline is invalid because it does not use any features
  *→ A majority class baseline does not use any features. If a fully trained classifier only barely beats it, the classifier is likely not learning meaningful patterns — it may be exploiting the class imbalance rather than the signal.*
- Q2: Why is it important to evaluate baselines on the same train/test split as your ML model?
    Different splits make baselines run slower
  ✓ Comparing on different splits introduces data distribution differences that can make the baseline look worse or better than it really is, invalidating the comparison
    Baselines require the same training data as the model
    The evaluation metric changes with different splits
  *→ The whole point of the baseline comparison is to isolate the contribution of model complexity. Using different splits introduces a confounding variable (data distribution) that makes the comparison meaningless.*

  **Capstone task:** Revise the baseline ladder until each rung has a concrete evaluation plan that uses the same metric and split as the final model.

---

## 3. ML 101: Mathematical and Practical Foundations
**Timeframe:** 4-6 weeks  

A rigorous onboarding course for engineers who need to move from intuition to disciplined ML practice: framing problems, building baselines, understanding metrics, and shipping trustworthy experiments.

**Why it matters:** Most weak ML systems fail before model choice. They fail in framing, data splits, leakage, sloppy metrics, and a lack of honest baselines.

### Module 1: Problem Framing, Data, and Metrics
*Level: Beginner · Translate messy product ideas into testable ML problems and evaluate them honestly.*

#### Lesson 1: From Product Question to Learnable Objective
**Duration:** 90 min  
**Summary:** Map ambiguous requests into labels, targets, loss functions, and constraints while resisting the urge to optimize the wrong thing.

**Topics covered:**
- Distinguish prediction, ranking, anomaly detection, and generation tasks.
- Define labels, horizons, interventions, and feedback loops.
- Surface hidden costs: false positives, false negatives, latency, and operator burden.

**Key takeaways:**
- A good ML engineer starts by shrinking ambiguity, not by selecting a model family.
- Targets are product choices disguised as technical variables.

**Learning resources:**
- 🎬 **Andrew Ng - Machine Learning Specialization** *(by Andrew Ng on Coursera)* — Use a classical introduction to anchor task framing.
- 📝 **Internal lecture script: Framing ML like a systems engineer** *(internal lecture script)* — Generate a lecture outline you can later turn into slides or narration.
  - Open with three bad ML product pitches and diagnose why each is underspecified.
  - Convert one pitch into a target variable, data schema, and evaluation plan.
  - End with a checklist for whether the problem should be ML at all.

**Exercises:**
- 🔍 **[ANALYSIS]** Rewrite three vague AI features into measurable tasks
  *Take three feature ideas such as 'smart recommendations' or 'detect risky claims' and rewrite each into one primary metric, one guardrail metric, one failure mode, and one simplest non-ML baseline.*
  **Deliverables:**
  - A one-page task framing memo
  - A table of labels, metrics, and failure modes
  - A baseline recommendation for each feature
  **Reflection prompts:**
  - What would a no-model rules engine achieve first?
  - Which stakeholder pays the cost when the model is wrong?

**Lesson quiz:**
- Q1: Which is the strongest reason to prefer precision@k over accuracy for a moderation triage model?
    Accuracy is not differentiable
  ✓ Operators only review a fixed budget of top-ranked items
    Accuracy cannot be measured on imbalanced data
    Precision@k guarantees causal validity
  *→ If downstream review capacity is bounded, ranking quality in the reviewed slice matters more than global accuracy.*
- Q2: What is the cleanest signal that a proposed ML task may actually be a product policy problem?
    The model uses text embeddings
  ✓ Stakeholders cannot agree on labels or utility
    The dataset is larger than memory
    The baseline is logistic regression
  *→ Unclear labels often mean the organization has not decided what success means.*

  **Capstone task:** Rework the task framing memo until each objective has a clear label, metric, and operating constraint.

#### Lesson 2: Splits, Leakage, and Honest Baselines
**Duration:** 100 min  
**Summary:** Build the habit of distrusting early wins by stress-testing evaluation design before celebrating model performance.

**Topics covered:**
- Identify temporal leakage, target leakage, and post-treatment leakage.
- Pick split strategies for IID, time series, user-grouped, and panel data.
- Use dummy models, simple heuristics, and linear models as sanity checks.

**Key takeaways:**
- Evaluation pipelines fail more often from invalid data partitioning than from bad optimizers.
- A sophisticated model beating a weak baseline can still be a broken system.

**Learning resources:**
- 🎬 **StatQuest - Data Leakage and Train/Test Split** *(by Josh Starmer on YouTube)* — Reinforce practical leakage intuition.
- 📝 **Internal lecture script: Baselines as anti-self-deception** *(internal lecture script)* — Outline a lecture on how teams fool themselves with bad experiments.
  - Show a suspiciously strong model and trace the leakage source.
  - Compare a trivial heuristic to a complex model on a corrected split.
  - Discuss why baseline culture is a social habit, not just a technical step.

**Exercises:**
- 🧪 **[LAB]** Leakage audit on a synthetic churn dataset
  *Build a churn classifier twice: once with an intentionally leaky post-cancellation feature, once without it. Quantify the delta and document what changed.*
  **Deliverables:**
  - Notebook with both experiments
  - Leakage postmortem
  - Final baseline leaderboard
  **Reflection prompts:**
  - How would this leakage sneak into a real feature store?
  - Which offline metric changed the most after the leak was removed?

**Lesson quiz:**
- Q1: Why is a user-level grouped split preferable to a random row split in many recommendation tasks?
    It reduces GPU memory use
  ✓ It prevents the same user's behavior from leaking across train and test
    It always raises measured accuracy
    It makes calibration unnecessary
  *→ Without grouping, memorized user behavior can make offline performance look unrealistically strong.*
- Q2: What is the best role for a trivial heuristic baseline?
    It should replace train/test splits
    It proves the task is linearly separable
  ✓ It sets a floor that any credible ML system should beat honestly
    It eliminates the need for error analysis
  *→ Heuristic baselines are cheap reality checks, not full evaluations.*

  **Capstone task:** Re-run your experiment with stricter splits and at least two non-neural baselines.

### Module 2: Core Math and Optimization Intuition
*Level: Beginner · Learn the minimum math and optimization intuition an engineer needs to debug models instead of treating training as magic.*

#### Lesson 1: Linear Algebra, Probability, and Loss Functions That Actually Matter
**Duration:** 90 min  
**Summary:** Focus on vectors, matrices, expectations, variance, and objective functions from the perspective of implementation and debugging.

**Topics covered:**
- Interpret dot products, norms, and matrix multiplication in model pipelines.
- Understand expectation, variance, covariance, and conditional probability operationally.
- Connect MSE, cross-entropy, hinge, and ranking losses to system behavior.

**Key takeaways:**
- Math matters because it explains failure signatures and tradeoffs.
- Loss functions are product assumptions encoded as optimization targets.

**Learning resources:**
- 🎬 **3Blue1Brown - Essence of Linear Algebra** *(by 3Blue1Brown on YouTube)* — Refresh geometric intuition for vectors and transformations.
- 📝 **Internal lecture script: Why cross-entropy feels different from MSE** *(internal lecture script)* — Outline a conceptual walk-through of loss behavior.
  - Compare losses on easy and hard examples.
  - Show how confidence interacts with penalty shape.
  - Tie the penalty curve back to calibration and decision thresholds.

**Exercises:**
- 🧪 **[LAB]** Loss function stress test
  *Train two simple classifiers with different losses and compare their confidence distributions, calibration, and robustness to label noise.*
  **Deliverables:**
  - Training code and metric plots
  - Calibration comparison
  - A short memo on when each loss is preferable
  **Reflection prompts:**
  - What failure pattern appears first under noisy labels?
  - How does threshold movement change the ranking of the models?

**Lesson quiz:**
- Q1: Why is cross-entropy often preferred over MSE for classification?
    It uses fewer parameters
  ✓ It aligns better with probabilistic classification and penalizes overconfident errors sharply
    It makes train/test leakage impossible
    It guarantees fairness
  *→ Cross-entropy better reflects probability estimation and punishes confident mistakes more strongly.*
- Q2: What does variance capture in model evaluation?
    Only the number of features
  ✓ How much a statistic or model result changes across samples or perturbations
    Whether the model is causal
    The deployment latency
  *→ Variance tells you how unstable your estimate or model is under resampling or data shifts.*

  **Capstone task:** Review probability and loss geometry until you can explain both calibration and optimization behavior in plain language.

#### Lesson 2: Optimization, Generalization, and Error Analysis
**Duration:** 100 min  
**Summary:** Turn underfitting and overfitting into diagnosable engineering states rather than vague textbook terms.

**Topics covered:**
- Interpret learning curves and validation gaps.
- Use regularization, early stopping, and feature simplification to control generalization.
- Perform structured error analysis by cohort, slice, and root cause.

**Key takeaways:**
- Generalization is a pipeline property, not just a model property.
- Error analysis is where real engineering judgment starts.

**Learning resources:**
- 🎬 **Google ML Crash Course** *(by Google on Web)* — Use a concise reference for optimization and generalization fundamentals.
- 📝 **Internal lecture script: Error analysis as model debugging** *(internal lecture script)* — Define a methodical workflow for post-training investigation.
  - Bucket false positives and false negatives by semantic cause.
  - Separate data quality, representation, and objective issues.
  - Choose the next experiment based on the largest avoidable error bucket.

**Exercises:**
- 🔍 **[ANALYSIS]** Cohort-level error analysis review
  *Take a classifier with decent headline metrics and discover which user or content segments it consistently harms or mishandles.*
  **Deliverables:**
  - Slice metrics table
  - Top three error clusters
  - Next-experiment proposal grounded in error evidence
  **Reflection prompts:**
  - Which slices reveal blind spots hidden by the aggregate score?
  - Would more data, better labeling, or a different objective help most?

**Lesson quiz:**
- Q1: A training score keeps improving while validation degrades. What is the most likely diagnosis?
    The model is underfitting
    The data loader is broken
  ✓ The model is overfitting or the validation split is mismatched
    The loss is convex
  *→ A widening train/validation gap usually points to overfitting or evaluation mismatch.*
- Q2: What is the best first step after finding a severe failure on a specific cohort?
    Hide the cohort from reporting
    Replace the model with a larger one immediately
  ✓ Verify the slice, inspect examples, and trace the likely mechanism before changing architecture
    Tune the learning rate only
  *→ You need evidence about the mechanism before you can choose the right fix.*

  **Capstone task:** Repeat the slice analysis until you can articulate a prioritized fix plan tied to specific error buckets.

---

## 4. History of AI and Machine Learning
**Timeframe:** 2-3 weeks  

A critical history course on the cycles of optimism, winter, rebranding, and technical breakthroughs that shaped AI and ML through April 2026.

**Why it matters:** Engineers repeat old mistakes when they forget the field's history: symbolic brittleness, benchmark theater, compute fetishism, and hype without evaluation.

### Module 1: From Symbolic AI to Statistical Learning
*Level: Beginner · Understand why early AI systems were impressive, brittle, and ultimately constrained.*

#### Lesson 1: Cybernetics, Symbolic AI, Expert Systems, and the First Winters
**Duration:** 80 min  
**Summary:** Trace the rise of symbolic reasoning, the promise of knowledge engineering, and the hard limits exposed by scaling, uncertainty, and brittle rules.

**Topics covered:**
- Read the Dartmouth framing of AI and the optimism it created.
- Contrast symbolic planning and expert systems with real-world uncertainty.
- Explain why maintenance costs and brittleness helped drive AI winters.

**Key takeaways:**
- Expert systems were not foolish; they solved the wrong scaling regime.
- Brittleness and knowledge capture remain live issues in modern agents.

**Learning resources:**
- 📝 **Internal lecture script: Why expert systems worked until they didn't** *(internal lecture script)* — Turn history into engineering heuristics.
  - Reconstruct a simple expert system and show its local strengths.
  - Demonstrate brittleness under slight distribution change.
  - Connect knowledge engineering debt to modern prompt and tool maintenance debt.

**Exercises:**
- 🔍 **[ANALYSIS]** Postmortem an expert system
  *Choose a classic expert system and write a technical postmortem: what assumptions made it viable, what distribution shifts broke it, and what a modern replacement would keep or discard.*
  **Deliverables:**
  - Historical summary
  - Failure taxonomy
  - Modern redesign proposal
  **Reflection prompts:**
  - Which assumptions were actually reasonable at the time?
  - Which failure patterns still show up in LLM toolchains?

**Lesson quiz:**
- Q1: What was a core weakness of classic expert systems?
    They required too little domain knowledge
  ✓ They struggled to handle uncertainty, novelty, and maintenance at scale
    They could not run on CPUs
    They always underfit small datasets
  *→ The brittleness and maintenance burden of hand-authored rules were central weaknesses.*
- Q2: Why should a modern ML engineer care about the AI winters?
    They prove neural networks are wrong
  ✓ They show how hype outruns generalization, infrastructure, and evaluation discipline
    They explain compiler design
    They imply all AI funding should stop
  *→ The winters are reminders that performance demos do not equal durable capability.*

  **Capstone task:** Review how brittle symbolic assumptions map to current tool-use and prompt-maintenance issues.

#### Lesson 2: The Probabilistic Turn and the Rise of Empirical ML
**Duration:** 90 min  
**Summary:** Study the shift toward data-driven inference, statistical learning theory, and benchmark-driven progress.

**Topics covered:**
- Explain why probabilistic models and empirical evaluation became dominant.
- Understand the role of VC-style thinking, regularization, and benchmark datasets.
- See how the field moved from handcrafted knowledge to learned representations.

**Key takeaways:**
- The statistical turn made uncertainty and generalization central.
- Benchmarks accelerated progress but also encouraged narrow optimization.

**Learning resources:**
- 🎬 **CS229 lectures** *(by Stanford on Course videos)* — Use a canonical bridge from classical statistics to ML practice.

**Exercises:**
- 📌 **[PAPER-REVIEW]** Benchmark critique memo
  *Choose a landmark benchmark and critique what it measured well, what it hid, and how it shaped the field's incentives.*
  **Deliverables:**
  - Benchmark summary
  - Incentive analysis
  - A redesigned evaluation proposal
  **Reflection prompts:**
  - What did leaderboard pressure optimize for?
  - Which real-world capability was missing from the benchmark?

**Lesson quiz:**
- Q1: What did the probabilistic turn add that symbolic AI often lacked?
  ✓ A way to represent uncertainty and learn from data
    The ability to write code
    Guaranteed causal inference
    Freedom from benchmarks
  *→ Probabilistic modeling introduced uncertainty-aware inference and empirical learning from data.*
- Q2: What is a major risk of benchmark-driven progress?
    It makes reproducibility impossible
  ✓ It can reward narrow optimization that does not transfer to deployment reality
    It removes the need for theory
    It eliminates bias
  *→ Benchmarks are useful but can distort incentives when treated as the goal rather than a measurement tool.*

  **Capstone task:** Revisit benchmark history with a focus on incentive design, not just performance numbers.

### Module 2: Deep Learning, Foundation Models, and the 2026 Lens
*Level: Advanced · Critically evaluate what changed after GPUs, large datasets, transformers, and agentic systems became central.*

#### Lesson 1: Why Deep Learning Won
**Duration:** 90 min  
**Summary:** Analyze the convergence of data availability, compute, architectures, optimization tricks, and software ecosystems that made deep learning dominant.

**Topics covered:**
- Study the ImageNet era and representation learning shift.
- Understand why compute and data pipelines mattered as much as architecture insight.
- Learn the role of frameworks and hardware in accelerating research translation.

**Key takeaways:**
- Deep learning won through systems leverage as much as through math.
- Scale changed what was feasible, but not every scaling claim generalizes cleanly.

**Learning resources:**
- 🎬 **Fast.ai Practical Deep Learning** *(by fast.ai on Course videos)* — Anchor deep learning progress in practical implementation.

**Exercises:**
- 🔍 **[ANALYSIS]** Timeline of deep learning enablers
  *Create a timeline showing how GPUs, datasets, frameworks, regularization advances, and architectural changes interacted to make deep learning practical.*
  **Deliverables:**
  - Annotated timeline
  - One-page causal narrative
  - Counterfactual analysis of which enabler mattered most
  **Reflection prompts:**
  - Would transformers have mattered without modern data/compute stacks?
  - Which enabling factor is most underrated in popular histories?

**Lesson quiz:**
- Q1: Which statement best explains deep learning's rise?
    One architecture alone solved intelligence
  ✓ Progress came from the interaction of scale, optimization, software, hardware, and data
    Symbolic AI disappeared overnight
    Benchmarks became unnecessary
  *→ The rise was systemic, not attributable to a single isolated breakthrough.*
- Q2: Why is software infrastructure part of AI history?
    Because model code has no effect on research velocity
  ✓ Because frameworks and accelerators lowered iteration cost and widened access
    Because history only concerns algorithms
    Because infrastructure makes data irrelevant
  *→ Infrastructure changes what researchers and engineers can practically try.*

  **Capstone task:** Review deep learning history through a systems lens rather than a single-paper lens.

#### Lesson 2: Foundation Models, Agents, and Critical Perspectives Through 2026
**Duration:** 100 min  
**Summary:** Place transformers, LLMs, multimodal systems, retrieval, and agents in historical context and separate durable capability from theater.

**Topics covered:**
- Trace the transformer to foundation-model pipeline.
- Study the return of tool use, memory, and planning in agent systems.
- Critique hallucination, evaluation gaps, data provenance issues, and deployment economics.

**Key takeaways:**
- Modern systems reintroduce old AI questions under a new statistical interface.
- An ML engineer in 2026 must reason about evaluation, retrieval quality, latency, and governance together.

**Learning resources:**
- 🎬 **Full Stack Deep Learning** *(by Full Stack Deep Learning on Course videos)* — Bridge model advances to real-world systems concerns.
- 📝 **Internal lecture script: The return of symbolic problems inside LLM systems** *(internal lecture script)* — Connect modern agent systems to older AI debates.
  - Show how tool use reintroduces planning and verification problems.
  - Compare retrieval and external memory to earlier knowledge engineering goals.
  - End with a framework for identifying 'demo intelligence' vs durable capability.

**Exercises:**
- 📌 **[PAPER-REVIEW]** Hype audit: one modern AI product claim
  *Select a 2025-2026 AI product claim, reconstruct the likely underlying system, identify hidden dependencies, and evaluate whether the claim represents progress, packaging, or benchmark leakage.*
  **Deliverables:**
  - System diagram
  - Capability vs constraint analysis
  - Evaluation critique
  **Reflection prompts:**
  - What part is actual model capability versus retrieval, UX, or human review?
  - Which missing benchmark would most likely break the claim?

**Lesson quiz:**
- Q1: What is a recurring historical pattern in AI progress?
  ✓ Strong demos are often mistaken for robust general capability
    Compute never matters
    Evaluation always keeps pace with deployment
    Old ideas never return
  *→ History repeatedly shows that showcase performance can outrun reliability and understanding.*
- Q2: Why is retrieval important in the foundation-model era?
    It removes the need for evaluation
  ✓ It externalizes knowledge access and changes quality bottlenecks from raw model memory to context quality and ranking
    It guarantees truthfulness
    It makes tool use obsolete
  *→ Retrieval shifts system quality toward indexing, ranking, and context-grounding performance.*

  **Capstone task:** Tie current LLM and agent claims back to older issues around grounding, reasoning, and maintainability.

---

## 5. Classical ML and Statistical Learning for Engineers
**Timeframe:** 5-7 weeks  

A deep course on linear models, trees, boosting, calibration, ranking, feature engineering, and model selection that prevents engineers from skipping directly to deep nets where simpler methods dominate.

**Why it matters:** Production ML still leans heavily on classical methods for tabular data, ranking, calibrated prediction, and interpretable decision support.

### Module 1: Linear Models, Sparse Features, and Calibration
*Level: Advanced · Master models that remain essential for tabular and sparse high-dimensional systems.*

#### Lesson 1: Linear and Logistic Regression Beyond the Textbook
**Duration:** 100 min  
**Summary:** Study linear models as reliable workhorses: regularization, interpretability limits, thresholding, calibration, and failure under interaction-heavy problems.

**Topics covered:**
- Use L1/L2 regularization and understand its operational effect.
- Connect coefficients to directional influence without overclaiming causality.
- Calibrate probabilities and pick thresholds using business constraints.

**Key takeaways:**
- Linear models are strong baselines because they fail in understandable ways.
- Calibration is often more important than squeezing out a tiny AUC improvement.

**Learning resources:**
- 🎬 **StatQuest - Logistic Regression** *(by Josh Starmer on YouTube)* — Refresh the mechanics and intuition of logistic models.

**Exercises:**
- 🧪 **[LAB]** Calibration and thresholding lab
  *Train a logistic model, then calibrate it with Platt scaling or isotonic regression. Select thresholds for three different operating constraints.*
  **Deliverables:**
  - Calibration plot
  - Threshold policy memo
  - Comparison against an uncalibrated baseline
  **Reflection prompts:**
  - What business choice is encoded by each threshold?
  - How does calibration change trust in downstream automation?

**Lesson quiz:**
- Q1: Why can a model with strong ROC-AUC still be operationally weak?
    ROC-AUC is only for regression
  ✓ Good ranking does not guarantee well-calibrated probabilities or a suitable threshold policy
    ROC-AUC measures latency only
    ROC-AUC prevents feature engineering
  *→ Ranking quality and probability quality are different properties.*
- Q2: What does L1 regularization often encourage?
    Denser feature usage
  ✓ Sparser solutions that can aid feature selection
    Guaranteed causal coefficients
    Perfect calibration
  *→ L1 tends to drive some coefficients to zero, encouraging sparsity.*

  **Capstone task:** Revisit calibration and thresholding until you can defend a decision policy under operational constraints.

#### Lesson 2: Feature Engineering, Interaction Effects, and Honest Interpretation
**Duration:** 95 min  
**Summary:** Build feature pipelines that help without creating leakage, interpretation theater, or unsustainable complexity.

**Topics covered:**
- Use transformations, cross-features, and sensible encodings.
- Detect when interaction-heavy data is stretching linear assumptions too far.
- Separate helpful interpretation from unjustified causal narratives.

**Key takeaways:**
- Feature engineering is domain modeling, not spreadsheet decoration.
- Interpretability claims weaken quickly when features are correlated, transformed, or policy-entangled.

**Learning resources:**
- 📝 **Internal lecture script: Feature engineering as theory of the domain** *(internal lecture script)* — Teach when manual features still outperform brute-force scaling.
  - Start with weak raw features and identify domain-informed transformations.
  - Show one interaction term that matters and one that leaks policy information.
  - Explain why interpretability is conditional on feature design choices.

**Exercises:**
- 🧪 **[LAB]** Tabular feature ablation study
  *Construct a feature pipeline for a tabular problem, then ablate each feature family and document where performance and calibration move.*
  **Deliverables:**
  - Pipeline code
  - Ablation table
  - Interpretation memo with caveats
  **Reflection prompts:**
  - Which feature family carries the real signal?
  - Which features look interpretable but are proxies for hidden policy variables?

**Lesson quiz:**
- Q1: What is the clearest warning sign that a model explanation may be misleading?
    The model uses fewer than 100 features
  ✓ Features are correlated, transformed, or post-treatment but explanations are presented as causal facts
    The loss is convex
    The training loop converged
  *→ Explanations become fragile when the feature pipeline itself entangles mechanisms and proxies.*
- Q2: Why are ablation studies valuable?
    They replace the test set
  ✓ They identify which components actually contribute signal and robustness
    They guarantee fairness
    They prevent concept drift
  *→ Ablations expose whether complexity is earning its keep.*

  **Capstone task:** Repeat the ablation until your explanation claims are narrower and better supported.

### Module 2: Trees, Boosting, Ranking, and Retrieval Foundations
*Level: Advanced · Understand high-performance non-neural systems that power large fractions of real production ML.*

#### Lesson 1: Decision Trees, Random Forests, and Gradient Boosting
**Duration:** 105 min  
**Summary:** Learn why boosted trees dominate many tabular competitions and production systems, and where they break under drift, imbalance, or missing semantics.

**Topics covered:**
- Understand bias/variance behavior across tree ensembles.
- Tune depth, learning rate, and sampling without leaderboard superstition.
- Interpret gain-based importance cautiously and compare with permutation tests.

**Key takeaways:**
- Boosted trees are often the correct default for structured tabular problems.
- Their power can hide data quality issues and extrapolation weakness.

**Learning resources:**
- 🎬 **XGBoost documentation and tutorials** *(by XGBoost on Web)* — Connect ensemble theory to practical implementation.

**Exercises:**
- 🧪 **[LAB]** Gradient boosting under distribution shift
  *Train a boosted tree model on a stable slice, then evaluate it under a shifted slice. Document which features fail to extrapolate and propose mitigations.*
  **Deliverables:**
  - Training notebook
  - Shift analysis
  - Mitigation plan
  **Reflection prompts:**
  - Which feature interactions were overfit to the training regime?
  - Would monotonic constraints, simpler features, or retraining cadence help more?

**Lesson quiz:**
- Q1: Why do boosted trees often outperform linear models on tabular data?
  ✓ They can capture nonlinear interactions with little manual feature construction
    They make train/test splits unnecessary
    They never overfit
    They provide causal guarantees
  *→ Trees naturally model interactions and nonlinearities that linear models must be hand-engineered to capture.*
- Q2: What is a major weakness of many tree ensembles?
    They cannot handle tabular data
  ✓ They extrapolate poorly outside the observed training regime
    They do not support classification
    They are always slower than deep nets
  *→ Tree models can be strong interpolators but weak extrapolators under shift.*

  **Capstone task:** Compare tree-based models and linear models under drift, not just static validation.

#### Lesson 2: Ranking, Retrieval, and Candidate Generation Before LLMs
**Duration:** 90 min  
**Summary:** Study the ranking and retrieval foundations that still matter in search, recommenders, ads, and modern RAG pipelines.

**Topics covered:**
- Understand candidate generation, scoring, re-ranking, and offline ranking metrics.
- Learn why retrieval quality can dominate system quality.
- Connect classical ranking infrastructure to modern vector retrieval systems.

**Key takeaways:**
- Retrieval pipelines are ML systems even when the final model is not a giant neural net.
- RAG quality depends on ranking fundamentals as much as on generator quality.

**Learning resources:**
- 📝 **Internal lecture script: Ranking systems before and after transformers** *(internal lecture script)* — Create a bridge from ads/search systems to RAG.
  - Walk through a two-stage ranker.
  - Map classical ranking metrics to RAG retrieval metrics.
  - Explain why bad candidates doom the generator.

**Exercises:**
- 📌 **[SYSTEMS-DESIGN]** Build a two-stage retrieval pipeline
  *Design a retrieval pipeline with a cheap candidate generator and a richer reranker. Include latency budgets, evaluation metrics, and failure cases.*
  **Deliverables:**
  - Architecture diagram
  - Metric plan
  - Latency and cost budget
  **Reflection prompts:**
  - Where does recall die first?
  - What metrics reveal retrieval failure before users do?

**Lesson quiz:**
- Q1: Why are candidate generation errors especially dangerous?
    Because rerankers can always recover missed documents
  ✓ Because missed candidates are invisible to downstream stages
    Because they only affect latency
    Because they improve fairness automatically
  *→ If the right item never enters the candidate set, later stages cannot rescue it.*
- Q2: Which idea transfers directly from classic ranking systems to RAG?
  ✓ Context quality depends heavily on recall and ranking quality
    Generative models eliminate candidate generation
    Offline metrics are never useful
    Approximate search removes all system tradeoffs
  *→ RAG still lives or dies by retrieval quality and candidate coverage.*

  **Capstone task:** Strengthen your ranking intuition before treating retrieval as a solved subroutine.

---

## 6. Deep Learning and Representation Engineering
**Timeframe:** 6-8 weeks  

A systems-minded deep learning course covering optimization, architectures, embeddings, transformers, and the engineering discipline needed to train and debug modern neural models.

**Why it matters:** Neural systems dominate perception, language, multimodality, and large-scale representation learning, but they punish shallow understanding with expensive failures.

### Module 1: Optimization and Representation Learning
*Level: Advanced · Build the optimization intuition needed to train real neural networks without superstition.*

#### Lesson 1: Backpropagation, Initialization, and Training Instability
**Duration:** 110 min  
**Summary:** Understand gradient flow, exploding and vanishing gradients, normalization, initialization, and why your model sometimes collapses for reasons unrelated to architecture novelty.

**Topics covered:**
- Trace gradients through layered computation graphs.
- Study initialization and normalization as stability tools.
- Use diagnostics for exploding gradients, dead activations, and optimizer mismatch.

**Key takeaways:**
- Training failure is often a systems problem in disguise: scale, initialization, data order, or numeric precision.
- You do not understand a neural model until you can explain how it fails to train.

**Learning resources:**
- 🎬 **Andrej Karpathy - Neural Networks: Zero to Hero** *(by Andrej Karpathy on YouTube)* — Ground modern deep learning intuition in implementation.

**Exercises:**
- 📌 **[DEBUGGING]** Training instability debugging notebook
  *Intentionally destabilize a neural training run using poor initialization, high learning rate, and no normalization. Recover it step by step and document the signal from each diagnostic.*
  **Deliverables:**
  - Notebook with failure and repair phases
  - Gradient/statistics dashboard
  - Debugging narrative
  **Reflection prompts:**
  - Which metrics told you the model was sick before loss diverged visibly?
  - Which fixes improved stability but hurt generalization?

**Lesson quiz:**
- Q1: Why does poor initialization matter in deep networks?
    It changes the GPU driver version
  ✓ It can destroy gradient flow and make early training unstable or stagnant
    It removes the need for normalization
    It only affects inference latency
  *→ Initialization shapes activation and gradient scales before learning has any chance to help.*
- Q2: What is a useful first move when loss becomes NaN during training?
    Increase model width only
  ✓ Inspect gradients, learning rate, normalization, and numerical precision
    Delete the validation set
    Add more dropout blindly
  *→ NaNs are often numerical or optimization-pathology signals that require direct inspection.*

  **Capstone task:** Repeat the debugging notebook until you can connect each failure signature to a likely mechanism.

#### Lesson 2: Embeddings, Contrastive Learning, and Representation Quality
**Duration:** 100 min  
**Summary:** Study how embeddings become useful, what geometry tells you, and why representation quality depends on the task, objective, and negative sampling strategy.

**Topics covered:**
- Interpret embedding spaces and retrieval behavior.
- Understand contrastive learning, triplet loss, and negative selection.
- Evaluate representations through probing, retrieval, clustering, and transfer tasks.

**Key takeaways:**
- Embeddings are interfaces between tasks, not magic semantic objects.
- A good embedding for retrieval may be a weak one for calibration or fine-grained classification.

**Learning resources:**
- 🎬 **Hugging Face Course** *(by Hugging Face on Course)* — Anchor embedding practice in modern NLP tooling.
- 📝 **Internal lecture script: What makes an embedding useful?** *(internal lecture script)* — Design a lecture around geometric intuition and task dependence.
  - Visualize neighborhoods that look semantic but fail on retrieval.
  - Compare cosine similarity with downstream supervised performance.
  - End with an evaluation matrix for representation quality.

**Exercises:**
- 🧪 **[LAB]** Embedding evaluation suite
  *Generate embeddings for a small text or image dataset and compare them across retrieval, clustering, and simple linear probe tasks.*
  **Deliverables:**
  - Embedding generation code
  - Three evaluation views
  - A memo on which tasks the representation is actually good at
  **Reflection prompts:**
  - Does neighborhood coherence imply downstream usefulness?
  - What evaluation would expose representational collapse earliest?

**Lesson quiz:**
- Q1: Why are hard negatives important in contrastive learning?
    They reduce disk usage
  ✓ They force the representation to learn more discriminative boundaries than trivial negatives provide
    They eliminate the need for evaluation
    They guarantee causality
  *→ Hard negatives prevent the task from becoming too easy and semantically uninformative.*
- Q2: What is a healthy attitude toward embedding quality?
    Assume one embedding is universally good for every downstream task
  ✓ Evaluate representation quality against the actual downstream task family and failure modes
    Use only t-SNE screenshots
    Ignore calibration and retrieval quality
  *→ Embedding usefulness is task-relative and should be measured across relevant downstream behaviors.*

  **Capstone task:** Strengthen your representation evaluation beyond visualization and anecdotal retrieval examples.

### Module 2: CNNs, Transformers, and Practical Scaling
*Level: Advanced · Understand why architecture choices matter and when scaling helps or hurts.*

#### Lesson 1: Architectures That Matter: CNNs, Sequence Models, and Transformers
**Duration:** 110 min  
**Summary:** Learn what inductive biases each architecture buys, why transformers became dominant, and where specialized structures still outperform generic sequence models.

**Topics covered:**
- Compare convolutional locality priors with attention-based flexibility.
- Understand sequence bottlenecks in RNNs and the parallelism advantage of transformers.
- Choose architectures by modality, latency, and data regime rather than trend.

**Key takeaways:**
- Architectures are bets about what structure matters and what compute you can afford.
- Transformer dominance does not make every prior obsolete.

**Learning resources:**
- 🎬 **Annotated Transformer** *(by Harvard NLP on Web)* — Bridge theoretical transformer mechanics to implementation.

**Exercises:**
- 📌 **[SYSTEMS-DESIGN]** Architecture choice memo
  *Given three product scenarios, choose an architecture family for each and defend the decision using data regime, latency, interpretability, and update cadence.*
  **Deliverables:**
  - Architecture comparison matrix
  - Per-scenario recommendation
  - Risk register for each choice
  **Reflection prompts:**
  - What bias or structure does each model encode?
  - When would a simpler architecture outperform a larger transformer?

**Lesson quiz:**
- Q1: Why did transformers scale so effectively in language?
    They made data unnecessary
  ✓ Their attention mechanism and training parallelism paired well with large-scale compute and corpora
    They guarantee reasoning
    They remove hallucination by design
  *→ Transformers fit the hardware and data regime of large-scale sequence learning unusually well.*
- Q2: When might a transformer not be the best default?
  ✓ When local inductive bias, latency, or limited data make a more structured model preferable
    Never
    Only when labels are unavailable
    Only in reinforcement learning
  *→ Architecture should follow constraints, not fashion.*

  **Capstone task:** Review architectural tradeoffs until you can defend a non-transformer choice without embarrassment.

#### Lesson 2: Scaling Laws, Fine-Tuning, and Inference Tradeoffs
**Duration:** 100 min  
**Summary:** Study the engineering economics of neural systems: batch size, memory, quantization, fine-tuning methods, and where scale stops paying clean dividends.

**Topics covered:**
- Connect scaling trends to compute budgets and deployment latency.
- Compare full fine-tuning, adapters, LoRA-style methods, and prompt-based adaptation.
- Understand quantization and serving tradeoffs.

**Key takeaways:**
- The best model is not the largest model; it is the one whose capability-cost-reliability profile matches the job.
- Fine-tuning strategy is a product decision dressed as optimization.

**Learning resources:**
- 🎬 **Full Stack Deep Learning - LLMs and deployment** *(by Full Stack Deep Learning on Course videos)* — Bridge training choices to serving reality.

**Exercises:**
- 🔍 **[ANALYSIS]** Model selection under budget constraints
  *Compare three hypothetical model serving plans across quality, latency, VRAM, and tuning effort. Recommend one for a real product scenario.*
  **Deliverables:**
  - Cost-quality matrix
  - Recommendation memo
  - Rollback and monitoring plan
  **Reflection prompts:**
  - What metric would justify stepping up to a larger model?
  - What failure mode gets worse as you quantize or distill?

**Lesson quiz:**
- Q1: Why is model scaling not a free lunch?
  ✓ Bigger models often increase cost, latency, and operational fragility even when quality rises
    Scaling always reduces capability
    Scaling makes monitoring irrelevant
    Bigger models cannot be fine-tuned
  *→ Quality gains must be weighed against operational and economic constraints.*
- Q2: What is a strong reason to use parameter-efficient fine-tuning?
    It always beats full fine-tuning in every regime
  ✓ It reduces adaptation cost and infrastructure burden when full updates are unnecessary
    It removes the need for evaluation
    It guarantees no catastrophic forgetting
  *→ PEFT methods can be the right tradeoff when infrastructure and iteration cost dominate.*

  **Capstone task:** Rework your cost-quality analysis until you can defend the choice financially and technically.

---

## 7. ML Systems, MLOps, and Production Reliability
**Timeframe:** 5-7 weeks  

A production engineering course on data pipelines, feature stores, experiment tracking, CI/CD for models, observability, and failure management.

**Why it matters:** A model without data contracts, observability, and rollback discipline is a demo. Production ML is mostly software, data, and operational rigor.

### Module 1: Data Contracts, Features, and Experimentation
*Level: Advanced · Build the data and experimentation spine that every production ML system needs.*

#### Lesson 1: Data Pipelines, Feature Stores, and Offline-Online Consistency
**Duration:** 95 min  
**Summary:** Learn how features are created, versioned, validated, and served without quietly drifting away from the training environment.

**Topics covered:**
- Design feature computation with reproducibility and freshness in mind.
- Understand point-in-time correctness and feature leakage in feature stores.
- Detect offline-online skew and data contract violations early.

**Key takeaways:**
- Feature engineering becomes an infrastructure problem as soon as you need consistency and reuse.
- Point-in-time correctness is non-negotiable in any serious prediction system.

**Learning resources:**
- 🎬 **Chip Huyen - Designing ML Systems** *(by Chip Huyen on Talks / book material)* — Bridge data pipelines to deployed ML.

**Exercises:**
- 📌 **[SYSTEMS-DESIGN]** Point-in-time feature design review
  *Design features for a fraud or churn model and prove how each feature will be computed consistently in both training and serving.*
  **Deliverables:**
  - Feature spec
  - Point-in-time correctness checklist
  - Offline-online skew detection plan
  **Reflection prompts:**
  - Which feature is most likely to leak future information?
  - How would you version a feature whose business definition changes?

**Lesson quiz:**
- Q1: What does point-in-time correctness protect against?
    GPU memory fragmentation
  ✓ Training on information that would not have been available at prediction time
    Model compression loss
    Prompt injection
  *→ It prevents hidden future information from contaminating feature computation.*
- Q2: Why is offline-online skew dangerous?
    Because it makes Python slower
  ✓ Because the model is effectively trained and served on different feature definitions or distributions
    Because it increases batch size
    Because it forces you to use deep learning
  *→ Skew breaks the assumptions behind offline evaluation and causes silent deployment regressions.*

  **Capstone task:** Trace your feature lineage until you can show exactly how each feature is produced in both environments.

#### Lesson 2: Experiment Tracking, Reproducibility, and Release Discipline
**Duration:** 90 min  
**Summary:** Turn experimentation from notebook chaos into disciplined engineering with artifacts, configs, lineage, and release criteria.

**Topics covered:**
- Track data versions, code versions, parameters, and metrics together.
- Define reproducible training runs and promotion criteria.
- Build release checklists that combine model quality and operational readiness.

**Key takeaways:**
- If you cannot reproduce a run, you do not have a system; you have a rumor.
- Promotion criteria must include business and operational risk, not just offline score deltas.

**Learning resources:**
- 📝 **Internal lecture script: From notebook archaeology to experiment lineage** *(internal lecture script)* — Teach experiment rigor as software engineering.
  - Compare an irreproducible notebook with a tracked run.
  - List the metadata required to recreate a model exactly.
  - Define a promotion checklist that includes rollback criteria.

**Exercises:**
- 🔍 **[ANALYSIS]** Experiment lineage template
  *Design a template for experiment tracking that captures code revision, dataset fingerprint, environment, hyperparameters, metrics, artifacts, and sign-off status.*
  **Deliverables:**
  - Tracking schema
  - Promotion checklist
  - Example run record
  **Reflection prompts:**
  - Which missing field would be most likely to cause an irreproducible release?
  - What evidence is needed before promotion to production?

**Lesson quiz:**
- Q1: What is a strong indicator that an experiment tracking setup is insufficient?
    It stores too many metrics
  ✓ You cannot recreate a released model from versioned code, data, and config
    It uses cloud storage
    It logs latency
  *→ Reproducibility is the baseline requirement for any serious experiment system.*
- Q2: Why should release criteria include operational metrics?
    Because accuracy makes latency irrelevant
  ✓ Because a model that wins offline can still fail on latency, cost, or observability requirements
    Because release checklists are only for auditors
    Because operations teams choose the loss function
  *→ Production viability is broader than offline predictive quality.*

  **Capstone task:** Strengthen your release checklist until it blocks unsafe promotions for non-model reasons too.

### Module 2: Monitoring, Drift, and Incident Response
*Level: Advanced · Operate ML services as living systems rather than static artifacts.*

#### Lesson 1: Drift, Label Delay, and Service Health
**Duration:** 95 min  
**Summary:** Monitor models when labels are delayed, data shifts are messy, and failures emerge long before traditional accuracy numbers catch them.

**Topics covered:**
- Distinguish data drift, concept drift, and metric drift.
- Use proxy metrics, slice metrics, and retrieval diagnostics under label delay.
- Connect health checks to alerting and rollback choices.

**Key takeaways:**
- Production monitoring without label realism is wishful thinking.
- Proxy metrics should be explicit stopgaps, not permanent substitutes for truth.

**Learning resources:**
- 🎬 **Google SRE / ML reliability talks** *(by Google on Talks)* — Bridge model health to reliability engineering.

**Exercises:**
- 📌 **[SYSTEMS-DESIGN]** Monitoring spec for a delayed-label system
  *Design a monitoring plan for a system where true labels arrive weeks later. Include proxies, alerts, slice metrics, and escalation rules.*
  **Deliverables:**
  - Monitoring spec
  - Alert thresholds
  - Fallback and rollback plan
  **Reflection prompts:**
  - Which proxy is most likely to drift away from the real objective?
  - What triggers an emergency rollback before labels arrive?

**Lesson quiz:**
- Q1: Why is delayed-label monitoring hard?
    Because models stop producing predictions
  ✓ Because the most meaningful quality signal arrives too late to support immediate incident response
    Because drift disappears
    Because feature stores become unnecessary
  *→ You need interim proxies and operational heuristics before the ground truth catches up.*
- Q2: What is concept drift?
    A GPU memory leak
  ✓ A change in the relationship between inputs and the target or decision outcome
    A stable data schema
    A model export format
  *→ Concept drift changes the predictive mapping itself, not just the feature distribution.*

  **Capstone task:** Review drift types until you can map each alert to a plausible causal mechanism.

#### Lesson 2: Incident Response, Human Override, and Safe Rollback
**Duration:** 85 min  
**Summary:** Learn how to respond when model behavior becomes unsafe, expensive, biased, or operationally unstable.

**Topics covered:**
- Design kill switches, shadow mode, and safe fallback paths.
- Write ML-specific incident playbooks and postmortems.
- Integrate human review and escalation without hiding systemic problems.

**Key takeaways:**
- Rollback is a product feature, not an admission of failure.
- Human review should absorb uncertainty, not mask unknown model breakage indefinitely.

**Learning resources:**
- 📝 **Internal lecture script: ML incident command** *(internal lecture script)* — Teach incident response for model-driven systems.
  - Walk through a model regression from detection to rollback.
  - Define owners, telemetry, and evidence needed during triage.
  - End with a postmortem template focused on systemic fixes.

**Exercises:**
- 🔍 **[ANALYSIS]** Write an ML incident playbook
  *Author a playbook for one high-risk model including triggers, severity levels, fallback behavior, communication paths, and recovery validation.*
  **Deliverables:**
  - Incident playbook
  - Rollback checklist
  - Postmortem template
  **Reflection prompts:**
  - What evidence is enough to rollback before root cause is known?
  - How do you stop human override from becoming permanent technical debt?

**Lesson quiz:**
- Q1: What is a strong reason to maintain a non-ML fallback path?
    It removes the need for monitoring
  ✓ It gives the product a safer degraded mode when the model becomes unreliable or unavailable
    It guarantees better accuracy
    It replaces incident response
  *→ Fallback paths preserve service continuity under uncertainty or outage.*
- Q2: Why should ML postmortems focus on systems, not blame?
    Because models fail randomly
  ✓ Because lasting reliability comes from fixing data, process, tooling, and ownership gaps
    Because root cause does not matter
    Because only leadership should read them
  *→ Blameless postmortems improve the system that allowed the incident to happen.*

  **Capstone task:** Refine the playbook until it is executable by someone other than the original author.

---

## 8. LLMs, Retrieval, and Agentic Systems
**Timeframe:** 6-8 weeks  

A practical and critical course on LLM architectures, prompting, retrieval, fine-tuning, evaluation, tool use, and the engineering realities of agentic systems in 2026.

**Why it matters:** Modern ML engineering increasingly means building model-plus-system stacks where retrieval, orchestration, evaluation, and cost management matter as much as the model itself.

### Module 1: Retrieval-Augmented Generation and Grounded Reasoning
*Level: Advanced · Treat RAG as a retrieval and evaluation problem first, not a prompt template problem.*

#### Lesson 1: RAG Architecture, Indexing, and Context Quality
**Duration:** 100 min  
**Summary:** Learn the true bottlenecks of RAG: chunking, indexing, recall, re-ranking, context packing, and grounding verification.

**Topics covered:**
- Compare lexical, dense, and hybrid retrieval.
- Choose chunking and metadata strategies based on task and document structure.
- Measure context quality using retrieval-level and answer-level metrics.

**Key takeaways:**
- Most RAG failures begin before generation starts.
- Chunking is a representation decision, not an implementation footnote.

**Learning resources:**
- 🎬 **LangChain / LlamaIndex ecosystem talks** *(by Various on Talks)* — Survey common RAG building blocks with a critical eye.
- 📝 **Internal lecture script: Debugging a bad RAG stack** *(internal lecture script)* — Build a lecture around failure decomposition.
  - Start with a wrong answer and trace the failure to retrieval, chunking, or synthesis.
  - Measure context relevance and citation grounding separately.
  - Close with a checklist for shipping RAG without self-deception.

**Exercises:**
- 📌 **[DEBUGGING]** RAG failure decomposition lab
  *Build a small RAG system and analyze at least ten failure cases by assigning each to chunking, retrieval, reranking, prompt construction, or synthesis.*
  **Deliverables:**
  - Failure case log
  - Retrieval metrics
  - Fix prioritization memo
  **Reflection prompts:**
  - How many failures were really generator problems?
  - Which change improved groundedness most per unit of latency or cost?

**Lesson quiz:**
- Q1: What is the most dangerous misconception in RAG engineering?
    That retrieval quality heavily influences final answer quality
  ✓ That prompt wording alone can compensate for weak retrieval and context selection
    That chunking matters
    That latency is a constraint
  *→ Prompt tuning cannot reliably rescue missing or poor-quality evidence.*
- Q2: Why is hybrid retrieval often attractive?
  ✓ It combines semantic and lexical strengths to improve recall across heterogeneous queries
    It removes the need for reranking
    It guarantees faithfulness
    It makes embeddings unnecessary
  *→ Dense and lexical signals often fail in complementary ways.*

  **Capstone task:** Revisit retrieval evaluation until you can explain answer failures without defaulting to 'the model hallucinated.'

#### Lesson 2: Evaluation for LLM and RAG Systems
**Duration:** 95 min  
**Summary:** Build a serious evaluation stack for systems that mix generation, retrieval, and tool use.

**Topics covered:**
- Distinguish exact-match tasks, rubric-based judging, pairwise preference, and groundedness checks.
- Build eval sets that reflect user intent, edge cases, and abuse cases.
- Use model-based graders carefully and audit them against human review.

**Key takeaways:**
- If you cannot evaluate the system, you cannot improve it responsibly.
- LLM-as-judge can be useful but should never be treated as unquestionable truth.

**Learning resources:**
- 🎬 **DeepLearning.AI / LLM eval talks** *(by DeepLearning.AI and guests on Talks)* — Ground LLM evaluation practice in current industry discourse.

**Exercises:**
- 📌 **[SYSTEMS-DESIGN]** Design an eval suite for a knowledge assistant
  *Create a multi-layer evaluation plan covering retrieval, answer groundedness, factuality, latency, and user trust for an internal knowledge assistant.*
  **Deliverables:**
  - Eval taxonomy
  - Gold-set specification
  - Human-review escalation plan
  **Reflection prompts:**
  - Which metrics are cheap enough for every deploy and which require periodic audits?
  - How will you catch prompt regressions caused by retrieval changes?

**Lesson quiz:**
- Q1: Why should retrieval and answer evaluation be separated?
    Because answer quality reveals retrieval quality perfectly
  ✓ Because you need to know whether failure came from missing evidence or poor synthesis
    Because retrieval metrics are always enough
    Because generators cannot be evaluated
  *→ Separating stages makes failure attribution possible.*
- Q2: What is a core risk of using an LLM judge without auditing?
    It will never finish
  ✓ It can introduce hidden biases and brittle scoring behavior that look authoritative
    It deletes the dataset
    It prevents human review
  *→ Model-based graders are fallible components and require calibration too.*

  **Capstone task:** Strengthen your evaluation design until each metric has a clear purpose and known failure mode.

### Module 2: Tools, Agents, and Workflow Automation
*Level: Advanced · Treat agents as orchestrated systems with planning, verification, and reliability constraints rather than autonomous magic.*

#### Lesson 1: Tool Use, Planning, and Workflow Decomposition
**Duration:** 100 min  
**Summary:** Design systems where an LLM decides when to call tools, how to plan multi-step work, and how to recover from partial failure.

**Topics covered:**
- Represent tools with schemas, permissions, and cost awareness.
- Choose between single-agent, router, and workflow-based orchestration.
- Separate useful decomposition from overengineered loops.

**Key takeaways:**
- Agents are often software architecture problems wrapped in language interfaces.
- Unbounded autonomy is usually a reliability bug, not a feature.

**Learning resources:**
- 🎬 **Anthropic / OpenAI / engineering talks on tool use** *(by Various on Talks)* — Observe real agent patterns with a skeptical systems lens.

**Exercises:**
- 📌 **[SYSTEMS-DESIGN]** Design a bounded agent workflow
  *Design an agent workflow for a course-assistant task that uses search, retrieval, quiz generation, and answer verification under latency and permission constraints.*
  **Deliverables:**
  - Tool schema definitions
  - State-machine or workflow diagram
  - Failure and escalation plan
  **Reflection prompts:**
  - Which tasks deserve fixed workflows instead of autonomous planning?
  - Where should the system force verification before side effects?

**Lesson quiz:**
- Q1: What is a strong reason to prefer workflow orchestration over a free-form agent loop?
    It always improves creativity
  ✓ It makes cost, state transitions, and failure handling more controllable
    It removes the need for tools
    It guarantees truthfulness
  *→ Workflows trade some flexibility for reliability and observability.*
- Q2: Why should tool schemas be explicit?
    Because the model can infer everything from prose
  ✓ Because clear inputs, outputs, and permissions reduce ambiguity and side-effect risk
    Because schemas improve GPU throughput
    Because they eliminate evaluation needs
  *→ Structured tool contracts make the orchestration layer safer and easier to inspect.*

  **Capstone task:** Refine the workflow until each tool call has explicit purpose, bounds, and verification.

#### Lesson 2: Agent Reliability, Cost Discipline, and Security
**Duration:** 100 min  
**Summary:** Study the production hazards of agentic systems: prompt injection, permission misuse, looping, stale memory, and runaway cost.

**Topics covered:**
- Threat-model prompt injection and tool misuse.
- Track token, latency, and retry budgets.
- Use verification, sandboxes, and human checkpoints where they matter most.

**Key takeaways:**
- Agents fail like distributed systems with unreliable planners.
- Security and cost controls are central design constraints, not afterthoughts.

**Learning resources:**
- 📝 **Internal lecture script: Why agents need guardrails that feel boring** *(internal lecture script)* — Turn reliability and security into a first-class systems topic.
  - Walk through a prompt-injection chain that reaches a sensitive tool.
  - Show how permission boundaries and verification cut the attack chain.
  - Close with a cost runaway incident and how to cap it.

**Exercises:**
- 🔍 **[ANALYSIS]** Threat model an agentic assistant
  *Write a threat model for an internal agent that can browse, write docs, update data, and trigger workflows. Include abuse cases, cost failures, and approval boundaries.*
  **Deliverables:**
  - Threat model table
  - Control recommendations
  - Verification and approval policy
  **Reflection prompts:**
  - Where can untrusted text become instructions?
  - What budget or permission boundary would stop the worst plausible failure?

**Lesson quiz:**
- Q1: Why is prompt injection especially serious in tool-using systems?
    Because it only affects style
  ✓ Because untrusted text can manipulate tool decisions or exfiltrate data if the system lacks separation and verification
    Because it makes embeddings larger
    Because it only matters in chatbots
  *→ Tool-calling systems convert language into action, which raises the stakes dramatically.*
- Q2: What is a sane approach to agent cost management?
    Unlimited retries improve quality
  ✓ Use bounded retries, token budgets, and observability on failure loops
    Avoid logging
    Only optimize the largest model
  *→ Agent systems can silently burn budget without tighter controls than ordinary inference services.*

  **Capstone task:** Rework the threat model until both security and cost failure modes have concrete controls.

---

## 9. Reliable, Responsible, and Frontier ML Engineering (2026)
**Timeframe:** 4-6 weeks  

The final course in the path: robustness, fairness, security, multimodal systems, weak supervision, synthetic data, and the critical engineering mindset needed for frontier ML work in April 2026.

**Why it matters:** Strong ML engineers are not defined by model fluency alone. They can identify hidden assumptions, defend evaluation choices, and build systems that remain useful under pressure.

### Module 1: Robustness, Fairness, and Security
*Level: Advanced · Treat reliability, misuse resistance, and social impact as engineering domains with measurable practices.*

#### Lesson 1: Robustness, Fairness, and Distribution Shift
**Duration:** 95 min  
**Summary:** Build a concrete engineering approach to subgroup performance, counterfactual thinking, and robustness under real deployment variability.

**Topics covered:**
- Measure subgroup performance and cohort harms.
- Understand robustness benchmarks and out-of-distribution evaluation.
- Use fairness discussions precisely, with explicit policy tradeoffs.

**Key takeaways:**
- Fairness is not a single metric; it is a set of incompatible choices that must be made explicit.
- Robustness work matters because deployment never resembles the benchmark perfectly.

**Learning resources:**
- 🎬 **Responsible AI talks from major labs and conferences** *(by Various on Talks)* — Anchor fairness and robustness in modern engineering discourse.

**Exercises:**
- 🔍 **[ANALYSIS]** Subgroup performance audit
  *Take a model and evaluate it across carefully chosen cohorts. Identify tradeoffs among performance, calibration, and operational cost of mitigation.*
  **Deliverables:**
  - Cohort metrics report
  - Mitigation proposal
  - Policy and tradeoff note
  **Reflection prompts:**
  - Which performance gap is statistically meaningful and operationally serious?
  - What intervention improves harms without degrading the whole system irresponsibly?

**Lesson quiz:**
- Q1: Why is fairness engineering difficult?
    Because all fairness metrics agree
  ✓ Because fairness goals often encode competing policy choices and tradeoffs rather than one universal optimum
    Because models cannot be measured
    Because subgroup labels never exist
  *→ Fairness requires explicit normative choices in addition to technical analysis.*
- Q2: What is a useful robustness practice?
    Only report aggregate validation accuracy
  ✓ Test across realistic shifts, edge cases, and cohorts that matter operationally
    Avoid stress tests
    Assume large models generalize automatically
  *→ Robustness appears in stress tests and slices, not just aggregate metrics.*

  **Capstone task:** Revisit subgroup and shift analysis until you can distinguish technical evidence from policy choice.

#### Lesson 2: ML Security, Adversarial Risk, and Supply Chain Integrity
**Duration:** 100 min  
**Summary:** Study prompt injection, data poisoning, model theft, unsafe model updates, and the software supply chain of modern ML stacks.

**Topics covered:**
- Threat-model data pipelines, training artifacts, and inference endpoints.
- Understand poisoning, model extraction, adversarial prompts, and unsafe dependencies.
- Build controls around data provenance, model provenance, and release integrity.

**Key takeaways:**
- ML security spans classic AppSec, data governance, and model-specific attack surfaces.
- The training and evaluation pipeline is part of the attack surface.

**Learning resources:**
- 📝 **Internal lecture script: ML security is not separate from software security** *(internal lecture script)* — Frame ML security as a continuation of systems security.
  - Threat-model the data pipeline, model registry, and serving endpoint.
  - Compare classical input attacks with prompt and retrieval attacks.
  - Close with provenance and attestation practices for models.

**Exercises:**
- 📌 **[SYSTEMS-DESIGN]** Threat-model the ML supply chain
  *Produce a threat model covering data ingestion, training artifacts, model registry, CI/CD, and inference APIs for a production ML service.*
  **Deliverables:**
  - Threat model
  - Prioritized controls
  - Detection and recovery plan
  **Reflection prompts:**
  - Which compromise would stay invisible longest?
  - What provenance control would reduce both accidental and malicious risk?

**Lesson quiz:**
- Q1: Why should model registries and training artifacts be security concerns?
    Because they are purely academic
  ✓ Because compromised artifacts can poison or replace production models silently
    Because models cannot be versioned
    Because inference is the only attack surface
  *→ Model artifacts are deployable code equivalents and deserve similar integrity controls.*
- Q2: What makes data poisoning dangerous?
    It always raises accuracy
  ✓ It can alter model behavior upstream in ways that are hard to detect downstream
    It only matters in reinforcement learning
    It is fixed by larger batch sizes
  *→ Training data compromise can create persistent, covert model behavior changes.*

  **Capstone task:** Strengthen the threat model until it covers artifacts, data, endpoints, and orchestration paths together.

### Module 2: Frontier Modalities and 2026 Engineering Practice
*Level: Advanced · Synthesize what a serious ML engineer should know about multimodality, synthetic data, evaluation debt, and frontier deployment choices by April 2026.*

#### Lesson 1: Multimodal Systems, Synthetic Data, and Weak Supervision
**Duration:** 100 min  
**Summary:** Study the expanding role of multimodal models, synthetic data generation, and weak supervision in practical ML pipelines.

**Topics covered:**
- Understand multimodal fusion and retrieval patterns.
- Use synthetic data and weak labels carefully, with contamination and bias audits.
- Assess when synthetic pipelines accelerate progress and when they amplify nonsense.

**Key takeaways:**
- Synthetic data is an amplifier: it can accelerate good supervision or compound bad assumptions.
- Multimodal quality often depends more on data alignment and evaluation than on brute-force model size.

**Learning resources:**
- 🎬 **Open multimodal systems talks** *(by Various on Talks)* — Survey practical multimodal engineering patterns.

**Exercises:**
- 📌 **[PAPER-REVIEW]** Synthetic data governance memo
  *Design a synthetic data pipeline for a constrained domain, then write a memo analyzing contamination, bias, coverage, and eval risks.*
  **Deliverables:**
  - Pipeline design
  - Governance memo
  - Eval gate proposal
  **Reflection prompts:**
  - What failure would synthetic augmentation hide rather than solve?
  - How would you detect evaluation contamination?

**Lesson quiz:**
- Q1: What is the main risk of careless synthetic data use?
    It reduces storage cost too much
  ✓ It can reinforce existing blind spots and create misleadingly optimistic evaluation results
    It makes labeling easier
    It only affects images
  *→ Synthetic data can amplify biases or cause contamination if governance is weak.*
- Q2: Why are multimodal systems especially evaluation-heavy?
  ✓ Because multiple modalities introduce more ways to align poorly, fail silently, or appear impressive without grounded competence
    Because they need no labels
    Because images are always easy
    Because text metrics are enough
  *→ Cross-modal alignment and task design create complex failure surfaces that require careful measurement.*

  **Capstone task:** Strengthen synthetic-data and multimodal evaluation instincts before trusting headline gains.

#### Lesson 2: What an ML Engineer Should Know in April 2026
**Duration:** 120 min  
**Summary:** A synthesis lesson: tie together math, modeling, retrieval, systems, evaluation, safety, and economics into a working profile of a credible 2026 ML engineer.

**Topics covered:**
- Define the skill matrix across modeling, systems, evaluation, and reliability.
- Understand how product, economics, and governance shape engineering choices.
- Build a self-audit for strengths, blind spots, and next projects.

**Key takeaways:**
- The best ML engineers are bilingual in research and production.
- By 2026, depth means you can critique an end-to-end system, not just fine-tune a model.

**Learning resources:**
- 📝 **Internal lecture script: The 2026 ML engineer profile** *(internal lecture script)* — Generate a closing lecture that synthesizes the entire program.
  - Define the knowledge graph of a strong ML engineer.
  - Walk one end-to-end system from data to incident response.
  - End with a personal roadmap for the next 12 months of deliberate practice.

**Exercises:**
- 🔍 **[ANALYSIS]** Personal engineering roadmap
  *Create a brutally honest self-assessment across this curriculum. Choose one capstone project that would best expose your weakest area and one that would showcase your strongest.*
  **Deliverables:**
  - Skill matrix
  - Evidence-backed self-assessment
  - 12-month roadmap with projects and reading
  **Reflection prompts:**
  - Which weakness is technical versus process versus judgment?
  - What project would force you to integrate the most missing skills?

**Lesson quiz:**
- Q1: What most distinguishes a strong ML engineer from a model tinkerer in 2026?
  ✓ Owning the end-to-end system: data, evaluation, deployment, reliability, and tradeoffs
    Knowing only the newest foundation model
    Avoiding documentation
    Using the biggest GPU available
  *→ Serious ML engineering is integrative and operational, not just model-centric.*
- Q2: Which habit best protects against hype-driven engineering?
    Assuming bigger models solve all product issues
  ✓ Demanding explicit evaluation, baselines, failure analysis, and cost reasoning
    Avoiding historical context
    Skipping postmortems
  *→ Evidence and disciplined evaluation are the antidotes to hype.*

  **Capstone task:** Use the final synthesis to build a real roadmap, not just a list of fashionable tools.

---

## 10. Mathematics and Scientific Foundations for ML
**Timeframe:** 6-8 weeks  

A serious preparation course for learners with a CS background who need the mathematical maturity, scientific mindset, and optimization intuition expected in graduate-level ML work.

**Why it matters:** Without linear algebra, calculus, probability, and optimization discipline, ML becomes pattern memorization instead of reasoning. This course closes that gap.

### Module 1: Linear Algebra, Calculus, and Geometry for Models
*Level: Beginner · Learn the mathematical objects that appear everywhere in embeddings, gradients, optimization, and representation learning.*

#### Lesson 1: Vector Spaces, Projections, and Matrix Thinking
**Duration:** 100 min  
**Summary:** Build the linear algebra vocabulary required to understand features, latent spaces, decompositions, and geometry-driven intuition in ML.

**Topics covered:**
- Vectors, bases, spans, and subspaces as modeling language
- Matrix multiplication, linear maps, and change of basis
- Orthogonality, projections, and why PCA is a geometric story

**Key takeaways:**
- Linear algebra is the language of representation, not a prerequisite hurdle to clear once and forget.
- Good ML intuition is often geometric before it becomes algorithmic.

**Learning resources:**
- 🎬 **MIT OCW Linear Algebra** *(by MIT OpenCourseWare on Open course)* — Use a full open course to build geometric understanding before algorithm memorization.

**Exercises:**
- 🔍 **[ANALYSIS]** Derive PCA from geometry, not library calls
  *Write a derivation and short computational demonstration of why PCA directions maximize projected variance and where that intuition breaks under nonlinear structure.*
  **Deliverables:**
  - One derivation write-up
  - A notebook demonstrating PCA on at least two datasets
  - A note on when PCA is the wrong tool
  **Reflection prompts:**
  - What does variance preservation miss about downstream usefulness?
  - How would you explain eigenvectors to an engineer who only knows arrays and loops?

**Lesson quiz:**
- Q1: Why are orthogonal projections so important in ML?
    They are only useful for graphics
  ✓ They appear in approximation, least squares, dimensionality reduction, and representation geometry
    They eliminate the need for optimization
    They guarantee causal inference
  *→ Projection ideas sit underneath regression, PCA, and many approximation arguments.*
- Q2: What does an eigenvector represent in a decomposition context?
    Any arbitrary direction
  ✓ A direction preserved by a linear transformation up to scaling
    A probability distribution
    A classification threshold
  *→ Eigenvectors identify stable directions under a transformation, which matters in variance and dynamical analysis.*

  **Capstone task:** Re-derive the key geometric relationships until you can explain them without appealing to library functions.

#### Lesson 2: Gradients, Vector Calculus, and Optimization Landscapes
**Duration:** 110 min  
**Summary:** Learn the derivative machinery that makes backpropagation and objective-based learning intelligible.

**Topics covered:**
- Gradients, directional derivatives, Jacobians, and Hessians
- Chain rule as the backbone of backpropagation
- Optimization surfaces, curvature, and local approximation

**Key takeaways:**
- Backpropagation is bookkeeping over compositions, not magic.
- Optimization intuition matters because training failures are often calculus failures in disguise.

**Learning resources:**
- 🎬 **MIT OCW Multivariable Calculus** *(by MIT OpenCourseWare on Open course)* — Build calculus fluency from an openly licensed course rather than only informal blog intuition.

**Exercises:**
- 🧪 **[LAB]** Backprop by hand on a tiny network
  *Implement a tiny multilayer network without autograd, derive each gradient by hand, and compare the manual result to a numerical gradient check.*
  **Deliverables:**
  - Hand derivation
  - Reference implementation
  - Gradient check report
  **Reflection prompts:**
  - Which derivative term would be easiest to get wrong under time pressure?
  - What does the numerical check reveal about silent implementation mistakes?

**Lesson quiz:**
- Q1: Why is the chain rule central to neural network training?
    Because it removes the need for loss functions
  ✓ Because it lets you propagate sensitivity through composed operations
    Because it guarantees convexity
    Because it chooses the architecture automatically
  *→ The chain rule is exactly what makes layered gradient propagation possible.*
- Q2: What is a Hessian most directly telling you?
    Only the model latency
  ✓ Local curvature information of the objective
    The final test accuracy
    The data schema
  *→ The Hessian captures second-order curvature structure, which helps explain optimization behavior.*

  **Capstone task:** Repeat the manual derivation until the relationship among loss, chain rule, and gradient flow is intuitive.

### Module 2: Probability, Statistical Thinking, and Optimization Theory
*Level: Beginner · Use probabilistic reasoning and scientific discipline to avoid confusing anecdotes with evidence.*

#### Lesson 1: Random Variables, Estimation, and Generalization Thinking
**Duration:** 100 min  
**Summary:** Study the statistical lens needed to interpret data, uncertainty, confidence, bias, and variance correctly.

**Topics covered:**
- Random variables, expectations, variance, covariance, and conditioning
- Sampling, estimation error, confidence, and uncertainty
- Bias-variance and the limits of one split, one metric, one story

**Key takeaways:**
- ML engineers need scientific skepticism, not just code speed.
- Every evaluation result is an estimate conditioned on a data-generation process.

**Learning resources:**
- 🎬 **MIT OCW Probability and Statistics** *(by MIT OpenCourseWare on Open course)* — Ground inference and uncertainty in a fully open course.

**Exercises:**
- 🔍 **[ANALYSIS]** Confidence and fragility audit
  *Take a model evaluation you are tempted to celebrate and reframe it in terms of sampling uncertainty, slice sensitivity, and possible hidden confounders.*
  **Deliverables:**
  - A confidence audit memo
  - Resampling or bootstrap analysis
  - A revised claim about what the model result actually proves
  **Reflection prompts:**
  - What part of your claim is evidence versus extrapolation?
  - Which missing slice or dataset would most likely change your conclusion?

**Lesson quiz:**
- Q1: Why is one test-set result not the same as scientific certainty?
    Because metrics are always useless
  ✓ Because the observed result is still an estimate influenced by sampling, slice composition, and possible shift
    Because test sets should be avoided
    Because confidence intervals are only for physics
  *→ A single held-out score is informative but still contingent on data, assumptions, and shift.*
- Q2: What is the main benefit of a bootstrap or resampling view of evaluation?
    It changes the labels
  ✓ It helps expose uncertainty and stability in the metric estimates
    It guarantees better models
    It removes the need for domain knowledge
  *→ Resampling gives you a better sense of how stable your measured result is.*

  **Capstone task:** Practice uncertainty-aware reporting until every claim you make has a clear evidentiary boundary.

#### Lesson 2: Convexity, Constraints, and Lagrangian Thinking
**Duration:** 95 min  
**Summary:** Learn enough optimization theory to read advanced ML papers and understand what assumptions make some problems easier than others.

**Topics covered:**
- Convex sets, convex objectives, and why they matter
- Constrained optimization and Lagrangian formulation
- Why real deep learning is not convex and why local methods still work surprisingly well

**Key takeaways:**
- Optimization theory gives you a language for problem difficulty and guarantees.
- Knowing where guarantees end is just as important as knowing where they hold.

**Learning resources:**
- 🎬 **MIT OCW Nonlinear Programming** *(by MIT OpenCourseWare on Open course)* — Use an advanced open course to bridge engineering intuition and formal optimization ideas.

**Exercises:**
- 🔍 **[ANALYSIS]** Constraint-aware objective design
  *Reformulate one ML objective with explicit operational constraints such as latency, fairness, or calibration, and explain how a Lagrangian view changes the problem statement.*
  **Deliverables:**
  - Objective reformulation memo
  - Constraint analysis
  - Tradeoff discussion
  **Reflection prompts:**
  - Which operational constraint is usually hidden rather than modeled directly?
  - What does your reformulation make visible that the original objective hid?

**Lesson quiz:**
- Q1: Why is convexity useful when it exists?
    It always improves generalization
  ✓ It can make optimization behavior and guarantees easier to reason about
    It removes all modeling assumptions
    It makes data collection unnecessary
  *→ Convexity gives structure and often stronger guarantees about optimization.*
- Q2: What is a Lagrangian useful for?
    Only drawing graphs
  ✓ Encoding constrained optimization problems into an objective framework
    Replacing train/test splits
    Computing embeddings
  *→ Lagrangian reasoning helps you formalize constraint tradeoffs directly.*

  **Capstone task:** Review optimization with a focus on what assumptions create guarantees and what happens when those assumptions fail.

---

## 11. Statistical Inference and Probabilistic Modeling
**Timeframe:** 4-6 weeks  

A deeper science-oriented course covering estimation, Bayesian reasoning, causal caution, experiment design, and uncertainty-aware ML judgment.

**Why it matters:** A model engineer who cannot reason about inference, uncertainty, and experiment validity will confuse motion with knowledge.

### Module 1: Inference, Bayesian Thinking, and Experiment Design
*Level: Advanced · Strengthen the scientific side of ML by learning what evidence does and does not justify.*

#### Lesson 1: Frequentist Inference, Bayesian Updating, and What Your Metrics Really Mean
**Duration:** 100 min  
**Summary:** Compare the major statistical viewpoints and tie them back to evaluation, uncertainty, and model comparison in practical ML.

**Topics covered:**
- Confidence intervals versus credible intervals
- Hypothesis testing, multiple comparisons, and false confidence
- Bayesian updating as a tool for sequential evidence and prior-aware reasoning

**Key takeaways:**
- Different statistical frames answer different questions; they are not interchangeable decorations.
- Good science in ML means knowing which uncertainty statement you are actually making.

**Learning resources:**
- 🎬 **MIT OCW Probability and Statistics** *(by MIT OpenCourseWare on Open course)* — Use a strong open course as the anchor for inference rather than ad hoc blog intuition.

**Exercises:**
- 🔍 **[ANALYSIS]** Interpret uncertainty three ways
  *Take one model comparison and analyze it using a classical confidence interval, a resampling estimate, and a Bayesian posterior-style interpretation.*
  **Deliverables:**
  - Three-interpretation memo
  - A comparison table of claims each method permits
  - A conclusion about what you are actually confident about
  **Reflection prompts:**
  - Which interpretation would a product team misuse most easily?
  - How do your conclusions change when the prior or sample size changes?

**Lesson quiz:**
- Q1: Why is a p-value often misused in ML reporting?
    Because it directly measures production latency
  ✓ Because people overread it as proof of importance or truth instead of a narrow statement under a null model
    Because it is only defined for neural networks
    Because it replaces evaluation metrics
  *→ P-values are frequently treated as stronger and broader evidence than they really are.*
- Q2: What does a Bayesian update contribute conceptually?
    It removes prior assumptions
  ✓ It makes the role of prior beliefs and new evidence explicit in the posterior view
    It guarantees better accuracy
    It eliminates label noise
  *→ Bayesian reasoning is valuable because it makes assumptions and evidence combination explicit.*

  **Capstone task:** Revisit inference until you can say exactly what uncertainty statement your evaluation supports.

#### Lesson 2: Causal Caution, A/B Testing, and Claims You Should Not Make
**Duration:** 95 min  
**Summary:** Learn to separate prediction from intervention logic and resist causal storytelling where the evidence does not support it.

**Topics covered:**
- Difference between association, prediction, and causal effect
- Pitfalls in observational data and policy-entangled labels
- A/B tests, sequential testing, and experiment contamination

**Key takeaways:**
- A predictive model can be useful without being causal, but you must know the difference.
- A/B tests can still mislead when instrumentation, segmentation, or stopping rules are sloppy.

**Learning resources:**
- 🎬 **MIT OCW Probability and Statistics** *(by MIT OpenCourseWare on Open course)* — Reuse the statistical base to frame causal caution and experiment validity.

**Exercises:**
- 🔍 **[ANALYSIS]** Rewrite an overclaimed ML result
  *Take a model evaluation or product case study and rewrite the claims so that they are scientifically defensible. Identify which claims are predictive, which are causal, and which are not justified at all.*
  **Deliverables:**
  - Claim taxonomy
  - A revised evidence-based write-up
  - One experiment design that would actually test a causal question
  **Reflection prompts:**
  - What assumption would have to be true for the strongest claim to hold?
  - Which missing experiment blocks you from saying more?

**Lesson quiz:**
- Q1: What is the biggest danger of causal language in ordinary predictive ML work?
    It makes the code slower
  ✓ It can lead teams to intervene based on relationships the model never established as causal
    It reduces dataset size
    It changes the license of the model
  *→ Causal overclaiming can produce bad product and policy decisions.*
- Q2: Why can an A/B test still mislead?
    Because randomized experiments are magic
  ✓ Because poor instrumentation, segmentation, leakage, or stopping rules can invalidate interpretation
    Because experiments never help in ML
    Because significance thresholds are optional
  *→ Experiment quality depends on implementation discipline as much as on the idea of randomization.*

  **Capstone task:** Practice identifying what evidence supports predictive claims versus intervention claims before making product recommendations.

---

## 12. Scientific Computing and Data Systems for MLE
**Timeframe:** 4-6 weeks  

A practical engineering course on the compute, data, experiment, and orchestration layer that turns model work into dependable ML engineering.

**Why it matters:** Many capable software engineers underestimate how much MLE depends on data pipelines, reproducibility, framework fluency, and operational discipline.

### Module 1: Tooling, Pipelines, and Experiment Discipline
*Level: Advanced · Learn the practical workflow stack that supports modern MLE work.*

#### Lesson 1: Framework Fluency, Reproducible Pipelines, and Numeric Hygiene
**Duration:** 100 min  
**Summary:** Treat numerical computing, training code, and pipeline hygiene as engineering domains that require design, not copy-paste.

**Topics covered:**
- Project structure for experiments, configs, and repeatability
- Pipeline composition, transforms, and data contracts
- Common numeric and reproducibility footguns in real ML code

**Key takeaways:**
- A notebook that cannot be rerun is not a reliable engineering artifact.
- Framework fluency matters because the model only exists through code, data, and runtime behavior.

**Learning resources:**
- 🎬 **PyTorch Tutorials** *(by PyTorch on Docs)* — Use framework-native tutorials to reinforce implementation correctness and debug discipline.
- 🎬 **scikit-learn User Guide** *(by scikit-learn on Docs)* — Use structured pipeline material to keep classical ML and preprocessing production-ready.

**Exercises:**
- 🧪 **[LAB]** Refactor a notebook into a reproducible training package
  *Take one messy exploratory notebook and turn it into a reproducible training run with explicit configuration, data assumptions, and evaluation outputs.*
  **Deliverables:**
  - Refactored project structure
  - A config-driven run command
  - A short note on what hidden assumptions were made explicit
  **Reflection prompts:**
  - Which hidden path or environment dependency would have broken someone else’s run?
  - How would you prove two runs are meaningfully comparable?

**Lesson quiz:**
- Q1: What is a strong sign that an experiment workflow is not engineering-grade?
    It uses Python
  ✓ Results depend on undocumented manual steps, hidden paths, or ambiguous configs
    It logs metrics
    It uses a model registry
  *→ Reproducibility breaks when the path from code and data to results is not explicit.*
- Q2: Why is numeric hygiene part of MLE work?
  ✓ Because numerical precision, batching, randomness, and framework behavior all affect whether conclusions are reliable
    Because it only affects hardware teams
    Because it replaces evaluation
    Because it only matters in academic research
  *→ ML results are shaped by real numerical systems, not just elegant equations.*

  **Capstone task:** Tighten your pipeline until another engineer could rerun it and trust the outputs.

#### Lesson 2: Experiment Tracking, Model Lifecycle, and Orchestration
**Duration:** 95 min  
**Summary:** Use open tooling to understand experiment lineage, model registry, workflow execution, and deployment handoff.

**Topics covered:**
- Tracking parameters, data versions, metrics, and artifacts
- Model registry concepts and promotion gates
- Orchestration tradeoffs in pipeline systems and training platforms

**Key takeaways:**
- Lifecycle tooling is about preserving evidence, not adding ceremony.
- Orchestration should simplify repeatability, not hide system complexity from you.

**Learning resources:**
- 🎬 **MLflow Documentation** *(by MLflow on Docs)* — Use an open lifecycle tool as a concrete reference for tracking and registry concepts.
- 🎬 **Kubeflow Documentation** *(by Kubeflow on Docs)* — Use open orchestration docs to learn pipeline structure and training workflow design.

**Exercises:**
- 📌 **[SYSTEMS-DESIGN]** Design an experiment-to-release workflow
  *Design an end-to-end workflow from data pull to training to evaluation to promotion, including where artifacts, metrics, and approvals live.*
  **Deliverables:**
  - Workflow diagram
  - Artifact and metadata inventory
  - A release gate policy
  **Reflection prompts:**
  - What should block promotion even when the main metric improved?
  - What would you need to debug a six-month-old released model?

**Lesson quiz:**
- Q1: Why is a model registry useful?
    It replaces evaluation
  ✓ It provides versioned model lineage, status, and release coordination
    It makes drift impossible
    It removes the need for reproducibility
  *→ Registries help you keep track of what was trained, approved, and deployed.*
- Q2: What is the main value of orchestration in ML systems?
    It guarantees better models
  ✓ It makes multi-step workflows repeatable, observable, and automatable
    It replaces model design
    It eliminates infrastructure cost
  *→ Orchestration adds structure and observability to complex recurring workflows.*

  **Capstone task:** Refine the workflow design until lineage, review, and rollback are all explicit.

---

## 13. Computer Vision and Multimodal ML Systems
**Timeframe:** 5-7 weeks  

A perception-focused course on visual representation learning, detection, segmentation, multimodal retrieval, and the failure modes that make real-world vision systems expensive and brittle.

**Why it matters:** A serious ML engineer should be able to reason about perception systems, not just language and tabular models. Vision and multimodal stacks surface distribution shift, labeling ambiguity, and latency constraints quickly.

### Module 1: Visual Representation Learning and Perception Tasks
*Level: Advanced · Move from generic deep learning to perception-specific design and evaluation choices.*

#### Lesson 1: Convolutions, Inductive Bias, and Feature Hierarchies
**Duration:** 95 min  
**Summary:** Learn why visual models historically relied on locality and hierarchy, what those priors buy you, and how modern architectures inherit or discard them.

**Topics covered:**
- Convolutions, receptive fields, and translational assumptions
- Feature hierarchies and representation reuse across tasks
- How data scale and compute changed the architecture story

**Key takeaways:**
- Vision models succeed or fail partly because of how their inductive biases match the task and dataset.
- Architecture changes are only meaningful when connected to data regime, compute budget, and evaluation target.

**Learning resources:**
- 🎬 **Dive into Deep Learning** *(by Dive into Deep Learning authors on Open textbook)* — Use the open textbook to anchor core vision architectures and visual representation intuition.
- 🎬 **PyTorch Tutorials** *(by PyTorch on Docs)* — Ground perception concepts in runnable implementations and tensor-level debugging practice.

**Exercises:**
- 📌 **[DEBUGGING]** Diagnose representation collapse in a small vision model
  *Train a small image classifier, intentionally induce overfitting or shortcut learning, and document how activation inspection, augmentation, and regularization change the failure profile.*
  **Deliverables:**
  - Training notebook or package
  - Failure analysis report with visual evidence
  - One memo explaining which interventions improved generalization and why
  **Reflection prompts:**
  - Which errors came from weak representation learning versus bad data assumptions?
  - What changed in the learned features after augmentation or regularization changes?

**Lesson quiz:**
- Q1: Why do inductive biases matter in vision models?
    Because model architecture is just branding
  ✓ Because assumptions about locality, hierarchy, and invariance shape what the model can learn efficiently
    Because they only affect deployment cost
    Because they eliminate the need for data
  *→ Architectural priors influence sample efficiency, optimization, and failure modes in perception tasks.*
- Q2: What is a common sign of shortcut learning in vision?
    Stable generalization across domains
  ✓ The model latches onto spurious backgrounds or artifacts instead of task-relevant structure
    Lower training accuracy
    A clean confusion matrix
  *→ Vision models often exploit background or collection artifacts unless evaluation is designed to catch it.*

  **Capstone task:** Re-run the analysis until you can explain a vision failure in terms of both data assumptions and representation behavior.

#### Lesson 2: Detection, Segmentation, and Shift-Aware Evaluation
**Duration:** 100 min  
**Summary:** Treat perception tasks as structured prediction under uncertainty, annotation noise, and changing data distributions.

**Topics covered:**
- Detection and segmentation as localization plus classification problems
- Task-specific metrics and what they hide
- Domain shift, corruption robustness, and annotation ambiguity

**Key takeaways:**
- A vision metric is only informative if you understand which errors it compresses away.
- Perception systems demand slice-based and shift-aware evaluation, not just aggregate scores.

**Learning resources:**
- 🎬 **Dive into Deep Learning** *(by Dive into Deep Learning authors on Open textbook)* — Use open chapters on computer vision tasks as a foundation for structured prediction thinking.

**Exercises:**
- 🔍 **[ANALYSIS]** Build a perception evaluation scorecard
  *Create an evaluation scorecard for a detection or segmentation use case that includes task metrics, slices, corruption tests, latency constraints, and annotation uncertainty notes.*
  **Deliverables:**
  - Scorecard template
  - A critique of at least two misleading metric-only conclusions
  - A recommendation memo for ship/no-ship criteria
  **Reflection prompts:**
  - What would your main metric miss if the environment changed next month?
  - Which user-visible failure is underweighted by the standard benchmark metric?

**Lesson quiz:**
- Q1: Why is aggregate accuracy often insufficient for vision systems?
    Because perception systems usually have no deployment context
  ✓ Because it can hide failures on important slices, under shift, or on localization quality
    Because it is mathematically invalid
    Because all vision tasks use the same metric
  *→ Real perception systems fail unevenly across conditions, objects, and environments.*
- Q2: What makes annotation ambiguity especially important in perception work?
    Perception labels are always exact
  ✓ Bounding boxes, masks, and class boundaries often contain uncertainty that changes how you should interpret results
    It only matters for reinforcement learning
    It removes the need for evaluation
  *→ Visual labels often encode judgment calls, not perfect ground truth.*

  **Capstone task:** Tighten your scorecard until deployment decisions are justified by slices, uncertainty, and task constraints rather than a single leaderboard number.

### Module 2: Multimodal Retrieval, Alignment, and Product Reality
*Level: Advanced · Study image-text systems as representation, retrieval, and evaluation pipelines rather than magic foundation models.*

#### Lesson 1: Contrastive Learning, Embedding Spaces, and Cross-Modal Retrieval
**Duration:** 100 min  
**Summary:** Understand how image-text systems align representations, why retrieval quality matters, and where multimodal systems break under weak grounding.

**Topics covered:**
- Contrastive objectives and representation alignment
- Embeddings for search, ranking, and retrieval-augmented multimodal systems
- Failure modes in cross-modal ambiguity and weak supervision

**Key takeaways:**
- Multimodal systems are often retrieval and embedding-quality systems before they are generation systems.
- Alignment quality must be interrogated with hard negatives and task-specific error analysis.

**Learning resources:**
- 🎬 **Hugging Face Course** *(by Hugging Face on Course)* — Use openly licensed transformer material to connect cross-modal representations to modern model tooling.
- 🎬 **PyTorch Tutorials** *(by PyTorch on Docs)* — Keep multimodal ideas connected to framework-level implementation details.

**Exercises:**
- 📌 **[SYSTEMS-DESIGN]** Design a multimodal retrieval benchmark
  *Design a benchmark for an image-text retrieval product that defines hard negatives, ranking metrics, latency constraints, and human review loops.*
  **Deliverables:**
  - Benchmark design document
  - Failure taxonomy
  - A proposal for monitoring embedding drift or catalog drift
  **Reflection prompts:**
  - What failure would look excellent on average but still break user trust?
  - How would you detect that the text encoder and image encoder are drifting apart in practice?

**Lesson quiz:**
- Q1: Why are hard negatives valuable in contrastive or retrieval evaluation?
    They make the task artificially easier
  ✓ They expose whether the representation actually distinguishes semantically close alternatives
    They remove the need for human review
    They only matter for tabular models
  *→ Easy negatives can flatter a model that still fails on realistic retrieval ambiguity.*
- Q2: What is a common multimodal system failure?
    Perfect grounding under noisy data
  ✓ Seemingly strong retrieval scores that still miss the product-specific notion of relevance
    Eliminating ambiguity from language
    Needing no monitoring after launch
  *→ Multimodal systems often optimize a proxy that diverges from what the product or user actually needs.*

  **Capstone task:** Stress-test your benchmark until you can defend why it reflects user-relevant multimodal quality rather than just generic embedding neatness.

---

## 14. Sequential Decision-Making and Reinforcement Learning
**Timeframe:** 5-7 weeks  

A critical course on bandits, MDPs, value functions, policy optimization, offline evaluation, and the engineering discipline required to use RL-like methods without fooling yourself.

**Why it matters:** Even engineers who never train a frontier RL agent benefit from understanding sequential decision-making, reward design, exploration, and why feedback loops can quietly corrupt systems.

### Module 1: MDPs, Value Functions, and Optimization Under Feedback
*Level: Advanced · Build the conceptual and mathematical foundations behind sequential decision systems.*

#### Lesson 1: MDPs, Bellman Equations, and Credit Assignment
**Duration:** 100 min  
**Summary:** Learn how sequential decision problems differ from supervised learning and why value, return, horizon, and state abstractions matter.

**Topics covered:**
- Bandits versus MDPs and when the distinction matters
- Bellman equations, temporal structure, and credit assignment
- Policy, value function, and model distinctions

**Key takeaways:**
- Sequential learning is hard because your actions change the data you will see next.
- Credit assignment is a representation and evaluation problem as much as an algorithm problem.

**Learning resources:**
- 🎬 **Dive into Deep Learning** *(by Dive into Deep Learning authors on Open textbook)* — Use open deep learning material to ground RL fundamentals in clear mathematical exposition.
- 🎬 **MIT OCW Probability and Statistics** *(by MIT OpenCourseWare on Open course)* — Reconnect RL uncertainty and return estimation to probability rather than folklore.

**Exercises:**
- 🔍 **[ANALYSIS]** Explain a sequential decision problem in MDP terms
  *Choose a real product or operations decision problem and formalize it as a bandit or MDP, including states, actions, rewards, transitions, horizon, and observability limits.*
  **Deliverables:**
  - Formal problem statement
  - One critique of what the abstraction misses
  - A recommendation on whether RL is actually warranted
  **Reflection prompts:**
  - Which parts of the real system are lost when you compress it into an MDP?
  - Could a simpler supervised or rules-based approach solve enough of the problem?

**Lesson quiz:**
- Q1: Why is credit assignment difficult in RL?
  ✓ Because rewards may be delayed and actions alter future states and data
    Because labels are always perfectly clean
    Because RL has no metrics
    Because the Bellman equation eliminates uncertainty
  *→ Delayed consequences and feedback loops make attribution much harder than in ordinary supervised tasks.*
- Q2: What does the Bellman perspective provide?
  ✓ A way to decompose long-horizon value relationships recursively
    A guarantee that training will be stable
    A replacement for reward design
    A shortcut around exploration
  *→ The Bellman equations let you reason recursively about value under temporal structure.*

  **Capstone task:** Practice formalizing real decisions as sequential problems until you can also explain where the formalism breaks.

#### Lesson 2: Q-Learning, Policy Gradients, and Instability
**Duration:** 105 min  
**Summary:** Compare major RL update families and understand why function approximation, exploration, reward design, and non-stationarity make real training fragile.

**Topics covered:**
- Value-based versus policy-based methods
- Exploration-exploitation and reward shaping tradeoffs
- Instability from approximation error, off-policy learning, and sparse reward

**Key takeaways:**
- Many RL papers hide how much tuning and environment design is doing the real work.
- If you cannot explain instability sources, you are not ready to trust an RL result.

**Learning resources:**
- 🎬 **PyTorch Tutorials** *(by PyTorch on Docs)* — Use implementation-focused material to keep RL update rules connected to actual tensor code and debugging.
- 🎬 **MIT OCW Nonlinear Programming** *(by MIT OpenCourseWare on Open course)* — Link policy optimization intuition back to constraints and objective geometry.

**Exercises:**
- 📌 **[PAPER-REVIEW]** Reward hacking and instability postmortem
  *Write a postmortem for a hypothetical RL system failure caused by reward misspecification, simulator mismatch, or unstable training.*
  **Deliverables:**
  - Failure narrative
  - Root-cause analysis
  - A redesign proposal for reward, evaluation, or environment setup
  **Reflection prompts:**
  - Which proxy was optimized instead of the real objective?
  - What evidence would you require before trusting the next training run?

**Lesson quiz:**
- Q1: Why is reward design such a high-stakes choice?
    Because the agent optimizes the exact operational objective automatically
  ✓ Because agents often exploit the specified proxy rather than the intention behind it
    Because rewards only affect logging
    Because it matters only in games
  *→ Reward design is where many real-world RL failures begin.*
- Q2: What makes RL with function approximation especially tricky?
    It always converges quickly
  ✓ Approximation error, non-stationarity, and feedback loops can amplify instability
    It removes the need for exploration
    It turns RL into ordinary regression
  *→ Neural approximators can magnify the brittleness already present in sequential learning.*

  **Capstone task:** Treat every apparently strong RL result as provisional until you have interrogated reward, environment, and instability sources.

### Module 2: Bandits, Offline Evaluation, and Real-World Decision Systems
*Level: Advanced · Focus on the forms of sequential learning most likely to appear in practical ML products.*

#### Lesson 1: Bandits, Counterfactual Evaluation, and Safer Deployment
**Duration:** 95 min  
**Summary:** Study contextual bandits, off-policy evaluation, and the evidence standards needed before deploying systems that influence the data they learn from.

**Topics covered:**
- Contextual bandits for recommendation and ranking-like problems
- Off-policy evaluation and why logged data can mislead
- Guardrails, canaries, and staged rollout for decision policies

**Key takeaways:**
- A sequential system can improve the proxy while degrading the user experience if evaluation is weak.
- Counterfactual reasoning is fragile when logging policy coverage is poor.

**Learning resources:**
- 🎬 **MIT OCW Probability and Statistics** *(by MIT OpenCourseWare on Open course)* — Ground counterfactual claims in sampling and uncertainty rather than intuition alone.

**Exercises:**
- 📌 **[SYSTEMS-DESIGN]** Design a bandit rollout policy
  *Design a rollout policy for a contextual bandit product feature, including exploration budget, logging requirements, offline checks, and rollback conditions.*
  **Deliverables:**
  - Rollout plan
  - Logging schema
  - A risk register covering feedback-loop failure modes
  **Reflection prompts:**
  - What user segment is most likely to be harmed first by a weak policy?
  - Which offline signal would still be too weak to justify launch?

**Lesson quiz:**
- Q1: Why is off-policy evaluation difficult?
  ✓ Because logged data comes from a different policy and may have poor support for new decisions
    Because evaluation is unnecessary in bandits
    Because sequential systems never need logs
    Because counterfactuals are always exact
  *→ Logged-policy bias and coverage limitations make counterfactual claims easy to overstate.*
- Q2: When is a contextual bandit often more appropriate than full RL?
  ✓ When the action has limited long-term state effects and you mainly need one-step adaptation
    When long-horizon planning dominates
    When no feedback is available
    When rewards are perfectly defined
  *→ Many practical product decisions are closer to bandits than to full long-horizon control problems.*

  **Capstone task:** Keep tightening the rollout policy until the evidence standard and rollback path are explicit.

---
