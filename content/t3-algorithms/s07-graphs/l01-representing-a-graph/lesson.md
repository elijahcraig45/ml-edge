---
id: t3/s07/l01
title: Four ways to store a graph
tier: t3-algorithms
stage: s07-graphs
status: published
estimatedMinutes: 45
objectives:
  - Convert between an edge list, an adjacency list, an adjacency matrix and CSR.
  - Pick a representation from the graph's density and the operation you run most.
  - Explain why a join table and an edge list are the same object under two names.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"A graph is a special kind of data you have to go and find.\"** Almost every join table you have ever written is an edge list. `package_maintainers` has two foreign keys and nothing else; that is the definition of an edge. The graph was always there — what changes is whether you ask reachability questions of it."
  - "**\"The adjacency matrix is the simple one, so start there.\"** It is the simple one to *write* and the expensive one to *own*. It costs $V^2$ cells whether or not you have any edges, so on a million-node graph it is a terabyte of mostly zeros before you store a single relationship."
  - "**\"An adjacency list is a dict of lists, full stop.\"** That is the teaching representation. Every production graph library — SciPy, PyTorch Geometric, DGL, Neo4j's store — uses CSR or something very like it, because a dict of lists scatters each neighbourhood across the heap and a graph algorithm is nothing but neighbourhood scans."
masteryChecklist:
  - Given $V$ and $E$, I can say which representation uses less memory and by roughly how much.
  - I can build a CSR pair (`indptr`, `indices`) from an edge list without looking it up.
  - I can name the one question an adjacency matrix answers faster than anything else.
runtimes:
  - engine: python
  - engine: duckdb
    datasetId: package-registry
---

A graph is two sets: things, and pairs of things. Everything else in this stage
is a consequence of how you choose to store the second set.

That choice is not cosmetic. The same algorithm over the same graph can be
instant or impossible depending on it, and the four options below are not
interchangeable — each one makes exactly one question cheap.

## The four

```python runnable id=four-representations
# A tiny directed graph: 0 -> 1, 0 -> 2, 1 -> 2, 2 -> 3, 3 -> 0
n = 4
edge_list = [(0, 1), (0, 2), (1, 2), (2, 3), (3, 0)]

# 1. Edge list — literally the pairs. Nothing is indexed.
print("edge list:  ", edge_list)

# 2. Adjacency list — for each node, who it points at.
adjacency = [[] for _ in range(n)]
for u, v in edge_list:
    adjacency[u].append(v)
print("adjacency:  ", adjacency)

# 3. Adjacency matrix — a V x V grid of 0/1.
matrix = [[0] * n for _ in range(n)]
for u, v in edge_list:
    matrix[u][v] = 1
for row in matrix:
    print("matrix:     ", row)
```

Each answers a different question without doing any work:

| Representation | Free question | Costly question |
| --- | --- | --- |
| Edge list | "give me every edge" | "who does node 7 point at?" |
| Adjacency list | "who does node 7 point at?" | "is there an edge 7 → 12?" |
| Adjacency matrix | "is there an edge 7 → 12?" | "who does node 7 point at?" — you scan a whole row |
| CSR | "who does node 7 point at?", fast and contiguous | adding an edge |

Traversal — BFS, DFS, Dijkstra, everything in the next four lessons — asks
*"who does node 7 point at?"* once per node. That is why the adjacency list is
the default, and why the matrix, despite being the easiest to draw, is the
wrong answer for most real graphs.

## Density decides it

Let $V$ be the number of nodes and $E$ the number of edges. An adjacency
matrix costs $\Theta(V^2)$ regardless of $E$. An adjacency list costs
$\Theta(V + E)$.

The matrix wins only when $E$ approaches $V^2$ — a **dense** graph. Real graphs
are almost never dense. A social network where everyone has 300 friends out of
a billion users has $E/V^2 \approx 3 \times 10^{-7}$: the matrix would be
99.99997% zeros.

```python runnable id=density-cost
def matrix_cells(v):
    return v * v

def list_cells(v, e):
    return v + e

for v, avg_degree in [(100, 50), (10_000, 8), (1_000_000, 30)]:
    e = v * avg_degree
    m, l = matrix_cells(v), list_cells(v, e)
    verdict = "matrix" if m < l else "adjacency list"
    print(f"V={v:>9,}  avg degree {avg_degree:>3}  matrix={m:>16,}  list={l:>12,}  -> {verdict}")
```

The 100-node graph with average degree 50 is the only one where the matrix
wins, and that is a graph half of whose possible edges exist. Note the middle
row: ten thousand nodes with eight neighbours each is a *hundred million* matrix
cells against ninety thousand list entries.

:::insight{title="The one thing the matrix is for"}
$O(1)$ edge existence, and matrix multiplication. $A^k[i][j]$ counts the walks
of length exactly $k$ from $i$ to $j$, which turns a graph question into a
linear-algebra question — and that is the entire foundation of spectral graph
methods and of message passing in graph neural networks. If your algorithm is
`A @ x`, you want the matrix. If your algorithm is a loop over neighbours, you
do not.
:::

## The edge list you already have

Open any relational schema and look for a table whose columns are two foreign
keys. That table is an edge list. `package_maintainers` links packages to
maintainers and holds nothing else of structural interest.

```sql runnable id=edge-list-is-a-table dataset=package-registry
SELECT package_id, maintainer_id, role
FROM package_maintainers
ORDER BY package_id, maintainer_id
LIMIT 8;
```

That is a **bipartite** graph: two kinds of node, and every edge crosses
between the kinds. A package is never adjacent to a package, and a maintainer
is never adjacent to a maintainer.

Bipartite graphs are usually not the graph you want to traverse. What you want
is the **projection** — one of the two node types, connected when they share a
neighbour on the other side. Two packages are adjacent when some person
maintains both.

```sql runnable id=project-to-packages dataset=package-registry
-- The projection: a self-join through the shared maintainer.
SELECT DISTINCT
  a.package_id AS src,
  b.package_id AS dst
FROM package_maintainers a
JOIN package_maintainers b ON a.maintainer_id = b.maintainer_id
WHERE a.package_id <> b.package_id
ORDER BY src, dst
LIMIT 10;
```

The self-join is the projection, and `a.package_id <> b.package_id` is what
stops every package being adjacent to itself. Run it without the `DISTINCT` if
two packages ever shared two maintainers and you would get that pair twice —
here they never do, so the projection has 56 directed rows, 28 undirected pairs.

:::warning{title="Projections inflate"}
A maintainer who owns $k$ packages contributes $k(k-1)$ directed edges to the
projection. One prolific maintainer with 100 packages produces 9,900 edges from
100 rows. This is the same fan-out that makes bipartite projections dangerous
in recommender systems: a single popular item can dominate the projected graph.
When you project, look at the degree distribution before you trust it.
:::

```sql runnable id=adjacency-list-in-sql dataset=package-registry
-- The same graph, as an adjacency list. GROUP BY is the "for each node" loop.
WITH edges AS (
  SELECT DISTINCT a.package_id AS src, b.package_id AS dst
  FROM package_maintainers a
  JOIN package_maintainers b ON a.maintainer_id = b.maintainer_id
  WHERE a.package_id <> b.package_id
)
SELECT p.name, count(*) AS degree, string_agg(q.name, ', ' ORDER BY q.name) AS neighbours
FROM edges e
JOIN packages p ON p.id = e.src
JOIN packages q ON q.id = e.dst
GROUP BY p.name
ORDER BY degree DESC, p.name
LIMIT 6;
```

`chunker` and `keyspace` have degree 5. Look at `bitmask`, `hashring`,
`keyspace`, `probe` and `radixsort`: every one of them is adjacent to the other
four. That is a 5-clique, and it exists because `linus` maintains four of them.
Cliques are what projections manufacture.

:::checkpoint{id=cp-representation rubric="edge list is the join table,adjacency list groups by source,matrix costs V squared regardless of E,traversal asks for neighbours so the list wins"}
Without scrolling back: you have a graph of 2 million nodes and 30 million
edges, and your algorithm is a breadth-first traversal. Which representation,
and what is the single number that decides it?
:::

## CSR: the adjacency list, flattened

A Python adjacency list is a list of lists. Every inner list is a separate heap
allocation somewhere else in memory. Walking a node's neighbours means chasing
a pointer, and a graph algorithm does nothing but walk neighbours.

**Compressed sparse row** stores the same information in two flat arrays:

- `indices` — every neighbour of node 0, then every neighbour of node 1, …
  concatenated into one array of length $E$.
- `indptr` — where each node's slice begins, length $V + 1$.

Node `u`'s neighbours are `indices[indptr[u] : indptr[u + 1]]`. That is a
contiguous slice of one array.

```python runnable id=build-csr
n = 4
edge_list = [(0, 1), (0, 2), (1, 2), (2, 3), (3, 0)]

# Pass 1: count out-degrees.
degree = [0] * n
for u, _ in edge_list:
    degree[u] += 1

# Pass 2: prefix sums give the slice boundaries.
indptr = [0] * (n + 1)
for u in range(n):
    indptr[u + 1] = indptr[u] + degree[u]

# Pass 3: fill, using a moving cursor per node.
indices = [0] * len(edge_list)
cursor = indptr[:n]
for u, v in edge_list:
    indices[cursor[u]] = v
    cursor[u] += 1

print("indptr :", indptr)
print("indices:", indices)
for u in range(n):
    print(f"neighbours of {u}: {indices[indptr[u]:indptr[u + 1]]}")
```

Three passes, no nested lists, and the whole graph is two arrays you can
`mmap`, send over a socket, or hand to a GPU. The `indptr` array is a prefix
sum — the same primitive that turns a histogram into bucket offsets in radix
sort.

The cost is rigidity. Adding one edge to node 0 means shifting every subsequent
entry of `indices` and incrementing $V$ entries of `indptr`. CSR is for graphs
you build once and traverse many times, which describes almost every graph in a
machine-learning pipeline and almost no graph in an OLTP database.

::::track{depth=systems}
## What actually uses CSR

`scipy.sparse.csr_matrix` is exactly the two arrays above plus a third, `data`,
holding the edge weights. So is `torch.sparse_csr_tensor`. PyTorch Geometric's
default `edge_index` is a COO edge list, and its first move before message
passing is often to sort and convert to CSR, because sparse matrix–vector
multiply is a CSR loop:

```python
for u in range(n):
    acc = 0.0
    for k in range(indptr[u], indptr[u + 1]):   # one contiguous run
        acc += data[k] * x[indices[k]]
    y[u] = acc
```

The inner loop reads `data` and `indices` sequentially. The hardware prefetcher
sees a linear stride and keeps the pipeline fed. The only unpredictable access
is `x[indices[k]]`, and that is the term every sparse-linear-algebra paper of
the last thirty years is trying to make cache-friendlier — by reordering
vertices (Reverse Cuthill–McKee), by blocking, by partitioning the graph so
each partition's `x` fits in L2.

Two consequences worth carrying:

**Vertex numbering is a performance decision.** Renumbering so that adjacent
vertices get nearby ids shrinks the working set of `x[indices[k]]`. Graph
partitioners (METIS) exist to do this, and a 2–5x speedup from renumbering
alone is ordinary.

**The edge list is the interchange format; CSR is the working format.** Parquet
files, Kafka topics and database tables all hold edges as pairs, because pairs
append. The first thing a graph system does on load is sort by source and build
`indptr`. Sorting is the conversion — the same prefix-sum-over-counts you wrote
above is a counting sort in disguise.
::::

:::exercise{ref=csr-from-edges}
:::

:::exercise{ref=maintainer-adjacency}
:::

:::quiz{id=quiz-l01 passing=2}
- id: q1
  prompt: "A graph has 1,000,000 nodes and 20,000,000 edges. Roughly how much bigger is the adjacency matrix than the adjacency list?"
  options:
    - "About 20x — the matrix stores each edge twice."
    - "About the same — both scale with the number of edges."
    - "About 47,000x — the matrix is $10^{12}$ cells against $2.1 \\times 10^7$ list entries."
    - "The matrix is smaller, because a single bit per cell beats a pointer per edge."
  answerIndex: 2
  explanation: >-
    The matrix cost is $V^2 = 10^{12}$ and does not depend on $E$ at all. The
    list cost is $V + E = 2.1 \times 10^7$. The bit-packing option is the
    tempting one and it does not save you: $10^{12}$ bits is still 125 GB, and
    the list at one 4-byte integer per entry is 84 MB.
- id: q2
  prompt: "In CSR, what are the neighbours of node `u`?"
  options:
    - "`indices[u]` — one entry per node."
    - "`indptr[indices[u] : indices[u + 1]]` — the arrays are used the other way round."
    - "Every `k` where `indices[k] == u`."
    - "`indices[indptr[u] : indptr[u + 1]]` — a contiguous slice."
  answerIndex: 3
  explanation: >-
    `indptr` holds slice boundaries and `indices` holds the concatenated
    neighbour runs, so node `u` owns `indices` positions `indptr[u]` up to
    `indptr[u+1]`. Scanning for every `k` with `indices[k] == u` finds
    *in*-neighbours instead, which
    CSR of the forward graph does not give you cheaply — that is what the CSR of
    the transposed graph is for.
- id: q3
  prompt: "Why is `package_maintainers` a bipartite graph rather than the package graph you want to traverse?"
  options:
    - "Because it has three columns instead of two."
    - "Because every edge joins a package to a maintainer, so no two packages are ever adjacent."
    - "Because it contains NULLs."
    - "Because it is a many-to-many relation, and graphs must be one-to-many."
  answerIndex: 1
  explanation: >-
    The node set splits into packages and maintainers, and every edge crosses
    the split. A BFS from a package would alternate package, maintainer,
    package — so to get package-to-package adjacency you project by self-joining
    through the shared maintainer. Many-to-many is not the problem; it is
    exactly what makes the projection interesting.
:::
