---
id: t5/s11/l03
title: Approximation, with the ratio actually proved
tier: t5-graduate
stage: s11-intractability
status: published
estimatedMinutes: 55
objectives:
  - State what an alpha-approximation guarantees, and what it does not.
  - Prove the 2-approximation ratio for the maximal-matching vertex cover algorithm.
  - Explain where the ln n bound for greedy set cover comes from, and why it cannot be improved.
  - Distinguish a PTAS from an FPTAS, and build the FPTAS for knapsack by rounding values.
  - Say why metric TSP has a constant-factor approximation and general TSP does not.
prerequisites: []
misconceptions:
  - "**\"A 2-approximation is usually about twice optimal.\"** It is *never worse* than twice optimal. On real inputs the maximal-matching cover often lands within a few percent of optimal. The ratio is a worst-case ceiling, and quoting it as a typical figure understates good algorithms and hides bad ones."
  - "**\"Greedy is a good heuristic, so it has a good ratio.\"** Greedy set cover's ratio is $\\ln n$, which grows without bound — and that is *tight*, not loose. There are instances where greedy is genuinely $\\ln n$ times worse. Meanwhile greedy for vertex cover, picking the highest-degree vertex each time, has ratio $\\Theta(\\log n)$, strictly worse than the trivial-looking matching algorithm's 2. Being sensible is not a guarantee."
  - "**\"You can always approximate an NP-hard problem well; the hardness is only about exactness.\"** General TSP admits no polynomial $\\alpha$-approximation for any constant $\\alpha$ unless P = NP — the proof is a one-paragraph reduction from Hamiltonian cycle. Approximability is its own hierarchy and NP-hardness says nothing about where a problem sits in it."
  - "**\"A PTAS solves the problem in polynomial time for any accuracy, so it is as good as an exact algorithm.\"** A PTAS is polynomial in $n$ for each fixed $\\varepsilon$, and the dependence on $\\varepsilon$ can be brutal — $O(n^{1/\\varepsilon})$ is a PTAS, and at $\\varepsilon = 0.01$ that is $n^{100}$. An **FPTAS** additionally requires polynomial dependence on $1/\\varepsilon$, which is what makes knapsack's version usable."
  - "**\"The approximation ratio is proved by comparing to the optimum, so you have to know the optimum.\"** You never compute it. Every ratio proof works by finding a quantity you *can* compute that lower-bounds (or upper-bounds) the optimum — the size of a matching, the LP relaxation's value, the weight of an MST — and comparing your output to that instead. Finding the right bound is the whole craft."
masteryChecklist:
  - I can prove the vertex-cover 2-approximation ratio, including the lower bound on OPT it relies on.
  - I can produce an instance where greedy set cover is strictly worse than optimal and explain the pattern.
  - I can tell a PTAS from an FPTAS by looking at the running time.
  - I can name the lower bound on the optimum that a given ratio proof leans on.
runtimes:
  - engine: python
---

An approximation algorithm is not a heuristic. A heuristic is code that usually
works. An approximation algorithm comes with a theorem.

For a minimisation problem, an algorithm is an **$\alpha$-approximation** when
for every instance $I$,

$$
\mathrm{ALG}(I) \le \alpha \cdot \mathrm{OPT}(I),
$$

with $\alpha \ge 1$. For maximisation the inequality flips and $\alpha \le 1$.
The quantifier is "for every instance", which is why you can ship it: there is no
input on which it fails, only inputs on which the bound is loose.

## Vertex cover in five lines, provably within a factor of two

```python runnable id=vc-approx
from itertools import combinations

def matching_cover(n, edges):
    """Take both endpoints of every edge whose ends are still uncovered."""
    cover = set()
    for u, v in edges:
        if u not in cover and v not in cover:
            cover.add(u)
            cover.add(v)
    return cover

def optimal_cover_size(n, edges):
    for size in range(n + 1):
        for sub in combinations(range(n), size):
            s = set(sub)
            if all(u in s or v in s for u, v in edges):
                return size
    return n

GRAPHS = [
    ("4-cycle",      4, [(0, 1), (1, 2), (2, 3), (3, 0)]),
    ("star",         5, [(0, 1), (0, 2), (0, 3), (0, 4)]),
    ("bowtie",       6, [(0, 1), (1, 2), (2, 0), (3, 4), (4, 5), (5, 3), (0, 3)]),
    ("tail + cycle", 7, [(0, 1), (0, 2), (1, 2), (1, 3), (3, 4), (4, 5), (5, 6), (6, 3)]),
    ("K4,4",         8, [(i, j) for i in range(4) for j in range(4, 8)]),
]
for name, n, edges in GRAPHS:
    alg = len(matching_cover(n, edges))
    opt = optimal_cover_size(n, edges)
    ratio = alg / opt if opt else 1.0
    print(f"{name:<14} alg={alg:>2}  opt={opt:>2}  ratio={ratio:.2f}")
```

No ratio exceeds 2, some land well under it, and $K_{4,4}$ hits it exactly.
Both facts matter: the bound holds on every input, and it is *tight*, so no
sharper analysis of this algorithm will produce a smaller constant.

:::insight{title="Why the trivial-looking algorithm beats the clever-looking one"}
The obvious greedy is "repeatedly take the highest-degree vertex". It looks
smarter and it is provably worse: its ratio is $\Theta(\log n)$, unbounded.
The matching algorithm wins because its output comes with a *certificate of
near-optimality* attached — the matching itself lower-bounds OPT. High-degree
greedy has no such object, so there is nothing to compare against.

The lesson generalises: an approximation algorithm is designed around the lower
bound, not around the intuition.
:::

:::checkpoint{id=cp-lower-bound rubric="matching,every edge needs an endpoint,OPT at least the matching size"}
The proof needs a quantity that is (a) computable and (b) never larger than
OPT. The algorithm builds a maximal matching along the way. Why must any vertex
cover have at least one vertex per matching edge, and why does that give the
bound?
:::

## Greedy set cover and the $\ln n$ barrier

Cover a universe of $n$ elements with as few of the given sets as possible.
Greedy takes, at each step, the set covering the most still-uncovered elements.

```python runnable id=set-cover-bait
def greedy_set_cover(universe, sets):
    remaining = set(universe)
    chosen = []
    while remaining:
        best, best_gain = None, 0
        for i, s in enumerate(sets):
            gain = len(remaining & set(s))
            if gain > best_gain:
                best, best_gain = i, gain
        if best is None:
            return None            # no cover exists
        chosen.append(best)
        remaining -= set(sets[best])
    return chosen

A  = list(range(0, 8))
B  = list(range(8, 16))
G1 = [4, 5, 6, 7, 12, 13, 14, 15]
G2 = [2, 3, 10, 11]
G3 = [0, 1, 8, 9]

universe = list(range(16))
print("greedy picks:", greedy_set_cover(universe, [G1, G2, G3, A, B]))
print("optimal is A + B, i.e. 2 sets")
```

Greedy takes three sets where two suffice. The instance is built by hand: `G1`
ties with `A` and `B` for the first pick, and once greedy commits to it, what
remains splits into two halves that no single set covers. Scale the construction
and greedy takes $\log_2 n$ sets where 2 would do.

**The bound.** Greedy never uses more than $H_n \le 1 + \ln n$ times the optimum,
where $H_n$ is the $n$-th harmonic number. The argument is a charging scheme:
when greedy covers a batch of $g$ new elements, charge each of them $1/g$, so
each set greedy picks costs exactly 1 in total charge. If OPT uses $k$ sets, then
at any moment some unpicked set covers at least $\frac{|R|}{k}$ of the $|R|$
remaining elements, so greedy's chosen set covers at least that many, so each
element is charged at most $\frac{k}{|R|}$ at the moment it is covered. Summing
over elements covered when $|R|$ ranges down from $n$ to 1 gives at most
$k \cdot H_n$.

**And it cannot be improved.** Feige (1998) proved that no polynomial algorithm
achieves ratio $(1 - \varepsilon)\ln n$ for any $\varepsilon > 0$ unless
NP has quasi-polynomial-time algorithms; Dinur and Steurer (2014) sharpened the
assumption to $\mathrm{P} \ne \mathrm{NP}$. Greedy is, up to lower-order terms,
the best possible polynomial algorithm for set cover. That is an unusual and
satisfying place for a five-line algorithm to end up.

## Metric TSP, and the wall next to it

General TSP has **no** constant-factor approximation unless P = NP, and the
proof takes a paragraph.

Suppose an $\alpha$-approximation existed for some constant $\alpha$. Given a
graph $G$ on $n$ vertices, build a TSP instance on the same vertices with
$d(u,v) = 1$ when $(u,v) \in E$ and $d(u,v) = \alpha n + 1$ otherwise. If $G$ has
a Hamiltonian cycle, the optimal tour costs exactly $n$, so the approximation
returns a tour of cost at most $\alpha n$ — which cannot use any long edge. If
$G$ has no Hamiltonian cycle, every tour uses at least one long edge and costs
more than $\alpha n$. So the approximation's output decides Hamiltonicity, which
is NP-complete. $\blacksquare$

Add the **triangle inequality** — $d(u,w) \le d(u,v) + d(v,w)$ — and everything
changes, because the reduction's enormous edges are no longer legal.

- **Double-tree, ratio 2.** Build a minimum spanning tree, walk it twice
  (an Euler tour of the doubled tree), then shortcut past repeated vertices. The
  MST is a lower bound on OPT — deleting one edge from an optimal tour leaves a
  spanning path, hence a spanning tree — so the doubled walk costs
  $2 \cdot \mathrm{MST} \le 2 \cdot \mathrm{OPT}$, and shortcutting only helps,
  by the triangle inequality.
- **Christofides-Serdyukov, ratio $3/2$.** Instead of doubling, add a minimum
  perfect matching on the odd-degree vertices of the MST. That matching costs at
  most $\mathrm{OPT}/2$, giving $\mathrm{MST} + \mathrm{OPT}/2 \le \frac32
  \mathrm{OPT}$. Published in 1976, unimproved until a
  $\frac32 - 10^{-36}$ result in 2020 — a genuinely famous stuck point.

Notice both proofs have the same shape as the vertex-cover proof: find a
computable lower bound on OPT (the matching, the MST), and bound your output
against *that*.

## PTAS, FPTAS, and knapsack

A **PTAS** is a family of algorithms, one per $\varepsilon > 0$, each running in
time polynomial in $n$ and returning within $(1 \pm \varepsilon)$ of optimal. The
running time may depend on $\varepsilon$ arbitrarily badly — $O(n^{1/\varepsilon})$
qualifies.

An **FPTAS** additionally requires the running time to be polynomial in
$1/\varepsilon$. Knapsack has one, and the trick is to throw away precision on
purpose.

The exact DP over values runs in $O(n \cdot \sum_i v_i)$ — pseudo-polynomial,
because $\sum v_i$ is exponential in the number of bits used to write the values
down. So shrink the values. With $n$ items, $v_{\max}$ the largest value, and

$$
K = \frac{\varepsilon\, v_{\max}}{n}, \qquad v_i' = \left\lfloor \frac{v_i}{K} \right\rfloor,
$$

the DP now runs in $O(n^2 v_{\max}/K) = O(n^3/\varepsilon)$, polynomial in both
$n$ and $1/\varepsilon$.

**The error.** Each item loses less than $K$ to the floor, so a solution with at
most $n$ items loses less than $nK = \varepsilon v_{\max}$ in total. And
$v_{\max} \le \mathrm{OPT}$, because the single most valuable item that fits is
itself a feasible solution. So the answer is at least
$\mathrm{OPT} - \varepsilon v_{\max} \ge (1 - \varepsilon)\mathrm{OPT}$.

```python runnable id=fptas-scaling
values  = [934, 1721, 405, 1290, 88, 1602, 723]
epsilon = 0.5
n, vmax = len(values), max(values)
K = epsilon * vmax / n
print(f"K = {K:.1f}")
print("original :", values)
print("scaled   :", [int(v / K) for v in values])
print(f"DP table shrinks from {sum(values)} columns to {sum(int(v / K) for v in values)}")
```

The DP table goes from 6,763 columns to 52 — a factor of 130 — and the answer is
still guaranteed within 50% of optimal. In practice it beats that guarantee by a
wide margin, because the bound assumes every item rounds down maximally and no
instance does. Note the item worth 88: it scales to 0 and effectively disappears,
which is exactly the $\varepsilon v_{\max}$ the analysis budgets for.

:::warning{title="Why knapsack has an FPTAS and TSP does not"}
An FPTAS for a problem with polynomially-bounded integer objective values would
let you set $\varepsilon$ small enough to force the exact optimum, solving an
NP-hard problem in polynomial time. So **strongly** NP-hard problems — those
that stay NP-hard even when all numbers in the input are bounded by a polynomial
in the input size — cannot have an FPTAS unless P = NP. TSP is strongly NP-hard.
Knapsack is not: bound the values by a polynomial and the DP solves it exactly.

That distinction, between weak and strong NP-hardness, is exactly the line
between "has an FPTAS" and "does not".
:::

:::exercise{ref=vertex-cover-two-approx}
:::

:::exercise{ref=greedy-set-cover}
:::

:::exercise{ref=knapsack-fptas}
:::

::::track{depth=proof}
## The 2-approximation ratio, proved

**Algorithm.** Scan the edges. When an edge $(u, v)$ has neither endpoint in the
cover, add both. Return the cover.

Let $M$ be the set of edges that triggered an insertion, and let $C$ be the
returned set, so $|C| = 2|M|$.

**Claim 1: $C$ is a vertex cover.**

Take any edge $(u, v)$. At the moment the scan reached it, either it triggered an
insertion — in which case both endpoints are in $C$ — or it did not, which by the
condition means at least one of $u, v$ was already in $C$. Vertices are never
removed, so at the end at least one endpoint of every edge is in $C$.

**Claim 2: $M$ is a matching.**

Suppose two edges of $M$ share a vertex $u$, and say $(u, v)$ was processed
first. Then $u \in C$ before the second edge is examined, so the second edge's
condition "neither endpoint in the cover" is false and it never enters $M$.
Contradiction. So no two edges of $M$ share a vertex.

**Claim 3: $\mathrm{OPT} \ge |M|$.**

Let $C^\star$ be a minimum vertex cover. Every edge of $M$ needs at least one of
its endpoints in $C^\star$. By Claim 2 the edges of $M$ are pairwise disjoint, so
those endpoints are $|M|$ *distinct* vertices, all in $C^\star$. Hence
$|C^\star| \ge |M|$.

**Conclusion.**

$$
|C| = 2|M| \le 2\,\mathrm{OPT}.
$$

$\blacksquare$

Every step is short, and Claim 3 is where the content is. It converts an
uncomputable quantity, OPT, into a computable one, $|M|$, and it does so without
ever finding an optimal cover.

:::proof{title="The bound is tight, and where the factor 2 is stuck"}
Take the complete bipartite graph $K_{n,n}$. Every edge triggers an insertion
until every vertex is taken, so the algorithm returns all $2n$ vertices, while
either side alone is a cover of size $n$. Ratio exactly 2, for every $n$. So no
sharper analysis of this algorithm exists.

The same factor 2 comes out of rounding the LP relaxation: the natural LP has
half-integral optimal solutions on odd cycles — every $x_v = 1/2$ — and rounding
$x_v \ge 1/2$ up to 1 doubles the cost. Two unrelated-looking algorithms, the
same constant, because both are bounded by the same LP.

**And 2 may be optimal.** Dinur and Safra (2005) ruled out any ratio below
$1.3606$ unless P = NP. Under the Unique Games Conjecture, Khot and Regev (2008)
showed no ratio $2 - \varepsilon$ is achievable at all. Nobody has beaten
$2 - \Theta(1/\sqrt{\log n})$ in fifty years. The five-line algorithm you wrote
above may well be the best that will ever exist.
:::

**The general shape of a ratio proof.** Every one in this lesson is:

1. Identify a quantity $L$ computable in polynomial time.
2. Prove $L \le \mathrm{OPT}$ (for minimisation). This is the creative step.
3. Prove $\mathrm{ALG} \le \alpha L$ by construction.
4. Chain: $\mathrm{ALG} \le \alpha L \le \alpha\, \mathrm{OPT}$.

Vertex cover uses $L = |M|$. Metric TSP uses $L = \mathrm{MST}$. Most modern
results use $L = $ the value of an LP or SDP relaxation, and the ratio is then
called the *integrality gap* — which is the honest name, because it bounds how
much the proof technique itself can ever deliver.
::::

::::track{depth=systems}
## Where approximation shows up in machine learning

Most of the algorithms in a working ML pipeline are approximation algorithms
with published ratios, and knowing the ratio changes how you use them.

**k-means++ is an $O(\log k)$-approximation.** Plain Lloyd's algorithm has no
approximation guarantee whatsoever — it converges to a local optimum that can be
arbitrarily bad. The k-means++ seeding rule (sample the next centre with
probability proportional to squared distance from the nearest existing centre)
gives $\mathbb{E}[\mathrm{cost}] \le 8(\ln k + 2)\,\mathrm{OPT}$, proved by
Arthur and Vassilvitskii in 2007. It is why `sklearn`'s default `init` is
`k-means++` and why `n_init` exists: the guarantee is in expectation, so
repetition is part of the algorithm, exactly as in Lesson 4.

**Submodular maximisation gives $1 - 1/e \approx 0.632$.** Feature selection,
coreset and active-learning batch selection, and data-subset selection are
frequently posed as "choose $k$ items maximising a monotone submodular utility".
Nemhauser, Wolsey and Fisher (1978) proved that plain greedy achieves
$1 - 1/e$ of optimal, and Feige's set-cover result implies no polynomial
algorithm does better. When someone says "we just take the top-$k$ greedily",
that is not a shrug — it is a $0.632$-approximation with a matching hardness
bound.

**Decision-tree induction is greedy because the exact problem is NP-hard.**
Building the optimal decision tree is NP-complete (Hyafil and Rivest, 1976), so
CART and every descendant choose the locally best split. No ratio is known,
which is why "optimal decision tree" solvers built on MILP or SAT exist as a
separate research line — they use the exponential-but-fast route from Lesson 1.

**Approximate nearest neighbour trades recall for latency.** HNSW and IVF-PQ do
not return the true nearest neighbours. The quantity you monitor,
`recall@k`, is the empirical approximation ratio, and every vector database
exposes a knob (`efSearch`, `nprobe`) that moves along the same curve
$\varepsilon$ moves along in the FPTAS.

**Approximate query processing is the same idea in the database.** `APPROX_COUNT_DISTINCT`
is HyperLogLog with a relative error around $1.04/\sqrt{m}$; `TABLESAMPLE`
trades a confidence interval for a scan. The engine will not tell you the ratio
unless you ask for it, and a dashboard built on approximate aggregates without
an error bar is a heuristic wearing an algorithm's clothes.

:::note{title="The one habit worth taking from this"}
When you ship an approximation, ship the lower bound too. Vertex cover: log
$|M|$ next to $|C|$ and you know the gap on every real instance. Set cover: log
$|R|/k$. Knapsack: log the LP bound or the fractional-greedy value. It costs
almost nothing and it converts "the heuristic seems fine" into a number that
appears on a graph.
:::
::::

:::quiz{id=quiz-l03 passing=3}
- id: q1
  prompt: "The maximal-matching vertex cover algorithm returns 40 vertices. What do you know about the optimum?"
  options:
    - "It is exactly 20."
    - "It is at least 20, since the algorithm added two vertices per matching edge and every matching edge needs a distinct vertex in any cover."
    - "It is at most 20."
    - "Nothing without running an exact solver."
  answerIndex: 1
  explanation: >-
    40 vertices means 20 matching edges. Those edges are pairwise disjoint and
    each needs an endpoint in any cover, so OPT ≥ 20 — and OPT ≤ 40 since the
    algorithm's output is itself a cover. You get a two-sided bracket for free,
    which is the practical payoff of the ratio proof.
- id: q2
  prompt: "Which running time describes an FPTAS but not merely a PTAS?"
  options:
    - "O(n^(1/ε))"
    - "O(2^(1/ε) · n²)"
    - "O(n³/ε)"
    - "O(n log n) for every ε"
  answerIndex: 2
  explanation: >-
    An FPTAS must be polynomial in n AND in 1/ε. The first two are polynomial in
    n for fixed ε but blow up in 1/ε, so they are PTASes only. The last would be
    an exact algorithm in disguise — no dependence on ε at all — which for an
    NP-hard problem would prove P = NP.
- id: q3
  prompt: "Why does general TSP have no constant-factor approximation while metric TSP has a 3/2 one?"
  options:
    - "Metric instances are smaller."
    - "Without the triangle inequality you can make non-edges astronomically expensive, so any constant-factor approximation would have to avoid them entirely and would therefore decide Hamiltonicity."
    - "The MST lower bound does not exist for general graphs."
    - "Christofides' algorithm requires Euclidean coordinates."
  answerIndex: 1
  explanation: >-
    The reduction sets non-edge distances to αn + 1, so a tour within a factor α
    of optimal cannot use one — meaning the approximation would solve
    Hamiltonian cycle. The triangle inequality forbids exactly that gadget.
    MSTs exist for any weighted graph; what fails without the metric is the
    shortcutting step, since skipping a vertex could cost more than going
    through it.
- id: q4
  prompt: "Greedy set cover is a (1 + ln n)-approximation. What does Feige's 1998 result add?"
  options:
    - "That greedy is optimal among greedy algorithms."
    - "That no polynomial algorithm achieves ratio (1 − ε) ln n unless P = NP, so greedy is essentially the best possible."
    - "That the ln n bound can be improved to a constant for sparse instances."
    - "That set cover is NP-complete."
  answerIndex: 1
  explanation: >-
    The upper bound alone leaves open that something cleverer exists. Feige's
    inapproximability result closes it: the analysis is not loose, the problem
    genuinely is that hard. NP-completeness of set cover was known from Karp's
    1972 list and says nothing about approximability.
- id: q5
  prompt: "You round the values in a knapsack instance down to multiples of K = ε·v_max/n. Why does the total error stay within ε·OPT?"
  options:
    - "Because rounding is unbiased, so errors cancel."
    - "Because any solution has at most n items, each losing under K, for a total under nK = ε·v_max — and v_max ≤ OPT since the best single item that fits is feasible."
    - "Because the DP is exact on the rounded values."
    - "Because ε is small by assumption."
  answerIndex: 1
  explanation: >-
    Two facts multiply: at most n items each losing less than K, and v_max being
    a lower bound on OPT. The DP being exact on rounded values is needed for
    correctness but does not bound the error, and the errors do not cancel —
    flooring only ever loses value.
:::
