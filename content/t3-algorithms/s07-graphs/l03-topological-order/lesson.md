---
id: t3/s07/l03
title: Topological order, and the cycle that forbids it
tier: t3-algorithms
stage: s07-graphs
status: published
estimatedMinutes: 45
objectives:
  - Produce a topological order with Kahn's algorithm and with DFS post-order, and say when each is the better fit.
  - Explain why a cycle makes the question unanswerable rather than merely hard.
  - Compute topological layers with a recursive CTE, and detect a cycle from the depth the query reaches.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"A topological sort is a sort.\"** There is no key and no comparison. Two nodes with no path between them are genuinely incomparable, so most DAGs have many valid orders and no notion of \"the\" correct one. `sorted()` gives you one answer; a topological sort gives you one of many, and which one you get is a property of your algorithm, not of the graph."
  - "**\"DFS post-order gives a topological order, so reverse it and you are done.\"** Only on a DAG. Run the same DFS on a graph with a cycle and it still returns a list — a wrong one, with no error. The cycle check is not optional garnish; without it the function's contract is a lie."
  - "**\"If there is a cycle, pick an order that breaks the fewest constraints.\"** That is a different problem (minimum feedback arc set) and it is NP-hard. The right response to a cycle in a build graph is to report it, not to guess around it — which is why every build tool you have used prints the cycle and exits."
masteryChecklist:
  - I can write Kahn's algorithm including the line that detects a cycle.
  - I can say why reversed DFS post-order is a topological order.
  - Given a recursive CTE that layers a DAG, I can say what happens when the graph is not a DAG.
runtimes:
  - engine: python
  - engine: duckdb
    datasetId: package-registry
---

Some things have to happen before other things. That is the entire content of a
directed acyclic graph, and a topological order is a linear sequence in which
no dependency comes after the thing that needs it.

The important word is **acyclic**. If `a` needs `b` and `b` needs `a`, no
sequence works — not "no efficient sequence", none at all. So every topological
sort algorithm is also a cycle detector, and an implementation that returns a
list without checking is returning an answer to a question that had none.

## Kahn's algorithm: peel off what is ready

Count how many unmet dependencies each node has. Anything at zero is ready.
Take a ready node, emit it, and decrement its dependents. Repeat.

```python runnable id=kahn
from collections import deque

# u -> [things that depend on u]
DEPS = {
    "config":   ["parser", "server"],
    "parser":   ["compiler"],
    "compiler": ["server", "cli"],
    "server":   ["cli"],
    "cli":      [],
    "docs":     ["cli"],
}

def kahn(graph):
    indegree = {node: 0 for node in graph}
    for u in graph:
        for v in graph[u]:
            indegree[v] += 1

    ready = deque(sorted(n for n in graph if indegree[n] == 0))
    order = []
    while ready:
        u = ready.popleft()
        order.append(u)
        for v in graph[u]:
            indegree[v] -= 1
            if indegree[v] == 0:       # its last dependency just cleared
                ready.append(v)
    # Anything still stuck has a dependency that never cleared: a cycle.
    return order if len(order) == len(graph) else []

print("order:", kahn(DEPS))
print("cycle:", kahn({"a": ["b"], "b": ["c"], "c": ["a"]}))
```

`len(order) == len(graph)` is the cycle test, and it costs one comparison. Every
node inside a cycle keeps a positive in-degree forever, because the thing that
would decrement it is downstream of itself. So the loop drains and the output is
short.

:::insight{title="`ready` is a work queue, and that is not a metaphor"}
Kahn's algorithm is what a build system does. `ready` is the set of tasks whose
inputs exist; popping one is scheduling it; decrementing in-degrees is a task
completing and unblocking its dependents. Swap the deque for a thread pool and
you have parallel `make` — the algorithm does not change, only who pops.

That is also why the *size* of `ready` matters in practice: it is the amount of
work available to run concurrently at that moment, and a build whose `ready` set
never exceeds one is a build that cannot be parallelised no matter how many
cores you buy.
:::

## DFS post-order: emit on the way out

The other construction runs a depth-first search and appends each node *after*
its descendants are finished. Reverse the result.

```python runnable id=dfs-topo
DEPS = {
    "config":   ["parser", "server"],
    "parser":   ["compiler"],
    "compiler": ["server", "cli"],
    "server":   ["cli"],
    "cli":      [],
    "docs":     ["cli"],
}
WHITE, GREY, BLACK = 0, 1, 2

def dfs_topological(graph):
    colour = {node: WHITE for node in graph}
    postorder = []

    def visit(u):
        colour[u] = GREY
        for v in graph[u]:
            if colour[v] == GREY:
                raise ValueError(f"cycle through {u} -> {v}")
            if colour[v] == WHITE:
                visit(v)
        colour[u] = BLACK
        postorder.append(u)          # AFTER the children, not before

    for node in graph:
        if colour[node] == WHITE:
            visit(node)
    return postorder[::-1]

print(dfs_topological(DEPS))
try:
    dfs_topological({"a": ["b"], "b": ["c"], "c": ["a"]})
except ValueError as exc:
    print("ValueError:", exc)
```

Why reversing post-order works, in one sentence: a node is appended only once
every node reachable from it is already appended, so in the post-order list
every node comes *after* everything it depends on — and reversing puts it
before them.

The grey check is the cycle detector, and it is the same grey from lesson 2.
Delete it and the function still returns a list. It will just be wrong, silently,
which is worse than an exception.

**Which one to write.** Kahn if you want layers, parallelism, or a cycle report
that names the stuck nodes — the leftovers are exactly the nodes in or
downstream of cycles. DFS if you are already writing a DFS for something else,
or if you need reverse post-order anyway, which you do for strongly connected
components (lesson 6). They produce different valid orders; both are correct.

:::checkpoint{id=cp-topo rubric="a cycle means no valid order exists,kahn detects it by emitting fewer nodes than the graph has,dfs detects it by finding an edge to a grey node"}
A colleague's `topological_sort` returns a list for every input, including
graphs with cycles. What is wrong with that, and what are the two places the
check belongs — one for each algorithm above?
:::

## A DAG hiding in the registry

The package graph from lesson 2 is undirected, so it has no topological order.
Orient it and it does: draw an edge from the older package to the newer one
whenever they share a maintainer. Time only runs one way, so the result cannot
contain a cycle.

```sql runnable id=the-dag dataset=package-registry
SELECT DISTINCT p.name AS earlier, q.name AS later
FROM package_maintainers a
JOIN package_maintainers b ON a.maintainer_id = b.maintainer_id
JOIN packages p ON p.id = a.package_id
JOIN packages q ON q.id = b.package_id
WHERE p.created_at < q.created_at
ORDER BY earlier, later
LIMIT 8;
```

28 edges over 20 nodes, and it is acyclic by construction: every edge points
strictly forward in time, so following edges can never bring you back.

Now the layers. In a recursive CTE, the anchor member is the set of nodes with
no incoming edge — Kahn's initial `ready` set — and each round of the recursive
member is one step further from a source.

```sql runnable id=dag-layers dataset=package-registry
WITH RECURSIVE dag AS (
  SELECT DISTINCT a.package_id AS src, b.package_id AS dst
  FROM package_maintainers a
  JOIN package_maintainers b ON a.maintainer_id = b.maintainer_id
  JOIN packages p ON p.id = a.package_id
  JOIN packages q ON q.id = b.package_id
  WHERE p.created_at < q.created_at
),
layer(node, depth) AS (
  SELECT p.id, 0                              -- ANCHOR: in-degree zero
  FROM packages p
  WHERE NOT EXISTS (SELECT 1 FROM dag d WHERE d.dst = p.id)
  UNION
  SELECT d.dst, l.depth + 1
  FROM layer l JOIN dag d ON d.src = l.node
  WHERE l.depth < 20                          -- guard; see below
),
node_layer AS (
  SELECT node, max(depth) AS build_layer      -- MAX: the longest path from a source
  FROM layer GROUP BY node
)
SELECT nl.build_layer, count(*) AS n, string_agg(p.name, ', ' ORDER BY p.name) AS packages
FROM node_layer nl JOIN packages p ON p.id = nl.node
GROUP BY nl.build_layer
ORDER BY nl.build_layer;
```

Six sources at layer 0, and `dagrun` alone at layer 5. Note `max(depth)`, not
`min`: a topological layer is the length of the **longest** path from any source,
because a node is only ready once its slowest dependency is done. Take the
minimum instead and you get "earliest possible arrival", which is a different
and usually wrong answer for scheduling.

:::warning{title="The layer number is a longest path, and that is why it is not BFS"}
Everything else in this stage takes `min` over the fixpoint. This one takes
`max`, and the difference is the whole distinction between "how soon could I
reach this?" and "how late is this blocked until?". Kahn's algorithm gets the
same number by only assigning a node's layer once its in-degree hits zero —
which is the node-at-a-time way of saying "after the longest predecessor".
:::

## What a cycle does to the query

The recursive CTE has no way to notice a cycle by itself. It just never reaches
a fixed point, and the depth guard is what stops it. That gives you a test: on a
DAG with $V$ nodes, no path is longer than $V - 1$ edges, so if the query
produces a row at depth $V$ the graph is not a DAG.

```sql runnable id=cycle-verdict dataset=package-registry
WITH RECURSIVE nodes(n) AS (VALUES ('a'), ('b'), ('c'), ('d'), ('e')),
edges(src, dst) AS (
  VALUES ('a','b'), ('b','c'), ('c','b'), ('c','d'), ('e','a')   -- b <-> c
),
layer(node, depth) AS (
  SELECT n, 0 FROM nodes WHERE NOT EXISTS (SELECT 1 FROM edges WHERE dst = n)
  UNION
  SELECT e.dst, l.depth + 1
  FROM layer l JOIN edges e ON e.src = l.node
  WHERE l.depth < 5                     -- 5 nodes, so 5 is one more than any DAG path
)
SELECT max(depth) AS deepest,
       CASE WHEN max(depth) >= 5 THEN 'cycle' ELSE 'DAG' END AS verdict
FROM layer;
```

`deepest = 5`, verdict `cycle`. Delete the `('c','b')` edge and rerun: the
answer becomes `4`, `DAG` — a genuine longest path `e → a → b → c → d`, one
short of the bound.

:::pitfall{title="Kahn's algorithm does not fit in a recursive CTE"}
It is tempting to write the anchor as "in-degree zero" and the recursive member
as "nodes all of whose predecessors are already in the result". That second
condition needs to look at the **accumulated** result, and a recursive member
can only see the rows the *previous round* produced. It has no name for
everything found so far.

So what the query above computes is not Kahn's peeling — it is reachability from
the sources, with `max(depth)` recovering the layer afterwards. On a DAG the two
agree. On a cyclic graph they do not: Kahn leaves the cycle's nodes unemitted
and you detect it by counting, while the CTE happily walks round the cycle and
you detect it by watching the depth run away. This is the first sighting of a
restriction that lesson 5 turns into the reason Dijkstra has no SQL form.
:::

::::track{depth=interview}
## Recognising it

The phrasing barely varies. If a problem says any of these, it is a topological
sort:

- "course schedule" / "prerequisites" — the canonical two, and the second part
  is always "return the order" after the first part was "is it possible".
- "build order", "task scheduling with dependencies", "package installation
  order", "compile these modules".
- "alien dictionary" — extract the ordering constraints from adjacent words,
  then topologically sort the letters. The graph is hidden and building it is
  most of the work.
- anything where the answer is "return any valid ordering", which is the tell
  that the answer is not unique.

**The two things to say out loud.**

First: "Is a cycle possible? If so, what should I return?" Asking this before you
write anything signals that you know the problem is only well-posed on a DAG.
The expected answer is an empty list, or `False`, or an exception — but you get
credit for asking, not for guessing.

Second: "$O(V + E)$ — every node enters the ready queue once and every edge is
relaxed once when its source is emitted."

**The follow-up you should expect** is "what if there are several valid orders
and I want a specific one?" Swap the deque for a heap and Kahn's algorithm emits
the lexicographically smallest topological order, at $O((V + E)\log V)$. It is a
two-character change and it is the standard second half of the question.

:::interview{title="The trap in the input format"}
Half of these problems hand you edges as `[dependency, dependent]` and half as
`[dependent, dependency]`, and the two differ only in the direction of every
arrow. Reversing them by mistake produces a perfectly valid topological order of
the reversed graph, which passes small hand-checked examples and fails the real
tests. Write down which direction your `graph[u]` list means before you write
the loop — "u must come before everything in graph[u]" — and check it against
the first example.
:::
::::

:::exercise{ref=topological-order}
:::

:::exercise{ref=build-layers}
:::

:::quiz{id=quiz-l03 passing=2}
- id: q1
  prompt: "Kahn's algorithm finishes with 7 nodes emitted from a 10-node graph. What does that mean?"
  options:
    - "Three nodes were unreachable from any source and should be appended at the end."
    - "The queue was drained too early; re-running from a different start fixes it."
    - "Three nodes are in or downstream of a cycle, so no valid topological order exists."
    - "The graph has three connected components."
  answerIndex: 2
  explanation: >-
    A node leaves the queue only when its in-degree reaches zero, and a node on
    a cycle is waiting on something that is waiting on it. Those never clear,
    and neither does anything downstream of them. The unreachable-node option is
    the tempting one, but an in-degree-zero node is by definition a source and
    would have started in the queue.
- id: q2
  prompt: "Why does reversing DFS post-order give a topological order?"
  options:
    - "Because DFS visits nodes in order of increasing depth."
    - "Because a node is appended only after everything reachable from it, so reversing puts it before all of them."
    - "Because the recursion stack happens to be sorted."
    - "Because post-order is alphabetical within each subtree."
  answerIndex: 1
  explanation: >-
    The append happens after the neighbour loop finishes, so every descendant is
    already in the list. That means each node sits after its dependents in
    post-order and therefore before them once reversed. Depth ordering is BFS's
    property, not DFS's, and nothing here sorts anything.
- id: q3
  prompt: "A recursive CTE layers a DAG from its in-degree-zero nodes. What happens if the graph turns out to have a cycle?"
  options:
    - "The engine detects the cycle and raises an error."
    - "`UNION` deduplicates the repeated nodes, so it terminates with the cycle's nodes omitted."
    - "It walks the cycle forever, producing ever-deeper rows, until the depth guard stops it."
    - "The anchor member returns no rows, so the result is empty."
    - "It terminates, because a cycle is always a single connected component."
  answerIndex: 2
  explanation: >-
    The rows carry a depth that only increases, so `(b, 3)` and `(b, 5)` are
    distinct and `UNION` never dedupes them away. The engine has no cycle
    detector; the guard is the whole safety mechanism. That also gives you the
    test — a row at depth V on a V-node graph cannot come from a DAG. The empty
    anchor option is a real failure mode, but only when *every* node has an
    incoming edge.
:::
