---
id: t4/s09/l07
title: Eviction policies, and the materialized view as a cache
tier: t4-scale-systems
stage: s09-probabilistic-structures
status: published
estimatedMinutes: 45
objectives:
  - Implement LRU in O(1) per operation and say why the naive version is not.
  - Compare LRU, LFU and CLOCK on a workload and explain which access pattern each one loses to.
  - Treat a materialized view as a cache, and name its hit rate, its eviction policy and its staleness.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"LRU is the best general-purpose policy.\"** LRU is the best *cheap* approximation of the optimal policy for workloads with temporal locality. A single sequential scan larger than the cache evicts everything useful and gets zero hits doing it — which is why every database has scan-resistant machinery bolted onto its buffer pool."
  - "**\"A higher hit rate is a better cache.\"** Hit rate is not the objective; time saved is. A 60% hit rate on the expensive queries beats a 95% hit rate on the cheap ones, and caches sized by hit-rate targets routinely optimise the wrong thing."
  - "**\"CLOCK is a cheaper LRU.\"** It is a cheaper *approximation* of LRU, and the approximation is the point: one reference bit per entry instead of a linked-list splice, no write to shared state on a read hit, and therefore no lock contention on the hot path. That last property is why it is in your operating system and not LRU."
  - "**\"A materialized view is just a faster view.\"** A view is a query. A materialized view is a stored answer, which means it can be **wrong** — it is as old as its last refresh. Choosing that staleness is a product decision that engineers frequently make by accident."
masteryChecklist:
  - I can implement LRU with O(1) get and put, and explain what the naive list version costs.
  - Given an access pattern, I can predict whether LRU or LFU will do better and say why.
  - "I can list the four questions to ask about any materialized view: what it costs to refresh, how stale it may be, what its hit rate is, and what invalidates it."
runtimes:
  - engine: python
  - engine: duckdb
    datasetId: package-registry
---

Every structure in this stage traded exactness for space. A cache trades
something else: it keeps exact answers, and gives up **coverage**. The answer is
either there or it is not, and the eviction policy is the entire design.

Which is also the last thing this stage has to say about approximation. A cache
miss is not a wrong answer, it is a slow one — but a *stale* cache entry is a
wrong answer, and that is exactly what a materialized view is.

## LRU, and the cost of the obvious implementation

Least-recently-used is one rule: evict whatever has gone longest untouched. The
naive implementation is a list of keys in recency order, and it is quadratic in
disguise.

```python runnable id=lru-cost
import random, time

class ListLRU:
    def __init__(self, capacity):
        self.capacity, self.keys, self.store = capacity, [], {}
    def get(self, key):
        if key not in self.store:
            return None
        self.keys.remove(key)          # scans the list
        self.keys.append(key)
        return self.store[key]
    def put(self, key, value):
        if key in self.store:
            self.keys.remove(key)      # scans again
        elif len(self.keys) >= self.capacity:
            del self.store[self.keys.pop(0)]   # and shifts everything left
        self.keys.append(key)
        self.store[key] = value

class DictLRU:
    """Python dicts preserve insertion order, so pop-and-reinsert IS move-to-end."""
    def __init__(self, capacity):
        self.capacity, self.store = capacity, {}
    def get(self, key):
        if key not in self.store:
            return None
        value = self.store.pop(key)
        self.store[key] = value
        return value
    def put(self, key, value):
        if key in self.store:
            self.store.pop(key)
        elif len(self.store) >= self.capacity:
            del self.store[next(iter(self.store))]
        self.store[key] = value

rnd = random.Random(0)
requests = [rnd.randrange(20_000) for _ in range(30_000)]
for cls in (DictLRU, ListLRU):
    cache, hits = cls(15_000), 0
    start = time.perf_counter()
    for key in requests:
        if cache.get(key) is None:
            cache.put(key, key)
        else:
            hits += 1
    print(f"{cls.__name__:>8}  {hits} hits  {(time.perf_counter() - start) * 1000:>7.0f} ms")
```

Identical hit counts, wildly different times. Both `list.remove` and
`list.pop(0)` are linear in the cache size, and they run on **every access** —
so a bigger cache makes each operation slower, which is the opposite of what a
cache is for.

The textbook fix is a doubly-linked list plus a hash map. In Python you get it
for free: dicts have preserved insertion order since 3.7, so `pop` followed by
reinsert moves a key to the end in $O(1)$, and `next(iter(d))` reads the oldest
key without materialising anything. `collections.OrderedDict.move_to_end` is the
same operation with a name.

:::insight{title="The SQL counterpart"}
A database buffer pool is exactly this cache, with pages instead of keys. When
you read that Postgres has `shared_buffers = 8GB`, that is the capacity, and its
replacement policy — a CLOCK variant with a usage counter — is the eviction
rule. Query performance on a large table is mostly a question of whether the
pages you need are in that cache, which is why the same query is 50ms warm and
5 seconds cold.
:::

## Three policies, and what each one loses to

```python runnable id=policy-comparison
import random
from collections import Counter

def lru_hits(capacity, requests):
    store, hits = {}, 0
    for key in requests:
        if key in store:
            hits += 1
            store.pop(key); store[key] = True
        else:
            if len(store) >= capacity:
                del store[next(iter(store))]
            store[key] = True
    return hits

def lfu_hits(capacity, requests):
    freq, store, hits = Counter(), set(), 0
    for key in requests:
        if key in store:
            hits += 1
        elif len(store) >= capacity:
            store.discard(min(store, key=lambda k: freq[k]))
            store.add(key)
        else:
            store.add(key)
        freq[key] += 1
    return hits

def clock_hits(capacity, requests):
    frames, referenced, slot_of = [None] * capacity, [False] * capacity, {}
    hand, hits = 0, 0
    for key in requests:
        if key in slot_of:
            hits += 1
            referenced[slot_of[key]] = True
            continue
        while referenced[hand]:                 # spend the second chance
            referenced[hand] = False
            hand = (hand + 1) % capacity
        if frames[hand] is not None:
            del slot_of[frames[hand]]
        frames[hand], referenced[hand], slot_of[key] = key, False, hand
        hand = (hand + 1) % capacity
    return hits

rnd = random.Random(0)
requests = []
for _ in range(20_000):
    if rnd.random() < 0.8:
        requests.append(rnd.randrange(50))            # a small hot set
    else:
        requests.append(100 + rnd.randrange(5_000))   # scanning noise

print(f"{'capacity':>9} {'LRU':>7} {'LFU':>7} {'CLOCK':>7}")
for cap in (50, 100, 500):
    print(f"{cap:>9} {lru_hits(cap, requests):>7} {lfu_hits(cap, requests):>7} "
          f"{clock_hits(cap, requests):>7}")

cycle = [i % 4 for i in range(40)]        # 4 keys, capacity 3
print(f"\ncyclic scan, capacity 3: LRU {lru_hits(3, cycle)}, "
      f"LFU {lfu_hits(3, cycle)}, CLOCK {clock_hits(3, cycle)}")
```

Two results are worth arguing about.

**At capacity 50, LFU gets 15,615 hits and LRU gets 11,151.** The workload is 80%
a stable hot set of 50 keys and 20% one-off noise. LRU keeps whatever was touched
most recently, so every piece of noise displaces a genuinely hot key. LFU counts
instead of timing, so a key seen once cannot evict a key seen four hundred times.
By capacity 500 the gap has vanished — both fit the hot set with room to spare,
and the policy stops mattering.

**The cyclic scan gets zero hits under LRU and CLOCK.** Four keys, capacity
three, accessed in a loop: every key is evicted immediately before it is needed
again. This is the worst case for recency, it is not contrived — it is what a
sequential table scan looks like to a buffer pool — and it is why Postgres uses
a ring buffer for large scans instead of letting them flood `shared_buffers`.

:::pitfall{title="LFU's own failure"}
LFU as written above never forgets. A key that was extremely popular last week
holds its high count forever and cannot be evicted, even though nothing has
touched it since. Real LFU implementations add decay (halve every count
periodically) or a window (TinyLFU keeps a Count-Min Sketch of recent frequencies
— the sketch from Lesson 3, doing exactly this job). Any policy that counts
needs an answer to "counts over what period?"
:::

:::checkpoint{id=cp-policy-choice rubric="LRU loses to scans larger than the cache,LFU loses to shifting popularity without decay,CLOCK approximates LRU without writing on a read hit"}
For each of these, name the policy you would pick and the one you would avoid:
a CDN serving a stable set of popular files; a batch job reading a table once
end to end; a cache read concurrently by 64 threads.
:::

## CLOCK: why your OS does not use LRU

LRU has a problem that has nothing to do with hit rate. Every **read** has to
mutate shared state — the linked list must be spliced to move the entry to the
front. Under concurrency that is a write lock on the hot path of a read-mostly
structure, and it does not scale.

CLOCK removes it. Entries sit in a circular array, each with one **reference
bit**. A hit just sets that bit — a single-byte write to one location, no
ordering to maintain, no lock. On a miss, a hand sweeps forward: a set bit is
cleared and the entry gets a second chance; the first entry found with a clear
bit is evicted.

The result approximates LRU well — recently used entries have their bit set and
survive the sweep — while making reads nearly free. That trade is why CLOCK and
its descendants run every operating system page cache and every database buffer
pool, and pure LRU runs almost none of them.

## A materialized view is a cache

A view is a saved query, re-executed every time. A materialized view stores the
result. Everything you know about caches transfers directly, including the parts
people forget.

```sql runnable id=view-as-cache dataset=package-registry
-- What a nightly materialized view, refreshed on 2024-03-07, would hold,
-- against the live answer three days later.
WITH cached AS (
  SELECT package_id, sum("count") AS total
  FROM downloads
  WHERE day <= DATE '2024-03-07'          -- the world as of the last refresh
  GROUP BY package_id
), live AS (
  SELECT package_id, sum("count") AS total FROM downloads GROUP BY package_id
)
SELECT p.name,
       cached.total AS cached_total,
       live.total   AS live_total,
       live.total - cached.total AS drift,
       round(100.0 * (live.total - cached.total) / live.total, 1) AS drift_pct
FROM live JOIN cached USING (package_id) JOIN packages p ON p.id = live.package_id
ORDER BY drift DESC
LIMIT 5;
```

Every row is about 30% low. Nobody reading a dashboard sees a "stale" badge —
they see a number, and they make a decision with it. The staleness is invisible
at the point of use, which is what makes it dangerous rather than merely
imprecise.

The four questions to ask about any materialized view, and they are the cache
questions in different clothes:

| Cache question | Materialized-view question |
| --- | --- |
| What is the hit rate? | What fraction of queries the view can answer |
| What does a miss cost? | The full aggregation over the base tables |
| What is the eviction policy? | The refresh schedule — and what invalidates it |
| Can an entry be stale? | How old the answer may be before anyone notices |

The last row is the one with no cache analogue in memory, because an in-memory
cache of exact answers is either present or absent. A materialized view can be
**present and wrong**, which is a strictly worse failure mode and the reason
incremental view maintenance is a serious area rather than a convenience.

::::track{depth=interview}
## "Design an LRU cache" and what comes after

The implementation is the warm-up, and interviewers expect it fast: hash map
from key to node, doubly-linked list for order, $O(1)$ on both operations. In
Python, say that a dict already gives you insertion order and `pop`-then-reinsert
is the move-to-end — then say what you would use in a language where it does not.

The real questions come next, and they are about the parts above.

**"What if the cache is read by many threads?"** Every LRU read is a write to
the shared list, so a single lock serialises all reads. Name CLOCK: a reference
bit per entry, set on hit, swept on miss — reads stop mutating shared order.
That answer separates people who have implemented a cache from people who have
read about one.

**"What if a scan blows the cache away?"** Two standard answers: **segmented
LRU**, where an entry must be touched twice before it is promoted out of a small
probationary segment, so a one-off scan never reaches the protected area; or a
dedicated ring buffer for the scan, which is what Postgres does.

**"How do you size it?"** Not by hit-rate target. Plot hit rate against
capacity — it is concave with a knee — and multiply the marginal hit rate by the
*cost of a miss*, which is not uniform across keys. The sentence to have ready:
*"I'd size it where the marginal hit is no longer worth the marginal memory, and
I'd weight hits by what a miss actually costs, because caching cheap queries at
95% can be worth less than caching expensive ones at 60%."*

:::interview{title="The question behind the question"}
"How do you know your cache is helping?" wants you to say **hit rate is a
diagnostic, not an objective**. The objective is latency or load removed. A team
that reports 92% hit rate and cannot say what the misses cost has not measured
the thing that matters — and a cache whose hits are all on queries that were
already fast is pure overhead.
:::
::::

:::exercise{ref=lru-cache-eviction}
:::

:::exercise{ref=clock-eviction}
:::

:::quiz{id=quiz-l07 passing=2}
- id: q1
  prompt: "Why is a list-based LRU (remove the key, append it) not O(1)?"
  options:
    - "Appending to a list is amortised, so occasional resizes dominate."
    - "`list.remove` scans to find the key and `list.pop(0)` shifts every element, so both are linear in the cache size."
    - "Because dict lookups inside the loop are O(log n)."
    - "It is O(1); the slowdown comes from Python's interpreter overhead."
  answerIndex: 1
  explanation: >-
    Both operations are linear in the number of cached keys, and they run on
    every access — so making the cache bigger makes each hit slower. The fix is
    a hash map plus a doubly-linked list, which Python's insertion-ordered dict
    already provides via pop-and-reinsert.
- id: q2
  prompt: "A workload is 80% a stable hot set and 20% one-off keys. Capacity is barely larger than the hot set. Which policy does best, and why?"
  options:
    - "LRU, because the hot keys are the most recently used."
    - "LFU, because a key seen once cannot evict a key seen hundreds of times, while under LRU every one-off displaces something hot."
    - "CLOCK, because the reference bits protect the hot set exactly."
    - "All three are equivalent at this capacity."
  answerIndex: 1
  explanation: >-
    Recency treats a one-off key as maximally valuable the instant it arrives, so
    each piece of noise costs a hot entry. Frequency does not. In the lesson's
    measurement LFU gets 15,615 hits against LRU's 11,151 at capacity 50 — and
    the gap closes to nothing at capacity 500, where everything fits and the
    policy stops mattering.
- id: q3
  prompt: "What can a materialized view do that an in-memory cache of exact answers cannot?"
  options:
    - "Answer a query the base tables cannot."
    - "Return a wrong answer — it can be present and stale, where a cache entry is either present and correct or absent."
    - "Survive a process restart."
    - "Be shared between users."
  answerIndex: 1
  explanation: >-
    A cache of exact results has one failure mode: a miss, which costs time. A
    materialized view refreshed on a schedule holds the answer as of its last
    refresh, and nothing at the point of use says so. That is why refresh
    strategy and staleness tolerance are product decisions rather than
    implementation details, and why incremental view maintenance exists.
:::
