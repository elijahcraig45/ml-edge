---
id: t2/s04/l05
title: Two pointers, sliding windows, and prefix sums
tier: t2-core-structures
stage: s04-sorting-and-windows
status: published
estimatedMinutes: 45
objectives:
  - Use two pointers on a sorted array and justify why skipping the rest of a row is safe.
  - Write a variable-size sliding window and argue its linear cost by amortisation.
  - Precompute prefix sums to answer range queries in constant time, and name the SQL construct that is the same thing.
prerequisites:
  - t1/s01/l02
  - t2/s04/l01
misconceptions:
  - "**\"Two nested `while` loops means quadratic.\"** Count *pointer movements*, not loop nesting. In a sliding window each index enters the window once and leaves once, so the inner loop runs at most $n$ times across the entire outer loop. The shape of the code and the cost of the code are different questions."
  - "**\"Two pointers works on any array.\"** It works when moving a pointer changes the objective *monotonically*. On a sorted array, advancing the left pointer can only increase the pair sum — that is the fact being exploited. Shuffle the array and the technique is not slow, it is wrong."
  - "**\"A sliding window is a fixed-size window.\"** Fixed-size is the easy case. The pattern that shows up in real problems is a window that grows on the right while an invariant holds and shrinks on the left when it breaks, so its size is part of the answer rather than part of the input."
  - "**\"Prefix sums are a micro-optimisation.\"** They change the complexity class of a workload: $q$ range queries over $n$ elements go from $\\Theta(nq)$ to $\\Theta(n + q)$. A dashboard issuing a thousand rolling-total queries is the difference between milliseconds and a minute."
masteryChecklist:
  - Given a problem statement, I can say whether two pointers applies and name the monotonicity that makes it correct.
  - I can write a variable-size sliding window and explain why the inner while loop does not make it quadratic.
  - I can build a prefix-sum array and answer an inclusive range query with one subtraction.
runtimes:
  - engine: python
---

The last four lessons were about paying for order. This one is about spending
it.

Every technique here has the same shape: because the data is arranged in a known
way, a pointer that moves forward **never has to move back**. That is the entire
idea, and it is worth an enormous amount — it converts nested loops into single
passes over and over again.

## Two pointers: the sorted-array trick

Find two entries in a **sorted** list whose sizes add to a target. The obvious
solution checks every pair: $n^2/2$ work. The two-pointer solution starts at
both ends and walks inward.

```python runnable id=two-pointers
def two_sum_sorted(sizes, target):
    lo, hi = 0, len(sizes) - 1
    steps = 0
    while lo < hi:
        steps += 1
        total = sizes[lo] + sizes[hi]
        if total == target:
            return (lo, hi), steps
        if total < target:
            lo += 1        # need more: the only way up is a larger left value
        else:
            hi -= 1        # need less: the only way down is a smaller right value
    return None, steps


sizes = [18, 22, 44, 61, 71, 88, 95, 130, 143, 190, 205, 260, 402, 512]
for target in (320, 293, 7):
    where, steps = two_sum_sorted(sizes, target)
    pair = f"{sizes[where[0]]} + {sizes[where[1]]}" if where else "no pair"
    print(f"target {target:>3}: {pair:<12} in {steps:>2} steps (list has {len(sizes)} entries)")
```

**Why discarding a whole row is safe.** Suppose `sizes[lo] + sizes[hi] < target`.
Then `sizes[lo]` paired with anything at or below `hi` is also too small, because
`sizes[hi]` was the largest remaining partner. So every pair involving `lo` is
dead, and `lo` can advance permanently. That is a row of the $n \times n$ pair
table eliminated by one comparison.

Each step retires one index, so there are at most $n$ steps. The technique is
worth exactly as much as the sortedness it assumes: on an unsorted list the
argument above is false, and the algorithm does not merely slow down — it returns
the wrong answer.

:::insight{title="The trade you are actually making"}
On an unsorted array, the linear-time answer to two-sum is a hash set: for each
value, ask whether `target - value` has been seen. That costs $O(n)$ time and
$O(n)$ extra memory.

Two pointers costs $O(n)$ time and $O(1)$ memory, but demands sorted input. If
the array arrives sorted, two pointers is strictly better. If it does not,
sorting to enable it costs $n\log n$ — worse than the hash set unless you are
going to run many queries against the same array, or memory is the binding
constraint.

"Sort first, then two pointers" is only a good plan when the sort is amortised
over more than one question.
:::

## Sliding window: a window that decides its own size

Fixed-size windows are the easy case. The pattern worth learning is the window
whose size is part of the answer: grow on the right while an invariant holds,
shrink on the left when it breaks.

Here: the longest stretch of consecutive days whose downloads total no more than
a budget.

```python runnable id=sliding-window
def longest_under(counts, budget):
    best = 0
    total = 0
    left = 0
    moves = 0
    for right, value in enumerate(counts):
        total += value
        moves += 1
        while total > budget:          # invariant broken: shrink from the left
            total -= counts[left]
            left += 1
            moves += 1
        best = max(best, right - left + 1)
    return best, moves


counts = [770, 850, 490, 570, 650, 730, 810, 450, 530, 610]
best, moves = longest_under(counts, 2000)
print(f"longest stretch under 2000: {best} days")
print(f"pointer moves: {moves} for {len(counts)} elements")
```

The `while` inside the `for` looks quadratic and is not. `left` only ever
increases, and it can never pass `right`, so across the *entire* run the inner
loop body executes at most $n$ times. Add the $n$ iterations of the outer loop
and total pointer movement is at most $2n$ — which the counter above prints.

This is **amortised analysis**: you cannot bound the cost of one outer iteration
(a single step might shrink the window by a thousand), but you can bound the sum,
because every element is added exactly once and removed at most once.

:::pitfall{title="The window must be shrinkable"}
Sliding windows work when removing the leftmost element *restores* the invariant
— that is, when the quantity you track is monotone in the window. Sums of
non-negative numbers are. Sums that may include negatives are **not**: dropping a
negative number makes the total larger, so shrinking does not help and the
technique breaks. "Longest subarray with sum at most k" is a sliding-window
problem over non-negative values and a prefix-sum-plus-monotonic-structure
problem over arbitrary ones. Check the sign before you reach for the pattern.
:::

:::checkpoint{id=cp-amortised rubric="left only moves forward,each element is added once and removed at most once,total pointer movement is bounded by 2n rather than by the loop nesting"}
A reviewer says "there's a `while` inside your `for`, so this is $O(n^2)$".
Write the two sentences that answer them.
:::

## Prefix sums: pay once, answer forever

If you need the total of many different ranges of the same array, compute a
running total once. Then any inclusive range `[lo, hi]` is a single subtraction.

```python runnable id=prefix-sums
counts = [770, 850, 490, 570, 650, 730, 810, 450, 530, 610]

prefix = [0] * (len(counts) + 1)
for i, c in enumerate(counts):
    prefix[i + 1] = prefix[i] + c

def range_total(lo, hi):        # inclusive on both ends
    return prefix[hi + 1] - prefix[lo]

print("prefix:", prefix)
print("days 0..2 :", range_total(0, 2), "  check:", sum(counts[0:3]))
print("days 3..7 :", range_total(3, 7), "  check:", sum(counts[3:8]))
print("everything:", range_total(0, 9), "  check:", sum(counts))
```

The off-by-one is worth getting right once and never thinking about again:
`prefix` has length $n + 1$, `prefix[i]` is the sum of the first $i$ elements,
and an **inclusive** range `[lo, hi]` is `prefix[hi + 1] - prefix[lo]`. The extra
leading zero exists precisely so that `lo = 0` needs no special case.

$q$ queries over $n$ elements go from $\Theta(nq)$ to $\Theta(n + q)$. That is
not a constant-factor win; it is a different complexity class, and it is the
reason this three-line precomputation appears inside counting sort, inside image
processing (as summed-area tables), and inside every "rolling total" report you
have ever seen.

**Its SQL twin is exact.** `SUM(count) OVER (ORDER BY day ROWS BETWEEN UNBOUNDED
PRECEDING AND CURRENT ROW)` *is* this array, computed by the engine in one pass
over the sorted partition. Lesson 6 writes it.

## The monotonic deque, ahead of time

One more structure, because it is the bridge to the next lesson.

To get the maximum of every window of $k$ consecutive elements, the obvious
approach recomputes `max` per window: $\Theta(nk)$. The linear answer keeps a
**deque of indices whose values are strictly decreasing**.

```python runnable id=monotonic-deque
from collections import deque

nums = [3, 1, 4, 1, 5, 9, 2, 6]
dq = deque()
pushes = pops = 0

for i, x in enumerate(nums):
    while dq and nums[dq[-1]] <= x:
        dq.pop()                 # x is bigger and newer: everything it shadows is dead
        pops += 1
    dq.append(i)
    pushes += 1
    print(f"i={i} x={x}  deque values -> {[nums[j] for j in dq]}")

print(f"\n{pushes} pushes, {pops} pops for {len(nums)} elements")
```

Two facts make it work. The front of the deque is always the maximum of
everything still in play, because anything larger and newer evicted its
predecessors. And each index is pushed exactly once and popped at most once, so
the total work is $\Theta(n)$ despite the inner `while` — the same amortisation
argument as the sliding window above.

Why is discarding safe? If `nums[j] <= x` and `j < i`, then `j` can never be the
maximum of any future window: any window containing `j` and reaching as far as
`i` also contains `i`, whose value is at least as large *and* which survives
longer. An element that is both smaller and older has no future.

Lesson 6 implements this and shows that a SQL window function is doing precisely
the same thing.

::::track{depth=interview}
## Recognition triggers

The value of these two patterns in an interview is almost entirely in
*recognition*. The implementations are ten lines. Spotting that a problem is one
of them, in the first thirty seconds, is the skill being tested.

**Two pointers — the trigger is a sorted (or sortable) sequence plus a pairwise
objective.**

| Phrase in the problem | What it usually means |
| --- | --- |
| "sorted array" plus "pair", "triplet", "sum to" | two pointers from the ends |
| "remove duplicates in place", "move zeroes" | two pointers, both from the left (read and write) |
| "container with most water", "trapping rain water" | two pointers inward, with a monotone argument |
| "merge two sorted…", "intersection of two sorted…" | two pointers, one per sequence |
| "is it a palindrome" | two pointers inward |

**Sliding window — the trigger is the word *contiguous* plus an extremum.**

| Phrase in the problem | What it usually means |
| --- | --- |
| "longest/shortest **subarray** such that…" | variable-size window |
| "**substring** with at most k distinct characters" | window plus a counts dict |
| "every window of size k" | fixed-size window |
| "maximum/minimum in every window" | fixed window plus a monotonic deque |
| "subarray sum equals k" with negatives allowed | **not** a window — prefix sums plus a hash map |

That last row is the one that separates candidates. Sliding window needs the
tracked quantity to be monotone in the window; negatives break that, and the
correct answer is a prefix-sum hash map. Saying "a window won't work here because
the values can be negative, so I'll use prefix sums with a dictionary of
previously seen sums" is a much stronger signal than producing a correct window
for a problem where a window happens to work.

:::interview{title="The sentence to say out loud"}
When you write the inner `while`, say this before the interviewer asks:

> "This looks quadratic but it isn't — `left` only moves forward and never
> passes `right`, so every index enters the window once and leaves at most once.
> Total pointer movement is bounded by $2n$."

That is the amortised argument, stated in one breath. Interviewers ask "what's
the complexity?" specifically to see whether you can distinguish loop *nesting*
from loop *work*, and a candidate who volunteers the answer has settled the
question before it was raised.
:::

The other reliable follow-up: **"what if the array isn't sorted?"** The right
response names the trade rather than reaching for the sort. Sorting costs
$n\log n$ and buys you $O(1)$ space; a hash map costs $O(n)$ space and keeps the
whole thing linear. Which is better depends on whether the array will be queried
once or many times, and on whether memory or time is the constraint. Say that,
and the question is answered.
::::

:::exercise{ref=two-sum-sorted}
:::

:::exercise{ref=longest-quiet-stretch}
:::

:::exercise{ref=range-totals}
:::

:::quiz{id=quiz-l05 passing=2}
- id: q1
  prompt: "In two-sum on a sorted array, `sizes[lo] + sizes[hi]` is less than the target. Why is it safe to advance `lo` and never look at it again?"
  options:
    - "Because `sizes[lo]` is the smallest remaining value."
    - "Because `sizes[hi]` is the largest remaining partner, so no partner at or below `hi` can rescue `sizes[lo]`."
    - "Because the target is guaranteed to be larger than every element."
    - "Because advancing `hi` instead would skip the answer."
  answerIndex: 1
  explanation: >-
    The pair already uses the biggest available partner for `sizes[lo]` and still
    falls short, so every other pair involving `lo` is smaller still. That
    retires an entire row of the pair table in one comparison. Note this argument
    uses sortedness twice — it is why the technique is wrong, not merely slow,
    on unsorted input.
- id: q2
  prompt: "A sliding window has a `while` loop inside a `for` loop. What is its complexity?"
  options:
    - "O(n^2), because the loops are nested."
    - "O(n log n), because the window size varies."
    - "O(n), because `left` only moves forward and each element is removed at most once."
    - "It depends on the budget value."
  answerIndex: 2
  explanation: >-
    Nesting bounds nothing on its own. `left` is monotonically increasing and
    never passes `right`, so the inner loop body runs at most n times summed over
    the whole execution — not n times per outer iteration. Total pointer movement
    is at most 2n. This is amortised analysis: individual iterations are
    unbounded, the total is not.
- id: q3
  prompt: "You have counts for 10,000 days and need the total for 5,000 different date ranges. Which is right?"
  options:
    - "Sum each range directly: it is simple and the ranges are independent."
    - "Sort the ranges first so the sums can be reused."
    - "Build a prefix-sum array once, then answer each range with one subtraction."
    - "Use a sliding window, since the ranges are contiguous."
  answerIndex: 2
  explanation: >-
    Direct summation is Theta(n*q) — up to 50 million additions here. A prefix
    array costs one pass of 10,000 additions and turns every query into a single
    subtraction, so the total is Theta(n + q). A sliding window answers a
    different question: it moves one window along, and does not help with 5,000
    arbitrary ranges. Sorting the ranges buys nothing, because each answer is
    already O(1) once the prefix array exists.
:::
