---
id: t2/s05/l04
title: Load factor, resizing, and the dict you actually use
tier: t2-core-structures
stage: s05-hashing-and-aggregation
status: published
estimatedMinutes: 50
objectives:
  - Explain why the load factor, not the table size, determines every cost in a hash table.
  - Derive the amortized cost of insertion under a geometric growth policy.
  - Describe CPython's compact-ordered dict layout and its perturbation probe sequence.
  - State the `__hash__` / `__eq__` contract and demonstrate the failure a mutable key causes.
  - Use an integer as a bitset, and enumerate the submasks of a mask.
prerequisites:
  - t2/s05/l03
misconceptions:
  - "**\"Amortized $O(1)$ means every insert is $O(1)$.\"** It means the *average* over a sequence is constant. One insert in every $n$ copies the whole table, so the worst single insert is $\\Theta(n)$. For a batch job that is irrelevant. For anything with a latency budget it is the thing that shows up as a periodic spike in the p99, and the fix is to pre-size the table or use an incremental-rehashing map."
  - "**\"Growing by a fixed amount is fine if the amount is large.\"** Growing by a constant $c$ makes the total copy work $\\Theta(n^2/c)$ — quadratic, whatever $c$ is. Only *geometric* growth gives constant amortized cost, and that is the entire reason every dynamic array and hash table in existence multiplies rather than adds."
  - "**\"Two equal objects may hash differently as long as `__eq__` is right.\"** Then the dict looks in the wrong slot and never even calls `__eq__`. The implication runs one way and must not be broken: `x == y` requires `hash(x) == hash(y)`. The converse is free — unequal objects are allowed to share a hash, and must, because there are more objects than hash values."
  - "**\"Dicts are unordered.\"** Insertion order has been part of the language specification since Python 3.7. It is a consequence of the compact layout, not a coincidence: entries live in a dense array in insertion order, and the sparse array holds indices into it."
masteryChecklist:
  - I can say what the total copy work is over n insertions with doubling, and where the factor of 2 comes from.
  - I can describe the two arrays in a CPython dict and say which one carries the ordering.
  - I can explain why CPython's probe sequence uses the high bits of the hash and what that fixes.
  - I can write the submask enumeration loop and say why the total work over all masks is $3^n$.
runtimes:
  - engine: python
---

Every formula in the last two lessons was a function of $\alpha = n/m$ and of
nothing else. So there is exactly one knob on a hash table: when to grow it.
This lesson is about what happens when you turn it, and what the dict in front
of you actually does.

## Watch a real dict resize

```python runnable id=dict-growth
import sys

d = {}
last = sys.getsizeof(d)
print(f"{'entries':>8} {'bytes':>7}")
print(f"{0:>8} {last:>7}")

for i in range(300):
    d[i] = i
    size = sys.getsizeof(d)
    if size != last:
        print(f"{len(d):>8} {size:>7}")
        last = size
```

The jumps are the resizes. They land just past two-thirds of each capacity,
which is CPython's fill threshold, and the gaps between them grow
geometrically. The *factor* has changed across releases — CPython 3.13 sizes
the new table from `used * 2`, earlier versions used `used * 3` — so read your
own output rather than memorising the sequence. What has not changed, and will
not, is that the growth is multiplicative.

## Why it has to be multiplicative

Suppose you grow by a constant $c$ slots instead. Rehashing copies every live
entry, so you copy $c, 2c, 3c, \ldots$ entries at successive resizes, and over
$n$ insertions the total copy work is

$$c + 2c + \cdots + n = \Theta\!\left(\frac{n^2}{c}\right).$$

Quadratic, for any constant $c$. Doubling $c$ halves the constant and leaves the
exponent alone. This is the single most common way a well-meaning
"optimisation" — "grow by 1024 entries at a time, allocations are expensive" —
turns a linear program into a quadratic one.

With geometric growth by a factor $g$, resizes happen at sizes
$n_0, g n_0, g^2 n_0, \ldots$ and the total copy work over $n$ insertions is

$$n_0\left(1 + g + \cdots + g^{k-1}\right) = n_0 \cdot \frac{g^k - 1}{g - 1} < \frac{g}{g - 1} \cdot n,$$

because the last resize copied $g^{k-1} n_0$ entries and that is at most $n$.
Constant per insertion: under two copies per element at $g = 2$, under three at
$g = 1.5$. Smaller growth factors trade a little more copying for tighter memory
and better reuse of freed blocks, which is why several production allocators and
vectors use 1.5 rather than 2. The exercise below measures the real numbers.

:::checkpoint{id=cp-growth rubric="constant growth gives quadratic total work,geometric growth gives constant amortized work,the amortized bound hides a linear worst case"}
A colleague sets a hash table to grow by 10,000 slots each time, reasoning that
"doubling wastes memory". Insert ten million keys. What is the total copy work,
and what would you say to them?
:::

## The dict is not a textbook hash table

CPython's `dict` since 3.6 is **compact and ordered**, which is two claims at
once, and the second follows from the first.

Instead of one array of slots, there are two:

```
indices:  [-1,  0, -1, -1,  2,  1, -1, -1]      # sparse, 8 slots, one int each
entries:  [(hash, "arrowkit", 190),             # dense, insertion order
           (hash, "bitmask",   61),
           (hash, "chunker",  310)]
```

The sparse array holds *indices into the dense array*, not entries. So the
sparse array — the one that must be mostly empty for probing to work — costs one
small integer per slot rather than a whole three-word entry, and the integer is
widened only as the table grows: one byte per slot for a small dict, two once it
passes 255 slots, and so on. That is where the roughly 20–25% memory saving over
the old layout came from.

The ordering is then free. `entries` is append-only in insertion order, so
iterating a dict walks it directly, and iteration is $O(n)$ in the number of
*entries* rather than $O(m)$ in the number of slots. Before 3.6 iteration had to
scan the whole sparse table, which is why iterating a large-but-empty dict used
to be slow. Insertion order became a language guarantee in 3.7 because the
implementation had already made it true and everyone had started relying on it.

Deletion, as ever, is the wrinkle: a deleted entry leaves a `DUMMY` in the
sparse array — a tombstone, exactly as in the last lesson — and a hole in the
dense array. The dense array is only compacted on a resize.

## Perturbation probing

CPython does not probe linearly, quadratically, or with a second hash function.
It does this:

```
j = hash & mask
perturb = hash
repeat:
    j = (5*j + 1 + perturb) & mask
    perturb >>= 5
```

```python runnable id=perturbation
def probe_sequence(h, bits=3, steps=10):
    mask = (1 << bits) - 1
    j = h & mask
    perturb = h
    out = []
    for _ in range(steps):
        out.append(j)
        perturb >>= 5
        j = (5 * j + 1 + perturb) & mask
    return out

j, cycle = 0, []
for _ in range(8):
    cycle.append(j)
    j = (5 * j + 1) % 8
print("with perturb = 0, j = 5j+1 mod 8 :", cycle)
print()
print("hash 12345      :", probe_sequence(12345))
print("hash 12345 + 8  :", probe_sequence(12345 + 8))
```

Two things are happening.

**The recurrence $j \mapsto 5j + 1 \bmod 2^k$ visits every slot.** That is the
Hull–Dobell condition for a full-period linear congruential generator: the
increment (1) is coprime to the modulus, and the multiplier minus one (4) is
divisible by every prime factor of the modulus (2) and by 4 since the modulus is
divisible by 4. So the probe sequence is guaranteed to be a permutation of the
table — the failure mode from Lesson 2 cannot happen here.

**`perturb` drags in the high bits.** Two keys whose hashes differ only above
the mask start at the same slot — as in the run above, where 12345 and 12353
both begin at slot 1 — and would then follow the identical path, which is the
secondary clustering of Lesson 2. Mixing `perturb` into the recurrence and
shifting it right by 5 each step means the *whole* hash steers the walk, and the
two sequences diverge on the second probe. It is double hashing's benefit
without a second hash function, paid for with a shift and an add.

:::insight{title="Why `hash(n) == n` is safe after all"}
Lesson 1 pointed out that CPython hashes small integers to themselves, so
`range(0, 1000, 8)` would pile into one bucket of a power-of-two table. Here is
the answer: the initial slot does collide, and then `perturb` — which holds the
*unmasked* hash — pulls the sequences apart immediately. The mixing was moved
out of the hash function and into the probe sequence, which is cheaper, because
most lookups only ever perform the first probe.
:::

## The contract that makes any of this work

A hash table computes a slot from the key and then confirms with `==`. Both
halves have requirements.

1. **If `x == y` then `hash(x) == hash(y)`.** Break this and the dict looks in
   the wrong slot and never calls `__eq__` at all.
2. **A key's hash must not change while it is in the table.** Break this and the
   entry is stranded: it is still in the array, and the table will never look
   where it now belongs.

```python runnable id=stranded-key
class Version:
    def __init__(self, parts):
        self.parts = parts
    def __hash__(self):
        return hash(tuple(self.parts))
    def __eq__(self, other):
        return isinstance(other, Version) and self.parts == other.parts
    def __repr__(self):
        return f"Version({self.parts!r})"

key = Version([1, 0, 0])
releases = {key: "1.0.0 release"}
print("before mutation:", releases[key])

key.parts.append(1)                 # the key is a live dict key right now

print("key in releases:", key in releases)
print("but it is still stored:", list(releases))
try:
    releases[Version([1, 0, 0, 1])]
except KeyError:
    print("and looking it up by an equal value raises KeyError")
```

The entry is unreachable through the key object that is sitting inside it. This
is not an obscure edge case: it is what happens the moment someone gives a
mutable class a `__hash__`, and it is why `list`, `dict` and `set` refuse to be
hashable at all rather than letting you find out this way.

:::pitfall{title="Defining `__eq__` silently unhashes your class"}
Define `__eq__` on a class without defining `__hash__`, and Python sets
`__hash__ = None`. Instances then raise `TypeError: unhashable type` when used
as dict keys. This is deliberate — a class that has redefined equality almost
certainly needs a matching hash, and inheriting the identity-based one would
break rule 1 — but it arrives as a confusing error a long way from the cause.
`@dataclass(frozen=True)` generates both correctly, which is the right default
for a value object.
:::

## Bitsets: a hash table with no hash function

When the universe of keys is small and dense — say, "which of these 20 packages
are deprecated" — you do not need a hash at all. The key *is* the address.

```python runnable id=bitset-basics
DEPRECATED = 0
for package_id in (5, 9, 19):
    DEPRECATED |= 1 << package_id

print("bits:", bin(DEPRECATED))
print("is 9 deprecated? ", bool(DEPRECATED & (1 << 9)))
print("is 10 deprecated?", bool(DEPRECATED & (1 << 10)))
print("how many?        ", DEPRECATED.bit_count())

PYTHON_PKGS = 0
for package_id in (1, 3, 4, 7, 9, 12, 17, 19):
    PYTHON_PKGS |= 1 << package_id

print("deprecated python packages:", bin(DEPRECATED & PYTHON_PKGS))
print("union size:", (DEPRECATED | PYTHON_PKGS).bit_count())
```

This is a perfect hash function: no collisions, one bit per key, and set
intersection is a single machine instruction per 64 keys. It is why query
engines represent selection results as bitmaps, and why Roaring bitmaps exist.

The operation worth learning by heart is **submask enumeration**. Given a mask,
walk every subset of its set bits, in descending order:

```python runnable id=submasks-loop
mask = 0b1011
s = mask
while True:
    print(f"{s:>04b}")
    if s == 0:
        break
    s = (s - 1) & mask
```

`s - 1` clears the lowest set bit of `s` and sets everything below it; the
`& mask` throws away the bits that were never in the mask. The result is the
next-smallest submask, so the loop enumerates exactly the $2^{\text{popcount}}$
subsets and nothing else. Summed over all $2^n$ masks the total work is $3^n$,
not $4^n$ — each of the $n$ bit positions is independently in the submask, in
the mask but not the submask, or in neither. That identity is what makes
subset-sum dynamic programming over $n = 20$ elements feasible and $n = 20$
with a naive double loop not.

::::track{depth=proof}
## The amortized cost of doubling

"Amortized $O(1)$" is asserted constantly and derived rarely. Here it is twice,
because the two derivations teach different things.

### By summation

Start with capacity 1 and double whenever the table is full. Insert $n$ items.
A resize copies every element currently present, so resizes at capacities
$1, 2, 4, \ldots, 2^{k}$ copy $1, 2, 4, \ldots, 2^{k}$ elements, where $2^k < n \le 2^{k+1}$.
Total copy work:

$$\sum_{i=0}^{k} 2^{i} = 2^{k+1} - 1 < 2n .$$

Add the $n$ insertions themselves and the total is under $3n$, so the amortized
cost per insertion is under 3. The geometric series is the whole argument: the
*last* resize does half the total copying, the one before it a quarter, and the
entire history costs less than one more resize would.

### By potential

The summation gives the right number but not the right intuition, because it
requires knowing the whole sequence in advance. Define a potential function on
the table's state:

$$\Phi = 2n - m,$$

where $n$ is the number of entries and $m$ the capacity. Take the table to be at
least half full, so $\Phi \ge 0$, and $\Phi = 0$ immediately after a resize
(when $n = m/2$). The amortized cost of an operation is its actual cost plus the
change in potential.

**An insert with no resize.** Actual cost 1. $n$ rises by one, $m$ is unchanged,
so $\Delta\Phi = 2$. Amortized cost $1 + 2 = 3$.

**An insert that triggers a resize.** The table was full: $n = m$ before the
insert, so $\Phi = 2m - m = m$. The resize copies $m$ elements and doubles the
capacity, then the insert happens: afterwards $n = m + 1$ and the capacity is
$2m$, so $\Phi' = 2(m+1) - 2m = 2$. Actual cost is $m + 1$. Amortized cost:

$$(m + 1) + (\Phi' - \Phi) = (m + 1) + (2 - m) = 3 .$$

Three, either way, with no reference to the length of the sequence. That is what
the potential function buys: the expensive operation pays for itself out of
credit that the cheap operations deposited, and the accounting is local. Since
$\Phi \ge 0$ always and $\Phi = 0$ at the start, the total actual cost of any
sequence of $n$ insertions is at most the total amortized cost, $3n$.

### What the bound does not say

It says nothing about any individual operation. The insert that triggers the
resize at one million entries really does copy one million entries, and it takes
as long as it takes. Systems that cannot tolerate that — a garbage-collected
runtime with a pause budget, a database with a latency SLO — use **incremental
rehashing**: allocate the new table, then move a few entries across on each
subsequent operation while serving lookups from both tables until the old one is
empty. Redis does exactly this. The amortized cost is unchanged; the variance
collapses; the code gets considerably harder, because every operation now has to
check two tables.

:::proof{title="Deletion breaks the symmetry"}
If you shrink whenever the table falls below half full, an adversary can sit at
the boundary — insert, delete, insert, delete — and force a resize on every
operation, giving $\Theta(n)$ amortized cost. The standard fix is hysteresis:
grow at $\alpha = 1$ (or $2/3$), shrink only at $\alpha = 1/4$. The gap between
the thresholds guarantees that $\Theta(m)$ operations must occur between two
resizes, which restores the constant bound. The same argument, with the same
fix, is why deque and vector implementations do not shrink eagerly.
:::
::::

:::exercise{ref=rehash-cost}
:::

:::exercise{ref=submasks}
:::

:::quiz{id=quiz-l04 passing=3}
- id: q1
  prompt: "A hash table grows by a fixed 1,000 slots each time it fills. What is the total copy work for n insertions?"
  options:
    - "O(n), because 1,000 is a constant."
    - "O(n log n), because there are n/1000 resizes."
    - "Θ(n²/1000) — quadratic, because the k-th resize copies about 1000k entries."
    - "O(1) amortized, the same as doubling."
  answerIndex: 2
  explanation: >-
    The resizes copy 1000, 2000, 3000, … entries, an arithmetic series that sums
    to Θ(n²/c). A larger constant scales the curve down but leaves it quadratic.
    Only geometric growth makes the series converge to a constant multiple of n.
- id: q2
  prompt: "Why does CPython mix `perturb` (the unmasked hash) into its probe sequence?"
  options:
    - "To make the hash function cryptographically stronger."
    - "So that keys whose hashes agree in the low bits but differ higher up take different probe paths."
    - "To guarantee the probe sequence visits every slot."
    - "To keep the dict's iteration order stable."
  answerIndex: 1
  explanation: >-
    The initial slot uses only the low bits, so keys that differ above the mask
    collide there and, without perturbation, would then walk identical paths —
    secondary clustering. Option 3 is the job of the 5j+1 recurrence, which is a
    full-period LCG on its own; perturbation is about spreading, not coverage.
- id: q3
  prompt: "A class defines `__eq__` comparing two fields, and `__hash__` returning the hash of only the first field. What happens?"
  options:
    - "Lookups break, because equal objects can now hash differently."
    - "Nothing breaks: equal objects still hash equally, and unequal ones may collide, which is allowed."
    - "It raises TypeError when used as a dict key."
    - "It works but makes iteration order nondeterministic."
  answerIndex: 1
  explanation: >-
    The contract is one-directional: equal implies equal hashes. Two objects with
    the same first field but different second fields are unequal and share a
    hash, which is a collision — legal, and resolved by the == check. It only
    costs performance, and only if the first field has few distinct values. The
    broken direction is hashing on a field that `__eq__` ignores.
- id: q4
  prompt: "`s = (s - 1) & mask`, starting from `s = mask`, enumerates what?"
  options:
    - "Every integer from mask down to 0."
    - "Every submask of mask, in descending order, ending at 0."
    - "Every superset of mask up to 2**n."
    - "The set bits of mask, one at a time."
  answerIndex: 1
  explanation: >-
    Subtracting one borrows through the lowest set bit; the AND then discards
    any bit that was not in the mask, landing on the next-smallest submask. The
    loop performs 2^popcount(mask) iterations rather than mask+1, which is the
    difference between 3^n and 4^n total work when you run it over every mask.
:::
