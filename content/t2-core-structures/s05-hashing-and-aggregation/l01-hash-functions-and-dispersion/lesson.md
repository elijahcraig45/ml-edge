---
id: t2/s05/l01
title: Hash functions, or position you can compute
tier: t2-core-structures
stage: s05-hashing-and-aggregation
status: published
estimatedMinutes: 45
objectives:
  - State the three things a hash function must do, and why "avoid collisions" is not one of them.
  - Show why a hash that ignores character position destroys the dispersion you were paying for.
  - Define a universal family of hash functions and say what randomising the choice buys you.
  - Read a bucket-load histogram and tell an unlucky distribution apart from a broken hash function.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"A good hash function is one that avoids collisions.\"** Collisions are guaranteed. You are mapping an unbounded universe of keys into $m$ slots, so by pigeonhole some slot takes at least $|U|/m$ keys. A good hash function makes collisions *unrelated to the structure of your data* — it cannot make them go away."
  - "**\"`hash()` is a checksum, so it is basically secure.\"** Python's `hash` is SipHash-1-3 with a per-process key, which is enough to stop an attacker who can only submit keys and observe timing. It is not a message digest, it is not collision-resistant against someone who knows the key, and it must never be used where you meant `hashlib`."
  - "**\"`hash('arrowkit')` gives the same number every time.\"** Not across processes. Since Python 3.3 the string hash is randomised at interpreter start-up, so the bucket a key lands in changes between runs. Any code that persists a `hash()` value to disk or shards on it is broken and will only look correct until the next restart."
  - "**\"Equal hashes mean equal keys.\"** A hash is a lossy summary. Every table has to compare keys with `==` after the hash points at a slot; skipping that comparison is how you return the wrong row."
masteryChecklist:
  - I can explain why an additive character hash puts every anagram in the same bucket, and why that matters for version strings.
  - I can write down a universal family and state the probability bound it guarantees.
  - Given a bucket histogram with one bucket empty and one holding five keys, I can say whether the hash function is at fault.
  - I can say what `hash(7)` returns in CPython and why that is a hazard with a power-of-two table.
runtimes:
  - engine: python
  - engine: duckdb
    datasetId: package-registry
---

A set answers "have I seen this?" without looking at anything. That is only
possible because it can compute *where* a key would be from the key itself. The
function that does the computing is the whole trick, and it is the only part of
a hash table you can get wrong in a way that no test will catch until
production.

## What the function has to do

Three things, and only three.

1. **Deterministic** — within one process, the same key must always produce the
   same number. Otherwise you cannot find what you stored.
2. **Cheap** — it runs on every lookup. A hash that costs more than the scan it
   replaced is a pessimisation.
3. **Dispersing** — keys that are *related* in your data must not be related in
   the output. This is the one people get wrong.

Notice what is not on the list. "Never collides" is impossible: you are mapping
strings of any length into $m$ slots, and there are more strings than slots.
Pigeonhole says some slot gets at least $|U| / m$ keys and no cleverness
changes that. The job is not to prevent collisions. The job is to make sure the
collisions you get have nothing to do with why your keys resemble each other.

## The failure, in one screenful

Here is the hash function everybody writes first — add up the character codes —
against a polynomial hash, on a set of keys with the structure real release
tags have.

```python runnable id=additive-vs-polynomial
def additive(text):
    return sum(ord(ch) for ch in text)

def polynomial(text):
    h = 0
    for ch in text:
        h = (h * 131 + ord(ch)) % (2**61 - 1)
    return h

tags = [f"{a}.{b}.{c}" for a in range(4) for b in range(4) for c in range(4)]
print(len(tags), "release tags, 16 buckets")

for label, fn in (("additive", additive), ("polynomial", polynomial)):
    buckets = [0] * 16
    for tag in tags:
        buckets[fn(tag) % 16] += 1
    print(f"{label:11} {buckets}")
    print(f"{'':11} max load {max(buckets)}, empty buckets {buckets.count(0)}")

print()
print("additive('1.0.2') ==", additive("1.0.2"), " additive('2.0.1') ==", additive("2.0.1"))
```

The additive hash puts 12 keys in its worst bucket and leaves 6 buckets
completely empty. The polynomial hash tops out at 6 and leaves none empty.

The reason is visible in the last line. Addition is commutative, so `additive`
cannot tell `1.0.2` from `2.0.1` — it sees a multiset of characters, not a
string. Every permutation of the same characters is one key as far as it is
concerned. Version numbers, IP addresses, SKUs, dates written as text: all of
them are short strings drawn from a tiny alphabet, differing mostly by
*position*. An additive hash throws away exactly the information that
distinguishes them.

The polynomial hash multiplies the accumulator by 131 before adding each
character, so the $i$-th character from the right contributes $c_i \cdot
131^{i}$. Position now changes the value. That is the entire fix, and it is
why nearly every string hash in the wild is a multiply-and-add loop.

:::pitfall{title="The bug this produces in real code"}
Nobody writes `additive` on purpose. They write `hash(tuple(sorted(parts)))`
because sorting "normalises" the key, or they XOR field hashes together to
combine them — and XOR, like addition, is commutative. A record hash built by
XOR-ing its column hashes gives `(first="ada", last="lovelace")` and
`(first="lovelace", last="ada")` the same slot.
:::

## What CPython actually gives you

```python runnable id=cpython-hash
import sys

print("hash(7)      =", hash(7))
print("hash(-1)     =", hash(-1))
print("hash(2**61)  =", hash(2**61))
print("str algorithm:", sys.hash_info.algorithm, "| modulus:", sys.hash_info.modulus)
print()
print("ten multiples of 8, into 8 buckets:", [hash(8 * i) % 8 for i in range(10)])
```

Two facts worth carrying around.

`hash(n) == n` for small integers. CPython's integer hash is $n \bmod (2^{61}-1)$,
which is the identity below that bound. It is not an oversight — it is free, and
it makes the hash of an integer exact rather than lossy. But it means integer
keys arrive at the table with all of their original structure intact, and a
power-of-two table takes the low bits. Ten multiples of 8, into 8 buckets, all
land in bucket 0. Every table that indexes by `hash(key) % 2**k` needs a mixing
step; the next lesson is where you will see CPython's.

`hash(-1) == -2`. The C API uses `-1` as its error return, so the one hash value
that cannot be produced is `-1`, and it is remapped. It is trivia until the day
you write a table whose sentinel is `-1`.

And `sys.hash_info.algorithm` names a SipHash variant — `siphash13` on recent
builds, `siphash24` on older ones. String hashing is keyed with a per-process
random seed, which means it is a *randomly chosen member of a family* — the idea
the rest of this lesson is about.

:::checkpoint{id=cp-dispersion rubric="collisions cannot be avoided,the hash must not preserve the structure of the keys,additive and XOR ignore position"}
A colleague proposes hashing a package record by XOR-ing the hashes of its
name, language and license. Name one input pair that collides, and say what
property of XOR causes it.
:::

## Nobody's hash function is good for everybody's keys

Fix any hash function $h$ and publish it. Now I get to choose the keys. I run
your $h$ over candidate keys until I have found ten thousand that all map to
bucket 0, and I send them to your web server. Your $O(1)$ lookup is now a linear
scan of ten thousand entries, on every request. This is not hypothetical: it is
the hash-collision denial-of-service family disclosed at 28C3 in December 2011
(CVE-2012-1150 for CPython, with equivalents in Ruby, PHP, Java and Node), and
it is why Python randomises string hashing at all.

The escape is to stop having *a* hash function.

> A family $H$ of functions from $U$ to $\{0, \ldots, m-1\}$ is **universal** if
> for every pair of distinct keys $x \ne y$,
> $$\Pr_{h \in H}\left[h(x) = h(y)\right] \le \frac{1}{m},$$
> where the probability is over the choice of $h$ from $H$, *not* over the keys.

Read the quantifiers carefully, because they are the whole point. The bound
holds for **every** pair of keys, including the worst pair an adversary can
find. It is the *function* that is random, not the data. So there is no
"bad input" any more — there is only a bad draw, and you get a fresh draw each
time the process starts.

This is what "expected $O(1)$" means when someone says it about a hash table. It
is not "$O(1)$ if your data is nicely distributed." It is "$O(1)$ in expectation
over our own coin flips, for any data at all."

## The engine does this too

DuckDB has a `hash()` function, and it is the same object: a mapping from values
to a 64-bit integer that a table then reduces modulo the number of buckets.

```sql runnable id=sql-hash-buckets dataset=package-registry
SELECT hash(name) % 8 AS bucket, count(*) AS packages
FROM packages
GROUP BY bucket
ORDER BY bucket;
```

Twenty packages into eight buckets. You get seven rows, not eight — one bucket
is empty — and the largest bucket holds five packages against an average of
2.5.

That is not a broken hash function. That is what throwing 20 balls into 8 bins
looks like. The expected number of empty bins is $8(1 - 1/8)^{20} \approx 0.55$,
so seeing one empty is entirely ordinary, and the maximum load of a random
assignment is much larger than the average whenever the number of balls is small
relative to $n \log n$. Learning to tell "unlucky" from "broken" is most of what
a bucket histogram is for, and the first exercise makes you draw one.

:::insight{title="The SQL counterpart, named"}
`GROUP BY` is a hash table. The engine hashes each group key, drops the row into
a bucket, and merges. `hash()` is the same function the planner uses to decide
which partition a row belongs to in a partitioned join. Everything you learn
about dispersion here reappears in Lesson 6 as a query that runs for forty
minutes because one key got 25% of the rows.
:::

::::track{depth=proof}
## Why $h_{a,b}(x) = ((ax + b) \bmod p) \bmod m$ is universal

The definition above is a promise. Here is a family that keeps it, with the
derivation, because "pick a random hash function" is useless advice unless you
can name one.

Let $p$ be a prime larger than every key, let $m < p$ be the table size, and for
$a \in \{1, \ldots, p-1\}$ and $b \in \{0, \ldots, p-1\}$ define

$$h_{a,b}(x) = \big((a x + b) \bmod p\big) \bmod m .$$

There are $p(p-1)$ functions in the family. Draw one uniformly.

**Step 1 — the inner map never collides.** Fix $x \ne y$ and write
$r = (ax+b) \bmod p$, $s = (ay+b) \bmod p$. Then

$$r - s \equiv a(x - y) \pmod p .$$

Since $p$ is prime, $a \not\equiv 0$ and $x - y \not\equiv 0$, the product
$a(x-y)$ is a product of two nonzero elements of the field $\mathbb{Z}_p$, so it
is nonzero. Therefore $r \ne s$ always. Whatever collisions we get come entirely
from the second `mod m`.

**Step 2 — $(r, s)$ is uniform over ordered pairs of distinct residues.** Go
backwards: given any $r \ne s$, the system

$$ax + b \equiv r, \qquad ay + b \equiv s \pmod p$$

has exactly one solution, namely $a = (r - s)(x - y)^{-1} \bmod p$ and
$b = (r - ax) \bmod p$ — the inverse exists because $\mathbb{Z}_p$ is a field,
and $a \ne 0$ because $r \ne s$. So $(a,b) \mapsto (r,s)$ is a bijection between
the $p(p-1)$ function choices and the $p(p-1)$ ordered pairs with $r \ne s$.
A uniform draw of $(a,b)$ is a uniform draw of $(r,s)$.

**Step 3 — count the pairs that survive `mod m`.** We collide exactly when
$r \equiv s \pmod m$. Fix $r$. The residues in $\{0, \ldots, p-1\}$ congruent to
$r$ modulo $m$ number at most $\lceil p/m \rceil$, and one of them is $r$ itself,
which is excluded. So at most $\lceil p/m \rceil - 1$ values of $s$ collide with
this $r$. And

$$\left\lceil \frac{p}{m} \right\rceil - 1 \le \frac{p + m - 1}{m} - 1 = \frac{p - 1}{m}.$$

**Step 4 — divide.** Of the $p-1$ equally likely values of $s$ given $r$, at
most $(p-1)/m$ collide, so

$$\Pr_{a,b}\left[h_{a,b}(x) = h_{a,b}(y)\right] \le \frac{(p-1)/m}{p-1} = \frac{1}{m}. \qquad \blacksquare$$

### What the bound buys

Let $C_x$ be the number of the other $n-1$ keys that collide with $x$. By
linearity of expectation, summing the pairwise bound over those keys,

$$\mathbb{E}[C_x] = \sum_{y \ne x} \Pr[h(x) = h(y)] \le \frac{n-1}{m} < \alpha,$$

where $\alpha = n/m$ is the load factor. So the expected number of keys you have
to compare against during a lookup is at most $1 + \alpha$ — and this holds for
**every** key set, not just for nicely spread ones. That inequality is the
foundation the next two lessons build on, and it is why the load factor, not the
size of the table, is the number you watch.

:::proof{title="What universality does not give you"}
The bound is on the *expected* chain length, and expectation is not a promise
about the worst chain. Even with a perfectly random hash and $n = m$, the
longest chain is $\Theta(\log n / \log \log n)$ with high probability — the
classic balls-and-bins result. Average $O(1)$ and worst-case $O(\log n / \log\log n)$
coexist. If you need a bound on the maximum rather than the mean, you need a
different structure: two independent hash functions and "place in the emptier
bucket" drops the maximum to $\Theta(\log \log n)$, which is the power-of-two-choices
result, and is why load balancers sample two backends instead of one.
:::
::::

::::track{depth=systems}
## The hashing trick, and the bias it hides

Machine-learning pipelines use hash functions for something other than lookup:
dimensionality reduction. A text model has an unbounded vocabulary — every new
user string is a new feature — and you cannot build a weight vector for a
vocabulary you have not seen. So you stop maintaining one:

```
index = hash(feature_name) % 2**20
```

There is no dictionary from feature name to column. There is no vocabulary file
to ship, no train/serve skew from a stale mapping, and adding a new feature
costs nothing. `HashingVectorizer` in scikit-learn and the `hashed_column`
family in TensorFlow both do exactly this.

What you pay is that two features that collide become one column, and the model
cannot tell them apart. Their weights are summed. With $n = 10^6$ distinct
features into $m = 2^{20} \approx 1.05 \times 10^6$ buckets, the probability
that a given feature has its bucket to itself is $(1 - 1/m)^{n-1} \approx
e^{-n/m} \approx e^{-0.954} \approx 0.385$. Only about 38% of features get a
private column. That sounds fatal and usually is not, because the features that
matter are rare enough, and heavy enough, that collisions with them are mostly
against near-zero-weight noise.

The fix for the part that is fatal is **signed hashing**. Use a second hash
$\xi(f) \in \{-1, +1\}$ and add $\xi(f) \cdot x_f$ into the bucket instead of
$x_f$. When two features collide, their cross-term in the inner product carries
a factor $\xi(f)\xi(g)$, which is $+1$ and $-1$ equally often, so the expected
distortion of the inner product is zero rather than systematically positive.
Weinberger et al. (2009) proved the variance bound that makes this respectable;
without the signs, hashing collisions inflate every dot product in the same
direction and the bias does not average out.

:::note{title="The debugging consequence"}
A hashed feature space has no inverse. When a model misbehaves and you want to
know which feature drives column 731,204, there is no answer — several features
do, and you cannot enumerate them without the original vocabulary. Teams that
hash usually keep a sampled side table from name to index purely for
explainability, which quietly reintroduces the dictionary they were avoiding.
:::
::::

:::exercise{ref=poly-hash}
:::

:::exercise{ref=bucket-load-histogram}
:::

:::quiz{id=quiz-l01 passing=3}
- id: q1
  prompt: "Why is 'never produces a collision' not a design goal for a hash function?"
  options:
    - "It is a goal, but only cryptographic hashes achieve it."
    - "There are more possible keys than buckets, so collisions are forced by pigeonhole; the goal is to make them independent of the data's structure."
    - "Collisions are fine because chaining makes them free."
    - "Because collisions only matter when the table is more than half full."
  answerIndex: 1
  explanation: >-
    A hash maps an unbounded universe into m slots, so some slot must receive at
    least |U|/m keys no matter what the function is. Cryptographic hashes make
    collisions hard to *find*, which is a different property and does not help
    with a 16-bucket table. Chaining does not make collisions free — it makes
    them cost a scan of the chain.
- id: q2
  prompt: "A record hash is built by XOR-ing the hashes of its fields. What breaks?"
  options:
    - "Nothing; XOR is the standard way to combine hashes."
    - "XOR overflows for long records."
    - "XOR is commutative, so records that are permutations of each other collide — and a field equal to another field cancels to zero."
    - "XOR is not deterministic across processes."
  answerIndex: 2
  explanation: >-
    Order information is lost, so (first='ada', last='lovelace') and
    (first='lovelace', last='ada') land in the same slot; worse, any two equal
    field hashes cancel. The fix is the same as for strings: multiply the
    accumulator by an odd constant between fields so position contributes.
    Python's tuple hash does exactly that.
- id: q3
  prompt: "What does it mean for a family of hash functions to be universal?"
  options:
    - "For every function in the family and every pair of keys, the collision probability is at most 1/m."
    - "For every pair of distinct keys, the probability that a randomly chosen function from the family collides them is at most 1/m."
    - "The family contains a function that is collision-free for any input."
    - "Every function in the family distributes uniformly random keys uniformly."
  answerIndex: 1
  explanation: >-
    The randomness is in the choice of function, not in the data — which is what
    makes the bound hold for adversarially chosen keys. Option 1 gets the
    quantifiers backwards: no single fixed function can bound the collision
    probability for every pair, because an attacker can search for pairs that
    collide under it. Option 4 is the much weaker property that even the additive
    hash satisfies.
- id: q4
  prompt: "Twenty keys hashed into eight buckets give loads [3, 5, 4, 3, 1, 2, 2, 0]. What should you conclude?"
  options:
    - "The hash function is broken — a good one would give roughly 2 or 3 everywhere."
    - "Nothing is wrong: with 20 balls in 8 bins, an empty bin and a bin with 5 are both ordinary."
    - "The table needs to be resized, because one bucket is empty."
    - "The keys must share a common prefix."
  answerIndex: 1
  explanation: >-
    Balls-in-bins variance is large when the number of balls is small relative to
    the number of bins times log of bins. The expected number of empty bins here
    is about 0.55, so one empty bin is unremarkable, and the maximum load exceeds
    the mean by a wide margin at this scale. Judging a hash function on a
    twenty-key sample is how people "fix" hash functions that were fine.
:::
