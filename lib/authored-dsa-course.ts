import type {
  CurriculumExercise,
  CurriculumLesson,
  CurriculumVideo,
  LessonQuiz,
  QuizQuestion,
} from "@/lib/types";
import type { HostedLessonContent, PracticeProblem } from "@/lib/hosted-lessons";
import { DSA_CODING_PROBLEMS } from "@/lib/authored-dsa-coding-problems";

type AuthoredDsaLessonBundle = {
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

function video(title: string, objective: string, url: string, creator: string): CurriculumVideo {
  return {
    kind: "external",
    title,
    objective,
    url,
    creator,
    platform: "Open course",
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
        criterion: "Correctness",
        points: 4,
        description: "Uses the right invariant, state transition, or complexity argument.",
      },
      {
        criterion: "Reasoning",
        points: 3,
        description: "Explains why the approach works instead of only presenting the answer.",
      },
      {
        criterion: "Implementation discipline",
        points: 2,
        description: "Handles edge cases, mutation rules, and data structure contracts cleanly.",
      },
      {
        criterion: "Communication",
        points: 1,
        description: "Would hold up in a code review or whiteboard explanation.",
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

function problem(
  id: string,
  difficulty: PracticeProblem["difficulty"],
  formatLabel: string,
  prompt: string,
  hint: string,
  solution: string,
  checkYourWork: string[],
): PracticeProblem {
  return {
    id,
    difficulty,
    formatLabel,
    prompt,
    hint,
    solution,
    checkYourWork,
  };
}

const AUTHORED_DSA_LESSONS: Record<string, AuthoredDsaLessonBundle> = {
  "dsa-lesson-1": {
    lesson: lesson(
      "dsa-lesson-1",
      "Cost Models, Recursion, and Sequence Structures",
      "95 min",
      "Build the mental model behind asymptotic analysis, recursive decomposition, and the tradeoffs between array-backed and pointer-backed sequence structures.",
      [
        "Cost models, Big-O, and why operation mix matters more than memorized tables",
        "Recursion, recurrences, and invariant-driven reasoning",
        "Arrays, dynamic arrays, and linked lists under real mutation pressure",
      ],
      [
        "Choose data structures by access and mutation patterns, not by habit.",
        "Use recursion only when you can state the subproblem contract and base case precisely.",
        "Amortized and worst-case costs answer different engineering questions and both matter.",
      ],
      [
        video(
          "MIT 6.006: Algorithmic Thinking",
          "Reinforce asymptotic analysis and recurrence intuition with a rigorous open course.",
          "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/",
          "MIT OpenCourseWare",
        ),
      ],
      [
        exercise(
          "dsa-lesson-1-ex-1",
          "Compare sequence structures under workload pressure",
          "analysis",
          "Given three workloads, justify whether an array list, singly linked list, or doubly linked list is the right choice. Include asymptotic cost and bug-risk reasoning.",
          ["One comparison table", "One written recommendation memo", "One edge-case note"],
          [
            "What operations dominate?",
            "What invariants are easiest to violate in each structure?",
            "When does constant-factor locality beat pointer flexibility?",
          ],
        ),
      ],
      quiz(
        [
          question(
            "dsa-lesson-1-q1",
            "Why is appending to a dynamic array usually treated as amortized O(1) instead of worst-case O(1)?",
            [
              "Because resizing never happens in practice",
              "Because occasional O(n) resizes are spread across many cheap appends",
              "Because array writes are constant time on every machine",
              "Because linked lists are slower",
            ],
            1,
            "Dynamic arrays occasionally pay a full copy cost, but if capacity grows geometrically that cost is budgeted across many future appends.",
          ),
          question(
            "dsa-lesson-1-q2",
            "When is a linked list genuinely preferable to an array-backed list?",
            [
              "When you need fast random indexing",
              "When you need contiguous memory layout",
              "When you already have node references and frequently splice near them",
              "Whenever the input size is unknown",
            ],
            2,
            "Linked lists earn their keep when the program naturally manipulates node positions and needs local structural edits, not when it needs indexed access.",
          ),
        ],
        "Redo the workload analysis until you can justify each choice by access pattern, mutation pattern, and invariant cost.",
      ),
    ),
    hostedLesson: {
      videoUrl: "/dsa/lesson-1.mp4",
      hook:
        "This is where DS&A stops being interview folklore and becomes engineering reasoning. You are not memorizing that one structure is O(1) and another is O(n); you are building a cost model you can use when code mutates real state under latency pressure.",
      teachingPromise:
        "By the end of this lesson, you should be able to reason about sequence structures the way a reviewer would: by operation mix, invariant maintenance, and the hidden costs behind a clean asymptotic slogan.",
      learningObjectives: [
        "Use asymptotic notation as a workload model instead of a flashcard.",
        "State recursive subproblems and base cases precisely enough to prove correctness.",
        "Explain when dynamic arrays beat linked lists and when they do not.",
        "Connect amortized analysis to resize policy and implementation safety.",
      ],
      lectureSegments: [
        {
          title: "Cost models, Big-O, and why operation mix matters more than memorized tables",
          explanation: [
            "Big-O is only useful when you are honest about what operation is being repeated and how often. The formal definition is f(n) = O(g(n)) if there exist constants c > 0 and n₀ ≥ 0 such that f(n) ≤ c·g(n) for all n ≥ n₀. That constant c is the factor Big-O deliberately hides — and constant factors are where real systems win or lose.",
            "The real move is to build an operation mix. If 95% of your work is append and iterate, an array-backed structure benefits from locality and predictable indexing. If your work repeatedly splices around known nodes, pointer-heavy structures start to make sense even though they look worse on a generic random-access benchmark.",
            "Two algorithms with the same O(n log n) growth rate can differ by 5× in wall-clock time because one is cache-friendly and the other is not. The Big-O story and the constant story are both necessary for honest engineering recommendations.",
          ],
          appliedLens:
            "When a teammate recommends a structure, ask for the workload it is optimized for before you ask for the complexity table.",
          checkpoint:
            "What workload would make an array list superior to a linked list even if both have the same asymptotic append cost?",
        },
        {
          title: "Cache locality and the memory hierarchy",
          explanation: [
            "Modern CPUs operate on a tiered memory hierarchy: registers → L1 cache (~4 cycles) → L2 cache (~12 cycles) → L3 cache (~40 cycles) → RAM (~200 cycles). When the CPU fetches from RAM it loads a full cache line — typically 64 bytes — not just the one word you asked for. This is spatial locality working in your favor: if data is laid out contiguously, the next 15 integers are already in cache after the first fetch.",
            "Arrays are the canonical beneficiary. Walking an int array prefetches 16 values per cache-line fetch. Linked lists destroy this: each node's next pointer leads to a random heap address, forcing a fresh cache miss for every element. In modern machine-learning training pipelines this difference is called the 'memory wall' — memory bandwidth, not raw FLOPS, is often the binding constraint on throughput.",
            "Temporal locality matters equally. A variable accessed in a tight loop stays resident in L1. Algorithms designed around this — like blocked matrix multiply — get their speedup from keeping data hot in cache, not from doing less work asymptotically. When you see an unexpected constant-factor gap in benchmarks, cache miss rate is the first thing to investigate.",
          ],
          appliedLens:
            "In HPC and ML workloads, 'this structure is O(n log n)' is rarely enough. Ask how many cache misses the access pattern produces per element.",
          checkpoint:
            "Why does iterating over a linked list cause more cache misses than iterating over an array holding the same number of elements?",
        },
        {
          title: "Dynamic arrays, the accounting method, and linked-list splices",
          explanation: [
            "A dynamic array maintains a dense contiguous block and doubles capacity when full. The accounting method gives a clean amortized proof: charge 3 units per insert — 1 for the write itself, 1 banked against future copying of this element, 1 banked against future copying of an existing element. When resize fires, the banked units exactly cover the O(n) copy. Any fixed-constant growth policy (e.g., +100 slots each time) breaks this: copying n elements every n inserts gives O(n) amortized cost, not O(1).",
            "In code the resize path allocates a new array of size 2 × capacity, copies all elements, and updates the backing-store reference. The copy is O(n), but geometric doubling means total copies over n appends is bounded by 2n — so amortized cost per append is O(1).",
            "Linked lists offer a different bargain. An O(1) splice requires that you already hold a reference to the node you want to insert after — the operation is one pointer rewire with no shifting. But arriving at that node costs O(n) traversal unless you cache references externally, and each node lives at a random heap address, paying a full cache-miss penalty on every traversal step. Separate the cost to locate from the cost to mutate; most linked-list debates blur those two.",
          ],
          appliedLens:
            "Separate the cost to locate a position from the cost to mutate a structure once you are there. Many DS&A debates quietly merge those two costs.",
          checkpoint:
            "Why does a fixed-constant growth policy (adding 100 slots per resize) destroy the amortized O(1) guarantee that geometric doubling preserves?",
        },
      ],
      tutorialSteps: [
        {
          title: "Write the workload before picking the structure",
          purpose:
            "Train yourself to choose data structures from observed operations instead of from memory alone.",
          instructions: [
            "Take three scenarios: event log append-heavy ingestion, text editor cursor inserts, and leaderboard random lookup.",
            "List the dominant operations, their expected frequency, and whether locality or pointer splicing matters more.",
            "Choose a structure for each scenario and defend one alternative you rejected.",
          ],
          successSignal:
            "Your recommendation is anchored in operation mix and invariant cost, not in a one-line complexity slogan.",
          failureMode:
            "The common failure is naming the right structure for the wrong reason, which breaks as soon as the workload changes.",
        },
        {
          title: "Turn one recursive method into a contract proof",
          purpose:
            "Make recursive code legible enough to trust before you execute it.",
          instructions: [
            "Pick binary search or merge sort and write the exact subproblem contract in one sentence.",
            "Identify the base case, the shrinking measure, and the combine step.",
            "Translate the method into a recurrence and explain the runtime in plain language.",
          ],
          successSignal:
            "You can explain both why the method terminates and why it returns the right result.",
          failureMode:
            "If the recursive call's responsibility is vague, debugging becomes stack-frame archaeology instead of reasoning.",
        },
      ],
      misconceptions: [
        "Do not treat Big-O as the whole performance story. Growth rate is necessary, but locality and mutation cost still matter.",
        "Do not call a recursive solution correct just because the code gets smaller inputs. The subproblem contract must still be explicit.",
        "Do not compare linked lists and arrays without separating locate cost from mutate cost.",
      ],
      reflectionPrompts: [
        "Which data structure choice in your past code was really driven by habit rather than workload?",
        "Where do you personally blur the difference between worst-case and amortized guarantees?",
      ],
      masteryChecklist: [
        "Choose between array lists and linked lists using a stated workload and cache-locality argument.",
        "Prove amortized O(1) append using the accounting method and explain why geometric growth is required.",
        "Explain why spatial locality makes arrays faster than linked lists on modern CPUs even at equal asymptotic cost.",
        "Name the invariant you would inspect first when debugging a sequence structure.",
      ],
      practiceProblems: [
        problem(
          "dsa-l1-p1",
          "warm-up",
          "Logic tracing",
          "A dynamic array starts with capacity 4 and doubles when full. You append 10 integers, then remove 7 from the end, and the implementation halves capacity whenever size <= capacity / 4. Trace the sizes and capacities after each resize and explain why this shrink policy can cause thrashing on alternating append/remove workloads.",
          "Write only the moments when capacity changes. Then imagine appending and removing around the threshold repeatedly.",
          "Capacity starts at 4. Appending element 5 triggers growth to 8, and appending element 9 triggers growth to 16. After 10 appends the size is 10 and capacity is 16. Removing down to size 4 triggers shrink to 8 because 4 <= 16/4. Removing to size 2 then triggers shrink to 4 because 2 <= 8/4. The bug-risk is oscillation: if the workload alternates between sizes 4 and 5, the implementation can bounce between capacities 4 and 8, repeatedly copying data. A production-quality policy usually adds hysteresis or shrinks less aggressively so the structure does not thrash near the boundary.",
          [
            "Did you record only the resize boundaries rather than every append?",
            "Can you explain why aggressive shrinking hurts amortized behavior?",
            "Can you name one safer shrink policy than 'halve immediately at 25%'?",
          ],
        ),
        problem(
          "dsa-l1-p2",
          "challenge",
          "Debugging",
          "A doubly linked list remove-at-index implementation updates prev.next to skip the target node but forgets to update next.prev for the successor node. Give a concrete failing scenario, describe the invariant that was broken, and explain what later operation is most likely to expose the bug.",
          "Think about forward traversal versus backward traversal. Which one can appear correct for a while?",
          "Suppose the list is A <-> B <-> C <-> D and you remove C. If you only set B.next = D but forget D.prev = B, forward traversal from head may still print A, B, D correctly. The broken invariant is bidirectional consistency: for every internal node x, x.next.prev must equal x and x.prev.next must equal x. Backward traversal from tail or any operation that walks left from D will still point to the removed node C, which can create stale references, duplicate removals, or null-pointer errors later. The dangerous part is that simple forward tests may pass, making the bug feel intermittent.",
          [
            "Can you state the bidirectional invariant explicitly?",
            "Did you give a failing sequence, not just a vague description?",
            "Can you name the first class of operation likely to reveal the bug?",
          ],
        ),
      ],
      codingProblems: DSA_CODING_PROBLEMS["dsa-lesson-1"],
    },
  },
  "dsa-lesson-2": {
    lesson: lesson(
      "dsa-lesson-2",
      "Stacks, Queues, Deques, and Amortized Thinking",
      "90 min",
      "Understand LIFO and FIFO adapters, circular-buffer implementations, and the operational meaning of amortized analysis.",
      [
        "Stack and queue semantics as interface contracts, not just container shapes",
        "Circular arrays, front/back indices, and off-by-one failure modes",
        "Amortized analysis as bookkeeping for resize-heavy structures",
      ],
      [
        "Adapter structures are defined by allowed operations and invariants, not by the fact that they sit on top of an array or list.",
        "Most queue bugs are index and wraparound bugs long before they are asymptotic bugs.",
        "Amortized analysis is a credit argument about sequences of operations, not a claim about a single operation.",
      ],
      [
        video(
          "Princeton Algorithms: Stacks and Queues",
          "Ground LIFO/FIFO reasoning in canonical implementations and invariants.",
          "https://algs4.cs.princeton.edu/home/",
          "Princeton Algorithms",
        ),
      ],
      [
        exercise(
          "dsa-lesson-2-ex-1",
          "Design a deque without index confusion",
          "lab",
          "Sketch an array-backed deque API and document the meaning of front, back, size, and empty/full states. Include resize behavior and wraparound rules.",
          ["One invariant sheet", "One index-update table", "One bug checklist"],
          [
            "What does front point at when the deque is empty?",
            "Which index changes first during add/remove on each side?",
            "How will you copy elements during resize without changing logical order?",
          ],
        ),
      ],
      quiz(
        [
          question(
            "dsa-lesson-2-q1",
            "Why do circular arrays show up so often in queue and deque implementations?",
            [
              "Because they make all operations worst-case O(1) without any edge cases",
              "Because they reuse array space without shifting elements on every dequeue",
              "Because linked lists cannot represent FIFO order",
              "Because they remove the need for resizing",
            ],
            1,
            "Wraparound indexing lets the structure reuse freed slots rather than treating the array as a one-way conveyor belt.",
          ),
          question(
            "dsa-lesson-2-q2",
            "What does amortized O(1) enqueue on a resizing circular queue actually guarantee?",
            [
              "Every single enqueue is constant time",
              "The average cost over a long valid sequence stays bounded even if occasional resizes cost O(n)",
              "The queue never copies elements",
              "The queue uses less memory than a linked list in every case",
            ],
            1,
            "Amortized guarantees are about sequences of operations, not about ruling out occasional expensive steps.",
          ),
        ],
        "Rework the deque invariants until you can update indices on paper without guessing.",
      ),
    ),
    hostedLesson: {
      videoUrl: "/dsa/lesson-2.mp4",
      hook:
        "Stacks and queues look simple until you implement them without a library. Then every hidden decision about empty states, wraparound, and resize order becomes visible.",
      teachingPromise:
        "This lesson turns these 'introductory' structures into serious engineering exercises: contracts, circular index arithmetic, and amortized cost arguments that survive code review.",
      learningObjectives: [
        "Explain stack, queue, and deque behavior as API contracts.",
        "Implement circular-buffer indexing without off-by-one ambiguity.",
        "Use amortized analysis to justify resize-heavy adapters.",
        "Debug queue behavior by checking index meaning before checking complexity.",
      ],
      lectureSegments: [
        {
          title: "Stack and queue semantics as interface contracts, not just container shapes",
          explanation: [
            "A stack is not 'a list where you use the end.' It is a contract that only exposes push, pop, and peek in LIFO order. A queue is similarly defined by FIFO semantics. The moment you start mixing direct indexing or arbitrary removal into the public interface, you are no longer reasoning about the same object.",
            "This matters because implementations are replaceable only when contracts stay tight. An array-backed stack and a linked-list-backed stack can both be correct if they preserve the same observable behavior under valid calls.",
            "The right first question in code review is therefore not 'did they use the optimal backing store?' but 'did they preserve the semantic contract and edge conditions faithfully?'",
          ],
          appliedLens:
            "When a structure misbehaves, inspect whether the code is violating the adapter contract before you chase micro-optimizations.",
          checkpoint:
            "Why is exposing extra mutation methods on a stack implementation often a design mistake even if the methods are efficient?",
        },
        {
          title: "Circular arrays, front/back indices, and off-by-one failure modes",
          explanation: [
            "The circular queue reuses dead array space with modulo indexing: next = (index + 1) % capacity. The subtlety is that modulo arithmetic alone cannot distinguish a full buffer from an empty one — both states can produce head == tail. The standard fixes are to maintain a separate `size` variable or to leave one slot permanently empty as a sentinel. Both work; mixing conventions in a single implementation is where bugs are born.",
            "Every implementation must also make two meanings precise before any mutation code is written: does `front` point to the first live element or to the next-insertion slot, and is the `back` index inclusive or exclusive? Update order matters too — for addFirst you must decrement front before writing; for removeFirst you must read before incrementing front. Swapping those two lines is a textbook off-by-one.",
            "In concurrent ML data pipelines, circular buffers underlie multi-producer multi-consumer (MPMC) queues where the GPU and CPU exchange tensor batches. Lock-free implementations replace the `size` variable with atomic compare-and-swap on head and tail indices, but the same full/empty disambiguation problem recurs at every level of the stack.",
          ],
          appliedLens:
            "Write the index meaning in comments before you write the mutation code. It prevents entire classes of queue bugs.",
          checkpoint:
            "Why does maintaining a separate `size` variable disambiguate full from empty, when the modulo-wrapped head and tail indices alone cannot?",
        },
        {
          title: "Amortized analysis and the five-point deque bug checklist",
          explanation: [
            "Amortized analysis is a promise about a sequence of operations, not a single event. An enqueue sequence can include O(n) resize events, and the guarantee holds as long as those events are spread across enough cheap operations. The proof mirrors the accounting-method argument from Lesson 1: charge a small credit on each cheap enqueue, and show the bank covers the occasional O(n) copy.",
            "Resize in a circular deque has an extra wrinkle: elements must be copied in logical order starting from `front`, not in raw physical array order from index 0. If front is at position 6 and the queue wraps around, copying indices 0..n-1 directly scrambles the FIFO sequence. The correct copy loop walks `size` elements from `front mod capacity` and writes them into a fresh contiguous block.",
            "Five-point bug checklist for any circular deque: (1) Is full/empty disambiguation unambiguous — size variable or one-slot sentinel, not guessed? (2) Does every mutation method agree on what `front` points to? (3) Does the modulo wrap happen on read or on write consistently? (4) Does resize copy in logical, not physical, order? (5) Are edge-case sizes 0 and 1 covered by tests before integration?",
          ],
          appliedLens:
            "Use amortized arguments to justify resize policies; use invariants and tests to ensure the implementation actually matches the policy.",
          checkpoint:
            "Why is 'one enqueue can be O(n)' not a contradiction of 'enqueue is amortized O(1)'?",
        },
      ],
      tutorialSteps: [
        {
          title: "Lock down deque index semantics",
          purpose:
            "Prevent circular-buffer bugs by making every index meaning explicit before you mutate state.",
          instructions: [
            "Define whether front points at the first logical element and whether back points at the last element or next insertion slot.",
            "Write the exact state transition for addFirst, addLast, removeFirst, and removeLast.",
            "Check the transitions against empty, singleton, and full-buffer cases.",
          ],
          successSignal:
            "You can execute each operation on paper without guessing where the pointers move.",
          failureMode:
            "The standard failure is silently changing index conventions between methods.",
        },
        {
          title: "Prove amortized O(1) with credits",
          purpose:
            "Make resize arguments rigorous instead of intuitive.",
          instructions: [
            "Assign a small extra charge to each successful enqueue.",
            "Show how those credits accumulate until a resize is needed.",
            "Explain why the total credit is enough to pay for copying all live elements.",
          ],
          successSignal:
            "Your proof explains where the copy cost is prepaid rather than merely asserting that it averages out.",
          failureMode:
            "A weak argument says 'it usually will not resize' without proving anything about long sequences.",
        },
      ],
      misconceptions: [
        "Do not talk about queues as if the backing store defines the abstraction. FIFO behavior defines the abstraction.",
        "Do not trust modular arithmetic you have not traced on empty and wraparound cases.",
        "Do not confuse amortized O(1) with worst-case O(1). They answer different questions.",
      ],
      reflectionPrompts: [
        "Which queue bug are you more likely to write: wrong index update order or wrong resize copy order?",
        "When have you rejected a data structure because of worst-case cost without checking the operation sequence?",
      ],
      masteryChecklist: [
        "State the contract for a stack, queue, and deque clearly.",
        "Trace circular-array updates without ambiguity.",
        "Explain amortized analysis as a sequence-level guarantee.",
        "Name the first invariant you would test in a buggy deque implementation.",
      ],
      practiceProblems: [
        problem(
          "dsa-l2-p1",
          "warm-up",
          "Code tracing",
          "A deque is backed by an array of length 8. front = 6 and size = 4, so the logical elements in order are [A, B, C, D]. Trace the physical indices used after addFirst(X), addLast(Y), removeLast(), and removeFirst(). Assume front always points at the first logical element and addLast writes to (front + size) mod capacity.",
          "Translate each logical operation into the exact index it touches before changing size.",
          "Initial logical order uses indices 6, 7, 0, 1. addFirst(X) decrements front to 5 and writes X there; size becomes 5 and order is [X, A, B, C, D]. addLast(Y) writes at (5 + 5) mod 8 = 2, size becomes 6. removeLast() removes index (5 + 6 - 1) mod 8 = 2, which is Y, and size returns to 5. removeFirst() removes index 5, then front advances to 6 and size returns to 4, restoring [A, B, C, D]. The point is that the same physical array location can be reused cleanly as long as front meaning stays fixed.",
          [
            "Did you recompute the target index after each size change?",
            "Can you explain why logical order is preserved despite wraparound?",
            "Did you keep front's meaning consistent throughout the trace?",
          ],
        ),
        problem(
          "dsa-l2-p2",
          "challenge",
          "Debugging",
          "A circular queue doubles capacity when full. During resize, the code copies the old array from index 0 upward into the new array instead of copying in logical queue order starting from front. Give a concrete queue state where this corrupts FIFO behavior and explain the symptom seen by the next two dequeues.",
          "Pick a state where front is not 0. Then compare physical order with logical order.",
          "Suppose capacity is 6 and the logical queue is [40, 50, 60, 70] with front = 4. Physically, the array stores 40 at 4, 50 at 5, 60 at 0, and 70 at 1. If resize copies indices 0..5 directly, the new array begins [60, 70, _, _, 40, 50, ...], so the queue's internal representation no longer starts with the true logical front. If the implementation then resets front to 0, the next dequeues return 60 then 70 instead of 40 then 50, which is a direct FIFO violation. The invariant broken is that copy order during resize must follow logical order, not raw physical layout.",
          [
            "Did you choose a state with wraparound, not front = 0?",
            "Can you name the exact invariant broken by the bad copy loop?",
            "Did you show the user-visible FIFO failure, not just internal corruption?",
          ],
        ),
      ],
      codingProblems: DSA_CODING_PROBLEMS["dsa-lesson-2"],
    },
  },
  "dsa-lesson-3": {
    lesson: lesson(
      "dsa-lesson-3",
      "Trees, Balanced Search, and Priority Queues",
      "100 min",
      "Study BST ordering, AVL rebalancing, and heaps as two different ways to exploit tree structure.",
      [
        "Binary search tree ordering and traversal semantics",
        "AVL balance, rotations, and height guarantees",
        "Heaps and priority queues as partial-order data structures",
      ],
      [
        "BSTs optimize ordered lookup when their shape stays healthy.",
        "Rotations preserve order while repairing height imbalance.",
        "Heaps are for extreme-priority access, not general search.",
      ],
      [
        video(
          "MIT 6.006: Binary Search Trees and Heaps",
          "Reinforce how tree shape governs search and update cost.",
          "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/",
          "MIT OpenCourseWare",
        ),
      ],
      [
        exercise(
          "dsa-lesson-3-ex-1",
          "Diagnose a self-balancing tree by rotations",
          "debugging",
          "Given insertion logs and balance factors, identify where an AVL implementation skipped or chose the wrong rotation. Explain the resulting complexity risk.",
          ["One rotation trace", "One corrected rebalance sequence", "One complexity note"],
          [
            "Is the case LL, LR, RL, or RR?",
            "Which rotation preserves in-order traversal?",
            "How does one missed rebalance affect future operations?",
          ],
        ),
      ],
      quiz(
        [
          question(
            "dsa-lesson-3-q1",
            "Why do AVL rotations not break the binary-search-tree ordering invariant?",
            [
              "Because rotations never move keys between nodes",
              "Because rotations only relabel heights",
              "Because rotations preserve in-order key ordering while changing local parent-child structure",
              "Because AVL trees do not use comparisons",
            ],
            2,
            "A rotation is a local structural rewrite that preserves the sorted left-root-right relationship among the affected nodes.",
          ),
          question(
            "dsa-lesson-3-q2",
            "Why is a binary heap a poor choice for checking whether an arbitrary key exists?",
            [
              "Because heaps are unsorted",
              "Because the heap only guarantees parent priority relative to children, not global search order",
              "Because heap insert is O(n)",
              "Because heaps cannot store duplicates",
            ],
            1,
            "A heap is a partial order built for extracting the minimum or maximum efficiently, not for general membership search.",
          ),
        ],
        "Trace rotations and percolation until the invariants feel structural rather than procedural.",
      ),
    ),
    hostedLesson: {
      videoUrl: "/dsa/lesson-3.mp4",
      hook:
        "Trees are where local structure starts to buy global power. Ordered search, logarithmic height, and extreme-priority access all come from maintaining the right invariant, not from the fact that pointers happen to form a tree.",
      teachingPromise:
        "This lesson gives you the tree-level intuition behind BSTs, AVL trees, and heaps so you can reason about shape, not just memorize operation tables.",
      learningObjectives: [
        "Explain how BST ordering supports lookup, predecessor, and traversal logic.",
        "Recognize AVL imbalance cases and choose the correct rotation.",
        "Differentiate a search tree from a heap by the invariant each one maintains.",
        "Debug tree behavior by inspecting structural invariants before output symptoms.",
      ],
      lectureSegments: [
        {
          title: "Binary search tree ordering and traversal semantics",
          explanation: [
            "A binary search tree works because every node partitions the key space: everything left is smaller, everything right is larger. That local rule creates a global searchable structure as long as the tree does not degenerate into a chain.",
            "Traversals are not arbitrary walks. In-order traversal reads the ordered set, pre-order is useful when serializing structure before children, and post-order is natural when cleanup or bottom-up aggregation matters.",
            "The deeper lesson is that tree APIs are really statements about structure plus ordering. Once either part is violated, the rest of the promised operations stop making sense.",
          ],
          appliedLens:
            "When a BST bug appears, ask first whether the order invariant is broken or whether the shape has degraded, because those failures have very different causes.",
          checkpoint:
            "Why does an in-order traversal of a valid BST return keys in sorted order without any extra sorting step?",
        },
        {
          title: "AVL balance factors, rotations, and height guarantees",
          explanation: [
            "AVL trees add a height invariant to the BST ordering: the Balance Factor of every node, defined as Height(left subtree) − Height(right subtree), must stay in {−1, 0, +1}. When an insertion violates this, a rotation restores balance in O(1) pointer operations. Rotations come in four named cases depending on which subtree grew: LL (left-left), RR (right-right), LR (left-right), RL (right-left).",
            "A single rotation handles LL and RR. RR example: node A has right-heavy child B with right-heavy grandchild C. Step 1 — set A.right = B.left. Step 2 — set B.left = A. Step 3 — recalculate heights for A then B. B becomes the new local root. The in-order sequence A, B, C is unchanged; only parent-child pointers shift. LR and RL are zigzag imbalances requiring a double rotation: first a single rotation on the child, then a single rotation on the imbalanced node.",
            "The engineering intuition is that rotations are preemptive maintenance, not overhead. A single missed rebalance on a hot path can silently degrade a logarithmic lookup to linear over many insertions, and the degradation is invisible in unit tests on small datasets.",
          ],
          appliedLens:
            "If a self-balancing tree is slow in production, inspect whether the implementation silently skips a rebalance path before blaming the data structure design.",
          checkpoint:
            "What does a double rotation (LR or RL) fix that a single rotation cannot, and why does the zigzag shape require two steps?",
        },
        {
          title: "Heaps and priority queues as partial-order data structures",
          explanation: [
            "A heap relaxes the search-tree objective. It only promises that each parent has priority relative to its children — not that siblings are ordered, and not that arbitrary keys can be searched efficiently. That partial order is exactly what priority scheduling, Dijkstra's algorithm, and beam-search decoding need: fast access to the single most urgent item.",
            "The representation is an implicit array tree. For a node at index i, its left child is at 2i+1 and right child at 2i+2. This means no pointers, dense memory layout, and spatial locality on percolate operations. Extract-min replaces the root with the last element, then sifts it down by swapping with the smaller child until the invariant is restored.",
            "Decision tree for heap vs AVL: choose a heap when the application repeatedly asks 'what is the next minimum or maximum?' and nothing else. Choose an AVL tree (or a balanced BST) when the application needs arbitrary key lookup, sorted traversal, predecessor/successor queries, or range queries — because the heap's partial order cannot answer any of those efficiently.",
          ],
          appliedLens:
            "Pick a heap when your application repeatedly asks for the next best item. Pick a balanced BST when it needs full ordered queries.",
          checkpoint:
            "Why is heap order sufficient for a priority queue but insufficient for a map, set, or range query?",
        },
        {
          title: "B-Trees and external-memory storage",
          explanation: [
            "A B-Tree generalizes the BST so each node holds up to m − 1 keys and m child pointers. Height becomes O(log_m n) — with m = 100, a B-Tree over one billion records is only four levels deep. Every step down the tree touches one node, and each node is sized to match exactly one disk block (commonly 4 KB), so a full lookup reads only four disk pages regardless of dataset size.",
            "Self-balancing is maintained through splits (when a node overflows during insertion) and merges (when a node underflows after deletion). These are the B-Tree analogues of AVL rotations: local structural rewrites that keep height tightly bounded. Every non-root node must hold between ⌈m/2⌉ − 1 and m − 1 keys, preventing both sparseness and overflow.",
            "In machine-learning infrastructure, B-Trees appear in feature stores and embedding-lookup tables where the full dataset lives on disk or object storage and must be queried by key during training or inference. The block-aligned access pattern is not cosmetic — it is the reason B-Trees dominate relational databases while AVL trees dominate in-memory indexes.",
          ],
          appliedLens:
            "When your ML system queries external storage for features or embeddings, the access latency is dominated by disk-seek count — and B-Tree height is the seek count.",
          checkpoint:
            "Why does a B-Tree with branching factor 100 need far fewer disk reads than an AVL tree over the same dataset?",
        },
      ],
      tutorialSteps: [
        {
          title: "Trace one AVL rebalance by hand",
          purpose:
            "Make rotations feel like structural repairs rather than magic diagrams.",
          instructions: [
            "Insert a short sequence that causes an LR or RL imbalance.",
            "Record heights and balance factors after each insertion.",
            "Perform the needed rotations and verify that in-order output is unchanged.",
          ],
          successSignal:
            "You can explain both why the tree was unbalanced and why the repair preserves search order.",
          failureMode:
            "The usual failure is choosing a rotation from memory without checking which subtree actually grew.",
        },
        {
          title: "Separate heap reasoning from BST reasoning",
          purpose:
            "Stop transferring search-tree intuitions into heap code where they do not apply.",
          instructions: [
            "Take the same key set and build both a valid BST and a valid min-heap.",
            "List which queries are cheap in each structure and why.",
            "Give one operation each structure is structurally bad at.",
          ],
          successSignal:
            "You can justify the different capabilities directly from the invariant each structure maintains.",
          failureMode:
            "A common mistake is assuming any tree-like shape supports efficient ordered search.",
        },
      ],
      misconceptions: [
        "Do not treat tree shape as cosmetic. Shape determines asymptotic behavior.",
        "Do not memorize rotation cases without understanding which subtree caused the imbalance.",
        "Do not use a heap when you really need ordered membership queries.",
      ],
      reflectionPrompts: [
        "Which tree invariant do you trust least under implementation pressure: ordering, height metadata, or parent-child linkage?",
        "Where in production code would predictable logarithmic behavior matter more than simpler implementation?",
      ],
      masteryChecklist: [
        "Explain BST ordering and in-order traversal semantics.",
        "Name all four AVL rotation cases (LL, RR, LR, RL) and explain when each applies.",
        "Perform a single and double AVL rotation and verify in-order output is unchanged.",
        "Describe the exact promise a heap does and does not make, and apply the heap-vs-BST decision tree.",
        "Explain why B-Tree height O(log_m n) makes it suitable for disk-based external storage.",
      ],
      practiceProblems: [
        problem(
          "dsa-l3-p1",
          "warm-up",
          "Logic tracing",
          "Insert the keys 40, 20, 60, 10, 30, 25 into an empty AVL tree. Identify the first imbalance, classify it, and give the final root after rebalancing. Then list the in-order traversal.",
          "Do not wait until the end to check balance. Inspect heights after each insertion.",
          "After inserting 40, 20, 60, 10, and 30, the tree remains balanced. Inserting 25 makes node 40 left-heavy while its left child 20 is right-heavy, which is an LR case. First rotate left at 20, then rotate right at 40. The final root becomes 30. The in-order traversal is still 10, 20, 25, 30, 40, 60, which demonstrates that rotations preserve sorted order.",
          [
            "Did you identify the imbalance at the first moment it appears?",
            "Can you justify why the case is LR rather than LL?",
            "Did your in-order traversal stay sorted after the rotations?",
          ],
        ),
        problem(
          "dsa-l3-p2",
          "challenge",
          "Coding",
          "Write the percolateDown logic for a min-heap remove-min operation in words or pseudocode. Then explain the exact bug that appears if you always swap with the left child whenever it exists, instead of swapping with the smaller child.",
          "A min-heap repair step must preserve the parent <= both children invariant after every swap.",
          "PercolateDown compares the current node with both children, selects the smaller child, swaps if that child is smaller than the current node, and repeats until the node is no larger than either child or it reaches a leaf. If you always swap with the left child when it exists, you can move a larger child above a smaller right child. Example: current node 9, left child 12, right child 4. Swapping with the left child produces parent 12 above child 4 or leaves 9 above 4 depending on the exact code path, both of which violate the min-heap invariant. The key is that the repair step must choose the best local child, not any child.",
          [
            "Did your pseudocode compare both children before swapping?",
            "Can you produce a concrete counterexample for the 'always left' bug?",
            "Did you state the stopping condition clearly?",
          ],
        ),
      ],
      codingProblems: DSA_CODING_PROBLEMS["dsa-lesson-3"],
    },
  },
  "dsa-lesson-4": {
    lesson: lesson(
      "dsa-lesson-4",
      "Hash Tables, Sets, and Associative Lookup",
      "90 min",
      "Learn how hashing trades ordered structure for expected-time lookup, and why collision policy and load-factor management determine real behavior.",
      [
        "Hashing as deterministic dispersion into buckets or probes",
        "Collision resolution, deletion semantics, and load-factor discipline",
        "Choosing between maps, sets, and ordered structures",
      ],
      [
        "A hash table is only fast when its distribution and resize policy stay healthy.",
        "Deletion is easy to get wrong because it interacts with the collision strategy.",
        "Expected O(1) lookup is not a substitute for order-sensitive queries.",
      ],
      [
        video(
          "VisuAlgo Hash Tables",
          "Use visual probe and collision traces to make open addressing and chaining concrete.",
          "https://visualgo.net/en/hashtable",
          "VisuAlgo",
        ),
      ],
      [
        exercise(
          "dsa-lesson-4-ex-1",
          "Review a hash-table deletion policy",
          "debugging",
          "Given an open-addressed hash table implementation, evaluate whether remove preserves successful future search. Focus on tombstones, probe termination, and resize timing.",
          ["One deletion trace", "One bug explanation", "One corrected policy note"],
          [
            "What tells a search to keep probing?",
            "What tells a search it can stop?",
            "How does deletion change those conditions?",
          ],
        ),
      ],
      quiz(
        [
          question(
            "dsa-lesson-4-q1",
            "Why can deleting an open-addressed table entry by simply clearing the slot break future lookups?",
            [
              "Because hash codes become invalid",
              "Because later searches may stop early and fail to follow the probe chain past the cleared slot",
              "Because the table becomes unsorted",
              "Because resizing no longer works",
            ],
            1,
            "Open addressing depends on uninterrupted probe sequences. Clearing a slot can falsely signal 'key not present' for items inserted later in the same cluster.",
          ),
          question(
            "dsa-lesson-4-q2",
            "When is an ordered tree still better than a hash table?",
            [
              "When you need expected constant-time membership only",
              "When your keys are integers",
              "When you need predecessor, successor, or sorted traversal queries",
              "Whenever collisions are possible",
            ],
            2,
            "Hash tables optimize equality-based lookup; ordered trees are better when the application needs order-sensitive operations.",
          ),
        ],
        "Trace collisions and deletions until you can say exactly when a probe continues and when it should stop.",
      ),
    ),
    hostedLesson: {
      videoUrl: "/dsa/lesson-4.mp4",
      hook:
        "Hash tables feel magical when they work and mysterious when they do not. The difference is whether you understand that hashing is not about randomness in the abstract; it is about maintaining short, healthy search paths under a chosen collision policy.",
      teachingPromise:
        "This lesson gives you the operational view of maps and sets: dispersion, clustering, deletion semantics, and how to know when a hash table is the wrong tool.",
      learningObjectives: [
        "Explain how hashing turns a key into a lookup path.",
        "Differentiate chaining from open addressing operationally.",
        "Handle deletion correctly under the collision policy in use.",
        "Choose between hash-based and order-based lookup structures.",
      ],
      lectureSegments: [
        {
          title: "Hashing as deterministic dispersion into buckets or probes",
          explanation: [
            "Hashing takes a key and deterministically maps it to a location or a probe sequence. The goal is not perfect uniqueness; it is to spread keys well enough that the expected lookup path stays short.",
            "This is why the hash function and table size interact. Poor dispersion or adversarial patterns create clusters, and clusters turn an expected O(1) table into something much less impressive.",
            "The useful mental model is therefore path length. A hash table is healthy when insert, find, and delete touch a small number of slots or nodes on average.",
          ],
          appliedLens:
            "When a hash-based structure slows down, inspect load factor and clustering behavior before assuming the asymptotic story was wrong.",
          checkpoint:
            "What does a good hash function buy you if collisions are still unavoidable?",
        },
        {
          title: "Collision resolution, deletion semantics, and load-factor discipline",
          explanation: [
            "Collisions are not bugs; they are the normal operating mode. The important decision is how the structure resolves them: separate chaining (each slot is a linked list), linear probing (scan forward to the next open slot), quadratic probing, or double hashing. Each trades differently on cache behavior, clustering risk, and implementation complexity.",
            "Deletion in open addressing is subtle because lookup depends on probe-chain continuity. Concrete failure: insert X and Y, both hashing to slot 2. X lands at 2, Y probes to 3. Now delete X by clearing slot 2 to null. A search for Y hashes to slot 2, sees null, and stops — reporting 'not found' even though Y is alive at slot 3. This is a false negative caused by a broken probe chain. The fix is tombstones: a special marker that means 'this slot is vacant, but keep probing.' Two common implementations are a static sentinel value (a special reserved key) and a separate bit-masking metadata array, where each slot has a 'deleted' bit. The bit-masking approach is more cache-friendly because the metadata is dense and separate from the keys.",
            "Load factor (items / slots) is the pressure gauge. Past roughly 0.7 for open addressing, clusters grow superlinearly and probe sequences stretch. A resize that rehashes all entries into a larger table is an O(n) event, but with geometric growth it is amortized over many insertions — the same accounting-method argument as dynamic arrays.",
          ],
          appliedLens:
            "Monitor cluster size, tombstone count, and load factor in production hash tables. They tell the performance story before latency alerts fire.",
          checkpoint:
            "Why does clearing a deleted slot to null in linear probing create false negatives, and how does a tombstone prevent them?",
        },
        {
          title: "Choosing between hash maps, ordered trees, and B-Trees",
          explanation: [
            "A hash map optimizes equality-based lookup at expected O(1) cost. It deliberately destroys key ordering. If your application needs predecessor/successor queries, range queries, sorted iteration, or reproducible order, an ordered tree is structurally better — even though raw point lookup is slower by a small constant.",
            "B-Trees occupy a third category: ordered like a BST, but with high branching factor and block-aligned nodes for disk or SSD access. When a feature store, database index, or embedding lookup table must be stored externally, B-Tree height O(log_m n) minimizes the number of disk-page fetches per lookup. A hash table stored externally cannot offer ordered access, and a standard AVL tree requires too many disk seeks per lookup because each node maps to a separate page.",
            "The decision framework: use a hash map for high-throughput equality lookup with no ordering requirements; use an AVL or red-black tree for in-memory ordered collections; use a B-Tree when data lives on disk or object storage and key ordering must be preserved.",
          ],
          appliedLens:
            "Choose the structure that matches the product's query language, not the one with the most flattering single-operation benchmark.",
          checkpoint:
            "What query class becomes awkward the moment you pick a plain hash map over an ordered structure?",
        },
      ],
      tutorialSteps: [
        {
          title: "Trace an open-addressed probe chain",
          purpose:
            "Make collision behavior concrete enough to debug later.",
          instructions: [
            "Choose a small table and a simple probe rule.",
            "Insert several colliding keys and record the probe sequence for each insertion.",
            "Then search for a present key and an absent key and note exactly when the search terminates.",
          ],
          successSignal:
            "You can explain why each search continued or stopped at each slot.",
          failureMode:
            "A weak trace treats collisions as one-step events instead of full probe paths.",
        },
        {
          title: "Write the deletion contract before the code",
          purpose:
            "Prevent the classic 'cleared slot breaks later search' bug.",
          instructions: [
            "State what information a lookup needs from every visited slot.",
            "Decide whether your table uses tombstones, backshifting, or rebuild-on-delete.",
            "Check how your choice affects probe termination and resize policy.",
          ],
          successSignal:
            "Your delete method preserves future lookup correctness, not just immediate removal.",
          failureMode:
            "The common bug is to make remove locally correct and globally wrong for later searches.",
        },
      ],
      misconceptions: [
        "Do not talk about hash tables as if collisions are exceptional. Collision handling is the design.",
        "Do not clear open-addressed slots blindly during deletion.",
        "Do not choose hashing when the product needs ordered queries.",
      ],
      reflectionPrompts: [
        "What monitoring signal would tell you a production hash table is degrading before latency alerts fire?",
        "Where in your own experience did a 'constant time' structure hide a policy bug rather than a complexity bug?",
      ],
      masteryChecklist: [
        "Explain how collisions are resolved in the structure you picked.",
        "Preserve correct lookup behavior after deletion.",
        "Use load factor as a practical health signal.",
        "Choose between hash tables and ordered trees based on query needs.",
      ],
      practiceProblems: [
        problem(
          "dsa-l4-p1",
          "warm-up",
          "Code tracing",
          "A linear-probing table of size 7 inserts keys with hash indices: A -> 2, B -> 2, C -> 3, D -> 2. Trace the final slot of each key and explain why clustering appears even though only one hash index was duplicated originally.",
          "Insert in order and record every probe step, not just the final positions.",
          "A goes to slot 2. B hashes to 2, finds it occupied, and lands at 3. C hashes to 3, finds it occupied by B, probes to 4, and lands there. D hashes to 2, then probes 3 and 4, finally landing at 5. The cluster grows because every later key colliding anywhere in that run gets pushed further right, extending the occupied block. This is primary clustering: collisions create contiguous probe runs that attract even more collisions.",
          [
            "Did you trace each probe sequence rather than only the destination slots?",
            "Can you define primary clustering in your own words?",
            "Can you explain why C moved even though its original hash was 3 rather than 2?",
          ],
        ),
        problem(
          "dsa-l4-p2",
          "challenge",
          "Debugging",
          "An open-addressed map uses linear probing and marks deleted entries by setting the slot to null. Show a concrete insertion/search/deletion sequence where a later successful lookup becomes a false negative. Then describe the minimal fix.",
          "Make sure the searched-for key sits beyond the deleted slot in the same probe chain.",
          "Suppose size 5, keys K1 and K2 both hash to 1. Insert K1 at slot 1 and K2 at slot 2 after one probe. Now delete K1 by setting slot 1 to null. A lookup for K2 hashes to 1, sees null, and stops immediately, incorrectly reporting 'not found' even though K2 is still at slot 2. The minimal fix is to use a tombstone marker that means 'this slot no longer holds a live key, but probing must continue' or to rebuild/shift entries carefully so the probe chain remains valid.",
          [
            "Did you include the exact false-negative lookup path?",
            "Can you explain why null and tombstone mean different things to the search algorithm?",
            "Did you propose a fix that preserves future searches, not just deletion?",
          ],
        ),
      ],
      codingProblems: DSA_CODING_PROBLEMS["dsa-lesson-4"],
    },
  },
  "dsa-lesson-5": {
    lesson: lesson(
      "dsa-lesson-5",
      "Sorting, Partitioning, and Selection",
      "100 min",
      "Compare elementary and advanced sorting algorithms, reason about partition invariants, and connect sorting ideas to selection.",
      [
        "Stability, adaptiveness, in-place behavior, and the comparison lower bound",
        "Merge sort, quicksort, heap sort, and radix sort as different design bets",
        "Partition invariants and quickselect for top-k style problems",
      ],
      [
        "Sorting algorithms differ because they optimize for different constraints, not because one of them is 'the real one.'",
        "Partition-based algorithms live or die on local invariants.",
        "Selection often avoids the full cost of sorting when you only need one rank statistic or top-k slice.",
      ],
      [
        video(
          "MIT 6.006: Sorting",
          "Ground sort analysis and lower bounds in a rigorous open lecture sequence.",
          "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/",
          "MIT OpenCourseWare",
        ),
      ],
      [
        exercise(
          "dsa-lesson-5-ex-1",
          "Choose the right sort for the workload",
          "analysis",
          "For four workloads, justify whether you would pick merge sort, quicksort, heap sort, radix sort, or insertion sort. Include memory, stability, and input-shape reasoning.",
          ["One decision table", "One explanation per workload", "One risk note"],
          [
            "Do you need stability?",
            "Is the data nearly sorted?",
            "Are keys numeric with bounded digit structure?",
          ],
        ),
      ],
      quiz(
        [
          question(
            "dsa-lesson-5-q1",
            "Why is merge sort stable in its standard form?",
            [
              "Because it uses recursion",
              "Because equal keys can be copied from the left subarray before equal keys from the right, preserving original relative order",
              "Because it is in-place",
              "Because it always runs in linear time",
            ],
            1,
            "Stability is about preserving relative order for equal keys, which standard merge can do by choosing the left element first on ties.",
          ),
          question(
            "dsa-lesson-5-q2",
            "When is quickselect preferable to fully sorting the array?",
            [
              "When you need the entire array in sorted order",
              "When you only need one rank statistic or a small top-k frontier",
              "When keys are strings",
              "When stability is mandatory",
            ],
            1,
            "Selection avoids paying for total order when the problem only asks for a single position or partial frontier.",
          ),
        ],
        "Trace partitions until the loop invariants are clearer than the code syntax.",
      ),
    ),
    hostedLesson: {
      videoUrl: "/dsa/lesson-5.mp4",
      hook:
        "Sorting is a compressed course in algorithm design. It teaches invariants, divide-and-conquer, partial order, and the idea that 'best algorithm' always depends on what else the system needs.",
      teachingPromise:
        "By the end of this lesson, you should be able to defend a sorting choice with stability, memory, and input-shape reasoning and explain partition-based algorithms without hand-waving.",
      learningObjectives: [
        "Use stability, adaptiveness, and in-place behavior as engineering criteria.",
        "Differentiate major sorting algorithms by the tradeoff each one makes.",
        "State the partition invariant behind quicksort and quickselect.",
        "Recognize when selection is cheaper than full sorting.",
      ],
      lectureSegments: [
        {
          title: "Stability, adaptiveness, in-place behavior, and the comparison lower bound",
          explanation: [
            "Before choosing a sort, you need the vocabulary of constraints. Stability matters when equal keys carry secondary information. Adaptiveness matters when the input is already close to sorted. In-place behavior matters when memory pressure is real.",
            "These are not incidental properties. They determine whether an algorithm fits the surrounding system. A stable but memory-hungry sort and an unstable in-place sort solve different operational problems.",
            "The comparison lower bound also matters because it tells you when improvements must come from exploiting extra structure, such as integer digits in radix sort, rather than hoping for a magical comparison sort below O(n log n).",
          ],
          appliedLens:
            "When a team says 'just sort it,' ask what properties of the sorted result and runtime environment actually matter.",
          checkpoint:
            "Why is a stable sort sometimes required even when the primary key order is already correct?",
        },
        {
          title: "Merge sort, quicksort, heap sort, and radix sort as different design bets",
          explanation: [
            "Merge sort bets on guaranteed O(n log n) time and stable merging, paying with O(n) extra memory. It is the right choice when you need multi-key stability — for example, sorting purchase records first by value and then by timestamp requires a stable sort so the timestamp ordering is preserved within equal-value groups.",
            "Quicksort bets on excellent practical performance through cache-friendly in-place partitioning. Because all work happens within the original array, quicksort rarely triggers cache misses during the partition step, while merge sort allocates a scratch buffer that may not fit in L1/L2. The downside is O(n²) worst-case behavior on adversarial or already-sorted inputs unless pivot selection is randomized. Quicksort is also unstable.",
            "Heap sort achieves in-place O(n log n) with guaranteed worst-case behavior, but its random access pattern into the heap array produces poor spatial locality — it is rarely the fastest in practice. Radix sort bypasses the Ω(n log n) comparison lower bound entirely: it processes digits or bytes of bounded-width integers in O(n) total time. Workload A: nearly sorted streaming logs where n is large — use insertion sort or an adaptive sort that exploits existing order. Workload B: objects with a primary key and a secondary key — use merge sort to guarantee that equal primary keys preserve secondary-key ordering.",
          ],
          appliedLens:
            "The right sort is usually the one whose failure mode your product can tolerate — worst-case blowup for quicksort, extra memory for merge sort, or key-format assumptions for radix sort.",
          checkpoint:
            "Why does quicksort's in-place partitioning give it a cache-locality advantage over merge sort even when both run O(n log n) comparisons?",
        },
        {
          title: "Partition invariants and quickselect for top-k problems",
          explanation: [
            "Partitioning imposes enough order to be useful without fully sorting everything. The loop invariant is: all elements to the left of boundary index i are less than or equal to the pivot, and all elements between i and the scan pointer are strictly greater. Maintaining this invariant through every iteration is what makes the algorithm correct; a single swap that violates it before the loop ends produces a silently wrong partition.",
            "Quicksort recurses on both sides because it wants total order. Quickselect recurses only on the side that contains the target rank — expected O(n) work versus O(n log n) — because it throws away the irrelevant partition. This makes quickselect the natural tool for: finding the median activation value in a neural network layer, selecting the top-k logits before a softmax, or finding the kth-smallest loss value across a training batch.",
            "The broader lesson is that partial order is often enough. Many systems overpay by forcing total sort order onto problems that only ask for a frontier. When the requirement says 'top 100 recommendations' or 'median latency,' ask whether full sorting is necessary at all.",
          ],
          appliedLens:
            "Whenever a requirement says 'top k' or 'median,' ask whether full sorting is necessary at all before reaching for a sort.",
          checkpoint:
            "Why does quickselect usually do less total work than quicksort for the kth-element problem, and what does the loop invariant guarantee at partition end?",
        },
      ],
      tutorialSteps: [
        {
          title: "Classify sorting requirements before coding",
          purpose:
            "Teach yourself to read the workload before reaching for a favorite algorithm.",
          instructions: [
            "List whether the task needs stability, near-sorted adaptiveness, in-place behavior, or worst-case guarantees.",
            "Map each requirement to an algorithmic consequence.",
            "Choose one algorithm and write down the exact reason you rejected two alternatives.",
          ],
          successSignal:
            "Your sort choice follows from constraints, not familiarity.",
          failureMode:
            "The common failure is recommending quicksort by reflex without checking whether stability or worst-case behavior matters.",
        },
        {
          title: "Prove one partition invariant",
          purpose:
            "Make partition-based algorithms trustworthy enough to debug.",
          instructions: [
            "Pick a partition scheme and state the invariant maintained before each loop iteration.",
            "Trace one example with duplicate keys.",
            "Explain why the invariant implies correctness when the loop terminates.",
          ],
          successSignal:
            "You can justify the partition boundary without relying on visual intuition alone.",
          failureMode:
            "If you cannot state the invariant, pivot bugs will feel random.",
        },
      ],
      misconceptions: [
        "Do not ask which sorting algorithm is best without naming the constraints.",
        "Do not assume O(n log n) tells you everything important about a sort in practice.",
        "Do not fully sort when selection or partial order is enough.",
      ],
      reflectionPrompts: [
        "When did you last sort more data than the problem actually required?",
        "Which sort property do you usually forget first: stability, memory, or pivot sensitivity?",
      ],
      masteryChecklist: [
        "Choose a sort using explicit constraints.",
        "Explain why radix sort escapes the comparison lower bound.",
        "State a correct partition invariant.",
        "Recognize when quickselect beats full sorting.",
      ],
      practiceProblems: [
        problem(
          "dsa-l5-p1",
          "warm-up",
          "Code tracing",
          "Using Lomuto partition with pivot = last element, trace the array [7, 2, 9, 4, 3] through one partition pass. Show the array after each swap and give the pivot's final index.",
          "Track the 'less-than-or-equal' boundary separately from the scan index.",
          "Pivot is 3. Start i at the left boundary. Scan 7 (no swap), 2 (swap with position i, array becomes [2, 7, 9, 4, 3], i advances), 9 (no swap), 4 (no swap). Finally swap pivot 3 with element at i, producing [2, 3, 9, 4, 7]. The pivot's final index is 1. The invariant is that everything before i is <= pivot and everything between i and the scan pointer is > pivot.",
          [
            "Did you keep the partition boundary distinct from the scan index?",
            "Can you state the invariant after every loop iteration?",
            "Did you remember the final pivot swap?",
          ],
        ),
        problem(
          "dsa-l5-p2",
          "challenge",
          "Debugging",
          "A merge-sort implementation compares left[i] < right[j] instead of left[i] <= right[j] when merging two already sorted halves. Does this break correctness, stability, or both? Give a concrete example.",
          "Think about equal keys that carry secondary identity, not just numeric value.",
          "The output remains correctly sorted, so correctness with respect to key order is preserved. What breaks is stability. Suppose the original array contains records [(2, A), (2, B)] and after recursive splitting A lands in the left half while B lands in the right half. If merge uses strict <, then when keys tie it pulls from the right half first, producing [(2, B), (2, A)], which reverses the original relative order of equal keys. Stability is lost even though the array is still sorted by the primary key.",
          [
            "Did you distinguish sortedness from stability?",
            "Did your example use equal keys with identity attached?",
            "Can you explain why <= preserves relative order across halves?",
          ],
        ),
      ],
      codingProblems: DSA_CODING_PROBLEMS["dsa-lesson-5"],
    },
  },
  "dsa-lesson-6": {
    lesson: lesson(
      "dsa-lesson-6",
      "Graphs, Shortest Paths, and Dynamic Programming",
      "110 min",
      "Connect graph traversal, weighted shortest paths, MST intuition, and dynamic programming as state-space reasoning rather than disconnected tricks.",
      [
        "Graph representations, BFS, DFS, and traversal invariants",
        "Dijkstra, minimum spanning trees, and greedy algorithm preconditions",
        "Dynamic programming, memoization, and state design",
      ],
      [
        "Graph algorithms are about what structure the edges encode and what invariant the frontier maintains.",
        "Greedy algorithms work only when the problem admits a safe local choice.",
        "Dynamic programming starts with state design and recurrence quality, not with a table.",
      ],
      [
        video(
          "MIT 6.006: Graphs and Dynamic Programming",
          "Tie frontier-based graph reasoning to subproblem-based DP reasoning.",
          "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/",
          "MIT OpenCourseWare",
        ),
      ],
      [
        exercise(
          "dsa-lesson-6-ex-1",
          "Translate a problem into graph or DP state",
          "analysis",
          "Take one shortest-path problem and one recurrence problem. For each, define the state, transition rule, and invariant that makes the algorithm trustworthy.",
          ["Two problem framings", "One invariant per framing", "One failure-mode note"],
          [
            "What does each node or DP state mean?",
            "What information is sufficient to move to the next state?",
            "Which greedy or recursive shortcut would be invalid and why?",
          ],
        ),
      ],
      quiz(
        [
          question(
            "dsa-lesson-6-q1",
            "Why does Dijkstra's algorithm require nonnegative edge weights?",
            [
              "Because heaps cannot store negative numbers",
              "Because the algorithm assumes once a node is extracted with smallest tentative distance, that distance will never later improve via a negative edge",
              "Because BFS already handles negative weights",
              "Because minimum spanning trees fail on negative graphs",
            ],
            1,
            "The greedy finalization step in Dijkstra depends on distances only increasing along future paths, which negative edges can violate.",
          ),
          question(
            "dsa-lesson-6-q2",
            "What is the first serious design decision in dynamic programming?",
            [
              "Choosing between recursion and iteration syntax",
              "Choosing the table data type",
              "Defining a state that captures exactly the subproblem information needed for optimal recombination",
              "Sorting the input",
            ],
            2,
            "If the state is wrong, the recurrence, memoization, and reconstruction logic will all be wrong no matter how clean the code looks.",
          ),
        ],
        "Rework graph frontiers and DP states until you can name the invariant before you run the algorithm.",
      ),
    ),
    hostedLesson: {
      videoUrl: "/dsa/lesson-6.mp4",
      hook:
        "This is the point where algorithm design becomes a general language. Traversals, shortest paths, greedy methods, and dynamic programming all ask the same meta-question: what state do we maintain, and why is it enough to trust the next step?",
      teachingPromise:
        "By the end of this lesson, you should be able to read graph and DP algorithms as invariants over state rather than as disconnected recipes.",
      learningObjectives: [
        "Choose graph representations and traversal frontiers deliberately.",
        "Explain the greedy invariant behind Dijkstra and MST algorithms.",
        "Design DP states and recurrences without guesswork.",
        "Debug graph and DP code by checking state meaning before line-by-line execution.",
      ],
      lectureSegments: [
        {
          title: "Graph representations, BFS, DFS, and traversal invariants",
          explanation: [
            "Graphs encode relationships, not just nodes and edges. The first design decision is what a node represents and what an edge means operationally. Once that is clear, the traversal algorithm is a choice about how to explore state space.",
            "BFS maintains a frontier by distance in unweighted graphs, which is why it finds shortest path lengths there. DFS instead explores depth-first and is often the right tool for reachability structure, cycle detection, and topological reasoning.",
            "The invariant matters more than the data structure name. A queue in BFS means 'all nodes at the current frontier distance are processed before the next distance layer.'",
          ],
          appliedLens:
            "If a traversal produces the wrong order, ask what your frontier is supposed to mean before you inspect the loop body.",
          checkpoint:
            "Why does using a queue instead of a stack change BFS from a generic walk into a shortest-path tool on unweighted graphs?",
        },
        {
          title: "Dijkstra, greedy algorithm preconditions, and Bellman-Ford",
          explanation: [
            "Dijkstra's algorithm is a greedy commitment: once a node is extracted from the min-heap with the smallest tentative distance, that distance is finalized. This is safe exactly because nonnegative edge weights ensure no future path can undercut an already-settled distance. The invariant at every extraction step is: the extracted node's distance is the true shortest path from the source.",
            "If any edge has negative weight, that invariant breaks. A later path through a negative edge can produce a shorter total distance to an already-settled node, meaning Dijkstra's finalization was premature. The correct algorithm for graphs with negative edges is Bellman-Ford, which relaxes every edge n − 1 times and can detect negative-weight cycles. In reinforcement learning, state-transition graphs can have negative rewards that create exactly this scenario.",
            "Minimum spanning tree algorithms make a structurally different greedy move: they add the cheapest safe edge that connects two components without forming a cycle. The correctness proof relies on cut and cycle properties, not on distance monotonicity. Both Dijkstra and MST algorithms demonstrate that greedy approaches are not 'locally good guesses' — they are local choices proven globally safe under specific structural preconditions.",
          ],
          appliedLens:
            "Before trusting a greedy algorithm, identify the structural property that makes a local choice irreversible in a globally safe way.",
          checkpoint:
            "What exactly breaks in Dijkstra when a single negative-weight edge exists, and which algorithm handles that case correctly?",
        },
        {
          title: "Frontiers vs States: the bridge from graph search to dynamic programming",
          explanation: [
            "Graph search and dynamic programming look different on the surface but share a common skeleton. In BFS or Dijkstra, the frontier is the boundary of explored nodes; an edge is a physical transition in the graph; the visited set prevents redundant work. In dynamic programming, the state is a snapshot of a subproblem; a recurrence relation is the transition; the memo table prevents redundant computation. The mapping is exact: frontier ↔ state table, edge ↔ recurrence, BFS layer ↔ DP dependency order.",
            "This connection matters because it tells you how to debug both families. If BFS gives wrong shortest-path distances, check what the frontier represents and whether the visited condition is correct. If DP gives wrong optimal values, check whether the state captures all variables that affect future decisions — the exact same question asked about the frontier invariant.",
            "It also suggests a design strategy: when a DP problem feels opaque, try drawing it as a directed acyclic graph where each node is a state and each edge is a recurrence transition. The problem becomes 'find the best path through this DAG,' which is exactly shortest-path or longest-path depending on the objective.",
          ],
          appliedLens:
            "When DP code fails, draw the implicit state DAG and verify that every edge (recurrence transition) corresponds to a valid subproblem reduction.",
          checkpoint:
            "How does the BFS frontier invariant map onto the DP memo table, and what does the analogy reveal about debugging both algorithms?",
        },
        {
          title: "Dynamic programming, memoization, and state design",
          explanation: [
            "Dynamic programming begins by asking what subproblem information is sufficient. The state is the contract. If it is missing needed context, the recurrence becomes invalid. If it stores too much, the algorithm becomes slow or redundant. The first serious design decision in DP is always defining the state — not choosing a table layout, not deciding between top-down and bottom-up.",
            "Memoization (top-down) and tabulation (bottom-up) are execution strategies for the same recurrence. Top-down caches discovered subproblems recursively; bottom-up fills them in dependency order. A common memoization pitfall is testing `if memo[key]` to check for a cached result when the valid answer might be 0, False, or another falsy value. The robust check is `if key in memo` — presence, not truthiness.",
            "The practical insight is that many problems become clear once you draw the implicit state graph. DP is not a pile of tables. It is optimal-path search over a DAG of overlapping subproblems, where the memo table stores already-solved shortest (or longest) path distances.",
          ],
          appliedLens:
            "When DP code fails, inspect the state definition first. Most bugs there are conceptual — the state forgot a decision variable — not syntactic.",
          checkpoint:
            "Why is a correctly implemented DP table still useless if the state forgot one decision variable that affects future outcomes?",
        },
      ],
      tutorialSteps: [
        {
          title: "Name the graph frontier",
          purpose:
            "Make traversal code interpretable through the meaning of its pending work.",
          instructions: [
            "Take BFS and DFS on the same graph.",
            "At each step, write what the frontier structure currently represents.",
            "Explain why that meaning implies the next node-selection policy.",
          ],
          successSignal:
            "You can explain traversal order from the frontier invariant instead of from memory.",
          failureMode:
            "The common failure is describing BFS and DFS as 'queue version' and 'stack version' without stating what those structures mean.",
        },
        {
          title: "Design one DP state before coding it",
          purpose:
            "Prevent table-filling without conceptual control.",
          instructions: [
            "Choose a classic problem such as coin change, LIS, or knapsack.",
            "Write the state, recurrence, and base cases in words before any code.",
            "List one tempting but wrong state definition and what information it loses.",
          ],
          successSignal:
            "Your state captures exactly the information needed to combine optimal subsolutions.",
          failureMode:
            "A weak solution jumps to a 2D array without proving what each cell means.",
        },
      ],
      misconceptions: [
        "Do not memorize graph algorithms as traversal recipes detached from frontier meaning.",
        "Do not trust a greedy algorithm just because it works on a few examples.",
        "Do not start DP by drawing a table. Start by defining state and recurrence.",
      ],
      reflectionPrompts: [
        "Which algorithm family do you find easier to justify formally: greedy or DP?",
        "Where do you tend to lose control first in graph code: visitation state, frontier meaning, or weight updates?",
      ],
      masteryChecklist: [
        "Choose BFS or DFS based on the frontier invariant you need.",
        "Explain why Dijkstra requires nonnegative edges and name the correct algorithm when negative edges exist.",
        "Map the BFS frontier / visited-set pattern onto the DP state / memo-table pattern.",
        "State a DP subproblem and recurrence cleanly, starting from state definition.",
        "Debug graph or DP code by checking state meaning before inspecting loop logic.",
      ],
      practiceProblems: [
        problem(
          "dsa-l6-p1",
          "warm-up",
          "Code tracing",
          "Run BFS from node A on the graph with adjacency lists A:[B,C], B:[D,E], C:[F], D:[], E:[F], F:[]. List the dequeue order, the parent map, and the shortest path from A to F.",
          "BFS parent pointers are assigned the first time a node is discovered, not every time it is seen.",
          "The dequeue order is A, B, C, D, E, F assuming adjacency lists are processed in listed order. Parent map: B<-A, C<-A, D<-B, E<-B, F<-C because F is first discovered from C before E is processed. The shortest path from A to F is therefore A -> C -> F. BFS works here because the queue processes all distance-1 nodes before any distance-2 nodes.",
          [
            "Did you assign each parent only on first discovery?",
            "Can you explain why A -> C -> F beats the longer route through B and E?",
            "Did your dequeue order match the queue frontier invariant?",
          ],
        ),
        problem(
          "dsa-l6-p2",
          "challenge",
          "Debugging",
          "A memoized top-down Fibonacci implementation stores results in a map but checks `if (memo[n]) return memo[n];` before computing recursively. Why can this still fail for some DP problems even if it works for Fibonacci, and what is the robust fix?",
          "Think about states whose correct answer could be 0, false, or another falsy value.",
          "The check `if (memo[n])` only works when every cached value is truthy. Fibonacci values for n > 0 happen to be positive, so the bug hides. In many DP problems a valid subproblem answer can be 0, false, or an empty structure. Then the code mistakes a cached answer for 'not present' and recomputes unnecessarily or even loops incorrectly. The robust fix is to test key existence directly, such as `if (n in memo)` or `memo.has(n)`, which distinguishes 'cached falsy answer' from 'missing entry.'",
          [
            "Did you explain why Fibonacci masks the bug?",
            "Can you name another DP problem where 0 is a valid optimal answer?",
            "Did your fix test presence instead of truthiness?",
          ],
        ),
      ],
      codingProblems: DSA_CODING_PROBLEMS["dsa-lesson-6"],
    },
  },
};

export function getAuthoredDsaLesson(lessonId: string): CurriculumLesson | null {
  return AUTHORED_DSA_LESSONS[lessonId]?.lesson ?? null;
}

export function getAuthoredDsaHostedLessonContent(
  lessonId: string,
): HostedLessonContent | null {
  return AUTHORED_DSA_LESSONS[lessonId]?.hostedLesson ?? null;
}

export function hasAuthoredDsaHostedLessonContent(lessonId: string) {
  return lessonId in AUTHORED_DSA_LESSONS;
}
