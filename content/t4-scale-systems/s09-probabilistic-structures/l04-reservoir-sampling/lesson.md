---
id: t4/s09/l04
title: Reservoir sampling, and why SYSTEM sampling lies
tier: t4-scale-systems
stage: s09-probabilistic-structures
status: published
estimatedMinutes: 45
objectives:
  - Implement reservoir sampling and prove that every item ends up in the sample with probability k/n.
  - Explain why the algorithm needs no advance knowledge of the stream's length.
  - Distinguish BERNOULLI from SYSTEM sampling in SQL, and say exactly what makes SYSTEM biased.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"You need to know n to sample uniformly.\"** You need to know $n$ to *pick a random index*. Reservoir sampling never picks an index — it makes an accept/reject decision at each arrival, with a probability that depends only on how many items have gone by so far."
  - "**\"Keeping the first k items is a sample.\"** It is a sample of the *beginning* of the stream. If the stream is ordered by time, region, or anything at all, that ordering becomes your selection bias. Most real streams are ordered by something."
  - "**\"Any 1% of the rows is a 1% sample.\"** Only if every row had an equal, independent chance of selection. `TABLESAMPLE SYSTEM` picks whole storage blocks, so rows that were written together are selected together — and rows written together are almost never a random assortment."
  - "**\"Sampling is only about speed.\"** The query planner samples for a different reason: to guess how many rows a filter will produce, so it can choose a join order. A bad estimate there does not slow the query down by 10%; it picks a different plan and can slow it down by a thousand times."
masteryChecklist:
  - I can write reservoir sampling from memory and say why the acceptance probability is k/i.
  - I can prove the k/n uniformity claim by induction on the stream length.
  - Given a table clustered by date, I can say what a SYSTEM sample of it will get wrong.
runtimes:
  - engine: python
  - engine: duckdb
    datasetId: package-registry
---

A log line arrives. You want to keep 1,000 of today's lines, chosen uniformly at
random, and you cannot store the day's log to pick from at the end — and you do
not know how many lines today will bring. There are twelve of them so far.

Reservoir sampling solves this in six lines and one idea: **decide as each item
arrives, using only how many have arrived so far.**

## Algorithm R

Keep an array of $k$ slots.

- The first $k$ items go straight in.
- For item $i$ (0-indexed, so $i \geq k$): pick a random integer $j$ in
  $[0, i]$. If $j < k$, overwrite slot $j$ with the new item. Otherwise discard
  it.

The new item is accepted with probability $k/(i+1)$ — decreasing as the stream
grows, which is exactly right, because a longer stream means any one item
deserves a smaller share.

```python runnable id=reservoir-basic
import random

def reservoir_sample(stream, k):
    reservoir = []
    for i, item in enumerate(stream):
        if i < k:
            reservoir.append(item)
        else:
            j = random.randrange(i + 1)     # 0 .. i inclusive
            if j < k:
                reservoir[j] = item
    return reservoir

random.seed(7)
print("sample of 5 from a 1,000,000-item stream:")
print(sorted(reservoir_sample(range(1_000_000), 5)))
print("\nsample of 5 from a stream of unknown length (a generator):")
print(sorted(reservoir_sample((x * 3 for x in range(400_000)), 5)))
```

The function never asked how long the stream was. It could not have: the second
call receives a generator, and there is no `len` to ask.

:::insight{title="What the algorithm is really doing"}
At every moment, the reservoir is a valid uniform sample of everything seen *so
far*. Not "it becomes correct at the end" — it is correct after item 1, after
item 500, and after item nine billion. That invariant is what lets you stop the
stream at any point, and it is what the proof below actually establishes.
:::

## Measuring the uniformity

Claims about randomness deserve measurement, not assertion.

```python runnable id=reservoir-uniformity
import random

def reservoir_sample(stream, k):
    reservoir = []
    for i, item in enumerate(stream):
        if i < k:
            reservoir.append(item)
        else:
            j = random.randrange(i + 1)
            if j < k:
                reservoir[j] = item
    return reservoir

random.seed(12345)
trials, n, k = 20_000, 10, 3
counts = [0] * n
for _ in range(trials):
    for item in reservoir_sample(range(n), k):
        counts[item] += 1

print(f"target inclusion rate: {k / n}")
for item, c in enumerate(counts):
    bar = "#" * round(c / trials * 100)
    print(f"{item:>2} {c / trials:.4f} {bar}")
```

Every item lands at 0.30, item 0 and item 9 alike. Now delete the `random.seed`
line and change the algorithm to "keep the first k" — items 0, 1, 2 go to 1.00
and everything else to 0.00. The bug does not look like a bug; it looks like a
simpler implementation.

:::checkpoint{id=cp-reservoir-why rubric="the acceptance probability shrinks as the stream grows,each item gets k over i at its own arrival,and earlier items get evicted at just the right rate"}
Item 1,000,000 is accepted with probability $k/1{,}000{,}000$ — tiny. Item 1 was
accepted with probability 1. So why do they end up equally likely to be in the
final sample?
:::

::::track{depth=proof}
## The uniformity theorem

:::proof{title="Theorem: after n items, each item is in the reservoir with probability k/n"}
Let $k \geq 1$ be fixed and let the stream have length $n \geq k$. Index items
$1, \dots, n$ in arrival order. Claim: for every $x \in \{1,\dots,n\}$,

$$\Pr[\text{item } x \text{ is in the reservoir after } n \text{ items}] = \frac{k}{n}.$$

**Induction on $n$.**

*Base case, $n = k$.* Every item was placed directly into the reservoir and
nothing has been evicted, so each is present with probability $1 = k/k$.

*Inductive step.* Assume the claim after $n-1$ items, for some $n > k$: each of
items $1, \dots, n-1$ is present with probability $k/(n-1)$. Item $n$ now
arrives. The algorithm draws $j$ uniformly from $\{0, \dots, n-1\}$ and inserts
item $n$ at slot $j$ if $j < k$.

**The new item.** It is inserted exactly when $j < k$, and $j$ is uniform over
$n$ values, so

$$\Pr[\text{item } n \text{ present}] = \frac{k}{n}. \checkmark$$

**An older item $x < n$.** It survives this step if it was present *and* was not
the slot overwritten. Given that item $n$ is inserted, the overwritten slot is
uniform over the $k$ slots, so a specific present item is evicted with
probability $1/k$. Therefore

$$\Pr[x \text{ evicted at step } n] = \underbrace{\frac{k}{n}}_{\text{insert happens}} \cdot \underbrace{\frac{1}{k}}_{x\text{'s slot chosen}} = \frac{1}{n},$$

and the eviction event is independent of whether $x$ was there, because $j$ is
drawn fresh. So

$$
\Pr[x \text{ present after } n] = \Pr[x \text{ present after } n-1] \cdot \left(1 - \frac{1}{n}\right)
= \frac{k}{n-1} \cdot \frac{n-1}{n} = \frac{k}{n}. \checkmark
$$

Both cases give $k/n$, which completes the induction. $\blacksquare$
:::

The cancellation $\frac{k}{n-1} \cdot \frac{n-1}{n}$ is the entire trick. The
acceptance probability $k/n$ and the eviction probability $1/n$ are tuned
against each other so that the survival factor is exactly the ratio that turns
$k/(n-1)$ into $k/n$. Change either constant and uniformity breaks immediately.

Note what the theorem does **not** say. It gives the marginal probability for
each item; it does not say the $k$ selections are independent, and they are not
— the reservoir always holds exactly $k$ items, so knowing item $x$ is in makes
the others slightly less likely. The correct statement is that every
$k$-subset is equally likely, which follows from the same induction carried over
subsets instead of elements.

:::proof{title="Weighted reservoirs: A-Res"}
For weighted sampling without replacement — item $i$ chosen with probability
proportional to $w_i$ — Efraimidis and Spirakis give a startling one-liner.
Draw $u_i \sim \mathrm{Uniform}(0,1)$ independently for each item and assign it
the key

$$\kappa_i = u_i^{1/w_i}.$$

Keep the $k$ items with the **largest keys**, in a min-heap of size $k$. That is
the whole algorithm, and it is still one pass with no knowledge of $n$.

Why it works: $\Pr[\kappa_i \leq t] = \Pr[u_i \leq t^{w_i}] = t^{w_i}$ for
$t \in (0,1)$, so a larger weight pushes the key distribution toward 1. Compare
two items: $\Pr[\kappa_i > \kappa_j] = w_i / (w_i + w_j)$ — exactly the
weighted-selection probability you wanted, and the argument extends to the top
$k$.
:::
::::

## The same problem in SQL, and the trap in it

SQL engines offer two sampling methods, and they are not two speeds of the same
thing. They answer different questions.

```sql runnable id=bernoulli-vs-system dataset=package-registry
-- 100,000 rows where the value IS the position: any positional bias is visible
-- directly in the mean. The true mean of i is 49,999.5.
SELECT 'bernoulli' AS method, 1 AS seed, count(*) AS rows_kept, round(avg(i)) AS mean_i
  FROM (SELECT i FROM range(0, 100000) t(i)) USING SAMPLE 1 PERCENT (bernoulli, 1)
UNION ALL SELECT 'bernoulli', 2, count(*), round(avg(i))
  FROM (SELECT i FROM range(0, 100000) t(i)) USING SAMPLE 1 PERCENT (bernoulli, 2)
UNION ALL SELECT 'bernoulli', 3, count(*), round(avg(i))
  FROM (SELECT i FROM range(0, 100000) t(i)) USING SAMPLE 1 PERCENT (bernoulli, 3)
UNION ALL SELECT 'system', 1, count(*), round(avg(i))
  FROM (SELECT i FROM range(0, 100000) t(i)) USING SAMPLE 1 PERCENT (system, 1)
UNION ALL SELECT 'system', 2, count(*), round(avg(i))
  FROM (SELECT i FROM range(0, 100000) t(i)) USING SAMPLE 1 PERCENT (system, 2)
UNION ALL SELECT 'system', 3, count(*), round(avg(i))
  FROM (SELECT i FROM range(0, 100000) t(i)) USING SAMPLE 1 PERCENT (system, 3);
```

The Bernoulli rows keep about 1,000 rows and land near 49,999 every time. The
SYSTEM rows do not: some seeds return no rows at all, and the ones that return
rows return a contiguous block whose mean is nowhere near the middle.

**BERNOULLI** flips an independent coin per row. It is reservoir sampling's
relational cousin: unbiased, sample size binomially distributed around
$p \cdot n$, and it costs a full scan because it has to look at every row to
flip for it.

**SYSTEM** flips one coin per *storage block* and takes every row in the blocks
it keeps. It is enormously cheaper — whole blocks are skipped without being
read — and it is unbiased only if row placement is unrelated to row content.

That condition is nearly always false. Tables are written in insert order, which
means time order. They are clustered on a sort key. They are partitioned by
date. In every one of those cases, "the rows that live together" is a meaningful
group, and SYSTEM samples groups, not rows.

```sql runnable id=system-all-or-nothing dataset=package-registry
-- downloads is 200 rows: one storage block. SYSTEM has exactly two
-- possible answers, and neither of them is a 50% sample.
SELECT
  (SELECT count(*) FROM downloads USING SAMPLE 50 PERCENT (system, 1))    AS system_seed_1,
  (SELECT count(*) FROM downloads USING SAMPLE 50 PERCENT (system, 2))    AS system_seed_2,
  (SELECT count(*) FROM downloads USING SAMPLE 50 PERCENT (bernoulli, 1)) AS bernoulli_seed_1,
  (SELECT count(*) FROM downloads USING SAMPLE 50 PERCENT (bernoulli, 2)) AS bernoulli_seed_2;
```

200 rows, one block, "50%" — and SYSTEM returns all 200 or none. Bernoulli
returns 96 and 104. The variance of a block sample is set by the number of
*blocks*, not the number of rows, and a table with few blocks has effectively no
sample size at all.

:::pitfall{title="The one-line rule"}
Use SYSTEM when you want to look at *some real rows* quickly — eyeballing a
schema, smoke-testing a query. Use BERNOULLI when a **number** computed from the
sample will be reported to anyone. If the number goes in a dashboard, the block
structure of your storage must not be allowed to influence it.
:::

## The planner samples too, and it matters more

Before executing anything, the optimiser has to guess how many rows each
operator will emit. Those guesses come from statistics that were themselves
built by sampling the table.

```sql runnable id=planner-estimate dataset=package-registry
EXPLAIN SELECT * FROM packages WHERE language = 'python' AND license = 'MIT';
```

The plan says `~5 rows`. Run the query and count: there are 3. The estimate is
off because the optimiser assumes the two predicates are **independent** and
multiplies their selectivities — a standard assumption that is wrong whenever
columns are correlated, which is most of the time.

At this scale nobody cares. At scale it decides everything: an estimate of 5
rows says "build a hash table on this side", an estimate of 5 million says
"don't". Get it wrong and the engine builds a hash table on the wrong input, or
picks a nested loop over a genuinely large relation. That is not a percentage
slowdown, it is a different algorithm.

This is why `ANALYZE` exists, why correlated predicates are the classic reason
a query "suddenly got slow" after a data load, and why every serious engine has
multi-column statistics to patch the independence assumption.

:::exercise{ref=reservoir-sample}
:::

:::exercise{ref=hash-sampled-total}
:::

:::quiz{id=quiz-l04 passing=2}
- id: q1
  prompt: "In reservoir sampling with k = 10, what is the probability that the 500th item is accepted into the reservoir?"
  options:
    - "1/500, because there is one new item among 500."
    - "10/500, because there are 10 slots and 500 items seen."
    - "1/2, because it is either kept or not."
    - "10/490 — the slots already filled do not count."
  answerIndex: 1
  explanation: >-
    The algorithm draws j uniformly from 0..499 and inserts if j < k, so
    acceptance is k/i = 10/500. That decreasing acceptance rate is balanced
    against a 1/i eviction rate for the items already held, and the two together
    keep every item at exactly k/n.
- id: q2
  prompt: "A table of events is stored in arrival order. You take TABLESAMPLE SYSTEM (1 PERCENT) and compute the average event value. What is wrong?"
  options:
    - "Nothing — SYSTEM is unbiased, just faster."
    - "SYSTEM selects whole storage blocks, so the sample is a few contiguous time ranges rather than a spread across the table."
    - "SYSTEM returns exactly 1% of rows, so the average is over-precise."
    - "SYSTEM cannot be used with aggregates."
  answerIndex: 1
  explanation: >-
    Blocks hold rows that were written together, which for an append-only event
    table means rows from the same few minutes. The result is a sample of a few
    time windows, not of the table — and any daily or weekly cycle in the data
    will be reproduced in the estimate as if it were a level. BERNOULLI flips a
    coin per row and does not have this failure.
- id: q3
  prompt: "Why does the query planner's cardinality estimate matter more than a 10% error in a sampled aggregate?"
  options:
    - "It does not; both are just approximations."
    - "Because the estimate chooses the plan — a wrong estimate can swap a hash join for a nested loop, which is a different algorithm rather than a slightly slower one."
    - "Because cardinality estimates are used to allocate disk space."
    - "Because the planner's sample is smaller."
  answerIndex: 1
  explanation: >-
    A sampled aggregate that is 10% off is 10% off. A cardinality estimate that
    is 1000x off changes which physical operator runs, which side of a join is
    built, and whether an index is used at all. The classic cause is the
    independence assumption across correlated predicates, which is why
    multi-column statistics exist.
:::
