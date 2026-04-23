import { getDateKey } from "@/lib/date";
import { ML_AI_TOPIC_SPECS } from "@/lib/authored-ml-ai-question-bank";
import { seed, topic, type QuestionSeed, type TopicSpec } from "@/lib/question-bank-spec";
import type {
  BankQuestion,
  DailyQuizDocument,
  PublishedQuestionBankArtifact,
  PublishedQuestionBankTopic,
  QuestionLevel,
} from "@/lib/types";

const OPTION_PERMUTATIONS = [
  [0, 1, 2, 3],
  [0, 2, 1, 3],
  [0, 3, 1, 2],
  [1, 0, 2, 3],
  [1, 2, 0, 3],
  [1, 3, 0, 2],
  [2, 0, 1, 3],
  [2, 1, 0, 3],
  [3, 0, 1, 2],
  [3, 1, 0, 2],
];

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function buildOptions(
  seedItem: QuestionSeed,
  variantKey: string,
): Pick<BankQuestion, "options" | "answerIndex"> {
  const baseOptions = [
    seedItem.correct,
    ...seedItem.distractors,
  ] as const satisfies readonly [string, string, string, string];
  const permutation =
    OPTION_PERMUTATIONS[hashString(variantKey) % OPTION_PERMUTATIONS.length]!;
  const options = permutation.map((index) => baseOptions[index]);
  const answerIndex = options.indexOf(seedItem.correct);

  return {
    options,
    answerIndex,
  };
}

const EASY_PROMPT_BUILDERS = [
  (seedItem: QuestionSeed) => `Which statement is most accurate about ${seedItem.concept}?`,
  (seedItem: QuestionSeed) => `A student is reviewing ${seedItem.concept}. Which answer is correct?`,
  (seedItem: QuestionSeed) => `Which reminder best matches ${seedItem.concept}?`,
  (seedItem: QuestionSeed) => `Which study note about ${seedItem.concept} should you keep?`,
  (seedItem: QuestionSeed) => `In a quick fundamentals check, which claim about ${seedItem.concept} is right?`,
  (seedItem: QuestionSeed) => `Which interpretation of ${seedItem.concept} is correct?`,
  (seedItem: QuestionSeed) => `A teammate summarizes ${seedItem.concept}. Which summary is accurate?`,
  (seedItem: QuestionSeed) => `Which option best captures ${seedItem.concept} in practice?`,
  (seedItem: QuestionSeed) => `Which sentence about ${seedItem.concept} would earn full credit?`,
  (seedItem: QuestionSeed) => `If you forgot ${seedItem.concept}, which statement should you recover first?`,
] as const;

const MEDIUM_PROMPT_BUILDERS = [
  (seedItem: QuestionSeed) => `A code review discusses ${seedItem.scenario}. Which conclusion is most accurate?`,
  (seedItem: QuestionSeed) => `You are choosing an implementation for ${seedItem.scenario}. Which reasoning is best?`,
  (seedItem: QuestionSeed) => `A teammate makes a design claim about ${seedItem.scenario}. Which response is correct?`,
  (seedItem: QuestionSeed) => `When working through ${seedItem.scenario}, which tradeoff matters most?`,
  (seedItem: QuestionSeed) => `Which review note best matches ${seedItem.scenario}?`,
  (seedItem: QuestionSeed) => `While debugging ${seedItem.scenario}, which idea is most accurate?`,
  (seedItem: QuestionSeed) => `Which engineering judgment fits ${seedItem.scenario}?`,
  (seedItem: QuestionSeed) => `In a whiteboard discussion about ${seedItem.scenario}, which answer is strongest?`,
  (seedItem: QuestionSeed) => `Which statement best survives scrutiny for ${seedItem.scenario}?`,
  (seedItem: QuestionSeed) => `If ${seedItem.scenario} appears on an exam, which reasoning should you pick?`,
] as const;

const HARD_PROMPT_BUILDERS = [
  (seedItem: QuestionSeed) => `An implementation bug appears around ${seedItem.scenario}. Which diagnosis is most accurate?`,
  (seedItem: QuestionSeed) => `Which invariant matters most when reasoning about ${seedItem.scenario}?`,
  (seedItem: QuestionSeed) => `A proof sketch for ${seedItem.scenario} is incomplete. Which statement repairs it?`,
  (seedItem: QuestionSeed) => `Which subtle mistake is easiest to make in ${seedItem.scenario}?`,
  (seedItem: QuestionSeed) => `During a design review of ${seedItem.scenario}, which argument is strongest?`,
  (seedItem: QuestionSeed) => `Which statement about ${seedItem.scenario} is actually justified?`,
  (seedItem: QuestionSeed) => `If ${seedItem.scenario} fails under edge cases, which explanation is most convincing?`,
  (seedItem: QuestionSeed) => `Which property must remain true for ${seedItem.scenario} to work correctly?`,
  (seedItem: QuestionSeed) => `Which reviewer comment best matches ${seedItem.scenario}?`,
  (seedItem: QuestionSeed) => `Which technically precise claim belongs in documentation for ${seedItem.scenario}?`,
] as const;

const EXPERT_PROMPT_BUILDERS = [
  (seedItem: QuestionSeed) => `During a senior-level design review of ${seedItem.scenario}, which argument is strongest?`,
  (seedItem: QuestionSeed) => `Which statement about ${seedItem.scenario} best survives a correctness and performance audit?`,
  (seedItem: QuestionSeed) => `Which proof obligation matters most for ${seedItem.scenario}?`,
  (seedItem: QuestionSeed) => `When formalizing ${seedItem.scenario}, which claim is actually justified?`,
  (seedItem: QuestionSeed) => `A high-stakes system depends on ${seedItem.scenario}. Which reasoning is most technically defensible?`,
] as const;

const PROMPT_BUILDERS: Record<
  QuestionLevel,
  readonly ((seedItem: QuestionSeed) => string)[]
> = {
  easy: EASY_PROMPT_BUILDERS,
  medium: MEDIUM_PROMPT_BUILDERS,
  hard: HARD_PROMPT_BUILDERS,
  expert: EXPERT_PROMPT_BUILDERS,
};

const TOPIC_SPECS: TopicSpec[] = [
  topic(
    "complexity-recursion",
    "Complexity & Recursion",
    "Today’s drill focuses on cost models, recurrence intuition, and the correctness contracts that make recursive algorithms trustworthy.",
    {
      easy: [
        seed(
          "big-o-upper-bound",
          "Big-O notation",
          "comparing functions as n grows large",
          "Big-O gives an asymptotic upper bound on growth, not the exact runtime on every input.",
          [
            "Big-O gives the average runtime over all machines and all inputs.",
            "Big-O only applies when an algorithm uses recursion.",
            "Big-O proves two algorithms have the same constant factors.",
          ],
          "Big-O is a growth-rate tool. It suppresses constants and lower-order terms so you can compare how runtimes scale as inputs get large.",
        ),
        seed(
          "binary-search-precondition",
          "the precondition for binary search",
          "running binary search on an array",
          "Binary search only works when the search space is ordered so you can discard half safely after each comparison.",
          [
            "Binary search works on any array as long as the midpoint is computed correctly.",
            "Binary search requires a linked list so halves can be removed in O(1) time.",
            "Binary search is only correct when the array length is a power of two.",
          ],
          "The whole point of binary search is that order tells you which half cannot contain the target. Without that ordering, the elimination step is unjustified.",
        ),
        seed(
          "recursion-base-progress",
          "the structure of a recursive function",
          "writing a recursive routine",
          "A recursive function needs a base case and a shrinking measure so each call moves closer to termination.",
          [
            "A recursive function is safe as long as one branch returns quickly somewhere in the code.",
            "A recursive function only needs a base case when the input is a tree.",
            "A recursive function is correct whenever it makes at least two recursive calls.",
          ],
          "Termination depends on two things: a base case you can actually reach and a clear notion of progress that makes repeated calls smaller or simpler.",
        ),
      ],
      medium: [
        seed(
          "amortized-append",
          "amortized append in a dynamic array",
          "a vector that doubles capacity when full",
          "Individual appends can cost O(n), but geometric resizing still gives amortized O(1) append over long sequences.",
          [
            "Each append is worst-case O(1) because array writes are constant time.",
            "Appending stays O(1) only if the vector never resizes.",
            "Doubling capacity makes append O(log n) because the array size grows exponentially.",
          ],
          "Occasional copies are expensive, but doubling means those copies are rare enough that the average cost per append stays bounded.",
        ),
        seed(
          "merge-sort-recurrence",
          "the recurrence T(n) = 2T(n/2) + n",
          "analyzing merge sort",
          "The recurrence represents two half-size subproblems plus linear combine work, which yields O(n log n).",
          [
            "The recurrence is O(n) because the +n term dominates the recursion.",
            "The recurrence is O(n^2) because there are two recursive calls at each level.",
            "The recurrence is O(log n) because the problem size is halved.",
          ],
          "Merge sort creates log n levels of recursion, and each level does total linear work across all subproblems.",
        ),
        seed(
          "recursive-proof",
          "the correctness argument for recursion",
          "proving a recursive algorithm correct",
          "You must show the recursive call solves the same contract on a smaller instance and that the combine step preserves correctness.",
          [
            "You only need to show that the recursion eventually bottoms out.",
            "You only need to test the base case because the recursive case follows automatically.",
            "You can skip the recursive assumption if the code compiles and terminates.",
          ],
          "Recursive correctness mirrors induction: assume smaller instances are solved correctly, then prove the current call uses that fact in a valid way.",
        ),
      ],
      hard: [
        seed(
          "master-theorem-shape",
          "using the Master Theorem safely",
          "applying a theorem lookup to a recurrence",
          "The Master Theorem only applies when the recurrence matches its required structural form; uneven splits or extra quirks can break a blind lookup.",
          [
            "The Master Theorem works for any recurrence as long as you can identify one recursive call.",
            "The Master Theorem is only invalid when the recurrence has a linear combine term.",
            "The Master Theorem replaces the need to interpret what the recurrence means.",
          ],
          "The theorem is powerful, but it is not magic. You must still verify that the recurrence really has the required subproblem pattern and combine cost.",
        ),
        seed(
          "recursion-stack-depth",
          "recursive stack usage",
          "running recursive DFS on a path-shaped graph",
          "The recursion stack can grow to O(n) because depth follows the longest path even when each call does only O(1) local work.",
          [
            "The recursion stack is always O(log n) because each call handles one vertex.",
            "The recursion stack is O(1) because DFS marks each vertex once.",
            "The recursion stack is irrelevant because graphs are stored on the heap.",
          ],
          "Time complexity and stack depth are different questions. A traversal can be linear time while still using linear call-stack space on a deep instance.",
        ),
        seed(
          "binary-search-invariant",
          "the binary-search loop invariant",
          "auditing a binary search implementation",
          "If the target exists, it must always remain inside the current search interval after each boundary update.",
          [
            "The midpoint index must increase on every iteration.",
            "The array length must stay even after each split.",
            "The left boundary must move on every successful comparison.",
          ],
          "Correct boundary updates preserve the only thing that matters: you never throw away a region that could still contain the target.",
        ),
      ],
      expert: [
        seed(
          "accounting-method",
          "an accounting-method proof",
          "proving the amortized bound for dynamic-array append",
          "Charge cheap operations slightly extra and show the saved credit is sufficient to pay for every future resize copy.",
          [
            "Average a few hand-picked runs and call the mean the amortized cost.",
            "Ignore resize work because it happens infrequently compared with appends.",
            "Replace the copy cost with a recurrence even when no recursive structure exists.",
          ],
          "The accounting method is a rigorous prepaid-cost argument. It works because you can track where the future copy budget comes from.",
        ),
        seed(
          "induction-divide-conquer",
          "a formal divide-and-conquer proof",
          "proving a divide-and-conquer algorithm correct",
          "Use induction on input size: assume smaller recursive calls are correct, then prove the combine step yields a correct full result.",
          [
            "Prove only the combine step because the recursive calls are implementation details.",
            "Prove only the base case because induction handles the combine step automatically.",
            "Avoid induction and argue from runtime growth instead of correctness.",
          ],
          "Divide-and-conquer correctness is still an induction story. The recursive hypothesis justifies the smaller calls, and the combine logic finishes the proof.",
        ),
      ],
    },
  ),
  topic(
    "arrays-dynamic-arrays",
    "Arrays & Dynamic Arrays",
    "Today’s drill is about contiguous storage, resize behavior, and the invariants that make array-backed structures fast without becoming fragile.",
    {
      easy: [
        seed(
          "contiguous-indexing",
          "O(1) indexing in arrays",
          "reading the kth element of an array",
          "Array indexing is O(1) because contiguous storage lets the program jump directly to the needed offset.",
          [
            "Array indexing is O(1) because arrays never resize.",
            "Array indexing is O(1) only when the array is sorted.",
            "Array indexing is O(1) because every element stores pointers to its neighbors.",
          ],
          "Contiguous layout means the address of index k can be computed arithmetically instead of reached by walking through earlier elements.",
        ),
        seed(
          "middle-insert-shifts",
          "inserting into the middle of an array-backed list",
          "adding an element near the front of an array list",
          "Middle insertion is expensive because later elements must shift to preserve contiguous order.",
          [
            "Middle insertion is cheap because arrays support direct indexing.",
            "Middle insertion only costs extra when the inserted value is larger than its neighbors.",
            "Middle insertion is O(1) as long as the array has spare capacity.",
          ],
          "Capacity helps avoid resizing, but it does not remove the need to move elements out of the way when order must stay contiguous.",
        ),
        seed(
          "resize-copy-live",
          "resizing a dynamic array",
          "growing an array-backed list to a larger backing array",
          "Resizing copies the live elements into a new contiguous block so indexing and iteration still work the same way afterward.",
          [
            "Resizing only changes metadata because the old array can expand in place automatically.",
            "Resizing copies only the newest element because older data already has valid addresses.",
            "Resizing works by linking the new array to the old one and searching both.",
          ],
          "A dynamic array preserves the array abstraction by moving the existing logical sequence into a fresh contiguous region.",
        ),
      ],
      medium: [
        seed(
          "circular-buffer-front",
          "front and back semantics in a circular array queue",
          "implementing a circular-buffer queue",
          "Correctness depends on defining what front and back mean precisely and updating them consistently modulo capacity.",
          [
            "Any front or back convention is fine even if different methods use different ones.",
            "Circular buffers eliminate all edge cases because modulo arithmetic handles everything automatically.",
            "Front and back only matter when the queue becomes full for the first time.",
          ],
          "The arithmetic is easy once the meaning is fixed. Most bugs come from mixing inclusive and exclusive index conventions across methods.",
        ),
        seed(
          "array-vs-linked-random-access",
          "choosing between an array-backed list and a linked list",
          "a workload dominated by indexing and full scans",
          "An array-backed list is better when frequent indexing and cache locality matter more than middle insertions.",
          [
            "A linked list is always better because insertion is O(1).",
            "The two structures are equivalent whenever the workload includes iteration.",
            "A linked list is better whenever the final size is unknown in advance.",
          ],
          "Direct indexing and contiguous scans are exactly where arrays win. Linked lists help when structural edits near known nodes dominate instead.",
        ),
        seed(
          "two-pointer-reversal",
          "in-place array reversal",
          "reversing an array without allocating another one",
          "Two-pointer reversal works by swapping symmetric elements while moving inward until the pointers cross.",
          [
            "In-place reversal works by shifting every element left one position repeatedly.",
            "In-place reversal requires a stack so earlier values are not lost.",
            "In-place reversal only works when the array length is even.",
          ],
          "The left and right pointers always identify the next pair that belongs in the other's position, so swapping and moving inward preserves progress.",
        ),
      ],
      hard: [
        seed(
          "shrink-thrashing",
          "shrink policy design",
          "a dynamic array that halves capacity as soon as size reaches one quarter of capacity",
          "An aggressive shrink rule can cause repeated grow-shrink oscillation when the workload hovers near the threshold.",
          [
            "Halving immediately is always best because it minimizes memory overhead with no downside.",
            "Shrink policies only affect space complexity, never runtime behavior.",
            "Thrashing only happens when inserts and deletes occur at random positions.",
          ],
          "If the structure keeps crossing the threshold, it can pay repeated copy costs even though the logical size barely changes.",
        ),
        seed(
          "copy-logical-order",
          "copying a wrapped deque during resize",
          "resizing an array-backed deque after wraparound",
          "You must copy elements in logical order starting at front, not in raw physical index order.",
          [
            "Copying from index 0 upward is always correct because the backing array is contiguous.",
            "Only the newest half of the array matters because older slots will be overwritten after resize.",
            "Logical order is irrelevant during resize because the indices are recomputed anyway.",
          ],
          "The new array must represent the same logical sequence as before. Wrapped physical layout is an implementation detail, not the order the user sees.",
        ),
        seed(
          "in-place-overwrite-order",
          "read-write ordering in in-place array algorithms",
          "transforming an array while reusing its storage",
          "If you overwrite a value before every consumer has read it, the algorithm can corrupt its own future work.",
          [
            "Overwrite order is irrelevant as long as the final array length is unchanged.",
            "In-place corruption can only happen in recursive algorithms, not iterative ones.",
            "The only risk in in-place code is failing to resize the array first.",
          ],
          "Many in-place algorithms are really dependency-order problems. Correctness depends on not destroying information too early.",
        ),
      ],
      expert: [
        seed(
          "deque-contract",
          "an array-backed deque contract",
          "documenting an array-backed deque implementation",
          "You must specify whether back is inclusive or points to the next insertion slot; mixing the two conventions across methods breaks correctness.",
          [
            "Deque correctness only depends on modulo arithmetic, not on the meaning of front and back.",
            "Inclusive and exclusive back conventions are interchangeable within the same code path.",
            "The contract only matters for empty deques because full ones are resized immediately.",
          ],
          "A deque can use several valid index conventions, but a single implementation must commit to one and maintain it everywhere.",
        ),
        seed(
          "growth-factor-tradeoff",
          "dynamic-array growth-factor tuning",
          "choosing a growth factor for a production vector implementation",
          "The growth factor trades memory overhead against copy frequency; doubling is common because it keeps copies rare without wasting too much space.",
          [
            "A larger growth factor always dominates because it minimizes asymptotic time and space simultaneously.",
            "The growth factor only affects constant-time indexing, not resize frequency.",
            "Any growth factor above 1 gives identical runtime and memory behavior in practice.",
          ],
          "Growth policy is a systems tradeoff. Larger jumps reduce copies but increase slack memory; smaller jumps do the opposite.",
        ),
      ],
    },
  ),
  topic(
    "linked-lists",
    "Linked Lists",
    "Today’s drill focuses on pointer structure, local edits, and the invariants that make linked representations useful without becoming bug farms.",
    {
      easy: [
        seed(
          "no-random-access",
          "random access in a linked list",
          "fetching the kth element of a singly linked list",
          "A linked list does not support O(1) random indexing because you must walk through earlier nodes to reach position k.",
          [
            "A linked list supports O(1) indexing because each node stores a value and a pointer.",
            "A linked list supports O(1) indexing only when the list is sorted.",
            "A linked list supports O(1) indexing if the tail pointer is available.",
          ],
          "Pointers connect neighbors, not arbitrary positions. Reaching the kth node still requires following the chain.",
        ),
        seed(
          "doubly-prev-links",
          "what a doubly linked list adds",
          "extending a singly linked list to a doubly linked one",
          "A doubly linked list stores backward links so local removals and backward traversal become easier.",
          [
            "A doubly linked list stores values twice so indexing becomes constant time.",
            "A doubly linked list automatically stays sorted after each insertion.",
            "A doubly linked list removes the need for null checks at the ends.",
          ],
          "The extra prev pointer buys bidirectional navigation and simpler local edits, but it also creates another invariant that updates must preserve.",
        ),
        seed(
          "insert-after-known-node",
          "inserting into a linked list after a known node",
          "splicing a new node after a node you already hold",
          "Insertion after a known node is O(1) because you only change a constant number of pointers.",
          [
            "Insertion after a known node is O(log n) because the list must be rebalanced.",
            "Insertion after a known node is O(n) because every later node must shift.",
            "Insertion after a known node is O(1) only when the list is doubly linked.",
          ],
          "Once you already have the insertion position, splicing is local. The expensive part in linked lists is usually finding the position, not editing it.",
        ),
      ],
      medium: [
        seed(
          "remove-reconnect",
          "removing a node cleanly",
          "deleting a node from the middle of a linked structure",
          "Removal works by reconnecting the surviving neighbors so the list still forms one valid chain afterward.",
          [
            "Removal works by clearing the deleted value and leaving the links alone.",
            "Removal only requires updating the predecessor because forward traversal is all that matters.",
            "Removal is correct as soon as the target node is unreachable from the head, even if backward links are broken.",
          ],
          "The central idea is structural continuity. After removal, every surviving node should still link to the correct next and previous neighbors for the representation in use.",
        ),
        seed(
          "sentinel-nodes",
          "sentinel nodes",
          "implementing a linked list with many edge cases at the ends",
          "Sentinel nodes simplify code by turning empty-list and end-of-list cases into ordinary pointer rewrites.",
          [
            "Sentinel nodes exist to speed up random access.",
            "Sentinel nodes remove the need for null values inside the list data.",
            "Sentinel nodes are only useful in circular lists, not standard ones.",
          ],
          "A sentinel is a structural helper. It lets code handle head and tail operations without special branching for missing neighbors.",
        ),
        seed(
          "reverse-relink",
          "reversing a singly linked list",
          "writing an iterative linked-list reversal",
          "Reversal requires re-pointing next references one node at a time while preserving access to the remaining suffix.",
          [
            "Reversal works by swapping node values and leaving the links unchanged.",
            "Reversal only needs the head pointer because overwritten next pointers can always be recomputed.",
            "Reversal is impossible iteratively because lists only support forward traversal.",
          ],
          "The key difficulty is not the final order; it is preserving a path to the unprocessed remainder while you flip each pointer.",
        ),
      ],
      hard: [
        seed(
          "missing-prev-update",
          "a doubly linked list removal bug",
          "forgetting to update next.prev when removing a node",
          "The bug breaks the bidirectional invariant, so backward traversals and later local edits can still reference the removed node.",
          [
            "The bug is harmless because forward traversal from the head still succeeds.",
            "The bug only changes complexity, not correctness.",
            "The bug disappears automatically the next time the list is traversed.",
          ],
          "A doubly linked list promises consistency in both directions. If one side still points at the deleted node, the structure is corrupt even if some tests pass.",
        ),
        seed(
          "cycle-detection",
          "Floyd’s cycle-detection idea",
          "detecting whether a linked structure contains a cycle",
          "Fast and slow pointers work because different speeds eventually collide inside a cycle but cannot collide in a finite acyclic list once one pointer reaches null.",
          [
            "Fast and slow pointers work because both pointers eventually visit nodes in sorted order.",
            "Fast and slow pointers only detect cycles when the cycle length is even.",
            "Fast and slow pointers require storing every visited node in a hash set.",
          ],
          "The speed difference creates relative motion in the cycle. In an acyclic list, null termination breaks that chase before any collision can happen.",
        ),
        seed(
          "delete-head-special-case",
          "deleting from a singly linked list",
          "removing the first logical element of a singly linked list",
          "The head case is special because there may be no predecessor pointer available to reconnect around the removed node.",
          [
            "The head case is identical to every other case because the head pointer is never updated directly.",
            "Deleting the head is easier because the removed node still has a predecessor of null that can be written through.",
            "The head case only matters in doubly linked lists, not singly linked ones.",
          ],
          "In a singly linked list, many deletion strategies rely on a previous node. When the target is the head, the list object itself often needs the update instead.",
        ),
      ],
      expert: [
        seed(
          "locality-cost",
          "linked lists versus arrays in practice",
          "choosing between a linked list and a dynamic array in performance-sensitive code",
          "Linked lists often lose in real systems because pointer chasing, allocation overhead, and poor cache locality can dominate their theoretical splice advantages.",
          [
            "Linked lists usually dominate arrays because O(1) insertion is always the deciding factor.",
            "Linked lists and arrays behave the same on modern hardware because asymptotics hide locality.",
            "Linked lists only lose when the data is sorted before insertion.",
          ],
          "Asymptotics are not the whole story. Hardware rewards contiguous access, and linked lists pay real costs for every node indirection.",
        ),
        seed(
          "sentinel-invariants",
          "sentinel-based doubly linked list invariants",
          "auditing a sentinel-based doubly linked list",
          "The sentinels must themselves participate in the invariant, such as head.next.prev === head and tail.prev.next === tail.",
          [
            "Sentinels are outside the real list, so their pointers do not matter for correctness.",
            "Only data nodes need invariant checks because sentinels never change.",
            "Sentinel invariants matter only when the list contains exactly one element.",
          ],
          "Sentinels are structural nodes, not comments. If their links are wrong, the edge cases they were supposed to simplify become the first places the list breaks.",
        ),
      ],
    },
  ),
  topic(
    "stacks-queues-deques",
    "Stacks, Queues & Deques",
    "Today’s drill is about LIFO and FIFO contracts, adapter invariants, and the implementation details that turn simple abstractions into reliable code.",
    {
      easy: [
        seed(
          "stack-lifo",
          "stack semantics",
          "using a stack abstraction",
          "A stack is LIFO: the most recently pushed item is the first one popped.",
          [
            "A stack is FIFO: the earliest pushed item leaves first.",
            "A stack always keeps elements in sorted order.",
            "A stack allows O(1) removal from any position.",
          ],
          "Stacks model nested work. The newest frame, operator, or deferred action is the one that comes back out first.",
        ),
        seed(
          "queue-fifo",
          "queue semantics",
          "using a queue abstraction",
          "A queue is FIFO: the earliest enqueued item is the first one dequeued.",
          [
            "A queue is LIFO unless the implementation uses a linked list.",
            "A queue always returns the numerically smallest key first.",
            "A queue supports arbitrary removal as part of the abstraction.",
          ],
          "Queues preserve arrival order. That is why they fit scheduling and breadth-first exploration.",
        ),
        seed(
          "deque-both-ends",
          "what a deque supports",
          "using a deque interface",
          "A deque supports insertion and removal at both the front and the back.",
          [
            "A deque is just another name for a priority queue.",
            "A deque only adds random indexing to a queue.",
            "A deque requires sorted order at all times.",
          ],
          "A deque generalizes both stacks and queues by exposing efficient operations on each end of the sequence.",
        ),
      ],
      medium: [
        seed(
          "parentheses-stack",
          "a stack-based parenthesis matcher",
          "checking whether parentheses are balanced in an expression",
          "A stack works because the most recent unmatched opening bracket is the one the next closing bracket must match.",
          [
            "A queue works better because matching brackets should leave in arrival order.",
            "No data structure is needed because each bracket can be checked independently.",
            "The algorithm only works when the brackets are already sorted lexicographically.",
          ],
          "Balanced delimiters are a nesting problem. LIFO behavior mirrors that nesting exactly.",
        ),
        seed(
          "bfs-queue",
          "why BFS uses a queue",
          "exploring a graph layer by layer",
          "BFS uses a queue so earlier frontier nodes are expanded before later discoveries, preserving layer order.",
          [
            "BFS uses a queue because queues automatically prevent revisiting vertices.",
            "BFS uses a queue to sort adjacency lists by distance.",
            "BFS uses a queue only because stacks cannot store vertices.",
          ],
          "The queue is not incidental. It is what turns generic exploration into level-by-level expansion.",
        ),
        seed(
          "circular-queue-shifts",
          "array-backed queue implementation",
          "building a queue on top of an array",
          "A circular buffer avoids shifting every element after each dequeue by reusing freed slots modulo capacity.",
          [
            "An array queue should shift on every dequeue because that preserves O(1) behavior.",
            "A circular buffer is only useful when the queue stays full most of the time.",
            "Shifting is unavoidable because array order must always start at index 0.",
          ],
          "Naively shifting the whole queue turns dequeue into O(n). Circular indexing keeps the logical order without moving every element.",
        ),
      ],
      hard: [
        seed(
          "two-stacks-queue",
          "a queue built from two stacks",
          "implementing a queue with one input stack and one output stack",
          "The structure stays efficient because each element moves from input to output at most once before it leaves the queue.",
          [
            "The structure is worst-case and amortized O(1) because stacks reverse themselves automatically.",
            "The structure fails because two LIFO adapters can never simulate FIFO order.",
            "The structure only works when enqueue and dequeue operations strictly alternate.",
          ],
          "When the output stack is empty, bulk transfer reverses the arrival order exactly once. That one-time movement is what makes the amortized bound work.",
        ),
        seed(
          "monotonic-stack",
          "the invariant behind a monotonic stack",
          "solving next-greater-element style problems",
          "The stack stores unresolved items in monotonic order so a new value can resolve many waiting positions in one pass.",
          [
            "The stack stores items in sorted order because popping always compares adjacent array indices only.",
            "The stack is monotonic so the algorithm can skip all comparisons entirely.",
            "The invariant only works when the input array has no duplicates.",
          ],
          "Monotonic stacks are really deferred-decision structures. They keep only the candidates that still matter for future comparisons.",
        ),
        seed(
          "deque-off-by-one",
          "an array-backed deque off-by-one bug",
          "mixing inclusive and exclusive back semantics in a deque",
          "The bug comes from updating indices under two different contracts, so one method writes or reads one slot away from the intended logical end.",
          [
            "The bug comes only from modulo arithmetic overflow on large arrays.",
            "The bug disappears if the deque is implemented with a linked list instead.",
            "The bug only affects performance because the same elements remain reachable.",
          ],
          "Most deque bugs are contract bugs. The arithmetic is fine once the meaning of each index is stable across all methods.",
        ),
      ],
      expert: [
        seed(
          "two-stack-proof",
          "the amortized proof for a two-stack queue",
          "proving the cost of a queue implemented with two stacks",
          "Charge each enqueue enough to pay for the element’s future transfer into the output stack, then note that no element transfers more than once.",
          [
            "Treat the occasional transfer as free because it happens only when the queue is nonempty.",
            "Average the first few operations informally and assume later runs behave the same.",
            "Claim worst-case O(1) because each public operation calls only a constant number of methods.",
          ],
          "The proof succeeds because each item has a bounded lifetime cost: push once into input, maybe move once into output, pop once out.",
        ),
        seed(
          "monotonic-queue-window",
          "a monotonic queue for sliding-window extrema",
          "maintaining the maximum of a sliding window",
          "The deque stores candidates in monotonic order and discards dominated values because they can never become the maximum while a stronger later value remains in the window.",
          [
            "The deque must keep every value because any earlier element could become maximum again without leaving the window.",
            "The deque works only if window size is a power of two.",
            "The queue is monotonic so expired elements can remain indefinitely without affecting correctness.",
          ],
          "A dominated value is permanently irrelevant until the dominating value expires, so discarding it preserves correctness and improves efficiency.",
        ),
      ],
    },
  ),
  topic(
    "trees-bsts-traversals",
    "Trees, BSTs & Traversals",
    "Today’s drill focuses on tree structure, ordered search, and the traversal semantics that make tree code more than pointer choreography.",
    {
      easy: [
        seed(
          "bst-ordering",
          "the BST ordering rule",
          "reasoning about a binary search tree",
          "Every node in a BST separates smaller keys to the left from larger keys to the right.",
          [
            "Every node in a BST stores the global median of its subtree.",
            "A BST only requires the root to be smaller than every node in the right subtree.",
            "A BST requires all nodes at the same depth to be sorted left to right.",
          ],
          "The left-root-right ordering invariant is what makes search and ordered traversal possible in the first place.",
        ),
        seed(
          "inorder-sorted",
          "in-order traversal of a BST",
          "traversing a valid binary search tree",
          "In-order traversal yields sorted keys because it visits left subtree, root, then right subtree under the BST invariant.",
          [
            "In-order traversal yields insertion order because the tree remembers history.",
            "In-order traversal is sorted only when the tree is perfectly balanced.",
            "In-order traversal is sorted only for heaps, not search trees.",
          ],
          "Sorted output is a direct consequence of the BST ordering rule applied recursively across the whole tree.",
        ),
        seed(
          "leaf-definition",
          "the definition of a leaf",
          "classifying nodes in a tree",
          "A leaf is a node with no children.",
          [
            "A leaf is any node at the last allocated index of the tree.",
            "A leaf is a node with exactly one child.",
            "A leaf is the deepest node in the tree, and there can be only one.",
          ],
          "Leaf status is about child structure, not depth ranking or insertion order.",
        ),
      ],
      medium: [
        seed(
          "traversal-use-cases",
          "choosing a tree traversal",
          "matching a traversal order to a tree task",
          "Traversal choice depends on what the task needs: in-order for ordered BST output, pre-order for root-before-children work, and post-order for bottom-up processing.",
          [
            "Traversal choice only affects runtime, not what information becomes easy to compute.",
            "Pre-order is always superior because it visits every node before recursion.",
            "Post-order is only useful when the tree is balanced.",
          ],
          "Different traversals expose structure in different orders, and that order often lines up with the real computation you are trying to perform.",
        ),
        seed(
          "height-impact",
          "tree height",
          "analyzing lookup cost in a tree structure",
          "Height matters because many tree operations follow one root-to-leaf path, so taller trees make those paths more expensive.",
          [
            "Height matters only for memory usage because nodes already contain the same keys.",
            "Height matters only when the tree is traversed in-order.",
            "Height is irrelevant once the tree contains unique keys.",
          ],
          "Search, insert, and delete often trace a single branch. The branch length is exactly what height controls.",
        ),
        seed(
          "bst-successor",
          "the successor of a BST node",
          "finding the next larger key in a BST",
          "If a node has a right subtree, its successor is the leftmost node in that right subtree.",
          [
            "Its successor is always its parent because parents are larger than children.",
            "Its successor is the right child directly, regardless of that child’s left subtree.",
            "Its successor is the maximum key in the left subtree because that is closest in value.",
          ],
          "The successor is the smallest key strictly larger than the current one, which is exactly the leftmost value in the right subtree when that subtree exists.",
        ),
      ],
      hard: [
        seed(
          "degenerate-bst",
          "a degenerate BST",
          "inserting already sorted keys into an unbalanced BST",
          "The tree can collapse into a chain, causing operations that were hoped to be logarithmic to become linear.",
          [
            "The tree stays balanced because BST insertion automatically rotates nodes.",
            "Sorted insertion only changes traversal order, not search complexity.",
            "Degeneration affects memory but not lookup runtime.",
          ],
          "Without balancing, shape depends entirely on insertion order. Sorted order is a classic path to the worst-case chain.",
        ),
        seed(
          "null-base-case",
          "recursive tree code on empty children",
          "writing a recursive tree algorithm",
          "The null child case is a real base case because recursive code must know how to stop and what empty structure contributes.",
          [
            "Null children can be skipped because recursion only needs to stop at leaves.",
            "Null children are impossible in well-formed trees, so no base case is needed.",
            "The base case matters only for deletion, not for traversal or search.",
          ],
          "Tree recursion naturally reaches missing children. Correct code has to say what that means, whether the answer is false, zero, or an empty list.",
        ),
        seed(
          "delete-two-children",
          "BST deletion with two children",
          "deleting a node that has both a left and a right child",
          "Replacing the node with its successor or predecessor preserves the ordering invariant because the replacement key is the nearest valid boundary value.",
          [
            "Replacing the node with either child directly always preserves ordering.",
            "Deletion with two children is impossible without rebuilding the whole subtree.",
            "Any key from the right subtree works because all of them are larger than the deleted key.",
          ],
          "Successor and predecessor are special because they fit the ordering constraints on both sides of the deleted node simultaneously.",
        ),
      ],
      expert: [
        seed(
          "inorder-induction",
          "why in-order traversal of a BST is sorted",
          "proving the sortedness of in-order traversal formally",
          "Use structural induction: the left subtree yields sorted smaller keys, the root sits between them, and the right subtree yields sorted larger keys.",
          [
            "Use runtime induction because O(n) traversal implies sorted output.",
            "Assume the root is always the median and conclude the rest automatically.",
            "The proof is unnecessary because traversal order is a library detail, not a correctness claim.",
          ],
          "The proof mirrors the recursive structure of the traversal itself. The BST invariant bridges the left result, root, and right result into one sorted sequence.",
        ),
        seed(
          "delete-preserve-order",
          "preserving BST order during deletion",
          "auditing a BST delete operation",
          "The key requirement is that every surviving node still satisfies left < root < right after the replacement and recursive cleanup finish.",
          [
            "Deletion is correct as soon as the target key disappears somewhere in the tree.",
            "Deletion only needs to preserve subtree heights, not key ordering.",
            "Deletion correctness depends only on whether the node count decreases by one.",
          ],
          "BST deletion is not just removing a value; it is removing it while leaving the entire ordering contract intact.",
        ),
      ],
    },
  ),
  topic(
    "balanced-trees-heaps",
    "Balanced Trees, Heaps & Priority Queues",
    "Today’s drill is about shape maintenance, local rebalancing, and the partial-order invariants that support fast priority operations.",
    {
      easy: [
        seed(
          "heap-root-extreme",
          "the heap root property",
          "using a binary heap",
          "The root of a min-heap stores the minimum key because every parent is ordered relative to its children.",
          [
            "The root of a min-heap stores the median key because the tree is complete.",
            "The root of a min-heap is arbitrary because only leaves are ordered.",
            "The root of a min-heap stores the minimum key only after a full in-order traversal.",
          ],
          "Heap order is a local parent-child rule, but that rule is strong enough to force the minimum or maximum to the root.",
        ),
        seed(
          "avl-balance-factor",
          "the AVL balance rule",
          "reasoning about an AVL tree",
          "AVL trees keep the height difference between a node’s left and right subtrees tightly bounded so the tree stays shallow.",
          [
            "AVL trees require both subtrees to have exactly the same number of nodes.",
            "AVL trees only rebalance at the root after all insertions finish.",
            "AVL trees ignore subtree height and only compare key values.",
          ],
          "The point of AVL bookkeeping is to stop the tree from stretching into a chain while still preserving BST order.",
        ),
        seed(
          "priority-queue-contract",
          "what a priority queue promises",
          "using a priority queue abstraction",
          "A priority queue is optimized for access to the highest- or lowest-priority item, not for full sorted traversal or arbitrary search.",
          [
            "A priority queue is just a sorted array with a different name.",
            "A priority queue guarantees O(1) membership checks for arbitrary keys.",
            "A priority queue returns items in insertion order unless priorities tie.",
          ],
          "Priority queues care about the next best item. They do not promise all the order-sensitive operations that search trees support.",
        ),
      ],
      medium: [
        seed(
          "rotation-preserves-order",
          "tree rotations",
          "repairing an AVL imbalance with rotations",
          "A rotation preserves BST order because it only changes local parent-child structure while keeping the same in-order key sequence.",
          [
            "A rotation preserves order because it sorts the affected keys before reconnecting them.",
            "A rotation changes order but that is acceptable because AVL trees care only about height.",
            "A rotation preserves order only when the rotated subtree has exactly three nodes.",
          ],
          "Rotations are local rewrites on shape, not on key values. The relative left-root-right ordering of the keys remains valid throughout the transformation.",
        ),
        seed(
          "heap-array-indexing",
          "array-based heap indexing",
          "implementing a binary heap in an array",
          "A binary heap fits naturally in an array because the near-complete shape lets parents and children be mapped by index arithmetic.",
          [
            "A heap needs explicit parent pointers because array positions do not encode structure.",
            "A heap can only be stored in an array when all keys are distinct.",
            "A heap uses an array only to speed up sorting, not insertion or extraction.",
          ],
          "The tree shape is constrained enough that indices capture the structure without explicit node objects.",
        ),
        seed(
          "percolate-down-choice",
          "percolating down in a min-heap",
          "repairing heap order after removing the minimum",
          "Percolate-down must compare both children and swap with the smaller one so the parent-child invariant is restored locally and recursively.",
          [
            "Percolate-down should always swap with the left child first because it is closer in memory.",
            "Percolate-down can stop after one swap because the rest of the heap was already valid.",
            "Percolate-down only matters when the heap contains negative keys.",
          ],
          "Choosing the smaller child is what keeps the heap property intact after each local fix. Picking the wrong child can leave a violation behind.",
        ),
      ],
      hard: [
        seed(
          "wrong-child-swap",
          "a heap percolate-down bug",
          "always swapping with the left child when percolating down",
          "The bug can leave a smaller right child below a larger parent, so the min-heap invariant remains violated after the swap.",
          [
            "The bug only changes constant factors because either child eventually works.",
            "The bug is harmless when the left child exists because heaps care only about subtree size.",
            "The bug affects only complete heaps with odd height.",
          ],
          "Percolate-down is a local repair step. If you do not choose the better local child, the repair is not actually a repair.",
        ),
        seed(
          "double-rotation-cases",
          "why double rotations exist in AVL trees",
          "fixing an LR or RL AVL imbalance",
          "A double rotation is needed when the heavy child leans in the opposite direction from the heavy grandchild, so one single rotation cannot repair both shape problems at once.",
          [
            "A double rotation is just an optimization that speeds up the same fix a single rotation already achieves.",
            "A double rotation is needed only when duplicate keys are inserted.",
            "A double rotation exists because AVL trees require complete binary structure after each update.",
          ],
          "The intermediate lean must be corrected before the final local root can be rotated into place cleanly.",
        ),
        seed(
          "heap-membership-search",
          "membership search in a heap",
          "checking whether an arbitrary key exists inside a binary heap",
          "A heap is poor for arbitrary membership search because heap order only compares parents with children, not all keys globally.",
          [
            "A heap supports O(log n) arbitrary search because it is still a binary tree.",
            "A heap supports O(1) arbitrary search because the root summarizes the whole tree.",
            "A heap supports O(log n) search when it is stored in an array instead of nodes.",
          ],
          "Heaps are partial orders built for priority extraction. They do not give the path-pruning power that BST ordering gives for arbitrary search.",
        ),
      ],
      expert: [
        seed(
          "avl-update-path",
          "the update cost of an AVL tree",
          "arguing about AVL insertion or deletion cost",
          "Only nodes on the search path back to the root need height updates and possible rebalancing, which is why the work stays O(log n) in a balanced tree.",
          [
            "Every node in the tree must be rechecked after each AVL update because heights are globally coupled.",
            "AVL updates are O(1) because a single rotation fixes every possible imbalance immediately.",
            "AVL updates are O(n) because rotation changes can propagate unpredictably across the whole tree.",
          ],
          "The balance disturbance is local to the search path. That locality is the reason self-balancing search trees can stay logarithmic.",
        ),
        seed(
          "avl-vs-heap-choice",
          "choosing between an AVL tree and a heap",
          "selecting a structure for a workload",
          "Choose an AVL tree when you need ordered lookup and range-style queries; choose a heap when you repeatedly need only the next best item.",
          [
            "Choose a heap whenever you need ordering because heaps are always shallower.",
            "Choose an AVL tree whenever you need insertion because rotations dominate heap percolation.",
            "The two structures are interchangeable because both have logarithmic updates.",
          ],
          "Workload decides the structure. Similar asymptotic costs do not mean the supported operations are the same.",
        ),
      ],
    },
  ),
  topic(
    "hash-tables-sets",
    "Hash Tables & Sets",
    "Today’s drill focuses on dispersion, collision handling, deletion semantics, and the gap between expected-time lookup and fully ordered access.",
    {
      easy: [
        seed(
          "expected-o1",
          "expected O(1) hash-table lookup",
          "using a well-designed hash table",
          "Hash-table lookup is expected O(1) when keys are spread well enough that probe chains or bucket lengths stay short on average.",
          [
            "Hash-table lookup is worst-case O(1) for every possible input distribution.",
            "Hash-table lookup is O(1) because collisions never happen in valid tables.",
            "Hash-table lookup is O(1) only when keys are inserted in sorted order.",
          ],
          "The guarantee is probabilistic or distributional, not absolute. It relies on healthy dispersion and controlled load.",
        ),
        seed(
          "collisions-normal",
          "collisions in hashing",
          "inserting many keys into a hash table",
          "Collisions are normal because many possible keys must share a finite set of buckets or probe positions.",
          [
            "Collisions only happen when the hash function is implemented incorrectly.",
            "Collisions are impossible if the table size is prime.",
            "Collisions mean the data structure should switch to a BST immediately.",
          ],
          "A good hash function reduces collision risk; it does not eliminate the pigeonhole principle.",
        ),
        seed(
          "set-vs-map",
          "the difference between a set and a map",
          "choosing an associative container",
          "A set tracks membership only, while a map associates each key with a value.",
          [
            "A set is a map that stores keys in sorted order automatically.",
            "A map is a set that allows duplicate keys without overwriting.",
            "There is no semantic difference; the names are interchangeable.",
          ],
          "Both are lookup structures, but only maps store additional payload attached to each key.",
        ),
      ],
      medium: [
        seed(
          "chaining-vs-open-addressing",
          "collision policy choice",
          "choosing between separate chaining and open addressing",
          "Chaining stores colliding keys in bucket-local structures, while open addressing keeps probing within the table until it finds a usable slot.",
          [
            "Both strategies behave identically because collisions are resolved before insertion.",
            "Open addressing stores one linked list per bucket, while chaining probes linearly.",
            "Chaining is defined by double hashing, while open addressing is defined by AVL buckets.",
          ],
          "The policies differ in both structure and failure modes. That is why deletion, locality, and load-factor behavior differ too.",
        ),
        seed(
          "load-factor",
          "load factor",
          "monitoring hash-table health",
          "Load factor matters because higher occupancy increases collisions, longer probe sequences, or longer chains.",
          [
            "Load factor matters only for memory usage because bucket count does not affect search paths.",
            "Load factor matters only in chained tables, not open-addressed ones.",
            "Load factor should always be maximized because unused slots are wasted work.",
          ],
          "Hash tables stay fast when there is enough room to keep collision resolution cheap. Load factor is the main pressure gauge for that.",
        ),
        seed(
          "tombstone-delete",
          "deleting from an open-addressed table",
          "removing an entry from a linear-probing map",
          "Deletion often uses a tombstone or careful rebuild because later searches may still need to pass through the old slot to reach keys farther along the probe chain.",
          [
            "Deletion can always write null because searching only depends on the hash of the target key.",
            "Deletion is free in open addressing because the slot becomes available immediately with no correctness impact.",
            "Deletion requires sorting the remaining cluster after each remove.",
          ],
          "Probe continuity is part of correctness. The search algorithm needs to distinguish an empty-never-used slot from a once-used slot.",
        ),
      ],
      hard: [
        seed(
          "primary-clustering",
          "primary clustering",
          "using linear probing under repeated collisions",
          "Primary clustering occurs because an occupied run attracts more future inserts and probes, making the run keep growing.",
          [
            "Primary clustering occurs only in separate chaining because chains store many keys together.",
            "Primary clustering is just another name for a good cache-locality pattern.",
            "Primary clustering disappears automatically once the table size is prime.",
          ],
          "Linear probing’s simplicity is also its weakness: long runs become self-reinforcing because later collisions keep landing on the same run.",
        ),
        seed(
          "equality-hash-contract",
          "the equality and hash contract",
          "using custom keys in a hash-based container",
          "Equal keys must produce the same hash so lookups can follow the same bucket or probe path used during insertion.",
          [
            "Equal keys only need hashes that are numerically close, not identical.",
            "Equal keys may have different hashes if the table uses chaining instead of probing.",
            "The contract matters only for deletion, not insertion or lookup.",
          ],
          "Hash-based lookup starts from the hash. If equal keys disagree there, the table can never reliably find what it inserted.",
        ),
        seed(
          "rehash-on-resize",
          "rehashing during resize",
          "growing a hash table to a new capacity",
          "Entries usually must be reinserted under the new capacity because bucket positions depend on the table size and hash reduction scheme.",
          [
            "Entries can stay in place because hashes are intrinsic to the keys, not the table.",
            "Only colliding keys need to be rehashed; unique keys keep the same slot.",
            "Rehashing is unnecessary when the new capacity is larger than the old by a factor of two.",
          ],
          "The raw hash may be stable, but the mapping from hash to slot changes with capacity. That is why resize is more than an array copy.",
        ),
      ],
      expert: [
        seed(
          "adversarial-inputs",
          "the limits of expected-time hashing guarantees",
          "reasoning about hash tables under adversarial or pathological inputs",
          "Expected O(1) depends on distribution assumptions; adversarial keys or weak hashes can still force long chains or probe sequences.",
          [
            "Expected O(1) automatically becomes worst-case O(1) once the implementation uses a prime table size.",
            "Adversarial inputs only matter for cryptography, not general-purpose hash tables.",
            "A resize policy alone prevents all pathological clustering regardless of the hash function.",
          ],
          "Hashing is powerful because it is usually good, not because it is impossible to break. Robust systems remember that distinction.",
        ),
        seed(
          "null-slot-false-negative",
          "a false negative after deletion in linear probing",
          "clearing a once-used slot to null in an open-addressed table",
          "The search can stop too early at the cleared slot and incorrectly report that a farther key in the same probe chain is absent.",
          [
            "The search remains correct because null means the slot is available again.",
            "The search only fails if the deleted key had duplicates elsewhere in the cluster.",
            "The search never stops early in linear probing because it scans the full table each time.",
          ],
          "Open addressing relies on uninterrupted probe chains. Breaking that chain can hide still-live keys.",
        ),
      ],
    },
  ),
  topic(
    "sorting-selection",
    "Sorting & Selection",
    "Today’s drill focuses on sorting tradeoffs, partition invariants, and the idea that many problems need only partial order instead of a full sort.",
    {
      easy: [
        seed(
          "insertion-nearly-sorted",
          "when insertion sort shines",
          "choosing a sort for a tiny or nearly sorted input",
          "Insertion sort is especially good on small or nearly sorted inputs because it can exploit existing order with low overhead.",
          [
            "Insertion sort is best for all large random arrays because it does no recursion.",
            "Insertion sort is only useful when keys are already unique.",
            "Insertion sort is ideal whenever stability is irrelevant.",
          ],
          "Insertion sort has poor worst-case growth, but it can be very effective when little work is needed to repair local disorder.",
        ),
        seed(
          "merge-stability",
          "merge sort stability",
          "merging two sorted halves",
          "Standard merge sort is stable when equal keys are taken from the left half before equal keys from the right half.",
          [
            "Merge sort is stable because recursion preserves insertion order automatically.",
            "Merge sort is unstable unless the input length is a power of two.",
            "Merge sort is stable only when the array is already nearly sorted.",
          ],
          "Stability comes from tie-handling in the merge step, not from recursion by itself.",
        ),
        seed(
          "quicksort-partition",
          "the central idea of quicksort",
          "understanding quicksort",
          "Quicksort works by partitioning around a pivot, then recursively sorting the two sides created by that partition.",
          [
            "Quicksort works by repeatedly merging already sorted halves.",
            "Quicksort works by extracting the minimum into a heap until the array is sorted.",
            "Quicksort works by hashing keys into buckets and reading the buckets back out.",
          ],
          "Partitioning is the core move: enough order is established around the pivot to let the recursive subproblems become independent.",
        ),
      ],
      medium: [
        seed(
          "radix-structure",
          "why radix sort can beat comparison bounds",
          "sorting fixed-structure integer-like keys",
          "Radix sort exploits key structure such as digits or fixed-width symbols, so it is not constrained by the comparison-sort lower bound.",
          [
            "Radix sort beats the lower bound because it makes fewer recursive calls than merge sort.",
            "Radix sort beats the lower bound by using a better pivot than quicksort.",
            "Radix sort is a comparison sort whose comparisons happen in parallel.",
          ],
          "The lower bound applies to algorithms whose only source of order information is pairwise comparison. Radix sort uses richer key access.",
        ),
        seed(
          "quickselect-kth",
          "quickselect",
          "finding the kth smallest element",
          "Quickselect is attractive because it recursively explores only the side that can still contain the target rank instead of fully sorting both sides.",
          [
            "Quickselect is attractive because it returns the full sorted array as a side effect.",
            "Quickselect is attractive because it is always stable.",
            "Quickselect is attractive because it avoids partitioning entirely.",
          ],
          "Selection needs only enough order to isolate one rank, not full order across every element.",
        ),
        seed(
          "heapsort-properties",
          "heap sort’s tradeoff profile",
          "comparing heap sort with merge sort and quicksort",
          "Heap sort is in-place and O(n log n), but it is not stable and often has worse constant-factor behavior than merge sort or well-tuned quicksort.",
          [
            "Heap sort is stable because the heap root never moves backward.",
            "Heap sort is recursive and requires linear extra memory like merge sort.",
            "Heap sort is best whenever the input is nearly sorted because it adapts to existing order.",
          ],
          "Heap sort’s main appeal is strong worst-case behavior with little extra memory, not stability or adaptiveness.",
        ),
      ],
      hard: [
        seed(
          "bad-pivot",
          "quicksort’s bad pivot behavior",
          "running quicksort with repeatedly poor pivots",
          "If the pivot repeatedly creates highly unbalanced partitions, quicksort can degrade to O(n^2).",
          [
            "Poor pivots only change constant factors because partitioning is still linear.",
            "Poor pivots affect memory but not runtime because all elements are still visited once.",
            "Poor pivots are harmless whenever the array contains distinct keys.",
          ],
          "Quicksort’s recursive work depends on subproblem balance. If the split is consistently bad, the recursion stops looking logarithmic.",
        ),
        seed(
          "merge-tie-bug",
          "a merge-stability bug",
          "using < instead of <= when merging equal keys",
          "The output can stay correctly sorted by key while still losing stability because equal items from the right half may leap ahead of equal items from the left half.",
          [
            "The bug destroys sortedness because strict < cannot compare equal values.",
            "The bug changes runtime but not output order.",
            "The bug only matters when all keys are distinct.",
          ],
          "Sortedness and stability are different properties. A merge can preserve the first and break the second.",
        ),
        seed(
          "partition-invariant",
          "a partition invariant",
          "reasoning about a quicksort partition loop",
          "A correct partition loop maintains a boundary separating items already known to be on the correct side of the pivot from items not yet classified.",
          [
            "A correct partition loop keeps the pivot in its final location during every iteration.",
            "A correct partition loop requires the left and right halves to stay internally sorted during partitioning.",
            "A correct partition loop works only when the pivot is the true median.",
          ],
          "Partition correctness is an invariant story. The loop gradually expands what is known to be properly placed relative to the pivot.",
        ),
      ],
      expert: [
        seed(
          "comparison-lower-bound",
          "the comparison-sort lower bound",
          "formal reasoning about comparison sorting",
          "The O(n log n) lower bound comes from a decision-tree argument: comparison sorting must distinguish among n! possible input orders with binary outcomes.",
          [
            "The lower bound comes from recursion depth alone, so any iterative comparison sort can beat it.",
            "The lower bound says no sorting algorithm of any kind can beat O(n log n).",
            "The lower bound applies only to stable sorts because unstable sorts do less work.",
          ],
          "The decision tree counts how much information comparisons can reveal. Comparison sorts are limited by that information budget.",
        ),
        seed(
          "choose-sort-by-constraints",
          "choosing a sorting algorithm professionally",
          "making a sorting choice for a production workload",
          "The right sort depends on constraints like stability, memory, key structure, and worst-case tolerance, not on a single favorite algorithm name.",
          [
            "The right sort is always quicksort because it wins most benchmark charts.",
            "The right sort is always merge sort because O(n log n) is optimal.",
            "The right sort is whichever one is easiest to implement first; constraints can be handled later.",
          ],
          "Sorting is a tradeoff problem. Similar asymptotic runtimes can still imply very different operational behavior.",
        ),
      ],
    },
  ),
  topic(
    "graphs-shortest-paths",
    "Graphs & Shortest Paths",
    "Today’s drill focuses on frontier semantics, weighted versus unweighted path logic, and the invariants that make graph algorithms reliable instead of accidental.",
    {
      easy: [
        seed(
          "bfs-unweighted",
          "BFS on an unweighted graph",
          "finding the shortest number of edges from a source",
          "BFS finds shortest path lengths in unweighted graphs because it expands vertices in increasing distance layers.",
          [
            "BFS finds weighted shortest paths because a queue always prefers cheaper edges.",
            "BFS only finds a path, not necessarily a shortest one, unless the graph is a tree.",
            "BFS finds shortest paths only when adjacency lists are sorted alphabetically.",
          ],
          "The queue preserves discovery by layer. That layer structure is exactly what shortest edge-count paths require.",
        ),
        seed(
          "dfs-use-case",
          "what DFS is good at",
          "choosing a traversal for a graph problem",
          "DFS is useful for reachability structure, cycle reasoning, and depth-oriented exploration, not because it automatically finds the shortest path.",
          [
            "DFS is mainly useful because it always returns a minimum-edge path first.",
            "DFS is only useful on dense graphs because stacks need many edges.",
            "DFS is inappropriate for recursion because graphs can branch.",
          ],
          "DFS and BFS explore differently. DFS follows one path deeply before backtracking, which makes it good for structural questions but not shortest unweighted paths.",
        ),
        seed(
          "adjacency-list-sparse",
          "graph representation for sparse graphs",
          "storing a sparse graph efficiently",
          "Adjacency lists are usually better for sparse graphs because they store only the edges that actually exist.",
          [
            "An adjacency matrix is always better because random access is O(1).",
            "Adjacency lists are only useful for weighted graphs, not unweighted ones.",
            "Sparse graphs should be stored as heaps because most entries are empty.",
          ],
          "Sparse graphs have far fewer edges than V^2, so explicitly storing only present edges is usually the right space tradeoff.",
        ),
      ],
      medium: [
        seed(
          "visited-set",
          "visited-state tracking",
          "traversing a graph that may contain cycles",
          "Visited tracking prevents the algorithm from reprocessing the same vertex indefinitely and from duplicating unnecessary work.",
          [
            "Visited tracking is only an optimization; correctness is unaffected in cyclic graphs.",
            "Visited tracking matters only in weighted graphs because unweighted edges cannot create loops.",
            "Visited tracking is unnecessary once a queue is used instead of a stack.",
          ],
          "Graphs can revisit the same vertex through many paths. Without visited logic, traversal can explode or fail to terminate on cyclic inputs.",
        ),
        seed(
          "dijkstra-nonnegative",
          "Dijkstra’s precondition",
          "using Dijkstra’s algorithm on a weighted graph",
          "Dijkstra requires nonnegative edge weights so that once a smallest tentative distance is chosen, no later path can undercut it.",
          [
            "Dijkstra requires distinct weights, not nonnegative ones.",
            "Dijkstra works with negative edges as long as there is no negative cycle.",
            "Dijkstra only requires a binary heap; edge signs do not matter.",
          ],
          "Its greedy finalization step depends on distances never getting cheaper through future detours. Negative edges break that reasoning.",
        ),
        seed(
          "topological-dag",
          "topological sorting",
          "ordering tasks by prerequisites",
          "Topological order exists only for DAGs because directed cycles create mutually dependent vertices that cannot all come earlier than each other.",
          [
            "Topological order exists for any connected graph as long as it has a starting node.",
            "Topological order fails only when the graph is weighted.",
            "Topological order exists for cyclic graphs if the cycle length is odd.",
          ],
          "Prerequisite ordering is a partial-order problem. Cycles destroy the possibility of a linear order that respects all directed edges.",
        ),
      ],
      hard: [
        seed(
          "visited-on-enqueue",
          "when to mark visited in BFS",
          "implementing BFS with a queue",
          "Marking a vertex visited when it is enqueued prevents duplicates from being inserted by multiple parents in the same layer.",
          [
            "Marking visited must wait until dequeue so all shortest parents can enqueue the same vertex first.",
            "Visited timing does not matter because queues automatically deduplicate equal vertices.",
            "Marking visited on enqueue is only correct for trees, not graphs with cross edges.",
          ],
          "BFS correctness does not require repeated queue copies of the same vertex. First discovery already gives the shortest layer in an unweighted graph.",
        ),
        seed(
          "disconnected-outer-loop",
          "traversing a disconnected graph",
          "running a full graph traversal over every component",
          "A single BFS or DFS from one start node only covers its component, so a full traversal needs an outer loop over all vertices.",
          [
            "A disconnected graph is fully covered if the traversal uses recursion instead of iteration.",
            "Disconnected graphs are impossible when adjacency lists are valid.",
            "A single traversal covers every component once the graph is undirected.",
          ],
          "Components are independent reachability regions. Starting inside one tells you nothing about vertices in the others.",
        ),
        seed(
          "mst-vs-spt",
          "minimum spanning trees versus shortest-path trees",
          "comparing two tree-shaped graph outputs",
          "An MST minimizes total edge weight across a spanning structure, while a shortest-path tree minimizes source-to-vertex distances from one start vertex.",
          [
            "An MST and a shortest-path tree are equivalent whenever all weights are positive.",
            "An MST minimizes the longest source-to-vertex path, which is why Dijkstra returns one.",
            "A shortest-path tree minimizes total edge weight over the whole graph, not per source distance.",
          ],
          "They optimize different objectives. Similar tree shapes do not mean the same correctness goal.",
        ),
      ],
      expert: [
        seed(
          "dijkstra-proof-intuition",
          "Dijkstra’s correctness intuition",
          "proving why a finalized Dijkstra distance stays final",
          "Once the smallest tentative distance is extracted, every remaining unexplored path to that vertex would have to go through a vertex with no smaller tentative distance and then add nonnegative weight, so it cannot improve the answer.",
          [
            "The distance stays final because heaps never reorder extracted vertices.",
            "The distance stays final because the graph becomes a tree after enough relaxations.",
            "The distance stays final only when every edge weight is exactly one.",
          ],
          "The proof is about the greedy frontier, not about the heap. Nonnegative edges make future detours unable to beat the current best.",
        ),
        seed(
          "bfs-layer-parent",
          "the BFS layer and parent invariant",
          "building shortest-path parents in BFS",
          "The first time a vertex is discovered determines its shortest unweighted distance and therefore the correct predecessor for one shortest path tree.",
          [
            "The last parent to discover a vertex is best because it has seen more of the graph.",
            "Parents can be updated arbitrarily within the same run because BFS only cares about reachability.",
            "Parent pointers are valid only if the graph is acyclic.",
          ],
          "Queue order guarantees first discovery happens at the minimum edge distance. Later discoveries are not shorter in an unweighted graph.",
        ),
      ],
    },
  ),
  topic(
    "dynamic-programming-greedy",
    "Dynamic Programming & Greedy",
    "Today’s drill is about state design, subproblem reuse, and the exact conditions under which a local greedy move deserves global trust.",
    {
      easy: [
        seed(
          "dp-core-idea",
          "the core idea behind dynamic programming",
          "solving a problem with repeated subproblems",
          "Dynamic programming is useful when subproblems overlap and the full solution can be built from optimal solutions to smaller states.",
          [
            "Dynamic programming is useful whenever recursion appears in the source code.",
            "Dynamic programming is useful only for problems with sorted input.",
            "Dynamic programming is useful only when a greedy choice fails immediately.",
          ],
          "DP is about structure in the problem itself: overlapping subproblems and a valid way to compose optimal smaller answers.",
        ),
        seed(
          "memoization-cache",
          "memoization",
          "optimizing a top-down recursive solution",
          "Memoization stores solved subproblems so repeated calls can reuse answers instead of recomputing them.",
          [
            "Memoization stores the recursion stack so the function can avoid base cases.",
            "Memoization works by sorting the subproblems before recursion starts.",
            "Memoization only improves space usage, not time.",
          ],
          "Top-down recursion often revisits the same state many times. Caching turns that repeated work into a one-time cost per state.",
        ),
        seed(
          "greedy-safe-choice",
          "when a greedy algorithm is justified",
          "designing a greedy algorithm",
          "A greedy strategy is justified only when a locally optimal choice can be shown to fit within some globally optimal solution.",
          [
            "A greedy strategy is justified whenever it works on a few examples.",
            "A greedy strategy is justified whenever it reduces the remaining input size quickly.",
            "A greedy strategy is justified only if the data structure used is a priority queue.",
          ],
          "Greedy correctness needs a proof, often via exchange or cut-style reasoning. Local appeal is not enough.",
        ),
      ],
      medium: [
        seed(
          "coin-change-state",
          "DP state design",
          "defining a state for coin change",
          "A useful state captures exactly the remaining amount or prefix information needed so subproblem answers can combine correctly.",
          [
            "A useful state should include every variable in the entire original input whether or not future decisions depend on it.",
            "A useful state only needs the current recursion depth because all amounts behave the same.",
            "A useful state is whatever fits in a one-dimensional array, even if it omits decision context.",
          ],
          "The DP state is the contract. If it loses information future choices need, the recurrence becomes invalid.",
        ),
        seed(
          "state-missing-variable",
          "a bad DP state",
          "defining a recurrence while forgetting a decision variable that changes future options",
          "If the state omits information that affects future choices, two genuinely different subproblems collapse into one cache entry and the recurrence becomes wrong.",
          [
            "Missing a variable only affects runtime because the DP table gets smaller.",
            "A missing variable can be repaired by adding more base cases without changing the recurrence.",
            "State variables matter only in memoized recursion, not tabulation.",
          ],
          "State design is about sufficiency. Wrong state means wrong reuse.",
        ),
        seed(
          "falsy-memo-bug",
          "a memoization lookup bug",
          "checking `if (memo[state])` before a recursive call",
          "That check fails when a valid cached answer is falsy, such as 0 or false, because presence and truthiness are not the same thing.",
          [
            "The check is correct because dynamic-programming answers are always positive.",
            "The check only fails in bottom-up DP, not memoization.",
            "The check is safe as long as the map keys are numeric.",
          ],
          "Memoization should test whether a state has been stored, not whether its value happens to be truthy.",
        ),
      ],
      hard: [
        seed(
          "memo-vs-tabulation",
          "memoization versus tabulation",
          "comparing two dynamic-programming implementations of the same recurrence",
          "They solve the same subproblem graph but visit states in different orders: memoization top-down on demand, tabulation bottom-up by dependency order.",
          [
            "They are different algorithms because one is exact and the other is approximate.",
            "They always compute different answers because recursion and iteration expose different states.",
            "They differ only in whether space optimization is possible, not in evaluation order.",
          ],
          "The recurrence defines the mathematics. Memoization and tabulation are execution strategies for that same underlying dependency structure.",
        ),
        seed(
          "interval-scheduling-proof",
          "the greedy rule for interval scheduling",
          "choosing non-overlapping intervals greedily",
          "Picking the interval with earliest finishing time is safe because it leaves as much room as possible for the remaining work.",
          [
            "Picking the shortest interval is always better because it uses the least duration.",
            "Picking the earliest starting interval is always better because it commits sooner.",
            "Any interval that overlaps the fewest others is automatically safe with no proof.",
          ],
          "Earliest finish is the classic safe local choice. It can be justified by an exchange argument, not just by intuition.",
        ),
        seed(
          "dp-subproblem-dag",
          "the subproblem graph behind DP",
          "reasoning about a dynamic-programming solution conceptually",
          "A DP can often be seen as computation over a DAG of states where edges represent valid dependencies between subproblems.",
          [
            "A DP is really a linked list of states because each state has one predecessor.",
            "A DP must always correspond to a tree because recursion branches.",
            "A DP cannot be represented as a graph because states are mathematical, not structural.",
          ],
          "Thinking in terms of a state DAG explains why topological fill orders and memoized reuse both make sense.",
        ),
      ],
      expert: [
        seed(
          "exchange-argument",
          "an exchange argument",
          "proving a greedy algorithm correct",
          "An exchange argument shows that if an optimal solution made a different early choice, you can swap in the greedy choice without making the solution worse.",
          [
            "An exchange argument proves only runtime bounds, not correctness.",
            "An exchange argument works by enumerating all possible solutions and comparing their scores directly.",
            "An exchange argument is needed for every dynamic-programming proof because DP is also greedy at each step.",
          ],
          "The exchange step is what connects local choice to global optimality. It says the greedy move can coexist with some optimum.",
        ),
        seed(
          "state-sufficiency-formal",
          "formal state sufficiency",
          "auditing whether a DP state is well defined",
          "A state is sufficient when any two partial solutions mapped to that state have exactly the same future decision space and objective meaning.",
          [
            "A state is sufficient whenever it compresses the input into a smaller number of dimensions.",
            "A state is sufficient if it makes the table rectangular and easy to allocate.",
            "A state is sufficient whenever it includes the current index, even if constraints depend on earlier choices too.",
          ],
          "This is the deepest DP design test: equal state labels must mean equal future optimization problems. Otherwise cached reuse is invalid.",
        ),
      ],
    },
  ),
  ...ML_AI_TOPIC_SPECS,
];

function buildTopicQuestions(
  topicSpec: TopicSpec,
  level: QuestionLevel,
): BankQuestion[] {
  const builders = PROMPT_BUILDERS[level];

  return topicSpec.seeds[level].flatMap((seedItem, seedIndex) =>
    builders.map((builder, builderIndex) => {
      const variantKey = `${topicSpec.slug}:${level}:${seedItem.key}:${builderIndex}`;
      const { options, answerIndex } = buildOptions(seedItem, variantKey);

      return {
        id: `bank-${topicSpec.slug}-${level}-${seedIndex + 1}-${builderIndex + 1}`,
        prompt: builder(seedItem),
        options,
        answerIndex,
        explanation: seedItem.explanation,
        topic: topicSpec.title,
        level,
        source: "authored-bank",
      } satisfies BankQuestion;
    }),
  );
}

const AUTHORED_QUESTION_BANK = TOPIC_SPECS.flatMap((topicSpec) => {
  return (["easy", "medium", "hard", "expert"] as const).flatMap((level) =>
    buildTopicQuestions(topicSpec, level),
  );
});

const QUESTIONS_BY_LEVEL = (["easy", "medium", "hard", "expert"] as const).reduce<
  Record<QuestionLevel, number>
>(
  (accumulator, level) => {
    accumulator[level] = AUTHORED_QUESTION_BANK.filter(
      (question) => question.level === level,
    ).length;
    return accumulator;
  },
  { easy: 0, medium: 0, hard: 0, expert: 0 },
);

const EXPECTED_QUESTION_COUNTS: Record<QuestionLevel, number> = {
  easy: 800,
  medium: 550,
  hard: 400,
  expert: 100,
};

if (
  QUESTIONS_BY_LEVEL.easy !== EXPECTED_QUESTION_COUNTS.easy ||
  QUESTIONS_BY_LEVEL.medium !== EXPECTED_QUESTION_COUNTS.medium ||
  QUESTIONS_BY_LEVEL.hard !== EXPECTED_QUESTION_COUNTS.hard ||
  QUESTIONS_BY_LEVEL.expert !== EXPECTED_QUESTION_COUNTS.expert ||
  AUTHORED_QUESTION_BANK.length !==
    Object.values(EXPECTED_QUESTION_COUNTS).reduce(
      (total, count) => total + count,
      0,
    )
) {
  throw new Error(
    `Authored question bank size mismatch: ${JSON.stringify(QUESTIONS_BY_LEVEL)} (total ${AUTHORED_QUESTION_BANK.length}).`,
  );
}

const AUTHORED_QUESTION_BANK_TOPICS = TOPIC_SPECS.map((topicSpec) => ({
  slug: topicSpec.slug,
  title: topicSpec.title,
  dailySummary: topicSpec.dailySummary,
})) satisfies PublishedQuestionBankTopic[];

export function getAuthoredQuestionBank(): BankQuestion[] {
  return AUTHORED_QUESTION_BANK;
}

export function getAuthoredQuestionBankTopics(): PublishedQuestionBankTopic[] {
  return AUTHORED_QUESTION_BANK_TOPICS;
}

export function getAuthoredQuestionCountsByLevel() {
  return {
    ...QUESTIONS_BY_LEVEL,
    total: AUTHORED_QUESTION_BANK.length,
  };
}

function getDayNumber(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    const fallback = new Date(`${getDateKey()}T00:00:00Z`);
    return Math.floor(fallback.getTime() / 86_400_000);
  }

  return Math.floor(parsed.getTime() / 86_400_000);
}

export function buildDailyQuizFromQuestionBank(
  questionBank: Pick<PublishedQuestionBankArtifact, "topics" | "questions">,
  date = getDateKey(),
): DailyQuizDocument {
  const dayNumber = getDayNumber(date);
  const topic = questionBank.topics[dayNumber % questionBank.topics.length];

  if (!topic) {
    throw new Error("Question bank is missing topic metadata for daily quiz rotation.");
  }

  const rotation = Math.floor(dayNumber / questionBank.topics.length);
  const questions = (["easy", "medium", "hard"] as const).map((level, index) => {
    const candidates = questionBank.questions.filter(
      (question) => question.topic === topic.title && question.level === level,
    );

    if (candidates.length === 0) {
      throw new Error(
        `Question bank is missing ${level} questions for topic "${topic.title}".`,
      );
    }

    const questionIndex = (rotation * 17 + index * 7) % candidates.length;

    return candidates[questionIndex]!;
  });

  return {
    date,
    title: `Daily Foundations Drill · ${topic.title}`,
    summary: topic.dailySummary,
    topic: topic.title,
    questions,
  };
}

export function getAuthoredDailyQuiz(date = getDateKey()): DailyQuizDocument {
  return buildDailyQuizFromQuestionBank(
    {
      topics: AUTHORED_QUESTION_BANK_TOPICS,
      questions: AUTHORED_QUESTION_BANK,
    },
    date,
  );
}
