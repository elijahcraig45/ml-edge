---
id: t4/s10/l02
title: Joins and aggregation, or hash tables that shipped
tier: t4-scale-systems
stage: s10-query-execution
status: published
estimatedMinutes: 50
objectives:
  - Implement a hash join with an explicit build side and probe side, and say which input should be which.
  - Implement a sort-merge join that handles duplicate keys on both sides.
  - Implement a hash aggregate, and name the Python data structure that DuckDB's HASH_GROUP_BY operator is.
  - Distinguish streaming operators from pipeline breakers, and predict which operators must materialise their input.
prerequisites:
  - t1/s01/l05
misconceptions:
  - "**\"A hash join is like a hash table.\"** It is a hash table. The build phase is `dict.setdefault(key, []).append(row)` and the probe phase is `dict.get(key)`. There is no additional idea — the only engineering on top is what to do when the dict does not fit in memory."
  - "**\"Every operator streams, because they are all generators.\"** A hash join cannot emit its first output row until the entire build side has been read. So can a sort, and so can an aggregate over an unsorted input. These are pipeline breakers, and they are where a query's memory goes and where its latency-to-first-row comes from."
  - "**\"Sort-merge is obsolete; hash join always wins.\"** Hash join needs the build side to fit in memory and cannot express an inequality. Sort-merge streams in bounded memory when both inputs already arrive sorted — which is exactly the case on an index scan or on data partitioned by the join key, and it is why merge joins remain the default in some engines for large sorted inputs."
  - "**\"The optimizer builds the hash table on the left table because that is the one written first.\"** It builds on whichever side it estimates to be smaller, because that side has to be held in memory. That decision is made from a cardinality estimate, and when the estimate is wrong the engine hashes the wrong side and spills. This is the single most common way a bad estimate turns into a slow query."
masteryChecklist:
  - I can write a hash join from memory, including which side is materialised.
  - I can explain why a hash join cannot answer an inequality join and a merge join can.
  - I can list which operators in a plan are pipeline breakers and say why that determines the query's memory ceiling.
  - Given two tables and their sizes, I can say which one the engine should build on and why.
runtimes:
  - engine: python
    packages: []
---

A hash join is a hash table. Not analogous to one, not built on top of one —
the operator *is* a dictionary, filled from one input and probed with the other.
Everything else in the operator is bookkeeping.

That sentence is the reason this curriculum pairs Python with SQL. You have
written `dict.setdefault(key, []).append(row)` a hundred times. The people who
built the join operator in DuckDB wrote the same line, then spent ten years on
what happens when the dict does not fit in RAM.

## The definition, and its price

A join is defined by nested loops. For every row on the left, for every row on
the right, emit the pair if the condition holds.

```python runnable id=nested-loop
def nested_loop_join(left, right, left_key, right_key):
    """The definition of a join, executed literally."""
    left_rows = list(left)          # the right side is scanned once per left row
    comparisons = 0
    for r in right:
        for l in left_rows:
            comparisons += 1
            if l[left_key] == r[right_key]:
                yield {**l, **r}
    print("comparisons:", comparisons)

PACKAGES = [{"id": i, "name": "pkg-%d" % i} for i in range(1, 6)]
VERSIONS = [{"package_id": (i % 5) + 1, "version": "1.0.%d" % i} for i in range(8)]

for row in nested_loop_join(PACKAGES, VERSIONS, "id", "package_id"):
    print(row)
```

Five packages, eight versions, forty comparisons. The cost is $|R| \cdot |S|$,
and it does not care that only eight of those forty comparisons could ever
succeed — one per version, since `package_id` points at exactly one package.

Thirty-two of the forty comparisons were guaranteed to fail before the loop
started. A hash table is the structure that skips them.

## Build side and probe side

```python runnable id=hash-join
def hash_join(left, right, left_key, right_key):
    """HASH_JOIN. Build a dict from `left`, then stream `right` past it."""
    buckets = {}
    for row in left:                        # BUILD phase — blocking
        buckets.setdefault(row[left_key], []).append(row)

    for row in right:                       # PROBE phase — streaming
        for match in buckets.get(row[right_key], ()):
            yield {**match, **row}

import time

N = 3000
P = [{"id": i, "name": "pkg-%d" % i} for i in range(N)]
V = [{"package_id": i % N, "version": "1.0.%d" % i} for i in range(N)]

def nested(left, right):
    left_rows = list(left)
    for r in right:
        for l in left_rows:
            if l["id"] == r["package_id"]:
                yield {**l, **r}

start = time.perf_counter()
n1 = sum(1 for _ in nested(P, V))
nested_ms = (time.perf_counter() - start) * 1000

start = time.perf_counter()
n2 = sum(1 for _ in hash_join(P, V, "id", "package_id"))
hash_ms = (time.perf_counter() - start) * 1000

print("rows out:", n1, n2)
print("nested loop: %.1f ms  (%d comparisons)" % (nested_ms, N * N))
print("hash join:   %.1f ms  (%d hash operations)" % (hash_ms, 2 * N))
print("speedup: %.0fx" % (nested_ms / hash_ms))
```

On the machine this was written on that prints a couple of hundred
milliseconds against 0.6 — a speedup in the hundreds, from nine million
comparisons down to six thousand dictionary operations. Your absolute numbers
will differ, and the ratio will move around with them; what does not move is
where it comes from, which is $N^2$ against $2N$.

The two phases have completely different characters, and the vocabulary is worth
getting exactly right:

- The **build side** is read to exhaustion before a single output row exists.
  It lives in memory. Its size is the operator's memory footprint.
- The **probe side** streams. It is never materialised, and rows leave the
  operator as they arrive.

:::insight{title="Which side to build on"}
Build on the **smaller** input. Not the one written first in the query, not the
one on the left of the `JOIN` keyword — the one the optimizer *estimates* is
smaller, because that side is the one that has to fit in memory.

Which means: the correctness of that estimate decides whether this operator
uses 30 MB or 30 GB. Lesson 5 is about what happens when the estimate is wrong,
and this is the operator where being wrong hurts most.
:::

## The pipeline just stopped being lazy

Lesson 1 ended with a `LIMIT 3` that read exactly three rows. Put a hash join
underneath it and that stops being true.

```python runnable id=blocking
pulls = {"build": 0, "probe": 0}

def counting(rows, side):
    for row in rows:
        pulls[side] += 1
        yield row

def hash_join(left, right, left_key, right_key):
    buckets = {}
    for row in left:
        buckets.setdefault(row[left_key], []).append(row)
    for row in right:
        for match in buckets.get(row[right_key], ()):
            yield {**match, **row}

def limit(child, n):
    if n <= 0:
        return
    taken = 0
    for row in child:
        yield row
        taken += 1
        if taken >= n:
            return

P = [{"id": i, "name": "pkg-%d" % i} for i in range(1000)]
V = [{"package_id": i, "version": "1.0"} for i in range(1000)]

joined = hash_join(counting(P, "build"), counting(V, "probe"), "id", "package_id")
rows = list(limit(joined, 3))

print("rows returned:", len(rows))
print("build side rows read:", pulls["build"])
print("probe side rows read:", pulls["probe"])
```

Three rows out. Three rows read from the probe side — the `LIMIT` still works
there. **One thousand** rows read from the build side, because the operator
cannot answer a single probe until the whole dictionary exists.

An operator with this property is a **pipeline breaker**. The blocking ones are
easy to remember: a hash join's build side, a sort, and a hash aggregate. Each
must see all of its input before producing any of its output, and each is
therefore where a query's memory goes.

:::pitfall{title="Reading latency out of a plan"}
"Time to first row" is decided by the deepest pipeline breaker in the plan. A
plan made only of scans, filters and projections returns its first row almost
immediately, even on a huge table. Put a `SORT` at the root and the first row
arrives only after the last row has been read.

This is why `ORDER BY ... LIMIT 10` on a huge table can be slow while
`LIMIT 10` on the same table is instant, and it is a thing you can read off a
plan before running anything.
:::

## Sort-merge, and what hashing throws away

Hashing destroys order. That is the trade: a hash function scatters keys so that
equal keys collide and *nothing else* is preserved. Which means a hash join can
answer `a.id = b.id` and can never answer `a.published_at < b.expires_at`.

Sorting keeps order, so a merge join can do both.

```python runnable id=sort-merge
def sort_merge_join(left, right, left_key, right_key):
    """MERGE_JOIN. Two cursors walking two sorted runs."""
    left = sorted(left, key=lambda r: r[left_key])
    right = sorted(right, key=lambda r: r[right_key])
    i = j = 0
    while i < len(left) and j < len(right):
        a, b = left[i][left_key], right[j][right_key]
        if a < b:
            i += 1
        elif a > b:
            j += 1
        else:
            # Equal keys. Both sides may have a run of them, and every pair
            # in the two runs joins — this is where fan-out is born.
            i_end = i
            while i_end < len(left) and left[i_end][left_key] == a:
                i_end += 1
            j_end = j
            while j_end < len(right) and right[j_end][right_key] == a:
                j_end += 1
            for l in left[i:i_end]:
                for r in right[j:j_end]:
                    yield {**l, **r}
            i, j = i_end, j_end

P = [{"id": 1, "name": "arrowkit"}, {"id": 2, "name": "bitmask"}, {"id": 2, "name": "bitmask-alias"}]
V = [{"package_id": 2, "version": "1.0.0"}, {"package_id": 2, "version": "1.1.0"}, {"package_id": 3, "version": "9.0"}]

for row in sort_merge_join(P, V, "id", "package_id"):
    print(row)
```

Four rows out of a two-by-two run of duplicate keys. The nested loop inside the
equal-key branch is not a mistake — a join of a run of $k$ left rows against a
run of $m$ right rows genuinely produces $k \cdot m$ rows. That multiplication
is the fan-out that quietly inflates a `SUM`, and lesson 6 is largely about
catching it.

If both inputs already arrive sorted — from an index scan, or because the data
is range-partitioned on the key — the two `sorted()` calls disappear and the
join runs in $O(|R| + |S|)$ with *constant* memory, which is something hash join
cannot offer at any size.

:::checkpoint{id=cp-blocking rubric="hash join blocks on the build side,sort blocks entirely,a filter or projection never blocks"}
Name the operators in a plan that must read all of their input before emitting
a row, and say what that fact tells you about the query's memory use.
:::

## Aggregation is the same dictionary

`GROUP BY` is a hash table whose values are running accumulators rather than
lists of rows. DuckDB calls the operator `HASH_GROUP_BY`; you have written it
as a `defaultdict`.

```python runnable id=hash-aggregate
def aggregate(child, key, value):
    """HASH_GROUP_BY: SELECT key, sum(value), count(*) ... GROUP BY key"""
    groups = {}
    for row in child:
        state = groups.setdefault(row[key], {"total": 0, "n": 0})
        state["total"] += row[value]
        state["n"] += 1
    for k, state in groups.items():
        yield {key: k, "total": state["total"], "count": state["n"]}

ROWS = [
    {"language": "python", "size_kb": 190},
    {"language": "rust",   "size_kb": 61},
    {"language": "python", "size_kb": 402},
    {"language": "js",     "size_kb": 22},
    {"language": "python", "size_kb": 75},
]

for row in aggregate(ROWS, "language", "size_kb"):
    print(row)
```

Three details in nine lines are load-bearing.

The accumulator holds a **fixed-size state per group**, not the rows. `sum` and
`count` need two integers; `avg` is those same two integers divided at the end.
That is why a `GROUP BY` over a billion rows with ten groups uses no memory —
its footprint is set by the number of *groups*, not the number of rows.

Not every aggregate has that property. `count(DISTINCT x)` has to remember every
distinct value it has seen, and `median` has to remember everything. Those
aggregates make `GROUP BY` a memory risk again, which is why engines ship
approximate versions of exactly those two.

And the groups come out in first-insertion order, because that is what Python's
dict guarantees. SQL guarantees nothing of the kind — `GROUP BY` output has no
order without `ORDER BY`, and DuckDB's parallel aggregate will not give you
insertion order. Relying on it is the same class of bug as `LIMIT` without
`ORDER BY`.

:::exercise{ref=hash-join}
:::

:::exercise{ref=hash-aggregate}
:::

::::track{depth=proof}
## The cost model, and what it says a join can never beat

Write $|R|$ and $|S|$ for the two input sizes and $|R \bowtie S|$ for the number
of output rows. Every join algorithm has to emit the output, so

$$C \ge |R| + |S| + |R \bowtie S|$$

is a lower bound for any algorithm that must read both inputs and write the
result. Hold on to that third term — it is why "make the join faster" sometimes
has no answer.

**Nested loop.** Every pair is compared:

$$C_{\text{nl}} = |R| \cdot |S| + |R \bowtie S|$$

**Hash join.** The build inserts $|R|$ rows. The probe hashes $|S|$ rows and
walks the chain it lands in. Under simple uniform hashing into $m$ buckets with
load factor $\alpha = |R| / m$, the expected number of build rows in the bucket
a probe row lands in is $\alpha$, so the expected work per probe is $1 + \alpha$:

$$C_{\text{hash}} = |R| + |S|(1 + \alpha) + |R \bowtie S|$$

A real hash table keeps $m = \Theta(|R|)$ by resizing, so $\alpha = \Theta(1)$
and

$$C_{\text{hash}} = \Theta\big(|R| + |S| + |R \bowtie S|\big),$$

which matches the lower bound. Hash join is optimal for equijoins up to
constants. There is no cleverer algorithm waiting to be found.

**The term that does not go away.** If the join produces a hundred million rows,
every algorithm pays a hundred million. A plan whose join output is enormous is
not slow because the join was chosen badly — it is slow because you asked for
that many rows. The fix is upstream: filter earlier, or aggregate before joining
instead of after. That is lesson 4's whole subject, and this inequality is the
reason it works.

:::insight{title="Where the model stops predicting"}
The asymptotics are exact; the constants are not. Measure the crossover in the
Python implementations above and hash join wins from about four rows upward,
because a Python dictionary operation and a Python `==` cost roughly the same.

In a real engine they do not. Building a hash table means allocating and
zeroing memory and materialising the build side, while a comparison is a single
instruction on data already in a register. That is why a real optimizer will
still choose a nested loop when the build side is a handful of rows — and why
you should never transfer a constant factor measured in Python to a system
written in C++.
:::

The $\alpha$ term is also where the model becomes a systems problem. Keeping
$\alpha = \Theta(1)$ requires $m = \Theta(|R|)$ *buckets in memory*. When $|R|$
exceeds RAM, the engine partitions both inputs by $h(\text{key}) \bmod k$ and
joins the partitions pairwise — the Grace hash join. Equal keys land in the same
partition by construction, so the result is exact; the cost is one extra read
and write of both inputs, which is why a spilled join is roughly three times the
price of one that fit.
::::

:::quiz{id=quiz-l02 passing=2}
- id: q1
  prompt: "A plan has `LIMIT 5` above a hash join. The build side has 10 million rows. How many build-side rows are read?"
  options:
    - "Five — the LIMIT propagates all the way down."
    - "All ten million — the hash table must be complete before the first probe can be answered."
    - "Five, plus one extra row for the loop check."
    - "It depends on whether the join key is indexed."
  answerIndex: 1
  explanation: >-
    The build side is a pipeline breaker. The probe side does stop early — that
    is where the LIMIT still helps — but the dictionary has to exist in full
    before any probe can be answered, so the whole build input is read. This is
    why "time to first row" is governed by the deepest blocking operator.
- id: q2
  prompt: "Why can a hash join not evaluate `ON a.published_at < b.expires_at`?"
  options:
    - "Because dates cannot be hashed."
    - "Because a hash function preserves equality and destroys order, so there is no bucket to probe for 'all keys less than this one'."
    - "Because inequality joins are not part of the SQL standard."
    - "Because the build side would not fit in memory."
  answerIndex: 1
  explanation: >-
    Hashing scatters keys deliberately: equal keys collide, and everything else
    about their relationship is gone. A probe can find the bucket for one exact
    value and nothing else. Sorting keeps order, so a merge join can walk a
    range — which is why engines fall back to sort-merge or a nested loop for
    inequality conditions.
- id: q3
  prompt: "A GROUP BY over one billion rows produces twelve groups. What sets the operator's memory use?"
  options:
    - "The billion input rows, since they all pass through the hash table."
    - "The twelve groups, because each group holds a fixed-size accumulator and the rows are discarded."
    - "The width of the widest input row."
    - "Nothing — hash aggregates stream and use constant memory regardless."
  answerIndex: 1
  explanation: >-
    A sum-and-count accumulator is two numbers per group, so twelve groups cost
    twenty-four numbers no matter how many rows arrive. The exceptions are
    aggregates whose state is not fixed size — count(DISTINCT x) and median have
    to retain values — and those are exactly the aggregates for which engines
    ship approximate alternatives.
:::
