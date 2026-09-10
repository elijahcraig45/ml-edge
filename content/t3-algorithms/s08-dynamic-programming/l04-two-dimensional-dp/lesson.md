---
id: t3/s08/l04
title: Two dimensions
tier: t3-algorithms
stage: s08-dynamic-programming
status: published
estimatedMinutes: 50
objectives:
  - Write the recurrences for longest common subsequence, edit distance, and 0/1 knapsack from their state definitions rather than from memory.
  - Explain why the compressed 0/1 knapsack iterates capacity downwards and the unbounded one iterates upwards, in terms of which row a read comes from.
  - "Recognise a matrix-chain-shaped problem: a state that is an interval and a transition that is a split point."
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"2-D DP means a grid, so the two dimensions are always positions in two strings.\"** They are whatever the state has two of. Knapsack's second dimension is a *resource*, not a position; matrix chain's two coordinates are the ends of one interval. The grid is a storage decision that follows from the state, and grouping these problems by their pictures is what makes them feel like separate tricks."
  - "**\"Edit distance and LCS are different algorithms.\"** They are the same recurrence over the same state with different weights on the three moves. Setting the substitution cost above 2 turns edit distance into LCS-with-indels, which is why one implementation with a cost table serves both."
  - "**\"Once knapsack is compressed to one array, the loop order is a style choice.\"** It is the difference between the 0/1 problem and the unbounded one. Descending reads the previous item's row; ascending reads the row being written, which silently allows reusing an item. On the lesson's data that is 153,160 versus 635,280 — right answers to two different questions."
  - "**\"You should always compress the table.\"** The compressed version cannot tell you which items it chose. If the caller needs the answer rather than its value, the full table — or an explicit parent array — is not optional. Lesson 6 is entirely about that trade."
masteryChecklist:
  - Given two strings I can write the edit-distance recurrence, name what dp[i][j] means in one sentence, and give the base cases.
  - I can state the 0/1 knapsack recurrence and say why the state needs the remaining capacity.
  - I can explain the descending-versus-ascending loop order in the compressed knapsack without appealing to a rule I memorised.
  - I can identify a problem whose state is an interval and say why the table must be filled by increasing interval length.
runtimes:
  - engine: python
---

Everything from Lesson 2 applies unchanged; there is one more coordinate.
What makes this lesson worth its time is that the four classic 2-D dynamic
programs have *different* second coordinates, and knowing which is which is the
difference between deriving one and recognising one.

| Problem | State | Second coordinate is… |
| --- | --- | --- |
| Longest common subsequence | $(i, j)$ | a position in the second string |
| Edit distance | $(i, j)$ | a position in the second string |
| 0/1 knapsack | $(i, c)$ | a **resource** you have left |
| Matrix chain | $(i, j)$ | the **other end** of an interval |

## Two prefixes: LCS and edit distance

Let $\mathrm{ed}(i, j)$ be the cheapest way to turn the first $i$ characters of
$a$ into the first $j$ characters of $b$, where an insertion, a deletion and a
substitution each cost 1.

$$
\mathrm{ed}(i, j) =
\begin{cases}
j & i = 0 \\[2pt]
i & j = 0 \\[2pt]
\mathrm{ed}(i-1, j-1) & a_i = b_j \\[2pt]
1 + \min\big(\mathrm{ed}(i-1, j),\; \mathrm{ed}(i, j-1),\; \mathrm{ed}(i-1, j-1)\big) & \text{otherwise}
\end{cases}
$$

Read the three branches as the three edits: delete $a_i$, insert $b_j$,
substitute one for the other. The base cases are not decoration either — turning
a prefix into the empty string costs one deletion per character, which is
exactly $i$.

```python runnable id=edit-distance
def edit_distance(a, b):
    previous = list(range(len(b) + 1))          # row for i = 0
    for i in range(1, len(a) + 1):
        current = [i] + [0] * len(b)            # first cell of row i is i
        for j in range(1, len(b) + 1):
            if a[i - 1] == b[j - 1]:
                current[j] = previous[j - 1]
            else:
                current[j] = 1 + min(previous[j], current[j - 1], previous[j - 1])
        previous = current
    return previous[len(b)]

registry = ["arrowkit", "bitmask", "chunker", "dagrun", "edgecase", "fanout",
            "graphwalk", "hashring", "indexer", "joinplan", "keyspace",
            "lazyseq", "memoize", "nullsafe", "orderby", "probe",
            "quickselect", "radixsort", "skiplist", "treewalk"]

for typo in ("graphwak", "quickselct", "memoise", "tremwalk"):
    ranked = sorted((edit_distance(typo, name), name) for name in registry)
    distance, best = ranked[0]
    print(f"{typo:>12}  ->  {best:<12} (distance {distance});  runner-up {ranked[1][1]} at {ranked[1][0]}")
```

That is the "did you mean…?" behind every package manager, and it is one
recurrence.

Longest common subsequence is the *same* recurrence with different weights:

$$
\mathrm{lcs}(i, j) =
\begin{cases}
0 & i = 0 \text{ or } j = 0\\[2pt]
1 + \mathrm{lcs}(i-1, j-1) & a_i = b_j\\[2pt]
\max\big(\mathrm{lcs}(i-1, j),\, \mathrm{lcs}(i, j-1)\big) & \text{otherwise}
\end{cases}
$$

Same state, same three moves, and the substitution move deleted — LCS has no
"change one character into another", only "skip one from each side". If you
raise edit distance's substitution cost to 2, substituting becomes exactly as
expensive as a delete plus an insert, the middle branch stops ever winning, and
the two recurrences compute the same alignment. One implementation with a cost
table serves both, and knowing that is worth more than knowing either.

## A resource: knapsack

The second coordinate does not have to index anything. For 0/1 knapsack —
choose a subset of items, each usable at most once, maximising value subject to
a weight budget — the state derived in Lesson 2 is (item index, capacity left):

$$
K(i, c) = \max\big(\, K(i-1, c),\;\; v_i + K(i-1,\, c - w_i)\,\big)
\qquad \text{(second term only when } w_i \le c)
$$

$K(i-1, \cdot)$ on both sides is the "each item at most once" rule made
mechanical: whichever branch you take, the next lookup is in the *previous
item's* row, so item $i$ cannot be reconsidered.

That is also the reason for the strangest-looking line in every compressed
implementation.

```python runnable id=knapsack-loop-order
# name, size in KB, downloads over the ten-day window — real rows from the registry.
items = [("arrowkit", 190, 92000), ("chunker", 402, 31880), ("edgecase", 22, 20200),
         ("indexer", 512, 11960), ("memoize", 18, 9080), ("quickselect", 71, 7210),
         ("treewalk", 154, 6460)]
CAPACITY = 700   # KB of edge cache

def knapsack(items, capacity, descending):
    best = [0] * (capacity + 1)
    for _, weight, value in items:
        span = range(capacity, weight - 1, -1) if descending else range(weight, capacity + 1)
        for c in span:
            if best[c - weight] + value > best[c]:
                best[c] = best[c - weight] + value
    return best[capacity]

print("descending (0/1, each package once):", knapsack(items, CAPACITY, True))
print("ascending  (unbounded, reuse freely):", knapsack(items, CAPACITY, False))
```

One character of difference in the loop, and a factor of four in the answer.

:::insight{title="Why the direction is the whole algorithm"}
The compressed array holds two rows at once: cells you have already updated on
this pass hold row $i$; cells you have not yet reached still hold row $i-1$.

Going **downwards**, `best[c - weight]` sits at a *lower* index than `c`, so you
have not reached it yet — it still holds $K(i-1, c-w_i)$, which is what the 0/1
recurrence asks for. Item $i$ is used at most once.

Going **upwards**, `best[c - weight]` was already updated on this same pass, so
it holds $K(i, c-w_i)$ — a state in which item $i$ may already have been taken.
Taking it again is now legal, and you have written the **unbounded** knapsack:

$$
U(c) = \max\big(U(c),\; v_i + U(c - w_i)\big).
$$

Neither loop is a bug. Each is the correct implementation of a different
problem, which is why this is such a reliable source of silent wrong answers —
there is no crash, no warning, only a bigger number that looks like good news.
:::

:::checkpoint{id=cp-loop-order rubric="the compressed array holds row i-1 in cells not yet visited and row i in cells already visited,descending reads row i-1 so an item is used once,ascending reads row i so an item can be reused which is the unbounded problem"}
Explain the descending loop to someone who has written the ascending one
and cannot see why their answer is too high. Do not say "that is the rule".
:::

## An interval: matrix chain multiplication

Multiplying an $p \times q$ matrix by a $q \times r$ matrix costs $pqr$ scalar
multiplications. Matrix product is associative, so a chain
$A_1 A_2 \cdots A_n$ can be parenthesised any way you like, and the cost depends
entirely on which way.

The state here is not a prefix and not a resource. It is a **contiguous
interval**: $m(i, j)$ is the cheapest way to multiply out $A_i \cdots A_j$ on its
own. The decision is where to make the outermost split.

$$
m(i, j) \;=\; \min_{i \le k < j} \Big( m(i, k) \;+\; m(k+1, j) \;+\; p_{i-1}\,p_k\,p_j \Big),
\qquad m(i, i) = 0
$$

with $p_{i-1} \times p_i$ the dimensions of $A_i$.

```python runnable id=matrix-chain
def matrix_chain(dims):
    """dims[i-1] x dims[i] is the shape of matrix i. Returns the minimum cost."""
    n = len(dims) - 1
    best = [[0] * n for _ in range(n)]
    for length in range(2, n + 1):                  # by increasing interval length
        for i in range(n - length + 1):
            j = i + length - 1
            best[i][j] = min(
                best[i][k] + best[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1]
                for k in range(i, j)
            )
    return best[0][n - 1]

print(matrix_chain([40, 20, 30, 10, 30]))   # 26000
print(matrix_chain([10, 30, 5, 60]))        # 4500
```

Two things distinguish this from everything above.

**The evaluation order is by interval length, not by index.** $m(i,j)$ reads
$m(i,k)$ and $m(k+1,j)$, both of which are *shorter* intervals. Neither "left to
right" nor "top to bottom" over the grid respects that; length does. When you
meet a DP whose loops start with `for length in ...`, you are looking at this
family.

**The cost arithmetic is different.** $\Theta(n^2)$ states with $\Theta(n)$ split
points each is $\Theta(n^3)$ — the formula from Lesson 2 applied without
modification. Interval DP is the whole subject of Lesson 5's first half.

::::track{depth=interview}
## Saying a 2-D recurrence out loud

The single sentence that decides how the rest of the interview goes is this one:

> **"`dp[i][j]` is the best value of the subproblem consisting of ______."**

Say it before you write anything. Interviewers are listening for whether the
sentence is *complete* — whether it pins down a subproblem with no free
variables — because that is the sufficiency test from Lesson 2, spoken.

Compare:

- Weak: "`dp[i][j]` is the edit distance." Of what? Between which pieces?
- Strong: "`dp[i][j]` is the minimum number of edits turning the first `i`
  characters of `a` into the first `j` characters of `b`." Now the base cases
  are forced (`dp[i][0] = i`) and so is the answer's location
  (`dp[len(a)][len(b)]`).

Then five lines, in order: **meaning, base cases, transitions, order, answer
cell.** Every one of them follows from the meaning sentence, which is why the
sentence is where you spend your thinking.

:::interview{title="Two traps to name before you are asked"}
**The answer cell is not always the last cell.** In LIS the answer is the
maximum over all cells, not `dp[n-1]`. Say which cell holds the answer, out
loud, every time — it costs three seconds and it is a common off-by-one.

**The 1-D compression changes the problem if you get the direction wrong.**
If you compress knapsack in front of an interviewer, narrate the direction and
why: "I'm going down so this read still comes from the previous item's row."
That one clause distinguishes someone who derived it from someone who memorised
it, and it is the follow-up question you will otherwise be asked.
:::
::::

:::exercise{ref=edit-distance}
:::

:::exercise{ref=knapsack-shortlist}
:::

:::quiz{id=quiz-l04 passing=2}
- id: q1
  prompt: "In the compressed 0/1 knapsack, why does the capacity loop run downwards?"
  options:
    - "To visit the most valuable capacities first, so the array converges sooner."
    - "So that best[c - weight] has not yet been touched on this pass and therefore still holds the previous item's row."
    - "Because Python range objects are faster in reverse."
    - "To avoid an index error when weight is larger than the capacity."
  answerIndex: 1
  explanation: >-
    The single array holds two rows at once. Cells below c are untouched on this
    pass and still hold row i-1, which is exactly what the 0/1 recurrence reads.
    Running upwards makes that read come from row i — a state in which the item
    may already have been taken — which is the unbounded knapsack recurrence,
    correct for a different problem.
- id: q2
  prompt: "Why must the matrix chain table be filled by increasing interval length rather than row by row?"
  options:
    - "Because the table is triangular and rows would visit undefined cells."
    - "Because m(i, j) depends on m(i, k) and m(k+1, j), which are both shorter intervals — length is the topological order of the state graph."
    - "Because matrix multiplication is associative only for adjacent pairs."
    - "It does not matter; any order converges after enough passes."
  answerIndex: 1
  explanation: >-
    Every dependency of a state is a strictly shorter interval, so ordering by
    length guarantees dependencies are already computed. A row-by-row sweep
    reaches m(0, n-1) while some sub-interval inside it is still zero, and reads
    garbage without any error. Repeated passes would eventually converge, but
    that is a fixpoint iteration and costs more than getting the order right.
- id: q3
  prompt: "What is the relationship between edit distance and longest common subsequence?"
  options:
    - "They are unrelated; one minimises and the other maximises."
    - "They are the same recurrence over the same state; LCS is edit distance with substitution priced out and matches rewarded."
    - "LCS is edit distance restricted to strings of equal length."
    - "Edit distance is quadratic and LCS is linear."
  answerIndex: 1
  explanation: >-
    Both are dynamic programs over (prefix of a, prefix of b) with the same
    three moves. Price substitution at 2 and it never beats a delete plus an
    insert, at which point minimising edits and maximising matches are the same
    optimisation. One templated implementation covers both, plus sequence
    alignment with arbitrary gap and mismatch scores.
:::
