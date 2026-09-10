---
id: t2/s05/l02
title: Two keys, one slot
tier: t2-core-structures
stage: s05-hashing-and-aggregation
status: published
estimatedMinutes: 45
objectives:
  - Describe separate chaining and open addressing, and say what each one spends and saves.
  - Explain primary clustering as a feedback loop, not just as "runs form".
  - Distinguish primary from secondary clustering, and say which probe sequence fixes which.
  - Use the load factor to predict average probe counts, and check the prediction by measurement.
prerequisites:
  - t2/s05/l01
misconceptions:
  - "**\"Quadratic probing eliminates clustering.\"** It eliminates *primary* clustering — the merging of runs belonging to different home slots. Two keys with the same home slot still walk the identical probe sequence, which is *secondary* clustering. Only double hashing, where the step size depends on the key, breaks that."
  - "**\"Long runs mean the hash function is bad.\"** Runs are a function of the load factor. At $\\alpha = 0.9$ a perfectly uniform hash still produces runs of over a hundred slots in a 1024-slot table, because the probability a run grows is proportional to its current length. Replacing the hash function will not help; resizing will."
  - "**\"Chaining is slower because it chases pointers.\"** True at low load, and false at high load. Open addressing's cost curve has a pole at $\\alpha = 1$; chaining's is a straight line. Past about $\\alpha = 0.9$ chaining wins, and chaining is the only one of the two that can hold more entries than it has slots."
  - "**\"A probe sequence just needs to be scattered.\"** It also has to be a permutation of all $m$ slots, or an insert can fail into a table that still has room. With a power-of-two table, a double-hashing step must be odd; with quadratic probing, the constants have to be chosen so the sequence covers the table."
masteryChecklist:
  - I can say why a run of length L is L+1 times more likely to grow than an empty slot is to start a run.
  - I can name the probe sequence for linear, quadratic and double hashing, and the constraint each one places on the table size.
  - Given a load factor, I can state roughly how many probes a successful lookup costs under linear probing.
  - I can name one workload where chaining is the right answer and say why.
runtimes:
  - engine: python
---

Two keys hash to the same slot. Everything else in this stage follows from what
you do next, and there are exactly two families of answers: put the second key
somewhere *else in the same array*, or put it somewhere *outside the array*.

## Separate chaining: the bucket is a list

Each slot holds a container — a list, a small vector, a linked list — and
colliding keys go into the same container.

```python runnable id=chaining-sketch
slots = [[] for _ in range(8)]

for name in ("arrowkit", "bitmask", "chunker", "dagrun", "edgecase", "fanout"):
    slots[hash(name) % 8].append(name)

for i, bucket in enumerate(slots):
    print(i, bucket)
```

Lookup hashes to a slot and then scans that slot's list, comparing keys with
`==`. Cost is 1 plus the length of the chain, and by the bound from the last
lesson the expected chain length is $1 + \alpha$ where $\alpha = n/m$.

What chaining gives you is that $\alpha$ can exceed 1. A table with 8 slots can
hold 8,000 entries; it just gets slow linearly, with no cliff. Deleting is
trivial — unlink the node, done — which is a bigger deal than it sounds, and is
the subject of the next lesson. What it costs is one allocation per entry and a
pointer dereference that will miss the cache, plus the memory overhead of the
container itself. In CPython a list object is 56 bytes before it holds anything.

## Open addressing: everything lives in the array

One array, one entry per slot. On collision you probe: try another slot,
according to a rule that depends only on the key, until you find an empty one.

$$\text{slot}_i(k) = \big(h(k) + f(k, i)\big) \bmod m, \qquad i = 0, 1, 2, \ldots$$

Three choices of $f$ dominate.

| Scheme | $f(k, i)$ | Constraint | Failure mode |
| --- | --- | --- | --- |
| Linear probing | $i$ | none | primary clustering |
| Quadratic probing | $c_1 i + c_2 i^2$ | constants must cover the table | secondary clustering |
| Double hashing | $i \cdot h_2(k)$ | $h_2(k)$ coprime with $m$ | two hashes per lookup |

The lookup rule is the same for all three, and it is the rule that makes the
next lesson hard: walk the probe sequence, and **stop at the first empty slot**,
because an empty slot proves the key was never inserted.

## Primary clustering is a feedback loop

Linear probing looks harmless. It has the best cache behaviour of anything here
— slot $i+1$ is the next word in memory — and for that reason it is what fast
production tables actually use. But it has a specific pathology, and the reason
is worth stating precisely, because "runs form" is not an explanation.

Consider a contiguous run of $L$ occupied slots. A new key joins that run if its
home slot is any of the $L$ occupied slots *or* the empty slot immediately
after: $L+1$ of the $m$ home slots. An isolated empty slot starts a run only if
a key hashes exactly to it: 1 chance in $m$.

So the probability a run grows is proportional to its current length. Long runs
attract more keys, which makes them longer, which makes them attract more.
Runs also *merge*: fill the single gap between two runs of length 40 and you
have one run of 81. That is primary clustering, and it is why linear probing's
cost blows up faster than the load factor alone would suggest.

```python runnable id=probe-costs
import random

M = 1024

def h2(key):
    # An odd step is coprime with a power-of-two table, so the sequence
    # visits every slot before repeating.
    return ((key // M) % (M // 2)) * 2 + 1

linear = lambda key, i: i
double = lambda key, i: i * h2(key)

def fill(strategy, n, keys):
    slots = [None] * M
    probes = 0
    for key in keys[:n]:
        i = 0
        while True:
            idx = (key + strategy(key, i)) % M
            if slots[idx] is None:
                slots[idx] = key
                probes += i + 1
                break
            i += 1
    longest = current = 0
    for slot in slots:
        current = current + 1 if slot is not None else 0
        longest = max(longest, current)
    return probes / n, longest

random.seed(11)
keys = random.sample(range(10 ** 7), M)

print(f"{'load':>5} {'linear':>8} {'double':>8} {'theory':>8}   longest run")
for alpha in (0.5, 0.7, 0.8, 0.9, 0.95):
    n = int(M * alpha)
    lin, lin_run = fill(linear, n, keys)
    dbl, dbl_run = fill(double, n, keys)
    theory = 0.5 * (1 + 1 / (1 - alpha))
    print(f"{alpha:>5.2f} {lin:>8.2f} {dbl:>8.2f} {theory:>8.2f}   {lin_run} / {dbl_run}")
```

Read the last column first. At $\alpha = 0.5$ the longest linear run is 16
slots. At $\alpha = 0.95$ it is 427 — nearly half the table is one unbroken run.
Double hashing at the same load tops out around 80, and its average probe count
is 3.09 against linear's 8.72.

The `theory` column is Knuth's estimate for the average number of probes in a
*successful* lookup under linear probing,

$$\frac{1}{2}\left(1 + \frac{1}{1 - \alpha}\right),$$

which tracks the measurement closely up to $\alpha = 0.9$ and then over-predicts,
because the derivation assumes an infinite table and 1024 slots is not infinite.
The corresponding figure for an *unsuccessful* lookup is much worse —

$$\frac{1}{2}\left(1 + \frac{1}{(1 - \alpha)^2}\right),$$

which is 50.5 probes at $\alpha = 0.9$ against 10 for an idealised uniform
probe sequence. Failed lookups are where clustering hurts most, and failed
lookups are what every insert performs first.

:::insight{title="The number that actually controls everything"}
Every formula on this page is a function of $\alpha$ alone. Not $n$, not $m$ —
their ratio. A hash table with a million entries and a two-million-slot array
behaves exactly like one with ten entries and twenty slots. That is why the next
lesson but one is about the resize policy: choosing when to grow *is* choosing
your table's performance, and there is nothing else to tune.
:::

:::checkpoint{id=cp-clustering rubric="a run of length L captures L+1 home slots,so growth probability is proportional to length,runs merge when the gap between them fills"}
State the feedback loop behind primary clustering in one sentence, and then say
why quadratic probing interrupts it but does not remove all clustering.
:::

## Quadratic and double hashing

Quadratic probing sends consecutive probes to slots that spread apart:
$h(k), h(k)+1, h(k)+3, h(k)+6, \ldots$ using $f(k,i) = i(i+1)/2$. Two keys whose
home slots differ by one now diverge immediately, so runs belonging to different
home slots stop merging. Primary clustering is gone.

Secondary clustering is not. Every key with home slot 17 walks the identical
sequence, because $f$ does not depend on the key. If ten keys collide at 17,
the tenth one probes nine occupied slots on the way in, in exactly the order the
first nine used.

Double hashing fixes that by making the step size a function of the key:
$f(k, i) = i \cdot h_2(k)$. Two keys with the same home slot now take different
strides, so they diverge after the first probe. The constraint is that
$h_2(k)$ must be coprime with $m$ or the sequence walks a subgroup and misses
slots. The usual arrangements are: make $m$ prime and $h_2(k) \in \{1, \ldots, m-1\}$,
or make $m$ a power of two and force $h_2(k)$ odd — the trick in the code above.

:::pitfall{title="The insert that fails into a table with room"}
If the probe sequence is not a permutation of all $m$ slots, an insert can run
out of sequence while empty slots remain. With $m = 8$ and $f(k,i) = i^2$, the
offsets cycle through $0, 1, 4, 1, 0, 1, 4, 1, \ldots$ — three distinct slots
out of eight. Five of the eight are unreachable from any given home slot, so an
insert can report "table full" at $\alpha = 0.4$, and the fix is a constraint on the
constants, not a bigger table.
:::

## Choosing

| | Separate chaining | Open addressing |
| --- | --- | --- |
| Load factor | can exceed 1 | must stay below 1 |
| Cost at $\alpha = 0.9$ | ~1.9 comparisons | ~5.5 probes (linear) |
| Cost at $\alpha = 0.99$ | ~2 comparisons | ~50 probes (linear) |
| Memory per entry | node + pointer | one array slot |
| Cache behaviour | pointer chase | sequential |
| Deletion | unlink; trivial | hard — see the next lesson |

Chaining wins when entries are large, when the load factor is unpredictable or
unbounded, or when deletion is frequent. Open addressing wins when entries are
small and the table is kept below about two-thirds full — which is why every
fast general-purpose hash map written in the last fifteen years is
open-addressed, and every one of them has a resize policy that keeps $\alpha$
away from the cliff.

::::track{depth=systems}
## What fast hash maps actually do

The table above says linear probing degrades worst. Production hash maps use it
anyway. Understanding why is a lesson in how far asymptotic analysis is from a
memory hierarchy.

**A probe is not a memory access.** A cache line is 64 bytes. Slots $i$ through
$i+7$ of an array of 8-byte entries are in the same cache line, so eight linear
probes cost one memory access — the same as one. Double hashing's stride sends
each probe to a different line, so its "better" probe count of 2.55 against
5.22 is, in cache misses, roughly 2.55 against 1. Linear probing wins the
comparison that matters, provided the run does not get long.

**Abseil's `flat_hash_map` and Rust's `hashbrown`** — the SwissTable design —
keep the trick and remove the failure mode. Each slot gets one byte of metadata:
a control byte holding 7 bits of the key's hash, plus states for empty and
deleted. The metadata for 16 slots is 16 bytes, which fits one SSE register, so
a single SIMD instruction compares 16 slots' worth of hash fragments at once and
returns a bitmask of candidates. A lookup usually touches one metadata group and
one entry. The 7 stored bits also mean a mismatched candidate is rejected
without dereferencing the key, so a lookup that misses typically performs zero
key comparisons.

**Robin Hood hashing** attacks the variance instead. On insert, if the key being
placed has probed further from its home slot than the key currently occupying
the slot, they swap: the "rich" key gives up its position to the "poor" one and
continues probing. Total displacement is unchanged, but it is distributed
evenly, so the *maximum* probe length collapses even though the mean does not
move. That turns the tail latency of a lookup from unpredictable into nearly
flat, which is what a database or an allocator cares about. It also enables an
early exit: if you reach a slot whose occupant is closer to home than you are,
your key cannot be further along, so the lookup can stop.

:::note{title="Which one is in your interpreter"}
CPython's dict is open-addressed with neither of these. Its probe sequence
mixes in the high bits of the hash on each step, which behaves like double
hashing without a second hash function, and its compact layout means a probe
touches a small index array rather than the entries themselves. That is the
subject of Lesson 4.
:::
::::

:::exercise{ref=chained-map}
:::

:::exercise{ref=longest-cluster}
:::

:::quiz{id=quiz-l02 passing=3}
- id: q1
  prompt: "Why does a long run of occupied slots grow faster than a short one under linear probing?"
  options:
    - "Because the hash function stops being uniform once slots fill up."
    - "Because a run of length L is entered by a key hashing to any of L+1 home slots, so growth probability scales with length."
    - "Because keys inserted later have larger hash values."
    - "It does not — every empty slot is equally likely to be filled next."
  answerIndex: 1
  explanation: >-
    A key joins an existing run if its home slot is anywhere inside the run or
    at the empty slot just past it — L+1 of m possibilities — while an isolated
    empty slot is claimed only by a key hashing exactly to it. That asymmetry is
    the entire mechanism; the hash function stays perfectly uniform throughout.
- id: q2
  prompt: "Quadratic probing is used instead of linear probing. What kind of clustering remains?"
  options:
    - "None; quadratic probing removes clustering entirely."
    - "Primary clustering, because runs still merge."
    - "Secondary clustering: keys sharing a home slot still follow the same probe sequence."
    - "Cache clustering, because probes land on the same cache line."
    - "Only clustering caused by a poor hash function."
  answerIndex: 2
  explanation: >-
    The offset f(k, i) depends on i but not on k, so every key that hashes to
    slot 17 walks the identical path. Different home slots no longer collide
    with each other (primary clustering is gone), but colliding keys still queue
    behind one another. Making the step size depend on the key — double hashing
    — is what breaks that.
- id: q3
  prompt: "A double-hashing table has m = 1024 and a step function that can return 8. What goes wrong?"
  options:
    - "Nothing; any nonzero step works."
    - "gcd(8, 1024) = 8, so the probe sequence visits only 128 of the 1024 slots and an insert can fail while 87% of the table is empty."
    - "The step is too small, so it degenerates into linear probing."
    - "8 is not a prime, so the hash is no longer universal."
  answerIndex: 1
  explanation: >-
    The probe sequence h(k) + i·s (mod m) cycles through m / gcd(m, s) distinct
    slots. With s = 8 and m = 1024 that is 128 slots. The standard fixes are a
    prime table size, or forcing the step odd when m is a power of two —
    gcd(odd, 2^k) = 1 always.
- id: q4
  prompt: "At load factor 0.99, which structure is faster for lookups, and why?"
  options:
    - "Open addressing, because it avoids pointer chasing."
    - "Chaining: its cost is 1 + α ≈ 2 comparisons, while linear probing's successful-lookup cost approaches 1/2(1 + 1/(1−α)) ≈ 50 probes."
    - "They are identical — load factor affects both the same way."
    - "Open addressing, because chaining's chains all become length 99."
  answerIndex: 1
  explanation: >-
    Chaining's expected chain length is 1 + α, which is linear in the load
    factor and barely moves between 0.5 and 0.99. Open addressing has a pole at
    α = 1 and its cost runs away as the table fills. Option 4 confuses the load
    factor with the chain length: α = 0.99 means about one entry per bucket, not
    99.
:::
