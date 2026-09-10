---
id: t4/s10/l01
title: A query engine is a stack of iterators
tier: t4-scale-systems
stage: s10-query-execution
status: published
estimatedMinutes: 45
objectives:
  - Describe the Volcano iterator interface and explain why every operator exposing the same three methods is what makes plans composable.
  - Implement scan, filter, project and limit as Python generators and compose them into a running pipeline.
  - Explain why execution is pull-driven, and predict how many rows a scan produces under a LIMIT.
prerequisites:
  - t1/s01/l05
misconceptions:
  - "**\"The engine runs the query one clause at a time — FROM, then WHERE, then SELECT.\"** No stage ever finishes before the next begins. Every operator is suspended mid-row, waiting to be asked for one more. `WHERE` has not 'finished filtering' when `SELECT` starts; the two are interleaved row by row, and on a `LIMIT 3` neither ever sees most of the table."
  - "**\"Data flows up the plan tree, so execution starts at the leaves.\"** Data flows up; *control* flows down. Execution starts at the root, which calls its child, which calls its child, until a scan finally produces a row. The leaves are the last thing to be reached and the first thing to produce a value."
  - "**\"A generator is a performance trick — it is the same as a list, but lazier.\"** Laziness changes which rows exist at all. A pipeline ending in `LIMIT 3` over a billion-row table reads three rows. Materialise any operator into a list and you have read the billion. That is a difference of algorithm, not of constant factor."
masteryChecklist:
  - I can name the three Volcano methods and say which Python protocol member each maps to.
  - I can write a filter operator that composes with any other operator without knowing what its child is.
  - Given a pipeline ending in LIMIT n, I can say exactly how many rows the scan produces.
  - I can point at SEQ_SCAN, FILTER and PROJECTION in a DuckDB plan and name the Python function each corresponds to.
runtimes:
  - engine: python
    packages: []
---

Open a plan in any database and you get a tree of boxes with names like
`SEQ_SCAN`, `FILTER`, `PROJECTION`, `HASH_JOIN`. It looks like infrastructure.
It is not. Each of those boxes is a small function that answers one question —
*give me the next row* — and the entire execution engine is those functions
stacked on top of each other.

You are going to write them. By the end of this stage the toy engine will run
joins, aggregates and batched vectors, and you will be able to open DuckDB's
plan output and read it as source code you have already written.

## The problem the interface solves

An engine has perhaps forty operators. Any operator can sit above any other:
a filter above a join above an aggregate above another join. If each operator
had to know what kind of child it had, the engine would need forty times forty
cases.

Volcano's answer — Goetz Graefe's, from 1990 — is that every operator exposes
exactly the same three methods:

| Method | Means |
| --- | --- |
| `open()` | Get ready. Allocate a hash table, open a file, reset a counter. |
| `next()` | Produce the next row, or signal that there are none. |
| `close()` | Release whatever `open` acquired. |

That is the whole interface. A filter calls `next()` on its child and has no
idea whether the answer came from a table scan or from a seven-way join. This
is the reason a query optimizer can rearrange a plan at all: any subtree is
substitutable for any other subtree with the same output columns.

:::insight{title="You already have this interface"}
Python's iterator protocol *is* Volcano, renamed.

- `iter(x)` is `open()`
- `x.__next__()` is `next()`
- `StopIteration` is the "no more rows" signal
- `gen.close()` — which raises `GeneratorExit` inside the suspended
  generator — is `close()`

So a query operator is a generator function. Not "like" one. The same thing,
with the same suspend-and-resume semantics, which is why the toy engine you are
about to write is roughly one screen of code.
:::

## Four operators

Here is the whole engine so far. Read it, then run it.

```python runnable id=first-engine
# The first eight rows of the `packages` table used by every SQL lesson here.
PACKAGES = [
    {"id": 1, "name": "arrowkit",  "language": "python", "created_at": "2019-03-11"},
    {"id": 2, "name": "bitmask",   "language": "rust",   "created_at": "2020-07-02"},
    {"id": 3, "name": "chunker",   "language": "python", "created_at": "2018-01-24"},
    {"id": 4, "name": "dagrun",    "language": "python", "created_at": "2021-11-05"},
    {"id": 5, "name": "edgecase",  "language": "js",     "created_at": "2017-06-30"},
    {"id": 6, "name": "fanout",    "language": "sql",    "created_at": "2022-02-14"},
    {"id": 7, "name": "graphwalk", "language": "python", "created_at": "2020-09-09"},
    {"id": 8, "name": "hashring",  "language": "rust",   "created_at": "2019-12-01"},
]

def scan(rows):
    """SEQ_SCAN. The only operator with no child."""
    for row in rows:
        yield row

def filter_op(child, predicate):
    """FILTER. Pulls from child, forwards the rows that qualify."""
    for row in child:
        if predicate(row):
            yield row

def project(child, columns):
    """PROJECTION. Narrows each row to the named columns."""
    for row in child:
        yield {c: row[c] for c in columns}

# SELECT name, created_at FROM packages WHERE language = 'python'
plan = project(
    filter_op(
        scan(PACKAGES),
        lambda row: row["language"] == "python",
    ),
    ["name", "created_at"],
)

for row in plan:
    print(row)
```

Three functions, eleven lines, and that is a working relational engine for
`SELECT ... FROM ... WHERE`. Change the predicate. Add a column. Stack a second
`filter_op` on top of the first — it works, because the operator above cannot
tell what is below it.

Notice the shape of the composition. Reading `project(filter_op(scan(...)))`
from the inside out gives you the plan tree bottom-up, which is exactly the
order DuckDB prints it in, upside down.

## Control flows down, rows flow up

That `for row in plan` loop is the root of the query, and it is the only thing
in the program that actually *wants* anything. When it asks for a row:

1. `project` is resumed. It needs a row, so it asks `filter_op`.
2. `filter_op` is resumed. It needs a row, so it asks `scan`.
3. `scan` is resumed, produces one row, and suspends.
4. `filter_op` tests it. If it fails, `filter_op` asks `scan` again — a loop
   the layers above never see. If it passes, `filter_op` yields it and suspends.
5. `project` narrows it, yields it, and suspends.

Every operator in the pipeline is suspended in the middle of a `for` loop at all
times. None of them ever "finishes filtering" before the next one starts.

:::pitfall{title="The direction that trips people"}
In a printed plan the arrows go *up*: rows move from the scan toward the root.
So people say execution starts at the leaves. It does not. Execution starts at
the root and travels *down* — the leaf is the last thing reached on the way in
and the first thing to produce a value on the way out.

This matters the moment you add `LIMIT`. A limit at the root can stop the scan
at the leaf, because the scan only ever ran in the first place because the root
asked.
:::

## Laziness is an algorithm, not an optimisation

Add a counter to the scan and the point becomes measurable.

```python runnable id=laziness
pulls = {"scan": 0}

def counting_scan(rows):
    for row in rows:
        pulls["scan"] += 1
        yield row

def filter_op(child, predicate):
    for row in child:
        if predicate(row):
            yield row

def limit(child, n):
    """LIMIT. Pulls exactly n rows from its child, then stops."""
    if n <= 0:
        return
    taken = 0
    for row in child:
        yield row
        taken += 1
        if taken >= n:
            return

BIG = ({"id": i, "language": "python"} for i in range(1_000_000))

plan = limit(filter_op(counting_scan(BIG), lambda r: r["language"] == "python"), 3)
rows = list(plan)

print("rows returned:", len(rows))
print("rows the scan produced:", pulls["scan"])
```

Three rows out, three rows scanned, out of a million available. Nothing else was
ever read, allocated, or looked at.

Now change one line — make `limit` collect into a list and slice it:

```python
def limit(child, n):
    return iter(list(child)[:n])   # same answer, one million rows read
```

The result is identical and the program is a different algorithm. This is the
difference between `LIMIT 3` in the database and `.fetchall()[:3]` in your
application code, and it is why pushing a limit into the query is not a
micro-optimisation.

:::checkpoint{id=cp-pull rubric="control flows down from the root,rows flow up from the leaves,limit stops the scan because the scan only runs when asked"}
A colleague says "the database scans the table, then filters it, then takes the
first three rows". Correct them in two sentences, using the word *asks*.
:::

## The same operators, in DuckDB's words

Run `EXPLAIN SELECT name, created_at FROM packages WHERE language = 'python'`
and DuckDB prints its whole plan for it — this, verbatim (you will run these
yourself in lesson 5; every SQL exercise on this site has an **Explain** button
under the editor):

```text
┌───────────────────────────┐
│         SEQ_SCAN          │
│    ────────────────────   │
│      Table: packages      │
│   Type: Sequential Scan   │
│                           │
│        Projections:       │
│            name           │
│         created_at        │
│                           │
│          Filters:         │
│     language='python'     │
│                           │
│          ~5 rows          │
└───────────────────────────┘
```

One box, for a query you just executed with three operators. Look closer and
all three are in there: `SEQ_SCAN` is your `scan`, `Filters:` is your
`filter_op`, `Projections:` is your `project`. The two upper operators were
folded down into the leaf.

Those folds are optimiser rules — predicate pushdown and projection pushdown —
and they are worth roughly everything on a large table, because the scan now
reads two columns instead of six and discards non-Python rows before any other
operator sees them. You will implement both in lesson 4.

The `~5` is the engine's *estimate* of how many rows this will produce. It is
wrong — the full twenty-row `packages` table holds eight Python packages, not
five. Lesson 5 is about where that number comes from and what it costs when it
is wrong.

:::exercise{ref=lazy-limit}
:::

:::exercise{ref=compose-a-pipeline}
:::

::::track{depth=systems}
## Why real engines abandoned the pull model

The Volcano interface is beautiful and it has one expensive property: every row
crosses every operator boundary through a virtual function call. On a chain six
operators deep, a hundred million rows cost six hundred million calls whose
targets the CPU's branch predictor cannot guess, because the call target is a
pointer chosen at plan time.

Two escapes exist, and production engines use one or both.

**Push instead of pull.** Invert the control flow: instead of the parent calling
`next()` on the child, the child hands finished rows to the parent. Now a chain
of operators can be fused into one loop, because the "call" from filter to
projection is just the next statement in that loop. HyPer's compiling engine
(Neumann, 2011) does this by generating machine code for the fused loop at query
time; DuckDB is push-based too, even though its plan output still uses Volcano's
vocabulary. The interface names survive; the control flow did not.

**Move a batch instead of a row.** Keep pull, but make `next()` return two
thousand rows instead of one. The call overhead is then amortised over two
thousand rows, and the inner loop is a tight scan over an array. That is lesson
3.

:::insight{title="What survives"}
Every one of these designs keeps the *composability* that Volcano bought — an
operator still does not know what its child is. That is the part worth
imitating. When you write ETL code as a chain of generators, you get the same
substitutability, and you can reorder your own pipeline for the same reason an
optimizer can reorder a plan.
:::

The pull model also survives in one place it is unambiguously right: cursors.
When a client fetches a result page at a time over a network, something has to
be suspended between fetches, and a suspended pull pipeline is exactly that.
::::

:::quiz{id=quiz-l01 passing=2}
- id: q1
  prompt: "In a pipeline `limit(filter_op(scan(rows), pred), 3)` over a table of one million rows where every row passes the predicate, how many rows does `scan` produce?"
  options:
    - "One million — the scan always reads the whole table."
    - "Three — the scan is only resumed when something above it asks for a row."
    - "Three, but only if the table has an index."
    - "It depends on the batch size the generator uses."
  answerIndex: 1
  explanation: >-
    Execution is pull-driven. `limit` stops asking after the third row, so
    `filter_op` stops asking, so `scan` is never resumed a fourth time. There is
    no index and no batching involved — the laziness comes from the control
    flow, not from a storage trick.
- id: q2
  prompt: "What is the point of every operator exposing the same open/next/close interface?"
  options:
    - "It makes the code shorter to write."
    - "It lets any subtree be substituted for any other subtree with the same output columns, which is what makes plan rewriting possible."
    - "It guarantees each operator runs in O(1) memory."
    - "It is required in order to support SQL's clause ordering."
  answerIndex: 1
  explanation: >-
    Uniformity is what makes operators interchangeable. An optimizer swapping a
    hash join for a merge join, or reordering two joins, is only legal because
    the parent cannot observe the difference through the interface. Memory
    behaviour is not uniform at all — a sort or a hash build blocks and
    materialises, and a scan does not.
- id: q3
  prompt: "Which Python construct corresponds to Volcano's `close()`?"
  options:
    - "`StopIteration`, raised when the operator has no more rows."
    - "`gen.close()`, which raises GeneratorExit inside the suspended generator so its cleanup runs."
    - "`del gen`, which frees the generator object."
    - "There is no equivalent; Python generators cannot be closed."
  answerIndex: 1
  explanation: >-
    `StopIteration` is the end-of-rows signal — Volcano's `next()` returning
    nothing. `close()` is the separate teardown call, and Python spells it
    `gen.close()`: it resumes the generator with a GeneratorExit exception so
    that `finally` blocks and context managers release their resources. This is
    the mechanism a real engine uses to free a hash table when a LIMIT stops a
    query early.
:::
