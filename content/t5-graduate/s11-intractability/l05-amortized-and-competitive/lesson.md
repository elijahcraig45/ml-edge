---
id: t5/s11/l05
title: Amortized analysis three ways, then online algorithms
tier: t5-graduate
stage: s11-intractability
status: published
estimatedMinutes: 55
objectives:
  - Analyse the same structure by the aggregate, accounting and potential methods, and say what each one is good at.
  - Choose a potential function, verify it is non-negative and starts at zero, and use it to bound the amortized cost.
  - State what k-competitive means and prove it for LRU.
  - Explain recursive query evaluation as a least fixpoint, and say exactly what makes one terminate.
prerequisites: []
misconceptions:
  - "**\"Amortized is the same as average-case.\"** Average-case is a statement about a distribution over inputs. Amortized is a worst-case statement about a *sequence* of operations: no input makes $n$ pushes cost more than $3n$. There is no probability anywhere in an amortized bound, and an adversary choosing the operations cannot break it."
  - "**\"Amortized O(1) means each operation is fast.\"** One operation can still cost $\\Theta(n)$ — the resize that copies the whole table does. The guarantee is on the total. If you need a per-operation bound, as a real-time system does, amortized analysis is the wrong tool and you want an incremental structure that spreads the copy over many operations."
  - "**\"Any non-negative function works as a potential.\"** It must also start at zero (or you must subtract $\\Phi_0$ from the total), and it must actually make the amortized cost small — a potential is only useful if the expensive operations are exactly the ones that release stored potential. Finding it is the creative step, and there is no procedure for it."
  - "**\"A cache that grows shrinks by half when it is half empty.\"** Shrinking at half-full makes the structure quadratic: alternate one push and one pop at the boundary and every operation resizes. Shrinking at *quarter*-full leaves a gap between the grow and shrink thresholds so that a resize is always followed by many cheap operations. That gap is what the potential function encodes."
  - "**\"A recursive CTE terminates because SQL has a recursion limit.\"** Some engines do have one, and hitting it is an error, not a result. Termination comes from the recursion reaching a *fixpoint*: a round that derives no new tuple. Set semantics (`UNION`) makes that inevitable on a finite domain. Bag semantics (`UNION ALL`) over a cyclic graph does not terminate at all, and neither does a `UNION` recursion that carries a hop counter, because the counter makes the tuple space infinite."
masteryChecklist:
  - I can produce the aggregate, accounting and potential analyses of a dynamic table and get the same constant three times.
  - I can check a proposed potential function for the two properties a valid one must have.
  - I can state the LRU competitive bound and sketch the phase argument.
  - Given a recursive CTE, I can say whether it reaches a fixpoint and why.
runtimes:
  - engine: python
  - engine: duckdb
    datasetId: package-registry
---

A dynamic array's `append` sometimes copies the entire array. That single
operation costs $\Theta(n)$, and `append` is still $O(1)$. Amortized analysis is
how both sentences are true at once, and there are three ways to say it.

They are not three different results. They are three different proofs of the
same result, and they fail in different places, which is why it is worth knowing
all three.

## The structure

A table with `num` items and capacity `size`. On `push` into a full table,
allocate double the capacity and copy everything. On `pop` that leaves the table
at a quarter full, halve the capacity and copy everything. Cost is 1 for the
operation itself plus one unit per item copied.

```python runnable id=table-costs
def table_costs(ops):
    """Return (actual_cost, num_after, size_after) for each operation."""
    num = size = 0
    out = []
    for op in ops:
        if op == "push":
            copy = 0
            if num == size:
                copy = num
                size = 1 if size == 0 else 2 * size
            num += 1
            out.append((1 + copy, num, size))
        else:
            if num == 0:
                out.append((1, num, size))
                continue
            num -= 1
            copy = 0
            if num > 0 and 4 * num <= size:
                copy = num
                size //= 2
            out.append((1 + copy, num, size))
    return out

rows = table_costs(["push"] * 16)
print("per-op cost:", [r[0] for r in rows])
print("total:", sum(r[0] for r in rows), "for 16 pushes")
```

Costs of 1, 2, 3, 1, 5, 1, 1, 1, 9, … — spiky. Total 31, which is under
$3 \times 16$. Now prove that.

## Method 1: aggregate

Count the whole sequence at once and divide.

Over $n$ pushes into an initially empty table, resizes happen at sizes
$1, 2, 4, \dots$, copying $1 + 2 + 4 + \cdots < 2n$ items in total. Adding the
$n$ unit costs of the pushes themselves,

$$
\sum_{i=1}^{n} c_i \;<\; n + 2n \;=\; 3n,
$$

so the amortized cost per push is under 3.

**What it is good for:** it is the shortest proof when the sequence is uniform.
**Where it fails:** it gives one number for *all* operations. Mix pushes and
pops and there is nothing to sum — you would need to know the interleaving,
which the adversary chooses.

## Method 2: accounting

Charge each operation a fixed price and let the surplus pay for future work.

Charge 3 per push: 1 for the insertion itself, 1 saved on the item just
inserted, and 1 saved on an item in the older half of the table. When the table
of size $s$ fills, the last $s/2$ pushes have each saved 2 credits, which is
exactly $s$ credits — enough to copy all $s$ items.

The invariant to check is that **credit never goes negative**, and it does not,
because immediately after a resize to size $s$ the table holds $s/2$ items, all
of them uncredited, and the next $s/2$ pushes credit both them and themselves
before the table fills again.

**What it is good for:** it is intuitive and it localises the argument to one
operation type.
**Where it fails:** it needs a separate credit invariant per operation, and with
grow *and* shrink the bookkeeping gets fiddly fast — an item can be credited,
copied, and credited again.

## Method 3: potential

Define a function $\Phi$ of the *state*, non-negative, zero at the start. The
amortized cost of an operation is

$$
\hat{c}_i = c_i + \Phi_i - \Phi_{i-1}.
$$

Sum it: the potentials telescope, leaving

$$
\sum_i c_i = \sum_i \hat{c}_i - \Phi_n + \Phi_0 \le \sum_i \hat{c}_i
$$

whenever $\Phi_n \ge 0$ and $\Phi_0 = 0$. So bounding every $\hat{c}_i$ by a
constant bounds the total.

For the dynamic table, with $\alpha = \text{num}/\text{size}$:

$$
\Phi(\text{num}, \text{size}) =
\begin{cases}
2\,\text{num} - \text{size}, & \alpha \ge 1/2 \\[2pt]
\text{size}/2 - \text{num}, & \alpha < 1/2
\end{cases}
$$

with $\Phi(0, 0) = 0$.

```python runnable id=potential-check
def potential(num, size):
    if size == 0:
        return 0.0
    return float(2 * num - size) if 2 * num >= size else size / 2 - num

def table_costs(ops):
    num = size = 0
    out = []
    for op in ops:
        if op == "push":
            copy = 0
            if num == size:
                copy = num
                size = 1 if size == 0 else 2 * size
            num += 1
            out.append((1 + copy, num, size))
        else:
            if num == 0:
                out.append((1, num, size)); continue
            num -= 1
            copy = 0
            if num > 0 and 4 * num <= size:
                copy = num
                size //= 2
            out.append((1 + copy, num, size))
    return out

ops = ["push"] * 12 + ["pop"] * 10 + ["push"] * 6
prev, worst = potential(0, 0), 0.0
for (cost, num, size), op in zip(table_costs(ops), ops):
    phi = potential(num, size)
    amortized = cost + phi - prev
    worst = max(worst, amortized)
    prev = phi
print("worst amortized cost over the whole sequence:", worst)
print("total actual cost:", sum(c for c, _, _ in table_costs(ops)),
      "vs 3n =", 3 * len(ops))
```

The worst amortized cost is 3, over an interleaved sequence the aggregate method
could not have handled. That is the payoff.

:::insight{title="What $\Phi$ is measuring"}
Read the two branches. When the table is more than half full, $2n - s$ is *how
close to full it is* — it reaches $s$ exactly when the table fills and the
expensive doubling happens. When the table is less than half full,
$s/2 - n$ is *how close to a quarter full it is*.

$\Phi$ is high exactly when an expensive operation is imminent. That is not a
coincidence or a lucky guess; it is the design rule. Find the operation that
costs a lot, and let $\Phi$ be a measure of how close the structure is to
triggering it.
:::

:::checkpoint{id=cp-potential rubric="non-negative,starts at zero,expensive operations release potential"}
Someone proposes $\Phi = \text{num}$ for the dynamic table. It is non-negative
and $\Phi_0 = 0$. Why does it not prove anything?
:::

## Splay trees: where only the potential method survives

A splay tree has no balance information at all — no colours, no heights. Every
access rotates the touched node to the root through a fixed sequence of zig,
zig-zig and zig-zag steps. A single access can cost $\Theta(n)$.

With $s(x)$ the number of nodes in $x$'s subtree and $r(x) = \log_2 s(x)$,

$$
\Phi = \sum_{x \in T} r(x),
$$

the **access lemma** says splaying $x$ in a tree rooted at $t$ has amortized cost
at most $3(r(t) - r(x)) + 1$. Since $r(t) \le \log_2 n$, every operation is
amortized $O(\log n)$.

Neither of the other methods can produce this. Aggregate needs a uniform
sequence and splay costs depend on the access pattern. Accounting needs to know
which future operation each credit pays for, and a splay's cost is spread over a
path whose shape depends on the entire access history. The potential is a
function of the *state*, so it does not care how the state was reached — which is
exactly the property those sequences destroy.

Splay trees also come out **statically optimal**: over any sequence, they are
within a constant factor of the best fixed binary search tree for that access
distribution, without being told the distribution. That result is a corollary of
the same potential argument with $r(x)$ redefined by access weights.

## Online algorithms and competitive analysis

An **online** algorithm must decide now, without seeing the rest of the input.
Comparing it to an offline optimum that sees everything is unfair by
construction, so the comparison is made with a ratio.

$A$ is **$c$-competitive** when for every request sequence $\sigma$,

$$
\mathrm{cost}_A(\sigma) \le c \cdot \mathrm{cost}_{\mathrm{OPT}}(\sigma) + b
$$

for a constant $b$ independent of $\sigma$. The additive $b$ absorbs start-up
effects; the ratio is what matters.

This is the same shape as an approximation ratio, with a different resource
being denied. An approximation algorithm has all the input and not enough time;
an online algorithm has all the time and not enough input.

```python runnable id=lru-vs-opt
def lru_faults(k, requests):
    cache = []
    faults = 0
    for r in requests:
        if r in cache:
            cache.remove(r)
            cache.append(r)
        else:
            faults += 1
            if len(cache) == k:
                cache.pop(0)
            cache.append(r)
    return faults

def opt_faults(k, requests):
    """Belady: evict whatever is needed furthest in the future."""
    cache, faults = set(), 0
    for i, r in enumerate(requests):
        if r in cache:
            continue
        faults += 1
        if len(cache) == k:
            victim, farthest = None, -1
            for p in cache:
                nxt = requests.index(p, i + 1) if p in requests[i + 1:] else float("inf")
                if nxt > farthest:
                    victim, farthest = p, nxt
            cache.discard(victim)
        cache.add(r)
    return faults

cyclic = [i % 4 for i in range(24)]          # k+1 pages, round and round
classic = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]
for name, seq in [("cyclic (k+1 pages)", cyclic), ("classic", classic)]:
    print(f"{name:<20} LRU={lru_faults(3, seq):>3}  OPT={opt_faults(3, seq):>3}")
```

On the cyclic sequence LRU faults on **every** request: it always evicts the
page that is about to be requested next. That is the worst case, and the ratio
it reaches — 24 to 10 here, tending toward $k$ as the sequence grows — is
exactly what the theorem predicts.

**LRU is $k$-competitive**, and no deterministic online paging algorithm does
better. The proof is in the proof track.

## Recursive queries as least fixpoints

A recursive CTE is not a loop that happens to stop. It is the **least fixpoint**
of a monotone operator, and whether it terminates is a question about that
operator's domain.

Write $T(R)$ for "the base rows, plus everything the recursive term derives from
$R$". $T$ is monotone: adding tuples to $R$ never removes tuples from $T(R)$.
Knaster-Tarski guarantees a least fixpoint exists, and the engine computes it the
obvious way — iterate $R_0 = \emptyset$, $R_{i+1} = T(R_i)$ — stopping when
$R_{i+1} = R_i$.

That iteration halts when the space of derivable tuples is finite. Which gives
the rule:

:::warning{title="What makes a recursive CTE terminate"}
**`UNION` on a finite domain terminates.** Tuples come from the active domain of
the database, so there are finitely many of them; each round either adds one or
the recursion stops.

**`UNION ALL` on a cyclic graph does not.** Bag semantics never deduplicates, so
going round a cycle produces the same tuple again and again forever, and each
one is "new".

**`UNION` plus a counter does not either.** Adding a hop count to the tuple makes
the tuple space infinite: `(package 3, 5 hops)` and `(package 3, 6 hops)` are
different tuples, so a cycle generates a fresh one every round. This is the trap
that catches people who added the counter for debugging.
:::

```sql runnable id=fixpoint-rounds dataset=package-registry
-- Packages linked by sharing a maintainer, reachable from arrowkit (id 1).
-- The hop counter is bounded on purpose: without the bound, the cycles in this
-- graph make the tuple space infinite and the recursion never reaches a fixpoint.
WITH RECURSIVE
edge AS (
  SELECT DISTINCT a.package_id AS p, b.package_id AS q
  FROM package_maintainers a
  JOIN package_maintainers b
    ON a.maintainer_id = b.maintainer_id AND a.package_id <> b.package_id
),
walk(id, hops) AS (
  SELECT 1, 0
  UNION
  SELECT e.q, w.hops + 1
  FROM walk w JOIN edge e ON e.p = w.id
  WHERE w.hops < 3
)
SELECT hops, count(*) AS tuples_derived
FROM walk
GROUP BY hops
ORDER BY hops;
```

One tuple at depth 0, four at depth 1, seven at depths 2 and 3 — and it would be
seven at depth 4, 5, 100, forever. The set of *packages* reached stopped growing
after two hops; the set of *tuples* never does, because the counter keeps
changing. Drop the counter and the same recursion reaches its fixpoint in three
rounds and stops on its own.

**Semi-naive evaluation** is the amortized idea applied to this loop. Naive
evaluation recomputes $T(R_i)$ from scratch each round, re-deriving every fact it
already has. Semi-naive joins only the tuples that were *new* in the previous
round, because a derivation using no new tuple must already have fired. Every
tuple then participates as a driver exactly once across the whole computation, so
the total work is proportional to the number of derivable facts rather than to
(facts $\times$ rounds). That is an aggregate-method argument, and it is why
every serious Datalog and recursive-SQL engine implements it.

:::exercise{ref=dynamic-table-potential}
:::

:::exercise{ref=lru-competitive}
:::

:::exercise{ref=component-fixpoint}
:::

::::track{depth=proof}
## The potential analysis, case by case

Let $n$ be `num` and $s$ be `size` before the operation, $n'$ and $s'$ after.
Recall $\Phi = 2n - s$ when $2n \ge s$ and $s/2 - n$ otherwise, with
$\Phi(0,0) = 0$. Both branches give $\Phi \ge 0$: the first because $2n \ge s$,
the second because $n < s/2$.

**Push, no resize, $\alpha \ge 1/2$ before.** $c = 1$, $\Delta\Phi = 2$.

$$\hat{c} = 1 + 2 = 3.$$

**Push, no resize, $\alpha < 1/2$ before and after.** $c = 1$,
$\Delta\Phi = (s/2 - n - 1) - (s/2 - n) = -1$.

$$\hat{c} = 1 - 1 = 0.$$

**Push crossing $\alpha = 1/2$.** Before: $n = s/2 - 1$, $\Phi = 1$. After:
$n' = s/2$, $\Phi' = 2(s/2) - s = 0$.

$$\hat{c} = 1 - 1 = 0.$$

**Push triggering a double.** Before $n = s$, so $\Phi = 2s - s = s$. The copy
costs $s$, so $c = 1 + s$. After: $n' = s + 1$, $s' = 2s$, and
$2n' = 2s + 2 \ge 2s = s'$, so $\Phi' = 2(s+1) - 2s = 2$.

$$\hat{c} = (1 + s) + 2 - s = 3.$$

The $s$ cancels. That cancellation is the whole method.

**Pop, no resize, $\alpha \ge 1/2$ before and after.** $c = 1$,
$\Delta\Phi = -2$.

$$\hat{c} = -1.$$

**Pop crossing below $\alpha = 1/2$.** Before $n = s/2$, $\Phi = 0$. After
$n' = s/2 - 1$, $\Phi' = s/2 - (s/2 - 1) = 1$.

$$\hat{c} = 1 + 1 = 2.$$

**Pop, $\alpha < 1/2$, no resize.** $c = 1$, $\Delta\Phi = +1$.

$$\hat{c} = 2.$$

**Pop triggering a halving.** The condition is $4n' \le s$ after the decrement,
so $\Phi = s/2 - n'$ before the resize is applied and the copy costs $n'$, giving
$c = 1 + n'$. After: $s' = s/2$ and $n' \le s/4 = s'/2$, so
$\Phi' = s'/2 - n' = s/4 - n'$.

$$\hat{c} = (1 + n') + (s/4 - n') - (s/2 - n') = 1 + n' - s/4 \le 1,$$

since $n' \le s/4$.

**Conclusion.** Every $\hat{c}_i \le 3$, $\Phi_0 = 0$, and $\Phi \ge 0$
throughout. Therefore

$$
\sum_{i=1}^{m} c_i = \sum_{i=1}^{m} \hat{c}_i - \Phi_m \le 3m .
$$

$\blacksquare$

:::proof{title="Why quarter-full, not half-full"}
Suppose the table halved at $\alpha < 1/2$ instead. Take a table with $n = s/2$
and alternate push, pop, push, pop. The push fills to $s/2 + 1$… and with the
shrink threshold at $1/2$, the pop takes it back below and triggers a halving
that copies $s/2$ items; the next push then fills the halved table and triggers a
doubling. Every operation copies $\Theta(n)$ items, so $m$ operations cost
$\Theta(mn)$ — no amortized bound at all.

The gap between the doubling threshold ($\alpha = 1$) and the halving threshold
($\alpha = 1/4$) guarantees that immediately after any resize, $\alpha = 1/2$,
and $\Theta(s)$ operations are needed to reach either threshold again. The
potential function is the algebraic statement of that gap: right after a resize
$\Phi = 0$, and it must climb to $s$ before another resize can happen.
:::

## LRU is $k$-competitive

Let $\sigma$ be any request sequence, $\mathrm{LRU}$ have cache size $k$, and
$\mathrm{OPT}$ be the optimal offline algorithm with the same cache size $k$.

**Phases.** Split $\sigma$ into consecutive phases: phase 1 starts at LRU's first
fault, and each phase is the maximal run of requests during which LRU faults
exactly $k$ times. Let there be $m$ phases, so
$\mathrm{cost}_{\mathrm{LRU}}(\sigma) \le km$ (the final partial phase has at
most $k$ faults).

**Claim: LRU's $k$ faults within a phase are on $k$ distinct pages.**

Suppose LRU faults twice on the same page $p$ inside a phase. Between the two
faults, $p$ was evicted, and LRU evicts the least recently used page — so at the
moment of eviction, $k$ pages other than $p$ had been used more recently than
$p$. Each of those was requested after $p$'s first fault, so the phase contains
requests to $k$ pages besides $p$, plus two faults on $p$: that is $k+1$ faults
inside a phase which by construction has exactly $k$. Contradiction.

**Claim: OPT faults at least once per phase, after the first.**

Let $p$ be the page requested immediately before phase $i$ begins. OPT has just
served $p$, so $p$ is in OPT's cache at the start of phase $i$. During phase $i$,
LRU faults on $k$ distinct pages. At most one of them is $p$; if $p$ is among
them, then the phase's requests include $p$ plus $k-1$ others, and $p$ was
evicted by LRU during the phase, which (by the argument above) means $k$ other
distinct pages were requested — giving $k$ distinct pages other than $p$ in the
phase either way.

So during phase $i$, requests are made to $k$ distinct pages other than $p$,
while OPT's cache at the phase start holds $p$ and at most $k-1$ others. At least
one of the $k$ requested pages is not in OPT's cache, so OPT faults at least
once. Hence $\mathrm{cost}_{\mathrm{OPT}}(\sigma) \ge m - 1$.

**Combine.**

$$
\mathrm{cost}_{\mathrm{LRU}}(\sigma) \le km \le k(\mathrm{cost}_{\mathrm{OPT}}(\sigma) + 1)
= k\,\mathrm{cost}_{\mathrm{OPT}}(\sigma) + k .
$$

$\blacksquare$

:::proof{title="And no deterministic algorithm beats it"}
Fix any deterministic online algorithm $A$ with cache size $k$. An adversary
restricted to $k+1$ distinct pages can always request the one page $A$ does not
have, making $A$ fault on every request. OPT, seeing the future, evicts the page
requested furthest ahead and so faults at most once every $k$ requests. The ratio
is $k$. So $k$-competitive is optimal for deterministic algorithms, and LRU
attains it.

Randomisation does better. The MARKER algorithm is $2H_k$-competitive against an
oblivious adversary — about $2\ln k$ instead of $k$, an exponential improvement
in the ratio. This is the same amplification-by-randomness idea as Lesson 4,
applied to an adversary who must commit to the input before seeing your coins.

**What this means for a buffer pool.** The $k$-competitive bound is worst case
and pessimistic; on real workloads LRU is close to OPT. What the analysis
actually predicts is the *shape* of the failure: LRU is worst exactly when the
working set is slightly larger than the cache and access is cyclic. That is
precisely the sequential-scan pattern, which is why PostgreSQL rings buffers for
large scans instead of letting them run through the LRU, and why MySQL's InnoDB
inserts new pages at the midpoint of its LRU list rather than at the head. Both
are engineering responses to the exact worst case the theorem identifies.
:::
::::

:::quiz{id=quiz-l05 passing=3}
- id: q1
  prompt: "A structure has amortized O(1) operations. What is the strongest true statement about a single operation?"
  options:
    - "It runs in constant time."
    - "It runs in constant time with high probability."
    - "It may cost Θ(n), but any sequence of m operations costs O(m) in total, for every sequence."
    - "It runs in constant time once the structure is large enough."
  answerIndex: 2
  explanation: >-
    Amortized bounds are worst-case statements about sequences, not about
    individual operations and not about probability. The resize really does cost
    Θ(n); the guarantee is that resizes are rare enough that the total stays
    linear, against any adversarial sequence.
- id: q2
  prompt: "Why does Φ = num fail as a potential function for the dynamic table?"
  options:
    - "It can be negative."
    - "It is not zero when the table is empty."
    - "It rises by only 1 per push, so the doubling operation's amortized cost is 1 + n + 1 − n = 2 + ... — the Θ(n) copy is not cancelled, and the bound is not constant."
    - "It depends on size, which changes during a resize."
  answerIndex: 2
  explanation: >-
    A potential is valid only if it is large exactly when an expensive operation
    is imminent, so the release cancels the cost. Φ = num grows steadily and does
    not drop at a resize, so the s-unit copy survives into the amortized cost. It
    is non-negative and starts at zero — necessary conditions, not sufficient
    ones.
- id: q3
  prompt: "Which analysis method handles splay trees, and why do the other two fail?"
  options:
    - "Aggregate — the total over n operations is what the access lemma bounds."
    - "Accounting — each rotation is paid for by a credit stored at the node."
    - "Potential — Φ is a function of the tree's shape alone, so it is indifferent to the access history that determines each splay's cost."
    - "All three work equally; the potential method is just conventional."
  answerIndex: 2
  explanation: >-
    A splay's cost depends on the path from the node to the root, which depends
    on every previous access. Aggregate needs a uniform sequence and accounting
    needs to know which future operation each credit pays for; neither survives
    that dependence. A state function does, which is precisely why Sleator and
    Tarjan introduced the potential method alongside splay trees.
- id: q4
  prompt: "LRU with cache size 3 faults on all 24 requests of the sequence 0,1,2,3,0,1,2,3,… while OPT faults 10 times. What does that show?"
  options:
    - "LRU is broken and should not be used."
    - "The k-competitive bound is not tight."
    - "It is the k-competitive worst case in action — cyclic access to k+1 pages makes LRU evict exactly the page requested next, and no deterministic online algorithm avoids it."
    - "OPT must be using a larger cache."
  answerIndex: 2
  explanation: >-
    This is the adversarial sequence from the lower-bound proof, and any
    deterministic algorithm suffers on it — the adversary just requests whatever
    is missing. Recognising the pattern is the practical payoff: it is a
    sequential scan slightly larger than the buffer pool, which is why real
    engines special-case scans instead of trusting the LRU.
- id: q5
  prompt: "A recursive CTE over a cyclic graph carries a hop counter and uses UNION. What happens?"
  options:
    - "It terminates, because UNION deduplicates."
    - "It does not terminate: the counter makes each revisit of a node a distinct tuple, so every round derives something new and no fixpoint is reached."
    - "It terminates but returns duplicate rows."
    - "It terminates only if the graph is acyclic, which UNION detects."
  answerIndex: 1
  explanation: >-
    UNION deduplicates whole tuples, and (node, 5) is not (node, 6). The
    dedup that makes plain reachability terminate is defeated by the extra
    column. Fixes are to bound the counter, to carry the visited path and
    exclude repeats, or to drop the counter and compute distance a different way.
:::
