---
id: t3/s07/l02
title: Traversal, and the set that makes it stop
tier: t3-algorithms
stage: s07-graphs
status: published
estimatedMinutes: 50
objectives:
  - Write BFS and DFS as one function that differs only in which end of the frontier it takes from.
  - Explain why the visited set is a correctness requirement, not a speed optimisation.
  - Read a `WITH RECURSIVE` query as a breadth-first traversal, and say which clause is the visited set.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"The visited set makes traversal faster.\"** It makes traversal *finish*. On any graph with a cycle, a traversal without one runs forever — and every undirected graph has cycles the moment it has two edges between the same pair of nodes read in both directions. Speed is a side effect."
  - "**\"BFS and DFS are different algorithms.\"** They are the same eight lines with a different container. Take from the front of the frontier and you get BFS; take from the back and you get DFS. Everything else — the visited set, the neighbour loop, the termination condition — is identical."
  - "**\"`UNION` in a recursive CTE is just deduplication, a tidiness thing.\"** It is the visited set. Swap it for `UNION ALL` on a cyclic graph and the query does not return a messier answer, it does not return at all. And `UNION` only dedupes the *whole row* — carry a depth column and node `a` at depth 2 is a different row from node `a` at depth 5, so the visited set silently stops working."
  - "**\"Mark a node visited when you pop it.\"** Mark it when you *push* it. Popping-time marking lets the same node sit in the frontier several times before any of them is processed, which on a dense graph turns a linear traversal into a quadratic one and, in the weighted version you meet in lesson 4, changes the answer."
masteryChecklist:
  - I can write BFS from memory, including where the visited set is updated and why it is there.
  - Given a recursive CTE, I can point at the anchor member and say it is the initial frontier.
  - I can say what `UNION ALL` does to a recursive CTE over a cyclic graph, and what the fix is.
runtimes:
  - engine: python
  - engine: duckdb
    datasetId: package-registry
---

Here is a traversal with no visited set, on a graph with three nodes and one
cycle. The step counter is the only reason it ever stops.

```python runnable id=no-visited-set
graph = {"a": ["b"], "b": ["c"], "c": ["a"]}

frontier = ["a"]
steps = 0
while frontier and steps < 12:      # <- the cap is doing all the work
    node = frontier.pop()
    steps += 1
    print(steps, node)
    frontier.extend(graph[node])

print("stopped after", steps, "steps; frontier still holds", frontier)
```

`a b c a b c a b c…` forever. Remove the cap and the program never returns.

The visited set is not there to save time. It is there because a graph, unlike
a tree, can lead you back to where you have been, and an algorithm that cannot
tell "here again" from "here for the first time" has no reason to terminate.

## One function, two algorithms

Write the traversal with an explicit frontier and the difference between
breadth-first and depth-first is a single method call.

```python runnable id=bfs-and-dfs
from collections import deque

GRAPH = {
    "arrowkit":    ["chunker", "graphwalk", "lazyseq", "skiplist"],
    "chunker":     ["arrowkit", "indexer", "lazyseq", "quickselect", "skiplist"],
    "dagrun":      ["graphwalk"],
    "graphwalk":   ["arrowkit", "dagrun"],
    "indexer":     ["chunker", "quickselect"],
    "lazyseq":     ["arrowkit", "chunker", "skiplist"],
    "quickselect": ["chunker", "indexer"],
    "skiplist":    ["arrowkit", "chunker", "lazyseq"],
}

def traverse(graph, start, depth_first):
    seen = {start}                       # marked on PUSH, not on pop
    frontier = deque([start])
    order = []
    while frontier:
        node = frontier.pop() if depth_first else frontier.popleft()
        order.append(node)
        for nxt in graph[node]:
            if nxt not in seen:
                seen.add(nxt)
                frontier.append(nxt)
    return order

print("BFS:", traverse(GRAPH, "arrowkit", depth_first=False))
print("DFS:", traverse(GRAPH, "arrowkit", depth_first=True))
```

`popleft` takes the oldest item — a queue — so nodes come out in order of
distance from the start. `pop` takes the newest — a stack — so the traversal
runs as far as it can before backing up.

That is the whole difference, and it is why the recursive form of DFS works:
the call stack *is* the frontier. Recursion is not a different algorithm, it is
the same stack with the language managing it.

:::pitfall{title="Mark on push"}
`seen.add(nxt)` sits inside the neighbour loop, before the append. Move the
marking to just after the pop and the code still terminates, but a node with
five in-edges gets pushed five times before any copy is popped. On a dense
graph the frontier grows to $O(E)$ and the traversal does $O(E)$ redundant
pops. The version above never has a duplicate in the frontier at all.

The exception is Dijkstra, where you genuinely cannot mark on push — that is
lesson 4, and it is the reason the lazy heap exists.
:::

## BFS levels

Replace the set with a dict and BFS hands you the shortest-path distance for
free.

```python runnable id=bfs-levels
from collections import deque

GRAPH = {
    "arrowkit":    ["chunker", "graphwalk", "lazyseq", "skiplist"],
    "chunker":     ["arrowkit", "indexer", "lazyseq", "quickselect", "skiplist"],
    "dagrun":      ["graphwalk"],
    "graphwalk":   ["arrowkit", "dagrun"],
    "indexer":     ["chunker", "quickselect"],
    "lazyseq":     ["arrowkit", "chunker", "skiplist"],
    "quickselect": ["chunker", "indexer"],
    "skiplist":    ["arrowkit", "chunker", "lazyseq"],
}

def bfs_levels(graph, start):
    dist = {start: 0}                 # the dict IS the visited set
    queue = deque([start])
    while queue:
        node = queue.popleft()
        for nxt in graph[node]:
            if nxt not in dist:
                dist[nxt] = dist[node] + 1
                queue.append(nxt)
    return dist

for name, hops in sorted(bfs_levels(GRAPH, "arrowkit").items(), key=lambda kv: (kv[1], kv[0])):
    print(f"{hops}  {name}")
```

One node at distance 0, four at distance 1, three at distance 2. Hold on to
those numbers — the SQL below has to produce exactly the same ones.

:::insight{title="Shortest path in an unweighted graph is always BFS"}
Not "can be". *Is*. If every edge costs the same, the first time BFS reaches a
node it has reached it by a minimum-edge path, and no later route can beat it.
Reaching for Dijkstra on an unweighted graph is not wrong, it is just a heap you
did not need. The proof track at the end of this lesson does the induction
properly.
:::

## Components, and cycles

Wrap the traversal in an outer loop over every node and you get connected
components. Keep the visited set *outside* that loop and the whole scan is
$O(V + E)$ — every node is popped once across all traversals combined.

For directed graphs, the useful traversal question is whether a cycle exists,
and the classic answer is a three-colour DFS:

- **white** — not yet visited
- **grey** — on the current DFS path, entered but not finished
- **black** — finished; everything reachable from it has been explored

An edge into a **grey** node is an edge back into the path you are standing on.
That is a cycle. An edge into a black node is fine — you have been there, but
you came out again.

```python runnable id=three-colour-cycle
WHITE, GREY, BLACK = 0, 1, 2

def find_back_edge(graph):
    """Return the (u, v) edge that closes a cycle, or None if the graph is a DAG."""
    colour = {node: WHITE for node in graph}

    def visit(u):
        colour[u] = GREY
        for v in graph[u]:
            if colour[v] == GREY:
                return (u, v)                  # back edge: v is on our path
            if colour[v] == WHITE:
                found = visit(v)
                if found:
                    return found
        colour[u] = BLACK                      # done: everything below u explored
        return None

    for node in graph:
        if colour[node] == WHITE:
            found = visit(node)
            if found:
                return found
    return None

cyclic = {"a": ["b"], "b": ["c"], "c": ["a", "d"], "d": []}
acyclic = {"a": ["b"], "b": ["c"], "c": [], "d": ["b"]}
print("cyclic  ->", find_back_edge(cyclic))
print("acyclic ->", find_back_edge(acyclic))
```

The second graph has two paths into `c`, which a two-state visited set would
happily mistake for a cycle. Grey and black are different for exactly that
reason: "I have seen this node" and "this node is on my current path" are
different facts, and only the second one means a cycle.

:::checkpoint{id=cp-colours rubric="grey means on the current path,black means finished,an edge to grey is a cycle,an edge to black is just a re-convergence"}
A DFS on a directed graph reaches a node that is already coloured. What must
the colour be for that to prove a cycle, and what does the other colour mean
instead?
:::

## `WITH RECURSIVE` is breadth-first search

Everything above has a relational twin, and it is closer than you would expect.

A recursive CTE has two halves joined by `UNION` or `UNION ALL`:

- the **anchor member** runs once. It is the initial frontier.
- the **recursive member** joins the previous round's output against the edge
  table. It is the "for each node in the frontier, take its neighbours" step.

The engine runs the recursive member repeatedly, each round seeing only the
rows the previous round produced, until a round produces nothing. That is
literally the `while frontier:` loop, one level at a time.

```sql runnable id=recursive-bfs dataset=package-registry
WITH RECURSIVE
edges AS (                                   -- the adjacency information
  SELECT DISTINCT a.package_id AS src, b.package_id AS dst
  FROM package_maintainers a
  JOIN package_maintainers b ON a.maintainer_id = b.maintainer_id
  WHERE a.package_id <> b.package_id
),
walk(node, depth) AS (
  SELECT id, 0                               -- ANCHOR: the initial frontier
  FROM packages WHERE name = 'arrowkit'
  UNION                                      -- the visited set
  SELECT e.dst, w.depth + 1                  -- RECURSIVE: expand the frontier
  FROM walk w
  JOIN edges e ON e.src = w.node
  WHERE w.depth < 8                          -- depth guard, explained below
)
SELECT min(depth) AS hops, p.name
FROM walk w JOIN packages p ON p.id = w.node
GROUP BY p.name
ORDER BY hops, p.name;
```

Eight rows: one at zero hops, four at one, three at two. The same numbers the
Python BFS printed, from the same graph, by the same algorithm — expressed
set-at-a-time instead of node-at-a-time.

`depth + 1` in the recursive member is `dist[nxt] = dist[node] + 1`. The join
against `edges` is the neighbour loop. The anchor is `queue = deque([start])`.

## `UNION` versus `UNION ALL` is the visited set

This is the part worth slowing down for.

`UNION ALL` appends. `UNION` appends *and discards rows already in the result*.
That discard is the visited check, and without it a cyclic graph never reaches
a fixed point.

Here is a five-edge graph with a cycle `a → b → c → a` and a chord back into it.
Under `UNION ALL` the row count doubles every three rounds:

```sql runnable id=union-all-explodes dataset=package-registry
WITH RECURSIVE edges(src, dst) AS (
  VALUES ('a','b'), ('b','c'), ('c','a'), ('c','d'), ('d','b')
),
walk(node, steps) AS (
  SELECT 'a', 0
  UNION ALL
  SELECT e.dst, w.steps + 1
  FROM walk w JOIN edges e ON e.src = w.node
  WHERE w.steps < 12          -- WITHOUT THIS LINE THIS QUERY NEVER RETURNS
)
SELECT steps, count(*) AS rows_produced
FROM walk GROUP BY steps ORDER BY steps;
```

1, 1, 1, 2, 2, 2, 4, 4, 4, 8, 8, 8, 16. The counts are the number of distinct
*walks* of each length, and on a graph with a cycle there is no largest walk.
The `steps < 12` guard is the only reason your browser is still responsive.

Now change one word:

```sql runnable id=union-terminates dataset=package-registry
WITH RECURSIVE edges(src, dst) AS (
  VALUES ('a','b'), ('b','c'), ('c','a'), ('c','d'), ('d','b')
),
walk(node) AS (
  SELECT 'a'
  UNION                       -- no guard needed, and none present
  SELECT e.dst FROM walk w JOIN edges e ON e.src = w.node
)
SELECT node FROM walk ORDER BY node;
```

Four rows, no depth guard, terminates on its own. Round 4 produces only rows
that are already in the result, `UNION` discards them, the round is empty and
the engine stops. That is `if nxt not in seen`.

:::warning{title="`UNION` dedupes the row, not the node"}
The dedup is on the **entire output row**. Put a depth column back in and
`('a', 2)` and `('a', 5)` are different rows, so `UNION` lets both through and
the fixpoint never arrives:

```sql runnable id=union-with-depth-still-loops dataset=package-registry
WITH RECURSIVE edges(src, dst) AS (
  VALUES ('a','b'), ('b','c'), ('c','a'), ('c','d'), ('d','b')
),
walk(node, steps) AS (
  SELECT 'a', 0
  UNION                       -- still UNION. still needs the guard.
  SELECT e.dst, w.steps + 1
  FROM walk w JOIN edges e ON e.src = w.node
  WHERE w.steps < 12          -- and it is still the only thing stopping this
)
SELECT steps, count(*) AS distinct_rows
FROM walk GROUP BY steps ORDER BY steps;
```

Thirteen rounds, one or two rows each, never empty. This is the trap: the query
*looks* like it has a visited set, and it has a visited set over
`(node, steps)` pairs — a set that can never repeat, because `steps` only ever
goes up.

So: if you carry a depth column, you must also carry a bound. Put a
`WHERE depth < k` in the recursive member of every recursive CTE you write
against data whose acyclicity you have not proven. It is the same instinct as a
loop counter in a `while` you are not sure about, and it costs nothing when the
graph turns out to be a DAG.
:::

## What you can build once you have this

**Transitive closure** — every pair `(from, to)` connected by any path — is the
same query with the anchor widened from one node to all of them.

```sql runnable id=transitive-closure dataset=package-registry
WITH RECURSIVE edges AS (
  SELECT DISTINCT a.package_id AS src, b.package_id AS dst
  FROM package_maintainers a
  JOIN package_maintainers b ON a.maintainer_id = b.maintainer_id
  WHERE a.package_id <> b.package_id
),
closure(root, node) AS (
  SELECT src, src FROM edges          -- every node reaches itself
  UNION
  SELECT c.root, e.dst
  FROM closure c JOIN edges e ON e.src = c.node
),
component AS (
  -- Group the closure by root and you have, for each node, its component.
  SELECT c.root,
         count(*) AS component_size,
         string_agg(p.name, ', ' ORDER BY p.name) AS members
  FROM closure c JOIN packages p ON p.id = c.node
  GROUP BY c.root
)
-- Every node in a component is a valid root, so the same member list comes back
-- once per member. DISTINCT collapses them.
SELECT DISTINCT component_size, members
FROM component
ORDER BY component_size DESC, members;
```

Four rows, of sizes 8, 6, 3 and 3 — the connected components of the package
graph. `GROUP BY root` over a transitive closure is exactly the outer loop of
the Python component scan, and the `DISTINCT` at the end is doing the job that
`if start in seen: continue` does there.

**Cycle detection** needs the path, not just the node. Carry the path as an
array and test membership before you extend:

```sql runnable id=path-cycle-detection dataset=package-registry
WITH RECURSIVE edges(src, dst) AS (
  VALUES ('a','b'), ('b','c'), ('c','a'), ('c','d')
),
walk(node, path, closed) AS (
  SELECT 'a', ['a'], false
  UNION ALL
  SELECT e.dst,
         list_append(w.path, e.dst),
         list_contains(w.path, e.dst)          -- have we been here on THIS path?
  FROM walk w JOIN edges e ON e.src = w.node
  WHERE NOT w.closed AND len(w.path) < 8       -- stop extending a closed loop
)
SELECT node, path, closed FROM walk ORDER BY len(path), node;
```

`list_contains(path, dst)` is the grey colour from the DFS above, written as
data. `WHERE NOT w.closed` is the `return` that stops the recursion descending
past the back edge. Five rows come back, and the one with `closed = true` has
path `[a, b, c, a]` — the cycle, spelled out.

::::track{depth=interview}
## Recognising it

BFS and DFS are the two most-asked algorithms in technical interviews, and the
recognition triggers are short enough to memorise.

**Reach for BFS when the question contains:**

- "shortest", "fewest", "minimum number of steps/moves/transformations" **and
  the edges are unweighted**. Word ladder, rotting oranges, knight's moves,
  open-the-lock — all BFS, all unweighted shortest path.
- "level", "layer", "round", or anything about distance from a source.
- "nearest" — the first thing BFS finds is the closest one.

**Reach for DFS when the question contains:**

- "all paths", "does a path exist", "count the islands", "flood fill".
- anything about structure rather than distance: cycles, components, topological
  order, bridges, articulation points.
- anything naturally recursive, where the call stack is a free frontier.

**The line to say out loud:** "Every edge has the same cost, so the first time
BFS reaches the target it has reached it by a shortest path — I don't need
Dijkstra here." That single sentence tells an interviewer you know *why* the
cheap algorithm is correct, not just that it is cheap.

:::interview{title="The follow-ups"}
**"What is the complexity?"** $O(V + E)$ for both. Every node is popped once —
the visited set guarantees it — and every edge is examined once from each of its
endpoints. Say the visited set out loud as the reason; it is the answer they are
listening for.

**"What about space?"** BFS holds a whole frontier, which on a wide graph can be
$O(V)$ — a full level of a binary tree is half the nodes. DFS holds a path,
which is $O(\text{depth})$, but on a long chain that is also $O(V)$ *and* it is
recursion depth, so Python raises `RecursionError` at around a thousand frames.
"I'd write DFS iteratively with an explicit stack for anything deep" is a good
thing to say before you are asked.

**"Bidirectional search?"** Running BFS from both ends and meeting in the middle
turns $b^d$ into $2b^{d/2}$. It needs a known target and a reversible edge
relation. Worth naming; rarely worth writing under time pressure.
:::
::::

::::track{depth=proof}
## Why BFS finds shortest paths

Let $\delta(s, v)$ be the minimum number of edges on any path from $s$ to $v$,
or $\infty$ if none exists. Let $d[v]$ be the value BFS assigns. The claim is
$d[v] = \delta(s, v)$ for every $v$.

**Lemma 1 (the upper bound is free).** Whenever BFS sets $d[v] = d[u] + 1$, it
does so across an edge $(u, v)$, and $d[u]$ was itself the length of a real
$s \to u$ walk. By induction, $d[v]$ is always the length of some genuine path
from $s$ to $v$. A minimum cannot exceed the length of a particular path, so
$\delta(s, v) \le d[v]$.

The work is in the other direction.

**Lemma 2 (queue monotonicity).** At every moment, if the queue holds
$v_1, \dots, v_k$ in order, then $d[v_1] \le d[v_2] \le \dots \le d[v_k]$ and
$d[v_k] \le d[v_1] + 1$.

*Proof.* By induction on the number of queue operations. The claim holds for the
queue $\langle s \rangle$. A dequeue removes $v_1$; the remaining sequence is
still sorted, and $d[v_k] \le d[v_1] + 1 \le d[v_2] + 1$, so the invariant
survives. An enqueue happens while processing some dequeued $u$, and appends
$v_{k+1}$ with $d[v_{k+1}] = d[u] + 1$. Every element still in the queue was
there when $u$ was at the front, so by the invariant at that moment
$d[u] \le d[v_i] \le d[u] + 1$ for each remaining $v_i$. Hence
$d[v_k] \le d[u] + 1 = d[v_{k+1}]$, keeping the order sorted, and
$d[v_{k+1}] = d[u] + 1 \le d[v_1] + 1$, keeping the spread at most one. $\square$

The consequence worth naming: **nodes are dequeued in non-decreasing order of
$d$.** BFS processes the graph in complete levels.

**Theorem.** $d[v] = \delta(s, v)$ for all $v$.

*Proof.* By strong induction on $k = \delta(s, v)$.

*Base, $k = 0$.* Only $s$ has $\delta = 0$, and $d[s] = 0$.

*Step.* Let $\delta(s, v) = k \ge 1$ and assume the claim for every node at
distance $k - 1$. Take a shortest $s \to v$ path and let $u$ be the node just
before $v$, so $\delta(s, u) = k - 1$ and by the induction hypothesis
$d[u] = k - 1$. Since $d[u]$ is finite, $u$ was enqueued, and every enqueued
node is eventually dequeued. Consider the moment $u$ is dequeued and the edge
$(u, v)$ is examined. Either:

- $v$ has no $d$ value yet, and BFS sets $d[v] = d[u] + 1 = k$; or
- $v$ already has one, set when some node $w$ was dequeued earlier. By
  monotonicity $d[w] \le d[u] = k - 1$, so $d[v] = d[w] + 1 \le k$.

In both cases $d[v] \le k$. With Lemma 1 giving $k = \delta(s, v) \le d[v]$, we
get $d[v] = k$. $\square$

**Where it breaks.** The proof leans on $d[v] = d[u] + 1$ — every edge adding
exactly one. Give edges different weights and Lemma 2 fails immediately: a
one-hop path of weight 10 can be worse than a two-hop path of weight 3, so
dequeue order no longer tracks distance. Restoring the invariant requires
dequeuing by *distance* rather than by *insertion time*, and a queue that pops
the minimum is a priority queue. That substitution, and nothing else, is
Dijkstra's algorithm.
::::

:::exercise{ref=bfs-shortest-path}
:::

:::exercise{ref=count-components}
:::

:::exercise{ref=reachable-in-hops}
:::

:::quiz{id=quiz-l02 passing=2}
- id: q1
  prompt: "What happens if you delete the visited set from a BFS over a graph containing a cycle?"
  options:
    - "It still terminates, but revisits nodes and returns them more than once."
    - "It terminates but may return the wrong distances."
    - "Nothing; the queue naturally drains."
    - "It never terminates — nodes are re-enqueued forever."
  answerIndex: 3
  explanation: >-
    Each pass round the cycle re-enqueues nodes already processed, and those
    re-enqueue their neighbours again. The queue never drains. The first option
    is the tempting one because it describes what happens on a DAG with
    re-convergent paths — there the traversal is wasteful but finite. A cycle is
    a different failure.
- id: q2
  prompt: "In a recursive CTE, which piece corresponds to the BFS visited set?"
  options:
    - "The anchor member — it seeds the search with the start node."
    - "`UNION` rather than `UNION ALL` — it discards rows already in the result."
    - "The `WHERE` clause of the recursive member."
    - "`ORDER BY` in the final SELECT."
  answerIndex: 1
  explanation: >-
    `UNION` drops rows already produced, which is exactly `if nxt not in seen`.
    The anchor is the initial frontier and a `WHERE` in the recursive member is
    a depth guard or a filter — useful, sometimes essential, but not the same
    mechanism. `ORDER BY` runs after the fixpoint and cannot affect termination.
- id: q3
  prompt: "This recursive CTE uses UNION and still needs a depth guard. Why?"
  options:
    - "Because DuckDB's UNION does not deduplicate inside a recursive CTE."
    - "Because it carries a `depth` column, so the same node at two depths is two distinct rows and never gets deduped."
    - "Because the anchor member returns more than one row."
    - "Because the graph is undirected, and UNION only works on directed graphs."
    - "Because the guard is required syntax whenever a recursive CTE joins a table."
  answerIndex: 1
  explanation: >-
    `UNION` deduplicates whole rows. `('a', 2)` and `('a', 5)` differ, so both
    survive, and since the depth counter only increases no row is ever a repeat
    — the fixpoint is never reached. Either drop the depth column and let the
    node alone be the row, or keep it and bound it.
:::
