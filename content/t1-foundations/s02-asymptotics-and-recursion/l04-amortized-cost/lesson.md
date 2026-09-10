---
id: t1/s02/l04
title: Amortized cost, and why append is only usually free
tier: t1-foundations
stage: s02-asymptotics-and-recursion
status: published
estimatedMinutes: 40
objectives:
  - Explain why appending to a list is constant time amortized and linear time in the worst case, and why both statements are needed.
  - Prove the amortized bound with the aggregate method by summing the copies over n appends.
  - Run the accounting method — assign a charge per operation and show the balance never goes negative.
  - Show that a constant-increment growth policy makes n appends quadratic in total, and say what geometric growth buys.
prerequisites:
  - t1/s02/l01
  - t1/s01/l02
misconceptions:
  - "**\"Amortized means average case.\"** Average case is an expectation over a *distribution of inputs*, and an unlucky input can blow it. Amortized is a worst-case bound on a *sequence* of operations: any $n$ appends cost $O(n)$ total, with no probability involved and no adversarial input that defeats it."
  - "**\"Amortized $O(1)$ means every operation is fast.\"** It means the total is bounded. One append in a sequence of a million genuinely copies a million elements. If you care about the slowest single operation — a game frame, an audio callback, a p99 latency target — amortized analysis is answering a question you did not ask."
  - "**\"The array grows by a fixed number of slots because doubling wastes memory.\"** Growing by a constant makes $n$ appends $\\Theta(n^2)$: the resizes get no rarer as the array gets bigger. Every growth policy in production use is geometric; the argument is only ever about the *ratio*, and CPython's is roughly 1.125, not 2."
  - "**\"If append is amortized $O(1)$, so is insert.\"** `list.insert(0, x)` shifts every element every single time — there is no rare-expensive-operation structure to amortize, it is $\\Theta(n)$ per call and $\\Theta(n^2)$ over $n$ calls. Amortization needs the expensive step to become *rarer* as the structure grows."
masteryChecklist:
  - I can sum the copies performed by n appends under doubling and show the total stays under 2n.
  - I can state an accounting scheme, its invariant, and why the balance stays non-negative.
  - I can name a situation where the amortized bound is the wrong bound to care about.
  - I can predict the total work for a growth policy I have not seen before.
runtimes:
  - engine: python
---

`list.append` is $O(1)$. Some individual appends copy a million elements. Both
sentences are true, and *amortized* is the word that makes them compatible.

A Python list is a contiguous block of pointers with spare room at the end.
Appending writes into the spare room, which is one store instruction. When the
spare room runs out, the list allocates a bigger block and copies everything
across — an operation whose cost is the current length. So the cost sequence of
$n$ appends is not flat. It is mostly 1, with occasional spikes.

```python runnable id=append-is-not-flat
import sys

xs = []
resize_points = []
previous = sys.getsizeof(xs)

for n in range(1, 2001):
    xs.append(n)
    current = sys.getsizeof(xs)
    if current != previous:      # the block moved: this append copied everything
        resize_points.append(n)
        previous = current

print("appends that triggered a reallocation:")
print(resize_points)
ratios = [round(resize_points[i + 1] / resize_points[i], 3)
          for i in range(len(resize_points) - 1)]
print("ratio between consecutive reallocations:", ratios[-8:])
print(f"{len(resize_points)} reallocations across 2000 appends")
```

Thirty-three expensive appends out of two thousand, and the gaps between them
keep widening — the ratios settle near 1.13. That widening is the entire
mechanism. The expensive operation does not get cheaper as the list grows; it
gets **rarer**, at exactly the rate needed to cancel its growing cost.

## The aggregate method

The aggregate method is the blunt one: add up the total cost of $n$ operations
and divide by $n$. No cleverness, and it is enough here.

Take a doubling array, capacity 1 to start. It reallocates when the length
reaches 1, 2, 4, 8, …, and each reallocation copies the current length. Over $n$
appends, the total copying is

$$
1 + 2 + 4 + \cdots + 2^{\lfloor \log_2 n \rfloor} \;=\; 2^{\lfloor \log_2 n \rfloor + 1} - 1 \;<\; 2n
$$

That is a geometric series, and the fact worth internalising is that **a
geometric series sums to a constant times its largest term**. The last
reallocation alone accounts for at least half of all copying ever done, and every
earlier one put together accounts for the rest.

So $n$ appends cost fewer than $n$ writes plus $2n$ copies: under $3n$ operations
total, or under 3 per append. $\Theta(1)$ amortized.

```python runnable id=aggregate-method
def copies_geometric(n, factor=2):
    """Total elements copied by n appends under a doubling policy."""
    capacity = copies = 0
    for size in range(n):
        if size == capacity:                     # full: reallocate and copy
            capacity = max(1, int(capacity * factor))
            copies += size
    return copies

def copies_linear(n, step=100):
    """Same, but the array grows by a fixed number of slots."""
    capacity = copies = 0
    for size in range(n):
        if size == capacity:
            capacity += step
            copies += size
    return copies

print(f"{'n':>8} {'doubling':>12} {'per append':>12} {'grow by 100':>14} {'per append':>12}")
for n in (1_000, 10_000, 100_000):
    g, l = copies_geometric(n), copies_linear(n)
    print(f"{n:>8} {g:>12,} {g/n:>12.2f} {l:>14,} {l/n:>12.1f}")
```

Read the two "per append" columns down. Under doubling it hovers around 1 and
never trends anywhere. Under constant growth it multiplies by 10 every time $n$
multiplies by 10 — the definition of linear per operation, and therefore
quadratic in total.

:::insight{title="Why the ratio can be anything above 1"}
Growth by a factor of $r > 1$ makes the copy totals a geometric series with ratio
$r$, which sums to $\frac{r}{r-1}$ times $n$. That is a constant for every fixed
$r > 1$ and it explodes as $r \to 1$:

| growth factor $r$ | copies per append | wasted capacity at worst |
| --- | --- | --- |
| 2 | 2 | 50% |
| 1.5 | 3 | 33% |
| 1.125 | 9 | 11% |
| $1 + 1/n$ (constant step) | unbounded | ~0% |

The choice of $r$ is a straight trade between copying and memory, and every
value above 1 keeps the amortized bound. Only $r = 1$ — a constant increment —
breaks it, and it breaks it completely.
:::

:::checkpoint{id=cp-rarer rubric="the expensive operation becomes rarer as n grows,the copy totals form a geometric series,a geometric series is dominated by its last term,constant growth keeps the resizes equally frequent"}
State in one sentence why doubling gives an amortized constant and growing by
100 slots does not. Your sentence should mention how *often* the expensive step
happens, not how much it costs.
:::

## The accounting method

The aggregate method gives you a number. The accounting method gives you an
argument that survives when the operations are not all the same — a stack with
`push`, `pop` and `multipop`, a counter with carries, a splay tree. It is the
technique, and the dynamic array is where you learn it.

Overcharge the cheap operations and bank the surplus to pay for the expensive
ones.

**The scheme.** Charge **3 tokens** for every `append`. One token pays for
writing the new element right now. The other two go into the bank, stored
conceptually *on the element just written*.

**The invariant.** Just after a reallocation, the array holds half of its new
capacity and the bank is empty. Every append from that point adds one element and
banks 2 tokens, so after another $c/2$ appends into a capacity-$c$ array the bank
holds $c$ tokens and the array is full. (The exact statement, including the
off-by-one from the append that triggered the reallocation, is in the proof
track.)

**The payment.** The next append must copy all $c$ elements, costing $c$. The
bank holds exactly $c$. It pays, the balance returns to zero, and the invariant
is restored for the next round.

The bank never goes negative, so the total charged is an upper bound on the total
spent. Total charge is $3n$; therefore the true cost of $n$ appends is at most
$3n$, which is $O(n)$, which is $O(1)$ per operation amortized.

:::pitfall{title="Amortized is not average, and the difference bites"}
"Average case" quantifies over inputs and assumes a distribution — an adversary
who picks the input can defeat it. "Amortized" quantifies over a *sequence of
operations* on the actual data structure, with no distribution and no assumption
about the input at all. There is no sequence of appends that costs more than
$3n$.

The place this matters is latency. Amortized $O(1)$ says nothing about the
slowest single call, and the slowest single call is $\Theta(n)$. If you are
holding a 16-millisecond frame budget, or writing an audio callback, or chasing a
p99, the append that copies ten million pointers is a real, visible, reproducible
stall — and the answer is not a better amortized bound, it is a different
structure. Incremental (deamortized) growth copies a few elements on every append
and gives up the amortized constant to buy a worst-case one.
:::

:::exercise{ref=growable-array}
:::

::::track{depth=proof}
## The accounting argument, done properly

The prose above asserted that the bank never goes negative. Here is the actual
proof, and then the same result by the potential method, which is the form the
argument takes in every later stage.

**Setup.** Write $\text{size}_i$ for the number of elements after operation $i$
and $\text{cap}_i$ for the capacity. The real cost $c_i$ of append $i$ is 1 if
$\text{size}_{i-1} < \text{cap}_{i-1}$, and $\text{size}_{i-1} + 1$ if the array
was full and had to be copied. We charge $\hat{c}_i = 3$ for every append and
must show $\sum_{i=1}^{n} c_i \le \sum_{i=1}^{n} \hat{c}_i = 3n$.

**The invariant, by induction on the number of appends since the last
reallocation.** Let $B_i$ be the bank balance after operation $i$. Claim:

$$
B_i \;=\; 2\,\text{size}_i - \text{cap}_i \qquad\text{whenever } \text{size}_i \ge \text{cap}_i/2
$$

*Base.* Immediately after a reallocation that doubled capacity to $c$, we have
$\text{size} = c/2$ and, by construction, $B = 0$. And indeed
$2(c/2) - c = 0$.

*Step, cheap append.* Size increases by 1, capacity is unchanged, and the bank
gains $3 - 1 = 2$. Both sides of the claim increase by exactly 2.

*Step, expensive append.* The array was full, so $\text{size} = \text{cap} = c$
and by the hypothesis $B = 2c - c = c$. The copy costs $c$ and the write costs 1,
so the bank goes to $B + 3 - (c + 1) = c + 2 - c - 1 = 2$. Afterwards
$\text{size} = c + 1$ and $\text{cap} = 2c$, and the claim predicts
$2(c+1) - 2c = 2$. It matches. $\blacksquare$

Because $\text{size} \ge \text{cap}/2$ holds at all times under doubling — that
is what "double when full" guarantees — the balance $2\,\text{size} - \text{cap}$
is never negative. The bank is always solvent, so the charges dominate the costs
and $\sum c_i \le 3n$.

:::proof{title="The same thing as a potential function"}
Define $\Phi(D) = 2\,\text{size}(D) - \text{cap}(D)$, the quantity that just
appeared as the bank balance. The amortized cost of an operation is defined as

$$
\hat{c}_i \;=\; c_i + \Phi(D_i) - \Phi(D_{i-1})
$$

**Cheap append.** $c_i = 1$, size grows by 1, capacity fixed, so
$\Delta\Phi = 2$ and $\hat{c}_i = 3$.

**Expensive append.** The array was full at size $s$, so $c_i = s + 1$. Before:
$\Phi = 2s - s = s$. After: size is $s+1$, capacity is $2s$, so
$\Phi = 2(s+1) - 2s = 2$. Then

$$
\hat{c}_i = (s + 1) + 2 - s = 3
$$

Every append has amortized cost exactly 3, expensive ones included. That is the
whole appeal of the potential method: the case analysis collapses to a single
number, and telescoping gives the bound for free —

$$
\sum_{i=1}^{n} c_i \;=\; \sum_{i=1}^{n} \hat{c}_i - \Phi(D_n) + \Phi(D_0)
\;\le\; 3n
$$

since $\Phi(D_0) = 0$ and $\Phi \ge 0$ always. The requirement that $\Phi$ never
drops below its starting value is the only thing you have to check, and it is
where a badly chosen potential function fails.

This function is not arbitrary, either. $\Phi = 2\,\text{size} - \text{cap}$ is
"how much of the coming copy have I already paid for", which is why it is zero
right after a reallocation and maximal right before the next one. Choosing
$\Phi$ is the creative step in every amortized proof you will meet later —
including the union-find analysis in the graphs stage, and the splay tree, whose
potential is a sum of logarithms.
:::
::::

::::track{depth=systems}
## What CPython actually does, and where the analysis stops applying

CPython does not double. `list_resize` in `Objects/listobject.c` computes

```c
new_allocated = ((size_t)newsize + (newsize >> 3) + 6) & ~(size_t)3;
```

which is roughly $1.125\,n + 6$, rounded down to a multiple of four. The
reallocation points printed by the first runnable block — 1, 5, 9, 17, 25, 33,
41, 53, 65, 77, 93, 109, 129, … — are that formula, and the ratios settling near
1.13 are the $1 + 1/8$.

The amortized bound survives: any growth factor above 1 gives a geometric series.
The constant changes from about 2 copies per append to about 9. CPython takes
that trade because a doubling list wastes up to 50% of its memory, and a Python
process holds an enormous number of small lists. The growth policy is a memory
decision that the asymptotic analysis is deliberately blind to — which is a good
example of asymptotics telling you the right thing and not the whole thing.

Two boundaries are worth knowing.

**Amortization needs the expensive step to get rarer.** `list.insert(0, x)`
shifts every element on *every* call, so $n$ inserts at the front cost
$\Theta(n^2)$ with no amortization available. `collections.deque` exists for
exactly this: it is a doubly linked list of fixed-size blocks, so both ends are
worst-case $O(1)$ and neither end needs an amortized argument. The trade is that
`deque` has no $O(1)$ random access.

**A single amortized structure can be shared, and then the bound is per-sequence,
not per-caller.** If two threads append to the same list, the one that happens to
trigger the reallocation eats the whole $\Theta(n)$ cost while the other keeps
paying 1. The total is still $O(n)$; it is just not evenly distributed, and if
your latency budget belongs to the unlucky caller, the total is not what you
needed to know.

The same tension shows up one layer down. Databases and log-structured storage
engines amortize compaction the same way — an LSM tree's write path is amortized
cheap and occasionally stalls for a major compaction — and "write stalls" are the
name for exactly the moment when an amortized bound and a latency SLO disagree.
::::

:::quiz{id=quiz-l04 passing=3}
- id: q1
  prompt: "What does \"append is $O(1)$ amortized\" guarantee?"
  options:
    - "Every individual append runs in constant time."
    - "Any sequence of n appends costs O(n) in total, though one of them may cost Θ(n) on its own."
    - "Appends are constant time for typical inputs, but an adversarial input can make them linear."
    - "The average append is constant time under the assumption that resizes are rare."
  answerIndex: 1
  explanation: >-
    Amortized is a worst-case bound on a sequence, not a probabilistic claim and
    not a claim about any single call. The third option describes average-case
    analysis, which involves a distribution over inputs; there is no input that
    defeats the amortized bound here.
- id: q2
  prompt: "An array grows by exactly 1,000 slots whenever it fills up. What is the total cost of $n$ appends?"
  options:
    - "Θ(n) — 1,000 is a constant, so this is still geometric growth."
    - "Θ(n log n) — there are n/1000 resizes and each copies about n elements."
    - "Θ(n^2) — there are n/1000 resizes and the k-th copies 1000k elements."
    - "Θ(n sqrt(n)) — the resize cost grows as the square root of the length."
  answerIndex: 2
  explanation: >-
    Summing $1000k$ for $k = 1 \dots n/1000$ gives $\Theta(n^2)$. The resizes do
    not get rarer as the array grows — they happen every 1,000 appends forever —
    so the growing copy cost is never amortized away. Constant growth is the one
    policy that breaks the bound, no matter how large the constant.
- id: q3
  prompt: "In the accounting method for a doubling array, why is 3 tokens per append enough?"
  options:
    - "Because a resize costs at most 3 times as much as a normal append."
    - "One token pays the write; the other two are banked on the new element, and by the time the array is full the bank holds exactly enough to pay for copying every element."
    - "Because doubling means the array is at most 3 times larger than it needs to be."
    - "Because 3 is an upper bound on the number of resizes for any n."
  answerIndex: 1
  explanation: >-
    The scheme works because after a reallocation to capacity $c$ the array holds
    $c/2$ elements and the bank is empty; the next $c/2$ appends bank 2 tokens
    each, producing exactly $c$ tokens by the time a copy of $c$ elements is
    needed. The number of resizes is $\Theta(\log n)$, not 3, and a resize costs
    $\Theta(n)$, not a constant multiple of an append.
- id: q4
  prompt: "You are writing an audio callback that must never exceed 2 ms. Which fact about `list.append` matters most?"
  options:
    - "That it is amortized O(1), so the callback's total cost is bounded."
    - "That its worst case is Θ(n), because one call in the callback can copy the whole buffer."
    - "That CPython grows by about 1.125x, so resizes are frequent but small."
    - "None; appends are fast enough that the distinction is theoretical."
  answerIndex: 1
  explanation: >-
    A latency budget is a bound on the slowest single operation, and that is
    precisely the quantity amortized analysis discards. The 1.125x factor makes
    resizes more frequent and each one cheaper, which softens the spike but does
    not remove it — the largest copy is still proportional to the buffer. Preallocate,
    or use a structure with a worst-case bound.
:::
