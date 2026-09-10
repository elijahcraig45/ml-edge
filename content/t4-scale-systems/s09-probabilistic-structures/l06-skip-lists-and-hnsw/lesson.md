---
id: t4/s09/l06
title: Skip lists, and HNSW as a skip list on a graph
tier: t4-scale-systems
stage: s09-probabilistic-structures
status: published
estimatedMinutes: 50
objectives:
  - Build a skip list and explain why a coin flip per node produces a balanced structure.
  - Show that expected search cost is O(log n), and say what "expected" is doing in that sentence.
  - Describe HNSW as a skip list generalised to a graph, and tune M, ef_construction and ef_search against recall.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"Randomised balance is worse than guaranteed balance.\"** Its worst case is worse and its expected case is identical, and the constant factors are better because there is no rebalancing. A red-black tree pays for its guarantee on every insert; a skip list pays a coin flip."
  - "**\"A skip list can degenerate into a linked list.\"** It can, with probability about $2^{-n}$ for $n$ nodes — smaller than the chance of a cosmic-ray bit flip in the same run. The distinction that matters is that the randomness comes from *your* coin flips, not from the input, so an adversary who controls the data cannot force the bad case."
  - "**\"An approximate index is just a faster index.\"** A B-tree index never changes the answer — drop it and the query returns the same rows, slower. A vector index changes the result set. The rows it returns are a function of the index parameters, which means the index is part of the query's meaning, not an implementation detail underneath it."
  - "**\"Higher ef_search always finds the true neighbours eventually.\"** It raises recall and it converges to a full scan's cost as it does. Recall is a dial calibrated against latency, and both ends of it are choices someone made."
masteryChecklist:
  - I can write skip-list search from memory and explain the descend-then-advance loop.
  - I can state the expected number of levels and the expected search cost, and sketch why.
  - I can say precisely what an ANN index gives up compared to a B-tree, and why that is acceptable for embeddings.
runtimes:
  - engine: python
---

A balanced tree is a promise enforced by machinery: rotations, colour bits,
invariants checked on every insert. A skip list makes the same promise using a
coin.

Getting to $O(\log n)$ by flipping coins would be a curiosity, except that the
same construction, generalised from a list to a graph, is HNSW — the index
underneath Faiss, pgvector, Qdrant, Weaviate, Milvus, Lucene, and every vector
search product. Learn one and you have the other.

## The structure

Start with a sorted linked list. Searching it is $O(n)$ because every step
advances by one.

Now add express lanes. Each node gets a random **height**: level 1 always,
level 2 with probability $\tfrac12$, level 3 with probability $\tfrac14$, and so
on. A node of height $h$ appears in the bottom $h$ linked lists.

Search descends: start at the top level of the head, advance while the next node
is smaller than your target, then drop a level and repeat. Every advance covers
about twice as much ground as an advance one level down.

```python runnable id=skiplist-shape
import random

class Node:
    __slots__ = ("value", "forward")
    def __init__(self, value, height):
        self.value, self.forward = value, [None] * height

MAX_HEIGHT = 6

def random_height(p=0.5):
    h = 1
    while h < MAX_HEIGHT and random.random() < p:
        h += 1
    return h

random.seed(4)
head = Node(None, MAX_HEIGHT)
for value in range(1, 33):
    node = Node(value, random_height())
    prev = head
    for level in range(MAX_HEIGHT - 1, -1, -1):
        while prev.forward[level] is not None and prev.forward[level].value < value:
            prev = prev.forward[level]
        if level < len(node.forward):
            node.forward[level] = prev.forward[level]
            prev.forward[level] = node

for level in range(MAX_HEIGHT - 1, -1, -1):
    row, n = [], head.forward[level]
    while n is not None:
        row.append(n.value)
        n = n.forward[level]
    print(f"L{level}: " + " ".join(f"{v:>3}" for v in row))
```

Read the output bottom-up. `L0` holds everything in sorted order. Each level up
holds roughly half of the one below, chosen by coin flip rather than by
position — and that is the only difference from a perfect skip list, where
every second node is promoted.

:::insight{title="Why random beats regular"}
A perfectly regular skip list — promote every second node — is a fine static
structure and a disaster under insertion: inserting one element in the middle
shifts the parity of everything after it, and repairing the levels is $O(n)$.
Random heights are *insert-local*. A node's height is decided once, from a coin
flip, and never has to change because of what its neighbours do. That is the
same reason HNSW can be built incrementally while a k-d tree cannot.
:::

## Search, in one loop

```python runnable id=skiplist-search
import random

class Node:
    __slots__ = ("value", "forward")
    def __init__(self, value, height):
        self.value, self.forward = value, [None] * height

class SkipList:
    MAX_HEIGHT = 16

    def __init__(self):
        self.head = Node(None, self.MAX_HEIGHT)

    def _predecessors(self, value):
        """For each level, the last node whose value is < the target."""
        update, node = [None] * self.MAX_HEIGHT, self.head
        for level in range(self.MAX_HEIGHT - 1, -1, -1):
            while node.forward[level] is not None and node.forward[level].value < value:
                node = node.forward[level]
            update[level] = node
        return update

    def insert(self, value):
        update = self._predecessors(value)
        nxt = update[0].forward[0]
        if nxt is not None and nxt.value == value:
            return False
        height = 1
        while height < self.MAX_HEIGHT and random.random() < 0.5:
            height += 1
        node = Node(value, height)
        for level in range(height):
            node.forward[level] = update[level].forward[level]
            update[level].forward[level] = node
        return True

    def __contains__(self, value):
        nxt = self._predecessors(value)[0].forward[0]
        return nxt is not None and nxt.value == value

random.seed(0)
sl = SkipList()
values = list(range(500))
random.shuffle(values)
for v in values:
    sl.insert(v)

heights = []
node = sl.head.forward[0]
while node is not None:
    heights.append(len(node.forward))
    node = node.forward[0]

print(f"inserted {len(heights)} nodes, tallest is {max(heights)}")
print(f"average height {sum(heights) / len(heights):.3f}  (theory: 1/(1-p) = 2)\n")
for level in range(1, 7):
    frac = sum(1 for h in heights if h >= level) / len(heights)
    print(f"  height >= {level}: {frac:.3f}   theory {0.5 ** (level - 1):.4f}")
```

The measured fractions sit on the theoretical curve — that is a geometric
distribution appearing from nothing but repeated coin flips. Average height is
2, so a skip list costs about **two pointers per node**, against three (two
children and a parent) plus a colour bit for a red-black tree.

The `_predecessors` loop is the piece to memorise. *Advance while the next node
is still smaller; when it is not, drop a level.* Search and insert are the same
traversal; insert also splices.

:::checkpoint{id=cp-skiplist-height rubric="a node's height is drawn once from a geometric distribution,it never changes when neighbours are inserted,so there is no rebalancing"}
What would go wrong if a node's height were recomputed each time its neighbours
changed, so that exactly every second node sat on level 2?
:::

::::track{depth=proof}
## The two probability arguments

:::proof{title="Expected height, and the maximum"}
A node's height $H$ satisfies $\Pr[H \geq \ell] = p^{\ell-1}$ — it needs
$\ell - 1$ consecutive successes. So $H$ is geometric with

$$\mathbb{E}[H] = \sum_{\ell \geq 1} \Pr[H \geq \ell] = \sum_{\ell \geq 1} p^{\ell-1} = \frac{1}{1-p} = 2 \text{ at } p = \tfrac12 .$$

Total space is therefore $2n$ pointers in expectation.

For the tallest node among $n$, take a union bound: the probability that *any*
node reaches level $\ell$ is at most $n p^{\ell - 1}$. Setting
$\ell = \log_{1/p} n + c$ makes that at most $p^{c}$, so with probability at
least $1 - p^{c}$ the structure is no taller than $\log_2 n + c$ levels. The
height is $O(\log n)$ with high probability, not merely on average.
:::

:::proof{title="Theorem: expected search cost is O(log n)"}
Analyse the search path **backwards**, from the found node to the head. This is
the standard trick, and it is what makes the argument short.

Walk the path in reverse. At each step you are at some node, and you have just
arrived either by having dropped down a level (a *down* move, seen in reverse)
or by having advanced along one (a *left* move). Which one it was is determined
by whether the current node's height exceeds the current level — and that is a
fresh coin flip, independent of everything already walked, because a node's
height is drawn independently and the search has not yet examined it.

So the reversed path is a sequence of independent trials: with probability $p$
you climb a level, with probability $1-p$ you step left. The number of left
steps before each climb is geometric with mean $\frac{1-p}{p}$, which is 1 at
$p = \tfrac12$.

You need to climb $O(\log_{1/p} n)$ levels to reach the top, by the height
result above. Each climb costs $1 + \frac{1-p}{p}$ steps in expectation.
Therefore

$$
\mathbb{E}[\text{search cost}] = O\!\left(\frac{1}{p}\log_{1/p} n\right)
= O(\log n),
$$

minimised over $p$ near $1/e$, though $p = \tfrac12$ is used everywhere because
it makes the coin flip a single random bit and the constant is barely worse.
$\blacksquare$
:::

The clause worth underlining is *independent of everything already walked*.
The randomness lives in the structure's own coin flips, not in the input
distribution. A quicksort with a fixed pivot rule can be forced quadratic by an
adversary who chooses the input; a skip list cannot be forced tall by any
input at all, because the input never touches the coins.

The cost of that is a real, if astronomically unlikely, bad case: all $n$ nodes
landing at height 1 has probability $2^{-n}$. For $n = 1000$ that is
$10^{-301}$.
::::

## HNSW is this, on a graph

Here is the generalisation, and it is smaller than it looks.

| Skip list | HNSW |
| --- | --- |
| a sorted linked list | a proximity graph — each node linked to its near neighbours |
| next-smaller pointer | edges to $M$ approximate nearest neighbours |
| node height from a coin flip | node layer from a coin flip |
| descend a level, then advance | descend a layer, then greedily walk toward the query |
| target found exactly | search stops at a *local* minimum of distance |

A skip list works on one dimension, where "next" is unambiguous — a value has
exactly one successor. Vectors in 768 dimensions have no successor. So the
single "next" pointer becomes $M$ edges to nearby points, and "advance while the
next is smaller" becomes "move to whichever neighbour is closer to the query,
keeping a beam of the best $ef$ candidates."

Everything else transfers unchanged. Layer assignment is the same geometric coin
flip. Search is the same top-down descent, using each layer to land near the
right region before dropping into the denser one below. Layer 0 holds every
point, exactly as `L0` holds every value.

And the change from "list" to "graph" is precisely where exactness dies. On a
sorted list, "advance while smaller" cannot walk past the answer. On a graph,
you can arrive at a node that is closer to the query than all of its neighbours
and still not be the nearest point overall. Greedy search stops there and
returns the wrong answer, and no amount of care in the implementation prevents
it — the structure has no way to know.

```python runnable id=greedy-local-minimum
import heapq

def distance(a, b):
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5

def search(graph, points, entry, query, ef):
    d = distance(points[entry], query)
    visited, candidates, results = {entry}, [(d, entry)], [(-d, entry)]
    while candidates:
        d_c, c = heapq.heappop(candidates)
        if d_c > -results[0][0] and len(results) >= ef:
            break
        for n in graph[c]:
            if n in visited:
                continue
            visited.add(n)
            d_n = distance(points[n], query)
            if len(results) < ef or d_n < -results[0][0]:
                heapq.heappush(candidates, (d_n, n))
                heapq.heappush(results, (-d_n, n))
                if len(results) > ef:
                    heapq.heappop(results)
    return [n for _, n in sorted((-nd, n) for nd, n in results)]

# A chain along the x-axis. The query is at the origin; "N" is the true nearest.
points = {"E": (10.0, 0.0), "A": (5.0, 0.0), "B": (6.0, 0.0),
          "N": (0.5, 0.0), "F": (20.0, 0.0)}
graph = {"E": ["A", "F"], "A": ["E", "B"], "B": ["A", "N"], "N": ["B"], "F": ["E"]}

for ef in (1, 2, 3):
    found = search(graph, points, entry="E", query=(0.0, 0.0), ef=ef)
    print(f"ef={ef}: {found}   nearest found? {found[0] == 'N'}")
```

With `ef=1` the search reaches `A`, finds both of its neighbours farther from
the query, and stops. `A` is a local minimum. `N` — five times closer — is one
hop past `B`, and the beam was never wide enough to keep `B` alive long enough
to look. Widen the beam to 2 and it finds it.

:::warning{title="An ANN index changes query semantics, not just speed"}
This is the difference that matters, and it is not a performance footnote.

Drop a B-tree index and every query returns the same rows, more slowly. The
index is an implementation detail: it can be added, removed, or rebuilt without
anyone auditing the results.

Drop a vector index — or rebuild it with a different `M` — and the query returns
**different rows**. `ORDER BY embedding <-> $1 LIMIT 10` under an HNSW index is
not "the ten nearest"; it is "ten points the index found, which are usually the
nearest". Recall is typically 95–99%, meaning one result in twenty or a hundred
is not what an exact scan would have returned.

Consequences people learn the hard way: your test suite cannot assert exact
neighbour ids; changing `ef_search` changes production output with no schema
migration and no code change; and "the search got worse after we reindexed" is a
real bug report with a real cause.
:::

## The three parameters

**$M$** — edges per node per layer. More edges make the graph better connected,
so greedy search is less likely to get stuck, and recall goes up. Memory and
build time go up with it. Typical: 16 to 48; 16 for 128-dimensional vectors, 48
for high-dimensional embeddings where local minima are more common.

**`ef_construction`** — the beam width used *while inserting*. It decides how
good each new node's $M$ neighbours are. Raising it makes a better graph at
higher build cost, and it is baked in permanently: you cannot improve a graph
built with a low `ef_construction` without rebuilding. Typical: 64 to 400.

**`ef_search`** — the beam width at query time, the only one you can change per
query. It trades recall against latency directly, and it must be at least $k$.

The way to hold this: **`M` and `ef_construction` are properties of the index;
`ef_search` is a property of the query.** Two of them cost you a rebuild, one of
them costs you a config change.

::::track{depth=systems}
## Tuning HNSW without guessing

Every parameter above is a point on a recall/latency curve, and the only honest
way to choose is to measure the curve on your own vectors.

**Build the ground truth once.** Take 1,000 held-out query vectors, run an exact
brute-force k-NN, and store the results. That set is now your oracle, and it
costs one expensive batch job. Without it you are tuning against nothing.

**Then sweep `ef_search` and plot recall@k against p99 latency.** The curve is
concave: recall climbs steeply and then flattens, while latency keeps rising
roughly linearly. The interesting region is the knee. Going from 95% to 99%
recall often costs 3–5× the latency, and going from 99% to 99.9% can cost
another 5×.

The measurement that changes the conversation is expressed in the product's own
terms. "At `ef_search=64` we return a different top-10 for about one query in
twenty, and p99 is 8ms; at 256 it's one in five hundred, and p99 is 35ms." Now
someone can make a decision. "Recall is 0.95" gives them nothing to decide with.

**Things that surprise teams:**

- **Recall is not uniform across queries.** It is much worse for queries in
  sparse regions of the embedding space — which are frequently the rare,
  interesting queries you care most about. Report the distribution, not the
  mean.
- **Deletions degrade the graph.** HNSW has no real delete; implementations
  tombstone the node and leave its edges in place as routing hops. A collection
  with heavy churn slowly loses recall until it is rebuilt, and the metric never
  says so.
- **Filtered search is the hard case.** "Nearest neighbours *where tenant_id =
  7*" cannot be answered by walking the graph and filtering afterwards — the
  beam fills with rejected nodes and recall collapses. Engines answer this with
  filtered graph traversal, or by partitioning the index per tenant, and the
  choice has large capacity consequences.
- **The index is often larger than the vectors.** At $M = 32$, each node holds
  about 64 neighbour ids at layer 0 alone. For 128-dimensional float32 vectors
  that is comparable to the data itself, and it must be resident.

The alternative family is IVF (inverted file with coarse quantisation): cluster
the vectors, search the `nprobe` nearest clusters. Smaller index, much faster
build, worse recall at the same latency, and it degrades more gracefully under
filtering because clusters can be intersected with the filter. HNSW is the
default because it wins the recall/latency curve; IVF and its product-quantised
variants win when memory is the binding constraint.
::::

:::exercise{ref=skip-list}
:::

:::exercise{ref=greedy-graph-search}
:::

:::quiz{id=quiz-l06 passing=2}
- id: q1
  prompt: "Why is a skip list's O(log n) search cost robust to adversarial input, when quicksort's is not?"
  options:
    - "It is not — a sorted input makes a skip list degenerate."
    - "The randomness comes from the structure's own coin flips, which the input cannot influence."
    - "Skip lists rebalance after each insert, so any imbalance is corrected."
    - "Because the maximum height is capped at 16."
  answerIndex: 1
  explanation: >-
    Node heights are drawn from an RNG the caller never touches, so no ordering
    or choice of values makes tall nodes rarer. Quicksort with a fixed pivot rule
    reads its randomness from the input's order, which an adversary controls.
    Skip lists never rebalance — that is the point — and the height cap is a
    memory bound, not a correctness one.
- id: q2
  prompt: "What exactly does HNSW change about a skip list to make it work on vectors?"
  options:
    - "It replaces coin-flip layer assignment with a deterministic clustering."
    - "It replaces the single 'next' pointer with M edges to nearby points, because vectors have no unique successor."
    - "It removes the layers and searches the full graph."
    - "It stores the vectors sorted by their first coordinate."
  answerIndex: 1
  explanation: >-
    Layer assignment stays a geometric coin flip, and the top-down descent stays
    identical. What changes is the bottom structure: a sorted list has one
    successor per element, and a set of vectors in high dimensions has none, so
    'next' becomes M proximity edges and 'advance while smaller' becomes a
    greedy beam walk. That substitution is also what introduces local minima, and
    therefore wrong answers.
- id: q3
  prompt: "Your team drops and rebuilds a pgvector HNSW index with a different M. What should you check that you would not check after rebuilding a B-tree?"
  options:
    - "That the index size did not grow."
    - "That query results still contain the same rows — recall changed, so the returned neighbours can differ."
    - "That the query planner still uses the index."
    - "Nothing; index rebuilds are transparent."
  answerIndex: 1
  explanation: >-
    A B-tree rebuild cannot change which rows a query returns, only how fast it
    returns them. An HNSW rebuild changes the graph, and the graph determines
    which neighbours greedy search finds. The result set is a function of the
    index parameters, which makes the rebuild a semantic change that belongs in
    a changelog rather than in a maintenance window.
:::
