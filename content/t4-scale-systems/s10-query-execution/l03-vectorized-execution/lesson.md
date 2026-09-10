---
id: t4/s10/l03
title: Vectorized execution, and what it actually buys
tier: t4-scale-systems
stage: s10-query-execution
status: published
estimatedMinutes: 50
objectives:
  - Convert a tuple-at-a-time pipeline into a batched one and count the operator dispatches each model performs.
  - Explain why a batch is stored column-by-column rather than row-by-row.
  - State the condition under which batching produces a speedup, and demonstrate a case where it does not.
  - Name the complexity a vectorized engine takes on — batch boundaries, empty batches, selection vectors — and why 2048 is a common batch size.
prerequisites:
  - t1/s01/l05
misconceptions:
  - "**\"Vectorized means SIMD.\"** SIMD is one way to cash in the win, not the win itself. The primary effect is that the per-row interpretive overhead — a virtual call, a branch, a bounds check — is paid once per *batch* instead of once per row. An engine with no SIMD at all still gets most of the benefit."
  - "**\"Bigger batches are faster.\"** Only up to the point where a batch of every live column stops fitting in L1/L2 cache. Past that, each operator streams its batch out of cache and the next operator pulls it back in, and you have traded interpreter overhead for memory bandwidth. DuckDB's default is 2048 rows for this reason, not because larger was never tried."
  - "**\"Columnar and vectorized are the same thing.\"** Columnar is a storage layout; vectorized is an execution strategy. They are separable — you can batch row-major tuples, and you can read a columnar file into a row-at-a-time engine. They are usually paired because a filter touches one column, and a column-major batch lets it touch only that column's memory."
  - "**\"Batching always makes it faster.\"** It removes dispatch overhead and adds gather work. If the per-batch work is itself a slow interpreted loop, the two cancel — as you are about to measure, in Python, where the batched version can come out *behind*."
masteryChecklist:
  - I can rewrite a row-at-a-time operator as a batch operator and say how many dispatches each performs.
  - I can explain why filtering a column-major batch touches less memory than filtering a row-major one.
  - I can state the condition for batching to pay off, and recognise a case where it will not.
  - I can say what a selection vector is and why it exists.
runtimes:
  - engine: python
    packages: []
---

The Volcano model has one expensive property. Every row crosses every operator
boundary through a function call whose target was chosen at plan time, so the
CPU cannot predict it. Six operators and a hundred million rows is six hundred
million unpredictable calls, and the work done between them — comparing one
integer — takes a nanosecond.

The fix is embarrassingly simple to state: make `next()` return two thousand
rows instead of one.

The fix is also frequently oversold, and the second half of this lesson is
about measuring what it is actually worth.

## Count the dispatches first

Two pipelines, same query, same answer. One moves rows; one moves batches.

```python runnable id=dispatch-count
N = 100_000
sizes = [(i * 37) % 600 for i in range(N)]
VECTOR_SIZE = 2048

handoffs = {"rows": 0, "batches": 0}

# ---- tuple at a time: an operator hands over one row ----
def scan_rows(values):
    for v in values:
        handoffs["rows"] += 1
        yield {"size_kb": v}

def filter_rows(child, threshold):
    for row in child:
        if row["size_kb"] > threshold:
            handoffs["rows"] += 1
            yield row

# ---- vectorized: an operator hands over a batch ----
def scan_batches(values, size=VECTOR_SIZE):
    for start in range(0, len(values), size):
        handoffs["batches"] += 1
        yield {"size_kb": values[start:start + size]}

def filter_batches(child, threshold):
    for batch in child:
        kept = [v for v in batch["size_kb"] if v > threshold]
        if kept:
            handoffs["batches"] += 1
            yield {"size_kb": kept}

def three_deep(scan, filt, source):
    it = scan(source)
    for _ in range(3):
        it = filt(it, 100)
    return it

total_rows = sum(r["size_kb"] for r in three_deep(scan_rows, filter_rows, sizes))
total_batches = sum(sum(b["size_kb"]) for b in three_deep(scan_batches, filter_batches, sizes))

print("same answer:", total_rows == total_batches, total_rows)
print("handoffs, tuple-at-a-time:", handoffs["rows"])
print("handoffs, batched:        ", handoffs["batches"])
print("ratio: %.0fx fewer" % (handoffs["rows"] / handoffs["batches"]))
```

About 349,000 handoffs against 196 — roughly 1,800 times fewer, which is close
to the batch size, as it should be. Each of those handoffs in a compiled engine
is a virtual call the branch predictor gets wrong, a stack frame, and a
function prologue. That is the overhead vectorization is aimed at.

## Now measure whether it got faster

```python runnable id=does-it-help
import time

N = 100_000
sizes = [(i * 37) % 600 for i in range(N)]
ids = list(range(N))
VECTOR_SIZE = 2048

def scan_rows():
    for i, v in zip(ids, sizes):
        yield {"id": i, "size_kb": v}

def filter_rows(child, threshold):
    for row in child:
        if row["size_kb"] > threshold:
            yield row

def scan_batches():
    for start in range(0, N, VECTOR_SIZE):
        yield {"id": ids[start:start + VECTOR_SIZE],
               "size_kb": sizes[start:start + VECTOR_SIZE]}

def filter_batches(child, threshold):
    for batch in child:
        keep = [i for i, v in enumerate(batch["size_kb"]) if v > threshold]
        if keep:
            yield {col: [vals[i] for i in keep] for col, vals in batch.items()}

def timed(fn, reps=5):
    best = float("inf")
    out = None
    for _ in range(reps):
        start = time.perf_counter()
        out = fn()
        best = min(best, (time.perf_counter() - start) * 1000)
    return out, best

def rows_pipeline():
    it = scan_rows()
    for _ in range(3):
        it = filter_rows(it, 100)
    return sum(r["size_kb"] for r in it)

def batch_pipeline():
    it = scan_batches()
    for _ in range(3):
        it = filter_batches(it, 100)
    return sum(sum(b["size_kb"]) for b in it)

a, rows_ms = timed(rows_pipeline)
b, batch_ms = timed(batch_pipeline)
print("same answer:", a == b)
print("tuple-at-a-time: %5.1f ms" % rows_ms)
print("batched:         %5.1f ms" % batch_ms)
print("speedup: %.2fx" % (rows_ms / batch_ms))
```

Somewhere around **1×**, drifting to either side of it from run to run. No
meaningful win, after removing 99.9% of the operator dispatches.

That result is not a bug and it is not an argument against vectorization. It is
the condition for vectorization to pay, stated by counterexample.

## The condition

Batching removes per-row dispatch and adds per-row gather. Look at the two
lines that do the work:

```python
keep = [i for i, v in enumerate(batch["size_kb"]) if v > threshold]
{col: [vals[i] for i in keep] for col, vals in batch.items()}
```

Both are still Python loops running once per row. We removed 349,000 function
calls and added 200,000 list indexing operations to build the surviving
columns. In this language, that is a wash.

Delete the gather — filter a single column and let the comprehension keep the
values instead of the indices — and the win appears:

```python runnable id=one-column
import time

N = 100_000
sizes = [(i * 37) % 600 for i in range(N)]
VECTOR_SIZE = 2048

def scan_rows():
    for v in sizes:
        yield {"size_kb": v}

def filter_rows(child, threshold):
    for row in child:
        if row["size_kb"] > threshold:
            yield row

def scan_batches():
    for start in range(0, N, VECTOR_SIZE):
        yield {"size_kb": sizes[start:start + VECTOR_SIZE]}

def filter_batches(child, threshold):
    for batch in child:
        kept = [v for v in batch["size_kb"] if v > threshold]
        if kept:
            yield {"size_kb": kept}

def timed(fn, reps=5):
    best = float("inf")
    for _ in range(reps):
        start = time.perf_counter()
        out = fn()
        best = min(best, (time.perf_counter() - start) * 1000)
    return out, best

def rows_pipeline():
    it = scan_rows()
    for _ in range(3):
        it = filter_rows(it, 100)
    return sum(row["size_kb"] for row in it)

def batch_pipeline():
    it = scan_batches()
    for _ in range(3):
        it = filter_batches(it, 100)
    return sum(sum(batch["size_kb"]) for batch in it)

a, rows_ms = timed(rows_pipeline)
b, batch_ms = timed(batch_pipeline)
print("same answer:", a == b)
print("tuple-at-a-time: %5.1f ms" % rows_ms)
print("batched:         %5.1f ms" % batch_ms)
print("speedup: %.2fx" % (rows_ms / batch_ms))
```

About **2.7×**. The only thing that changed is that the per-batch work became a
single bulk operation the interpreter runs in one C-level loop, instead of an
interpreted loop over indices.

:::insight{title="The rule, in one sentence"}
Batching converts *per-row overhead* into *per-batch overhead*. You only get
paid if the per-batch work is faster per row than the per-row work was — which
means the inner loop has to be executed by something faster than the thing you
took the overhead out of.

In Python, "faster" means a comprehension or a builtin, and the ceiling is
about 3×. In C++, "faster" means a branch-free loop over a contiguous array
that the compiler auto-vectorizes into SIMD instructions, and the ceiling is
10–50×. Same idea, two orders of magnitude apart, because the inner loop is
where the money is.
:::

:::checkpoint{id=cp-condition rubric="batching moves overhead from per-row to per-batch,it only pays if the per-batch work is bulk work,in Python the inner loop is still interpreted so the ceiling is low"}
A colleague reports that rewriting a pandas-style pipeline into batches made it
no faster. Ask them one diagnostic question, and say what answer would explain
the result.
:::

## Why the batch is column-major

The batches above are `{"id": [...], "size_kb": [...]}` — one list per column —
rather than `[{"id": 1, "size_kb": 190}, ...]`. The reason is what the filter
touches.

`WHERE size_kb > 100` reads one column. In a column-major batch, the filter
walks one contiguous array of integers: every cache line it loads is 100%
useful. In a row-major batch it strides over whole rows, so a cache line holds
one wanted value and five unwanted ones, and it does six times the memory
traffic for the same comparisons.

A table with forty columns makes that a fortyfold difference, which is why the
same idea shows up as columnar *storage* in Parquet and as columnar *execution*
in DuckDB. Storage and execution are separable — you can batch rows, and you
can feed Parquet to a row-at-a-time engine — but the pair is what makes an
analytical scan cheap.

:::pitfall{title="The complexity that arrives with the batch"}
Every operator now has cases the row version did not have:

- **Batch boundaries.** A join or a window function whose input spans two
  batches needs state carried across the boundary. Sixteen lines becomes sixty.
- **Empty batches.** A selective filter produces batches with zero surviving
  rows. Emit them and every operator above pays a dispatch for nothing, so
  every operator has to remember to drop them.
- **Selection vectors.** Copying the surviving values out of a batch costs a
  gather, exactly as measured above. Real engines therefore pass a *selection
  vector* — a list of surviving indices alongside the untouched column — so the
  filter writes only the index list and the copy is deferred until something
  actually needs contiguous data. Now every operator has to handle "this batch
  has 2048 values but only 31 are live".
- **Null masks.** Three-valued logic becomes a second bitmap per column that
  every kernel has to respect.

This is the trade. Vectorized execution is not a free upgrade; it is roughly a
3× increase in engine code for a large constant-factor win, and it is why toy
engines and scripting-language pipelines are right not to do it.
:::

:::exercise{ref=vectorized-filter}
:::

:::exercise{ref=rebatch}
:::

::::track{depth=systems}
## What a real engine does that this one does not

The toy engine assumes three things a production engine cannot: that everything
fits in memory, that there is one thread, and that the plan chosen before
execution stays right during it.

**Spilling.** A hash join's build side or a sort's input can exceed RAM. The
engine partitions the input by $h(\text{key}) \bmod k$ and writes partitions to
disk; because equal keys hash to the same partition, joining partition $i$
against partition $i$ is exact. The cost is one extra write and read of both
inputs, which is why a spilled operator is roughly three times the price of one
that fit — and why watching a query's memory graph is how you find out whether
the cardinality estimate that chose the build side was right.

**Morsel-driven parallelism.** The obvious way to parallelise is to split the
table into $T$ ranges, one per thread. It performs badly, because ranges do not
take equal time and the whole query waits for the slowest. The modern design
(Leis et al., 2014) splits the input into small *morsels* — a few thousand rows
each, on the order of the vector size — and lets every thread grab the next
morsel when it finishes one. Load balancing becomes automatic, and the batch
you have been building in this lesson is the natural unit of dispatch. This is
work-stealing, applied to a query plan.

**Adaptive execution.** The plan was chosen from estimates. Once the query is
running, the engine has actual counts, and some engines act on them: switching
a join's build and probe sides when the "small" side turns out large, promoting
a hash join to a partitioned one mid-flight, or re-planning the remainder of a
stage after a materialization point. Spark's adaptive query execution
re-optimises at shuffle boundaries for exactly this reason — a shuffle is a
point where true cardinalities are known and the rest of the plan has not been
committed to yet.

:::insight{title="Why this is the same argument as the last lesson"}
Every one of these three is a response to a cardinality estimate being wrong.
Spilling is what happens when the estimate was low. Morsel scheduling is what
happens when the *distribution* estimate was wrong. Adaptive execution is
giving up on estimating and measuring instead.

That is the thread into lesson 5: almost every interesting failure mode in a
query engine traces back to a number the optimizer guessed before it had any
data.
:::
::::

:::quiz{id=quiz-l03 passing=2}
- id: q1
  prompt: "A batched pipeline performs 1,800× fewer operator handoffs but runs no faster. What is the most likely explanation?"
  options:
    - "The batch size is too small to matter."
    - "The per-batch work is still an interpreted per-row loop, so the overhead moved rather than disappeared."
    - "Batching only helps when the data is sorted."
    - "The measurement is wrong; fewer dispatches always means faster."
  answerIndex: 1
  explanation: >-
    Batching converts per-row overhead into per-batch overhead. It pays only if
    the work inside the batch is done by something faster per row than what was
    removed — a C-level bulk operation, or SIMD. If the inner loop is still
    interpreted per row, the saving on dispatch is spent on the gather.
- id: q2
  prompt: "Why is DuckDB's default batch 2048 rows rather than 200,000?"
  options:
    - "Because 2048 is a power of two and the code uses bit masks."
    - "Because a batch of every live column has to stay in L1/L2 cache; beyond that, each operator evicts the next operator's data and you trade dispatch overhead for memory bandwidth."
    - "Because larger batches would overflow 32-bit row identifiers."
    - "Because a batch must fit in a single disk page."
  answerIndex: 1
  explanation: >-
    The point of a batch is that the next operator finds it still in cache. Once
    a batch of all live columns exceeds the cache, each operator streams it out
    to memory and the following one pulls it back, and the memory traffic
    swamps the dispatch saving. The optimum is a plateau in the low thousands
    of rows for typical column widths.
- id: q3
  prompt: "What is a selection vector, and why does an engine bother with one?"
  options:
    - "A bitmap of which columns the query selected, used for projection pushdown."
    - "A list of the indices that survived a filter, kept alongside the untouched column so the copy of surviving values can be deferred."
    - "A vector of random samples used to estimate selectivity."
    - "The order in which batches are handed to worker threads."
  answerIndex: 1
  explanation: >-
    Copying survivors out of a batch is a gather, and gathers cost real time —
    the measurement in this lesson is exactly that cost. A selection vector lets
    a filter write only the surviving indices and leave the data where it is, so
    the materialization happens once at the end instead of after every operator.
    The price is that every downstream operator must handle a batch whose rows
    are addressed indirectly.
:::
