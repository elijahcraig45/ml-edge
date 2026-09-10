---
id: t2/s03/l01
title: Dynamic arrays, and why append is free
tier: t2-core-structures
stage: s03-linear-structures
status: published
estimatedMinutes: 45
objectives:
  - Explain how a Python list grows, and why the growth factor is a multiplication rather than an addition.
  - State what "amortized O(1)" claims and what it does not claim.
  - Predict the cost of insert(0, x) and delete-from-front, and say what makes them different from append.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"Amortized O(1) means every append is fast.\"** It means the *average over a sequence* is constant. One append in a few thousand copies the entire array and is very slow. If you are writing a system with a latency budget rather than a throughput budget, that distinction is the whole ballgame."
  - "**\"Growing by a fixed chunk — 100 slots at a time — is basically the same and wastes less memory.\"** It is not the same. Additive growth makes n appends cost O(n²) in total, because the number of resizes grows with n and each copy gets longer. The multiplication is not a tuning choice; it is what makes the bound constant."
  - "**\"`insert(0, x)` is O(1) because a list is a pointer to a block, so it just moves the pointer back.\"** There is nothing in front of the block to move into. Every element has to shift up one slot first. Front insertion is O(n) and always was."
  - "**\"A Python list stores the objects.\"** It stores *pointers* to objects — one machine word each, all the same size, which is why indexing is one multiply-and-add regardless of what the elements are. It is also why a list of a million integers costs far more memory than a million integers."
masteryChecklist:
  - I can compute how many elements get copied in total when a doubling array grows to n items, and show it is less than 2n.
  - I can say why `arr[i]` is O(1) and back it with the address arithmetic.
  - Given code that builds a list with `insert(0, x)` in a loop, I can spot the quadratic and fix it in one line.
  - I can name one situation where amortized O(1) is not good enough.
runtimes:
  - engine: python
---

`list.append` is the most-called method in Python and it does something
suspicious: the list has a fixed block of memory, that block eventually fills
up, and yet appending never seems to get slower. Somewhere a copy of the entire
array is happening, and you never see it.

You can watch it happen.

```python runnable id=capacity-jumps
import sys

previous = -1
data = []
for i in range(80):
    data.append(i)
    size = sys.getsizeof(data)
    if size != previous:
        print(f"after {i + 1:>3} appends: {size} bytes")
        previous = size
```

The size does not creep up by eight bytes per element. It jumps, sits flat for a
while, then jumps further. Each flat stretch is a block with room to spare; each
jump is a new, larger block and a copy of everything into it.

## Why the jumps get bigger

Here is the choice that matters. When the block fills, the new capacity can be
the old one **plus** a constant, or the old one **times** a constant. That looks
like a tuning detail. It is the difference between O(1) and O(n) per append.

Add a fixed 100 slots each time and you resize `n/100` times. Resize number `k`
copies about `100k` elements. Sum those up and you get roughly `n²/200` element
copies: quadratic, for a loop that only appends.

Multiply by 2 instead and you resize about `log₂ n` times — but the important
part is not that there are fewer resizes. It is that the copies form a geometric
series that adds up to less than `2n` no matter how large `n` gets.

```python runnable id=additive-vs-geometric
def total_copies(n, grow):
    """grow(capacity) -> the next capacity."""
    capacity, size, copied = 0, 0, 0
    for _ in range(n):
        if size == capacity:
            copied += size
            capacity = grow(capacity)
        size += 1
    return copied

for n in (1_000, 10_000, 100_000):
    additive = total_copies(n, lambda c: c + 100)
    doubling = total_copies(n, lambda c: 1 if c == 0 else c * 2)
    print(f"n={n:>7}   +100 copies {additive:>12,}   x2 copies {doubling:>9,}"
          f"   ratio {additive / max(doubling, 1):>8,.0f}x")
```

Ten times the input makes the additive version a hundred times more expensive
and the doubling version ten times more expensive. That is the whole argument,
measured.

:::insight{title="Where the copies go"}
Growing to `n` under doubling copies `1 + 2 + 4 + ... + n/2` elements, which is
`n - 1`. Every element you ever appended has been copied, on average, *once* —
not once per resize. The copies you paid for at small sizes are dominated by the
last one, and the last one is a single linear pass.
:::

## Indexing is address arithmetic

A list is a contiguous block of pointers, all one machine word wide. That single
fact is what buys you `arr[i]`:

```
address_of(arr[i]) = base_address + i * word_size
```

One multiply, one add, one memory read. It does not depend on `i`, it does not
depend on the length, and it does not depend on what the elements are — because
the block holds pointers of uniform size, not the objects themselves.

This is also why a list can hold mixed types at no extra cost, and why
`sys.getsizeof([0] * 1_000_000)` reports about 8 MB while the million integer
objects it points at cost several times that on top.

:::checkpoint{id=cp-growth rubric="doubling gives a geometric series,the total copies stay proportional to n,additive growth makes the copies grow with n squared"}
A colleague proposes growing the array by exactly 1,000 slots each time, to
"avoid wasting memory". In two sentences, say what happens to the total cost of
`n` appends and why.
:::

## The front of the array is not the back

`append` writes into a slot that already exists most of the time. `insert(0, x)`
has no slot to write into — everything already in the block has to move up one
place first.

```python runnable id=front-vs-back
import time

def timed(label, fn, n):
    start = time.perf_counter()
    fn(n)
    print(f"{label:>22}: {(time.perf_counter() - start) * 1000:8.1f} ms")

def append_all(n):
    out = []
    for i in range(n):
        out.append(i)
    return out

def prepend_all(n):
    out = []
    for i in range(n):
        out.insert(0, i)
    return out

for n in (20_000, 40_000, 80_000):
    print(f"n = {n:,}")
    timed("append", append_all, n)
    timed("insert(0, x)", prepend_all, n)
```

Double `n` and the append time doubles. Double `n` and the insert time
quadruples. Both are correct; one of them is a bug waiting for your data to
grow.

The same asymmetry applies at deletion: `list.pop()` is O(1) and `list.pop(0)`
is O(n).

:::pitfall{title="The version of this bug that reaches production"}
Nobody writes `insert(0, x)` in a loop on purpose. What they write is

```python
queue = []
queue.append(job)          # enqueue
next_job = queue.pop(0)    # dequeue  <- O(n), every time
```

A list used as a FIFO queue is quadratic in the number of jobs, and it looks
completely reasonable. Lesson 3 is about the structure you actually want here.
:::

## The relational counterpart: a Parquet row group

Geometric growth is a general answer to a general problem — *you do not know the
final size, and reallocation is expensive* — and the storage layer solves the
same problem the same way.

When a columnar file format like Parquet writes a column, it does not know how
many values are coming. It accumulates them in an in-memory buffer that grows
geometrically, exactly like a Python list, and flushes to disk when the buffer
crosses a threshold — the **row group**. Row group size is the same dial as the
growth factor: larger groups mean fewer flushes and better compression, at the
cost of more memory held before each flush and coarser granularity when a reader
wants to skip.

Both are answering "how much slack do I carry so that I rarely have to pay the
big cost?" The Python list carries slack in RAM measured in slots. Parquet
carries it in a buffer measured in megabytes. Same shape, different floor of the
building.

::::track{depth=proof}
## The accounting method

"Amortized O(1)" is a claim, and it deserves a proof rather than a hand wave.
The accounting method is the cleanest one, and it is a technique you will reuse
for union-find and for hash table resizing later in the curriculum.

**Setup.** Let the array double when full: capacity goes 1, 2, 4, 8, … Let one
unit of work be "write or copy one element". A real append costs 1 unit if there
is room, and `size + 1` units if it triggers a resize (copy `size` elements,
then write the new one).

**The charge.** Charge every append **3 units** whether it resizes or not. Spend
1 unit on the write itself and bank the other 2 as credit *on the element just
appended*.

**The claim.** Every resize is paid for entirely out of banked credit, so the
bank never goes negative.

**Proof.** Consider the resize that grows capacity from `c` to `2c`. It copies
`c` elements. When did the previous resize happen? At capacity `c/2` — that is,
when the array held `c/2` elements. Since then, `c/2` new elements have been
appended, each banking 2 units, for a total of `c` units of credit. The resize
costs exactly `c`. The credit covers it precisely, and the credit was created
after the previous resize spent everything, so it was not double-counted. ∎

**The conclusion.** Charging 3 units per append covers every real cost, so `n`
appends cost at most `3n` units. Divide by `n`: at most 3 units per append,
which is a constant. Amortized O(1).

**What the constant depends on.** Repeat the argument with growth factor `f`
instead of 2. A resize from `c` to `fc` copies `c` elements, and the appends
since the previous resize number `c - c/f`. Each must bank

$$
\frac{c}{c - c/f} \;=\; \frac{1}{1 - 1/f} \;=\; \frac{f}{f - 1}
$$

units. So the amortized cost per append is `1 + f/(f-1)`: 3 for doubling, 2.5
for tripling, 9 for `f = 1.125`. Every growth factor above 1 gives a constant.
The bound blows up only as `f → 1`, which is exactly the additive case, and that
is the theorem's way of telling you why adding a fixed chunk fails.

:::proof{title="What the theorem does not say"}
The bound is on the *total*. The individual resize that copies 500 million
elements still takes as long as it takes. A database that must answer in 10 ms
cannot hide behind an amortized bound — which is why real-time systems use
**incremental** resizing, moving a few elements per operation so no single
operation pays the whole bill. Redis rehashes its dictionaries this way, and
you will meet the technique again in Stage 5.
:::
::::

:::exercise{ref=growth-cost}
:::

:::exercise{ref=oldest-first}
:::

:::quiz{id=quiz-l01 passing=2}
- id: q1
  prompt: "A dynamic array grows by adding 100 slots whenever it fills. What is the total cost of n appends?"
  options:
    - "O(n) — each append still writes one element."
    - "O(n log n) — there are log n resizes."
    - "O(n²) — there are n/100 resizes and resize number k copies about 100k elements."
    - "O(n) but with a larger constant than doubling."
  answerIndex: 2
  explanation: >-
    The number of resizes grows with n, and each resize copies more than the
    last, so the copies sum to roughly n²/200. The constant 100 changes the
    coefficient and not the shape. Multiplying the capacity is what makes the
    series geometric and the total linear.
- id: q2
  prompt: "What does \"append is amortized O(1)\" guarantee?"
  options:
    - "Every individual append completes in constant time."
    - "Any sequence of n appends costs O(n) in total, though one of them may copy the whole array."
    - "Appends are O(1) as long as the list stays under a few thousand elements."
    - "The array never copies, because it over-allocates."
  answerIndex: 1
  explanation: >-
    The bound is on the total across the sequence, which is why the average is
    constant. Single appends absolutely can be slow — the one that triggers a
    resize copies everything. A latency-sensitive system has to care about that
    difference; a throughput-oriented one usually does not.
- id: q3
  prompt: "Why is `arr[i]` O(1) on a Python list regardless of what the elements are?"
  options:
    - "Python caches recently accessed indices."
    - "The block holds uniform-width pointers, so the address is base + i * word_size."
    - "Lists are stored as hash tables keyed by index."
    - "Because i is an integer, and integer operations are constant time."
  answerIndex: 1
  explanation: >-
    Every slot is one machine word wide because it holds a pointer, not the
    object. That uniformity turns lookup into one multiply and one add. Store
    the objects inline and the slots would vary in size, and the arithmetic
    would stop working — which is precisely the trade a linked list makes.
:::
