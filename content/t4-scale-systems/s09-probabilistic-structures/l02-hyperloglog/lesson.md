---
id: t4/s09/l02
title: HyperLogLog, or counting without remembering
tier: t4-scale-systems
stage: s09-probabilistic-structures
status: published
estimatedMinutes: 45
objectives:
  - Explain how the longest run of leading zeros in a stream of hashes estimates how many distinct values produced them.
  - Build the bucketed estimator and show its standard error falls as 1/sqrt(m).
  - Read DuckDB's approx_count_distinct as a HyperLogLog, and measure its error against the exact answer.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"It samples the stream.\"** It reads every single element. What it discards is the elements themselves — it keeps only the maximum leading-zero count per bucket, which is a few bits. Sampling loses rare values; HyperLogLog sees them all."
  - "**\"The error grows with the data.\"** The error is *relative* and depends only on the number of registers. A 16 KB sketch estimates ten thousand distinct users and ten billion distinct users to the same percentage accuracy."
  - "**\"COUNT(DISTINCT x) is only slower, not different.\"** It is different in kind. Exact distinct counting needs memory proportional to the number of distinct values, and — the part that actually bites — it does not survive being split across machines without shuffling every value. HyperLogLog sketches merge with a bytewise `max`."
  - "**\"Feeding the same value twice nudges the estimate up.\"** It cannot. A repeat hashes to the same bucket with the same leading-zero count, and `max` of a value with itself is that value. Idempotence is why the structure works on a stream with unknown duplication."
masteryChecklist:
  - I can explain the coin-flip intuition — why the longest run of heads tells you how many flips happened.
  - I can say why the estimator uses many buckets and a harmonic mean rather than one register.
  - Given a target relative error, I can compute the number of registers needed.
runtimes:
  - engine: python
  - engine: duckdb
    datasetId: package-registry
---

Flip a fair coin until it comes up tails, write down the run length, and throw
the coin away. Do that some unknown number of times, and I will show you only
the **longest run you ever saw**. If the longest run was 3, you probably ran a
handful of trials. If it was 20, you ran about a million.

That is HyperLogLog. The coin is a hash function, the run of heads is the run of
leading zero bits, and the "unknown number of trials" is the number of distinct
values in your stream.

## Why a maximum tells you a count

A good hash function makes each output bit an independent fair coin. So for a
uniformly random hash, the probability that it starts with exactly $r$ zero bits
is $2^{-(r+1)}$:

- half of all hashes start with a 1 (run of 0),
- a quarter start with `01` (run of 1),
- an eighth start with `001` (run of 2).

Observe $n$ distinct values and you get $n$ independent draws. Seeing a run of
length $r$ takes about $2^{r}$ draws, so if the longest run you ever saw is
$R$, then $2^{R}$ is a rough estimate of $n$.

Crucially, the maximum is **duplicate-blind**. Hash the same value a thousand
times and it produces the same run length every time, so it moves the maximum
exactly once — the first time, or never.

```python runnable id=longest-run
import hashlib

def leading_zeros(item):
    h = int.from_bytes(hashlib.sha256(str(item).encode()).digest()[:8], "big")
    return 64 - h.bit_length()          # zeros before the first 1, in 64 bits

for n in (10, 100, 1_000, 10_000, 100_000):
    longest = max(leading_zeros(f"user-{i}") for i in range(n))
    print(f"n = {n:>7}   longest run = {longest:>2}   2**run = {2 ** longest:>9,}")
```

The estimate is in the right *order of magnitude* and wildly noisy — it can only
ever be a power of two, and one lucky hash inflates it permanently. Both
problems have the same fix.

:::insight{title="The variance problem, stated exactly"}
A single maximum has enormous variance because it is driven by one observation.
The standard trick for reducing the variance of an estimator is to average many
independent copies of it. HyperLogLog gets those copies for free: use the first
$p$ bits of each hash to pick one of $m = 2^{p}$ **registers**, and track a
separate maximum in each. One hash, one register, no extra passes.
:::

## The real estimator

Each register sees roughly $n/m$ of the distinct values and holds its own
leading-zero maximum. Combining them with a plain arithmetic mean would still be
dominated by whichever register got lucky, so HyperLogLog uses a **harmonic**
mean, which is pulled toward the small values rather than the large ones:

$$
\hat{n} \;=\; \alpha_m \, m^{2} \Big/ \sum_{j=1}^{m} 2^{-M_j},
\qquad \alpha_m \approx \frac{0.7213}{1 + 1.079/m}
$$

where $M_j$ is register $j$'s maximum. The constant $\alpha_m$ corrects a
systematic bias in the raw formula; Flajolet and his co-authors derived it, and
everyone since has copied it.

The result that matters is the error:

$$\sigma_{\text{relative}} \;\approx\; \frac{1.04}{\sqrt{m}}$$

**Relative**, and a function of $m$ alone. Nothing about $n$ appears. Quadruple
the registers and you halve the error — the classic square-root wall, which is
why nobody builds a 0.01%-accurate HyperLogLog.

```python runnable id=hll-error-scaling
import hashlib, math

def estimate(items, m):
    p = m.bit_length() - 1
    width = 64 - p
    mask = (1 << width) - 1
    registers = [0] * m
    for item in items:
        h = int.from_bytes(hashlib.sha256(str(item).encode()).digest()[:8], "big")
        index = h >> width                              # top p bits pick the register
        rank = width - (h & mask).bit_length() + 1      # leading zeros in the rest, +1
        if rank > registers[index]:
            registers[index] = rank
    alpha = 0.7213 / (1 + 1.079 / m)
    return alpha * m * m / sum(2.0 ** -r for r in registers)

n = 5_000
print(f"{'m':>6} {'bytes':>7} {'measured':>10} {'1.04/sqrt(m)':>14}")
for m in (64, 256, 1024, 4096):
    errors = [(estimate((f"t{t}-user-{i}" for i in range(n)), m) - n) / n
              for t in range(12)]
    rms = math.sqrt(sum(e * e for e in errors) / len(errors))
    print(f"{m:>6} {m:>7} {rms * 100:>9.2f}% {104 / math.sqrt(m):>13.2f}%")
```

Twelve independent streams per configuration, so the measured column is an
honest root-mean-square error rather than one lucky run. It tracks
$1.04/\sqrt{m}$ closely, and the `bytes` column is the punchline: 4096
registers — about 1.6% error — fits in 4 KB if you store one byte per register.
Production implementations pack six bits per register, because a 64-bit hash can
produce a rank of at most 64 and six bits hold that. Redis uses $m = 2^{14}$,
giving 0.81% error in 12 KB, for any cardinality up to about $2^{64}$.

:::checkpoint{id=cp-hll-registers rubric="the error is relative and set by m alone,so it does not degrade as the stream grows,quadrupling m halves the error"}
Your event stream grows from 10 million to 10 billion distinct users. You did
not change the sketch. What happens to the accuracy of the estimate, and why?
:::

## The SQL counterpart

`approx_count_distinct` **is** a HyperLogLog. Not "like one" — that is the
implementation, in DuckDB, in BigQuery (`APPROX_COUNT_DISTINCT`), in Redshift,
in Presto, in Redis (`PFCOUNT`).

```sql runnable id=approx-small dataset=package-registry
SELECT
  count(DISTINCT name)         AS exact_names,
  approx_count_distinct(name)  AS approx_names,
  count(DISTINCT "count")      AS exact_counts,
  approx_count_distinct("count") AS approx_counts
FROM packages, downloads;
```

Twenty package names come back exactly right; 190 distinct download counts come
back as an estimate that is close and wrong. Neither is a bug. The sketch has no
idea how many values it is about to see, so it applies the same machinery to
both.

Here is the property that no amount of speed tuning gives you:

```sql runnable id=duplicate-blind dataset=package-registry
-- The same rows, repeated 50 times. 200 rows becomes 10,000 rows.
SELECT
  (SELECT approx_count_distinct("count") FROM downloads)                      AS once,
  (SELECT approx_count_distinct(d."count") FROM downloads d CROSS JOIN range(0, 50)) AS repeated_50x,
  (SELECT count(*) FROM downloads)                                            AS rows_once,
  (SELECT count(*) FROM downloads d CROSS JOIN range(0, 50))                  AS rows_repeated;
```

Fifty times the rows, byte-identical estimate. The sketch is a function of the
*set* of values, not of the multiset — which is exactly what lets you feed it a
firehose without deduplicating first.

:::warning{title="The error is a standard deviation, not a ceiling"}
$1.04/\sqrt{m}$ describes the spread of the estimator, so individual queries
land in the tail sometimes. Run the exercise below and you will see per-group
errors from 1 to 6 distinct values out of 30 to 80 — up to 7.5%. If your
downstream system needs a hard bound rather than a typical one, an approximate
aggregate is the wrong tool, and no amount of tuning changes that.
:::

::::track{depth=systems}
## Why analytics stacks are built on sketches

The accuracy argument is not the reason HyperLogLog is everywhere. **Mergeability**
is.

Two sketches over disjoint streams combine into a sketch of the union by taking
the elementwise maximum of their registers. That single fact restructures a data
platform:

- **Pre-aggregation becomes possible.** Store one 12 KB sketch per (hour,
  country, app version). "Distinct users last quarter, in Germany" is then a
  merge of a few thousand tiny sketches — not a scan of a quarter of raw events.
  Exact `COUNT(DISTINCT)` cannot do this, because distinct counts do not add:
  you must go back to the rows.
- **It parallelises without a shuffle.** Each worker sketches its own partition
  and ships 12 KB. Exact distinct counting has to hash-partition every value by
  key so that equal values meet on the same machine — that shuffle is usually
  the most expensive stage in the query.
- **It bounds memory in a streaming job.** A Flink or Beam operator holding a
  HyperLogLog per key has a fixed state size per key. Holding a `HashSet` per
  key does not, and the job dies at whatever moment your most popular key
  becomes popular enough.

BigQuery exposes the merge directly: `HLL_COUNT.INIT`, `HLL_COUNT.MERGE`,
`HLL_COUNT.EXTRACT`. So does Redis (`PFADD` / `PFMERGE` / `PFCOUNT`), and
Postgres via the `postgresql-hll` extension. When you see a schema with a
`BYTES` column called `users_hll`, that is what it is.

One operational hazard worth knowing: **sketches are not portable across
implementations.** Redis's serialisation, BigQuery's, and Apache DataSketches'
are all different, and a sketch written by one cannot be merged by another.
Teams discover this during a migration, not before it.
::::

:::exercise{ref=hyperloglog-estimator}
:::

:::exercise{ref=approx-vs-exact-distinct}
:::

:::quiz{id=quiz-l02 passing=2}
- id: q1
  prompt: "Why does HyperLogLog use many registers instead of one global maximum leading-zero count?"
  options:
    - "To handle more distinct values than a single register can represent."
    - "To reduce variance: one maximum is driven by a single lucky hash, and m registers give m estimates to average."
    - "So that duplicate values can be detected and skipped."
    - "Because a single register cannot be merged across machines."
  answerIndex: 1
  explanation: >-
    A single maximum is an unbiased-ish but extremely noisy estimator, and it can
    only take powers of two. Splitting the hash space across m registers gives m
    near-independent observations, and the harmonic mean of them has standard
    error 1.04/sqrt(m). A single register would merge across machines perfectly
    well — it would just be useless.
- id: q2
  prompt: "You need to cut your distinct-count error from 2% to 1%. What has to change?"
  options:
    - "Double the number of registers."
    - "Quadruple the number of registers."
    - "Double the hash width from 64 to 128 bits."
    - "Nothing — feed it more data and the estimate converges."
  answerIndex: 1
  explanation: >-
    Error is 1.04/sqrt(m), so halving it costs 4x the registers. The hash width
    only bounds the largest countable cardinality, not the accuracy. And more
    data does not help at all: the error is relative and independent of n, which
    is the whole reason the structure is interesting.
- id: q3
  prompt: "A table stores one HyperLogLog sketch per (day, region). What can you compute from it that you could not compute from stored per-(day, region) exact distinct counts?"
  options:
    - "The exact number of distinct users on any single day."
    - "The number of distinct users across a whole month and all regions, without rescanning the raw events."
    - "The number of events, as opposed to distinct users."
    - "Nothing — the two representations carry the same information."
  answerIndex: 1
  explanation: >-
    Distinct counts do not add: a user active on Monday and Tuesday would be
    counted twice. Sketches merge with an elementwise max, which deduplicates
    across the whole union. That is the property that makes pre-aggregated
    sketch tables worth their storage. Sketches also cannot give you an exact
    single-day count or an event count — they only ever answer one question.
:::
