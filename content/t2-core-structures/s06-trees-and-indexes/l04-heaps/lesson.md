---
id: t2/s06/l04
title: Heaps, and the tree that is really an array
tier: t2-core-structures
stage: s06-trees-and-indexes
status: published
estimatedMinutes: 50
objectives:
  - Map a complete binary tree onto a flat array and compute parent and child indices arithmetically.
  - Implement sift-up and sift-down, and use them for push, pop, and bottom-up heapify.
  - Choose the right heap pattern for top-k, merge-k, and running median, and say what each costs.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"A heap is sorted.\"** A heap guarantees one comparison: every parent is $\\le$ both of its children. Siblings are unordered, and a node three levels down can be smaller than a node one level down in another subtree. Printing the array of a valid heap gives you something that looks almost sorted and is not."
  - "**\"You can search a heap in $O(\\log n)$.\"** You cannot. There is no rule that tells you which child to descend into, so searching for an arbitrary value costs $O(n)$. The heap gives up ordered search — the thing a BST is for — and buys a cheaper minimum in exchange."
  - "**\"Building a heap costs $O(n \\log n)$, because each of the $n$ inserts costs $\\log n$.\"** That is the cost of building it by repeated insertion, in the worst case. Building it bottom-up with sift-down is $O(n)$, and the reason is that almost every node is near the bottom, where sift-down has almost nowhere to go."
masteryChecklist:
  - Given an array, I can say whether it is a valid min-heap and name the first index that breaks it.
  - I can write sift-down from memory and explain why pop moves the last element to the root.
  - Given "the k largest of a stream", I can say which heap to use, which way it is ordered, and why it is not the obvious one.
runtimes:
  - engine: python
  - engine: duckdb
    datasetId: package-registry
---

You need the smallest item, then the next smallest, while new items keep
arriving. A sorted list answers instantly and costs $O(n)$ per insert. A
balanced BST costs $O(\log n)$ for both and gives you far more than you asked
for — full ordered search, ranges, predecessors — paid for in pointers and cache
misses.

A heap answers exactly the question and nothing more, in $O(\log n)$ per
update, with **no pointers at all**.

## The array is the tree

A heap is a *complete* binary tree: every level is full except possibly the
last, which fills left to right. Completeness is what removes the pointers,
because a tree with no gaps can be laid out breadth-first in an array and the
links become arithmetic.

$$
\mathrm{left}(i) = 2i+1, \qquad \mathrm{right}(i) = 2i+2,
\qquad \mathrm{parent}(i) = \left\lfloor \frac{i-1}{2} \right\rfloor
$$

```python runnable id=array-as-tree
heap = [1, 3, 6, 5, 9, 8]
#            1
#          /   \
#         3     6
#        / \   /
#       5   9 8

for i, value in enumerate(heap):
    left, right = 2 * i + 1, 2 * i + 2
    children = [heap[c] for c in (left, right) if c < len(heap)]
    print(f"index {i} holds {value}; children {children}")
```

The heap property is one line: **every parent is less than or equal to both of
its children.** That is much weaker than the BST invariant, and the weakness is
the feature. Nothing relates 3 and 6 to each other, so there is far less to
maintain — and correspondingly less you can ask. The minimum is at index 0. Any
other question requires a scan.

:::pitfall{title="A heap is not a sorted array"}
`[1, 3, 6, 5, 9, 8]` is a valid min-heap and is not sorted. The temptation to
read the array left to right as "roughly ordered" produces confident, wrong
answers about what position $k$ means. If you want sorted output, pop
repeatedly — that is heapsort, and it costs $O(n \log n)$ because you are now
asking a harder question.
:::

## Two operations, and everything is built from them

Every heap update breaks the property in exactly one place and then walks to
repair it.

**Sift up** — a new element goes at the end, where the array has room, and
climbs while it is smaller than its parent.

**Sift down** — the root is removed, the *last* element is moved into the hole
so the tree stays complete, and it descends while it is larger than its smaller
child.

```python runnable id=sift
def sift_up(heap, i):
    while i > 0:
        parent = (i - 1) // 2
        if heap[i] < heap[parent]:
            heap[i], heap[parent] = heap[parent], heap[i]
            i = parent
        else:
            return

def sift_down(heap, i):
    n = len(heap)
    while True:
        left, right, smallest = 2 * i + 1, 2 * i + 2, i
        if left < n and heap[left] < heap[smallest]:
            smallest = left
        if right < n and heap[right] < heap[smallest]:
            smallest = right
        if smallest == i:
            return
        heap[i], heap[smallest] = heap[smallest], heap[i]
        i = smallest

def push(heap, value):
    heap.append(value)
    sift_up(heap, len(heap) - 1)

def pop(heap):
    last = heap.pop()
    if not heap:
        return last
    top, heap[0] = heap[0], last
    sift_down(heap, 0)
    return top

heap = []
for value in [5, 3, 8, 1, 9, 2]:
    push(heap, value)
print("heap array:", heap)
print("popped    :", [pop(heap) for _ in range(6)])
```

The detail that is easy to get wrong: `sift_down` compares against the
**smaller** of the two children. Swapping with the larger one puts a value above
its sibling that is bigger than it, which breaks the property one level down —
and the loop then walks away from the damage.

:::checkpoint{id=cp-siftdown rubric="the last element fills the hole to keep the tree complete,it then sifts down,you must swap with the smaller child or the property breaks"}
Why does `pop` move the *last* element to the root instead of promoting the
smaller child, and which child does the resulting sift-down swap with?
:::

## Building a heap costs $O(n)$, not $O(n \log n)$

Given $n$ values up front, you have two options: push them one at a time, or
dump them into an array and call `sift_down` on every internal node, working
from the bottom up. Both produce a valid heap. They do not cost the same.

```python runnable id=heapify-cost
def build_by_pushing(values):
    heap, swaps = [], 0
    for value in values:
        heap.append(value)
        i = len(heap) - 1
        while i > 0:
            parent = (i - 1) // 2
            if heap[i] < heap[parent]:
                heap[i], heap[parent] = heap[parent], heap[i]
                i, swaps = parent, swaps + 1
            else:
                break
    return heap, swaps

def build_bottom_up(values):
    heap, swaps, n = list(values), 0, len(values)
    for start in range(n // 2 - 1, -1, -1):     # every internal node, deepest first
        i = start
        while True:
            left, right, smallest = 2 * i + 1, 2 * i + 2, i
            if left < n and heap[left] < heap[smallest]:
                smallest = left
            if right < n and heap[right] < heap[smallest]:
                smallest = right
            if smallest == i:
                break
            heap[i], heap[smallest] = heap[smallest], heap[i]
            i, swaps = smallest, swaps + 1
    return heap, swaps

import math

n = 60_000
descending = list(range(n, 0, -1))       # worst case for repeated pushing

_, push_swaps = build_by_pushing(descending)
_, bottom_up_swaps = build_bottom_up(descending)
print(f"repeated push: {push_swaps:>8,} swaps")
print(f"bottom-up    : {bottom_up_swaps:>8,} swaps")
print(f"for scale: n = {n:,} and n*log2(n) = {int(n * math.log2(n)):,}")
```

Roughly 834,000 swaps against 60,000 — a factor of 14, and it grows with $n$.
Bottom-up did **less than one swap per element**, which is the whole shape of
the result: the array has $n/2$ leaves that need no work at all, $n/4$ nodes one
level up that can move at most one step, and only one node that can travel the
full height. Summing the cost over every node, weighted by how many nodes sit
at each height, is what turns that observation into the $O(n)$ bound.

Descending input is the worst case for pushing, not a stunt: it is what you get
from a reverse-sorted file, a descending index scan, or a `ORDER BY ... DESC`
feeding a load.

## The `heapq` pattern family

Python's `heapq` is a min-heap over a plain list — the same array, the same two
operations, written in C. Three patterns cover most of what heaps are used for.
Two are below; the third — a running median from two heaps facing each other —
is the second exercise.

```python runnable id=heapq-patterns
import heapq

# 1. Top-k. To keep the k LARGEST, use a MIN-heap of size k: the smallest of
#    your current winners sits at index 0, ready to be evicted.
def top_k(values, k):
    heap = []
    for value in values:
        if len(heap) < k:
            heapq.heappush(heap, value)
        elif value > heap[0]:
            heapq.heapreplace(heap, value)     # pop-then-push, one sift
    return sorted(heap, reverse=True)

# 2. Merge k sorted lists. The heap holds one candidate per list.
def merge_sorted(lists):
    heap = [(lst[0], i, 0) for i, lst in enumerate(lists) if lst]
    heapq.heapify(heap)
    out = []
    while heap:
        value, which, pos = heapq.heappop(heap)
        out.append(value)
        if pos + 1 < len(lists[which]):
            heapq.heappush(heap, (lists[which][pos + 1], which, pos + 1))
    return out

print("top 3   :", top_k([5, 1, 9, 3, 7, 8, 2], 3))
print("merged  :", merge_sorted([[1, 4, 9], [2, 3], [0, 8, 10]]))
```

Top-k with a min-heap is the twist people get backwards. You want the largest
values, so you keep a heap whose root is the *smallest survivor*, because the
only question you ever ask is "is this newcomer better than the worst thing I
have kept?" Cost: $O(n \log k)$ time and $O(k)$ memory, against $O(n \log n)$
and $O(n)$ for sorting everything. When $k$ is 10 and $n$ is a billion, that is
the difference between a query that runs and one that does not.

Merging $k$ sorted lists totalling $m$ elements costs $O(m \log k)$. The heap
never holds more than $k$ items, one per input — which is why this works on
streams that do not fit in memory, and why it is how an external merge sort and
an LSM-tree compaction both finish their work.

The third pattern splits the data instead of bounding it: a max-heap of the
lower half and a min-heap of the upper half, kept the same size, put the median
at one of the two roots. It is the standard answer to any question about the
middle of a stream, and it is the exercise below.

:::insight{title="The SQL counterpart"}
`ORDER BY downloads DESC LIMIT 3` is top-k, and the engine says so. A plan for
that query contains a **TOP_N** operator instead of a sort — a bounded heap of
three rows that the whole table streams past. Remove the `LIMIT` and the same
query plans an `ORDER_BY` node that must materialise and sort every row. You
will see both in the exercise below, and the vocabulary comes back in lesson 7.
:::

::::track{depth=proof}
## Why bottom-up heapify is $O(n)$

The claim that looks false on sight: $n$ calls to `sift_down`, each apparently
costing up to $\log n$, add up to $O(n)$ rather than $O(n\log n)$.

**The observation.** `sift_down` on a node does work proportional to that node's
*height above the leaves*, not to the tree's height. A leaf has height 0 and
costs nothing. And a heap is overwhelmingly leaves.

**Counting nodes by height.** In a complete binary tree of $n$ nodes, the number
of nodes at height $h$ is at most

$$n_h \;\le\; \left\lceil \frac{n}{2^{\,h+1}} \right\rceil.$$

Half the nodes are leaves ($h=0$), a quarter have $h=1$, and so on. The
expensive nodes are rare in exactly the proportion that makes them affordable.

**The sum.** Sift-down at height $h$ costs at most $c\,h$ for a constant $c$, so
the total is

$$
T(n) \;\le\; \sum_{h=0}^{\lfloor \log_2 n \rfloor} \frac{n}{2^{\,h+1}}\, c\,h
\;=\; \frac{cn}{2} \sum_{h=0}^{\lfloor \log_2 n \rfloor} \frac{h}{2^{\,h}}
\;\le\; \frac{cn}{2} \sum_{h=0}^{\infty} \frac{h}{2^{\,h}}.
$$

**Evaluating the series.** Start from the geometric series
$\sum_{h\ge 0} x^h = \frac{1}{1-x}$ for $|x|<1$. Differentiate both sides with
respect to $x$:

$$
\sum_{h\ge 1} h\,x^{h-1} = \frac{1}{(1-x)^2}
\quad\Longrightarrow\quad
\sum_{h\ge 0} h\,x^{h} = \frac{x}{(1-x)^2}.
$$

Substitute $x = \tfrac12$:

$$\sum_{h=0}^{\infty} \frac{h}{2^{\,h}} = \frac{1/2}{(1/2)^2} = 2.$$

**Conclusion.**

$$T(n) \;\le\; \frac{cn}{2}\cdot 2 \;=\; cn \;=\; O(n).$$

The bound is not merely asymptotic decoration: the constant is small. The
measurement above did 59,989 swaps for 60,000 elements — under one per element,
exactly as a bound of the form $cn$ with small $c$ predicts.

**Where the intuition goes wrong.** The $O(n\log n)$ guess implicitly assumes
every node can travel the full height. Only the root can. Building by repeated
insertion has the opposite profile — a new element enters at the *bottom* and
can climb the whole way — which is why that direction really is $\Theta(n\log
n)$ in the worst case, and why the two algorithms differ despite doing the same
number of sift operations.
::::

::::track{depth=interview}
## Recognising this in an interview

The trigger is any problem that needs **the extreme element, repeatedly, from
something that keeps changing**. Three phrasings and their answers:

- **"Find the k largest / k most frequent / k closest."** A min-heap of size
  $k$. Say the size bound out loud — "$O(n \log k)$ time, $O(k)$ space" — and
  say why it beats sorting: you never hold more than $k$ items, so it works on a
  stream. Expect the follow-up "what if $k$ is close to $n$?" The answer is that
  sorting wins there, because $\log k$ has stopped being small.
- **"Merge k sorted lists / streams."** A heap of $k$ candidates, one per list.
  $O(m \log k)$. This is external merge sort's merge phase, and saying so is
  worth more than the code.
- **"Median of a stream" or "median of a sliding window."** Two heaps: a
  max-heap of the lower half, a min-heap of the upper half, kept within one
  element of each other in size. The median is at one root, or the average of
  the two roots.

The general recognition rule is worth memorising as a sentence: **if the problem
needs a total order you get a sort or a BST; if it only ever needs the extreme,
you get a heap.** Heaps are cheaper precisely because they answer less.

:::interview{title="The trap in the top-k question"}
Almost everyone reaches for a max-heap when asked for the $k$ largest, because
"largest" and "max-heap" share a word. A max-heap of everything is $O(n)$ space
and answers the wrong question — it tells you the biggest item, not the
threshold for staying in the top $k$. You want the min-heap, because the only
comparison you ever make is against the *weakest survivor*. Getting this
backwards in an interview is common enough that getting it right is a signal.
:::
::::

:::exercise{ref=min-heap}
:::

:::exercise{ref=running-median}
:::

:::exercise{ref=top-three-downloads}
:::

:::quiz{id=quiz-l04 passing=2}
- id: q1
  prompt: "Is `[1, 3, 6, 5, 9, 8]` a valid min-heap?"
  options:
    - "No — 6 comes before 5, so the array is not sorted."
    - "Yes — every parent is less than or equal to both of its children, which is the only requirement."
    - "No — a heap must be a complete binary search tree."
    - "Only if the array length is a power of two minus one."
  answerIndex: 1
  explanation: >-
    Index 0 holds 1 with children 3 and 6; index 1 holds 3 with children 5 and
    9; index 2 holds 6 with child 8. Every parent-child pair is ordered, and
    that is the whole invariant. Siblings are unrelated, so the array is not
    sorted and is not required to be.
- id: q2
  prompt: "You need the 10 largest values from a stream of a billion numbers. What do you keep?"
  options:
    - "A max-heap of all billion values, then pop ten times."
    - "A min-heap holding at most 10 values, evicting its root whenever a larger value arrives."
    - "A sorted list of the 10 best, inserting each new value in its correct place."
    - "A max-heap of 10 values, evicting its root whenever a larger value arrives."
  answerIndex: 1
  explanation: >-
    The only question you ever ask is "is this newcomer better than the worst
    value I am keeping?", so the worst survivor must be instantly available —
    that is the root of a *min*-heap. It costs O(n log k) time and O(k) space.
    A max-heap of ten puts the *best* value at the root, which is the one value
    you never need to look at. The sorted-list version is correct but pays O(k)
    per insertion instead of O(log k).
- id: q3
  prompt: "Why is bottom-up heapify O(n) rather than O(n log n)?"
  options:
    - "Because sift-down is O(1) on a complete tree."
    - "Because half the nodes are leaves that cost nothing, and the cost per node falls faster than the node count rises — the series sum h/2^h converges to 2."
    - "Because the array is already partially sorted before heapify runs."
    - "Because it does n/2 calls instead of n, which removes the log factor."
  answerIndex: 1
  explanation: >-
    Sift-down costs work proportional to a node's height above the leaves, and
    at most n/2^(h+1) nodes have height h. The total is n/2 times the sum of
    h/2^h, which converges to 2 — so the whole build is bounded by a constant
    times n. Halving the number of calls would only remove a factor of two, not
    a logarithm.
:::
