---
id: t4/s09/l05
title: MinHash, LSH, and t-digest
tier: t4-scale-systems
stage: s09-probabilistic-structures
status: published
estimatedMinutes: 50
objectives:
  - Explain why the probability that two sets share a minimum hash equals their Jaccard similarity.
  - Estimate Jaccard from signatures, and choose bands and rows to set an LSH threshold.
  - Read approx_quantile as a t-digest and say why its error is smallest at the tails.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"MinHash compresses the set.\"** It compresses the *comparison*. A 128-value signature answers one question — how similar is this to that — and nothing else. You cannot recover a single member of the original set from it."
  - "**\"LSH finds the similar pairs.\"** It finds *candidate* pairs, and it is allowed to miss real ones. The banding parameters set both the false-positive and the false-negative rate, and a pair below the threshold is meant to be missed. Every LSH pipeline re-scores its candidates exactly afterwards."
  - "**\"Quantiles just need the sorted data.\"** Sorting is exactly what you cannot afford in a stream, and it is why the naive answer needs memory proportional to the data. A t-digest keeps a few hundred weighted centroids and answers any quantile from them."
  - "**\"Approximate quantiles are equally accurate everywhere.\"** t-digest is deliberately lopsided: centroids near the extremes are kept small and centroids near the median are allowed to grow. p99 comes back far more accurate, in relative terms, than p60 — which is the right trade, because nobody pages on p60."
masteryChecklist:
  - I can state the MinHash identity and say in one sentence why it is true.
  - Given a target similarity threshold, I can pick the number of bands and rows for LSH.
  - I can explain why t-digest gives better relative accuracy at p99 than at the median.
runtimes:
  - engine: python
  - engine: duckdb
    datasetId: package-registry
---

Comparing two sets exactly costs a pass over both. Comparing a million documents
pairwise costs half a trillion of those passes, which is why nobody does it.

MinHash replaces each set with a short fixed-length signature such that
**comparing signatures estimates comparing sets**. LSH then avoids comparing
most pairs at all. Between them they turn near-duplicate detection from
quadratic into approximately linear, and both are one identity plus bookkeeping.

## The identity

Jaccard similarity is intersection over union:

$$J(A, B) = \frac{|A \cap B|}{|A \cup B|}$$

Take a hash function $h$ and define $\text{mh}(S) = \min_{x \in S} h(x)$. Now
ask: what is the probability that $\text{mh}(A) = \text{mh}(B)$?

The minimum over $A \cup B$ is achieved by exactly one element (assume no
collisions). A good hash makes every element of $A \cup B$ equally likely to be
that one. Both sets report the same minimum precisely when that element lies in
$A \cap B$ — because otherwise one of the two sets does not contain it and must
report something larger. So

$$\Pr[\text{mh}(A) = \text{mh}(B)] = \frac{|A \cap B|}{|A \cup B|} = J(A, B).$$

That is the whole theorem. One hash function gives you one Bernoulli trial with
success probability $J$. Use $m$ independent hash functions and the fraction of
matching positions is an unbiased estimate of $J$ with standard error
$\sqrt{J(1-J)/m}$ — the same $1/\sqrt{m}$ wall as everything else in this stage.

```python runnable id=minhash-basics
import hashlib

def sig_hash(item, i):
    return int.from_bytes(hashlib.sha256(f"{i}:{item}".encode()).digest()[:8], "big")

def signature(items, m):
    return [min(sig_hash(x, i) for x in items) for i in range(m)]

def estimate(sig_a, sig_b):
    return sum(1 for x, y in zip(sig_a, sig_b) if x == y) / len(sig_a)

A = set(range(100))
B = set(range(50, 150))
true_j = len(A & B) / len(A | B)

print(f"true Jaccard: {true_j:.4f}\n")
print(f"{'m':>6} {'estimate':>10} {'error':>8} {'1/sqrt(m)':>10}")
for m in (16, 64, 256, 1024):
    est = estimate(signature(A, m), signature(B, m))
    print(f"{m:>6} {est:>10.4f} {est - true_j:>8.4f} {1 / m ** 0.5:>10.4f}")
```

Note the shape of the estimate: it is always a multiple of $1/m$, because it is
a count of matching positions. That is a useful tell — if a "MinHash estimate"
comes back as 0.3333333, something computed the exact Jaccard instead.

:::insight{title="Sets of what?"}
MinHash needs sets, and documents are not sets. The standard conversion is
**shingling**: turn a document into the set of its overlapping $k$-grams (words
or characters). "the quick brown fox" with $k=3$ words becomes
`{"the quick brown", "quick brown fox"}`. Shingle size is the real tuning knob —
too small and every document shares shingles, too large and a single edited word
destroys many of them at once.
:::

## LSH: not comparing most pairs

A signature makes each comparison cheap. It does not reduce the *number* of
comparisons, and a million documents is still half a trillion pairs.

Locality-sensitive hashing fixes that with one more idea. Split each
$m$-position signature into $b$ **bands** of $r$ positions ($m = br$). Hash each
band. Two documents become **candidates** if they agree on *at least one entire
band*.

For a pair with true similarity $s$:

- one band matches with probability $s^{r}$ (all $r$ positions must agree),
- no band matches with probability $(1 - s^{r})^{b}$,
- so they become candidates with probability

$$P(s) = 1 - (1 - s^{r})^{b}.$$

That function is an S-curve. It is near 0 for small $s$, near 1 for large $s$,
and it crosses steeply at approximately

$$s^{*} \approx \left(\frac{1}{b}\right)^{1/r}.$$

You get to place the threshold by choosing $b$ and $r$.

```python runnable id=lsh-banding
import hashlib

def sig_hash(item, i):
    return int.from_bytes(hashlib.sha256(f"{i}:{item}".encode()).digest()[:8], "big")

def signature(items, m):
    return tuple(min(sig_hash(x, i) for x in items) for i in range(m))

m, b, r = 128, 32, 4                    # threshold ~ (1/32)^(1/4) = 0.42
base = set(range(400))
sig_base = signature(base, m)
bands_base = {sig_base[i * r:(i + 1) * r] for i in range(b)}

print(f"bands={b} rows={r}  threshold ~ {(1 / b) ** (1 / r):.2f}\n")
print(f"{'true J':>8} {'est J':>7} {'candidate?':>11} {'P(s) theory':>12}")
for shift in (0, 20, 45, 75, 110, 155, 230):
    other = set(range(shift, shift + 400))
    sig = signature(other, m)
    j = len(base & other) / len(base | other)
    est = sum(1 for x, y in zip(sig_base, sig) if x == y) / m
    bands = {sig[i * r:(i + 1) * r] for i in range(b)}
    theory = 1 - (1 - j ** r) ** b
    print(f"{j:>8.3f} {est:>7.3f} {str(bool(bands_base & bands)):>11} {theory:>12.3f}")
```

Pairs above about 0.55 become candidates; pairs below about 0.45 do not. Nothing
was compared pairwise — every document was hashed into $b$ buckets, and only
documents sharing a bucket were ever looked at together.

:::pitfall{title="Both errors are real, and you chose them"}
A pair at $s = 0.7$ with these parameters is a candidate with probability
0.99985 — so about 15 in every 100,000 genuinely similar pairs are **missed
entirely**.
More bands raises recall and raises the candidate count you must re-score;
longer bands does the opposite. There is no setting with no errors. Deciding
which error you can live with is the actual design work.
:::

:::checkpoint{id=cp-lsh-bands rubric="more bands lowers the threshold and finds more candidates,longer rows raises the threshold and finds fewer,the product br is fixed by the signature length"}
You are getting too many candidate pairs to re-score. You cannot lengthen the
signature. Do you increase $b$ or $r$, and what do you give up?
:::

## t-digest, and the SQL you already use

Quantiles have the same problem as distinct counts: the exact answer needs the
data. `quantile_cont` sorts. On a stream, or on a table you would rather not
sort, you want a sketch.

**t-digest** keeps a few hundred weighted centroids over the value range and
answers any quantile by interpolating between them. Its defining trick is that
centroid size is not uniform: a centroid near $q = 0.5$ may absorb many points,
while centroids near $q = 0$ and $q = 1$ are kept small. Accuracy is therefore
best where the data is sparsest — the tails — which is where percentile
questions actually live.

`approx_quantile` **is** a t-digest, in DuckDB and in most engines that offer it.

```sql runnable id=tdigest-vs-exact dataset=package-registry
SELECT
  round(quantile_cont("count", 0.50), 2) AS exact_p50,
  approx_quantile("count", 0.50)         AS approx_p50,
  round(quantile_cont("count", 0.99), 2) AS exact_p99,
  approx_quantile("count", 0.99)         AS approx_p99
FROM downloads;
```

The median comes back 1075 exact and 1076 approximate — one unit apart on 200
rows. p99 is 9320.4 exact and 9340 approximate: an absolute gap of 19.6, but
only 0.2% of the value, on the part of the distribution with the fewest points
to work with.

:::warning{title="Quantile levels must be constants"}
`quantile_cont(x, q)` will not accept a column or a correlated expression for
`q` — DuckDB raises *"QUANTILE can only take constant parameters"*. The sketch
is built for a fixed set of levels at plan time. To report several levels, pass
a list, `approx_quantile("count", [0.5, 0.9, 0.99])`, or write one branch per
level and union them. The exercise below does the second, on purpose, because
that is the shape you will end up writing in a real report.
:::

::::track{depth=systems}
## Where these two actually run

**MinHash + LSH is the deduplication layer of every large text corpus.** The
pipelines behind Common Crawl derivatives, C4, and the datasets used to train
large language models all run essentially the same job: shingle each document,
MinHash to a 128-value signature, band into LSH buckets, re-score the candidate
pairs exactly, drop the duplicates. At web scale, exact pairwise comparison is
not slow — it is arithmetically impossible, and the S-curve threshold becomes a
data-quality parameter that a person has to sign off on.

The same structure appears without the text: Jaccard over the set of a user's
purchased items is a collaborative-filtering similarity, and LSH over those
signatures is a candidate generator for recommendations.

**t-digest is what your latency dashboard is made of.** A p99 must be computed
per-service, per-endpoint, per-minute, and then re-aggregated over an hour and a
day. Three consequences follow:

- **Averaging percentiles is wrong.** The mean of sixty per-minute p99s is not
  the hourly p99, and it is usually optimistic. Teams ship this bug constantly.
- **t-digests merge.** Two digests combine into a digest of the union, which
  makes the hourly p99 a merge of sixty sketches — correct, and cheap. This is
  the same mergeability argument that makes HyperLogLog worth storing.
- **Storage is fixed per series.** A digest with compression 100 is a few
  kilobytes regardless of how many requests it summarises, so a metrics store
  can keep one per (service, endpoint, minute) forever.

Prometheus histograms solve the same problem the other way, with fixed buckets
chosen in advance: cheaper still, mergeable, and unable to answer accurately
about a latency range you did not anticipate when you defined the buckets.
t-digest picks its own resolution from the data instead. The trade is
configuration versus adaptivity, and it is worth being able to argue either
side.
::::

:::exercise{ref=minhash-jaccard}
:::

:::exercise{ref=approx-quantile-error}
:::

:::quiz{id=quiz-l05 passing=2}
- id: q1
  prompt: "Why does the probability that two sets share a MinHash equal their Jaccard similarity?"
  options:
    - "Because hashing preserves set size."
    - "Because the element achieving the minimum over the union is uniformly random, and both sets report it only when it lies in the intersection."
    - "Because the hash values are uniformly distributed in [0, 1]."
    - "Because the minimum of a set is its most representative element."
  answerIndex: 1
  explanation: >-
    Exactly one element of A ∪ B achieves the minimum hash, and a good hash makes
    each element equally likely to be that one. If it belongs to both sets, both
    minima agree; if it belongs to only one, that set reports it and the other
    reports something larger. The probability is therefore |A ∩ B| / |A ∪ B|.
- id: q2
  prompt: "With m = 128 and r = 4, you switch from b = 32 bands to b = 16 bands of r = 8. What happens?"
  options:
    - "The similarity threshold rises, so fewer pairs become candidates and more true near-duplicates are missed."
    - "The similarity threshold falls, so more pairs become candidates."
    - "Nothing — only the product b*r matters."
    - "Recall improves at no cost, because longer bands are more informative."
  answerIndex: 0
  explanation: >-
    The threshold is about (1/b)^(1/r). Going from (32, 4) to (16, 8) moves it
    from 0.42 to about 0.69: bands are harder to match all the way through, so
    only much more similar pairs collide. Fewer candidates to re-score, and more
    genuine near-duplicates missed. The product br is fixed by the signature
    length and says nothing about where the threshold lands.
- id: q3
  prompt: "Your dashboard averages sixty per-minute p99 latencies to get an hourly p99. What is wrong?"
  options:
    - "Nothing, as long as each minute has the same request count."
    - "Percentiles do not average: the hourly p99 is a quantile of the pooled distribution, and the mean of per-minute p99s is usually lower. Merging the t-digests gives the right answer."
    - "The p99 should be summed, not averaged."
    - "It is fine, but t-digest error accumulates over sixty merges."
  answerIndex: 1
  explanation: >-
    A single terrible minute pushes the hourly p99 up while barely moving the
    mean of the sixty values, so the average understates the tail. Equal request
    counts do not fix it. The correct operation is to merge the sixty sketches
    and read the quantile from the merged digest — which is exactly why metrics
    systems store digests rather than computed percentiles.
:::
