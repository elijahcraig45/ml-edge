---
id: t2/s04/l02
title: Quicksort, and the price of a bad pivot
tier: t2-core-structures
stage: s04-sorting-and-windows
status: published
estimatedMinutes: 45
objectives:
  - State the partition invariant and write a partition that maintains it in place.
  - Explain why quicksort degrades to O(n squared) and what a random pivot actually buys.
  - Say when heap sort is the right choice, and why it is almost never the default.
prerequisites:
  - t1/s01/l03
  - t2/s04/l01
misconceptions:
  - "**\"Quicksort is O(n log n).\"** Its *average* is. Its worst case is $\\Theta(n^2)$, and the classic trigger — first element as pivot, already-sorted input — is the most common shape real data arrives in."
  - "**\"A random pivot makes the worst case go away.\"** The worst case is still $\\Theta(n^2)$. What randomisation removes is the ability of the *input* to cause it. The bad case stops being a property of your data and becomes a property of your coin flips, which no adversary controls."
  - "**\"Quicksort beats merge sort because it does fewer comparisons.\"** It does more: about $1.39\\,n\\log_2 n$ against merge sort's $n\\log_2 n$. It wins on memory traffic — it sorts in place, allocates nothing, and touches memory in two sequential scans."
  - "**\"Partitioning splits the array into two sorted halves.\"** It splits it into two *unsorted* halves with a boundary guarantee: everything left of the pivot is at most the pivot, everything right is at least. The pivot itself is the only element in its final position."
masteryChecklist:
  - I can write the Lomuto partition loop and state its invariant at the top of each iteration.
  - I can construct an input that makes a named pivot rule quadratic.
  - I can explain in one sentence why quicksort is usually faster than merge sort despite doing more comparisons.
runtimes:
  - engine: python
---

Quicksort inverts merge sort. Merge sort does no work on the way down and all
of it on the way back up. Quicksort does all its work on the way down — it
partitions first, and once both sides are sorted there is nothing left to
combine.

That inversion is why quicksort needs no extra array, and why one bad choice
can cost you a factor of $n$.

## The partition invariant

Partitioning around a pivot value $p$ rearranges a range so that everything
before some boundary is $\le p$ and everything after is $\ge p$. Nothing inside
either side is sorted. Exactly one element — the pivot — ends up where it will
finally live.

Here is the Lomuto scheme, which keeps one pointer and one scan:

```python runnable id=lomuto
def partition(values, lo, hi):
    """Partition values[lo..hi] around values[hi]. Returns the pivot's index."""
    pivot = values[hi]
    boundary = lo                     # values[lo..boundary-1] are all <= pivot
    for i in range(lo, hi):
        if values[i] <= pivot:
            values[boundary], values[i] = values[i], values[boundary]
            boundary += 1
    values[boundary], values[hi] = values[hi], values[boundary]
    return boundary


data = [9, 3, 7, 1, 8, 2, 5]
k = partition(data, 0, len(data) - 1)
print("pivot value:", 5, "landed at index", k)
print("left  :", data[:k], "all <= 5")
print("right :", data[k + 1:], "all >= 5")
print("array :", data)
```

The invariant, stated at the top of each loop iteration: `values[lo..boundary-1]`
are all $\le$ pivot, and `values[boundary..i-1]` are all $>$ pivot. The loop body
preserves it either by doing nothing (element is $>$ pivot, the second region
grows) or by swapping the current element down to `boundary` and advancing it.

Every element is looked at exactly once, so partitioning costs $\Theta(hi - lo)$.

:::insight{title="Partition is the whole algorithm"}
Once you have `partition`, quicksort is four lines and no comparisons of its own.

```python
def quicksort(values, lo, hi):
    if lo >= hi:
        return
    k = partition(values, lo, hi)
    quicksort(values, lo, k - 1)
    quicksort(values, k + 1, hi)
```

Compare this to the previous lesson: merge sort's comparisons all live in
`merge`, quicksort's all live in `partition`. In both cases the recursion is
bookkeeping.
:::

## Where the $n^2$ comes from

Partitioning is linear. What makes quicksort $n \log n$ is that the recursion
depth stays around $\log n$ — which requires the pivot to land somewhere near
the middle. If the pivot is always the smallest or largest element, one side is
empty and the other has $n-1$ elements, and the depth becomes $n$.

$$\underbrace{n + (n-1) + (n-2) + \cdots + 1}_{\text{one element peeled per level}} = \frac{n(n+1)}{2} = \Theta(n^2)$$

The input that triggers it for "pivot = last element" is the one your data is
most likely to already be in: sorted.

```python runnable id=pivot-choice
import random

comparisons = 0


def partition(values, lo, hi, pivot_index):
    global comparisons
    values[pivot_index], values[hi] = values[hi], values[pivot_index]
    pivot = values[hi]
    boundary = lo
    for i in range(lo, hi):
        comparisons += 1
        if values[i] <= pivot:
            values[boundary], values[i] = values[i], values[boundary]
            boundary += 1
    values[boundary], values[hi] = values[hi], values[boundary]
    return boundary


def quicksort(values, lo, hi, choose):
    if lo >= hi:
        return
    k = partition(values, lo, hi, choose(lo, hi))
    quicksort(values, lo, k - 1, choose)
    quicksort(values, k + 1, hi, choose)


last = lambda lo, hi: hi
rand = lambda lo, hi: random.randint(lo, hi)

random.seed(4)
n = 300
for label, data, choose in (
    ("sorted input, last-element pivot", list(range(n)), last),
    ("sorted input, random pivot", list(range(n)), rand),
    ("shuffled input, last-element pivot", random.sample(range(n), n), last),
):
    comparisons = 0
    quicksort(data, 0, n - 1, choose)
    print(f"{label:<36} {comparisons:>7,} comparisons")
```

Sorted input with a last-element pivot costs $n(n-1)/2 = 44{,}850$ comparisons
for $n = 300$. A random pivot on the same input costs a few thousand. Same
algorithm, same data, one line different.

:::pitfall{title="\"We'll pick the middle element, that's safer\""}
Median-of-three (first, middle, last) is a real improvement and is what most
library implementations used for years. It is not a fix. For any *fixed,
deterministic* pivot rule there exists an input that drives it quadratic, and
in 2003 a set of "quicksort killer" inputs for the median-of-three rule in Java
and the C library was published and promptly used as a denial-of-service vector
against hash-table and sort code paths.

Determinism is the vulnerability. Randomness is the patch.
:::

:::checkpoint{id=cp-pivot rubric="the worst case is still quadratic,randomisation moves the bad case from the input to the coin flips,an adversary cannot choose your random numbers"}
A colleague says "we switched to a random pivot, so quicksort is now
$O(n \log n)$ worst case." What exactly is wrong with that sentence, and what is
the correct claim?
:::

## Heap sort, in one paragraph

Heap sort gets $\Theta(n \log n)$ in the **worst** case, in place, with no
randomness — the one combination quicksort and merge sort each miss. Build a
max-heap over the array in $\Theta(n)$, then repeatedly swap the root to the end
and sift down over a heap one element shorter.

```python runnable id=heapsort-sketch
import heapq

def heap_sort(values):
    heap = list(values)
    heapq.heapify(heap)                 # O(n)
    return [heapq.heappop(heap) for _ in range(len(heap))]   # n pops, O(log n) each

print(heap_sort([9, 3, 7, 1, 8, 2, 5]))
```

So why is it almost never the default? Two reasons. It is **unstable**, so it
cannot be composed the way lesson 1 composed stable passes. And it jumps around
memory — sifting down walks indices $i, 2i{+}1, 4i{+}3, \dots$, which defeats
the cache, while quicksort's partition is two sequential scans. On modern
hardware that gap is often a factor of two or three even though the comparison
counts are similar.

Heap sort's real job today is as a **backstop**. C++'s `std::sort` and most
`introsort` implementations run quicksort but track recursion depth, and switch
to heap sort once the depth exceeds about $2\log_2 n$. You get quicksort's speed
on ordinary input and a hard $n \log n$ ceiling on adversarial input.

The heap itself — how `heapify` is linear, how sifting works — gets its own
stage. Here it is only the fallback.

::::track{depth=proof}
## Why a random pivot gives $\Theta(n \log n)$ expected comparisons

The claim: randomised quicksort on $n$ distinct elements makes
$2(n+1)H_n - 4n$ comparisons in expectation, where $H_n = \sum_{k=1}^{n} 1/k$ is
the $n$-th harmonic number. Since $H_n \approx \ln n$, that is about
$2n\ln n \approx 1.39\,n\log_2 n$.

**Setup.** Write $z_1 < z_2 < \cdots < z_n$ for the elements in sorted order.
Define the indicator random variable
$$X_{ij} = \begin{cases} 1 & \text{if } z_i \text{ is ever compared with } z_j \\ 0 & \text{otherwise.}\end{cases}$$
Quicksort only ever compares an element with a pivot, and a pivot is removed
from the recursion afterwards, so **no pair is compared twice**. The total number
of comparisons is therefore exactly $X = \sum_{i<j} X_{ij}$, and by linearity of
expectation
$$\mathbb{E}[X] = \sum_{i<j} \Pr[z_i \text{ compared with } z_j].$$

**The key probability.** Consider the set $Z_{ij} = \{z_i, z_{i+1}, \dots, z_j\}$,
which has $j - i + 1$ elements. Follow the recursion downwards. As long as the
chosen pivot lies outside $Z_{ij}$, every element of $Z_{ij}$ stays together in
the same subproblem, because they all fall on the same side of that pivot. So
the first pivot chosen from inside $Z_{ij}$ decides everything:

- if that pivot is $z_i$ or $z_j$, the two are compared (one is the pivot, the other is in the range being partitioned);
- if it is any of the $j - i - 1$ elements strictly between them, $z_i$ and $z_j$ are separated into different subproblems and are **never** compared.

Pivots are uniform over the current subproblem, so conditioned on the first
pivot coming from $Z_{ij}$, each of its $j - i + 1$ members is equally likely to
be it. Hence
$$\Pr[z_i \text{ compared with } z_j] = \frac{2}{j - i + 1}.$$

**Summing.** Substitute $k = j - i$:
$$
\mathbb{E}[X] = \sum_{i=1}^{n-1}\sum_{j=i+1}^{n} \frac{2}{j-i+1}
= \sum_{i=1}^{n-1}\sum_{k=1}^{n-i} \frac{2}{k+1}
< \sum_{i=1}^{n-1}\sum_{k=1}^{n} \frac{2}{k} = 2(n-1)H_n.
$$
With $H_n = \ln n + \gamma + O(1/n)$, this is $O(n\log n)$, and carrying the
exact sum rather than the bound gives $2(n+1)H_n - 4n$.

**What the theorem does and does not say.** It bounds the *expectation* over the
algorithm's own coin flips, for **every** input. There is no averaging over
inputs and no assumption that the data is random — which is the whole point,
because real data is not random. The worst case is still $\Theta(n^2)$; it now
requires you to lose roughly $n$ coin flips in a row rather than to receive
a sorted file.

The constant is worth keeping. $1.39\,n\log_2 n$ against merge sort's
$n\log_2 n$ says quicksort does about 39% *more* comparisons and still usually
wins, which tells you comparisons are not the currency that matters here.
Memory traffic is.
::::

:::exercise{ref=partition-in-place}
:::

:::quiz{id=quiz-l02 passing=2}
- id: q1
  prompt: "After `partition(values, lo, hi)` returns index k, what do you know?"
  options:
    - "values[lo..k-1] and values[k+1..hi] are both sorted."
    - "values[k] is in its final sorted position, and every element left of it is <= it while every element right of it is >= it."
    - "values[k] is the median of the range."
    - "The range has been split into two halves of equal size."
  answerIndex: 1
  explanation: >-
    Partitioning establishes a boundary, not order. Neither side is sorted — if
    they were, there would be nothing left for the recursion to do. The pivot is
    the single element in its final place, which is why quicksort never needs a
    combine step. The pivot is only the median by luck, and the two sides are
    equal in size only by luck; when they are not, that is exactly where the
    quadratic case comes from.
- id: q2
  prompt: "Your quicksort uses the last element as pivot. Which input is worst?"
  options:
    - "A list in random order."
    - "A list where every element is distinct and uniformly spread."
    - "A list that is already sorted."
    - "A list of length 1."
  answerIndex: 2
  explanation: >-
    On sorted input the last element is the maximum, so every partition puts
    n-1 elements on the left and none on the right. The recursion depth becomes
    n and the total work n(n+1)/2. This is the case that bites in production,
    because data arriving already sorted — by id, by timestamp, by a previous
    sort — is extremely common. A list of length 1 is the base case and costs
    nothing.
- id: q3
  prompt: "Why do library sorts fall back to heap sort rather than using it from the start?"
  options:
    - "Heap sort does far more comparisons than quicksort."
    - "Heap sort needs O(n) extra memory."
    - "Heap sort has poor cache locality and is unstable, so it is slower in practice despite the same asymptotic bound."
    - "Heap sort cannot sort in place."
  answerIndex: 2
  explanation: >-
    Heap sort is in place and its comparison count is competitive; its problem
    is memory access. Sifting down jumps between indices i, 2i+1, 4i+3 and so on,
    which misses cache lines that quicksort's two sequential scans hit. It is
    also unstable. Introsort keeps quicksort for the common case and switches to
    heap sort only when recursion depth suggests an adversarial input, getting
    speed and a hard n log n ceiling.
:::
