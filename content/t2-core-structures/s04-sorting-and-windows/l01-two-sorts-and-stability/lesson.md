---
id: t2/s04/l01
title: Two sorts, and the property that makes them compose
tier: t2-core-structures
stage: s04-sorting-and-windows
status: published
estimatedMinutes: 45
objectives:
  - Implement insertion sort and merge sort, and say which input makes each one look good.
  - Explain the divide-and-conquer shape as a recurrence, and read n log n out of it.
  - Define stability precisely, and use it to sort by two keys without writing a comparator.
prerequisites:
  - t1/s01/l02
  - t1/s01/l03
misconceptions:
  - "**\"Sorting is O(n log n), so all sorts are the same.\"** Insertion sort is quadratic in general and *linear* on data that is already nearly ordered. That is not a footnote — it is why Python's real sort starts by looking for runs that are already in order."
  - "**\"Stability is a nice-to-have.\"** Stability is what makes multi-key sorting compose. Without it, \"sort by language, then by name within language\" needs a custom comparator; with it, it is two ordinary sorts run back to front."
  - "**\"`ORDER BY language` gives the same row order every time.\"** Only if `language` is unique. SQL sorts are not required to be stable, and DuckDB's is not, so any row order among ties is an implementation detail that can change between versions. If you care, name the tiebreaker."
  - "**\"Merge sort's clever part is the recursion.\"** The recursion is three lines and does no work. Every comparison in merge sort happens in `merge`. If you can write `merge` correctly, you have written merge sort."
masteryChecklist:
  - I can write the merge step from memory and say which comparison operator keeps it stable.
  - Given a nearly-sorted list, I can say which of insertion sort and merge sort does less work, and why.
  - I can produce a two-key ordering using two passes of a stable sort, and say which key I sort by first.
runtimes:
  - engine: python
  - engine: duckdb
    datasetId: package-registry
---

Sorting is not really about producing sorted output. It is about buying an
**invariant**: after the sort, position tells you something about value. Every
later lesson in this stage spends that invariant — binary search spends it,
two pointers spends it, a sliding window spends it, and a SQL window function
spends it once per partition.

This lesson is about what the invariant costs.

## Insertion sort, and the input it loves

Insertion sort keeps a sorted prefix on the left and repeatedly walks the next
element backwards into place.

```python runnable id=insertion-sort
def insertion_sort(values):
    """Sort in place. Returns the number of comparisons made."""
    comparisons = 0
    for i in range(1, len(values)):
        current = values[i]
        j = i - 1
        while j >= 0:
            comparisons += 1
            if values[j] <= current:
                break
            values[j + 1] = values[j]
            j -= 1
        values[j + 1] = current
    return comparisons

n = 2000
reversed_input = list(range(n, 0, -1))
sorted_input = list(range(n))
nearly_sorted = list(range(n))
nearly_sorted[500], nearly_sorted[503] = nearly_sorted[503], nearly_sorted[500]

for label, data in (
    ("reversed", reversed_input),
    ("already sorted", sorted_input),
    ("nearly sorted", nearly_sorted),
):
    print(f"{label:>14}: {insertion_sort(data):>9,} comparisons")
```

Three inputs of the same size, three wildly different costs. Reversed input
costs about $n^2/2$ comparisons. Already-sorted input costs $n - 1$: the inner
`while` breaks on its first test every time.

That gap is the entire reason insertion sort is still in your standard library.
It is not there as a teaching example. CPython's `list.sort` uses insertion sort
on short slices and on the tail of an existing run, precisely because real data
arrives partly ordered.

:::insight{title="Adaptive means the cost depends on the input, not only its size"}
Cost is a function of the *input*, not of $n$ alone. Big-O usually reports the
worst case and hides that. When you see a sort described as "adaptive", it means
the best case is genuinely better — and for insertion sort the best case is
linear.
:::

## Merge sort, and where the work actually is

Merge sort splits, sorts the halves, and merges. The split is free. The
recursion does nothing. **Every comparison happens in `merge`.**

```python runnable id=merge-sort
def merge(left, right):
    """Combine two sorted lists into one sorted list."""
    out = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:       # <= not < : this is where stability lives
            out.append(left[i])
            i += 1
        else:
            out.append(right[j])
            j += 1
    out.extend(left[i:])
    out.extend(right[j:])
    return out


def merge_sort(values):
    if len(values) <= 1:
        return list(values)
    mid = len(values) // 2
    return merge(merge_sort(values[:mid]), merge_sort(values[mid:]))


print(merge([1, 4, 9], [2, 3, 10]))
print(merge_sort([5, 3, 9, 1, 5, 8, 2]))
```

`merge` walks two sorted lists with two indices and never looks backwards. That
is only possible because both inputs are already ordered — the first cash-in of
the invariant you are about to spend all stage.

Counting the work: each level of recursion touches every element once during
merges, so a level costs $\Theta(n)$. Halving stops after $\log_2 n$ levels.

$$T(n) = 2\,T(n/2) + \Theta(n) \quad\Longrightarrow\quad T(n) = \Theta(n \log n)$$

Read it as a picture rather than as algebra: $\log_2 n$ rows of a table, each row
costing $n$. That is the whole derivation.

```python runnable id=merge-levels
import math

for n in (8, 1_000, 1_000_000):
    levels = math.ceil(math.log2(n))
    print(f"n = {n:>9,}  levels = {levels:>2}  n*levels = {n * levels:>12,}")
```

A million elements is twenty levels. Insertion sort on the same input is
$5 \times 10^{11}$ comparisons. That ratio — 20 million against 500 billion — is
what "asymptotically better" actually buys.

:::checkpoint{id=cp-merge rubric="the recursion does no comparisons,all the work is in merge,each level costs n and there are log n levels"}
Without scrolling back: where in merge sort does a comparison happen, and why is
the total $n \log n$ rather than $n^2$? Say it in two sentences.
:::

## Stability, and why it is a structural property

A sort is **stable** if elements that compare equal come out in the same
relative order they went in.

That sounds like a tidiness rule. It is actually a composition rule.

```python runnable id=stability-composes
releases = [
    {"name": "arrowkit",  "language": "python", "size": 190},
    {"name": "bitmask",   "language": "rust",   "size": 61},
    {"name": "chunker",   "language": "python", "size": 402},
    {"name": "keyspace",  "language": "rust",   "size": 143},
    {"name": "lazyseq",   "language": "python", "size": 205},
    {"name": "probe",     "language": "rust",   "size": 130},
]

# Pass 1: the SECONDARY key, size, descending.
by_size = sorted(releases, key=lambda r: r["size"], reverse=True)
# Pass 2: the PRIMARY key, language. Stability preserves pass 1 inside each group.
final = sorted(by_size, key=lambda r: r["language"])

for r in final:
    print(f"{r['language']:>7}  {r['name']:<10} {r['size']:>4}")
```

Two ordinary sorts, no comparator, and the result is grouped by language with
sizes descending inside each group. The rule is counter-intuitive enough to be
worth stating flatly:

**Sort by the least significant key first, the most significant key last.**

This works only because `sorted` is stable. If pass 2 were free to reorder rows
with the same language, pass 1 would be erased.

:::pitfall{title="`reverse=True` is not the same as reversing the output"}
`sorted(xs, reverse=True)` is still stable: equal elements keep their original
relative order. `list(reversed(sorted(xs)))` reverses *everything*, including
the ties, which silently destroys the ordering an earlier pass established. They
differ only on ties, which is exactly the case you are trying to control.
:::

You can often collapse two passes into one by building a tuple key —
`key=lambda r: (r["language"], -r["size"])`. Notice what that requires: the
secondary key must be *negatable*. Sort by language ascending and name
**descending** and the trick dies, because there is no `-name`. Two stable
passes always work.

Back in `merge`, stability came down to one character. `if left[i] <= right[j]`
takes from the left run when the two are equal, and the left run holds the
earlier elements. Change it to `<` and merge sort becomes unstable while
remaining perfectly correct as a sort. One character, no test failure, a
property gone.

## The SQL counterpart, and a warning

`ORDER BY` is the same idea with the comparator supplied by the column list, and
multi-key ordering is written directly rather than assembled from passes:

```sql runnable id=order-by-two-keys dataset=package-registry
SELECT language, name, license
FROM packages
ORDER BY language, name DESC
LIMIT 8;
```

The warning is the mirror image of the Python rule. **A SQL sort is not required
to be stable, and most engines' sorts are not.** So this query:

```sql runnable id=unstable-tiebreak dataset=package-registry
SELECT language, name
FROM packages
ORDER BY language
LIMIT 6;
```

is well-defined about `language` and says nothing at all about the order of rows
inside a language. Today it may look alphabetical. That is an accident of the
scan order and the sort implementation, and it is free to change when you add a
row, add an index, or upgrade the engine.

The fix is a habit: **if you care about the order of ties, name the tiebreaker.**
This is not pedantry — it is the reason paginated reports duplicate and skip
rows. `ORDER BY score DESC LIMIT 20 OFFSET 20` on a column with ties can return
a row you already showed on page 1, because page 2 was sorted by a different
coin flip.

::::track{depth=interview}
## Saying this out loud

Nobody will ask you to implement merge sort at a whiteboard in 2026. They will
ask you to sort something with more than one key, and then watch what you do.

The three sentences worth having ready:

**On stability.** "Python's `sort` is stable, so I can do this in two passes:
secondary key first, primary key second. If I need a descending numeric
secondary key I'd rather use a tuple key, but for a descending *string* key the
two-pass version is the only clean option."

**On the comparator question.** If someone hands you a comparison function
instead of a key, the follow-up is whether it defines a strict weak ordering. A
comparator that says `a < b` and `b < a` — or that is not transitive — does not
merely give a wrong order. In CPython it can raise, and in C++ it is undefined
behaviour that reads past the end of the array. "I'd use a key function rather
than a comparator, because a key is a total order by construction" is a strong
answer.

**On cost.** "Sorting is $n \log n$, so if I'm going to sort I want to spend
that once and answer many questions with it. If I only need one answer, I should
check whether there's a linear pass that gets it." That sentence is the whole
of this stage, and lessons 4 and 5 are the two halves of it.

:::interview{title="The follow-up you should expect"}
"What if the data doesn't fit in memory?" The honest answer names external merge
sort — sort chunks that fit, spill them, then k-way merge — and observes that
merge sort is the natural base for it because merging is sequential I/O.
Quicksort is not, which is why database sorts are merge-based. Lesson 4 does
this properly.
:::
::::

:::exercise{ref=merge-two-runs}
:::

:::exercise{ref=two-key-release-board}
:::

:::quiz{id=quiz-l01 passing=2}
- id: q1
  prompt: "Which change to `merge` would make merge sort unstable?"
  options:
    - "Appending the leftover of `right` before the leftover of `left`."
    - "Changing `if left[i] <= right[j]` to `if left[i] < right[j]`."
    - "Splitting at `len(values) // 2 + 1` instead of `len(values) // 2`."
    - "Recursing on the right half before the left half."
  answerIndex: 1
  explanation: >-
    On a tie, `<=` takes from the left run, which holds the earlier elements —
    that is exactly what stability means. With `<`, a tie takes from the right
    run and the two equal elements swap. The other options change nothing about
    ties: the split point and the recursion order do not affect which element
    wins a tie, and the leftover extends run after the other side is exhausted,
    so at most one of them is non-empty.
- id: q2
  prompt: "You need rows grouped by language, and inside each language ordered by name descending. You have a stable sort and no comparator. What do you do?"
  options:
    - "Sort by language, then sort each language group separately by name descending."
    - "Sort by name descending first, then sort the whole list by language."
    - "Sort by the tuple `(language, -name)`."
    - "Sort by language and reverse the result."
  answerIndex: 1
  explanation: >-
    Least significant key first, most significant key last: the second pass
    preserves the first pass's order inside each group. Sorting groups
    separately also works but requires you to find the group boundaries, which
    is more code for the same answer. `-name` is not a thing — you cannot negate
    a string, which is the case that forces the two-pass approach. Reversing the
    whole result would reverse the languages too.
- id: q3
  prompt: "`SELECT language, name FROM packages ORDER BY language` returns rows that happen to be alphabetical by name inside each language. Can you rely on that?"
  options:
    - "Yes — SQL sorts are stable, so the physical row order is preserved."
    - "Yes, as long as you never change the data."
    - "No. The order among tied rows is unspecified and can change with the data, the plan, or the engine version."
    - "No, because ORDER BY only ever guarantees ascending order on the first column."
  answerIndex: 2
  explanation: >-
    ORDER BY constrains only the columns you name. Ties may come out in any
    order, and engines do not promise stability — DuckDB's sort is not stable.
    Adding rows can change the plan and therefore the order. If the tie order
    matters, add the tiebreaker column to ORDER BY; this is the single most
    common cause of duplicated or skipped rows in keyset pagination.
:::
