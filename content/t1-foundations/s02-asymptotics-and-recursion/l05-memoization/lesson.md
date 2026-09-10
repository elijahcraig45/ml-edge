---
id: t1/s02/l05
title: Memoization, or buying time with space
tier: t1-foundations
stage: s02-asymptotics-and-recursion
status: published
estimatedMinutes: 40
objectives:
  - Count the redundant calls in a branching recursion and explain why the count grows exponentially.
  - Add memoization to a recursive function and state the new time and space bounds.
  - Name the three conditions a function must satisfy before its results can be cached.
  - Read a query plan to see the optimizer performing the same trick on a shared subexpression.
prerequisites:
  - t1/s02/l03
  - t1/s01/l02
misconceptions:
  - "**\"Memoization makes recursion faster.\"** It makes *redundant* recursion faster and does nothing else. Mergesort's recursion tree contains no repeated subproblem, so memoizing it adds a dictionary and a hash computation to every call and buys exactly zero. Cache a function only after you have established that the same argument arrives twice."
  - "**\"The cache key is the function's arguments.\"** The cache key is the whole *subproblem*, which is the arguments plus anything else the result depends on. A function that also reads a global, a clock, a random source or a file has a subproblem larger than its argument list, and caching on the arguments alone returns a stale answer that looks correct."
  - "**\"Memoization is free because a dict lookup is $O(1)$.\"** You pay $\\Theta(\\text{distinct subproblems})$ in memory, and that number can be far larger than the input. Memoizing a function of two unbounded integers is a memory leak with a good reputation."
  - "**\"Exponential means the ratio is 2.\"** Naive Fibonacci's call count multiplies by 1.618 for each increment of $n$, not 2 — it is $\\Theta(\\varphi^n)$. Any constant base above 1 is exponential; the base is the constant that decides whether you are stuck at $n = 30$ or $n = 60$."
masteryChecklist:
  - Given a recursion, I can decide whether its subproblems overlap by drawing two levels of its tree.
  - I can memoize a function with a dictionary and say what its time and space costs became.
  - I can name a function that must not be memoized and say why.
  - I can spot a repeated subexpression in a query plan and rewrite the query so it is computed once.
runtimes:
  - engine: python
  - engine: duckdb
    datasetId: package-registry
---

Naive Fibonacci makes 2,692,537 calls to answer $\text{fib}(30)$. There are 31
distinct questions it could possibly be asking. Everything about memoization is
in the gap between those two numbers.

```python runnable id=how-much-recomputation
calls = {"n": 0}

def fib_naive(n):
    calls["n"] += 1
    if n < 2:
        return n
    return fib_naive(n - 1) + fib_naive(n - 2)

print(f"{'n':>4} {'fib(n)':>10} {'calls made':>13} {'distinct subproblems':>21}")
for n in (10, 20, 25, 30):
    calls["n"] = 0
    result = fib_naive(n)
    print(f"{n:>4} {result:>10,} {calls['n']:>13,} {n + 1:>21}")

print("\nratio of call counts from one n to the next:")
previous = None
for n in range(20, 26):
    calls["n"] = 0
    fib_naive(n)
    if previous is not None:
        print(f"  {n - 1} -> {n}: {calls['n'] / previous:.4f}")
    previous = calls["n"]
```

The ratio is 1.618. Stage 1's doubling-ratio diagnostic said "about 2 means
linear, about 4 means quadratic" — those were ratios under a *doubling* of $n$.
Here the ratio is taken under an *increment* of $n$, and a constant ratio per
increment is the signature of exponential growth. The constant is
$\varphi = (1 + \sqrt{5})/2$, so the call count is $\Theta(\varphi^n)$.

## Why the tree has so many duplicates

$\text{fib}(5)$ expands like this:

```
                       fib(5)
                 /               \
            fib(4)               fib(3)
           /      \             /      \
      fib(3)     fib(2)     fib(2)    fib(1)
      /    \     /    \     /    \
  fib(2) fib(1) fib(1) fib(0) fib(1) fib(0)
  /    \
fib(1) fib(0)
```

`fib(3)` appears twice, `fib(2)` three times, `fib(1)` five times. The recursion
does not know it has seen them, so each occurrence expands its whole subtree
again. The tree has $\Theta(\varphi^n)$ nodes and only $n+1$ distinct labels.

**Overlapping subproblems** is the name for that situation, and it is the
precondition for memoization. It is not universal: mergesort splits an array into
disjoint halves, so no two nodes in its recursion tree ever receive the same
input, and memoizing it buys nothing while costing a hash of the whole list.

## The fix, and the exact size of the bill

```python runnable id=memoized
_cache = {0: 0, 1: 1}
executions = {"n": 0}

def fib(n):
    if n not in _cache:
        executions["n"] += 1                 # count only real work, not cache hits
        _cache[n] = fib(n - 1) + fib(n - 2)
    return _cache[n]

print(fib(30), "with", executions["n"], "subproblems actually computed")
print(fib(90), "-- and now fib(90), which the naive version would never reach")
print("cache holds", len(_cache), "entries")
```

Each subproblem is evaluated once, so the work is $\Theta(n)$ and the memory is
$\Theta(n)$. The recursion tree collapsed from $\varphi^n$ nodes to a path of
length $n$ with $n$ cache hits hanging off it.

:::insight{title="What you actually traded"}
Memoization is a **space-for-time** trade and the exchange rate is explicit:

$$
\text{time} : \Theta(\varphi^n) \to \Theta(n)
\qquad
\text{space} : \Theta(n) \text{ stack} \to \Theta(n) \text{ stack} + \Theta(n) \text{ cache}
$$

You paid $\Theta(n)$ memory and removed an exponential. That is the best trade in
this entire curriculum, and it is available exactly when the recursion tree has
$\Theta(\text{something exponential})$ nodes over a polynomial number of distinct
subproblems. Stage 8 gives that pattern its usual name — dynamic programming —
and the only difference there is that the table is filled bottom-up from the
smallest subproblem instead of top-down from the largest.
:::

## Three conditions before you cache anything

1. **The function must be pure.** Same arguments, same result, no observable side
   effect. Cache a function that reads a database, a clock, a random number or a
   mutable global, and you will serve a stale answer that looks entirely
   plausible.
2. **The key must capture the whole subproblem.** If the result depends on
   anything besides the arguments, that thing belongs in the key. This is the
   condition that fails silently.
3. **The arguments must be hashable, and the key space must be bounded.** Lists
   cannot be dict keys — Stage 1 explained why — so a list argument has to be
   converted to a tuple, which costs a copy per call. And a cache on a function
   of two unbounded integers grows until the process dies.

:::pitfall{title="`functools.cache` is one line and one line of thought"}
`@functools.cache` (Python 3.9+) or `@functools.lru_cache(maxsize=N)` does
everything above for you, keyed on the argument tuple. Use it — but the decorator
does not check the three conditions, it assumes them. `lru_cache` with a
`maxsize` bounds the memory by evicting the least recently used entry, which
turns a guaranteed-correct memo table into a cache with a hit rate. For
Fibonacci, evicting `fib(n-1)` while computing `fib(n)` would restore the
exponential blowup. Bounded caches and memoization are not the same thing, even
though they are spelled with the same decorator.
:::

:::checkpoint{id=cp-overlap rubric="draw two levels of the recursion tree,look for the same argument appearing twice,mergesort has disjoint subproblems,memoizing without overlap adds cost and buys nothing"}
You are handed a recursive function and asked whether memoizing it will help.
What do you check, and what is the answer for mergesort?
:::

## The optimizer does this too, and shows you

:::dataset{id=package-registry tables="packages,downloads"}
:::

Here is a query that asks for the same aggregate twice — total downloads per
package, joined against itself.

```sql runnable id=repeated-subquery dataset=package-registry
EXPLAIN
SELECT a.package_id, a.downloads, b.downloads AS next_package_downloads
FROM (SELECT package_id, sum(count) AS downloads FROM downloads GROUP BY package_id) a
JOIN (SELECT package_id, sum(count) AS downloads FROM downloads GROUP BY package_id) b
  ON b.package_id = a.package_id + 1;
```

Count the leaves: **two** `SEQ_SCAN` nodes on `downloads`, with a
`PERFECT_HASH_GROUP_BY` above each. The engine reads the table twice and aggregates
it twice, which is the plan-shaped version of `fib(3)` appearing twice in the
tree.

Now name the subproblem once:

```sql runnable id=cte-memoized dataset=package-registry
EXPLAIN
WITH totals AS (
  SELECT package_id, sum(count) AS downloads FROM downloads GROUP BY package_id
)
SELECT a.package_id, a.downloads, b.downloads AS next_package_downloads
FROM totals a JOIN totals b ON b.package_id = a.package_id + 1;
```

One `CTE` node computes `totals` once, and two `CTE_SCAN` nodes read the
materialized result. One scan of `downloads`, one aggregation, two consumers.

That is memoization, performed by a query optimizer, with the cache table visible
as an operator in the plan. The `CTE` node **is** the dict; `CTE_SCAN` **is** the
cache hit. And the three conditions transfer intact: the subquery has to be
deterministic (a `random()` inside it would make sharing wrong), the key is the
whole subquery text and its parameters, and the materialized result has to fit
somewhere.

:::exercise{ref=memo-fib}
:::

:::exercise{ref=download-share}
:::

::::track{depth=interview}
## Recognising it under time pressure

The trigger is not the word "recursion". It is **the same subproblem reachable by
more than one path**.

Ask one question about the problem: *can two different sequences of choices lead
to the same state?* If yes, the recursion tree has duplicates and memoization
collapses it. Grid paths — down-then-right and right-then-down land on the same
cell, so a grid walk is memoizable. Coin change, edit distance, longest common
subsequence, "climb 1 or 2 stairs", knapsack: all the same shape. Permutation
generation is not, because every path ends at a distinct permutation.

The line to say, before writing any code:

> "The recursion is exponential because subproblems repeat. The state is
> `(i, j)`, and there are only $n \times m$ of those, so I'll memoize on the
> state — that's $O(nm)$ time and $O(nm)$ space."

Notice how much that sentence contains: the diagnosis, the state, the count of
states, and both costs. It is also the exact sentence you write at the top of the
function as a comment.

:::interview{title="The two follow-ups, and they are always these two"}
**"Can you do it with less space?"** Almost always yes, and the answer is
bottom-up. If `fib(n)` only reads `fib(n-1)` and `fib(n-2)`, you need two
variables rather than a table: $\Theta(1)$ space. If a grid DP only reads the
previous row, keep one row: $\Theta(m)$ instead of $\Theta(nm)$. The general move
is to look at *which* earlier entries the recurrence touches and keep only those.

**"What if the recursion is deep?"** Top-down memoization still holds
$\Theta(\text{depth})$ stack frames, so `fib(100000)` memoized still raises
`RecursionError`. Bottom-up has no recursion at all. That is the honest advantage
of tabulation over memoization, and stating it unprompted is worth more than
solving the original problem twice.
:::
::::

::::track{depth=systems}
## Caching that someone else already built for you

**Query optimizers disagree about whether to memoize.** DuckDB materializes a CTE
by default, which is what you saw. PostgreSQL did too, until version 12 — then it
switched to *inlining* CTEs by default, because materializing a CTE blocks
predicate pushdown: if the outer query filters to one package, an inlined CTE can
push that filter into the scan, and a materialized one has to compute every
package's total first. Postgres therefore lets you write
`WITH totals AS MATERIALIZED (...)` or `AS NOT MATERIALIZED (...)` and choose.

This is the memoization trade-off exactly, one level up. Caching a subproblem
means committing to computing all of it, which is a loss when the consumer only
wanted part of it. Fibonacci has no such tension because you need every
intermediate value anyway. Real queries usually do have it, which is why the
default flipped.

**`functools.lru_cache` on a hot path.** The decorator is implemented in C and a
cache hit costs roughly a dict lookup plus the hashing of the argument tuple.
That last part matters: memoizing a function whose argument is a 10,000-element
tuple hashes 10,000 elements on every call, and can be slower than recomputing.
Cache on small keys — indices, ids, small tuples — not on the data itself.

**The same pattern with a different name in ML systems.** A transformer's
KV cache is memoization of attention keys and values across decoding steps: token
$t+1$ recomputes attention over the same prefix as token $t$, so the prefix's
keys and values are stored instead of recomputed. It turns per-token decoding
from $\Theta(t^2)$ into $\Theta(t)$ and costs memory linear in the sequence
length — the identical trade as Fibonacci, at gigabyte scale, and the reason
serving systems talk about "KV cache pressure" rather than compute.

Feature stores are the batch version: a feature computed from a nightly join is
materialized once and read by every model that needs it, and the whole class of
bugs known as training/serving skew is condition 2 failing — a cache key that did
not capture the whole subproblem, usually because it left out time.
::::

:::quiz{id=quiz-l05 passing=3}
- id: q1
  prompt: "Which recursive function does NOT benefit from memoization?"
  options:
    - "Fibonacci, because two branches both need fib(n-2)."
    - "Mergesort, because it splits into disjoint halves and never sees the same input twice."
    - "Counting grid paths, because down-then-right and right-then-down reach the same cell."
    - "Edit distance, because prefixes of both strings recur."
  answerIndex: 1
  explanation: >-
    Memoization pays only when subproblems overlap. Mergesort's recursion tree
    partitions the input, so no two nodes ever receive the same argument — the
    cache would never register a hit while adding a hash of the whole list to
    every call. The other three all have multiple paths to the same state.
- id: q2
  prompt: "The naive Fibonacci call count multiplies by 1.618 each time $n$ increases by 1. What growth class is that?"
  options:
    - "Linear — the input goes up by 1 and the work goes up by a fixed factor."
    - "Exponential — a constant ratio per unit increase in n is Θ(c^n) for c = 1.618."
    - "Quadratic — a ratio between 1 and 2 sits between linear and cubic."
    - "Linearithmic, since 1.618 is close to log2(3)."
  answerIndex: 1
  explanation: >-
    A constant *multiplicative* response to an *additive* change in the input is
    the definition of exponential growth. Stage 1's table used ratios under a
    doubling of $n$; here the ratio is under an increment, which is a different
    question with a different answer key. The base being 1.618 rather than 2 does
    not change the class, only the constant.
- id: q3
  prompt: "You memoize a function that returns a package's download count for a given day, reading from a live table. What breaks?"
  options:
    - "Nothing; the arguments are hashable and the cache is bounded."
    - "The function is not pure — its result depends on the table's contents, which are not in the key, so the cache serves stale answers."
    - "Dictionary lookups on tuple keys are too slow to help."
    - "Memoization requires recursion, and this function is not recursive."
  answerIndex: 1
  explanation: >-
    The subproblem is "this package, this day, *as of this table state*", and the
    cache key covers only the first two. That is condition 2 failing, and it fails
    silently — every answer looks like a real one. Caching a non-pure function
    needs an invalidation story, which is a different and much harder problem.
- id: q4
  prompt: "In a DuckDB plan, what tells you the optimizer computed a shared subquery once rather than twice?"
  options:
    - "The estimated cardinality on the join is half what it would otherwise be."
    - "A single CTE node with two CTE_SCAN consumers, instead of two separate scans and two aggregations."
    - "The plan is one operator shorter."
    - "EXPLAIN prints a CACHE_HIT annotation."
  answerIndex: 1
  explanation: >-
    The CTE node is where the result is materialized and each CTE_SCAN is a read
    of it — one producer, two consumers. Writing the subquery out twice instead
    produces two scans of the table and two hash aggregations, which is the same
    shape as a recursion tree containing the same subproblem twice. Cardinality estimates are
    unaffected by the sharing.
:::
