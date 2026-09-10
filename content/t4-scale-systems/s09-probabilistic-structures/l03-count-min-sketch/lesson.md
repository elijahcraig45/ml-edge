---
id: t4/s09/l03
title: Count-Min Sketch, and the error you can bound in advance
tier: t4-scale-systems
stage: s09-probabilistic-structures
status: published
estimatedMinutes: 45
objectives:
  - Build a Count-Min Sketch and explain why taking the minimum across rows is the whole algorithm.
  - State the epsilon/delta guarantee and pick width and depth from it.
  - Find heavy hitters in a stream you cannot store, and say why the error is one-sided.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"The minimum across rows is a heuristic.\"** It is the proof. Every row's counter is the true count plus the mass of everything else that collided there, and collision mass is never negative — so every row over-counts, and the smallest over-count is the best bound available."
  - "**\"Wider is better, deeper is better, pick whichever.\"** They buy different things. Width controls how *large* the error is; depth controls how *often* the error exceeds that size. Doubling the width halves epsilon; adding a row cuts the failure probability by a constant factor."
  - "**\"It can tell you which keys are heavy.\"** It can tell you an estimated count for a key you name. It cannot enumerate keys — nothing in the table remembers them. Every real heavy-hitter implementation keeps a separate small heap of candidate keys alongside the sketch."
  - "**\"Small counts are estimated as well as large ones.\"** They are the worst case. The absolute error is roughly epsilon times the *total* stream mass, so a key with a true count of 3 in a billion-event stream can come back as 40,000. Count-Min is a heavy-hitter structure, and it is close to useless for the tail."
masteryChecklist:
  - I can explain why the sketch never under-counts, in one sentence about how counters are updated.
  - Given a target epsilon and delta, I can compute the width and depth of the table.
  - I can say why the error is proportional to the total stream mass rather than to the key's own count.
runtimes:
  - engine: python
  - engine: duckdb
    datasetId: package-registry
---

A CDN sees fifty million requests a second and wants to know which URLs are hot
enough to pin in cache. A `Counter` over every URL is out of the question. But
you do not need every URL — you need the handful above 0.1% of traffic, and you
need to know how wrong the answer might be.

Count-Min gives you both. It is a Bloom filter with counters instead of bits,
and the change from "bit" to "counter" turns *membership* into *frequency*
while keeping the error one-sided.

## The structure

A table of $d$ rows by $w$ columns of integer counters, and $d$ hash functions —
one per row.

- **Add `x` with weight `c`**: for each row $i$, add $c$ to
  `table[i][h_i(x) mod w]`.
- **Estimate `x`**: return $\min_i$ `table[i][h_i(x) mod w]`.

Every row is a complete, independent, lossy tally of the whole stream. The
estimate is the most pessimistic row — which, as it turns out, means the most
accurate one.

```python runnable id=cms-from-scratch
import hashlib
from collections import Counter

def row_hash(item, row):
    return int.from_bytes(hashlib.sha256(f"{row}:{item}".encode()).digest()[:8], "big")

class CountMin:
    def __init__(self, width, depth):
        self.width, self.depth = width, depth
        self.table = [[0] * width for _ in range(depth)]

    def add(self, item, amount=1):
        for r in range(self.depth):
            self.table[r][row_hash(item, r) % self.width] += amount

    def estimate(self, item):
        return min(self.table[r][row_hash(item, r) % self.width] for r in range(self.depth))

# A Zipf-ish stream: package 1 gets 9000 downloads, package 20 gets 450.
truth = Counter({f"pkg-{i}": 9000 // i for i in range(1, 21)})
truth.update({f"tail-{i}": 3 for i in range(2000)})     # a long, boring tail

sketch = CountMin(width=64, depth=3)                     # deliberately tiny
for key, n in truth.items():
    sketch.add(key, n)

print(f"{'key':>10} {'true':>7} {'estimate':>9} {'error':>6}")
for key in ("pkg-1", "pkg-5", "pkg-20", "tail-7", "never-seen"):
    e = sketch.estimate(key)
    print(f"{key:>10} {truth[key]:>7} {e:>9} {e - truth[key]:>6}")
```

Read the error column. Every entry is **zero or positive**. Never negative, in
this run or any other. And `never-seen` — a key that was never added at all —
comes back with a positive count, which is the same failure mode as a Bloom
filter's false positive wearing a different hat.

## Why it never under-counts

Fix a key $x$ and a row $i$. That row's counter for $x$ holds

$$
\text{table}[i][h_i(x)] \;=\; \underbrace{f_x}_{\text{what you want}} \;+\;
\sum_{y \neq x,\; h_i(y) = h_i(x)} f_y
$$

Every $f_y$ is a non-negative count, so the second term is $\geq 0$. Each row
therefore returns $f_x$ plus junk, and the minimum over rows returns $f_x$ plus
the *smallest* junk. Under-counting would require a negative $f_y$, which cannot
happen in an insert-only stream.

:::warning{title="Deletions break the guarantee"}
If your stream has decrements — a "turnstile" model, where items leave as well
as arrive — collision mass can be negative, and the minimum can now sit *below*
the truth. The one-sided guarantee is gone. The standard fix is the **Count
Sketch**, which multiplies each update by a random $\pm 1$ and takes the
*median* across rows; the errors then cancel instead of accumulating, at the
cost of a two-sided bound.
:::

## The guarantee

Choose two numbers before you allocate anything:

- $\varepsilon$ — how much over-count you will tolerate, as a fraction of the
  total stream mass $N$;
- $\delta$ — how often you will tolerate exceeding it.

Then set

$$
w = \left\lceil \frac{e}{\varepsilon} \right\rceil, \qquad
d = \left\lceil \ln \frac{1}{\delta} \right\rceil
$$

and the sketch satisfies, for every key,

$$\Pr\big[\hat{f}_x > f_x + \varepsilon N\big] \;<\; \delta .$$

Two independent knobs, and it is worth being precise about which does what.

| Knob | Cost | Effect |
| --- | --- | --- |
| width $w$ | linear in memory | sets the **size** of the error, $\varepsilon N$ |
| depth $d$ | linear in memory *and* in update time | sets the **probability** of exceeding it |

Depth is logarithmic in $1/\delta$, so it stays small: $\delta = 10^{-6}$ needs
only 14 rows. Width is linear in $1/\varepsilon$, so it is where all your memory
goes. A typical production sketch is 5 rows by 100,000 columns — 2 MB, tracking
a stream of any length.

```python runnable id=cms-epsilon
import hashlib, math
from collections import Counter

def row_hash(item, row):
    return int.from_bytes(hashlib.sha256(f"{row}:{item}".encode()).digest()[:8], "big")

def build(truth, width, depth):
    table = [[0] * width for _ in range(depth)]
    for key, n in truth.items():
        for r in range(depth):
            table[r][row_hash(key, r) % width] += n
    return lambda k: min(table[r][row_hash(k, r) % width] for r in range(depth))

truth = Counter({f"pkg-{i}": 9000 // i for i in range(1, 21)})
truth.update({f"tail-{i}": 1 + (i % 7) for i in range(3000)})
total = sum(truth.values())

print(f"{'eps':>7} {'width':>7} {'depth':>6} {'eps*N':>8} {'worst over':>11}")
for eps in (0.05, 0.01, 0.002, 0.0005):
    w, d = math.ceil(math.e / eps), math.ceil(math.log(1 / 0.01))
    est = build(truth, w, d)
    worst = max(est(k) - truth[k] for k in truth)
    print(f"{eps:>7} {w:>7} {d:>6} {eps * total:>8.0f} {worst:>11}")
```

The `worst over` column sits comfortably under `eps*N` at every setting. It
should — $\varepsilon N$ is a bound that holds with probability $1 - \delta$
per key, and the sketch normally does much better than its own guarantee.

:::pitfall{title="The error scales with the stream, not with the key"}
$\varepsilon N$ uses $N$, the total mass of everything. In a stream of a billion
events with $\varepsilon = 0.001$, the error budget is a million — so any key
whose true count is under a million is indistinguishable from noise. Count-Min
answers "which keys are big?" It does not answer "how many times did this rare
key appear?", and using it for the second question is the single most common
misuse.
:::

:::checkpoint{id=cp-cms-onesided rubric="each row holds the true count plus collision mass,collision mass cannot be negative in an insert-only stream,so the minimum is still an upper bound"}
Explain, without using the word "hash", why the minimum across rows is
guaranteed to be at least the true count. Then say what changes if the stream
can decrement.
:::

## Heavy hitters, and the piece the sketch does not give you

A **$\varphi$-heavy hitter** is a key whose count exceeds $\varphi N$. The
sketch estimates a count for any key you name — but it cannot list keys, because
it never stored one. The standard construction is a sketch plus a min-heap of
the top $1/\varphi$ candidates seen so far: update the sketch, then, if the new
estimate beats the heap's smallest, push the key.

SQL has the same pairing. The exact query is a `GROUP BY` with a `HAVING`
threshold, and it needs a full aggregation of the stream:

```sql runnable id=heavy-hitters-exact dataset=package-registry
-- Expand the daily counts into one row per download: 363,840 events.
SELECT p.name, count(*) AS events
FROM downloads d
JOIN packages p ON p.id = d.package_id, range(0, d."count") r
GROUP BY p.name
ORDER BY events DESC
LIMIT 5;
```

DuckDB also ships the streaming answer, under the name `approx_top_k`:

```sql runnable id=heavy-hitters-approx dataset=package-registry
SELECT unnest(approx_top_k(p.name, 3)) AS heavy_hitter
FROM downloads d
JOIN packages p ON p.id = d.package_id, range(0, d."count") r;
```

Same three names, from a structure with bounded memory that made one pass. (The
implementation is Filtered Space-Saving rather than Count-Min — a cousin with
the same shape of guarantee and an explicit candidate list built in, which is
why it can return names at all.)

:::insight{title="The sketch is the counter; the heap is the memory"}
This split shows up everywhere. A sketch answers "how much?" in fixed space; a
small exact structure beside it answers "which?". If a design seems to need the
sketch to enumerate keys, the missing piece is the heap, not a bigger table.
:::

::::track{depth=interview}
## The stream question

The trigger is a problem with the words **"stream"**, **"top-k"**, **"trending"**,
or **"we can't store all of it"**, and a follow-up about memory.

The progression an interviewer is usually looking for:

1. **The exact answer, stated and rejected.** "A hash map from key to count, then
   a top-k pass. That's O(distinct keys) memory, and the whole premise is that
   distinct keys is too large."
2. **The sketch.** "Count-Min at 5 rows by 100k columns is 2 MB regardless of
   stream length. It over-counts and never under-counts, so a heavy hitter can
   never be missed — only extra candidates can appear."
3. **The heap.** "The sketch can't enumerate, so I keep a heap of the top 1/phi
   candidates beside it."
4. **The failure mode, unprompted.** "The error is epsilon times total stream
   mass, so this is only good for keys that are actually heavy. It would be a
   bad choice for per-key billing."

Point 2 has the sentence worth rehearsing: **"the error is one-sided, so a true
heavy hitter can never be filtered out — false positives are possible, false
negatives are not."** That is the same asymmetry as the Bloom filter, and
naming the connection out loud is what separates a memorised answer from an
understood one.

:::interview{title="The trap question"}
"Could you use it to detect the *least* frequent items?" No — and say why
crisply. Estimates are inflated by collision mass, and the inflation is largest
relative to small counts. The rare items are precisely the ones the structure
cannot see. That question is asked to find out whether you know what the
guarantee actually says.
:::
::::

:::exercise{ref=count-min-sketch}
:::

:::exercise{ref=heavy-hitters}
:::

:::quiz{id=quiz-l03 passing=2}
- id: q1
  prompt: "Why does the estimate take the minimum across rows rather than the average?"
  options:
    - "The average would be slower to compute."
    - "Every row is the true count plus non-negative collision mass, so the minimum is the tightest upper bound available."
    - "The minimum is the only value guaranteed to be an integer."
    - "Averaging would break the memory bound."
  answerIndex: 1
  explanation: >-
    Each row over-counts by whatever else hashed to the same cell. Averaging
    would fold in the larger over-counts from the unlucky rows and produce a
    worse estimate that no longer bounds the truth from above. The minimum keeps
    the one-sided guarantee and is the closest row to the true value.
- id: q2
  prompt: "You need epsilon = 0.001 and delta = 0.01. What table do you allocate?"
  options:
    - "1000 columns by 100 rows."
    - "About 2719 columns by 5 rows."
    - "About 100 columns by 2719 rows."
    - "It depends on the length of the stream."
  answerIndex: 1
  explanation: >-
    w = ceil(e / epsilon) = ceil(2.718 / 0.001) = 2719, and d = ceil(ln(1/delta))
    = ceil(4.6) = 5. Neither depends on the stream length — that independence is
    the point. Swapping the two would spend all the memory on driving the failure
    probability absurdly low while leaving the error enormous.
- id: q3
  prompt: "A key with a true count of 12 in a 10-million-event stream is estimated at 9,800 by a sketch with epsilon = 0.001. Is the sketch broken?"
  options:
    - "Yes — the error is 800x the true count."
    - "No — the bound is epsilon * N = 10,000, and 9,800 is within it. The key is too rare for this sketch."
    - "Yes — a key that rare should collide with nothing."
    - "No, because the minimum across rows can never exceed the true count."
  answerIndex: 1
  explanation: >-
    The guarantee is absolute error up to epsilon times TOTAL stream mass, not
    relative to the key's own count. 0.001 x 10,000,000 = 10,000, so 9,800 is
    inside the promise. This is the structure working as specified, and it is why
    Count-Min is a heavy-hitter tool rather than a general frequency table.
:::
