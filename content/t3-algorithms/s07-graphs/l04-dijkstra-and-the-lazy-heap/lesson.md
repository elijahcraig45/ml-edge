---
id: t3/s07/l04
title: Dijkstra, and the heap you cannot decrease
tier: t3-algorithms
stage: s07-graphs
status: published
estimatedMinutes: 50
objectives:
  - Implement Dijkstra with a lazy-deletion heap and explain what each stale entry is doing there.
  - Say why a node's distance is final on pop but not on push, and what breaks if you confuse them.
  - Show, on a four-node graph, why a single negative edge makes the algorithm wrong.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"Mark a node visited when you push it, like in BFS.\"** In BFS the first time you reach a node you have reached it optimally, so push-time marking is safe. With weights it is not: a cheap two-hop route can beat an expensive one-hop route, and marking on push freezes the expensive one. This single line is the most common wrong answer to \"implement Dijkstra\"."
  - "**\"Python's heapq needs a decrease-key, so you have to write your own heap or track indices.\"** You do not. You push the improved distance as a *new* entry and ignore the old one when it surfaces. The heap grows to $O(E)$ instead of $O(V)$, which changes the bound from $E \\log V$ to $E \\log E$ — and $\\log E \\le 2 \\log V$, so it is the same complexity class."
  - "**\"Negative weights just need a bigger number added to every edge.\"** Adding a constant $c$ to every edge adds $c \\cdot (\\text{number of hops})$ to a path's cost, so it penalises long paths and can change which path is shortest. There is a reweighting that works — Johnson's algorithm — and it needs a Bellman-Ford run first to compute the right per-node potentials."
  - "**\"A stale heap entry is a bug you should clean up.\"** It is the design. Removing it would require finding it, which a binary heap cannot do in less than linear time. Leaving it and testing for it on pop costs one comparison."
masteryChecklist:
  - I can write Dijkstra with `heapq` from memory, including the stale-entry check.
  - I can construct a four-node graph on which push-time marking gives the wrong distance.
  - I can state where the correctness proof uses non-negativity.
runtimes:
  - engine: python
---

Give the edges weights and breadth-first search stops answering the question.

```python runnable id=bfs-is-wrong-now
from collections import deque

# a --10--> b        a --1--> c --1--> b
GRAPH = {"a": [("b", 10), ("c", 1)], "b": [("d", 1)], "c": [("b", 1)], "d": []}

def bfs_hops(graph, source):
    dist = {source: 0}
    queue = deque([source])
    while queue:
        u = queue.popleft()
        for v, _weight in graph[u]:
            if v not in dist:
                dist[v] = dist[u] + 1
                queue.append(v)
    return dist

print("BFS hops :", bfs_hops(GRAPH, "a"))
print("b is 1 hop away, and the 1-hop route costs 10.")
print("The 2-hop route a -> c -> b costs 2.")
```

BFS is correct about hops and irrelevant about cost. The fix is not a new
algorithm; it is a different container. BFS pops the node that was *inserted*
earliest. Dijkstra pops the node that is *closest*. Everything else — the
relaxation, the distance map, the neighbour loop — is unchanged.

## The version you should write

```python runnable id=dijkstra-lazy
import heapq

GRAPH = {
    "a": [("b", 4), ("c", 2)],
    "b": [("d", 5)],
    "c": [("b", 1), ("d", 8), ("e", 10)],
    "d": [("e", 2), ("f", 6)],
    "e": [("f", 3)],
    "f": [],
}

def dijkstra(graph, source):
    dist = {source: 0}
    heap = [(0, source)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist.get(u, float("inf")):
            print(f"  stale pop ({d}, {u!r}) — dist[{u!r}] is already {dist[u]}")
            continue                          # this entry was superseded
        for v, weight in graph[u]:
            if d + weight < dist.get(v, float("inf")):
                dist[v] = d + weight
                heapq.heappush(heap, (d + weight, v))   # push, never decrease-key
    return dist

print(dijkstra(GRAPH, "a"))
```

Six nodes, and four stale pops. That is not a defect; it is how the algorithm
is written in Python, and the two lines that make it work are worth taking
apart.

### Why you push a duplicate

The textbook Dijkstra keeps a priority queue of every unfinished node and calls
`decrease-key` when it finds a better route to one of them. `heapq` has no
`decrease-key`, and it cannot easily have one: a binary heap in a flat list
gives you no way to find where node `v` currently sits without scanning.

The alternatives are all worse than the obvious hack:

- **Maintain a position index** — a dict from node to heap slot, updated on
  every sift. Doable, roughly forty lines, and every one of them is a chance to
  break the heap invariant.
- **Rebuild the heap after each update** — $O(V)$ per relaxation.
- **Push a second entry and let the stale one rot.** One line.

The third is called **lazy deletion**, and it is the standard Python idiom. The
heap holds at most one entry per *edge relaxation* rather than one per node, so
it grows to $O(E)$ — but $\log E \le \log V^2 = 2 \log V$, so the running time
stays $O(E \log V)$.

### Why the stale check is `d > dist[u]`

When `(d, u)` surfaces, `d` is the cost this entry was pushed with. `dist[u]` is
the best cost found since. If a better route was discovered after this entry was
pushed, then `d > dist[u]`, and expanding `u` from `d` cannot improve anything —
every neighbour would be offered `d + weight`, which is worse than the
`dist[u] + weight` already on the table.

Skipping it is not merely an optimisation. Without the check the algorithm still
returns correct distances, but it re-expands nodes from obsolete distances and
loses the guarantee that each node is expanded once — which is the guarantee the
$O(E \log V)$ bound rests on.

:::insight{title="Popped is final. Pushed is a guess."}
The moment a node comes off the heap and survives the stale check, its distance
is settled and will never improve. The moment it goes *on* the heap, its
distance is the best guess so far and may well improve.

BFS blurs this because in an unweighted graph the guess is always right. Dijkstra
does not have that luxury, and every bug in the next section comes from
forgetting it.
:::

## The bug: marking visited on push

```python runnable id=push-time-marking-bug
import heapq

GRAPH = {"a": [("b", 10), ("c", 1)], "b": [("d", 1)], "c": [("b", 1)], "d": []}

def dijkstra_wrong(graph, source):
    """Marks nodes seen when they are PUSHED. Looks like BFS. Is not Dijkstra."""
    dist = {source: 0}
    seen = {source}
    heap = [(0, source)]
    while heap:
        d, u = heapq.heappop(heap)
        for v, weight in graph[u]:
            if v in seen:
                continue          # <- b gets frozen at 10 here
            seen.add(v)
            dist[v] = d + weight
            heapq.heappush(heap, (d + weight, v))
    return dist

print("wrong  :", dijkstra_wrong(GRAPH, "a"))
print("correct: {'a': 0, 'b': 2, 'c': 1, 'd': 3}")
```

`b` is pushed with cost 10 while `a` is being expanded. It is now in `seen`, so
when `c` later offers it a route costing 2, the `continue` throws that away. The
error propagates: `d` inherits it and comes out at 11 instead of 3.

The function returns confidently, with plausible numbers, on every input. Nothing
raises. This is why it survives code review.

:::checkpoint{id=cp-final-on-pop rubric="a node's distance is final when it is popped,not when it is pushed,because a cheaper multi-hop route may still be found,marking on push freezes the first route discovered"}
State the rule in one sentence: at what moment does Dijkstra know a node's
distance is final, and why is the other moment tempting?
:::

## Why the weights must be non-negative

Dijkstra is greedy. It pops the closest unfinished node and declares it done, on
the reasoning that nothing further away could lead back to it more cheaply. A
negative edge breaks exactly that reasoning.

```python runnable id=negative-edge-breaks-it
import heapq

# s -2-> a -6-> t      s -5-> b -(-4)-> a
NEG = {"s": [("a", 2), ("b", 5)], "a": [("t", 6)], "b": [("a", -4)], "t": []}

def dijkstra_textbook(graph, source):
    """Finalises each node on pop, exactly as the algorithm is defined."""
    dist = {source: 0}
    done = set()
    heap = [(0, source)]
    while heap:
        d, u = heapq.heappop(heap)
        if u in done:
            continue
        done.add(u)                      # u is settled, forever
        for v, weight in graph[u]:
            if v not in done and d + weight < dist.get(v, float("inf")):
                dist[v] = d + weight
                heapq.heappush(heap, (d + weight, v))
    return dist

print("dijkstra says t =", dijkstra_textbook(NEG, "s")["t"])
print("but s -> b -> a -> t costs", 5 - 4 + 6)
```

`a` is popped at distance 2 and marked done. Later `b` is popped at 5 and offers
`a` a route costing 1 — but `a` is finished, and Dijkstra's whole premise is
that finished means finished. The answer for `t` comes out 8 instead of 7.

:::pitfall{title="Dropping the `done` set does not fix it, it changes the algorithm"}
The lazy version at the top of this lesson has no `done` set, and on this
particular graph it happens to produce 7 — because without finalisation it just
keeps re-relaxing until nothing improves.

That is not Dijkstra being robust. That is the algorithm silently degenerating
into repeated relaxation, which is Bellman-Ford's idea run in a heap-shaped
order (the SPFA variant). It gives up the "each node expanded once" guarantee,
and on adversarial graphs with negative edges it can take exponential time. It
also still cannot detect a negative cycle; it just spins.

So: if the weights can be negative, do not reach for Dijkstra and hope. Use
Bellman-Ford, which is the next lesson, and which answers "is there a negative
cycle?" as part of its contract.
:::

::::track{depth=proof}
## Why the greedy choice is safe

Let $w(u, v) \ge 0$ for every edge and let $\delta(s, v)$ be the true shortest
distance from the source. Write $d[v]$ for the algorithm's current estimate.

Two facts hold throughout and are worth separating out.

**Invariant A.** $d[v] \ge \delta(s, v)$ always. Every assignment
$d[v] \leftarrow d[u] + w(u, v)$ makes $d[v]$ the cost of a genuine $s \to v$
walk, and no walk is cheaper than the minimum.

**Invariant B.** If $d[u] = \delta(s, u)$ and edge $(u, v)$ has been relaxed
since that value was set, then $d[v] \le \delta(s, u) + w(u, v)$. This is what
relaxation does, by definition.

**Theorem.** When a node $u$ is removed from the priority queue,
$d[u] = \delta(s, u)$.

*Proof.* Suppose not, and let $u$ be the **first** node popped with
$d[u] > \delta(s, u)$. Then $\delta(s, u)$ is finite, so a shortest path
$P: s \to \dots \to u$ exists. Note $u \ne s$, since $d[s] = 0 = \delta(s, s)$.

Walk along $P$ from $s$ and let $y$ be the first node on it that has **not** yet
been popped. Such a $y$ exists because $u$ itself is unpopped at this moment. Let
$x$ be $y$'s predecessor on $P$; $x$ has been popped (possibly $x = s$).

Because $u$ is the first node popped with a wrong estimate, $x$ was popped with
$d[x] = \delta(s, x)$. At that moment the algorithm relaxed edge $(x, y)$, so by
Invariant B,
$$d[y] \le \delta(s, x) + w(x, y) = \delta(s, y),$$
the equality holding because $P$ is a shortest path and every prefix of a
shortest path is a shortest path. With Invariant A this forces
$d[y] = \delta(s, y)$.

Now use non-negativity. The portion of $P$ from $y$ to $u$ has total weight
$\ge 0$, so
$$\delta(s, y) \le \delta(s, u).$$

Finally, $y$ is in the queue at the moment $u$ is popped, and $u$ was popped
because it had the minimum key. So
$$d[u] \le d[y] = \delta(s, y) \le \delta(s, u).$$

That contradicts $d[u] > \delta(s, u)$. $\square$

**Where non-negativity is used, precisely.** One line:
$\delta(s, y) \le \delta(s, u)$. It says a prefix of a shortest path costs no
more than the whole path. With a negative edge on the $y \to u$ stretch, the
prefix can cost *more* than the whole, the chain of inequalities snaps, and the
greedy choice loses its justification. That is the entire content of "Dijkstra
requires non-negative weights" — one inequality in one proof.

**What the proof does not need.** It never assumes the graph is finite in any
special way, never assumes edges are distinct, and never assumes the heap holds
one entry per node. That last point is why lazy deletion is safe: extra stale
entries change which *entry* has the minimum key, but the surviving entry for
each node still carries $d[\cdot]$, and the stale check discards the rest before
they can expand anything.
::::

::::track{depth=interview}
## Saying it out loud

**The recognition trigger** is "shortest", "cheapest", "minimum cost" or
"fastest" together with edges that are *not* all the same. Network delay time,
cheapest flights, path with maximum probability (take $-\log p$ and it is a sum
again), swim in rising water — all Dijkstra.

**The first question to ask** is "can any weight be negative?" If yes, say
Bellman-Ford. If no, say Dijkstra. Asking is worth as much as answering.

**The complexity line:** $O(E \log V)$ with a binary heap. Be ready for "why not
$O(E + V \log V)$?" — that is the Fibonacci-heap bound, which needs a real
`decrease-key`. It is better asymptotically and slower in practice for anything
short of enormous, because the constants are dreadful.

**The lazy-heap line**, which is the one that separates people who have written
this from people who have read it:

> "Python's `heapq` has no `decrease-key`, so instead of updating an entry I
> push a new one and skip stale entries when they pop. The heap grows to $O(E)$
> rather than $O(V)$, but $\log E$ is at most $2 \log V$, so the bound is
> unchanged."

Then write the check — `if d > dist[u]: continue` — and say what it is for.

:::interview{title="Two follow-ups that are not Dijkstra"}
**"Shortest path with at most $k$ stops."** Not Dijkstra. The greedy choice
assumes a node has one best distance; here a node has a best distance *per
number of stops used*, and a longer-but-cheaper prefix can be useless because it
spent its budget. Bellman-Ford relaxed exactly $k + 1$ times answers it
directly, one round per stop.

**"Return the path, not just the cost."** Keep a `parent` dict updated in the
same branch that updates `dist`, then walk it backwards — the same trick as the
BFS exercise in lesson 2. Update it *only* where you update `dist`, or the
parent chain will disagree with the distances and you will get a path whose cost
is not the cost you reported.
:::
::::

:::exercise{ref=dijkstra-lazy-heap}
:::

:::quiz{id=quiz-l04 passing=2}
- id: q1
  prompt: "Why does the Python implementation push duplicate heap entries for the same node?"
  options:
    - "To keep the heap balanced as nodes are removed."
    - "Because `heapq` has no decrease-key, so an improved distance is pushed as a new entry and the old one is skipped when it pops."
    - "Because each entry represents a different path, and all of them are needed to reconstruct the route."
    - "It is a bug in the common implementation that a `visited` set is meant to work around."
  answerIndex: 1
  explanation: >-
    A binary heap in a flat list cannot locate an arbitrary node without
    scanning, so there is nothing to decrease. Pushing a superseded entry and
    testing `d > dist[u]` on pop costs one comparison and keeps the bound at
    $O(E \log V)$. The entries are not paths — only the best distance per node
    is ever kept.
- id: q2
  prompt: "A Dijkstra implementation marks a node as seen when it is pushed, and skips seen nodes. On the graph a→b (10), a→c (1), c→b (1), what does it report for b?"
  options:
    - "10 — b is frozen at the first route found, and the cheaper route through c is discarded."
    - "2 — the correct answer; push-time marking is equivalent."
    - "11 — it adds both routes."
    - "It loops forever."
  answerIndex: 0
  explanation: >-
    Expanding `a` pushes `b` at 10 and marks it seen. When `c` is expanded and
    offers `b` a route costing 2, the seen check rejects it. Nothing raises and
    the number looks reasonable, which is what makes this bug durable. Marking
    on pop — after the stale check — is the fix.
- id: q3
  prompt: "Where exactly does Dijkstra's correctness proof use the assumption that weights are non-negative?"
  options:
    - "In showing that the heap always has a minimum element."
    - "In showing that a prefix of a shortest path costs no more than the whole path, which is what lets the popped node's estimate be compared to the target's."
    - "In showing that distances are integers."
    - "In showing that every node is pushed at least once."
    - "It does not; non-negativity is only needed for the complexity bound, not for correctness."
  answerIndex: 1
  explanation: >-
    The single step is $\delta(s, y) \le \delta(s, u)$ for $y$ on a shortest
    path to $u$. It holds because the remaining stretch has non-negative total
    weight. Allow a negative edge and a prefix can cost more than the whole
    path, which breaks the chain of inequalities — and the failure is in
    correctness, not in speed.
:::
