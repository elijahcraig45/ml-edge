---
id: t2/s06/l08
title: Union-find, the forest that only points up
tier: t2-core-structures
stage: s06-trees-and-indexes
status: published
estimatedMinutes: 45
objectives:
  - Represent disjoint sets as a forest of parent pointers and implement find and union.
  - Explain what union by rank buys and what path compression buys, separately.
  - State the amortised bound for the two together and say why it is effectively constant.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"Union-find is a graph algorithm.\"** It is a data structure for the *equivalence relation* — which things are in the same group. It shows up inside graph algorithms because connectivity is an equivalence relation, but it also does deduplication, entity resolution, type unification and image segmentation, none of which involve a graph."
  - "**\"Path compression is an optimisation you add if it is slow.\"** Without it, `find` is $O(\\log n)$; with it, the amortised cost is effectively constant. It is three lines and it changes the complexity class. There is no situation where you write union-find and leave it out."
  - "**\"The rank is the size of the tree.\"** Rank is an upper bound on the *height*, and after path compression the tree is usually much shorter than its rank suggests. Ranks are never decreased, because recomputing them would cost more than the slack does. Union by *size* is a different, equally valid rule that tracks a different number."
masteryChecklist:
  - I can implement find and union with both optimisations from memory, in under fifteen lines.
  - I can say what the worst-case cost is with neither optimisation, with each one alone, and with both.
  - Given a problem statement, I can recognise "merge groups and ask whether two things are in the same one" as union-find rather than as a traversal.
runtimes:
  - engine: python
---

Every tree so far was built to be searched. This one is not. A union-find tree
has no ordering, no balance rule you would recognise, and no way to walk
downward — the children do not know they exist. Each node stores one pointer
upward, and the only question you can ask is "what is the root?"

That is enough to answer, for a stream of merges, whether two items have ended
up in the same group. Nothing else does that in nearly constant time.

## Two operations, one array

Every element points at a parent. A root points at itself and *is* the group's
name. `find(x)` climbs to the root; `union(a, b)` points one root at the other.

```python runnable id=naive-union-find
class Naive:
    def __init__(self, n):
        self.parent = list(range(n))    # everyone is their own root

    def find(self, x):
        steps = 0
        while self.parent[x] != x:
            x, steps = self.parent[x], steps + 1
        return x, steps

    def union(self, a, b):
        root_a, _ = self.find(a)
        root_b, _ = self.find(b)
        if root_a != root_b:
            self.parent[root_a] = root_b

ds = Naive(8)
for a, b in [(0, 1), (1, 2), (3, 4), (5, 6)]:
    ds.union(a, b)

print("parent array:", ds.parent)
print("0 and 2 together:", ds.find(0)[0] == ds.find(2)[0])
print("0 and 3 together:", ds.find(0)[0] == ds.find(3)[0])
print("climbing from 0 took", ds.find(0)[1], "steps")
```

Correct, and one insertion order away from useless. Union `(0,1)`, then
`(1,2)`, then `(2,3)`, and each union hangs the previous root under the new
element: the forest becomes a single chain and `find` becomes a linear walk.
It is the sorted-input failure from lesson 2, in a structure with no ordering
to blame it on.

Two independent fixes exist. Each one alone is enough to make the structure
usable; together they make it almost free.

## Fix one: union by rank

Do not attach arbitrarily. Keep a **rank** per root — an upper bound on its
tree's height — and hang the shorter tree under the taller one. Only when the
two ranks are equal does the result get taller, and then by exactly one.

```python
if rank[root_a] < rank[root_b]:
    root_a, root_b = root_b, root_a     # make root_a the taller one
parent[root_b] = root_a
if rank[root_a] == rank[root_b]:
    rank[root_a] += 1
```

The height can now only increase when two equally tall trees merge, which
requires the node count to double. That is the whole argument, and it makes
**rank $r$ imply at least $2^r$ nodes** — so no rank exceeds $\log_2 n$, and
`find` is $O(\log n)$ in the worst case.

## Fix two: path compression

You climbed from `x` to the root. Every node you passed is in the same set as
the root, so point them all straight at it on the way back. The next `find` on
any of them is one step.

```python runnable id=compression
class DisjointSet:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.count = n                 # number of distinct sets

    def find(self, x):
        root = x
        while self.parent[root] != root:
            root = self.parent[root]
        while self.parent[x] != root:  # second pass: flatten the path
            self.parent[x], x = root, self.parent[x]
        return root

    def union(self, a, b):
        root_a, root_b = self.find(a), self.find(b)
        if root_a == root_b:
            return False
        if self.rank[root_a] < self.rank[root_b]:
            root_a, root_b = root_b, root_a
        self.parent[root_b] = root_a
        if self.rank[root_a] == self.rank[root_b]:
            self.rank[root_a] += 1
        self.count -= 1
        return True

# A chain, hand-built: exactly what the naive version above produces from
# union(0,1), union(1,2), ... 9 is the root.
chained = DisjointSet(10)
chained.parent = [1, 2, 3, 4, 5, 6, 7, 8, 9, 9]
print("a chain        :", chained.parent)
chained.find(0)
print("after find(0)  :", chained.parent)

# The same nine unions under union by rank, which never builds a chain at all.
ranked = DisjointSet(10)
for i in range(9):
    ranked.union(i, i + 1)
print("union by rank  :", ranked.parent)
print("distinct sets  :", ranked.count)
```

Watch the first array. One `find` rewrites the whole path it walked, so the
work of climbing is paid once and never again — and the third line shows that
union by rank would not have built that chain in the first place. The two fixes
attack the same problem from opposite ends: rank stops tall trees forming,
compression flattens the ones you have already walked. This is amortised analysis in its purest
form: an individual `find` may be slow, but it makes every future `find` on
those nodes fast, and the total across a sequence of operations is what matters.

:::insight{title="The two-pass find is the readable one"}
`find` above walks up twice: once to locate the root, once to repoint the path.
The recursive one-liner — `parent[x] = find(parent[x]); return parent[x]` — does
the same thing and is $O(h)$ stack frames deep, which on the chain this lesson
is about means a `RecursionError`. There is also *path halving*, a single pass
that points each node at its grandparent; it gives the same asymptotic bound
with one loop and is what most library implementations use.
:::

:::checkpoint{id=cp-two-fixes rubric="union by rank keeps the tree from getting taller than log n,path compression flattens a path after you have walked it,union by rank alone gives O(log n) and both give effectively constant"}
Say what union by rank buys and what path compression buys — separately, then
together. What is the cost of `find` with only one of the two?
:::

## What "almost constant" means

With both optimisations, a sequence of $m$ operations on $n$ elements costs
$O(m\,\alpha(n))$, where $\alpha$ is the inverse Ackermann function. Tarjan
proved the bound in 1975 and later showed it is tight — no pointer-based
structure can do better.

$\alpha$ grows so slowly that it is a constant for every input that will ever
exist:

| $n$ | $\alpha(n)$ |
| --- | --- |
| $0 \le n \le 2$ | 0 |
| $n = 3$ | 1 |
| $4 \le n \le 7$ | 2 |
| $8 \le n \le 2047$ | 3 |
| $2048 \le n \le A_4(1)$ | 4 |

$A_4(1)$ is a tower of powers of two more than two thousand levels tall. The
number of atoms in the observable universe is about $2^{266}$. So for any input
that can exist, $\alpha(n) \le 4$ — union-find is constant time with a proof
attached rather than a shrug.

Note what this is *not*: it is not $O(1)$ per operation, and it is amortised
rather than worst case. A single `find` can still walk $O(\log n)$ steps. What
is bounded is the total over a sequence, which is the honest thing to promise
about a structure that pays for its speed by cleaning up after itself.

:::pitfall{title="Union-find cannot un-union"}
There is no `split`. Path compression has already destroyed the information you
would need — the tree's shape after the merge does not record which elements
came from which side. If the problem requires removing edges as well as adding
them, you need a different structure (a link-cut tree, or offline processing of
the operations in reverse), and recognising that early saves an afternoon.
:::

## Where it shows up in data work

The relational counterpart is not a join. It is **transitive grouping**: rows
that are linked directly or indirectly belong to one cluster.

Deduplication is the everyday case. Three matcher rules fire — same email, same
phone, same normalised address — and each produces pairs of record ids that
refer to one person. `GROUP BY` cannot merge these, because the relation is not
equality on a column: A matches B by email and B matches C by phone, so A and C
are the same person even though nothing directly links them. Union-find over the
match pairs produces the clusters in one pass.

In SQL you would reach for a recursive CTE, which walks the same relation with a
fixed point iteration and costs a join per iteration. Union-find does it in one
pass with an array, which is why the batch entity-resolution step of a pipeline
is usually a union-find outside the database rather than a `WITH RECURSIVE`
inside it.

::::track{depth=proof}
## Why union by rank alone gives $O(\log n)$

The inverse-Ackermann bound for the two optimisations combined is genuinely
hard — Tarjan's proof runs for pages. The bound for union by rank on its own is
four lines and contains the whole idea, so prove that.

**Theorem.** Under union by rank with no path compression, a tree whose root has
rank $r$ contains at least $2^r$ nodes.

**Proof.** By induction on the sequence of `union` operations.

*Base case.* Before any union, every element is a root of rank 0 in a tree of
one node, and $2^0 = 1$.

*Inductive step.* Consider a `union` that produces a root of rank $r$. Ranks
change in only one situation. If the two roots have different ranks, the taller
root keeps its rank and its tree only gains nodes, so the claim survives for it
unchanged. So a root of rank $r$ can only be created by merging two roots of
rank $r-1$. By the inductive hypothesis each of those trees had at least
$2^{r-1}$ nodes, and they are disjoint, so the merged tree has at least

$$2^{r-1} + 2^{r-1} = 2^{r}$$

nodes. $\blacksquare$

**Corollary 1.** In a structure of $n$ elements, no rank exceeds $\log_2 n$ —
otherwise a tree would contain more than $n$ nodes.

**Corollary 2.** Union by rank keeps rank an upper bound on height (a merge
either leaves the taller root's height alone, or increases both height and rank
by one). So the height is at most $\log_2 n$, and `find` costs $O(\log n)$.

**The shape of the argument.** This is the same argument as the AVL bound in
lesson 3, with a cleaner recurrence. There, a tree of height $h$ needed at least
$F_{h+2}-1$ nodes and the growth rate was $\varphi \approx 1.618$; here the
growth rate is exactly 2, because union by rank has no slack to spend. In both
cases the technique is identical: bound the *minimum size* for a given height,
then invert it to bound the height for a given size. When you meet a new
balanced structure, that is the proof to try first.

**What compression adds, stated honestly.** Path compression alone — no ranks —
also gives $O(\log n)$ amortised. The two together give $O(\alpha(n))$
amortised, and the proof is Tarjan's potential-function argument over rank
classes, which is real mathematics and not a summation you can do in a lesson.
The result is worth knowing exactly; the derivation is worth knowing *of*.
::::

::::track{depth=interview}
## Recognising this in an interview

The trigger is a problem where **groups merge and never split**, and the
question is membership rather than a path. Say the words "disjoint set" out
loud when you see one; the recognition is most of the credit.

Canonical appearances:

- **"Number of connected components"** / **"number of islands"** / **"number of
  provinces."** Union everything adjacent, then count distinct roots. Keep a
  counter that decrements on each successful union rather than scanning at the
  end.
- **"Find the edge that creates a cycle"** (redundant connection). Process
  edges in order; the first edge whose two endpoints already share a root closes
  a cycle. This is the exercise below.
- **"Accounts merge" / "email deduplication."** The entity-resolution problem
  above, in interview clothing.
- **Kruskal's minimum spanning tree.** Sort the edges, add one whenever it joins
  two different components. Union-find is the only interesting part of the
  algorithm.

The comparison to have ready: BFS or DFS also finds connected components, in
$O(V+E)$, and needs the whole graph in memory first. Union-find processes edges
**as they arrive** and answers connectivity queries interleaved with them. If
the problem is a stream, or if queries and merges are mixed, traversal is the
wrong answer and saying why is the signal.

:::interview{title="The follow-up you should expect"}
"Can you also support removing an edge?" No — not with this structure, and the
reason is worth stating: path compression has already thrown away which
elements arrived from which side. The answers are a link-cut tree, or processing
the operations offline in reverse so that deletions become insertions. Knowing
the boundary of a structure is worth as much as knowing the structure.
:::
::::

:::exercise{ref=disjoint-set}
:::

:::exercise{ref=redundant-connection}
:::

:::quiz{id=quiz-l08 passing=2}
- id: q1
  prompt: "You implement union-find with path compression but attach roots arbitrarily, ignoring rank. What is the worst-case cost of a find?"
  options:
    - "O(n) — without union by rank the tree can become a chain."
    - "O(log n) amortised — path compression alone already flattens the structure enough."
    - "O(1) worst case — compression makes every path length one."
    - "The same as with no optimisation at all."
  answerIndex: 1
  explanation: >-
    Path compression alone gives O(log n) amortised; union by rank alone gives
    O(log n) worst case; together they give O(alpha(n)) amortised. Compression
    cannot make every path length one, because a find only flattens the path it
    actually walked — nodes hanging off that path are untouched.
- id: q2
  prompt: "What does the rank of a root actually bound?"
  options:
    - "The number of elements in its set."
    - "The height of its tree — and a tree of rank r has at least 2^r nodes, which is what caps rank at log2(n)."
    - "The number of times that set has been unioned."
    - "The distance from the root to its most recently added element."
  answerIndex: 1
  explanation: >-
    Rank is an upper bound on height. Merging two roots of equal rank is the
    only way rank increases, and it also doubles the minimum node count — so
    rank r forces at least 2^r nodes and rank can never exceed log2(n). Set
    size is what union *by size* tracks, a different and equally valid rule.
- id: q3
  prompt: "Three matching rules link customer records: A-B by email, B-C by phone, C-D by address. How many customers are these four records?"
  options:
    - "Three, one per matching rule."
    - "One — the relation is transitive, so all four records belong to a single cluster, which is exactly what union-find computes."
    - "Four, because no single rule links all of them."
    - "It cannot be determined without ranking the rules by reliability."
  answerIndex: 1
  explanation: >-
    Each rule contributes a pair, and the pairs chain: A-B-C-D is one component.
    GROUP BY cannot find this because the relation is not equality on any single
    column — A and D share no matching attribute at all. Union-find merges the
    pairs in one pass; the SQL equivalent is a recursive CTE, which pays a join
    per iteration.
:::
