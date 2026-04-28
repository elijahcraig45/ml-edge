import type { CodingProblem } from "@/lib/types";

/** In-browser Python (Pyodide) coding problems for each DS&A lesson.
 *  Each assertion string is executed as Python after the user's code runs.
 *  AssertionError → test failed; no exception → test passed.
 */

const LESSON_1_PROBLEMS: CodingProblem[] = [
  {
    id: "dsa-l1-code-1",
    title: "Reverse a Linked List",
    difficulty: "easy",
    prompt: `You are given the head of a singly linked list. Reverse it **in-place** and return the new head.

A \`Node\` class is already defined:
\`\`\`
class Node:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next
\`\`\`

**Constraints:** O(n) time, O(1) extra space — no building a new list or using Python's built-in \`reversed\`.

**Example:**
\`\`\`
1 → 2 → 3 → 4 → None   becomes   4 → 3 → 2 → 1 → None
\`\`\``,
    starterCode: `class Node:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next

def reverse(head: Node) -> Node:
    prev = None
    curr = head
    # TODO: walk the list. At each step:
    #   1. save curr.next in a temp variable
    #   2. point curr.next backwards to prev
    #   3. advance prev and curr
    # Return the new head (what prev points to when curr is None)
    return prev`,
    testCases: [
      {
        label: "Empty list returns None",
        assertion: `assert reverse(None) is None`,
      },
      {
        label: "Single node points to itself as new head",
        assertion: `n = Node(1)
result = reverse(n)
assert result.val == 1 and result.next is None`,
      },
      {
        label: "1→2→3 becomes 3→2→1",
        assertion: `def to_list(h):
    out = []
    while h:
        out.append(h.val)
        h = h.next
    return out

def build(vals):
    if not vals: return None
    head = Node(vals[0])
    curr = head
    for v in vals[1:]:
        curr.next = Node(v)
        curr = curr.next
    return head

assert to_list(reverse(build([1, 2, 3]))) == [3, 2, 1]`,
      },
      {
        label: "Two-node list: 5→9 becomes 9→5",
        assertion: `def to_list(h):
    out = []
    while h:
        out.append(h.val)
        h = h.next
    return out

head = Node(5, Node(9))
assert to_list(reverse(head)) == [9, 5]`,
      },
      {
        label: "Five-element list reversed correctly",
        assertion: `def to_list(h):
    out = []
    while h:
        out.append(h.val)
        h = h.next
    return out

def build(vals):
    if not vals: return None
    head = Node(vals[0])
    curr = head
    for v in vals[1:]:
        curr.next = Node(v)
        curr = curr.next
    return head

assert to_list(reverse(build([1, 2, 3, 4, 5]))) == [5, 4, 3, 2, 1]`,
        hidden: true,
      },
    ],
    hint: "You need exactly three variables: prev (starts as None), curr (starts at head), and a temp to save curr.next before you overwrite it. Each iteration does one pointer reversal and advances both prev and curr forward.",
    solution: `class Node:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next

def reverse(head: Node) -> Node:
    prev = None
    curr = head
    while curr:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    return prev`,
  },
];

const LESSON_2_PROBLEMS: CodingProblem[] = [
  {
    id: "dsa-l2-code-1",
    title: "Queue from Two Stacks",
    difficulty: "medium",
    prompt: `Implement a \`Queue\` class using **only two Python lists** (used as stacks — \`.append()\` and \`.pop()\` only, no indexing). Support:
- \`enqueue(val)\` — add to the back
- \`dequeue()\` — remove from the front; raise \`IndexError\` if empty
- \`is_empty() -> bool\`

FIFO order must be preserved. No \`collections.deque\` allowed.`,
    starterCode: `class Queue:
    def __init__(self):
        self._inbox = []
        self._outbox = []

    def enqueue(self, val):
        # TODO: push to inbox
        pass

    def dequeue(self):
        # TODO: if outbox is empty, transfer all from inbox (pop → append)
        # then pop from outbox; raise IndexError if both are empty
        pass

    def is_empty(self) -> bool:
        # TODO
        pass`,
    testCases: [
      {
        label: "Single enqueue then dequeue returns the item",
        assertion: `q = Queue()
q.enqueue(42)
assert q.dequeue() == 42`,
      },
      {
        label: "FIFO: dequeue returns items in enqueue order",
        assertion: `q = Queue()
q.enqueue(1); q.enqueue(2); q.enqueue(3)
assert q.dequeue() == 1
assert q.dequeue() == 2
assert q.dequeue() == 3`,
      },
      {
        label: "is_empty reflects correct state",
        assertion: `q = Queue()
assert q.is_empty() == True
q.enqueue(1)
assert q.is_empty() == False
q.dequeue()
assert q.is_empty() == True`,
      },
      {
        label: "Dequeue from empty queue raises IndexError",
        assertion: `q = Queue()
raised = False
try:
    q.dequeue()
except IndexError:
    raised = True
assert raised, "Expected IndexError"`,
      },
      {
        label: "Interleaved enqueue/dequeue preserves FIFO",
        assertion: `q = Queue()
q.enqueue(10); q.enqueue(20)
assert q.dequeue() == 10
q.enqueue(30)
assert q.dequeue() == 20
assert q.dequeue() == 30`,
        hidden: true,
      },
    ],
    hint: "Only transfer from inbox to outbox when outbox is empty — not on every dequeue. Popping from inbox and appending to outbox naturally reverses the order, restoring FIFO.",
    solution: `class Queue:
    def __init__(self):
        self._inbox = []
        self._outbox = []

    def enqueue(self, val):
        self._inbox.append(val)

    def dequeue(self):
        if not self._outbox:
            while self._inbox:
                self._outbox.append(self._inbox.pop())
        if not self._outbox:
            raise IndexError("dequeue from empty queue")
        return self._outbox.pop()

    def is_empty(self) -> bool:
        return not self._inbox and not self._outbox`,
  },
];

const LESSON_3_PROBLEMS: CodingProblem[] = [
  {
    id: "dsa-l3-code-1",
    title: "Min-Heap Implementation",
    difficulty: "medium",
    prompt: `Implement a \`MinHeap\` class backed by a Python list with \`push(val)\` and \`pop_min()\` (raises \`IndexError\` when empty). After every push and pop, the heap invariant must hold: every parent ≤ both its children.

Array indexing: for a node at index i, parent = (i−1)//2, left child = 2i+1, right child = 2i+2.`,
    starterCode: `class MinHeap:
    def __init__(self):
        self._data = []

    def push(self, val):
        # Append val, then sift up from the last index
        pass

    def pop_min(self):
        # Swap root with last element, pop last, then sift down the new root
        # Raise IndexError if heap is empty
        pass

    def _sift_up(self, i):
        # While i > 0 and parent > self._data[i]: swap, move i to parent
        pass

    def _sift_down(self, i):
        # Find smaller child; swap if it's smaller than self._data[i]; repeat
        pass`,
    testCases: [
      {
        label: "pop_min from empty heap raises IndexError",
        assertion: `h = MinHeap()
raised = False
try:
    h.pop_min()
except IndexError:
    raised = True
assert raised`,
      },
      {
        label: "Single push/pop roundtrip",
        assertion: `h = MinHeap()
h.push(7)
assert h.pop_min() == 7`,
      },
      {
        label: "Pushing in reverse order; popping gives sorted sequence",
        assertion: `h = MinHeap()
for v in [5, 3, 8, 1, 9, 2]:
    h.push(v)
out = [h.pop_min() for _ in range(6)]
assert out == [1, 2, 3, 5, 8, 9], f"got {out}"`,
      },
      {
        label: "Handles duplicate values correctly",
        assertion: `h = MinHeap()
h.push(3); h.push(3); h.push(1)
assert h.pop_min() == 1
assert h.pop_min() == 3`,
      },
      {
        label: "Pops always return non-decreasing sequence (stress test)",
        assertion: `h = MinHeap()
import random
random.seed(42)
vals = list(range(30))
random.shuffle(vals)
for v in vals:
    h.push(v)
last = -1
while h._data:
    m = h.pop_min()
    assert m >= last, f"out of order: {m} after {last}"
    last = m`,
        hidden: true,
      },
    ],
    hint: "_sift_up: compare with parent at (i-1)//2 and swap upward while parent is larger. _sift_down: always swap with the SMALLER of the two children (not just the left one) to preserve the min-heap property.",
    solution: `class MinHeap:
    def __init__(self):
        self._data = []

    def push(self, val):
        self._data.append(val)
        self._sift_up(len(self._data) - 1)

    def pop_min(self):
        if not self._data:
            raise IndexError("pop from empty heap")
        self._data[0], self._data[-1] = self._data[-1], self._data[0]
        val = self._data.pop()
        if self._data:
            self._sift_down(0)
        return val

    def _sift_up(self, i):
        while i > 0:
            parent = (i - 1) // 2
            if self._data[parent] > self._data[i]:
                self._data[parent], self._data[i] = self._data[i], self._data[parent]
                i = parent
            else:
                break

    def _sift_down(self, i):
        n = len(self._data)
        while True:
            smallest = i
            left, right = 2 * i + 1, 2 * i + 2
            if left < n and self._data[left] < self._data[smallest]:
                smallest = left
            if right < n and self._data[right] < self._data[smallest]:
                smallest = right
            if smallest == i:
                break
            self._data[i], self._data[smallest] = self._data[smallest], self._data[i]
            i = smallest`,
  },
];

const LESSON_4_PROBLEMS: CodingProblem[] = [
  {
    id: "dsa-l4-code-1",
    title: "Group Anagrams",
    difficulty: "medium",
    prompt: `Given a list of strings, group the anagrams together. Return a list of groups; each group is a list of strings that are anagrams of each other. Order within groups and order of groups does not matter.

Two strings are anagrams if they contain the same characters with the same frequencies — e.g. \`"eat"\` and \`"tea"\` are anagrams.

**Example:**
\`\`\`
group_anagrams(["eat","tea","tan","ate","nat","bat"])
→ [["eat","tea","ate"], ["tan","nat"], ["bat"]]  (any order)
\`\`\`

**Key insight:** what single value could you compute from a string that is the same for all its anagrams, and different for non-anagrams? Use that as a dict key.`,
    starterCode: `def group_anagrams(strs: list) -> list:
    groups = {}  # key -> list of strings
    for s in strs:
        # TODO: compute a key that is identical for all anagrams of s
        # then append s to groups[key]
        pass
    return list(groups.values())`,
    testCases: [
      {
        label: "Empty input returns empty list",
        assertion: `assert group_anagrams([]) == []`,
      },
      {
        label: "Single word returns one group",
        assertion: `result = group_anagrams(["abc"])
assert len(result) == 1 and result[0] == ["abc"]`,
      },
      {
        label: "Classic example: 3 groups",
        assertion: `result = group_anagrams(["eat","tea","tan","ate","nat","bat"])
result_sets = [frozenset(g) for g in result]
assert frozenset({"eat","tea","ate"}) in result_sets
assert frozenset({"tan","nat"}) in result_sets
assert frozenset({"bat"}) in result_sets`,
      },
      {
        label: "No anagrams — each word is its own group",
        assertion: `result = group_anagrams(["abc", "def", "ghi"])
assert len(result) == 3
assert all(len(g) == 1 for g in result)`,
      },
      {
        label: "All words are anagrams of each other",
        assertion: `result = group_anagrams(["abc", "bca", "cab", "acb"])
assert len(result) == 1 and frozenset(result[0]) == frozenset(["abc","bca","cab","acb"])`,
        hidden: true,
      },
    ],
    hint: "Sort the characters of each string alphabetically — \`''.join(sorted(s))\` — and use that as the dict key. All anagrams of a word sort to the same canonical form.",
    solution: `def group_anagrams(strs: list) -> list:
    groups = {}
    for s in strs:
        key = tuple(sorted(s))
        if key not in groups:
            groups[key] = []
        groups[key].append(s)
    return list(groups.values())`,
  },
];

const LESSON_5_PROBLEMS: CodingProblem[] = [
  {
    id: "dsa-l5-code-1",
    title: "Quickselect — kth Smallest",
    difficulty: "medium",
    prompt: `Given a list of integers \`nums\` and an integer \`k\` (1-indexed), return the **k-th smallest** element in O(n) average time — without fully sorting the list.

**How it works:** pick a pivot, partition the list into elements smaller than, equal to, and greater than the pivot, then recurse only into the partition that contains position k. This is the same partition step as quicksort, but you only recurse on one side.

\`\`\`
kth_smallest([3, 1, 4, 1, 5, 9, 2, 6], k=3)  →  2
(sorted: 1 1 2 3 4 5 6 9, 3rd smallest is 2)
\`\`\``,
    starterCode: `def kth_smallest(nums: list, k: int) -> int:
    # You may modify a copy of nums freely
    arr = nums[:]
    return _select(arr, 0, len(arr) - 1, k - 1)  # convert to 0-indexed

def _select(arr, lo, hi, k):
    if lo == hi:
        return arr[lo]
    pivot_idx = _partition(arr, lo, hi)
    if k == pivot_idx:
        return arr[pivot_idx]
    elif k < pivot_idx:
        return _select(arr, lo, pivot_idx - 1, k)
    else:
        return _select(arr, pivot_idx + 1, hi, k)

def _partition(arr, lo, hi):
    pivot = arr[hi]  # choose last element as pivot
    i = lo           # i tracks where the next "less than pivot" element goes
    # TODO: scan arr[lo..hi-1]. If arr[j] <= pivot, swap arr[i] with arr[j] and advance i.
    # After the scan, swap the pivot (arr[hi]) into position i.
    # Return i.
    return i`,
    testCases: [
      {
        label: "k=1 returns the minimum",
        assertion: `assert kth_smallest([5, 3, 8, 1, 9], 1) == 1`,
      },
      {
        label: "k equals len returns the maximum",
        assertion: `assert kth_smallest([5, 3, 8, 1, 9], 5) == 9`,
      },
      {
        label: "k=3 in an 8-element list",
        assertion: `assert kth_smallest([3, 1, 4, 1, 5, 9, 2, 6], 3) == 2`,
      },
      {
        label: "Already sorted input",
        assertion: `assert kth_smallest([1, 2, 3, 4, 5], 2) == 2`,
      },
      {
        label: "All duplicate values",
        assertion: `assert kth_smallest([7, 7, 7, 7], 2) == 7`,
      },
      {
        label: "Single element",
        assertion: `assert kth_smallest([42], 1) == 42`,
        hidden: true,
      },
    ],
    hint: "In `_partition`, loop `j` from `lo` to `hi - 1`. Whenever `arr[j] <= pivot`, swap `arr[i]` and `arr[j]`, then increment `i`. After the loop, swap `arr[i]` and `arr[hi]` to place the pivot at its final sorted position. Return `i`.",
    solution: `def kth_smallest(nums: list, k: int) -> int:
    arr = nums[:]
    return _select(arr, 0, len(arr) - 1, k - 1)

def _select(arr, lo, hi, k):
    if lo == hi:
        return arr[lo]
    pivot_idx = _partition(arr, lo, hi)
    if k == pivot_idx:
        return arr[pivot_idx]
    elif k < pivot_idx:
        return _select(arr, lo, pivot_idx - 1, k)
    else:
        return _select(arr, pivot_idx + 1, hi, k)

def _partition(arr, lo, hi):
    pivot = arr[hi]
    i = lo
    for j in range(lo, hi):
        if arr[j] <= pivot:
            arr[i], arr[j] = arr[j], arr[i]
            i += 1
    arr[i], arr[hi] = arr[hi], arr[i]
    return i`,
  },
];

const LESSON_6_PROBLEMS: CodingProblem[] = [
  {
    id: "dsa-l6-code-1",
    title: "BFS Shortest Path",
    difficulty: "medium",
    prompt: `Given an unweighted directed graph as \`{node: [neighbors]}\` and two nodes \`start\` / \`end\`, return the shortest path as a list of nodes (including both endpoints). Return \`[]\` if no path exists.

BFS guarantees the shortest path in an unweighted graph because it explores all nodes at distance d before any node at distance d+1. Key insight: mark nodes visited when you ADD them to the queue, not when you pop them.`,
    starterCode: `from collections import deque

def shortest_path(graph: dict, start: str, end: str) -> list:
    if start == end:
        return [start]
    # TODO: BFS
    # - Queue stores full paths (lists), not just nodes
    # - Mark each node visited when it's first added to the queue
    # - Return the first complete path that reaches 'end'
    return []`,
    testCases: [
      {
        label: "start == end returns single-element path",
        assertion: `assert shortest_path({"A": []}, "A", "A") == ["A"]`,
      },
      {
        label: "Direct edge A → B",
        assertion: `assert shortest_path({"A": ["B"], "B": []}, "A", "B") == ["A", "B"]`,
      },
      {
        label: "A→C→F is shorter than A→B→E→F",
        assertion: `g = {"A": ["B", "C"], "B": ["D", "E"], "C": ["F"], "D": [], "E": ["F"], "F": []}
result = shortest_path(g, "A", "F")
assert result == ["A", "C", "F"], f"got {result}"`,
      },
      {
        label: "No path returns empty list",
        assertion: `g = {"A": ["B"], "B": [], "C": ["D"], "D": []}
assert shortest_path(g, "A", "D") == []`,
      },
      {
        label: "Cycle does not cause infinite loop",
        assertion: `g = {"A": ["B"], "B": ["C"], "C": ["A", "D"], "D": []}
assert shortest_path(g, "A", "D") == ["A", "B", "C", "D"]`,
        hidden: true,
      },
    ],
    hint: "Queue each full path as a list. When you find a neighbor equal to `end`, immediately return `path + [neighbor]`. Add neighbors to `visited` when enqueuing them, not when dequeuing — this prevents adding the same node via a longer route.",
    solution: `from collections import deque

def shortest_path(graph: dict, start: str, end: str) -> list:
    if start == end:
        return [start]
    visited = {start}
    queue = deque([[start]])
    while queue:
        path = queue.popleft()
        node = path[-1]
        for neighbor in graph.get(node, []):
            if neighbor == end:
                return path + [neighbor]
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(path + [neighbor])
    return []`,
  },
];

export const DSA_CODING_PROBLEMS: Record<string, CodingProblem[]> = {
  "dsa-lesson-1": LESSON_1_PROBLEMS,
  "dsa-lesson-2": LESSON_2_PROBLEMS,
  "dsa-lesson-3": LESSON_3_PROBLEMS,
  "dsa-lesson-4": LESSON_4_PROBLEMS,
  "dsa-lesson-5": LESSON_5_PROBLEMS,
  "dsa-lesson-6": LESSON_6_PROBLEMS,
};
