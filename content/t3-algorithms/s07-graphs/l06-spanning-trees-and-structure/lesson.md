---
id: t3/s07/l06
title: Spanning trees, two-colourings, and strong connectivity
tier: t3-algorithms
stage: s07-graphs
status: published
estimatedMinutes: 50
objectives:
  - Build a minimum spanning tree with Kruskal over a union-find you have written yourself.
  - Explain how Prim and Kruskal are two schedules of the same greedy rule.
  - Decide whether a graph is bipartite by two-colouring, and say what an odd cycle has to do with it.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"An MST contains the shortest path between every pair.\"** It does not, and it is not close. On a triangle with weights 1, 1, 3 the MST is the two edges of weight 1, so the pair joined by the weight-3 edge is 2 apart in the tree — fine here, but make the weights 1, 1, 1.9 and the tree path costs 2 where the direct edge costs 1.9. An MST minimises *total* weight, not any individual distance."
  - "**\"Union-find needs a tree structure with pointers.\"** It is one array. `parent[x]` holds the index of x's parent, and the root is the element whose parent is itself. The entire data structure is that array plus two functions."
  - "**\"Path compression is an optimisation you can add later.\"** Without it, `find` is $O(\\log n)$ at best and $O(n)$ if you also skip union by size — and a Kruskal over a million edges calls `find` two million times. With both, the amortised cost is inverse Ackermann, which is under 5 for any input that fits in the universe."
  - "**\"Bipartite means two connected components.\"** It means the *nodes* split into two groups with every edge crossing between them. A bipartite graph is usually connected. The test is a two-colouring, and the obstruction is an odd cycle — a triangle is connected, has one component, and is not bipartite."
masteryChecklist:
  - I can write union-find with path compression and union by size from memory.
  - I can say why taking the lightest edge crossing any split of the nodes is always safe, and use that to justify both Kruskal and Prim.
  - Given a graph, I can decide bipartiteness by BFS two-colouring and name the edge that proves it is not.
runtimes:
  - engine: python
  - engine: duckdb
    datasetId: package-registry
---

A minimum spanning tree is the cheapest set of edges that keeps a graph
connected. On a weighted graph with $V$ nodes it always has exactly $V - 1$
edges, because that is the number a tree on $V$ nodes has — one fewer than the
nodes, no cycles, everything reachable.

Two algorithms build it, and they are the same idea run in different orders.

## Kruskal, and the union-find that makes it work

Sort the edges by weight. Take each in turn, and keep it if its two endpoints
are not already connected.

"Already connected" is the whole problem. Checking it with a traversal per edge
would cost $O(E \cdot (V+E))$ and swamp the sort. The structure that answers it
in near-constant time is **union-find**, and it is small enough to write inline.

```python runnable id=kruskal
EDGES = [
    (2, "arrowkit", "chunker"),   (3, "chunker", "lazyseq"),
    (1, "arrowkit", "skiplist"),  (7, "chunker", "indexer"),
    (4, "arrowkit", "graphwalk"), (9, "graphwalk", "dagrun"),
    (6, "lazyseq", "skiplist"),   (5, "chunker", "quickselect"),
    (8, "indexer", "quickselect"),
]

class DisjointSet:
    def __init__(self, items):
        self.parent = {x: x for x in items}   # a root is its own parent
        self.size = {x: 1 for x in items}

    def find(self, x):
        root = x
        while self.parent[root] != root:
            root = self.parent[root]
        while self.parent[x] != root:         # path compression: flatten on the way back
            self.parent[x], x = root, self.parent[x]
        return root

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False                      # already together: this edge is a cycle
        if self.size[ra] < self.size[rb]:     # union by size: hang small under large
            ra, rb = rb, ra
        self.parent[rb] = ra
        self.size[ra] += self.size[rb]
        return True

def kruskal(nodes, edges):
    ds = DisjointSet(nodes)
    tree, total = [], 0
    for weight, u, v in sorted(edges):
        if ds.union(u, v):
            tree.append((u, v, weight))
            total += weight
    return tree, total

nodes = sorted({n for _, u, v in EDGES for n in (u, v)})
tree, total = kruskal(nodes, EDGES)
for u, v, w in tree:
    print(f"  {u:12} — {v:12} {w}")
print(f"{len(tree)} edges over {len(nodes)} nodes, total weight {total}")
```

Seven edges over eight nodes, total 31. `union` returning `False` is the cycle
test: the endpoints already share a root, so adding the edge would close a loop.

**The two tricks, and why each one matters.**

*Union by size* hangs the smaller tree under the larger root. That bounds any
element's depth by $\log n$, because an element's depth only increases when its
tree is merged into a bigger one, which at least doubles the size it belongs to.

*Path compression* rewrites every node on the search path to point straight at
the root. The first `find` down a long chain pays for it; every later one is a
single step.

Together the amortised cost per operation is $O(\alpha(n))$, where $\alpha$ is
the inverse Ackermann function. It is below 5 for any $n$ you will ever have —
not constant, but unimprovably close, and Tarjan proved that no
pointer-based structure can do better.

:::pitfall{title="The recursive `find` that blows the stack"}
The tidy version is `return x if parent[x] == x else find(parent[x])`, with the
compression written as `parent[x] = find(parent[x])`. It is correct and it
recurses to the depth of the tree. Before compression has had a chance to run —
which is exactly the first traversal of a long chain — that depth can be
thousands, and Python raises `RecursionError` at around a thousand frames. The
two-loop iterative form above has no such limit.
:::

## Prim: grow one tree instead of many

Kruskal builds a forest that gradually merges. Prim keeps one tree and
repeatedly adds the cheapest edge leaving it — which is a heap, and the same
lazy-deletion pattern as Dijkstra.

```python runnable id=prim
import heapq

EDGES = [
    (2, "arrowkit", "chunker"),   (3, "chunker", "lazyseq"),
    (1, "arrowkit", "skiplist"),  (7, "chunker", "indexer"),
    (4, "arrowkit", "graphwalk"), (9, "graphwalk", "dagrun"),
    (6, "lazyseq", "skiplist"),   (5, "chunker", "quickselect"),
    (8, "indexer", "quickselect"),
]

def prim(edges, start):
    adjacency = {}
    for w, u, v in edges:
        adjacency.setdefault(u, []).append((w, v))
        adjacency.setdefault(v, []).append((w, u))

    in_tree = {start}
    heap = list(adjacency[start])
    heapq.heapify(heap)
    total, picked = 0, []
    while heap:
        w, v = heapq.heappop(heap)
        if v in in_tree:
            continue                       # stale: v joined by a cheaper edge
        in_tree.add(v)
        total += w
        picked.append((v, w))
        for nw, nv in adjacency[v]:
            if nv not in in_tree:
                heapq.heappush(heap, (nw, nv))
    return picked, total

print(prim(EDGES, "arrowkit"))
```

Total 31 again — and on this graph the same seven edges, because all the weights
are distinct and **a graph with distinct edge weights has exactly one MST.**
Introduce a tie and the two algorithms can legitimately disagree about which of
two equal edges to take, while still agreeing on the total.

Which to write: Kruskal when the edges arrive as a list and you are happy to
sort, $O(E \log E)$; Prim when the graph is dense and given as adjacency, where
the heap version is $O(E \log V)$ and a simple array scan is $O(V^2)$ — which
beats the heap once $E$ approaches $V^2$.

::::track{depth=proof}
## The cut property, and why one theorem covers both algorithms

Assume all edge weights are distinct. (Ties do not break anything; they just
turn "the MST" into "an MST" and make the statement wordier.)

**Definition.** A *cut* is a partition of the vertices into $S$ and
$V \setminus S$, both non-empty. An edge *crosses* the cut if one endpoint is in
each side.

**Cut property.** For any cut, the minimum-weight edge crossing it belongs to
the MST.

*Proof (exchange argument).* Let $e = (u, v)$ be the lightest edge crossing the
cut, with $u \in S$ and $v \notin S$. Suppose some spanning tree $T$ of minimum
weight does not contain $e$.

$T$ is a tree, so it contains a unique path $P$ from $u$ to $v$. $P$ starts
inside $S$ and ends outside it, so at least one of its edges crosses the cut;
call it $f$. Since $e$ is the lightest crossing edge and weights are distinct,
$w(e) < w(f)$.

Form $T' = T - f + e$. Removing $f$ splits $T$ into two components, one holding
$u$ and one holding $v$ — they were joined only through $f$, because a tree has
no second route. Adding $e$ reconnects exactly those two components. So $T'$ is
connected, still has $V - 1$ edges, and is therefore a spanning tree. Its weight
is $w(T) - w(f) + w(e) < w(T)$, contradicting the minimality of $T$. $\square$

**Kruskal obeys it.** When Kruskal accepts edge $e = (u, v)$, take $S$ to be the
component currently containing $u$. Every edge lighter than $e$ has already been
examined; each was either accepted (and so lies *inside* a component, not
crossing this cut) or rejected for joining two nodes already connected (also
inside). So no lighter edge crosses the cut $(S, V \setminus S)$, making $e$ the
lightest crossing edge — and the cut property says it belongs.

**Prim obeys it.** Take $S$ to be the tree built so far. Prim's rule *is*
"choose the lightest edge crossing $(S, V\setminus S)$", literally, once per
step. There is nothing more to check.

So the two algorithms are the same greedy rule applied to different cuts:
Kruskal picks the cut implied by the next lightest usable edge; Prim fixes the
cut and looks for the edge. That is the entire relationship, and it is why
neither needs a separate correctness proof.

**The companion theorem.** The *cycle property*: for any cycle, the
heaviest edge on it is in no MST. (Same exchange, run backwards — delete the
heavy edge, and the rest of the cycle still connects its endpoints.) Together
the two properties decide the membership of every edge, which is another way of
seeing why the MST is unique when weights are distinct.

**Why this argument is worth carrying around.** "Assume an optimal solution
without my greedy choice, exchange one element, get something no worse" is the
standard proof technique for greedy algorithms in general. Huffman coding,
interval scheduling and fractional knapsack are all proved this way. The cut
property is the cleanest instance of it.
::::

## Bipartite, and the odd cycle that forbids it

A graph is **bipartite** when its nodes can be split into two groups such that
every edge crosses between them. Equivalently: it can be two-coloured. And
equivalently again: it has no cycle of odd length.

```python runnable id=bipartite
from collections import deque

def is_bipartite(graph):
    colour = {}
    for start in graph:
        if start in colour:
            continue
        colour[start] = 0
        queue = deque([start])
        while queue:
            u = queue.popleft()
            for v in graph[u]:
                if v not in colour:
                    colour[v] = 1 - colour[u]
                    queue.append(v)
                elif colour[v] == colour[u]:      # an edge inside one side
                    return False
    return True

registry = {"p1": ["m1", "m2"], "m1": ["p1"], "m2": ["p1", "p2"], "p2": ["m2"]}
triangle = {"a": ["b", "c"], "b": ["a", "c"], "c": ["a", "b"]}
print("package/maintainer graph:", is_bipartite(registry))
print("triangle:                ", is_bipartite(triangle))
```

It is BFS with `1 - colour[u]` in place of `dist[u] + 1`, and the failure
condition is an edge between two nodes of the same colour. The outer loop matters:
a disconnected graph must be checked component by component, and forgetting that
gives you "bipartite" for any graph whose first component happens to be.

The odd-cycle connection is immediate once you see the colouring as parity. BFS
gives every node a colour equal to its distance from the start, mod 2. An edge
between two same-coloured nodes closes a walk of even + even + 1 = odd length.
So a same-coloured edge *is* an odd cycle, and vice versa.

`package_maintainers` is bipartite by construction — packages on one side,
maintainers on the other, every row crossing. Its projection is emphatically not:

```sql runnable id=triangles-kill-bipartiteness dataset=package-registry
WITH edges AS (
  SELECT DISTINCT a.package_id AS lo, b.package_id AS hi
  FROM package_maintainers a
  JOIN package_maintainers b ON a.maintainer_id = b.maintainer_id
  WHERE a.package_id < b.package_id
)
-- A triangle is a 3-cycle: odd, so it rules out any two-colouring.
SELECT p1.name AS a, p2.name AS b, p3.name AS c
FROM edges e1
JOIN edges e2 ON e2.lo = e1.hi
JOIN edges e3 ON e3.lo = e1.lo AND e3.hi = e2.hi
JOIN packages p1 ON p1.id = e1.lo
JOIN packages p2 ON p2.id = e1.hi
JOIN packages p3 ON p3.id = e2.hi
ORDER BY a, b, c
LIMIT 6;
```

17 triangles in the projection, and one is enough. The three-way self-join with
`lo < hi` on each edge is the standard triangle-counting query, and it is also
the standard example of why naive triangle counting is expensive: the
intermediate join can be far larger than the answer.

:::checkpoint{id=cp-bipartite rubric="a two colouring exists iff there is no odd cycle,bfs colours by distance parity,an edge between same-coloured nodes closes an odd cycle,every component must be checked"}
Explain, without using the word "bipartite", why finding an edge between two
nodes at the same BFS parity proves no two-colouring exists.
:::

## Strongly connected components

In a directed graph, "connected" splits into two questions. **Weakly connected**
ignores direction. **Strongly connected** means every node can reach every other
*following the arrows*, and the maximal such groups are the strongly connected
components.

Kosaraju's algorithm finds them with two depth-first passes:

1. DFS the graph, recording nodes in post-order — the same post-order that gave
   topological sort in lesson 3.
2. Reverse every edge, then DFS again taking start nodes in *reverse* post-order.
   Each traversal in this second pass covers exactly one SCC.

```python runnable id=kosaraju
def strongly_connected(graph):
    order, seen = [], set()

    def visit(u):                       # pass 1: post-order on the original graph
        seen.add(u)
        for v in graph[u]:
            if v not in seen:
                visit(v)
        order.append(u)

    for node in graph:
        if node not in seen:
            visit(node)

    reverse = {n: [] for n in graph}    # pass 2: same DFS on the transposed graph
    for u in graph:
        for v in graph[u]:
            reverse[v].append(u)

    component = {}

    def collect(u, root):
        component[u] = root
        for v in reverse[u]:
            if v not in component:
                collect(v, root)

    for node in reversed(order):
        if node not in component:
            collect(node, node)

    groups = {}
    for node, root in component.items():
        groups.setdefault(root, []).append(node)
    return sorted(sorted(g) for g in groups.values())

print(strongly_connected({
    "a": ["b"], "b": ["c"], "c": ["a", "d"], "d": ["e"], "e": ["d"], "f": ["e"],
}))
```

Three components: `{a, b, c}`, `{d, e}` and `{f}` alone, because `f` reaches `e`
but nothing reaches `f`.

The intuition for the second pass: reverse post-order visits the components in
topological order of the *component graph* (which is always a DAG — contract
each SCC to a point and no cycle can remain). Reversing the edges then prevents
a traversal from leaking into a component it should not, because in the reversed
graph those exits have become entrances the traversal already came from. Tarjan's
algorithm gets the same answer in one pass with a stack of low-link values; it is
harder to remember and roughly twice as fast.

:::insight{title="Contracting SCCs is how you rescue a cyclic dependency graph"}
Condense every SCC to a single node and what remains is guaranteed acyclic — so
it has a topological order. That is exactly what a build system does when it
reports "circular dependency between A, B and C": it found an SCC of size
greater than one, and it names the whole component because no member can be
built before the others. Lesson 3 said a cycle makes topological sort
unanswerable; SCC condensation is the standard way of turning that into a
useful error message instead of a failure.
:::

:::exercise{ref=kruskal-mst}
:::

:::exercise{ref=bipartite-check}
:::

:::quiz{id=quiz-l06 passing=2}
- id: q1
  prompt: "In Kruskal's algorithm, what does `union(u, v)` returning False mean?"
  options:
    - "One of the two nodes is not in the graph."
    - "u and v are already connected, so this edge would close a cycle and must be skipped."
    - "The edge weight is negative."
    - "The tree already has V-1 edges and is complete."
  answerIndex: 1
  explanation: >-
    `find(u) == find(v)` says the two are in the same component already, so a
    path between them exists and adding a second one creates a cycle. That is
    the entire cycle test — no traversal needed. A completed tree is detected by
    counting accepted edges, not by union's return value.
- id: q2
  prompt: "Why is a graph containing a triangle never bipartite?"
  options:
    - "Because triangles have three edges and bipartite graphs need an even number."
    - "Because a two-colouring forces adjacent nodes to differ, and three mutually adjacent nodes cannot be coloured with two colours."
    - "Because the triangle is a connected component and bipartite graphs must be disconnected."
    - "Because the third edge is always the heaviest."
  answerIndex: 1
  explanation: >-
    Colour a, then b must differ, then c must differ from both — and with only
    two colours there is nowhere left. The general statement is that any
    odd-length cycle blocks a two-colouring, and a triangle is the smallest one.
    Bipartite graphs are very often connected; that option confuses bipartite
    with disconnected.
- id: q3
  prompt: "Which statement about a minimum spanning tree is true?"
  options:
    - "The path between two nodes in the MST is a shortest path between them."
    - "The MST always contains the globally lightest edge and the globally heaviest edge."
    - "The MST minimises the total weight of the edges kept, and says nothing about individual pairwise distances."
    - "Every graph has exactly one MST."
  answerIndex: 2
  explanation: >-
    The objective is the sum over kept edges. A tree path can be much longer than
    the direct edge, which the MST may have discarded. The lightest edge is
    always in an MST; the heaviest need not be. Uniqueness holds only when the
    weights are distinct.
:::
