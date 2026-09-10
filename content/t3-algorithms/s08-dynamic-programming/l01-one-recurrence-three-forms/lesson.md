---
id: t3/s08/l01
title: One recurrence, three forms
tier: t3-algorithms
stage: s08-dynamic-programming
status: published
estimatedMinutes: 45
objectives:
  - Write one recurrence as plain recursion, as recursion plus a memo, and as a bottom-up table, and say precisely what changed between them.
  - State the overlapping-subproblems condition as a count of distinct subproblems rather than as a feeling that something repeats.
  - State optimal substructure precisely enough to check it against a candidate recurrence, and name a problem where it fails.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"Dynamic programming means filling in a table.\"** The table is a container for a memo, and the memo is an optimisation. What makes an algorithm a dynamic program is a recurrence with optimal substructure over a state space small enough to enumerate. You can have all of that and store it in a dict."
  - "**\"If a function is recursive, memoizing it will speed it up.\"** Merge sort is recursive and memoizing it buys nothing, because it never asks the same question twice. Repetition is the trigger, not recursion. The test is whether the number of *distinct* arguments is far smaller than the number of calls."
  - "**\"Top-down and bottom-up are just style preferences.\"** They compute the same recurrence, but top-down visits only the states the input actually reaches and bottom-up visits all of them. On a sparse state space that is a real asymptotic difference, in the opposite direction from the one people expect."
  - "**\"Once the answers are cached the algorithm is correct.\"** Caching changes the running time and nothing else. If the recurrence is wrong — if the best solution to a subproblem is not part of the best solution overall — memoizing it produces the wrong answer faster."
masteryChecklist:
  - Given a recursive solution, I can add a memo keyed on exactly the arguments that vary, and predict how many entries it will hold.
  - I can convert that memoized version into a bottom-up loop and justify the evaluation order.
  - I can state optimal substructure for a specific problem and sketch why it holds.
  - I can name a problem that has overlapping subproblems but no optimal substructure, and say what goes wrong.
runtimes:
  - engine: python
---

A dynamic program is two things: a recurrence you can prove correct, and
somewhere to write down answers you have already worked out. The grid everyone
draws is the second thing. If you learn the grid first you will spend years
matching new problems to half-remembered pictures instead of deriving them.

This lesson takes one problem and writes it three ways. The three differ only in
*when* subproblems get evaluated. The recurrence does not change at all.

## The problem, and its recurrence

A build system ships a payload in fixed-size blocks. You are given a set of
block sizes $S$ and a payload of exactly $t$ kilobytes. Use as few blocks as
possible; a size may be reused as often as you like.

Let $f(t)$ be the fewest blocks summing to exactly $t$.

$$
f(t) = \begin{cases}
0 & t = 0 \\[2pt]
\infty & t < 0 \\[2pt]
1 + \min\limits_{s \in S} f(t - s) & t > 0
\end{cases}
$$

The $\infty$ is not decoration. It is how "this branch overshot and there is no
solution down here" participates in a `min` without a special case.

Read literally, that definition is already a program.

```python runnable id=naive
INF = float("inf")

def fewest(target, sizes):
    if target == 0:
        return 0
    if target < 0:
        return INF
    return 1 + min(fewest(target - s, sizes) for s in sizes)

print(fewest(12, (1, 3, 4)))   # 3  -> 4 + 4 + 4
print(fewest(11, (1, 3, 4)))   # 3  -> 4 + 4 + 3
```

Correct, and unusable. Watch why.

```python runnable id=call-census
INF = float("inf")
calls = 0
seen = set()

def fewest(target, sizes):
    global calls
    calls += 1
    seen.add(target)
    if target == 0:
        return 0
    if target < 0:
        return INF
    return 1 + min(fewest(target - s, sizes) for s in sizes)

for t in (10, 12, 15, 20):
    calls = 0
    seen = set()
    fewest(t, (1, 3, 4))
    print(f"target {t:>3}:  {calls:>7,} calls   {len(seen):>3} distinct arguments")
```

At `target = 20` the function is called 38,446 times with 24 distinct arguments.
Every call after the first 24 is re-deriving something already derived. The
calls grow like a power of the branching factor; the distinct arguments grow
like $t$.

That gap is the entire opportunity. Everything else in this lesson is
bookkeeping.

## Overlapping subproblems, stated so you can check it

:::insight{title="The condition, precisely"}
A recursive decomposition has **overlapping subproblems** when the number of
*distinct* subproblem instances reachable from the root is small — polynomial in
the input size — while the recursion tree that visits them is not.
:::

The word people get wrong is "recursive". Merge sort is recursive and splits its
input as enthusiastically, and memoizing it buys nothing: each recursive
call gets a different slice, so the memo would be all misses and pure overhead.
Recursion is not the trigger. Repetition is.

The test is mechanical, and you ran it a moment ago: count calls, count distinct
arguments, look at the ratio. If it is close to 1, a memo is dead weight. If it
grows with the input, you have found a dynamic program.

## Form two: the same function, with a memo

```python runnable id=memoized
INF = float("inf")

def fewest_memo(target, sizes):
    cache = {}
    calls = [0]

    def f(t):
        calls[0] += 1
        if t == 0:
            return 0
        if t < 0:
            return INF
        if t in cache:
            return cache[t]
        cache[t] = 1 + min(f(t - s) for s in sizes)
        return cache[t]

    answer = f(target)
    return answer, calls[0], len(cache)

for t in (20, 200, 2000):
    answer, calls, entries = fewest_memo(t, (1, 3, 4))
    print(f"target {t:>5}: answer {answer}, {calls:>6,} calls, {entries:>5} memo entries")
```

The line that matters is `if t in cache: return cache[t]`. It is a *cut* in the
recursion tree: everything below that node was already explored once, and the
answer is a lookup rather than a subtree.

Two details worth keeping:

- The memo is keyed on `t` alone, because `t` is the only argument that varies
  across calls. `sizes` is the same on every call, so putting it in the key
  would only make the key bigger. Choosing that key is the subject of the next
  lesson, and it is the part people get wrong.
- `functools.lru_cache` will do this for you in one decorator. Write it by hand
  once anyway, because the decorator hides exactly the thing you need to be able
  to reason about — how many entries the cache will hold.

## Form three: fill the table bottom-up

The memo is a map from state to answer. So is an array. If you can order the
states so that every state's dependencies come earlier, you can drop the
recursion entirely and walk the array forward.

```python runnable id=tabulated
INF = float("inf")

def fewest_table(target, sizes):
    best = [INF] * (target + 1)
    best[0] = 0
    for t in range(1, target + 1):
        for s in sizes:
            if s <= t and best[t - s] + 1 < best[t]:
                best[t] = best[t - s] + 1
    return best

table = fewest_table(12, (1, 3, 4))
for t, v in enumerate(table):
    print(f"f({t:>2}) = {v}")
```

The evaluation order is doing the work that the call stack used to do. `best[t]`
reads only `best[t - s]` for positive `s`, so every dependency has a smaller
index, so a single forward pass is enough. When you cannot find such an order,
you cannot tabulate — and that is a signal your states have a cycle, not a
signal that you should try harder.

:::note{title="Which form to reach for"}
They compute the same recurrence, so pick on secondary properties.

**Top-down** visits only the states your input actually reaches. If the state
space is large but sparsely used — a knapsack with 10,000 capacity values where
only a few hundred are reachable — this is an asymptotic win, not a stylistic
one.

**Bottom-up** has no call overhead, no recursion limit, contiguous memory, and
it is the only form you can compress with a rolling array (Lesson 6). It also
visits every state, reachable or not.

Top-down is usually easier to *derive*, because you write the recurrence and
stop. Bottom-up is usually faster to *run*.
:::

:::checkpoint{id=cp-three-forms rubric="the recurrence is identical,memo is a dict keyed by state and the table is an array keyed by state,top-down visits reachable states while bottom-up visits all of them"}
Without scrolling up: what is the difference between the memoized version and
the tabulated version? Name something that is the same in both, and something
that genuinely differs.
:::

## Optimal substructure, and why the memo cannot save you without it

The memo made the recursion fast. It did nothing for correctness. Correctness
comes from a property of the *problem*, and it needs to be stated sharply enough
that you can check a candidate recurrence against it.

:::insight{title="Optimal substructure"}
Let an instance $I$ be solved by a sequence of choices, and for a first choice
$c$ let $I \mid c$ be the residual instance that remains after making it. The
problem has **optimal substructure** when, for every optimal solution $S$ to $I$
whose first choice is $c$, the rest of $S$ is an optimal solution to $I \mid c$.
:::

The recurrence above takes a minimum over first choices, and for each choice it
substitutes $f(t - s)$ — the *optimum* of the residual instance. That
substitution is only legal if optimal substructure holds. If some non-optimal
solution to $t - s$ could combine with the block $s$ to beat every optimal one,
the recurrence computes the wrong number, and memoizing it only computes the
wrong number faster.

For block-filling the property holds, and the argument is short enough to state
here: if an optimal filling of $t$ starts with a block of size $s$, the
remaining blocks fill exactly $t - s$; if there were a cheaper filling of
$t - s$, you could substitute it and get a cheaper filling of $t$, contradicting
optimality. The proof track below writes that out properly and shows a problem
where the same move fails.

## Where the three forms leave you

You now have the mechanical half of dynamic programming: recurrence, memo,
table, evaluation order. Every remaining lesson in this stage is about the other
half, which is harder and which no amount of table-drawing teaches — deciding
*what the state is*.

::::track{depth=proof}
## Proving optimal substructure, and watching it fail

The standard technique is called **cut and paste**: assume the sub-solution
inside an optimal solution is not itself optimal, cut it out, paste in a better
one, and derive a contradiction.

:::proof{title="Block filling has optimal substructure"}
**Claim.** Let $f(t)$ be the minimum number of blocks summing to exactly $t$,
with sizes drawn from $S$ (repetition allowed), and $f(t) = \infty$ when no such
multiset exists. Then for every $t > 0$ with $f(t) < \infty$,

$$
f(t) \;=\; 1 + \min_{s \in S} f(t - s).
$$

**Proof.** Both directions.

*($\le$)* Fix any $s \in S$ with $f(t-s) < \infty$, and let $M$ be a multiset of
$f(t-s)$ blocks summing to $t - s$. Then $M \cup \{s\}$ sums to $t$ and has
$f(t-s) + 1$ elements, so $f(t) \le 1 + f(t-s)$. Taking the minimum over $s$
gives $f(t) \le 1 + \min_s f(t-s)$.

*($\ge$)* Let $M^\star$ be an optimal multiset for $t$, so $|M^\star| = f(t)$. Since
$t > 0$, $M^\star$ is non-empty; pick any element $s^\star \in M^\star$. The rest,
$M^\star \setminus \{s^\star\}$, sums to exactly $t - s^\star$ and has $f(t) - 1$
elements, so $f(t - s^\star) \le f(t) - 1$.

Now the cut-and-paste step. Suppose $f(t - s^\star) < f(t) - 1$ strictly — that is,
the remainder inside the optimal solution is *not* an optimal solution to the
residual instance. Take a genuinely optimal multiset $N$ for $t - s^\star$ and form
$N \cup \{s^\star\}$. It sums to $t$ and has $f(t-s^\star) + 1 < f(t)$ elements,
contradicting the optimality of $M^\star$. So $f(t - s^\star) = f(t) - 1$, hence
$\min_s f(t-s) \le f(t) - 1$ and $1 + \min_s f(t-s) \le f(t)$.

Both inequalities give equality. $\blacksquare$
:::

Notice what the argument actually needed: that removing a block from a valid
solution leaves a valid solution to a *smaller instance of the same problem*,
and that gluing a block back on is always legal. Those two closure properties
are what optimal substructure is made of. When you are checking a new
recurrence, check those.

### A problem with overlapping subproblems and no optimal substructure

Take **longest simple path** between two vertices in an undirected graph — a
path that may not repeat a vertex. The subproblems certainly overlap: the same
"longest simple path from $u$ to $z$" question recurs all over the search.

But the tempting recurrence is false. Consider a four-cycle
$a - b - c - d - a$, and ask for the longest simple path from $a$ to $c$. The
answer is $a - b - c$ or $a - d - c$, length 2 either way. Now try to build it
from a first step: the recurrence would say

$$
\text{longest}(a, c) \;=\; 1 + \max_{b \,\in\, N(a)} \text{longest}(b, c),
$$

and $\text{longest}(b, c)$ on its own is $b - a - d - c$, length 3 — a path that
uses $a$, which the outer path has already used. Splice them and you get a walk
that visits $a$ twice, which is not a simple path at all.

The failure is not arithmetic. It is that the residual instance is *not the
same problem*: after stepping to $b$ you must solve "longest simple path from
$b$ to $c$ **avoiding $a$**", and that set of forbidden vertices is part of the
state. Carry it and the state space becomes $2^{|V|}$ — which is exactly the
bitmask DP of Lesson 5, and exactly why longest simple path is NP-hard while
shortest path is not.

Two lessons generalise from this. First, when optimal substructure appears to
fail, the usual cause is a missing state coordinate rather than a broken
problem. Second, restoring it can cost you an exponential state space, and
sometimes that is the honest price.
::::

:::exercise{ref=subproblem-census}
:::

:::exercise{ref=fewest-blocks}
:::

:::quiz{id=quiz-l01 passing=2}
- id: q1
  prompt: "Why does memoizing merge sort buy nothing?"
  options:
    - "Merge sort is already O(n log n), and memoization only helps exponential algorithms."
    - "Each recursive call receives a different slice, so the memo never gets a hit."
    - "Merge sort is not defined by a recurrence, so there is no state to key on."
    - "Sorting has no optimal substructure."
  answerIndex: 1
  explanation: >-
    The memo pays off exactly when distinct arguments are far fewer than calls.
    Merge sort's calls all take disjoint or nested-but-distinct slices, so every
    lookup misses and you have added a dictionary to no purpose. The running
    time is a consequence of that, not the reason — an exponential algorithm
    with no repeated subproblems is equally immune.
- id: q2
  prompt: "A recurrence has overlapping subproblems but the problem lacks optimal substructure. What happens if you memoize it?"
  options:
    - "It becomes correct, because the cache stores verified answers."
    - "It becomes fast and stays wrong."
    - "The cache never gets a hit, so nothing changes."
    - "It raises an error when two subproblems disagree."
  answerIndex: 1
  explanation: >-
    A memo changes when work happens, never what the recurrence computes. If
    combining optimal sub-solutions does not produce an optimal solution, the
    recurrence returns a wrong number, and caching returns that wrong number
    much sooner. This is why the proof comes before the table.
- id: q3
  prompt: "When is top-down memoization asymptotically better than a bottom-up table, rather than merely a matter of taste?"
  options:
    - "Never — they visit the same states in a different order."
    - "When the state space is large but only a small fraction of it is reachable from the actual input."
    - "When the recurrence has more than two dimensions."
    - "When the answer fits in memory but the table does not."
  answerIndex: 1
  explanation: >-
    Bottom-up fills every cell whether the input needs it or not. Top-down only
    touches states the recursion actually reaches. For a coin problem with a
    huge target and a few large denominations, the reachable set can be a tiny
    fraction of the table, and top-down is faster by more than a constant. The
    trade is that top-down pays call overhead and cannot use a rolling array.
:::
