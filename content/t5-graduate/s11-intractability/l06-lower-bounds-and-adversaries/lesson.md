---
id: t5/s11/l06
title: Lower bounds, adversaries, and joins that are provably wrong
tier: t5-graduate
stage: s11-intractability
status: published
estimatedMinutes: 55
objectives:
  - Derive the Omega(n log n) comparison-sorting bound from a decision tree and say exactly what it assumes.
  - Construct an adversary argument, and say how it differs from a decision-tree argument.
  - State the AGM bound and compute it for the triangle query.
  - Explain why binary join plans are asymptotically suboptimal on cyclic queries, and what worst-case-optimal joins do instead.
prerequisites: []
misconceptions:
  - "**\"Sorting is $\\Omega(n \\log n)$.\"** *Comparison* sorting is. Radix sort and counting sort are linear and are not counterexamples — they never compare two keys to each other, so they are not leaves of the decision tree the bound is about. A lower bound is a statement about a *model of computation*, and quoting one without its model is the most common error in this whole area."
  - "**\"An adversary argument and a decision-tree argument are the same thing.\"** A decision tree counts *outcomes*: with $n!$ possible answers and two children per node, the tree is deep. An adversary constructs the *input* as the algorithm runs, always answering so that the most work remains. The first is a counting bound and needs many distinct outputs; the second works even when there are only two possible outputs, where counting gives nothing."
  - "**\"A lower bound tells you the problem is hard.\"** It tells you the problem is hard *in that model*. Change the model — allow randomness, allow approximation, allow preprocessing, allow arithmetic on keys — and the bound may evaporate. Every useful lower bound in practice is really an instruction: 'to go faster, leave this model'."
  - "**\"A join algorithm can only be as fast as the size of its output.\"** True, and that is the point: for the triangle query on $N$ edges the output is at most $N^{3/2}$, yet every binary join plan builds an intermediate of size $\\Theta(N^2)$ in the worst case. The algorithm is asymptotically slower than the answer is big, by a factor of $\\sqrt{N}$."
  - "**\"The AGM bound is about estimating cardinality, so it is another estimator.\"** It is not an estimate. It is a *proved upper bound* on the output size of a join, given only the input sizes — no statistics, no assumptions about the data, no error. That is what makes it usable as a complexity target rather than as a planner heuristic."
masteryChecklist:
  - I can write the decision-tree argument and name the model it assumes.
  - I can design an adversary for a small problem and argue it stays consistent.
  - I can compute an AGM bound from a fractional edge cover.
  - I can explain to a colleague why the triangle query is the standard example of binary joins failing.
runtimes:
  - engine: python
  - engine: duckdb
    datasetId: package-registry
---

An upper bound is an algorithm. A lower bound is a statement about *every*
algorithm, including the ones nobody has written. Proving one requires saying
precisely what an algorithm is allowed to do, and that restriction is where all
the content is.

## Decision trees: counting the outcomes

Fix any deterministic algorithm that sorts by comparing pairs of elements. Run
it on all $n!$ permutations of $n$ distinct keys. Draw the tree whose internal
nodes are comparisons and whose branches are the two answers.

Two facts:

- Every permutation must reach a **different leaf**. If two permutations reached
  the same leaf, the algorithm made identical decisions on both and produced
  identical output, so it got one of them wrong.
- A binary tree of height $h$ has at most $2^h$ leaves.

So $2^h \ge n!$, giving $h \ge \log_2(n!)$. By Stirling,
$\log_2(n!) = n\log_2 n - n\log_2 e + O(\log n)$, hence

$$
h \;\ge\; n \log_2 n - 1.4427\,n + O(\log n) \;=\; \Omega(n \log n).
$$

$h$ is the worst-case number of comparisons. Done.

```python runnable id=decision-tree-bound
import math

print(f"{'n':>4}  {'n!':>22}  {'log2(n!)':>10}  {'n log2 n':>10}")
for n in (4, 8, 16, 64, 256, 1024):
    fact = math.lgamma(n + 1) / math.log(2)
    print(f"{n:>4}  {math.factorial(n) if n <= 16 else '(too big)':>22}"
          f"  {fact:>10.1f}  {n * math.log2(n):>10.1f}")
```

The two right-hand columns differ by exactly the $1.4427\,n$ term: 43% apart at
$n = 4$, 14% apart at $n = 1024$, and shrinking. Merge sort's $n\log_2 n$
comparisons are within a small constant of the bound, which is a much sharper
statement than "asymptotically optimal" — there is no room left for a
cleverer comparison sort to hide in.

:::warning{title="The model is the whole theorem"}
The argument used exactly one property: the algorithm learns about its input
*only* through binary comparisons. Radix sort looks at digits and runs in
$O(dn)$. Counting sort indexes an array by key value and runs in $O(n + k)$.
Neither contradicts anything, because neither is in the model.

So the bound is really an instruction: **if you want to sort faster than
$n \log n$, stop comparing.** That is a design directive, which is what a good
lower bound is for.
:::

## Adversary arguments: constructing the input as you go

The decision-tree argument needs many distinct outputs to count. For "find the
maximum" there are only $n$ possible answers, so counting gives
$\log_2 n$ — a useless bound, since the truth is $n - 1$.

The adversary technique gives the right answer. Instead of fixing an input, an
**adversary** answers each query on the fly, choosing whatever answer keeps the
most inputs alive, and only commits to a concrete input at the end. If it can
always stay consistent with at least two possible answers until $n-1$ queries
have been made, then no algorithm can finish sooner.

**Maximum needs $n - 1$ comparisons.** Call an element *defeated* once it has
lost a comparison. An element that has never lost could still be the maximum, so
an algorithm that stops with two undefeated elements has not determined the
answer. Each comparison defeats at most one element, and $n - 1$ elements must be
defeated. Hence at least $n - 1$ comparisons.

The adversary makes "at most one per comparison" tight:

```python runnable id=adversary-max
class Adversary:
    def __init__(self, n):
        self.n = n
        self.defeated = []     # indices, in the order they lost
        self.comparisons = 0

    def compare(self, i, j):
        """True iff a[i] > a[j], decided now, consistently with the past."""
        self.comparisons += 1
        di, dj = i in self.defeated, j in self.defeated
        if not di and not dj:
            self.defeated.append(j)      # defeat exactly one, never two
            return True
        if di and not dj:
            return False
        if dj and not di:
            return True
        return self.defeated.index(i) > self.defeated.index(j)

def scan_max(adv, n):
    best = 0
    for i in range(1, n):
        if adv.compare(i, best):
            best = i
    return best

def tournament_max(adv, n):
    alive = list(range(n))
    while len(alive) > 1:
        nxt = []
        for a in range(0, len(alive) - 1, 2):
            i, j = alive[a], alive[a + 1]
            nxt.append(i if adv.compare(i, j) else j)
        if len(alive) % 2:
            nxt.append(alive[-1])
        alive = nxt
    return alive[0]

for n in (8, 16, 64):
    for algo in (scan_max, tournament_max):
        adv = Adversary(n)
        algo(adv, n)
        print(f"n={n:<4} {algo.__name__:<16} comparisons={adv.comparisons}  (n-1={n-1})")
```

Both algorithms make exactly $n - 1$ comparisons, and the adversary proves no
algorithm makes fewer. The two techniques answer different questions:

| | Decision tree | Adversary |
| --- | --- | --- |
| Counts | distinct outputs | information still missing |
| Needs | many possible answers | a consistency invariant |
| Gives, for max | $\log_2 n$ — useless | $n - 1$ — tight |
| Gives, for sorting | $n\log_2 n$ — tight | also works, more effort |
| Feels like | combinatorics | a game against the algorithm |

The adversary technique also settles the sharper questions. Finding the maximum
**and** the minimum needs $\lceil 3n/2 \rceil - 2$ comparisons, and finding the
second-largest needs $n + \lceil \log_2 n \rceil - 2$. Both are adversary
arguments; neither follows from counting outputs.

:::checkpoint{id=cp-adversary rubric="answer consistently,keep two candidates alive,commit at the end"}
What is the property an adversary's answers must have for the argument to be
valid at all? Say what would go wrong if the adversary answered arbitrarily.
:::

:::exercise{ref=adversary-maximum}
:::

## The AGM bound: how big can a join get?

Now the same question about joins, and the answer is a genuinely modern theorem
that is shipping in engines today.

Take the **triangle query**:

$$
Q(a, b, c) \;\text{:-}\; R(a,b),\ S(b,c),\ T(c,a)
$$

with $|R| = |S| = |T| = N$. How many rows can it return?

A **fractional edge cover** assigns a weight $x_e \ge 0$ to each relation such
that for every attribute, the weights of the relations mentioning it sum to at
least 1. The **AGM bound** (Atserias, Grohe, Marx, 2008) says the output has at
most

$$
\prod_e |R_e|^{x_e}
$$

rows, for any fractional edge cover $x$.

For the triangle, $x = (\tfrac12, \tfrac12, \tfrac12)$ covers every attribute —
each of $a, b, c$ appears in exactly two relations, and $\tfrac12 + \tfrac12 = 1$.
So

$$
|Q| \;\le\; N^{1/2} \cdot N^{1/2} \cdot N^{1/2} \;=\; N^{3/2},
$$

and this is tight: a random graph with $N$ edges has $\Theta(N^{3/2})$ triangles.

```sql runnable id=agm-on-the-registry dataset=package-registry
-- The co-maintainer graph, with the triangle query's numbers laid out.
WITH edge AS (
  SELECT DISTINCT a.package_id AS x, b.package_id AS y
  FROM package_maintainers a
  JOIN package_maintainers b
    ON a.maintainer_id = b.maintainer_id AND a.package_id <> b.package_id
)
SELECT
  (SELECT count(*) FROM edge)                                   AS edge_rows,
  CAST(floor(pow((SELECT count(*) FROM edge), 1.5)) AS BIGINT)  AS agm_bound,
  (SELECT count(*) FROM edge r JOIN edge s ON s.x = r.y)        AS binary_intermediate,
  (SELECT count(*) FROM edge r
     JOIN edge s ON s.x = r.y
     JOIN edge t ON t.x = s.y AND t.y = r.x)                    AS triangle_rows;
```

56 directed edges, an AGM bound of 419, an intermediate result of 186, and 102
triangle rows (each of the 17 triangles appearing six times, once per rotation
and reflection). Everything is under the bound and nothing looks alarming,
because the graph is tiny and dense.

Now make the graph adversarial.

```sql runnable id=agm-worst-case dataset=package-registry
-- A hub: one vertex joined to 300 others, both directions. No triangles at all.
WITH
edge AS (
  SELECT 0 AS x, i AS y FROM range(1, 301) t(i)
  UNION ALL
  SELECT i, 0 FROM range(1, 301) t(i)
)
SELECT
  (SELECT count(*) FROM edge)                                   AS edge_rows,
  CAST(floor(pow((SELECT count(*) FROM edge), 1.5)) AS BIGINT)  AS agm_bound,
  (SELECT count(*) FROM edge r JOIN edge s ON s.x = r.y)        AS binary_intermediate,
  (SELECT count(*) FROM edge r
     JOIN edge s ON s.x = r.y
     JOIN edge t ON t.x = s.y AND t.y = r.x)                    AS triangle_rows;
```

600 edges. The AGM bound is 14,696. The **output is zero** — a star has no
triangles. And the first binary join produces **90,300** rows, more than six
times the AGM bound and infinitely more than the answer.

:::insight{title="Binary joins are provably suboptimal, not just unlucky here"}
Every classical query plan is a tree of two-way joins. On the triangle query
there are only three shapes and they are symmetric, so any plan must first
compute some pairwise join — say $R \bowtie S$ on attribute $b$. On the hub graph
that intermediate has $\Theta(N^2)$ rows while the final answer has at most
$N^{3/2}$.

So **no** binary join plan runs in $O(N^{3/2})$ time on this query. The gap is a
factor of $\sqrt{N}$, and at $N = 10^6$ that is a thousand.

This is not a cardinality-estimation failure. A perfect estimator would predict
90,300 exactly and the plan would still have to build them. The algorithm is
wrong, not the statistics.
:::

**Worst-case optimal joins** fix it. Instead of joining two relations at a time,
they process one *attribute* at a time, intersecting the relevant relations'
extensions for that attribute. Ngo, Porat, Ré and Rudra gave the first such
algorithm in 2012; Veldhuizen's **Leapfrog Triejoin** (2014) is the version
engines implement. For the triangle query it runs in $O(N^{3/2})$ — matching the
AGM bound, hence "worst-case optimal", and provably unreachable by any binary
plan.

On the hub graph, an attribute-at-a-time algorithm binds $a$, then intersects
$R$'s and $T$'s neighbourhoods to find candidate $b$ values, and finds the
intersection empty almost immediately. It never materialises 90,300 rows because
it never materialises a pairwise join at all.

:::exercise{ref=triangle-listing}
:::

::::track{depth=proof}
## Two bounds, one idea

The comparison bound and the AGM bound look unrelated. They are the same
argument in two costumes, and the costume is entropy.

**Sorting, restated in bits.** The output of a sort is one of $n!$ permutations,
so specifying it takes $\log_2 n!$ bits. Each comparison returns one bit. An
algorithm cannot extract more bits than it asks for, so it must ask at least
$\log_2 n!$ questions. The decision-tree picture is this counting argument drawn
as a diagram.

That framing tells you immediately when the bound does not apply: an operation
returning more than one bit — reading a digit, hashing a key, probing an array
by value — changes the arithmetic. $\Omega(n \log n)$ is a statement about a
**one-bit-per-query** budget.

**The AGM bound, restated in bits.** Let $(A, B, C)$ be a uniformly random
output tuple of the triangle query, so $H(A, B, C) = \log_2 |Q|$. The pair
$(A,B)$ must be a row of $R$, so $H(A, B) \le \log_2 |R|$; likewise
$H(B, C) \le \log_2 |S|$ and $H(C, A) \le \log_2 |T|$.

**Shearer's inequality** says that for any family of subsets covering each
variable at least $d$ times,

$$
d \cdot H(A, B, C) \;\le\; \sum_{\text{subsets } S} H(S).
$$

Here $\{A,B\}, \{B,C\}, \{C,A\}$ cover each of the three variables exactly twice,
so $d = 2$:

$$
2 \log_2 |Q| = 2H(A,B,C) \le H(A,B) + H(B,C) + H(C,A) \le 3\log_2 N,
$$

which rearranges to $\log_2 |Q| \le \tfrac32 \log_2 N$, that is
$|Q| \le N^{3/2}$. $\blacksquare$

The general AGM bound is the same computation with a fractional cover $x$ in
place of the uniform $\tfrac12$ weights, and the entropy inequality run in the
weighted form. Both of this lesson's bounds are the statement "you cannot know
more than you were told", applied once to comparisons and once to tuples.

:::proof{title="Why the comparison bound is exactly $n\log_2 n - 1.44n$"}
$\log_2(n!) = \sum_{k=1}^{n} \log_2 k$, and the sum is squeezed by integrals:

$$
\int_1^n \log_2 x \,\mathrm{d}x \;\le\; \sum_{k=1}^n \log_2 k \;\le\; \int_1^{n+1} \log_2 x \,\mathrm{d}x .
$$

With $\int \log_2 x\,\mathrm{d}x = x\log_2 x - x/\ln 2$, the lower integral is
$n\log_2 n - (n-1)/\ln 2$. So

$$
\log_2(n!) \;\ge\; n\log_2 n - 1.4427\,n + 1.4427 .
$$

At $n = 1000$ the right-hand side is 8,524, and $\log_2(1000!)$ itself is 8,529 —
the integral bound loses almost nothing. Merge sort uses at most
$n\lceil \log_2 n\rceil - 2^{\lceil \log_2 n\rceil} + 1 = 8{,}977$ comparisons,
within 5.3% of a bound that holds for every comparison sort that will ever be
written. It is rare to be able to say something that strong about an algorithm.
:::

## The adversary for finding the maximum, formally

Let $\mathcal{A}$ be any deterministic comparison algorithm claiming to return
the index of the maximum after $c$ comparisons. Run it against the adversary
above. Maintain the invariant:

> **Invariant.** At every point, the set of answers given so far is consistent
> with at least one total order on the elements, and the elements never
> defeated are exactly those that could still be the maximum under some such
> order.

*The invariant is maintained.* Each of the four cases of `compare` either
defeats exactly one previously-undefeated element (case 1) or answers using an
order already fixed among defeated elements (cases 2-4). Undefeated elements are
never compared with one another without one of them being defeated, so no two
undefeated elements have a forced relative order — any assignment putting all
undefeated elements above all defeated ones, in any internal order, is
consistent.

*The conclusion.* Suppose $\mathcal{A}$ halts with two or more undefeated
elements $u \ne v$ and returns $u$. Take the witness order that assigns the
largest value to $v$ — legal by the invariant. Then $\mathcal{A}$ is wrong on an
input consistent with every answer it received, so $\mathcal{A}$ is not correct.
Therefore a correct algorithm leaves at most one element undefeated, requiring
$n - 1$ elements to be defeated. Each comparison defeats at most one, so
$c \ge n - 1$. $\blacksquare$

Note what carried the argument: not counting, but the existence of **two
different completions** of the partial information. That is the shape of every
adversary argument, and it is why the technique still works when there are only
two possible outputs and counting says nothing at all.
::::

::::track{depth=systems}
## Worst-case-optimal joins in shipping systems

The AGM bound was proved in 2008 and the first worst-case-optimal algorithm
appeared in 2012. It is in production now, and that is unusually fast for a
complexity-theoretic result.

**LogicBlox / LevelHeaded** shipped Leapfrog Triejoin as the default join
strategy, which is what made the result famous outside theory.

**Umbra** (TU Munich) integrates worst-case-optimal joins into a
cost-based optimiser that chooses between a WCOJ and a binary plan per query,
because WCOJ is not always faster — it is *worst-case* optimal, and on acyclic
queries a binary plan with good statistics wins comfortably.

**DuckDB** added a specialised WCOJ path for cyclic subgraph patterns; its
authors' benchmarks show order-of-magnitude wins on triangle-shaped workloads
and no benefit elsewhere, which is exactly what the theory predicts.

**Kùzu**, **RelationalAI** and **DataFrog** all build on the same idea, and
graph query languages are where it matters most: a Cypher `MATCH` for a cyclic
pattern is a triangle query with a different syntax.

:::note{title="When it wins, stated as a rule"}
Worst-case-optimal joins beat binary plans when the query is **cyclic** — when
the join graph contains a cycle, so no relation can be eliminated by joining and
projecting. Yannakakis's algorithm already runs acyclic queries in time
$O(|\text{input}| + |\text{output}|)$, which is optimal and which binary plans
achieve. The whole advantage lives on cyclic patterns.

So the practical trigger is: **triangles, cycles, and self-joins that close a
loop.** Fraud rings, reciprocal-follow detection, co-purchase triangles,
same-address-different-account clusters. If your query's join graph has a cycle
and it is slow, the problem may be the join algorithm rather than the indexes,
and no amount of statistics tuning will fix it.
:::

**How to recognise the failure in a plan.** Look at the estimated and actual
rows on the *intermediate* operators, not the final one. A cyclic query whose
output is thousands of rows but whose first hash join produces tens of millions
is the shape from the runnable above. The classical fixes — reorder the joins,
add an index, tighten the filter — cannot help, because every ordering has the
same problem. What helps is decomposing the cycle by hand: materialise the
degree distribution, handle high-degree vertices separately from low-degree ones,
and you have hand-rolled the heavy/light split that the worst-case-optimal
algorithms use internally.
::::

:::quiz{id=quiz-l06 passing=3}
- id: q1
  prompt: "Radix sort runs in O(dn). Does it contradict the Ω(n log n) sorting bound?"
  options:
    - "Yes — it is a counterexample, so the bound must be wrong."
    - "No. The bound applies to algorithms whose only access to the keys is pairwise comparison. Radix sort reads digits, so it is outside the model."
    - "No, because O(dn) is actually Ω(n log n) when d = log n."
    - "Yes, but only for small n."
  answerIndex: 1
  explanation: >-
    A lower bound is always relative to a model. The decision-tree argument uses
    exactly one assumption — one bit of information per query — and radix sort
    violates it. Option 3 is a real observation for some key distributions but it
    is not why there is no contradiction: even with d fixed and small, radix sort
    is legal, because it never enters the model.
- id: q2
  prompt: "Why does the decision-tree argument fail to give a useful bound for 'find the maximum'?"
  options:
    - "Because finding the maximum has no comparisons."
    - "Because there are only n possible outputs, so counting leaves gives log2(n) — far below the true bound of n − 1."
    - "Because the decision tree is not binary for this problem."
    - "Because the maximum can be found without any information."
  answerIndex: 1
  explanation: >-
    The counting argument's strength scales with the number of distinct outputs.
    With n! outputs it is tight; with n outputs it gives log2(n), which is
    useless. The adversary argument does not count outputs at all — it counts how
    many candidates remain viable — which is why it reaches n − 1.
- id: q3
  prompt: "R, S and T each have N rows and the triangle query R(a,b), S(b,c), T(c,a) is evaluated. What does the AGM bound say?"
  options:
    - "The output has at most N³ rows, the size of the cross product."
    - "The output has at most N^(3/2) rows, from the fractional edge cover (1/2, 1/2, 1/2)."
    - "The output has at most N² rows, the size of the first binary join."
    - "The output size cannot be bounded without statistics."
  answerIndex: 1
  explanation: >-
    Each attribute appears in two of the three relations, so weights of 1/2 cover
    every attribute and the bound is N^(1/2) × N^(1/2) × N^(1/2) = N^(3/2). It is
    a proved bound from input sizes alone — no statistics, no assumptions — and
    it is tight. N² is the intermediate size a binary plan builds, which is the
    whole problem.
- id: q4
  prompt: "A cyclic query's output is 2,000 rows but its first hash join produces 40 million. What is the diagnosis?"
  options:
    - "The cardinality estimator is broken and needs better statistics."
    - "A missing index on the join key."
    - "Binary join plans are asymptotically suboptimal on cyclic queries — every join order has this problem, and the fix is a different join algorithm, not a different plan."
    - "The query should be rewritten as a recursive CTE."
  answerIndex: 2
  explanation: >-
    A perfect estimator would predict 40 million correctly and the plan would
    still have to build them. The symptom — intermediate results far larger than
    the output on a cyclic pattern — is the AGM gap, and the answer is a
    worst-case-optimal join, or a hand-rolled heavy/light decomposition that
    imitates one.
- id: q5
  prompt: "What must an adversary's answers satisfy for the lower-bound argument to work?"
  options:
    - "They must be drawn from a fixed input chosen in advance."
    - "They must be consistent — some concrete input agrees with every answer given — while leaving at least two possible final answers open for as long as possible."
    - "They must always be False, to slow the algorithm down."
    - "They must be random, so the algorithm cannot predict them."
  answerIndex: 1
  explanation: >-
    Consistency is what makes the argument valid: without a witness input, the
    adversary is describing a situation that cannot happen and proves nothing.
    Ambiguity is what makes it strong: as long as two different answers are still
    possible, the algorithm cannot have finished. Fixing the input in advance
    turns the argument into a single test case, which bounds nothing.
:::
