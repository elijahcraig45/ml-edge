---
id: t4/s09/l01
title: Bloom filters, and the value of a one-sided error
tier: t4-scale-systems
stage: s09-probabilistic-structures
status: published
estimatedMinutes: 45
objectives:
  - Build a Bloom filter from a bit array and k hash functions, and explain each design choice.
  - Derive the false-positive rate from the bit array's fill level, and the k that minimises it.
  - Explain why a false negative is structurally impossible, and design a system around that asymmetry.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"A Bloom filter is a compressed set.\"** It stores no elements at all. There is nothing to decompress, and no way to list what is in it. It answers exactly one question — *possibly present* or *definitely absent* — and refuses every other question you might want to ask a set."
  - "**\"More hash functions means fewer false positives.\"** Only up to a point. Each extra hash function makes a lookup stricter, and also sets one more bit per insertion. Past $k=(m/n)\\ln 2$ the second effect wins and the error rate climbs again."
  - "**\"You can delete from a Bloom filter by clearing the bits.\"** Clearing a bit for one element clears it for every element that happened to hash there, and those become false *negatives* — the one error the structure is supposed to be incapable of. Deletion needs a counting Bloom filter, which costs 4 bits per slot instead of 1."
  - "**\"A false positive means the filter is broken.\"** It means the filter is working. The false-positive rate is a parameter you chose when you picked $m$ and $k$, and the whole point is that you get to choose it."
masteryChecklist:
  - Given m bits, n inserted items and k hash functions, I can compute the expected false-positive rate.
  - I can explain, without algebra, why no false negative can ever occur.
  - I can name a system where a false positive costs one extra lookup and a false negative would corrupt the answer.
runtimes:
  - engine: python
---

You have a billion URLs and a question: has this one been crawled? A `set` of a
billion 60-byte URLs is roughly 100 GB of RAM. A Bloom filter answers the same
question in about 1.2 GB, at 1% error — and the error only ever goes one way.
It will occasionally tell you a URL was crawled when it was not. It will
*never* tell you a URL was uncrawled when it was.

That asymmetry is the whole design. Everything else is bookkeeping.

## The construction

Take $m$ bits, all zero. Take $k$ independent hash functions, each mapping an
item to a position in $[0, m)$.

- **Insert `x`**: set the bits at $h_1(x), h_2(x), \dots, h_k(x)$ to 1.
- **Query `x`**: if *all* $k$ of those bits are 1, answer "possibly present".
  If *any* one of them is 0, answer "definitely absent".

Nothing is stored but bits. The item itself is gone the instant you insert it.

```python runnable id=bloom-from-scratch
import hashlib

def positions(item, num_bits, num_hashes):
    """k positions for one item, via one hash split into two halves."""
    digest = hashlib.sha256(str(item).encode()).digest()
    h1 = int.from_bytes(digest[:8], "big")
    h2 = int.from_bytes(digest[8:16], "big") | 1     # odd, so it strides the whole array
    return [(h1 + i * h2) % num_bits for i in range(num_hashes)]

bits = bytearray(64)                                  # tiny on purpose
for pkg in ("arrowkit", "bitmask", "chunker"):
    for p in positions(pkg, 64, 3):
        bits[p] = 1

def probably_contains(item):
    return all(bits[p] for p in positions(item, 64, 3))

for name in ("arrowkit", "chunker", "dagrun", "edgecase", "fanout"):
    print(f"{name:10} -> {probably_contains(name)}")
print("bits set:", sum(bits), "of 64")
```

Three items, nine bit-writes, 64 bits of storage. Run it and read the output
against the truth: `arrowkit` and `chunker` were inserted, the rest were not.

:::insight{title="One hash, k positions"}
Real implementations rarely evaluate $k$ genuinely independent hash functions.
Kirsch and Mitzenmacher proved that $g_i(x) = h_1(x) + i \cdot h_2(x)$ — two
hashes combined linearly — gives the same asymptotic false-positive rate. That
is why the code above computes one SHA-256 and slices it. You pay for one hash
and get $k$.
:::

## Why there are no false negatives

Insertion only ever turns bits **on**. No operation turns a bit off.

So if `x` was inserted, its $k$ bits were set at that moment, and they are still
set now, no matter what else arrived afterwards. The query checks exactly those
$k$ bits and finds them all 1. It answers "possibly present". Always.

There is no probability in that argument. It is not "false negatives are rare".
It is "false negatives cannot occur", and it follows from a one-line property of
the update rule — bits are monotone.

The converse is what costs you. A bit can be 1 because `x` set it, or because
three other items collectively happened to set all $k$ of `x`'s bits. The filter
cannot tell those cases apart, because it did not keep the items.

:::pitfall{title="The deletion trap"}
The monotonicity argument is also a prohibition. The moment you clear a bit to
"remove" an item, every other item that shares that bit starts reporting
*definitely absent* — a false negative, produced by you rather than by chance.
If you need removal, use a **counting Bloom filter**: replace each bit with a
small counter, increment on insert, decrement on delete. That is a 4× space
increase for a capability most workloads do not need.
:::

## What the error rate actually is

Insert $n$ items into $m$ bits with $k$ hashes. Each insertion sets $k$ bits, so
$kn$ bit-writes land on $m$ positions. A specific bit escapes a single write
with probability $1 - 1/m$, and escapes all of them with probability
$(1 - 1/m)^{kn}$. Since $(1-1/m)^m \to e^{-1}$:

$$\Pr[\text{a given bit is still }0] \;\approx\; e^{-kn/m}$$

A false positive needs all $k$ of the queried bits to be 1:

$$p \;\approx\; \left(1 - e^{-kn/m}\right)^{k}$$

Every term is something you control. $n$ is your data, $m$ is your memory
budget, $k$ is a free parameter. Measure it:

```python runnable id=fp-rate-measured
import hashlib, math

def positions(item, m, k):
    d = hashlib.sha256(str(item).encode()).digest()
    h1 = int.from_bytes(d[:8], "big")
    h2 = int.from_bytes(d[8:16], "big") | 1
    return [(h1 + i * h2) % m for i in range(k)]

m, n = 8000, 500
print(f"{'k':>2} {'predicted':>10} {'measured':>10}")
for k in (1, 2, 3, 4, 5, 6, 8, 12, 16, 24):
    bits = bytearray(m)
    for i in range(n):
        for p in positions(f"pkg-{i}", m, k):
            bits[p] = 1
    trials = 20_000
    fp = sum(1 for j in range(trials)
             if all(bits[p] for p in positions(f"absent-{j}", m, k)))
    predicted = (1 - math.exp(-k * n / m)) ** k
    print(f"{k:>2} {predicted:>10.4f} {fp / trials:>10.4f}")
```

The measured column tracks the formula closely, and — the part worth staring at
— the error **falls, bottoms out, and then rises again**. At $k=1$ you barely
check anything. At $k=24$ you have set so many bits that the array is nearly
full and almost every query passes.

## Choosing k

Minimise $p = (1 - e^{-kn/m})^k$ over $k$. Take logs, let $b = m/n$ (bits per
item):

$$\ln p = k \ln\!\left(1 - e^{-k/b}\right)$$

Differentiate and set to zero; the minimum sits where the bit array is exactly
**half full**, which happens at

$$k^{*} = \frac{m}{n}\ln 2 \approx 0.693\, \frac{m}{n}$$

Substituting back gives the design equation you actually use — the memory needed
for a target error rate $p$:

$$m = -\,\frac{n \ln p}{(\ln 2)^{2}} \approx 1.44\, n \log_2 \frac{1}{p}$$

Read that carefully, because it is the surprising part. The bits per item
depend on the error rate and **not on the size of the items**. Ten bits per
element buys you about 1% error whether the elements are 8-byte integers or
2-kilobyte URLs. A `set` pays for the data; a Bloom filter pays for the
*answer*.

:::checkpoint{id=cp-bloom-tradeoff rubric="bits per item depends only on the target error rate,not on how large each item is,so the saving grows with item size"}
Your colleague wants to Bloom-filter a set of 64-bit integers to save memory.
Using the formula above, what do you tell them — and how would your answer
change if the elements were 2 KB URLs?
:::

::::track{depth=proof}
## Deriving the optimal k properly

The heuristic answer — "the array should be half full" — is correct, and here
is why, stated as a theorem rather than as folklore.

:::proof{title="Theorem: the false-positive rate is minimised at k = (m/n) ln 2"}
Write $b = m/n$ and treat $k$ as continuous. The rate is

$$
p(k) = \left(1 - e^{-k/b}\right)^{k}, \qquad
\ln p(k) = k \ln\!\left(1 - e^{-k/b}\right).
$$

Substitute $u = e^{-k/b}$, so $k = -b \ln u$ and

$$\ln p = -b \ln u \, \ln (1 - u).$$

That expression is symmetric under $u \leftrightarrow 1-u$: swapping them
exchanges the two factors. A smooth function symmetric about $u = 1/2$ on
$(0,1)$ has its stationary point there, and $-b\ln u \ln(1-u)$ is negative on
$(0,1)$ with a single interior extremum, so $u = 1/2$ is the minimum of $\ln p$
and therefore of $p$.

Now unwind the substitution. $u$ was $e^{-kn/m}$, which is exactly the
probability that a given bit is still zero. Setting it to $1/2$ says: **half the
bits are zero, half are one.** Solving,

$$
e^{-kn/m} = \tfrac12 \;\Longrightarrow\; \frac{kn}{m} = \ln 2
\;\Longrightarrow\; k^{*} = \frac{m}{n}\ln 2 . \qquad \blacksquare
$$

At that $k$, each of the $k$ bit-checks is an independent coin flip, so
$p = 2^{-k^{*}} = 2^{-(m/n)\ln 2}$. Inverting for $m$:

$$m = -\frac{n \ln p}{(\ln 2)^2}.$$

Two consequences worth carrying around. Each bit at the optimum carries exactly
one bit of information — the array is at maximum entropy, which is the
information-theoretic reason you cannot do better with this structure. And the
lower bound for *any* structure answering approximate membership at rate $p$ is
$n \log_2(1/p)$ bits; the Bloom filter's $1.44\, n\log_2(1/p)$ is 44% above
optimal. Cuckoo filters and quotient filters close most of that gap, at the cost
of a more complicated insert.
:::

One caveat the derivation hides: $k$ must be an integer. Rounding
$k^{*}$ either way costs very little, because $p(k)$ is flat near its minimum —
which is why production filters routinely use $k = 7$ for a 1% target and nobody
notices.
::::

::::track{depth=interview}
## Saying it out loud

The recognition trigger is a question of the form **"is this thing already in
the set?"** where the set is too big to hold, and where a *wrong yes* is
recoverable but a *wrong no* is not.

The three canonical examples, in the order interviewers ask them:

1. **A cache or storage engine.** "Do I have this key on disk?" A false positive
   costs one wasted disk read. A false negative would report a key as missing
   when it exists — data loss. LevelDB and RocksDB put a Bloom filter on every
   SSTable for exactly this reason.
2. **A crawler's seen-URL set.** A false positive skips one page. A false
   negative re-crawls one page. Both survivable, which is why the filter can be
   tuned aggressively here.
3. **A safe-browsing or breached-password check.** A false positive triggers a
   real lookup against the server. A false negative would clear a malicious URL.

The sentence to have ready: *"I'd use a Bloom filter as a front door — it
answers 'definitely not here' cheaply, and every 'maybe' falls through to the
real lookup. It's about ten bits per element for 1% error, and the errors are
one-sided, so the fallback path is always correct."*

:::interview{title="The follow-up"}
"What if the set grows past what you sized for?" The error rate degrades
smoothly and irreversibly — you cannot resize a Bloom filter in place, because
the bits do not remember which items set them. The production answer is a
**scalable Bloom filter**: a chain of filters with geometrically increasing size
and decreasing error, queried in sequence. Say that, and say the cost: query
time now grows with the number of chained filters.
:::
::::

:::exercise{ref=bloom-filter}
:::

:::exercise{ref=bloom-sizing}
:::

:::quiz{id=quiz-l01 passing=2}
- id: q1
  prompt: "A Bloom filter reports that key `k` is present. What do you know?"
  options:
    - "`k` was definitely inserted."
    - "`k` was probably inserted; the filter may be reporting a collision of other items' bits."
    - "`k` was inserted, unless a delete removed it."
    - "Nothing — the answer is a coin flip."
  answerIndex: 1
  explanation: >-
    All k of k's bits are set, but they could have been set by other items. The
    answer is "possibly present", with a probability you chose when you sized
    the filter. It is not a coin flip: at 10 bits per item the false-positive
    rate is about 1%. And a standard Bloom filter has no delete at all — the
    third option describes a bug people introduce by clearing bits.
- id: q2
  prompt: "You double m (the bit array) and keep n and k the same. What happens to the false-positive rate?"
  options:
    - "It halves exactly."
    - "It drops sharply, but k is now below optimal, so you are leaving accuracy on the table."
    - "It is unchanged, because k did not change."
    - "It rises, because there are more bits that could collide."
  answerIndex: 1
  explanation: >-
    p = (1 - e^{-kn/m})^k falls when m grows, but not by a clean factor of two.
    And the optimum k* = (m/n) ln 2 has also doubled, so the old k now
    under-checks: you would get a lower rate still by raising k to match.
- id: q3
  prompt: "Why can't you delete an item by clearing its k bits?"
  options:
    - "Because you no longer know which bits the item set."
    - "Because clearing a shared bit makes every other item that hashed there report 'definitely absent' — a false negative."
    - "Because bit arrays are immutable in most languages."
    - "Because the false-positive rate would rise above the target."
  answerIndex: 1
  explanation: >-
    You do know which bits the item set — recompute the hashes. The problem is
    that bits are shared. Clearing one breaks the monotonicity property that
    guarantees no false negatives, which is the only guarantee the structure
    offers. Counting Bloom filters fix this with per-slot counters.
:::
