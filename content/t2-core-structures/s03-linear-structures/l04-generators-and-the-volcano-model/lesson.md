---
id: t2/s03/l04
title: Generators are the Volcano model
tier: t2-core-structures
stage: s03-linear-structures
status: published
estimatedMinutes: 45
objectives:
  - Write a generator that stays lazy under composition and explain what "lazy" costs and buys.
  - Trace a chain of generators and say, for one output value, exactly which functions ran.
  - Map the generator protocol onto a query plan — __next__ is getNext — and say what vectorized execution changes.
prerequisites:
  - t2/s03/l01
  - t1/s01/l02
misconceptions:
  - "**\"A generator is a lazy list.\"** A list is a container; a generator is a *position in a computation*. It holds no elements, it cannot tell you its length, you cannot index it, and once consumed it is finished. Calling it a lazy list leads directly to iterating it twice and getting nothing the second time."
  - "**\"Generators are for saving memory.\"** Memory is the visible benefit. The structural one is that they let you write a producer and a consumer as two separate functions that run interleaved, without either one owning the loop. That is a control-flow tool, not a memory optimisation."
  - "**\"Composing generators means composing loops, so five stages is five passes over the data.\"** It is one pass. Each value is pulled through the whole chain before the next one starts, which is exactly why the chain works on a stream that never ends."
  - "**\"Vectorized execution means using SIMD.\"** SIMD is one payoff. Vectorized means the operator moves a *batch* of rows per call instead of one, which amortizes the per-call overhead of the iterator protocol. Most of the win is in the calls you no longer make."
masteryChecklist:
  - I can explain why a generator function's body does not run when you call it.
  - I can chain three generators and predict the order in which their bodies execute for one output value.
  - I can state the Volcano model's three operator methods and match them to Python's iterator protocol.
  - I can say why batching rows makes the same plan faster without changing what it computes.
runtimes:
  - engine: python
---

A query engine has to run `SELECT ... WHERE ... ORDER BY ... LIMIT 10` over a
table that does not fit in memory, and it has to do it without materialising the
intermediate results. Python solves the identical problem with `yield`. These
are not analogous solutions — they are the same solution, and the correspondence
is exact enough to be worth memorising.

## The body does not run when you call it

```python runnable id=nothing-happens
def counter(label, n):
    print(f"  [{label}] body starts")
    for i in range(n):
        print(f"  [{label}] about to yield {i}")
        yield i
    print(f"  [{label}] body finishes")


print("calling counter(...)")
gen = counter("a", 3)
print("call returned, and nothing above has printed")

print("\nfirst next():")
print("got", next(gen))

print("\nsecond next():")
print("got", next(gen))
```

Calling a generator function runs none of its body. It builds an object holding
a frozen stack frame. Each `next()` thaws the frame, runs until the next
`yield`, and freezes it again with every local variable exactly where it was.

That freeze-and-resume is the entire mechanism. Everything else in this lesson
is a consequence of it.

## Composition is one pass, not many

Chaining generators reads like a series of passes over the data. It is not.

```python runnable id=one-pass
def source(values):
    for value in values:
        print(f"    source -> {value}")
        yield value

def keep_even(stream):
    for value in stream:
        if value % 2 == 0:
            print(f"  keep_even -> {value}")
            yield value

def scale(stream, factor):
    for value in stream:
        print(f"scale -> {value * factor}")
        yield value * factor


pipeline = scale(keep_even(source(range(6))), 10)

print("pipeline built; nothing has run\n")
print("first value:", next(pipeline))
print()
print("second value:", next(pipeline))
```

Read the trace. Asking `scale` for one value makes it ask `keep_even`, which
asks `source`, which produces `0`. That single value travels up through the
whole chain and out — and only then does anything ask for the next one.

The data is **pulled** from the top, not pushed from the bottom. Three functions,
one pass, constant memory, and the source can be a file, a socket, or something
that never ends.

:::checkpoint{id=cp-pull rubric="the consumer calls next on the outermost stage,each stage pulls from the one below it,one value travels the whole chain before the next begins"}
`scale(keep_even(source(...)), 10)` produces its second value. In order, which
function bodies run, and how many values does `source` produce? Answer before
reading on.
:::

## The correspondence

Here is the claim this lesson is built on. In 1994 Goetz Graefe described the
**Volcano** model, which is how essentially every relational database has
executed queries since. A query plan is a tree of operators, and each operator
implements three methods:

| Volcano | Python | What it does |
| --- | --- | --- |
| `open()` | calling the generator function | set up state, do not produce anything |
| `getNext()` | `__next__()` | produce exactly one row, or signal exhaustion |
| `close()` | `.close()` / `GeneratorExit` | release resources |

The root of the plan calls `getNext()`. That operator calls `getNext()` on its
child, which calls its child, all the way down to a scan that reads the storage
layer. One row comes back up. Nothing is materialised anywhere in between.

Now compare:

```
SELECT name FROM packages          scale(keep_even(source(rows)), ...)
WHERE language = 'python'
LIMIT 10
```

`LIMIT` is the consumer that stops calling `getNext()` after ten rows. The
filter is `keep_even`. The scan is `source`. `LIMIT` stopping early is exactly
`break`-ing out of a `for` loop over a generator: everything below stops too,
because nothing below ever ran on its own initiative.

:::insight{title="Why the correspondence is useful and not just cute"}
Once you see it, two things stop being mysterious.

**Why `LIMIT` can make a query enormously faster** even with no index: it stops
pulling. If your plan is a pipeline of pull-based operators, an early stop
propagates all the way to the disk read.

**Why a blocking operator ruins that.** `ORDER BY` cannot yield its first row
until it has seen its last input row — it has to consume everything before it
can produce anything. `GROUP BY` with a hash aggregate is the same. In generator
terms, a blocking operator is one that starts with `values = list(stream)`. Put
one in the middle of your pipeline and the laziness above it is decorative.
:::

## Once, and only forwards

Generators are single-use. This surprises people once and then never again.

```python runnable id=exhaustion
squares = (n * n for n in range(5))

print("first pass: ", list(squares))
print("second pass:", list(squares))     # empty — the frame ran to the end

# There is no going back, no len(), and no indexing.
for probe in ("len(squares)", "squares[0]", "list(reversed(squares))"):
    try:
        eval(probe)
    except TypeError as exc:
        print(f"{probe:<24} -> TypeError: {exc}")
```

A cursor in a database behaves identically, and for the same reason: it is a
position in a computation that is still running, not a collection that has
already been computed. If you need the values twice, you have to store them —
which is a decision to spend memory, and it should look like one.

:::pitfall{title="The silent version of this bug"}
```python
rows = (r for r in fetch() if r.active)
count = sum(1 for _ in rows)      # consumes everything
for row in rows:                  # runs zero times, raises nothing
    handle(row)
```

The loop body never executes and nothing complains. Any function that takes an
iterable and walks it twice — many "helpful" utility functions do — has this
bug. When you write one, either take a list, or call `list()` yourself and pay
the memory on purpose.
:::

:::exercise{ref=batches}
:::

:::exercise{ref=merge-streams}
:::

::::track{depth=systems}
## Where Volcano stops being fast enough

The tuple-at-a-time model is beautiful and, on modern hardware, slow. Follow one
row through a plan of five operators and count what actually happens: five
virtual calls, five branch predictions the CPU cannot resolve, and a working set
of one row — so the loops never vectorize and the caches never help.

Measure it in Python, where the interpreter makes the per-call overhead visible.

```python runnable id=vectorized
import time

N = 2_000_000
CHUNK = 4096
calls = [0]


def counted(stream):
    """Wrap a stream so every pull through it is counted."""
    for item in stream:
        calls[0] += 1
        yield item


def rows_at_a_time(n):
    """One value per pull, all the way up the chain."""
    def scan():
        for i in range(n):
            yield i

    def filter_even(stream):
        for value in stream:
            if value % 2 == 0:
                yield value

    total = 0
    for value in counted(filter_even(counted(scan()))):
        total += value
    return total


def batch_at_a_time(n, chunk):
    """One BATCH per pull. Same plan, same operators, same answer."""
    def scan():
        for start in range(0, n, chunk):
            yield list(range(start, min(start + chunk, n)))

    def filter_even(stream):
        for block in stream:
            yield [value for value in block if value % 2 == 0]

    total = 0
    for block in counted(filter_even(counted(scan()))):
        total += sum(block)
    return total


for label, fn, args in (("row at a time", rows_at_a_time, (N,)),
                        ("batch at a time", batch_at_a_time, (N, CHUNK))):
    calls[0] = 0
    started = time.perf_counter()
    result = fn(*args)
    ms = (time.perf_counter() - started) * 1000
    print(f"{label:>16}: {ms:7.1f} ms   {calls[0]:>9,} pulls   total={result}")
```

Same plan, same operators, same answer. The counter is the interesting column:
three million pulls become under a thousand. The time falls by roughly a factor
of three here, and the ratio is the honest small end — CPython charges enough
per bytecode that both versions pay a lot for the arithmetic itself. In a
compiled engine, where the batched inner loop becomes a tight machine-code pass
over a contiguous array and the row-at-a-time version still makes a virtual
call per row, the same change is worth far more.

**That is vectorized execution.** MonetDB/X100 named it in 2005 and the idea is
one sentence long: *batch your `getNext()` calls.* DuckDB, ClickHouse, Velox,
Photon and Snowflake all move vectors of roughly one to a few thousand values
per call. The batch size is chosen so a vector of every column in flight fits
comfortably in L1 or L2 — big enough to amortize the call, small enough not to
spill the cache.

:::insight{title="The other branch"}
The competing answer is **compiled execution**: generate machine code for the
whole plan so the operator boundaries disappear entirely, which is what HyPer
and Spark's whole-stage codegen do. Vectorization keeps the boundaries and makes
each crossing rarer; compilation removes them.

Both are attacking the same cost — the per-row overhead of a general-purpose
iterator protocol — and both start from the model you just built with `yield`.
:::
::::

:::quiz{id=quiz-l04 passing=2}
- id: q1
  prompt: "What happens when you call a generator function?"
  options:
    - "Its body runs to the first yield and returns that value."
    - "Its body runs completely and the results are stored."
    - "None of the body runs; you get an object holding a frozen frame, and the body advances on each next()."
    - "The body runs in a background thread."
  answerIndex: 2
  explanation: >-
    The call only builds the generator object. Nothing executes until the first
    next(), which is why argument validation written inside a generator
    function does not fire at call time — a real source of confusing
    tracebacks.
- id: q2
  prompt: "In the Volcano model, what is the equivalent of Python's `__next__`?"
  options:
    - "`open()`, because it starts the operator."
    - "`getNext()`, which produces exactly one row on demand from the operator above."
    - "`close()`, which finalises the operator."
    - "There is no equivalent; SQL is set-at-a-time."
  answerIndex: 1
  explanation: >-
    getNext() is the pull. The root of the plan calls it, and each operator
    calls getNext() on its child, so a single row travels the whole tree before
    the next one is requested — the same trace you saw from a chain of
    generators.
- id: q3
  prompt: "Why does batching rows make the same query plan faster?"
  options:
    - "It changes the algorithm to one with a better asymptotic bound."
    - "It removes operators from the plan."
    - "It amortizes the per-call overhead of the iterator protocol over many rows and makes the inner loops contiguous and cache-friendly."
    - "It allows the query to run on more threads."
  answerIndex: 2
  explanation: >-
    The plan, the operators, and the answer are unchanged. What changes is how
    much work each getNext() carries: one call per few thousand rows instead of
    one per row, with tight loops over contiguous arrays in between. The
    asymptotics are identical; the constant is not.
- id: q4
  prompt: "Which of these is a *blocking* operator — one that cannot produce a row until it has consumed all of its input?"
  options:
    - "A filter (WHERE)."
    - "A projection (SELECT of some columns)."
    - "A sort (ORDER BY)."
    - "A limit (LIMIT 10)."
  answerIndex: 2
  explanation: >-
    A sort cannot know its first row until it has seen the last input row, so
    it must materialise everything. Filters and projections pass rows through
    one at a time, and LIMIT is the opposite of blocking — it stops the pull
    early, which is what makes it so effective in a pipelined plan.
:::
