---
id: t3/s07/l05
title: When Dijkstra will not do
tier: t3-algorithms
stage: s07-graphs
status: published
estimatedMinutes: 50
objectives:
  - Run Bellman-Ford, and detect a negative cycle with one extra round.
  - State what makes an A* heuristic admissible, and what goes wrong when it is not.
  - Explain why a recursive CTE can express iterative relaxation but not Dijkstra.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"Bellman-Ford is the slow Dijkstra.\"** It answers a different question. Dijkstra cannot report a negative cycle at all — it has no concept of one — and it cannot answer \"cheapest using at most $k$ edges\", which falls out of Bellman-Ford for free because round $k$ *is* the answer for $k$ edges."
  - "**\"A* is faster than Dijkstra.\"** A* with a zero heuristic *is* Dijkstra, line for line. What the heuristic buys is expansion order; a good one focuses the search toward the goal, a bad one wastes time, and an inadmissible one returns the wrong answer. Speed is a property of the heuristic, not of the algorithm."
  - "**\"A recursive CTE is just a loop, so anything iterative can go in one.\"** The recursive member sees only the rows the *previous round* produced — not the accumulated result. So \"the best distance found so far for this node\" is not available to it, and any algorithm whose next step depends on that is out of reach. Dijkstra is exactly such an algorithm."
  - "**\"If the graph has a negative cycle, shortest paths are just very negative.\"** They are undefined. Go round the cycle once more and the cost drops again, without limit. The only correct output is \"no shortest path exists\", which is why Bellman-Ford returns a flag rather than a number."
masteryChecklist:
  - I can say why Bellman-Ford runs $V - 1$ rounds and what the $V$-th round is for.
  - I can name a heuristic that is admissible and one that is not, and say what each does to the answer.
  - I can write an iterative relaxation as a recursive CTE, and say precisely which part of Dijkstra will not fit.
runtimes:
  - engine: python
  - engine: duckdb
    datasetId: package-registry
---

Dijkstra needs non-negative weights and answers one question: the cheapest path.
Three situations break one of those assumptions, and each has its own algorithm.

## Bellman-Ford: stop being clever

Dijkstra's cleverness is the order it expands nodes in. Take that away and
relax **every edge, $V - 1$ times**.

```python runnable id=bellman-ford
NODES = ["s", "a", "b", "t"]
EDGES = [("s", "a", 2), ("s", "b", 5), ("b", "a", -4), ("a", "t", 6)]

def bellman_ford(nodes, edges, source):
    inf = float("inf")
    dist = {n: inf for n in nodes}
    dist[source] = 0

    for round_no in range(len(nodes) - 1):
        changed = False
        for u, v, w in edges:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                changed = True
        print(f"  after round {round_no + 1}: {dist}")
        if not changed:
            break                       # nothing improved; nothing ever will

    for u, v, w in edges:               # one more pass: still improving?
        if dist[u] + w < dist[v]:
            return None                 # negative cycle
    return dist

print("with a negative edge:", bellman_ford(NODES, EDGES, "s"))
print()
print("with a negative cycle:",
      bellman_ford(["x", "y", "z"], [("x", "y", 1), ("y", "z", -3), ("z", "y", 1)], "x"))
```

This is the graph from lesson 4 where Dijkstra reported `t = 8`. Bellman-Ford
gets 7.

**Why $V - 1$ rounds.** Any shortest path is simple — it visits no node twice,
since removing a repeated section can only help when there is no negative cycle
— so it has at most $V - 1$ edges. And each round guarantees at least one more
edge of every shortest path is correct: after round $k$, every node whose
shortest path uses at most $k$ edges has its final distance. So $V - 1$ rounds
finish the job.

That statement is stronger than it looks. **After round $k$, `dist` holds the
cheapest cost using at most $k$ edges.** So if a problem says "cheapest flight
with at most 3 stops", you run 4 rounds and stop — the algorithm answers it
directly, and Dijkstra has no equivalent because it has no notion of a round.

**Why one more round detects a negative cycle.** If any edge still improves
after $V - 1$ rounds, some path is using more than $V - 1$ edges and getting
cheaper, which means it repeats a node and the repeated section has negative
total weight. That is a negative cycle, and shortest paths through it do not
exist — go round again and the cost drops again, forever.

:::pitfall{title="Relax from a copy, or do not — but know which"}
The version above overwrites `dist` in place, so improvements made earlier in a
round are visible later in the same round. That converges at least as fast and
sometimes much faster, and it is still correct.

It does mean you cannot claim "after round $k$, `dist` is exactly the
$\le k$-edge answer" — with in-place updates, it may already be better. If you
need the strict at-most-$k$-edges semantics (the flight problem), you must relax
from a snapshot of the previous round. Getting this backwards is the single most
common wrong answer to "cheapest flight with $k$ stops".
:::

## A*: Dijkstra with a hint

A* pops the node minimising $f(n) = g(n) + h(n)$, where $g$ is the cost so far
and $h$ is an estimate of the cost remaining. Set $h = 0$ and you have Dijkstra
back, exactly.

```python runnable id=a-star
import heapq

W = H = 25
START, GOAL = (0, 0), (W - 1, H - 1)

def neighbours(p):
    x, y = p
    for dx, dy in ((1, 0), (0, 1), (-1, 0), (0, -1)):
        nx, ny = x + dx, y + dy
        if 0 <= nx < W and 0 <= ny < H:
            yield (nx, ny), 1

def search(h):
    dist = {START: 0}
    heap = [(h(START), h(START), 0, START)]     # (f, h, g, node) — h breaks ties
    expanded = 0
    while heap:
        _f, _h, g, u = heapq.heappop(heap)
        if g > dist[u]:
            continue
        expanded += 1
        if u == GOAL:
            return g, expanded
        for v, weight in neighbours(u):
            if g + weight < dist.get(v, float("inf")):
                dist[v] = g + weight
                heapq.heappush(heap, (g + weight + h(v), h(v), g + weight, v))
    return None, expanded

zero      = lambda p: 0
manhattan = lambda p: abs(p[0] - GOAL[0]) + abs(p[1] - GOAL[1])

print("Dijkstra (h = 0)        : cost %d, %d nodes expanded" % search(zero))
print("A*       (h = Manhattan): cost %d, %d nodes expanded" % search(manhattan))
```

Same answer, 625 expansions against 49. The heuristic did not make the graph
smaller; it made the search stop wandering.

**Admissible** means $h(n) \le$ the true remaining cost, for every $n$: the
heuristic never overestimates. That is what keeps A* optimal. If $h$
overestimates, A* can pop the goal while a cheaper route is still on the heap
looking expensive, and return a suboptimal path with no indication anything went
wrong.

**Consistent** (or monotone) is stronger: $h(u) \le w(u, v) + h(v)$ for every
edge. Consistency implies admissibility and additionally guarantees that $f$
never decreases along a path, which is what lets you close a node permanently on
pop — the same finality Dijkstra relies on. With a merely admissible but
inconsistent heuristic you must be prepared to reopen closed nodes.

Manhattan distance on a 4-connected grid with unit costs is both. Straight-line
Euclidean distance on that grid is admissible but not tight, so it works and
prunes less. Multiplying an admissible heuristic by 1.5 makes it inadmissible,
makes the search much faster, and makes the answer possibly wrong — which is a
trade some route planners take on purpose and label "suboptimal by at most 50%".

## Floyd-Warshall: all pairs, in three loops

When you want the distance between *every* pair, running Dijkstra $V$ times
costs $O(VE\log V)$. Floyd-Warshall costs $O(V^3)$ and is a much simpler program.

```python runnable id=floyd-warshall
NODES = ["s", "a", "b", "t"]
EDGES = [("s", "a", 2), ("s", "b", 5), ("b", "a", -4), ("a", "t", 6)]

inf = float("inf")
d = {(i, j): (0 if i == j else inf) for i in NODES for j in NODES}
for u, v, w in EDGES:
    d[(u, v)] = min(d[(u, v)], w)

for k in NODES:                 # k MUST be the outermost loop
    for i in NODES:
        for j in NODES:
            if d[(i, k)] + d[(k, j)] < d[(i, j)]:
                d[(i, j)] = d[(i, k)] + d[(k, j)]

for i in NODES:
    print(i, {j: d[(i, j)] for j in NODES if d[(i, j)] < inf})
```

The `k` loop being outermost is the whole algorithm, and swapping it inward is
the classic error. The invariant is: **after iteration $k$, `d[i][j]` is the
best path from $i$ to $j$ using only the first $k$ nodes as intermediates.**
Each round asks one question — "does routing through $k$ help?" — and the
answer is valid only because rounds $1..k-1$ already finished. Move `k` inside
and you are asking that question before its prerequisites are established.

Floyd-Warshall handles negative edges, and `d[i][i] < 0` for any $i$ is a
negative cycle. It is also the standard example of the more general idea: the
same triple loop with $\min/+$ replaced by $\text{or}/\text{and}$ gives
transitive closure, and with $\max/\min$ gives the widest-path (bottleneck)
problem. It is a semiring template, not one algorithm.

:::checkpoint{id=cp-choose rubric="negative weights rule out dijkstra,negative cycle means no answer exists,a heuristic that never overestimates keeps a-star optimal,all pairs on a small dense graph is floyd-warshall"}
Four inputs: (a) non-negative weights, one source; (b) some negative weights,
one source; (c) a 300-node dense graph and you need every pair; (d) a grid where
you know roughly which direction the goal is. Name the algorithm for each and
the property of the input that decides it.
:::

## Relaxation in SQL — and the wall

A recursive CTE can do iterative relaxation. Here is the weighted graph from
lesson 4, solved set-at-a-time:

```sql runnable id=sql-relaxation dataset=package-registry
WITH RECURSIVE g(src, dst, w) AS (
  VALUES ('a','b',4), ('a','c',2), ('c','b',1), ('b','d',5), ('c','d',8),
         ('c','e',10), ('d','e',2), ('d','f',6), ('e','f',3)
),
relax(node, dist, hops) AS (
  SELECT 'a', 0, 0
  UNION ALL
  SELECT e.dst, r.dist + e.w, r.hops + 1
  FROM relax r JOIN g e ON e.src = r.node
  WHERE r.hops < 5                       -- V - 1 rounds, and the depth guard
)
SELECT node, min(dist) AS shortest
FROM relax GROUP BY node ORDER BY node;
```

`a 0, b 3, c 2, d 8, e 10, f 13` — the same six numbers the Python Dijkstra
printed. The shape is Bellman-Ford's: expand everything, bound the number of
rounds by $V - 1$, take the minimum at the end.

Now try to make it Dijkstra. Dijkstra's step is "take the *closest* unfinished
node and expand only that one", which needs a minimum over the best distances
known so far. Put a `min` in the recursive member and watch what it minimises:

```sql runnable id=aggregate-sees-only-the-frontier dataset=package-registry
WITH RECURSIVE g(src, dst, w) AS (
  VALUES ('a','b',4), ('a','c',2), ('c','b',1), ('b','d',5), ('c','d',8),
         ('c','e',10), ('d','e',2), ('d','f',6), ('e','f',3)
),
relax(node, dist, hops) AS (
  SELECT 'a', 0, 0
  UNION ALL
  SELECT e.dst, min(r.dist + e.w), max(r.hops) + 1
  FROM relax r JOIN g e ON e.src = r.node
  WHERE r.hops < 6
  GROUP BY e.dst
)
SELECT hops AS round, node, dist FROM relax ORDER BY round, node;
```

Look at `b`. Round 1 emits `b` at 4. Round 2 emits `b` again at 3. The `min` did
not prevent that, because **the recursive member only sees the rows the previous
round produced.** In round 1 the only row was `('a', 0)`, so the minimum over
that frontier is 4. The better route through `c` does not exist yet. And in round
2, the accumulated `b = 4` is invisible — the recursive member has no name for
the result so far, only for the last delta.

That is not a DuckDB quirk. It is **semi-naive fixpoint evaluation**, the
standard way recursive queries are executed (and the reason they can be executed
efficiently at all): each round joins the *new* tuples against the base
relations, because re-joining the whole accumulated result every round would
repeat work already done. The engine is deliberately blind to its own
accumulated output.

:::insight{title="The honest limit, stated plainly"}
**You can write Bellman-Ford in SQL. You cannot write Dijkstra.**

Bellman-Ford is a fixpoint computation: relax every edge, repeat until nothing
changes. That is a *set-at-a-time* algorithm, and the recursive CTE is a
fixpoint engine, so it fits exactly — including the $V-1$ bound and the extra
round for negative cycles.

Dijkstra is not a fixpoint computation. It is a *sequential* one: its correctness
comes from the order it visits nodes in, and that order comes from a priority
queue over the global best-known distances. SQL's recursion has no priority
queue, no ordering between rows in a round, and no handle on the accumulated
result — every row in a round is processed as one set operation. There is nothing
to prioritise with.

The consequence is practical, not academic. In SQL the shortest-path query costs
$O(V \cdot E)$ rounds of joins over intermediate results, where the Python
version costs $O(E \log V)$ with early termination. On a graph of any size that
is the difference between a query and an outage — which is why graph workloads
that matter run in a graph engine, and why "just use a recursive CTE" is a
reasonable answer for a 20-node dependency graph and a bad one for a
20-million-node one.
:::

::::track{depth=systems}
## Why the recursive CTE stops being the right tool

The 20-node queries in this stage return instantly. The same query shape on a
production graph often does not return at all, and the reasons are worth naming
because they are all visible in the plan.

**Intermediate results are materialised, and they are not the graph.** Each
round writes a new working table. On the transitive closure of a graph with a
million nodes and average degree 30, the closure itself can approach $V^2$ rows
— $10^{12}$. The query is not slow; the *answer* is enormous, and no engine can
help with that. This is why real systems ask reachability questions with a
bound, a source set, or both, and never materialise a full closure.

**There is no index on the working table.** Your edge table can be indexed on
`src` and the join will use it. The recursive relation is produced fresh each
round and joined without one, so the engine typically hash-joins the frontier
against the edges — fine when the frontier is small, and a full rebuild of the
hash table when it is not. Watch a plan for a recursive CTE and you will see the
same join repeated with a growing build side.

**No early termination.** `SELECT ... WHERE node = 'target' LIMIT 1` on top of a
recursive CTE does not stop the recursion when the target is found; the fixpoint
runs to completion and the filter applies afterwards. Dijkstra's single-target
form stops the moment the goal is popped, which on a large graph is often after
touching a tiny fraction of it. There is no way to express that stopping
condition inside the CTE, because the CTE has no notion of "the best so far".

**The frontier is not deduplicated across rounds unless you make it so.** The
`UNION`-as-visited-set only works when the row is the vertex. Carry a depth, a
path array or a distance and the same vertex reappears every round — which is
exactly the row explosion the `UNION ALL` demo showed in lesson 2, arriving
quietly instead of loudly.

**What to do instead.** Three options, in order of how often they are right:

1. **Bound the traversal.** Most production reachability questions are really
   "within 3 hops", and a depth-bounded CTE is genuinely fine. Say the bound out
   loud and put it in the query.
2. **Precompute.** If the graph changes rarely and the question is asked often,
   materialise the closure, the component labels, or the distances-from-hubs as
   a table and index it. Hub labelling — precomputed distances to a small set of
   landmark nodes — answers approximate distance queries in two lookups.
3. **Move the graph out of SQL.** Pull the edge list once, build CSR, and run
   the algorithm where a priority queue exists. The edge list is a table; the
   working representation does not have to be. This is what every graph-analytics
   system does on ingest, and it is the practical form of the lesson: **the
   relational model is an excellent way to store a graph and a poor way to walk
   one.**
::::

:::exercise{ref=bellman-ford-negative-cycle}
:::

:::exercise{ref=cheapest-build-chain}
:::

:::quiz{id=quiz-l05 passing=2}
- id: q1
  prompt: "Bellman-Ford has run V-1 rounds and one more pass still improves an edge. What does that mean?"
  options:
    - "The graph is disconnected and the remaining nodes need their own run."
    - "The round limit was set too low and it needs more iterations."
    - "Some edge weight is larger than the sum of all the others."
    - "There is a negative cycle, so shortest paths are undefined."
  answerIndex: 3
  explanation: >-
    A shortest path in a graph without negative cycles is simple and so uses at
    most V-1 edges; V-1 rounds are enough to find every one of them. Improving
    after that means a path is getting cheaper by repeating nodes, which is a
    negative cycle. More rounds would not converge — the cost decreases without
    limit.
- id: q2
  prompt: "An A* heuristic sometimes overestimates the remaining cost. What is the consequence?"
  options:
    - "The search is slower but still returns an optimal path."
    - "The search may return a suboptimal path, and will not report that it did."
    - "The search fails to terminate."
    - "Nothing — overestimating is what makes A* faster than Dijkstra."
  answerIndex: 1
  explanation: >-
    An inflated $h$ can make the true best route look expensive enough that A*
    pops the goal via a worse route first, and A* has no way to know. It usually
    *is* faster, which is why weighted A* is used deliberately with a bounded
    suboptimality guarantee — but that is a trade you make on purpose, not a
    free win.
- id: q3
  prompt: "Why can a recursive CTE express Bellman-Ford but not Dijkstra?"
  options:
    - "Because Dijkstra needs floating-point weights and SQL only relaxes integers."
    - "Because the recursive member sees only the previous round's rows, so there is no global best-so-far to prioritise on — and no priority queue to prioritise with."
    - "Because recursive CTEs cannot join against a table more than once."
    - "Because Dijkstra requires recursion depth greater than the engine allows."
    - "Because UNION would deduplicate the distances Dijkstra needs to keep."
  answerIndex: 1
  explanation: >-
    Bellman-Ford is a fixpoint: relax everything, repeat, stop when nothing
    changes — which is precisely what semi-naive evaluation does. Dijkstra's
    correctness depends on expanding nodes in increasing order of distance, and
    that order needs the accumulated best-known distances, which the recursive
    member cannot see. It is a limit of set-at-a-time evaluation, not of
    syntax.
:::
