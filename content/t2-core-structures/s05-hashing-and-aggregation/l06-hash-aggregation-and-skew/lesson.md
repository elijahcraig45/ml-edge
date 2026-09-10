---
id: t2/s05/l06
title: The engine's hash table, and the one key that ruins it
tier: t2-core-structures
stage: s05-hashing-and-aggregation
status: published
estimatedMinutes: 50
objectives:
  - Find HASH_GROUP_BY and HASH_JOIN in a query plan and say what each operator is doing.
  - Explain why the optimizer builds the hash table on the smaller relation, and demonstrate that FROM order does not decide it.
  - Describe a partitioned (Grace) hash join and what happens when the build side does not fit in memory.
  - Diagnose a skewed grouping key with a top-N group-count query, and fix it with two-phase salted aggregation.
  - Rank DISTINCT, GROUP BY, COUNT(DISTINCT) and approx_count_distinct by what each one has to keep in memory.
prerequisites:
  - t2/s05/l05
misconceptions:
  - "**\"The optimizer builds the hash table on the first table in the FROM clause.\"** It builds on whichever relation it *estimates* is smaller, because that table has to fit in memory. Swapping the FROM order changes nothing in the plan. What does change it is a bad cardinality estimate — which is why a missing or stale statistic turns a fast join into a slow one, and why the fix is usually ANALYZE rather than rewriting the query."
  - "**\"Skew is a data problem, so there is nothing the query can do.\"** Skew only hurts because the *partitioning* sends one key to one worker. The data is unchanged by splitting a hot key across sixteen partial groups and summing the partials, and the query gets sixteen times the parallelism on that key. It is a query fix for a data property."
  - "**\"Salting changes the answer, so it is only for estimates.\"** For a decomposable aggregate — `count`, `sum`, `min`, `max`, and `avg` if you carry sum and count separately — the two-phase result is bit-for-bit identical. The exercise below proves it with an assertion rather than asking you to believe it. It genuinely does not work for `median` or `count(distinct)` without extra machinery."
  - "**\"COUNT(DISTINCT x) is COUNT(x) with duplicates removed, so it costs about the same.\"** `count` keeps one integer per group. `count(distinct)` keeps a *set* per group, so memory is proportional to groups times distinct values within a group. This is the single most common reason a dashboard query falls over, and `approx_count_distinct` replaces the set with a fixed-size sketch."
  - "**\"approx_count_distinct samples the rows.\"** It reads every row. What it stores is a HyperLogLog sketch of the hash values' leading-zero counts — a few kilobytes regardless of cardinality — and it is *mergeable*, which is the property that makes distributed distinct counting possible at all."
masteryChecklist:
  - I can point at HASH_JOIN in a plan and say which child is the build side.
  - I can write a query that reports the share of rows held by the largest group.
  - I can rewrite a skewed aggregation in two phases and argue that the result is unchanged.
  - I can say what approx_count_distinct stores and when the error it introduces is unacceptable.
runtimes:
  - engine: duckdb
    datasetId: package-registry
  - engine: python
---

Everything in this stage has been happening inside your database the whole time.
`GROUP BY` is a hash table. A join is a hash table. `DISTINCT` is a hash table
with the values thrown away. And the failure mode that turns a two-second query
into a forty-minute one is the same one from Lesson 1 — a hash function meeting
data whose structure it cannot disperse.

:::dataset{id=package-registry tables="packages,downloads"}
:::

## Find the hash table in the plan

```sql runnable id=explain-group-by dataset=package-registry
EXPLAIN
SELECT package_id, sum(count) AS downloads
FROM downloads
GROUP BY package_id;
```

`HASH_GROUP_BY`. The engine hashes each group key, finds or creates a slot, and
merges the row's contribution into the accumulator sitting there. Twenty groups,
twenty slots, one pass over the input, and no ordering of any kind — which is
why a `GROUP BY` result comes back in whatever order the hash table happened to
produce, and why you need an explicit `ORDER BY` if you care.

The alternative is **sort-based aggregation**: sort the input by the group key,
then walk it once and emit a group each time the key changes. It costs
$O(n \log n)$ instead of $O(n)$, and it wins in exactly two situations: when the
number of groups is so large that the hash table will not fit in memory (a sort
spills to disk gracefully; a hash table does not), and when the query needs the
output sorted anyway, in which case the sort was going to happen regardless.

`DISTINCT` is the same operator with the aggregate removed:

```sql runnable id=explain-distinct dataset=package-registry
EXPLAIN SELECT DISTINCT language FROM packages;
```

`HASH_GROUP_BY` again, with no aggregates. So `SELECT DISTINCT x` and
`SELECT x ... GROUP BY x` are not merely equivalent in result — in DuckDB they
compile to the same physical operator, and arguing about which is faster is
arguing about nothing. Write whichever says what you mean.

## Build side and probe side

A hash join runs in two phases. **Build**: read one input completely and load it
into a hash table keyed on the join column. **Probe**: stream the other input
past that table, looking up each row's key and emitting matches.

The build side has to fit in memory. The probe side does not — it is streamed.
So the optimizer builds on the smaller relation, and it decides that from
estimated cardinality, not from the order you wrote.

```sql runnable id=explain-join dataset=package-registry
EXPLAIN
SELECT p.name, sum(d.count) AS downloads
FROM packages p
JOIN downloads d ON d.package_id = p.id
GROUP BY p.name;
```

DuckDB draws the build side as the **right** child of `HASH_JOIN` and the probe
side as the left. `packages` (20 rows) is on the right and `downloads` (200
rows) on the left — even though the query names `packages` first. Swap the two
table names in the `FROM` clause and run it again: the plan is identical.

:::insight{title="What actually breaks this"}
Since the choice comes from an *estimate*, the way to make a hash join go wrong
is to make the estimate wrong. A filter the optimizer cannot see through, a
stale statistic, a correlated predicate on two columns — any of these can make
the planner think a billion-row relation has ten thousand rows, build on it, and
run out of memory. When a join suddenly gets slow and the data did not change
shape, the first thing to look at is the estimated row counts in the plan
against the real ones, not the SQL.
:::

### When the build side does not fit

**Grace hash join**, also called a partitioned hash join. Hash *both* inputs on
the join key into $P$ partitions and write them to disk. Because equal keys have
equal hashes, a row in partition $i$ of one side can only match rows in
partition $i$ of the other. Then join the partitions pairwise, building an
in-memory table from one partition at a time.

It works because $P$ is chosen so each build partition fits in memory. The cost
is one extra write and read of both inputs — and the reason it can still fail is
the subject of the rest of this lesson: if one key is huge, its partition is
huge, and no choice of $P$ splits it, because a single key cannot be spread
across partitions by a hash function. That is what "spill to disk" turns into
"out of memory" for exactly one task while the other 255 finish.

## Skew, measured

The `downloads` table stores daily totals. Expand it into one row per download
and you have an event stream with the shape real event streams have.

```sql runnable id=skew-diagnosis dataset=package-registry
WITH events AS (
  SELECT d.package_id, d.day, e.i AS event_no
  FROM downloads d, range(d.count) e(i)
)
SELECT
  package_id,
  count(*) AS events,
  round(100.0 * count(*) / sum(count(*)) OVER (), 2) AS pct_of_total
FROM events
GROUP BY package_id
ORDER BY events DESC
LIMIT 5;
```

363,840 events across 20 packages. If they were spread evenly each package would
hold 5%. Package 1 holds **25.29%** — 92,000 events. Packages 1 and 2 together
hold 38%.

That distribution is not an accident of this dataset; it is what package
registries, web traffic, user activity and error logs all look like. A few keys
dominate, and the tail is long.

Now put it in a distributed engine. A `GROUP BY package_id` partitions rows by
$h(\text{package\_id}) \bmod P$, and equal keys have equal hashes, so **every
row for package 1 lands on one task**. That task processes 92,000 rows. The task
holding the smallest package processes 6,460. A query finishes when its slowest
task finishes, so with 20 tasks — one per key, the best partitioning can do —
the run takes 25.3% of the single-machine time rather than the 5% that perfect
balance would give. You bought a 4× speedup with 20 machines.

Adding machines cannot fix it. A single key cannot be split across partitions by
any hash function, for the one reason this whole stage rests on: the same key
always hashes to the same place.

:::checkpoint{id=cp-skew rubric="one key's rows all hash to the same partition,so one task does a fixed fraction of the total work,adding workers cannot reduce that fraction"}
A colleague says the fix for a slow skewed aggregation is more parallelism. Say
precisely why doubling the cluster size does not help, using the numbers above.
:::

## Two-phase salted aggregation

The straggler exists because one key means one partition. So give the key more
than one identity, aggregate, and then combine.

**Phase 1** groups by `(key, salt)` where `salt` is anything that varies within
the key — a row number, a hash of another column, a random integer in
$[0, S)$. Package 1's 92,000 rows now become 8 partial groups of about 11,500,
which land in up to 8 different partitions.

**Phase 2** groups the partial results by the key alone and combines them. That
input has (groups × salts) rows — 160 here — which is nothing.

```sql runnable id=salted-aggregation dataset=package-registry
WITH events AS (
  SELECT d.package_id, d.day, e.i AS event_no
  FROM downloads d, range(d.count) e(i)
),
partial AS (                                   -- phase 1: key + salt
  SELECT package_id, event_no % 8 AS salt, count(*) AS partial_count
  FROM events
  GROUP BY package_id, salt
),
salted AS (                                    -- phase 2: combine
  SELECT package_id, sum(partial_count) AS downloads
  FROM partial
  GROUP BY package_id
),
naive AS (
  SELECT package_id, sum(count) AS downloads
  FROM downloads
  GROUP BY package_id
)
SELECT
  (SELECT count(*) FROM partial)                        AS phase_1_rows,
  (SELECT max(downloads) FROM salted)                   AS hottest_key,
  (SELECT count(*) FROM (
     (SELECT * FROM salted EXCEPT ALL SELECT * FROM naive)
     UNION ALL
     (SELECT * FROM naive EXCEPT ALL SELECT * FROM salted)
   ))                                                   AS rows_that_differ;
```

`rows_that_differ` is 0. The rewrite is not an approximation and it is not a
sample: it is exact, and it is exact for a specific reason.

**`count` and `sum` are decomposable.** The sum of a set is the sum of the sums
of any partition of it, so splitting and recombining is an identity. `min` and
`max` are decomposable the same way. `avg` is decomposable if you carry sum and
count separately and divide at the end — which is why `avg` of `avg`s is wrong
and every analyst discovers it at least once.

**`median` and `count(distinct)` are not.** The median of medians is not the
median. The count of distinct values cannot be recovered from per-partition
counts, because you cannot tell whether a value appeared in two partitions. For
those you need either a full shuffle on the value, or a mergeable sketch — which
is the last section.

:::pitfall{title="Salting is not free"}
Phase 1 emits (groups × salts) rows instead of (groups). With 20 packages and 8
salts that is 160 rows against 20 — irrelevant. With ten million distinct keys
and 32 salts it is 320 million rows, and you have made the query slower to fix a
problem it did not have. Salt the hot keys only: detect them with the top-N
query above, and apply the salt conditionally with a `CASE` so the long tail
keeps its single group.
:::

## DISTINCT, COUNT(DISTINCT), and the sketch

Line these up by what each has to hold in memory.

| Operation | Memory | Note |
| --- | --- | --- |
| `GROUP BY k` with `count(*)` | one counter per group | the base case |
| `SELECT DISTINCT k` | one entry per distinct k | the same hash table, no payload |
| `count(distinct v) GROUP BY k` | **a set per group** | groups × distinct values |
| `approx_count_distinct(v)` | a fixed sketch per group | a few KB, whatever the cardinality |

The third row is the one that fails in production. `count` needs an integer per
group; `count(distinct)` needs to remember every value it has already seen
within each group, so it can tell a repeat from a new one. Ten thousand groups
each with a million distinct users is ten billion values held in memory, and the
query planner will happily try.

```sql runnable id=approx-distinct dataset=package-registry
SELECT
  p.language,
  count(DISTINCT d.count)        AS exact_values,
  approx_count_distinct(d.count) AS approx_values
FROM downloads d
JOIN packages p ON p.id = d.package_id
GROUP BY p.language
ORDER BY p.language;
```

`approx_count_distinct` is **HyperLogLog**, and the idea is worth knowing
because it is the cleanest trick in this whole stage. Hash every value. In a
uniformly random 64-bit hash, the probability of seeing at least $k$ leading
zeros is $2^{-k}$, so if the largest number of leading zeros you have ever
observed is $k$, a reasonable guess for how many distinct values you have seen
is $2^{k}$. That single estimator is wildly noisy, so HLL splits the hash into a
bucket index and a value, keeps the maximum leading-zero count *per bucket*, and
takes a harmonic mean across buckets. Error falls as $1.04/\sqrt{m}$ for $m$
buckets: 16 KB of registers gives about 0.8%.

Two things follow. It reads every row — it is not a sample, and a sample would
be far worse, because rare values are exactly what a distinct count is made of.
And two sketches **merge** by taking the elementwise maximum of their registers,
which means each worker can build a sketch over its own partition and the
coordinator can combine them without ever shuffling the values. That mergeability
is why `approx_count_distinct` scales and `count(distinct)` does not.

The numbers above show the honest limitation: on groups of 30 to 80 distinct
values the estimate is off by up to 7.5%, because the relative error is fixed by
the register count and does not shrink just because the cardinality is small.
HLL is for cardinalities in the millions. For thirty values, count them.

::::track{depth=systems}
## Two places this shows up outside the query planner

### Consistent hashing: choosing a shard you can change your mind about

Sharding by `hash(key) % N` works perfectly until $N$ changes. Then almost every
key moves.

```python runnable id=consistent-hashing
import bisect
from collections import Counter

MASK = (1 << 61) - 1

def h(text):
    return hash(text) & MASK          # SipHash, then take 61 bits

keys = [f"package-{i}" for i in range(10000)]
key_hashes = [h(k) for k in keys]

def build_ring(shards, vnodes=150):
    points = sorted(
        (h(f"shard-{s}#{v}"), s) for s in range(shards) for v in range(vnodes)
    )
    return [p for p, _ in points], [s for _, s in points]

def owner(hk, positions, owners):
    return owners[bisect.bisect_left(positions, hk) % len(owners)]

moved_mod = sum(1 for hk in key_hashes if hk % 10 != hk % 11) / len(keys)

pos10, own10 = build_ring(10)
pos11, own11 = build_ring(11)
moved_ring = sum(
    1 for hk in key_hashes if owner(hk, pos10, own10) != owner(hk, pos11, own11)
) / len(keys)

print(f"modulo, 10 -> 11 shards: {moved_mod:.1%} of keys move")
print(f"ring,   10 -> 11 shards: {moved_ring:.1%} of keys move  (ideal {1 / 11:.1%})")

loads = sorted(Counter(owner(hk, pos11, own11) for hk in key_hashes).values())
print(f"ring load per shard: min {loads[0]}, max {loads[-1]}, ideal {10000 // 11}")
```

Adding one shard to ten moves about **91%** of keys under modulo and about
**9%** on the ring — and 1/11 is the information-theoretic minimum, because the
new shard has to receive its share from somewhere. Every key that does not need
to move is a cache entry you do not have to refill and a row you do not have to
copy.

The ring itself is one sorted array of hash positions. Each shard is placed at
150 positions rather than one — the **virtual nodes** — and a key belongs to the
first shard position at or after the key's own hash. Removing a shard deletes
its 150 positions and its keys fall through to the next positions along, which
are spread over all the remaining shards rather than piling onto one neighbour.
The `min`/`max` line shows what the vnode count buys: with 150 vnodes the shard
loads land within a few percent of each other; with 1 vnode each they would vary
by a factor of several, for the same balls-in-bins reason as Lesson 1's
histogram.

Note that the numbers move between runs, because Python randomises its string
hash per process. That is Lesson 1's universal hashing showing up here as a
reason you must never persist a shard assignment computed from `hash()`.

Memcached clients, Cassandra, Dynamo and every CDN's request router are this
algorithm. Modern variants — rendezvous hashing, jump consistent hash — get the
same minimal-movement property with less memory.

### Bloom-filter runtime pushdown

A hash join builds a table on the small side and streams the big side past it.
Most of those probe rows find no match, and every one of them was read from disk
for nothing.

So build a second thing during the build phase: a **Bloom filter** over the join
keys. A Bloom filter is a bit array plus $k$ hash functions; inserting a key sets
$k$ bits, and testing a key checks those $k$ bits. It never reports a false
negative, so discarding a row it rejects is always safe, and its false-positive
rate for $m$ bits and $n$ keys with the optimal $k$ is about $0.6185^{m/n}$ —
roughly 1% at 10 bits per key.

Push that filter down into the scan of the probe side and rows that cannot
possibly join are discarded before they are decoded, before they cross the
network, and — with a columnar format like Parquet — before whole row groups are
read at all, because the filter can be evaluated against a row group's min/max
statistics and dictionary. Spark calls it a Bloom filter join; DuckDB, Snowflake
and Impala all do a version of it. It is the same semi-join reduction that
distributed query processing has used since the 1970s, with the semi-join
replaced by a sketch that fits in a few hundred kilobytes.

:::note{title="The shape shared by all of these"}
Consistent hashing, HyperLogLog and Bloom filters are all the same bargain in
different clothes. Give up something exact — the precise shard mapping, the
precise count, the precise membership test — and get back a structure whose size
does not depend on the data's size. Stage 9 makes that the whole subject.
:::
::::

:::exercise{ref=skew-diagnosis}
:::

:::exercise{ref=salted-aggregation}
:::

:::exercise{ref=approx-distinct}
:::

:::quiz{id=quiz-l06 passing=3}
- id: q1
  prompt: "In `FROM big JOIN small ON ...`, which relation does the optimizer build the hash table on?"
  options:
    - "`big`, because it is named first."
    - "`small`, because the build side must fit in memory and the probe side is streamed."
    - "Whichever has an index on the join key."
    - "Both — a hash join builds two tables and merges them."
  answerIndex: 1
  explanation: >-
    Written order does not enter into it; the planner picks the side with the
    smaller estimated cardinality. That is also the vulnerability: a bad estimate
    makes it build on the large side and run out of memory, which is why the
    first diagnostic for a suddenly-slow join is comparing estimated to actual
    row counts in the plan.
- id: q2
  prompt: "One package holds 25% of the rows in a GROUP BY across 200 workers. What happens when you double the workers to 400?"
  options:
    - "Runtime roughly halves, because there is twice the parallelism."
    - "Nothing useful: all rows for that key still hash to one worker, so the straggler's 25% share is unchanged."
    - "The skew disappears, because the hash function now has twice as many buckets."
    - "The query fails, because the partition count must be a power of two."
  answerIndex: 1
  explanation: >-
    Equal keys have equal hashes, so a single key cannot be split across
    partitions by any number of partitions. The other 399 workers finish sooner
    and wait. The fix has to change the grouping key — salting — rather than the
    cluster.
- id: q3
  prompt: "Which aggregate can NOT be computed correctly by a two-phase salted rewrite?"
  options:
    - "sum(x)"
    - "count(*)"
    - "median(x)"
    - "max(x)"
  answerIndex: 2
  explanation: >-
    sum, count, min and max are decomposable — combining per-partition results
    reproduces the exact answer. The median of the partial medians is not the
    median of the whole, because order statistics depend on the global
    distribution. avg is a near-miss: it works only if you carry sum and count
    separately rather than averaging the averages.
- id: q4
  prompt: "What does approx_count_distinct actually store per group?"
  options:
    - "A random sample of the values it has seen."
    - "A fixed-size array of registers holding the maximum leading-zero count of hashed values per bucket."
    - "A compressed list of every distinct value."
    - "A running count that is incremented probabilistically."
  answerIndex: 1
  explanation: >-
    It reads every row and keeps a HyperLogLog sketch — a few kilobytes of
    registers regardless of cardinality — whose registers merge by elementwise
    maximum. Sampling would be far worse for a distinct count, because a
    distinct count is dominated by rare values, which are exactly what a sample
    misses.
:::
