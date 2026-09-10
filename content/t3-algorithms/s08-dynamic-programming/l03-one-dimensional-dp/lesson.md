---
id: t3/s08/l03
title: One dimension, and where SQL takes over
tier: t3-algorithms
stage: s08-dynamic-programming
status: published
estimatedMinutes: 50
objectives:
  - Write a 1-D dynamic program from its recurrence and compress it to constant space.
  - Derive the O(n log n) longest increasing subsequence by noticing that the DP's own array is sorted.
  - Say which DP recurrences collapse into a single SQL window function and which cannot, and give the reason rather than the rule.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"The `tails` array in the fast LIS is the longest increasing subsequence.\"** It is not, and it usually is not even a subsequence of the input. `tails[k]` is the smallest value that can end an increasing subsequence of length k+1. Only its *length* is meaningful; reading it out as an answer gives you a sequence whose elements may appear in the wrong order in the input."
  - "**\"Any running total can be a window function, so any 1-D DP can be.\"** A window function aggregates *input* rows. It cannot see its own output. Running-minimum DPs collapse because the DP value happens to equal a built-in aggregate of the input prefix; `max(f[i-1], f[i-2] + a[i])` is not an aggregate of any prefix of the input, so no frame specification produces it."
  - "**\"Binary search speeds up LIS because searching is faster than scanning.\"** Binary search is only legal because the array is *sorted*, and the array is sorted because of a property of the DP — the minimum tail of a length-k subsequence strictly increases with k. If you had not proved that, the binary search would be a bug."
  - "**\"O(n log n) LIS is a different algorithm from the O(n²) one.\"** They compute the same quantity from the same insight. The quadratic one asks 'over all earlier smaller elements, what is the best length?'. The fast one keeps that answer indexed by length instead of by position, which turns the search into a lookup."
masteryChecklist:
  - I can write the no-two-adjacent recurrence from scratch and compress it to two variables.
  - I can explain what tails[k] means in the patience LIS, and why the array is strictly increasing.
  - Given a DP recurrence, I can say whether it is expressible as a window function and justify the answer.
  - I can write the same prefix DP twice — once as a Python loop and once as a SQL window function — and get identical numbers.
runtimes:
  - engine: python
  - engine: duckdb
    datasetId: package-registry
---

A one-dimensional dynamic program is a loop that remembers a bounded number of
previous answers. That is also a fair description of a SQL window function, and
the overlap is not an accident. It is also not total. This lesson builds three
1-D dynamic programs and then finds the exact line where one of them becomes a
single `OVER` clause and the other two do not.

## No two in a row

You can run a promotion on any subset of days, but never on two consecutive
days — the second one cannibalises the first. Each day is worth its download
count. Maximise the total.

With $a_0 \dots a_{n-1}$ the daily counts and $f(i)$ the best total using only
days $0 \dots i$:

$$
f(i) = \max\big(\,f(i-1),\; f(i-2) + a_i\,\big),
\qquad f(-1) = 0,\quad f(-2) = 0
$$

Two choices at day $i$: skip it, and inherit $f(i-1)$; or take it, which forbids
day $i-1$ and so builds on $f(i-2)$.

```python runnable id=no-two-adjacent
# memoize's ten days from the downloads table.
counts = [812, 892, 972, 1052, 692, 772, 852, 932, 1012, 1092]

def best_promotion_total(a):
    best = [0] * (len(a) + 2)          # best[i + 2] is f(i); the pad holds f(-1), f(-2)
    for i, value in enumerate(a):
        best[i + 2] = max(best[i + 1], best[i] + value)
    return best[len(a) + 1], best[2:]

total, table = best_promotion_total(counts)
for i, (value, f) in enumerate(zip(counts, table)):
    print(f"day {i}: a={value:>5}   f({i}) = {f:>5}")
print("best total:", total)
```

The padding is worth a moment. Rather than special-casing $i = 0$ and $i = 1$,
shift the array by two and let the pad hold the two virtual base values. That
trick generalises to any recurrence that reaches $k$ steps back.

Only two cells are ever read, so the table is optional:

```python runnable id=rolling
counts = [812, 892, 972, 1052, 692, 772, 852, 932, 1012, 1092]

take_none, take_prev = 0, 0            # f(i-2), f(i-1)
for value in counts:
    take_none, take_prev = take_prev, max(take_prev, take_none + value)
print(take_prev)
```

Same answer, $\Theta(1)$ space. Keep that in mind for Lesson 6, where throwing
the table away turns out to have a price.

## Longest increasing subsequence, the obvious way

Given a sequence, find the length of the longest strictly increasing
subsequence. The state that works is *not* "the best subsequence so far" — that
fails step 4 of the state-design procedure, because two prefixes with equally
long subsequences are not interchangeable when their last elements differ. Put
the last element in the state:

Let $L(i)$ be the length of the longest increasing subsequence **ending exactly
at index $i$**.

$$
L(i) \;=\; 1 + \max\big(\{0\} \cup \{\,L(j) \;:\; j < i,\; a_j < a_i \,\}\big)
$$

and the answer is $\max_i L(i)$.

```python runnable id=lis-quadratic
def lis_quadratic(a):
    if not a:
        return 0
    best = [1] * len(a)
    for i in range(len(a)):
        for j in range(i):
            if a[j] < a[i] and best[j] + 1 > best[i]:
                best[i] = best[j] + 1
    return max(best)

sample = [3, 10, 2, 1, 20, 4, 6, 21, 5]
print(lis_quadratic(sample))          # 4 — for example 3, 4, 6, 21
print(lis_quadratic([]), lis_quadratic([7]), lis_quadratic([5, 4, 3]))
```

$n$ states, $O(n)$ transitions each: $\Theta(n^2)$. For $n = 12{,}000$ that is
about three seconds of Python, which is the wrong side of every latency budget
you will ever be given.

## The same DP, indexed by length instead of by position

Here is the move, and it is the reason this problem is in the curriculum.

The quadratic version asks, at each $i$: *among earlier elements smaller than
$a_i$, which has the longest subsequence?* That is a search over positions. Turn
the table around and index by **length** instead:

> $\mathrm{tails}[k]$ = the smallest value that can end an increasing
> subsequence of length $k+1$, among everything seen so far.

Two facts make this pay off, and the second one is the whole trick:

1. `len(tails)` is the current LIS length, because a length-$k{+}1$ subsequence
   exists exactly when $\mathrm{tails}[k]$ is defined.
2. **`tails` is strictly increasing.** A longer subsequence needs a bigger tail
   to end on — you cannot end a length-5 subsequence lower than you can end a
   length-4 one, because the length-5 one contains a length-4 one ending
   strictly lower.

Fact 2 says the DP array is sorted, and a sorted array admits binary search. The
DP insight and the data-structure insight meet on that line.

```python runnable id=lis-patience
from bisect import bisect_left

def lis_fast(a):
    tails = []
    for x in a:
        k = bisect_left(tails, x)      # first index with tails[k] >= x
        if k == len(tails):
            tails.append(x)            # x extends the longest run seen so far
        else:
            tails[k] = x               # x is a cheaper way to end a length-(k+1) run
    return len(tails)

sample = [3, 10, 2, 1, 20, 4, 6, 21, 5]
print(lis_fast(sample), lis_quadratic(sample))

import time, random
random.seed(11)
data = [random.randrange(1_000_000) for _ in range(2000)]
for name, fn in (("quadratic", lis_quadratic), ("patience", lis_fast)):
    start = time.perf_counter()
    answer = fn(data)
    print(f"{name:>9}: {answer}  in {(time.perf_counter() - start) * 1000:8.2f} ms")
```

:::pitfall{title="`tails` is not the answer, only its length is"}
Run the algorithm on `[3, 4, 1]`. After `3` the array is `[3]`; after `4` it is
`[3, 4]`; after `1` it is `[1, 4]`. `[1, 4]` is not an increasing subsequence of
`[3, 4, 1]` at all — the 1 comes *after* the 4 in the input.

`tails[k]` is a bound, not a witness. Recovering the actual subsequence needs
parent pointers alongside the array, which is Lesson 6's subject. Printing
`tails` and calling it the answer is the single most common bug in
implementations of this algorithm.
:::

:::checkpoint{id=cp-lis rubric="tails[k] is the smallest possible last element of an increasing subsequence of length k+1,tails is strictly increasing so it can be binary searched,the length is the answer but the contents are not the subsequence"}
Say what `tails[k]` means, and say why the array can be binary searched at all.
Then say what `tails` is *not*.
:::

## The boundary: when a 1-D DP is a window function

:::dataset{id=package-registry tables="downloads,packages"}
:::

Take a third 1-D problem. Buy one share on some day, sell it on a later day,
maximise the gain. With $m(i)$ the minimum price over days $0 \dots i$ and
$g(i)$ the best gain achievable by selling on or before day $i$:

$$
m(i) = \min\big(m(i-1),\, a_i\big), \qquad
g(i) = \max\big(g(i-1),\; a_i - m(i)\big)
$$

Two prefix scans, one pass, constant space:

```python runnable id=best-gain-python
counts = [812, 892, 972, 1052, 692, 772, 852, 932, 1012, 1092]

cheapest = counts[0]
best_gain = 0
for day, price in enumerate(counts):
    cheapest = min(cheapest, price)
    best_gain = max(best_gain, price - cheapest)
    print(f"day {day}: price={price:>5}  cheapest_so_far={cheapest:>5}  best_gain={best_gain:>4}")
```

Now the same dynamic program, in SQL, with no loop anywhere:

```sql runnable id=best-gain-sql dataset=package-registry
SELECT
  day,
  count                                                            AS downloads,
  min(count) OVER (ORDER BY day ROWS UNBOUNDED PRECEDING)          AS cheapest_so_far,
  count - min(count) OVER (ORDER BY day ROWS UNBOUNDED PRECEDING)  AS gain_today
FROM downloads
WHERE package_id = 13          -- memoize
ORDER BY day;
```

`cheapest_so_far` is $m(i)$, computed by the engine as a running aggregate over
the frame `ROWS UNBOUNDED PRECEDING` — every row from the start of the partition
up to and including this one. The numbers match the Python column exactly,
including the reset at day 4 where the price drops to 692.

To finish it you need the running maximum of `gain_today`, and that is a window
function over a window function, which SQL does not allow in one level. Wrap it:

```sql runnable id=best-gain-running dataset=package-registry
WITH running AS (
  SELECT day, count,
         min(count) OVER (ORDER BY day ROWS UNBOUNDED PRECEDING) AS cheapest_so_far
  FROM downloads
  WHERE package_id = 13
)
SELECT day, count AS downloads, cheapest_so_far,
       max(count - cheapest_so_far) OVER (ORDER BY day ROWS UNBOUNDED PRECEDING) AS best_gain_so_far
FROM running
ORDER BY day;
```

That is the whole DP table, materialised by a query planner instead of by a
`for` loop, and it ends at 400 — the same answer the Python loop prints.

:::insight{title="The rule, and the reason behind it"}
A window function aggregates **input rows**. It cannot read its own output.

So a 1-D DP collapses into a window function exactly when its value happens to
equal an aggregate the engine already ships, taken over a frame the window
specification can describe: a prefix (`ROWS UNBOUNDED PRECEDING`), a bounded
lookback (`ROWS 3 PRECEDING`, or `lag`/`lead`), or the whole partition.

- **Best single gain**: $m(i)$ is literally `min` of the input prefix. Collapses.
- **No two in a row**: $f(i) = \max(f(i-1), f(i-2) + a_i)$ is not `min`, `max`,
  `sum` or `count` of any prefix of the input. There is no frame that produces
  it, because the thing being combined is the DP's own previous output. Does not
  collapse.
- **Longest increasing subsequence**: worse still. $L(i)$ depends on an
  unbounded set of earlier rows selected *by value* ($a_j < a_i$), not by
  position. No frame specification can express a value-dependent frame.

The test to run in your head: *can I write my DP value as an ordinary aggregate
of the raw input rows in some window?* If yes, one statement. If no, you need
what Lesson 5 covers.
:::

:::note{title="The honest footnote"}
"No two in a row" is not mathematically beyond aggregation. Written over the
max-plus semiring it is an associative matrix product, and associative products
*are* the kind of thing a window aggregate could compute — an engine that let
you define an ordered-set aggregate over a $2 \times 2$ max-plus matrix would do
it in one pass.

The obstacle is practical, not theoretical: no mainstream SQL engine ships that
aggregate, and none lets you define one in SQL itself. DuckDB and PostgreSQL
both accept custom aggregates written in C. That is a real escape hatch and it
is a long way outside a query.
:::

::::track{depth=proof}
## Why patience LIS is correct

The algorithm looks like a trick. It is a theorem with an invariant, and the
invariant is exactly the definition of `tails` given above.

:::proof{title="The tails invariant"}
**Setup.** Process $a_0, a_1, \dots$ left to right. After processing the prefix
$a_0 \dots a_{i}$, let $T$ be the array the algorithm holds.

**Invariant.** For every $k$ with $0 \le k < |T|$:

- **(I1)** $T$ is strictly increasing;
- **(I2)** $T[k]$ is the *minimum*, over all strictly increasing subsequences of
  the prefix having length $k+1$, of the final element;
- **(I3)** at least one such subsequence exists, so $|T|$ is the length of the
  longest increasing subsequence of the prefix.

**Base case.** The empty prefix gives $T = [\,]$ and all three hold vacuously.

**Inductive step.** Assume the invariant after the prefix ending at $a_{i-1}$,
and process $x = a_i$. Let $k = \texttt{bisect\_left}(T, x)$, which by (I1) is
exactly the number of entries strictly less than $x$; so $T[k-1] < x$ when
$k > 0$, and $T[k] \ge x$ when $k < |T|$.

*New subsequences ending at $x$.* Since $x$ is the newest element, any
subsequence of the new prefix that uses $x$ ends at $x$. Such a subsequence of
length $j+1$ exists iff there is one of length $j$ ending strictly below $x$,
which by (I2) happens iff $T[j-1] < x$, i.e. iff $j \le k$. So $x$ can end a
subsequence of length exactly $k+1$ and no longer.

*Case $k = |T|$.* Every entry is below $x$, so appending $x$ records a
subsequence of length $k+1$, and by the previous paragraph none existed before.
Every length-$(k{+}1)$ subsequence of the new prefix must use $x$ and therefore
end at $x$, so the minimum final element for that length is $x$: (I2) holds for
the new slot. (I1) holds because $T[k-1] < x$. (I3) is witnessed by the
extension of a minimal length-$k$ subsequence.

*Case $k < |T|$.* Setting $T[k] \leftarrow x$ can only lower the entry, since
$T[k] \ge x$. It is not too low: suppose some increasing subsequence of the new
prefix has length $k+1$ and ends at $y < x$. It cannot use $x$ (that would make
$y = x$), so it lies inside the old prefix, and (I2) for the old array gives
$T_{\text{old}}[k] \le y < x$ — contradicting $T_{\text{old}}[k] \ge x$. So $x$
is the new minimum and (I2) holds. (I1) survives because
$T[k-1] < x \le T_{\text{old}}[k] < T_{\text{old}}[k+1]$.

*Other slots are unchanged.* For $j < k$, a length-$(j{+}1)$ subsequence ending
at $x$ is no improvement, because $T[j] < x$ already. For $j > k$, no
subsequence of that length ends at $x$ at all. So no other entry can be lowered,
and (I2) continues to hold everywhere. $\blacksquare$
:::

(I3) is the payoff: $|T|$ is the LIS length of every prefix, so it is the LIS
length of the whole sequence when the loop ends. Each step is one binary search
and one assignment, giving $\Theta(n \log n)$.

### Where the name comes from, and what it buys

Deal the sequence into piles, greedily placing each card on the leftmost pile
whose top is $\ge$ it, starting a new pile when none qualifies. That is
literally the algorithm; the pile tops are $T$. The game is patience, hence
"patience sorting".

The number of piles equals the LIS length, and there is a second reading of the
same fact: each pile is a *non-increasing* subsequence, so the sequence is
covered by $|T|$ non-increasing subsequences. Since no two elements of an
increasing subsequence can share a pile, no increasing subsequence can be longer
than the number of piles either. Minimum cover by chains equals maximum
antichain — the finite case of **Dilworth's theorem**, arrived at by running a
greedy algorithm and reading off the answer.
::::

:::exercise{ref=lis-fast}
:::

:::exercise{ref=best-gain-per-package}
:::

:::exercise{ref=gain-dp-table}
:::

:::quiz{id=quiz-l03 passing=2}
- id: q1
  prompt: "Why can `bisect_left` be used on the tails array?"
  options:
    - "Because binary search is always faster than a linear scan on a DP table."
    - "Because the array is strictly increasing — a longer increasing subsequence cannot end lower than a shorter one."
    - "Because the input sequence is sorted before processing."
    - "Because bisect falls back to a linear scan when the array is unsorted."
  answerIndex: 1
  explanation: >-
    Binary search is legal only on a sorted array, and this array is sorted
    because of the DP itself: a length-(k+1) subsequence contains a length-k one
    ending strictly lower, so tails[k] > tails[k-1] always. The input is not
    sorted and must not be — sorting it would destroy the order the problem is
    about.
- id: q2
  prompt: "Which of these 1-D recurrences can be written as a single SQL window function over the input rows?"
  options:
    - "f(i) = max(f(i-1), f(i-2) + a[i]) — no two adjacent."
    - "m(i) = min(m(i-1), a[i]) — running minimum."
    - "L(i) = 1 + max over j < i with a[j] < a[i] of L(j) — longest increasing subsequence."
    - "All three; window frames are general enough for any prefix recurrence."
  answerIndex: 1
  explanation: >-
    A window function aggregates input rows, never its own output. The running
    minimum happens to equal `min` of the input prefix, so `min(...) OVER (ORDER
    BY day ROWS UNBOUNDED PRECEDING)` computes it exactly. The other two combine
    previously computed DP values — and LIS additionally selects earlier rows by
    value rather than by position, which no frame specification can express.
- id: q3
  prompt: "After running patience LIS on [3, 4, 1], tails is [1, 4]. What does that tell you?"
  options:
    - "The longest increasing subsequence is 1, 4."
    - "The longest increasing subsequence has length 2; [1, 4] is not itself a subsequence of the input."
    - "The algorithm has a bug, since 1 appears after 4 in the input."
    - "The input has two increasing subsequences of maximum length."
  answerIndex: 1
  explanation: >-
    Only the length is meaningful. tails[k] records the smallest value that
    *could* end a length-(k+1) subsequence, and those bounds come from different
    subsequences, so the array need not be a subsequence at all. Here the real
    answer is [3, 4]. Recovering an actual witness needs parent pointers, which
    is Lesson 6.
:::
