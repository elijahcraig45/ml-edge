---
id: t2/s04/l04
title: Selection, runs, and sorting more data than you have memory for
tier: t2-core-structures
stage: s04-sorting-and-windows
status: published
estimatedMinutes: 50
objectives:
  - Implement quickselect and explain why its expected cost is linear rather than n log n.
  - Describe median-of-medians and say what it guarantees and why it is rarely used alone.
  - Explain run detection in Timsort, and how external merge sort turns a memory limit into a pass count.
prerequisites:
  - t1/s01/l03
  - t2/s04/l02
misconceptions:
  - "**\"To get the top 10 you sort and take 10.\"** That pays $n\\log n$ to answer a question worth $n$. Quickselect finds the boundary in expected linear time; a bounded heap of size 10 does it in $n\\log 10$ with 10 words of memory. Sorting is the answer to a question you were not asked."
  - "**\"Quickselect's expected linear time comes from halving, like binary search.\"** Binary search discards half of a *sorted* array. Quickselect discards an expected constant fraction of an *unsorted* one, and the work at each step is linear rather than constant — so the total is the geometric series $n + n/2 + n/4 + \\cdots = 2n$, not $\\log n$."
  - "**\"Median-of-medians is how real libraries find medians.\"** Its constant factor is large enough that it loses to plain quickselect on essentially all real input. It is used as a *fallback*: introselect runs quickselect and switches to it only when progress stalls, exactly as introsort falls back to heap sort."
  - "**\"Timsort is just merge sort.\"** Merge sort ignores the input; Timsort reads it. It finds existing ascending and descending runs, extends short ones with insertion sort, and merges with a stack discipline plus galloping. On already-sorted input it is $\\Theta(n)$, which merge sort never is."
masteryChecklist:
  - I can write quickselect from a partition function and argue its expected cost with a geometric series.
  - I can say what fraction of the array median-of-medians guarantees to discard, and where the 3n/10 comes from.
  - Given a memory budget and a data size, I can compute how many passes an external merge sort needs.
runtimes:
  - engine: python
---

You have a hundred million download records and you want the 99th percentile.
You do not want them sorted. You want one number.

Sorting would give it to you, along with $n\log n$ work and an answer to
99,999,999 questions nobody asked. There is a linear algorithm for the question
you actually have, and it is quicksort with one line deleted.

## Quickselect: recurse on one side

Partition the array. The pivot lands at index $k$. Now compare $k$ to the index
you want. If it matches, you are done. If not, the answer is on one side, and
the other side can be thrown away entirely.

```python runnable id=quickselect
import random

comparisons = 0


def partition(values, lo, hi):
    global comparisons
    pivot = values[hi]
    boundary = lo
    for i in range(lo, hi):
        comparisons += 1
        if values[i] <= pivot:
            values[boundary], values[i] = values[i], values[boundary]
            boundary += 1
    values[boundary], values[hi] = values[hi], values[boundary]
    return boundary


def quickselect(values, k):
    """k-th smallest, 0-indexed. Rearranges `values` in place."""
    lo, hi = 0, len(values) - 1
    while lo < hi:
        pivot_index = random.randint(lo, hi)
        values[pivot_index], values[hi] = values[hi], values[pivot_index]
        p = partition(values, lo, hi)
        if p == k:
            return values[k]
        if p < k:
            lo = p + 1        # answer is strictly right of the pivot
        else:
            hi = p - 1        # answer is strictly left of the pivot
    return values[k]


import math

random.seed(11)
n = 20_000
data = random.sample(range(n * 10), n)

comparisons = 0
median = quickselect(list(data), n // 2)

merge_sort_cost = n * math.log2(n)      # merge sort's comparison count
print(f"quickselect: {median:,} in {comparisons:>9,} comparisons")
print(f"merge sort would need about  {merge_sort_cost:>9,.0f}")
print(f"ratio: {merge_sort_cost / comparisons:.1f}x")
```

Notice the loop rather than recursion. Quickselect only ever continues into one
side, so the recursive call is in tail position and collapses into a `while`.
That also removes any stack-depth risk on adversarial input.

**Why linear.** A random pivot splits the range into something like halves on
average, and each round does work proportional to the range it is looking at:
$$n + \frac{n}{2} + \frac{n}{4} + \frac{n}{8} + \cdots = 2n.$$
Compare that to quicksort, which must process *both* sides at every level and
therefore does $\Theta(n)$ work per level for $\log n$ levels. Deleting one
recursive call turns $n\log n$ into $2n$.

```python runnable id=geometric-series
n = 1_000_000
total, size = 0, n
while size >= 1:
    total += size
    size //= 2
print(f"n + n/2 + n/4 + ... = {total:,}  (2n = {2 * n:,})")
```

The worst case is the same $\Theta(n^2)$ as quicksort, for the same reason, and
the same fix applies: pick the pivot at random so no input can force it.

:::checkpoint{id=cp-select rubric="quicksort recurses into both sides so every level costs n,quickselect recurses into one side so the sizes shrink geometrically,the sum n + n/2 + n/4 is 2n"}
Quicksort and quickselect use the same partition function and the same random
pivot. Why is one $n \log n$ and the other $n$? Answer in terms of what happens
after the partition returns.
:::

## Median-of-medians: a guarantee, at a price

Randomisation gives you an *expected* bound. If you need a worst-case linear
guarantee — real-time systems, adversarial input, or a proof — there is one, and
it works by spending linear time to choose a provably decent pivot.

1. Split the $n$ elements into $\lceil n/5 \rceil$ groups of five.
2. Find each group's median directly. Five elements is a constant amount of work.
3. Recursively find the median *of those medians*. Call it $p$.
4. Use $p$ as the partition pivot.

The point is what $p$ guarantees. Half of the $n/5$ group medians are $\le p$,
and each of those groups contributes three elements $\le p$ (its median and the
two below it). So at least
$$3 \cdot \frac{1}{2} \cdot \frac{n}{5} = \frac{3n}{10}$$
elements are $\le p$, and symmetrically at least $3n/10$ are $\ge p$. Whichever
side you recurse into holds at most $7n/10$ elements — **guaranteed**, for every
input.

That gives the recurrence
$$T(n) \le T\!\left(\frac{n}{5}\right) + T\!\left(\frac{7n}{10}\right) + \Theta(n),$$
and because $\frac{1}{5} + \frac{7}{10} = \frac{9}{10} < 1$, the work shrinks
geometrically down the recursion and $T(n) = \Theta(n)$. If the groups were of
size three instead of five, the fractions would sum to $1$ and the bound would
fail — that is where the magic number 5 comes from.

:::pitfall{title="Correct, guaranteed, and slower than the thing it replaces"}
Median-of-medians does roughly ten to twenty times the work of plain quickselect
on ordinary input, because every level pays for a full recursive selection
merely to choose a pivot. Nobody ships it as the primary algorithm.

What libraries ship is **introselect**: run randomised quickselect, count
iterations, and if the range is not shrinking fast enough, fall back to
median-of-medians for the remainder. C++'s `nth_element` and NumPy's
`partition` both work this way. The same pattern as introsort — a fast
average-case algorithm with a provable algorithm bolted on as insurance.
:::

## Real data arrives partly sorted

Merge sort and quicksort both ignore the input's existing structure. Real inputs
have plenty: log files sorted by timestamp, records appended in id order, a list
re-sorted after three rows changed.

Timsort — CPython's `list.sort`, and Java's sort for objects — starts by
*looking*. It scans for a maximal run that is already ordered, either ascending
or strictly descending, and reverses descending runs in place.

```python runnable id=find-runs
def find_runs(values):
    """Split into maximal ascending or strictly descending runs."""
    runs, i, n = [], 0, len(values)
    while i < n:
        j = i + 1
        if j < n and values[j] < values[i]:
            while j < n and values[j] < values[j - 1]:   # strictly descending
                j += 1
            runs.append(("desc", values[i:j]))
        else:
            while j < n and values[j] >= values[j - 1]:  # ascending, ties allowed
                j += 1
            runs.append(("asc", values[i:j]))
        i = j
    return runs


for kind, run in find_runs([1, 2, 3, 9, 8, 7, 4, 4, 5, 2]):
    print(f"{kind}: {run}")
```

Look closely at the two `while` conditions. Ascending allows ties (`>=`);
descending does not (`<`). That asymmetry is not a typo — it is a stability
requirement. A descending run gets **reversed in place**, and reversing a run
that contained equal elements would swap them, destroying stability. By refusing
to let ties into a descending run, the reversal is always safe.

The rest of Timsort is engineering on top of that idea: runs shorter than a
computed minimum get extended with insertion sort, runs are merged under a stack
invariant that keeps merge sizes balanced, and merging uses *galloping* —
exponential search — when one run keeps winning, so appending a sorted block to
a sorted list costs about $\log n$ comparisons instead of $n$.

The payoff: `sorted(already_sorted_list)` is $\Theta(n)$. Merge sort would still
pay $n\log n$.

::::track{depth=systems}
## When the data does not fit: external merge sort

Every sort so far assumed random access to the whole array. Databases cannot
assume that. A sort of a 500 GB table on a machine with 8 GB of sort memory is
routine, and the algorithm that does it is merge sort — not by preference, but
because merging reads its inputs **sequentially**, and sequential I/O is the only
kind that is cheap.

**Phase 1, run generation.** Read $M$ bytes, sort them in memory with your
favourite in-memory sort, write the sorted block out as a *run*. Repeat. A table
of size $N$ produces $\lceil N/M \rceil$ runs, and this phase reads and writes
the whole dataset exactly once.

**Phase 2, merging.** Open $k$ runs at once, keep a small read buffer for each,
and repeatedly emit the smallest head element. Finding it among $k$ candidates is
a heap operation, $O(\log k)$. Each merge round reduces the run count by a factor
of $k$, so the number of merge passes is
$$P = \left\lceil \log_k \frac{N}{M} \right\rceil,$$
and total I/O is $2N(P + 1)$ bytes — every pass reads and writes everything.

Put numbers on it. $N = 500\ \text{GB}$, $M = 8\ \text{GB}$: 63 runs. With a
fan-in of $k = 64$, $\log_{64} 63 < 1$, so **one** merge pass suffices and the
whole sort touches disk four times: write the runs, read them back. With
$k = 8$ you would need two passes and 50% more I/O.

That is why fan-in is a tuning knob, and why it is not set to "all the
runs". Each open run needs a read buffer large enough to make its reads
sequential; with $k$ runs and $M$ bytes of memory each buffer gets $M/k$. Push
$k$ too high and the buffers get small enough that the reads become random, and
you have traded one merge pass for a hundredfold slowdown on every read.

**How it surfaces.** In PostgreSQL, `EXPLAIN ANALYZE` prints
`Sort Method: external merge  Disk: 148520kB` when `work_mem` was too small,
and `quicksort  Memory: 26kB` when it was not. That one line is the difference
between a query that runs in memory and one that writes the whole intermediate
result to disk twice. DuckDB does the same thing with its own spilling sort and
a `memory_limit` setting.

**What to do about it.** Three moves, in order of leverage:

1. **Sort less.** Project away the columns you do not need *before* the sort, so
   each row is smaller and more of them fit in $M$. A sort of `(id, score)` is a
   different problem from a sort of the whole row.
2. **Do not sort at all.** `ORDER BY x LIMIT 100` does not need a sort — a
   bounded heap answers it in one pass with 100 rows of memory. Lesson 6 shows
   this in a real query plan.
3. **Raise the budget deliberately.** `work_mem` is per sort node per connection,
   not per query. Twenty concurrent queries with three sorts each will happily
   allocate sixty times whatever you set.

The theory in this lesson is not decoration around any of that. "How many passes"
is $\lceil \log_k (N/M) \rceil$, and that formula is the whole capacity plan.
::::

:::exercise{ref=quickselect-kth}
:::

:::exercise{ref=detect-runs}
:::

:::quiz{id=quiz-l04 passing=2}
- id: q1
  prompt: "Quickselect and quicksort share a partition function and a random pivot. Why is quickselect expected-linear?"
  options:
    - "Because partitioning is cheaper when you only want one element."
    - "Because after partitioning it continues into only one side, so the subproblem sizes shrink geometrically and n + n/2 + n/4 + ... = 2n."
    - "Because it stops as soon as it finds the pivot at index k, which usually happens on the first partition."
    - "Because it does not need to compare elements on the discarded side."
  answerIndex: 1
  explanation: >-
    The partition itself is identical and costs the same. The difference is what
    happens next: quicksort processes both halves, so every level still costs
    Theta(n) and there are log n levels. Quickselect throws one side away, so the
    per-level cost halves and the total telescopes to about 2n. Landing exactly
    on k in the first partition is a 1-in-n event, not the reason.
- id: q2
  prompt: "Median-of-medians uses groups of five. What does that buy?"
  options:
    - "Five is the largest group whose median can be found without recursion."
    - "It guarantees at least 3n/10 elements fall on each side of the pivot, so the recursion is T(n/5) + T(7n/10) + O(n), and 1/5 + 7/10 < 1."
    - "It makes the algorithm stable."
    - "It reduces the number of comparisons below the n log n bound for sorting."
  answerIndex: 1
  explanation: >-
    Half the group medians are below the chosen pivot, and each such group
    contributes three elements below it, giving the 3n/10 guarantee and a
    worst-case 7n/10 subproblem. The recursion converges because the two
    fractions sum to 9/10 — with groups of three they would sum to 1 and the
    bound would fail. Selection is not sorting, so the n log n comparison bound
    does not apply to it either way, and nothing here concerns stability.
- id: q3
  prompt: "Timsort allows ties inside an ascending run but not inside a descending run. Why?"
  options:
    - "Descending runs are rarer, so the check is a performance heuristic."
    - "Because a descending run is reversed in place, and reversing equal elements would swap them and break stability."
    - "Because comparing with < is faster than comparing with <=."
    - "Because ties inside a descending run would make the run length calculation wrong."
  answerIndex: 1
  explanation: >-
    Timsort normalises a descending run by reversing it. If two equal elements
    were inside that run, the reversal would put the later one first, which is
    precisely what stability forbids. Requiring strict descent means every
    reversed run contains no ties, so the reversal cannot reorder anything that
    compares equal. Nothing about it is a speed heuristic.
:::
