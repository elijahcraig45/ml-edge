---
id: t2/s04/l03
title: The comparison barrier, and how to get under it
tier: t2-core-structures
stage: s04-sorting-and-windows
status: published
estimatedMinutes: 50
objectives:
  - State the comparison-sort lower bound and explain the decision-tree argument behind it.
  - Implement counting sort, and say exactly when its cost becomes unacceptable.
  - Implement LSD radix sort and explain why its inner sort must be stable.
prerequisites:
  - t1/s01/l03
  - t2/s04/l01
misconceptions:
  - "**\"$n \\log n$ is a limit on sorting.\"** It is a limit on *comparison* sorting — algorithms whose only access to the data is asking \"is this one smaller?\". Counting sort and radix sort look at the keys themselves and are linear. The bound is a statement about an interface, not about the problem."
  - "**\"Radix sort is always faster, so use it.\"** Radix sort costs $\\Theta(d(n+b))$ for $d$ digit passes over base $b$. On 64-bit keys with $d = 8$ byte-passes it moves the whole array eight times. Below roughly a hundred thousand elements a good quicksort usually wins on cache alone."
  - "**\"Counting sort needs the keys to be small, but I can just use a dict for sparse keys.\"** Then you are no longer indexing by key, you are hashing, and you have to sort the distinct keys to emit them in order — which puts a comparison sort right back in the middle of your linear algorithm."
  - "**\"The lower bound proof needs Stirling's approximation.\"** It needs only that $n!$ has at least $(n/2)^{n/2}$ factors of size at least $n/2$. Stirling sharpens the constant; the $\\Omega(n\\log n)$ conclusion survives a much cruder bound."
masteryChecklist:
  - I can explain why a correct comparison sort's decision tree needs at least n! leaves.
  - I can write counting sort and state its cost in terms of both n and the key range k.
  - I can say why LSD radix sort breaks if the per-digit sort is unstable.
runtimes:
  - engine: python
  - engine: duckdb
    datasetId: package-registry
---

Every sort you have written so far learns about the data in exactly one way: it
asks whether one element is smaller than another. That restriction has a price,
and the price is provable.

**Theorem.** Any sorting algorithm whose only access to the elements is pairwise
comparison must make $\Omega(n \log n)$ comparisons in the worst case.

Not "no known algorithm does better". No algorithm *can*. And the argument is
short enough to hold in your head.

## The counting argument, in three sentences

There are $n!$ possible orderings of $n$ distinct elements, and a correct sort
must be able to produce every one of them — otherwise there is an input it gets
wrong.

Each comparison returns one of two answers, so the algorithm's whole execution
is a walk down a **decision tree**: internal nodes are comparisons, the two
edges out of a node are the two answers, and each leaf is an output ordering.
After $h$ comparisons at most $2^h$ leaves are reachable.

To tell $n!$ cases apart you need $2^h \ge n!$, that is $h \ge \log_2(n!)$, and
$\log_2(n!)$ grows like $n \log_2 n$.

```python runnable id=log-factorial
import math

print(f"{'n':>8}  {'log2(n!)':>12}  {'n*log2(n)':>12}  {'ratio':>6}")
for n in (10, 100, 1_000, 100_000, 1_000_000):
    lower = math.log2(math.factorial(n)) if n <= 100_000 else n * math.log2(n) - n * math.log2(math.e)
    print(f"{n:>8,}  {lower:>12,.0f}  {n * math.log2(n):>12,.0f}  {lower / (n * math.log2(n)):>6.3f}")
```

The ratio climbs toward 1. $\log_2(n!)$ is not merely $\Omega(n\log n)$ — it is
$n\log_2 n$ minus a linear term, so merge sort's $n\log_2 n$ comparisons are
within a few percent of optimal. There is no clever comparison sort waiting to
be discovered.

:::insight{title="The bound is about an interface, not about sorting"}
Read the theorem's hypothesis again: *whose only access to the elements is
pairwise comparison*. That is a restriction on what the algorithm is allowed to
look at. Lift it — let the algorithm read the key's bits and use them as an
address — and the argument collapses, because now a single operation can
distinguish far more than two cases.

This is the shape of most lower bounds you will meet. They almost never say "the
problem is hard". They say "in this model, with these operations, here is the
floor".
:::

## Counting sort: use the key as an address

If the keys are integers in a known small range, you do not have to compare
anything. Count how many of each key you have, turn the counts into starting
offsets, and place each element directly.

```python runnable id=counting-sort
def counting_sort(pairs, k):
    """Sort (key, payload) pairs by key, where 0 <= key < k. Stable."""
    counts = [0] * k
    for key, _ in pairs:
        counts[key] += 1

    # Prefix sums turn "how many of each" into "where does each bucket start".
    starts = [0] * k
    total = 0
    for key in range(k):
        starts[key] = total
        total += counts[key]

    out = [None] * len(pairs)
    for key, payload in pairs:          # left to right => stable
        out[starts[key]] = (key, payload)
        starts[key] += 1
    return out


releases = [(3, "chunker"), (1, "bitmask"), (4, "probe"), (1, "arrowkit"), (0, "memoize")]
for row in counting_sort(releases, 5):
    print(row)
```

No element is ever compared with another. The cost is $\Theta(n + k)$: one pass
to count, one pass over the $k$ buckets, one pass to place.

Two details are load-bearing.

**The prefix sum.** `starts` is a running total of `counts` — the same prefix-sum
trick that lesson 5 uses for range queries and lesson 6 issues as
`SUM() OVER (ORDER BY ...)`. It converts a histogram into a set of write
positions in one pass.

**Left-to-right placement.** Walking the input forwards and incrementing
`starts[key]` after each write puts earlier elements at earlier positions within
their bucket. Counting sort is stable *because of the direction of that loop*.
Walk backwards over the input with `starts` holding end offsets and you get the
same sorted order with ties reversed.

:::pitfall{title="k is not a constant"}
Counting sort is linear in $n + k$, not in $n$. Sorting a million 32-bit
integers this way allocates a counts array of $2^{32}$ entries — sixteen
gigabytes — to sort forty megabytes of data.

The rule is $k = O(n)$. Sorting ages, HTTP status codes, day-of-month, or a
low-cardinality category column: yes. Sorting arbitrary integers, floats, or
strings: no.
:::

:::checkpoint{id=cp-barrier rubric="the bound only applies to algorithms that access data through comparisons,counting sort reads the key and uses it as an index,cost becomes n + k so k must stay near n"}
Counting sort sorts $n$ elements in $\Theta(n + k)$ time, which is linear. Why
does that not contradict the theorem at the top of this lesson — and what stops
you from using it everywhere?
:::

## Radix sort: many small key ranges instead of one big one

Radix sort fixes counting sort's $k$ problem by never letting $k$ get large. Cut
each key into $d$ digits in base $b$, and sort by one digit at a time —
least-significant digit first — with a stable counting sort each pass.

```python runnable id=radix-sort
def counting_sort_by_digit(values, exp, base=10):
    counts = [0] * base
    for v in values:
        counts[(v // exp) % base] += 1
    starts, total = [0] * base, 0
    for d in range(base):
        starts[d] = total
        total += counts[d]
    out = [0] * len(values)
    for v in values:
        d = (v // exp) % base
        out[starts[d]] = v
        starts[d] += 1
    return out


def radix_sort(values, base=10):
    if not values:
        return []
    exp = 1
    while max(values) // exp > 0:
        values = counting_sort_by_digit(values, exp, base)
        exp *= base
    return values


data = [170, 45, 75, 90, 2, 802, 24, 66]
print(radix_sort(data))
```

Cost: $\Theta(d\,(n + b))$. For 32-bit integers with $b = 256$ that is four
passes over the data with a 256-entry counter — linear in $n$ with a constant of
four, regardless of how many distinct values there are.

Now the part that ties back to lesson 1. **The per-digit sort must be stable, or
radix sort is wrong.** After sorting by the ones digit, the array is
correctly ordered by the ones digit. The tens pass must preserve that ordering
inside each group of equal tens digits — which is exactly the definition of
stability. Watch it break:

```python runnable id=radix-needs-stability
def by_digit(values, exp, base=10, stable=True):
    buckets = [[] for _ in range(base)]
    for v in values:
        bucket = buckets[(v // exp) % base]
        bucket.append(v) if stable else bucket.insert(0, v)  # prepend reverses ties
    return [v for bucket in buckets for v in bucket]


def radix(values, stable):
    exp = 1
    while max(values) // exp > 0:
        values = by_digit(values, exp, stable=stable)
        exp *= 10
    return values


data = [170, 45, 75, 90, 2, 802, 24, 66]
print("stable  :", radix(list(data), stable=True))
print("unstable:", radix(list(data), stable=False))
```

Same buckets, same passes, one property removed, wrong answer. Stability is not
decoration here — it is the correctness argument.

## What the engine does

`ORDER BY` in a column store is one of the places this theory shows up
unchanged. DuckDB sorts fixed-width keys — integers, dates, decimals — with a
radix sort over a normalised binary key, falling back to a comparison-based
merge sort for variable-length types like long strings. The reason is exactly
the trade-off above: a fixed-width key can be sliced into digits, and a
variable-length one cannot without first knowing how long it is.

```sql runnable id=order-by-narrow-key dataset=package-registry
-- Sorting by a DATE: a fixed-width key an engine can radix-sort.
SELECT name, created_at
FROM packages
ORDER BY created_at
LIMIT 5;
```

The practical version of the lesson: **a narrow, fixed-width sort key is
cheaper than a wide one**, and it is cheaper for a reason you can now state.
Sorting by an integer surrogate key and joining back for the label is not
premature optimisation; it is choosing the model in which the linear algorithm
is available.

::::track{depth=proof}
## The decision-tree lower bound, properly

**Model.** Fix a comparison sort $A$ and an input size $n$. Assume the $n$
elements are distinct — this only makes the problem easier, so a lower bound
here is a lower bound in general. $A$ may do anything it likes, but the only way
it learns about the data is by asking questions of the form "is $a_i \le a_j$?".

**The tree.** Build a rooted binary tree $T_n$ for $A$ as follows. The root is
the first comparison $A$ performs. Each internal node is a comparison, with its
two children corresponding to the two possible answers. Follow a path from the
root by answering according to some particular input; the path ends when $A$
stops asking and emits a permutation. Label that leaf with the permutation
emitted.

Every input of size $n$ traces exactly one root-to-leaf path, and the number of
comparisons $A$ makes on that input is the depth of that leaf. So the worst-case
comparison count of $A$ is the **height** $h$ of $T_n$.

**Claim 1: $T_n$ has at least $n!$ leaves.**

Suppose two input permutations $\pi \ne \sigma$ reach the same leaf $\ell$. The
leaf carries a single output permutation, so $A$ applies the same rearrangement
to both. That rearrangement sorts at most one of them: if it sorts $\pi$'s
elements into increasing order, then applying it to $\sigma$ — whose elements sit
in different positions — leaves them out of order. So $A$ is wrong on one of the
two inputs. A correct $A$ therefore sends distinct permutations to distinct
leaves, and there are $n!$ of them.

**Claim 2: a binary tree of height $h$ has at most $2^h$ leaves.**

Induction on $h$. A tree of height $0$ is a single leaf, and $2^0 = 1$. A tree of
height $h > 0$ has at most two subtrees, each of height at most $h-1$, so at most
$2 \cdot 2^{h-1} = 2^h$ leaves.

**Combining.** $2^h \ge (\text{number of leaves}) \ge n!$, hence
$$h \ge \log_2(n!).$$

**Bounding $\log_2(n!)$ without Stirling.** Keep only the largest half of the
factors:
$$n! = 1 \cdot 2 \cdots n \;\ge\; \underbrace{\frac{n}{2} \cdot \frac{n}{2} \cdots \frac{n}{2}}_{n/2 \text{ factors}} = \left(\frac{n}{2}\right)^{n/2},$$
because each of the top $n/2$ factors is at least $n/2$. Taking logarithms,
$$\log_2(n!) \;\ge\; \frac{n}{2}\log_2\frac{n}{2} \;=\; \frac{n}{2}\log_2 n - \frac{n}{2} \;=\; \Omega(n\log n).$$

Stirling's approximation $n! \sim \sqrt{2\pi n}\,(n/e)^n$ sharpens this to
$$\log_2(n!) = n\log_2 n - n\log_2 e + \Theta(\log n) \approx n\log_2 n - 1.4427\,n,$$
which is what the table at the top of the lesson is showing. $\blacksquare$

**The average case comes free.** A binary tree with $L$ leaves has average leaf
depth at least $\log_2 L$ — the balanced tree minimises it. So even the *expected*
number of comparisons, over inputs drawn uniformly from the $n!$ permutations,
is at least $\log_2(n!) = \Omega(n\log n)$. You cannot escape by being fast on
typical input.

**Three things the theorem does not say.**

It does not bound *running time*, only comparisons. An algorithm could make
$n\log n$ comparisons and spend $n^3$ time between them.

It says nothing about randomised algorithms doing better in expectation — but
the average-case remark above closes that door too, by Yao's principle applied
to the uniform distribution over permutations.

And it says nothing at all about algorithms that read the keys. Counting sort
performs zero comparisons and finishes in $\Theta(n+k)$; it is not a
counterexample, it is outside the model. Every time you see a bound broken, look
for the hypothesis that was dropped.
::::

:::exercise{ref=counting-sort}
:::

:::exercise{ref=radix-sort-versions}
:::

:::quiz{id=quiz-l03 passing=2}
- id: q1
  prompt: "Why does a correct comparison sort's decision tree need at least n! leaves?"
  options:
    - "Because there are n! ways to compare n elements."
    - "Because two different input permutations that reach the same leaf would receive the same rearrangement, which cannot sort both."
    - "Because each comparison has two outcomes and there are n elements."
    - "Because the tree must be balanced for the algorithm to be efficient."
  answerIndex: 1
  explanation: >-
    A leaf is a fixed output rearrangement. If two distinct input orderings land
    on it, the same permutation is applied to both, and it can put at most one of
    them in order — so the algorithm is wrong on the other. Distinct inputs
    therefore need distinct leaves, and there are n! distinct inputs. The number
    of possible comparisons is irrelevant, and nothing in the argument requires
    the tree to be balanced.
- id: q2
  prompt: "You need to sort 10 million 64-bit user ids. Counting sort is linear. Should you use it?"
  options:
    - "Yes — linear always beats n log n at that scale."
    - "No, because counting sort is unstable."
    - "No. Cost is Theta(n + k) and here k is 2^64, so the counts array alone is impossible."
    - "No, because counting sort only works on strings."
  answerIndex: 2
  explanation: >-
    The k term is the key range, not the number of distinct keys present, and a
    64-bit range makes the counts array astronomically large. Counting sort is
    stable, which is a point in its favour, not against it. Radix sort is the
    right answer for this input: eight byte-wide passes with a 256-entry counter,
    still linear in n with no dependence on the key range.
- id: q3
  prompt: "LSD radix sort with an unstable per-digit sort produces wrong output. Why?"
  options:
    - "Because unstable sorts are slower, so later passes time out."
    - "Because each pass must preserve the ordering established by all previous passes among keys with the same current digit."
    - "Because unstable sorts cannot handle negative digits."
    - "Because the number of passes depends on stability."
  answerIndex: 1
  explanation: >-
    After the ones pass, the array is ordered by the ones digit. The tens pass
    groups by tens digit, and inside each group the previous ordering is the only
    thing that keeps the ones digits correct. Preserving the order of elements
    that tie on the current key is the definition of stability, so an unstable
    inner sort erases every earlier pass. This is the same composition property
    that lets you sort by two keys with two passes.
:::
