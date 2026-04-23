import type {
  CurriculumExercise,
  CurriculumLesson,
  CurriculumVideo,
  LessonQuiz,
  QuizQuestion,
} from "@/lib/types";
import type { HostedLessonContent, PracticeProblem } from "@/lib/hosted-lessons";

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
            "Big-O is only useful when you are honest about what operation is being repeated and how often. Saying a structure is 'fast' without naming the workload is a category error. A data structure is only good relative to a stream of reads, writes, insertions, deletions, and memory behaviors.",
            "The real move is to build an operation mix. If 95% of your work is append and iterate, an array-backed structure benefits from locality and predictable indexing. If your work repeatedly splices around known nodes, pointer-heavy structures start to make sense even though they look worse on a generic random-access benchmark.",
            "This is also where asymptotics can mislead. Constant factors, cache locality, and branch behavior matter in real systems. Big-O gives the growth story; engineering still needs the constant story.",
          ],
          appliedLens:
            "When a teammate recommends a structure, ask for the workload it is optimized for before you ask for the complexity table.",
          checkpoint:
            "What workload would make an array list superior to a linked list even if both have the same asymptotic append cost?",
        },
        {
          title: "Recursion, recurrences, and invariant-driven reasoning",
          explanation: [
            "Recursion is not elegance for its own sake. It is a disciplined claim that a large problem can be reduced to one or more smaller problems with the same contract. If you cannot say what the subproblem guarantees, the recursion is not ready to exist.",
            "Recurrences then tell you what that contract costs. A divide-and-conquer algorithm is not just a code pattern; it is a structural decomposition whose cost comes from subproblem count, shrink rate, and combination work. Reading T(n) = 2T(n/2) + n as a story is more useful than memorizing master-theorem rows.",
            "Correct recursion depends on invariants, especially around indices, ownership, and shrinking state. Most recursive bugs are not mathematical; they are failures to maintain a clear boundary about what the call is responsible for.",
          ],
          appliedLens:
            "If a recursive method feels clever but you cannot state its exact subproblem contract in one sentence, rewrite it before you debug it.",
          checkpoint:
            "Why is a base case not just a stopping trick but part of the correctness argument?",
        },
        {
          title: "Arrays, dynamic arrays, and linked lists under real mutation pressure",
          explanation: [
            "Array-backed sequences buy you locality, O(1) indexing, and simpler structural reasoning. Their weakness is mutation in the middle because preserving contiguity means shifting elements. That tradeoff is worth it in more workloads than beginners expect because locality is powerful.",
            "Dynamic arrays add a second layer: capacity management. A bad growth policy turns a great interface into repeated copies and memory churn. A good policy makes append operationally cheap while preserving dense storage.",
            "Linked lists flip the tradeoff. They make local splices natural if you already hold the right node, but they push complexity into pointer integrity, traversal cost, and poorer cache behavior. 'Insertion is O(1)' is only true after you pay to find the insertion point and after you maintain every structural pointer correctly.",
          ],
          appliedLens:
            "Separate the cost to locate a position from the cost to mutate a structure once you are there. Many bad DS&A arguments quietly merge those two costs.",
          checkpoint:
            "Why is the phrase 'linked-list insertion is O(1)' incomplete without a stronger precondition?",
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
        "Choose among array lists and linked lists using a stated workload.",
        "Explain why geometric resizing gives amortized O(1) append.",
        "State a recursive subproblem contract precisely.",
        "Name the invariant you would watch first when debugging a sequence structure.",
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
            "The circular queue is a beautiful little system because it converts dead array space into reusable capacity with simple modular arithmetic. It is also a magnet for bugs because every implementation must make several meanings precise: does front point to the first element or the next insertion slot, and is back inclusive or exclusive?",
            "Once those meanings are fixed, the update order matters. Removing from the front, then incrementing front modulo capacity, is not the same as incrementing first and then reading. Many bugs come from code that mixes two different index conventions without noticing.",
            "Resizing adds one more layer. During copy, you must preserve logical order, not physical order. The right copy loop walks size elements starting from front and rewrites them into a fresh contiguous block.",
          ],
          appliedLens:
            "Write the index meaning in comments or documentation before you write the mutation code. It prevents entire classes of queue bugs.",
          checkpoint:
            "What is the most dangerous ambiguity in a circular queue implementation: index math, resize policy, or not defining what front means?",
        },
        {
          title: "Amortized analysis as bookkeeping for resize-heavy structures",
          explanation: [
            "Amortized analysis is a promise about a sequence, not a single event. The right mental model is that cheap operations save credit which later pays for expensive maintenance like copying into a larger array.",
            "This matters because many practical structures rely on occasional structural work to keep their common path cheap. If you reason only in worst-case terms, dynamic structures look worse than they behave. If you reason only in average terms without proof, you can miss resize thrashing or bad growth policies.",
            "The engineering payoff is that amortized reasoning lets you defend a design clearly. You can explain why a queue that occasionally performs O(n) work is still the right choice for long-running traffic patterns.",
          ],
          appliedLens:
            "Use amortized arguments to justify policies; use invariants and tests to ensure the implementation actually matches the policy.",
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
          title: "AVL balance, rotations, and height guarantees",
          explanation: [
            "AVL trees strengthen the BST story by constraining height. The balance factor tells you whether one side has grown too much relative to the other. That extra bookkeeping buys logarithmic height in exchange for occasional rotations during update.",
            "Rotations are local surgery. They change parent-child relationships in a tiny neighborhood while preserving the left-root-right ordering that made the tree searchable in the first place.",
            "The important engineering intuition is that balancing work is not overhead for its own sake. It is preemptive maintenance that keeps future operations cheap and predictable.",
          ],
          appliedLens:
            "If a self-balancing tree is slow, inspect whether the implementation is silently skipping a rebalance path before blaming the data structure idea.",
          checkpoint:
            "What does a double rotation fix that a single rotation cannot?",
        },
        {
          title: "Heaps and priority queues as partial-order data structures",
          explanation: [
            "A heap relaxes the search-tree objective. It only promises that each parent has priority relative to its children. That partial order is enough to make extract-min or extract-max efficient, which is exactly what priority scheduling and Dijkstra-like algorithms need.",
            "Because the invariant is weaker, the representation can be denser. Array-backed heaps map parents and children by index arithmetic, avoiding explicit pointers while keeping the structure nearly complete.",
            "The tradeoff is intentional: heaps are excellent at repeated access to the most urgent item, but they give up efficient arbitrary search and ordered traversal.",
          ],
          appliedLens:
            "Pick a heap when your application repeatedly asks for the next best item, not when it needs full ordered queries.",
          checkpoint:
            "Why is heap order sufficient for a priority queue but insufficient for a map or set?",
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
        "Explain BST ordering and traversal semantics.",
        "Perform and justify AVL rotations.",
        "Describe the exact promise a heap does and does not make.",
        "Choose between BST, AVL, and heap based on workload.",
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
            "Collisions are not bugs; they are the normal operating mode. The important decision is how the structure resolves them: separate chains, linear or quadratic probes, double hashing, and so on.",
            "Deletion becomes subtle in open addressing because search depends on probe continuity. Removing an element by resetting its slot to empty can accidentally tell a later search to stop before it reaches the true target. Tombstones or careful rebuild policies solve this.",
            "Load factor is the operational pressure gauge. Let it grow too high and clusters grow, probe sequences stretch, and the table stops feeling constant time.",
          ],
          appliedLens:
            "The health of a hash table is something you can monitor: cluster size, tombstone count, and load factor all tell a performance story.",
          checkpoint:
            "Why is deletion usually simpler in separate chaining than in open addressing?",
        },
        {
          title: "Choosing between maps, sets, and ordered structures",
          explanation: [
            "A map associates keys to values; a set is the membership-only version. Both can be backed by hashing when equality lookup is the main workload.",
            "But hashing deliberately throws away order. If your application needs range queries, nearest neighbors by key, or reproducible sorted iteration, an ordered tree is structurally better even if raw point lookup is slower in expectation.",
            "The broader lesson is that 'fastest membership structure' is not a universal objective. The right structure depends on which queries are native to the product.",
          ],
          appliedLens:
            "Choose the structure that matches the product's query language, not the one with the most flattering single-operation benchmark.",
          checkpoint:
            "What query class becomes awkward the moment you pick a plain hash table?",
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
            "Merge sort bets on predictable O(n log n) time and clean stable merging, paying with extra memory. Quicksort bets on excellent practical performance and partition locality, paying with bad pivot-pathology risk unless mitigated. Heap sort bets on in-place O(n log n), paying with weaker constant factors and cache behavior. Radix sort bets on non-comparison structure, paying with assumptions about key representation.",
            "Each algorithm reflects a design philosophy. There is no universal winner because the environment changes what counts as expensive or valuable.",
            "Strong engineers therefore memorize fewer slogans and ask more structural questions: Do I need stability? Is extra memory acceptable? Are keys numeric and bounded? Is worst-case behavior visible to the product?",
          ],
          appliedLens:
            "The right sort is usually the one whose failure mode your product can tolerate.",
          checkpoint:
            "What hidden assumption lets radix sort beat comparison-based lower bounds?",
        },
        {
          title: "Partition invariants and quickselect for top-k style problems",
          explanation: [
            "Partitioning is powerful because it imposes enough order to be useful without fully sorting everything. The key invariant is that elements on one side satisfy one relation to the pivot and elements on the other side satisfy the opposite relation.",
            "Quicksort recursively refines both sides because it wants full order. Quickselect refines only the side containing the target rank, which is why it is often the right tool for median, kth smallest, or top-k boundary problems.",
            "The lesson is broader than one algorithm: partial order is often enough. Many systems overpay by forcing total order onto problems that only ask for a frontier.",
          ],
          appliedLens:
            "Whenever a requirement says 'top 100' or 'median latency,' ask whether full sorting is necessary at all.",
          checkpoint:
            "Why does quickselect usually do less work than quicksort for the kth element problem?",
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
          title: "Dijkstra, minimum spanning trees, and greedy algorithm preconditions",
          explanation: [
            "Dijkstra's algorithm is a greedy commitment: once the smallest tentative distance is extracted, that node's shortest path is finalized. This is only safe because nonnegative edges prevent later detours from undercutting that distance.",
            "Minimum spanning tree algorithms make a different greedy move. They choose safe edges that connect components cheaply without forming cycles. The correctness argument depends on cut and cycle properties, not on luck.",
            "The common thread is that greedy algorithms are not 'locally good guesses.' They are local choices proven to be globally safe under specific problem structure.",
          ],
          appliedLens:
            "Before trusting a greedy algorithm, identify the property that makes a local choice irreversible in a safe way.",
          checkpoint:
            "What exactly breaks in Dijkstra when a negative edge exists?",
        },
        {
          title: "Dynamic programming, memoization, and state design",
          explanation: [
            "Dynamic programming begins by asking what subproblem information is sufficient. The state is the contract. If it is missing needed context, the recurrence becomes invalid. If it stores too much, the algorithm becomes slow or redundant.",
            "Memoization and tabulation are execution strategies for the same recurrence logic. One works top-down by caching discovered subproblems; the other fills them bottom-up according to dependency order.",
            "The practical insight is that many problems become easier once you draw the implicit state graph. DP is not a pile of tables. It is shortest path or exhaustive search over a DAG of subproblems with overlap.",
          ],
          appliedLens:
            "When DP code fails, inspect the state definition first. Most bugs there are conceptual, not syntactic.",
          checkpoint:
            "Why is a beautifully implemented DP table still useless if the state forgot one decision variable that affects future outcomes?",
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
        "Explain why Dijkstra requires nonnegative edges.",
        "State a DP subproblem and recurrence cleanly.",
        "Debug graph or DP code by checking state meaning first.",
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
