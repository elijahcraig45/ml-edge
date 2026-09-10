---
id: t3/s08/l05
title: Intervals, subsets, and graphs
tier: t3-algorithms
stage: s08-dynamic-programming
status: published
estimatedMinutes: 50
objectives:
  - Recognise an interval DP by its state and fill its table in the only order that works.
  - Write a bitmask DP over subsets, and cost it honestly before running it.
  - Evaluate a DP over a tree or a DAG, and say what acyclicity is buying you.
  - Express a DAG dynamic program as a recursive CTE, and say precisely what a recursive CTE cannot do that a memo can.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"A recursive CTE is memoized recursion in SQL.\"** It is a fixpoint iteration. Each round applies the recursive term to the rows produced by the previous round; there is no keyed store of best-known values, so nothing is pruned. On a DAG it enumerates paths, not states, and the row count grows with the number of paths rather than with the number of vertices."
  - "**\"Bitmask DP is exponential, so it is useless.\"** $2^n n^2$ against $n!$ is the difference between 18 cities in a second and 18 cities in ten million years. Exponential-but-smaller is a real and frequently deployed win — your database's query planner runs one every time you write a join."
  - "**\"Longest path is just shortest path with the signs flipped.\"** On a DAG, yes. On a graph with cycles, no: negating the weights creates negative cycles, and the underlying problem is NP-hard. Acyclicity is not a convenience here, it is the entire reason the DP is well-founded."
  - "**\"Interval DP is just 2-D DP with a triangular table.\"** The shape of the table is a consequence, not the idea. What makes it a different family is that the transition chooses a *split point* inside the state rather than stepping to an adjacent state, which is why the evaluation order is by interval length and why the cost picks up an extra factor of n."
masteryChecklist:
  - Given a problem, I can tell whether its state is a prefix, an interval, or a subset, and justify the choice.
  - I can write Held-Karp from the state definition and state its time and space cost.
  - I can turn a DP over a DAG into a recursive CTE and explain why the row count is not the state count.
  - I can give one DP that is a window function, one that is a recursive CTE, and one that needs a host-language loop, and say what separates them.
runtimes:
  - engine: python
  - engine: duckdb
    datasetId: package-registry
---

Prefixes and resources gave you Lessons 3 and 4. Three more state shapes cover
almost everything else: an **interval**, a **subset**, and a **vertex in a
graph**. Each brings its own evaluation order, and one of them is the reason
your database sometimes gives up on planning a join.

## Intervals: when the transition is a split

Merging two batches of download records costs the number of records in the
result. Merge ten daily batches into one, but only ever merging *adjacent*
batches. Minimise the total.

With $a_i$ the batch sizes and $C(i,j)$ the cheapest way to reduce the batches
$i \dots j$ to a single batch:

$$
C(i, j) \;=\; \min_{i \le k < j}\big(C(i, k) + C(k+1, j)\big) \;+\; \sum_{t=i}^{j} a_t,
\qquad C(i,i) = 0
$$

The trailing sum is the final merge — whatever order you used inside, the last
step combines two pieces whose sizes add up to the whole segment.

```python runnable id=interval-merge
import heapq
from functools import lru_cache

batches = [812, 892, 972, 1052, 692, 772, 852, 932, 1012, 1092]   # memoize, ten days

prefix = [0]
for size in batches:
    prefix.append(prefix[-1] + size)

@lru_cache(maxsize=None)
def cost(i, j):
    if i == j:
        return 0
    span = prefix[j + 1] - prefix[i]
    return min(cost(i, k) + cost(k + 1, j) for k in range(i, j)) + span

def greedy_adjacent(sizes):
    sizes, total = list(sizes), 0
    while len(sizes) > 1:
        i = min(range(len(sizes) - 1), key=lambda i: sizes[i] + sizes[i + 1])
        merged = sizes[i] + sizes[i + 1]
        total += merged
        sizes[i:i + 2] = [merged]
    return total

def greedy_any_pair(sizes):
    heap, total = list(sizes), 0
    heapq.heapify(heap)
    while len(heap) > 1:
        x, y = heapq.heappop(heap), heapq.heappop(heap)
        total += x + y
        heapq.heappush(heap, x + y)
    return total

print("adjacent, optimal (interval DP):", cost(0, len(batches) - 1))
print("adjacent, greedy               :", greedy_adjacent(batches))
print("any pair, greedy               :", greedy_any_pair(batches))
```

Three numbers, and the gaps between them are the point.

- **30,368** — if you may merge *any* two batches, greedily merging the two
  smallest is optimal. That is Huffman's algorithm, and Lesson 7 proves it.
- **30,408** — restricted to adjacent merges, the best possible is worse, and no
  greedy rule finds it.
- **30,488** — the natural greedy rule under the adjacency restriction, which is
  wrong by 80.

One constraint — "adjacent only" — moves a problem from a provably optimal
greedy algorithm to a $\Theta(n^3)$ dynamic program. That is the sharpest
illustration in this stage of why the greedy question is worth asking properly
rather than by instinct.

:::insight{title="The signature of an interval DP"}
State: a contiguous range $(i, j)$ of the input. Transition: a split point
strictly inside it. Evaluation order: **by increasing length**, because every
dependency is a shorter interval.

$\Theta(n^2)$ states $\times$ $\Theta(n)$ splits each $= \Theta(n^3)$. Matrix
chain, optimal binary search trees, palindromic partitioning and burst-balloons
problems are all this, wearing different words.
:::

## Subsets: bitmask DP and Held-Karp

Sometimes the future genuinely needs to know a *set*. Lesson 1 showed why:
longest simple path loses optimal substructure over the state "current vertex",
and gets it back over "current vertex plus the set of vertices already used".

The travelling salesman problem is the same shape. Visit every mirror site once
and return to the start, minimising total latency. Let

$$
g(S, v) \;=\; \text{cheapest route from site } 0 \text{ visiting exactly the set } S \text{ and ending at } v,
$$

defined for $0 \in S$ and $v \in S$. Then

$$
g(S, v) \;=\; \min_{u \,\in\, S \setminus \{v\}} \Big( g\big(S \setminus \{v\},\, u\big) + d(u, v) \Big),
\qquad g(\{0\}, 0) = 0
$$

and the answer is $\min_{v \neq 0} \big( g(V, v) + d(v, 0) \big)$.

A set of $n$ elements is an $n$-bit integer, which makes the memo an array.

```python runnable id=held-karp
from itertools import permutations
import time

def held_karp(dist):
    n = len(dist)
    if n <= 1:
        return 0
    INF = float("inf")
    full = 1 << n
    g = [[INF] * n for _ in range(full)]
    g[1][0] = 0                                   # the set {0}, ending at 0
    for mask in range(full):
        if not mask & 1:                          # every state contains the start
            continue
        for last in range(n):
            base = g[mask][last]
            if base == INF:
                continue
            for nxt in range(n):
                if mask >> nxt & 1:               # already visited
                    continue
                candidate = base + dist[last][nxt]
                if candidate < g[mask | 1 << nxt][nxt]:
                    g[mask | 1 << nxt][nxt] = candidate
    end = full - 1
    return min(g[end][v] + dist[v][0] for v in range(1, n))

def brute_force(dist):
    n = len(dist)
    best = float("inf")
    for order in permutations(range(1, n)):
        total, current = 0, 0
        for site in order:
            total += dist[current][site]
            current = site
        best = min(best, total + dist[current][0])
    return best

latency = [[0, 27, 24, 26, 42, 31],
           [27, 0, 25, 33, 69, 12],
           [24, 25, 0, 10, 46, 37],
           [26, 33, 10, 0, 36, 39],
           [42, 69, 46, 36, 0, 73],
           [31, 12, 37, 39, 73, 0]]

print("held-karp  :", held_karp(latency))
print("brute force:", brute_force(latency))

import random, math
random.seed(7)
points = [(random.randrange(200), random.randrange(200)) for _ in range(16)]
big = [[abs(p[0] - q[0]) + abs(p[1] - q[1]) for q in points] for p in points]
start = time.perf_counter()
answer = held_karp(big)
print(f"\n16 sites: tour {answer} in {(time.perf_counter() - start) * 1000:.0f} ms")
print(f"permutations that brute force would have enumerated: {math.factorial(15):,}")
```

:::insight{title="Exponential, but the right exponential"}
$2^n \cdot n$ states, $n$ transitions each: $\Theta(2^n n^2)$ time and
$\Theta(2^n n)$ space. Still exponential, and still an enormous improvement over
$\Theta(n!)$ — at $n = 16$ that is about a million states against 1.3 trillion
permutations.

The memory is what kills it first. $2^{25} \cdot 25$ eight-byte cells is
already 6.7 GB, so around 22 to 25 vertices is the practical ceiling regardless
of how long you are willing to wait. Remember that number; it comes back in the
systems track for a reason that will affect a query you write.
:::

:::checkpoint{id=cp-bitmask rubric="the state is a subset plus the current endpoint,a set of n elements is an n-bit integer so the memo is an array,cost is 2^n n states times n transitions"}
Say what `g[mask][last]` means, and why the state needs `last` at all when the
mask already records everything visited.
:::

## Trees: children first

A tree has no cycles, so "the subtree rooted at $v$" is a well-founded
subproblem and the evaluation order is any post-order traversal.

Choose a set of packages to feature, but never a package and its direct
dependency together — the same no-two-adjacent rule as Lesson 3, on a tree
instead of a line. The state gains a flag: $(v, \text{taken})$.

$$
\mathrm{take}(v) = w_v + \sum_{c \,\in\, \mathrm{children}(v)} \mathrm{skip}(c),
\qquad
\mathrm{skip}(v) = \sum_{c \,\in\, \mathrm{children}(v)} \max\big(\mathrm{take}(c), \mathrm{skip}(c)\big)
$$

```python runnable id=tree-dp
weight = {"arrowkit": 92000, "chunker": 31880, "lazyseq": 9500, "memoize": 9080,
          "quickselect": 7210, "treewalk": 6460, "skiplist": 6540}
children = {"arrowkit": ["chunker", "lazyseq"],
            "chunker": ["memoize", "quickselect"],
            "lazyseq": ["treewalk", "skiplist"],
            "memoize": [], "quickselect": [], "treewalk": [], "skiplist": []}

def solve(node):
    take, skip = weight[node], 0
    for child in children[node]:
        child_take, child_skip = solve(child)
        take += child_skip
        skip += max(child_take, child_skip)
    return take, skip

take, skip = solve("arrowkit")
print("featuring the root:", take)
print("skipping the root :", skip)
print("best              :", max(take, skip))
```

Each node is visited once and does work proportional to its number of children,
so the whole thing is $\Theta(V)$. The tree gave you the topological order for
free.

## DAGs, and the same DP in SQL

:::dataset{id=package-registry tables="packages,versions"}
:::

A DAG is a tree that allows shared subproblems, which is to say it is the
natural home of dynamic programming. The evaluation order is a topological sort,
and the recurrence follows edges:

$$
f(v) \;=\; w_v \;+\; \max_{u \,:\, v \to u} f(u)
$$

Take the longest weighted dependency chain — the critical path of a build. The
registry has no dependency table, so here is one, and the node weight is the
package's largest release size.

```sql runnable id=critical-path dataset=package-registry
WITH RECURSIVE deps(pkg, needs) AS (
  SELECT * FROM (VALUES (1,3),(1,12),(4,1),(6,12),(7,1),(7,17),(10,6),
                        (10,7),(11,16),(16,2),(18,11),(20,7),(20,19)) v(a, b)
),
cost AS (
  SELECT package_id AS id, max(size_kb) AS kb FROM versions GROUP BY package_id
),
chain(root, node, total) AS (
  SELECT c.id, c.id, c.kb FROM cost c                       -- every package, alone
  UNION ALL
  SELECT ch.root, d.needs, ch.total + c.kb                  -- follow one edge
  FROM chain ch
  JOIN deps d ON d.pkg = ch.node
  JOIN cost c ON c.id = d.needs
)
SELECT p.name, max(ch.total) AS critical_path_kb
FROM chain ch
JOIN packages p ON p.id = ch.root
GROUP BY p.name
ORDER BY critical_path_kb DESC, p.name
LIMIT 6;
```

`treewalk` comes out at 1034 KB, through `graphwalk` and `arrowkit` to
`chunker`. That is a genuine DP over a DAG, written as one statement.

Now look at what it actually did.

```sql runnable id=chain-row-count dataset=package-registry
WITH RECURSIVE deps(pkg, needs) AS (
  SELECT * FROM (VALUES (1,3),(1,12),(4,1),(6,12),(7,1),(7,17),(10,6),
                        (10,7),(11,16),(16,2),(18,11),(20,7),(20,19)) v(a, b)
),
cost AS (
  SELECT package_id AS id, max(size_kb) AS kb FROM versions GROUP BY package_id
),
chain(root, node, total) AS (
  SELECT c.id, c.id, c.kb FROM cost c
  UNION ALL
  SELECT ch.root, d.needs, ch.total + c.kb
  FROM chain ch JOIN deps d ON d.pkg = ch.node JOIN cost c ON c.id = d.needs
)
SELECT count(*) AS partial_chains_materialised,
       count(DISTINCT node) AS distinct_states
FROM chain;
```

Forty-nine rows for twenty states. The query enumerated **paths** and took a
maximum at the end. It did not memoize anything.

:::warning{title="A recursive CTE is a fixpoint iteration, not a memo"}
The evaluation model is fixed: seed the working table, apply the recursive term
to *the rows the previous round produced*, append, repeat until a round produces
nothing. There is no keyed store of best-known values, so there is no way to say
"I already have a better answer for this state, prune this branch."

Which means the row count grows with the number of **paths**, not the number of
**states**. On a chain of diamonds that is $2^{k}$:

```python runnable id=paths-versus-states
# A DAG of k diamonds: 0 -> {1a, 1b} -> 2 -> {3a, 3b} -> 4 -> ...
def diamond_dag(k):
    edges = {}
    for level in range(k):
        a, b, c = 3 * level, 3 * level + 1, 3 * level + 2
        edges[a] = [b, c]
        edges[b] = [a + 3]
        edges[c] = [a + 3]
    edges[3 * k] = []
    return edges

def count_paths(edges, node):
    """What a recursive CTE materialises: one row per partial path."""
    if not edges[node]:
        return 1
    return sum(count_paths(edges, n) for n in edges[node])

for k in (4, 8, 12, 16, 20):
    edges = diamond_dag(k)
    print(f"{k:>3} diamonds: {len(edges):>3} states, {count_paths(edges, 0):>9,} paths")
```

The SQL standard forbids aggregates, `GROUP BY` and `DISTINCT` in the recursive
term precisely because they have no meaning under this evaluation model, and
PostgreSQL rejects them outright. DuckDB is more permissive and will accept an
aggregate there — but it aggregates only that round's working table, so it still
cannot compare against a value computed in an earlier round. Either way you get
enumerate-then-aggregate, which is brute force wearing a dynamic program's
clothes.

It is fine on a sparse DAG. On a dense one it will not finish.
:::

## The three-way boundary

Put the three lessons together. Given a DP recurrence, one of these is true.

**It is a window function.** The DP value equals an aggregate the engine ships,
over a frame the window specification can describe: a prefix, a bounded
lookback, a partition. Running minimum, running sum, "compare to the previous
row". One statement, one pass, no recursion. (Lesson 3.)

**It needs a recursive CTE.** The recurrence follows edges of a DAG, or advances
in rounds where round $k$ depends only on round $k-1$. Reachability, critical
paths, a row-by-row walk of a linear DP, Bellman-Ford. Still one statement, but
now with an evaluation model that enumerates rather than prunes, so you are
paying in paths.

**It needs a loop in a host language.** Two situations, and they are worth
separating.

- *The evaluation order depends on the data.* Dijkstra's next vertex is
  whichever currently has the smallest tentative distance — a decision made from
  values the query is still computing. You can compute the same answer with a
  fixpoint iteration (that is Bellman-Ford) but not with Dijkstra's ordering, and
  the difference is a factor of $E$ versus $VE$.
- *The DP must prune per state as it goes.* Knapsack and Held-Karp are only
  tractable because each state keeps one best value and discards the rest. A
  recursive CTE cannot discard, so the intermediate result is every partial
  solution — exactly the exponential blow-up the DP existed to prevent.

The honest summary: SQL will run a dynamic program for you when the recurrence
can be phrased as *aggregate over a fixed frame* or *repeat one relational step
until nothing changes*. Everything else needs somewhere to keep a memo, and a
`WITH RECURSIVE` clause is not that place.

::::track{depth=systems}
## Your query planner is running Held-Karp

Selinger's 1979 System R optimiser introduced the join-ordering algorithm that
essentially every relational database still uses, and it is bitmask DP over
subsets of relations.

Let $R$ be the set of tables in the query. For each subset $S \subseteq R$, keep
the cheapest plan that produces exactly the join of $S$:

$$
\mathrm{best}(S) \;=\; \min_{\substack{A \,\cup\, B \,=\, S \\ A \,\cap\, B \,=\, \varnothing}}
\Big( \mathrm{best}(A) + \mathrm{best}(B) + \mathrm{joincost}(A, B) \Big)
$$

Compare it with Held-Karp line by line. The state is a subset. The transition
splits the subset. The memo keeps one winner per state, and every worse plan for
the same set of relations is discarded on the spot — which is the whole reason
it beats enumerating join trees.

The costs are the ones you would predict. Considering every way to split every
subset is $\sum_S 2^{|S|} = 3^{n}$; restricting to **left-deep** plans, where one
side is always a single relation, drops it to $\Theta(2^n n)$. Most planners do
the restricted version, and PostgreSQL's `join_search_one_level` is exactly that
loop over subset sizes.

:::interview{title="Why 12 tables changes the plan you get"}
PostgreSQL has a parameter called `geqo_threshold`, and its default is 12. At or
above twelve relations in one query it abandons the dynamic program and runs a
**genetic algorithm** instead — random plan trees, crossover, selection — which
gives no optimality guarantee at all.

That is not timidity. It is the memory line from earlier in this lesson: the DP
holds one entry per subset, so twelve relations is 4,096 entries, sixteen is
65,536, twenty is a million plans each with its own cost model output. The
planner is a *component* of the query's latency budget, and an optimiser that
spends four seconds finding a plan that saves two is a bug.

So the practical advice has a derivation behind it. A twenty-table view is not
slow because it is big; it is slow because the planner gave up on searching and
handed you a random-ish join order. Splitting it, materialising a subquery, or
pinning an order with a CTE are all ways of shrinking $n$ back under the
threshold — you are doing the DP by hand for the part the planner skipped.
:::

### The memo as a cache, and what eviction costs

A memo is a cache. The difference from an ordinary cache is what a miss costs.

Evict one entry from an LRU cache in front of a database and you pay one query.
Evict one entry from a DP memo and you pay for **the entire subtree of
subproblems beneath it**, recursively, because the only thing that made those
cheap was that they were already in the memo. Under an adversarial eviction
order, a memoized exponential recursion degrades back to exponential — the
running-time guarantee was never a property of the recurrence, it was a property
of the memo being complete.

This is why bottom-up DP with a bounded rolling window is the form that ships in
systems with real memory limits: its working set is a stated, fixed size rather
than a hope about hit rates. And it is why `functools.lru_cache(maxsize=128)` on
a recursive DP is a trap. The unbounded `lru_cache(None)` is a memo. The bounded
one is a cache, and on a recursion whose state space exceeds the bound it can be
slower than no cache at all, because you now pay for hashing on top of the
recomputation.
::::

:::exercise{ref=held-karp-tour}
:::

:::exercise{ref=critical-path}
:::

:::exercise{ref=promotion-days-cte}
:::

:::quiz{id=quiz-l05 passing=2}
- id: q1
  prompt: "Why does a recursive CTE over a DAG materialise more rows than the DAG has vertices?"
  options:
    - "Because SQL cannot express a topological sort."
    - "Because it iterates to a fixpoint over the previous round's rows with no keyed store of best-known values, so it enumerates paths rather than states."
    - "Because DuckDB does not implement UNION deduplication for recursive terms."
    - "Because each vertex is visited once per outgoing edge."
  answerIndex: 1
  explanation: >-
    The evaluation model appends whatever the recursive term produces from the
    last round's rows. There is nowhere to record "state v already has a better
    value", so nothing is pruned and every distinct path survives as its own
    row. On a sparse DAG that is affordable; on a chain of diamonds the row
    count doubles per diamond.
- id: q2
  prompt: "PostgreSQL switches from dynamic programming to a genetic algorithm at 12 relations. What is the actual constraint?"
  options:
    - "Genetic algorithms find better plans once the search space is large."
    - "The join-order DP keeps one entry per subset of relations, so its cost and memory are exponential in the number of relations — and the planner's own runtime is part of the query's latency."
    - "Query plans are limited to 12 nodes by the executor."
    - "Statistics become unreliable beyond 12 tables, so exact optimisation is pointless."
  answerIndex: 1
  explanation: >-
    Selinger's algorithm is bitmask DP over subsets of relations: 2^n states,
    Θ(2^n · n) for left-deep plans. Twelve relations is 4,096 subsets and twenty
    is a million, each carrying cost-model output. Since planning time is paid on
    every execution, an optimiser that searches longer than the query would take
    to run is a net loss — so past a threshold it trades the guarantee for a
    bounded cost.
- id: q3
  prompt: "Which of these needs a loop in a host language rather than a single SQL statement?"
  options:
    - "The running maximum of a column, ordered by date."
    - "The length of the longest dependency chain in an acyclic dependency graph."
    - "0/1 knapsack over 500 items with a capacity of 10,000."
    - "Counting all vertices reachable from a given vertex."
  answerIndex: 2
  explanation: >-
    Knapsack is only tractable because each state keeps one best value and
    discards every other way of reaching it. A recursive CTE cannot discard, so
    the intermediate relation would hold every subset that fits rather than one
    row per (item, capacity) — the exponential blow-up the DP exists to prevent.
    The running maximum is a window function; the other two are ordinary
    reachability recursions over a DAG.
:::
