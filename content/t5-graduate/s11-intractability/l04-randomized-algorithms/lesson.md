---
id: t5/s11/l04
title: Randomness as an algorithmic resource
tier: t5-graduate
stage: s11-intractability
status: published
estimatedMinutes: 50
objectives:
  - Distinguish Las Vegas from Monte Carlo algorithms, and one-sided from two-sided error.
  - Derive the success probability of Karger's contraction algorithm.
  - Turn a per-run success probability into a repetition count for a stated confidence.
  - Explain why a randomised algorithm's guarantee does not depend on the input distribution.
prerequisites: []
misconceptions:
  - "**\"Randomised algorithms work because real inputs are random.\"** Backwards. The point of randomising is that the guarantee holds for **every** input, including adversarial ones, because the randomness is in the algorithm rather than in the data. Quicksort with a fixed pivot has a worst-case input; quicksort with a random pivot has no worst-case input, only unlucky runs."
  - "**\"A Monte Carlo algorithm that is right 99% of the time is 99% reliable, full stop.\"** Repetition changes that number, and how it changes depends on the error being one-sided. Freivalds' test never says 'equal' when the matrices differ in a way it detected, so ten independent runs cut the error to $2^{-10}$. A two-sided error needs a majority vote and a Chernoff bound instead, which needs many more repetitions for the same confidence."
  - "**\"Las Vegas algorithms can run forever, so they are riskier.\"** Their running time is a random variable with a finite expectation and, for the usual ones, exponentially decaying tails. Randomised quickselect's probability of taking more than $10n$ comparisons is minuscule. The genuine trade is: Las Vegas gives up a running-time guarantee, Monte Carlo gives up a correctness guarantee, and you choose which of the two you can tolerate."
  - "**\"Karger's algorithm has a 2/n² chance of working, so it is useless.\"** $2/n^2$ per attempt with $n^2 \\ln(1/\\delta)/2$ independent attempts drives the failure probability below $\\delta$, and the whole thing still runs in polynomial time. A tiny per-run success probability is fine as long as it is polynomially small rather than exponentially small — that is the entire criterion."
  - "**\"Seeding the generator makes the analysis invalid.\"** A fixed seed makes a run reproducible, which is what testing needs. It does not change the distribution the analysis is about. What *does* break the guarantee is letting an adversary see the seed — which is exactly the hash-flooding attack, and why hash functions in production are keyed."
masteryChecklist:
  - I can classify a randomised algorithm as Las Vegas or Monte Carlo from its failure mode.
  - I can derive Karger's per-run success probability and explain where each factor comes from.
  - I can compute how many repetitions a stated confidence requires.
  - I can say what a randomised algorithm's guarantee is quantified over, and why that beats an average-case analysis.
runtimes:
  - engine: python
---

Randomness buys you two different things and they are not interchangeable.

- A **Las Vegas** algorithm is always correct; its *running time* is a random
  variable. Randomised quickselect, randomised quicksort, skip lists.
- A **Monte Carlo** algorithm always finishes on time; its *answer* may be
  wrong. Karger's min cut, Freivalds' product check, Miller-Rabin, Bloom
  filters, HyperLogLog.

Two knobs, and you have to say which one you turned.

## The error can be one-sided, and that is worth a lot

```python runnable id=freivalds
import random

def matvec(M, x):
    return [sum(M[i][j] * x[j] for j in range(len(x))) for i in range(len(M))]

def freivalds(A, B, C, trials):
    """Is C == A @ B?  Never wrong when it answers False."""
    n = len(A)
    for _ in range(trials):
        x = [random.randint(0, 1) for _ in range(n)]
        if matvec(A, matvec(B, x)) != matvec(C, x):
            return False
    return True

random.seed(0)
A = [[1, 2], [3, 4]]
B = [[5, 6], [7, 8]]
C = [[19, 22], [43, 50]]        # the true product
wrong = [[19, 27], [43, 45]]    # rows still sum correctly, entries do not

print("true product   :", freivalds(A, B, C, 10))
print("wrong product  :", freivalds(A, B, wrong, 10))
print("all-ones vector would say:", matvec(A, matvec(B, [1, 1])) == matvec(wrong, [1, 1]))
```

Verifying $C = AB$ by computing $AB$ costs $O(n^3)$ with the schoolbook method.
Freivalds costs $O(n^2)$ per trial, because $A(Bx)$ is two matrix-vector
products.

The error is **one-sided**: if the algorithm says `False`, it has produced a
vector $x$ with $ABx \ne Cx$, which is a proof. If it says `True`, it might be
wrong — with probability at most $1/2$ per trial, hence $2^{-t}$ after $t$
independent trials. Twenty trials puts the error under one in a million and the
cost is still $O(n^2)$ for any fixed confidence.

Notice the last line of output. A *deterministic* single check with the all-ones
vector is fooled by the wrong matrix, because its error happens to cancel along
each row. That is the whole argument for randomising: any fixed vector has a
family of wrong matrices it cannot see, and an adversary who knows your vector
can construct one. A random vector has no such family.

:::insight{title="Where the 1/2 comes from"}
Let $D = AB - C \ne 0$, so some entry $d_{ij} \ne 0$. Write $x$'s coordinates as
independent uniform bits. Fix every coordinate except $x_j$. Then
$(Dx)_i = d_{ij}x_j + s$ where $s$ is determined by the other coordinates. Both
choices of $x_j$ cannot give zero, since $d_{ij} \ne 0$. So at least one of the
two values of $x_j$ makes $(Dx)_i \ne 0$, which happens with probability at
least $1/2$.

This is the **principle of deferred decisions** and it is the standard move:
condition on everything except one random choice, then show that one choice
alone already gives you the bound.
:::

## Karger's contraction algorithm

The global minimum cut: partition the vertices into two non-empty sides
minimising the number of edges crossing. Karger's algorithm is one idea.

**Repeatedly pick a uniformly random edge and contract it** — merge its two
endpoints into one vertex, keeping parallel edges and dropping self-loops. Stop
at two vertices. The edges between them are a cut. Return it.

```python runnable id=karger
import random

def contract_once(n, edges):
    parent = list(range(n))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    live = list(edges)
    remaining = n
    while remaining > 2 and live:
        u, v = live[random.randrange(len(live))]
        ru, rv = find(u), find(v)
        if ru != rv:
            parent[ru] = rv
            remaining -= 1
            live = [(a, b) for a, b in live if find(a) != find(b)]
    return sum(1 for a, b in edges if find(a) != find(b))

# Two K4s joined by two edges. The minimum cut is those two edges.
E = [(0,1),(0,2),(0,3),(1,2),(1,3),(2,3),
     (4,5),(4,6),(4,7),(5,6),(5,7),(6,7),
     (0,4),(3,7)]

random.seed(0)
single = [contract_once(8, E) for _ in range(10)]
print("ten single runs:", single)
print("best of those  :", min(single))
random.seed(0)
print("best of 200    :", min(contract_once(8, E) for _ in range(200)))
```

A single run is unreliable — most of those ten answers are wrong, and wrong
means *too large*, never too small, because whatever the algorithm returns is a
genuine cut. Repetition fixes it.

That one-sidedness matters: the algorithm's output is always an upper bound on
the true minimum, so `min` over independent runs is monotone in the number of
runs and never overshoots.

:::checkpoint{id=cp-amplify rubric="independent repetitions,failure probability multiplies,1 minus p to the t"}
A single run succeeds with probability $p$. You run it $t$ times independently
and keep the best answer. Write down the probability that *all* $t$ runs fail,
and say what you need for that to drop below $\delta$.
:::

## Amplification, made concrete

Karger's per-run success probability is at least $\frac{2}{n(n-1)}$ — derived in
the proof track below. Write $p$ for it. Independent runs fail together with
probability $(1-p)^t$, and using $1 - p \le e^{-p}$,

$$
(1-p)^t \le e^{-pt} \le \delta
\quad\Longleftrightarrow\quad
t \ge \frac{\ln(1/\delta)}{p} = \frac{n(n-1)\ln(1/\delta)}{2}.
$$

For $n = 100$ and $\delta = 10^{-6}$ that is about 683,000 runs. Each run is
$O(n^2)$, so the whole thing is $O(n^4 \log(1/\delta))$ — polynomial, correct
with any confidence you name, and the guarantee does not depend on the graph.

Karger and Stein later brought this to $O(n^2\log^3 n)$ by observing that early
contractions are the safe ones, so the recursion should branch only near the
end. The idea in this lesson is the one worth having; the refinement is an
exercise in where to spend the repetitions.

:::warning{title="Independence is doing all the work"}
$(1-p)^t$ is only correct when the runs are independent. Reusing a random
sequence, deriving all trials from one seed by a deterministic transformation,
or sharing state between runs breaks the product rule and the amplification
argument evaporates.

This is not hypothetical. Reusing a nonce across signatures leaks private keys;
correlated "independent" samples are how Monte Carlo simulations produce
confident wrong answers. When you claim amplification, say what makes the runs
independent.
:::

:::note{title="The same trade, inside your database"}
Every one of these is a Monte Carlo algorithm you have already run.

`APPROX_COUNT_DISTINCT` is HyperLogLog: it answers with a relative error around
$1.04/\sqrt{m}$ for $m$ registers, in kilobytes rather than gigabytes, and it can
be wrong. `TABLESAMPLE` is Monte Carlo with the error expressed as a confidence
interval. A Bloom filter in a join's runtime filter has one-sided error in
exactly Freivalds' sense — "definitely not present" is trustworthy, "possibly
present" is not — which is why it can prune a probe side without changing the
result.

And the randomness in a hash join's seed is there for the reason this lesson
started with. A fixed hash function has adversarial inputs that all collide;
per-process seeding means no input is bad, only unlucky runs are. That is
hash flooding, and the fix is the definition of a randomised algorithm.
:::

:::exercise{ref=karger-min-cut}
:::

:::exercise{ref=freivalds-check}
:::

::::track{depth=proof}
## Karger's success probability

Fix any particular minimum cut $C$ with $|C| = k$. We bound the probability that
the algorithm never contracts an edge of $C$ — if it never does, the two
surviving vertices are exactly the two sides of $C$, and the algorithm outputs
$C$.

**Step 1: every vertex has degree at least $k$.**

If some vertex $v$ had degree $d < k$, then the cut separating $\{v\}$ from
everything else would have $d < k$ edges, contradicting minimality of $k$.

**Step 2: the graph has at least $nk/2$ edges.**

Sum of degrees $\ge nk$, and each edge contributes 2 to that sum.

**Step 3: the first contraction misses $C$ with probability at least
$1 - 2/n$.**

The edge is drawn uniformly from $|E| \ge nk/2$ edges, of which $k$ belong to
$C$:

$$
\Pr[\text{first contraction hits } C] = \frac{k}{|E|} \le \frac{k}{nk/2} = \frac{2}{n}.
$$

**Step 4: the argument repeats on the contracted graph.**

Contraction never creates a smaller cut — every cut of the contracted graph is a
cut of the original, so the minimum cut of the contracted graph is at least $k$.
And if $C$ has survived, it is still a cut of the contracted graph with exactly
$k$ edges, so it is still minimum. After $i$ contractions there are $n - i$
vertices, and Steps 1-3 apply verbatim with $n$ replaced by $n - i$:

$$
\Pr[(i{+}1)\text{-th contraction misses } C \mid C \text{ survived so far}]
\ \ge\ 1 - \frac{2}{n-i}.
$$

**Step 5: multiply.**

The algorithm performs $n - 2$ contractions, for $i = 0, \dots, n-3$:

$$
\Pr[C \text{ survives}] \ \ge\ \prod_{i=0}^{n-3}\left(1 - \frac{2}{n-i}\right)
= \prod_{i=0}^{n-3} \frac{n-i-2}{n-i}
$$

Write out the product with $j = n - i$ running from $n$ down to $3$:

$$
\frac{n-2}{n}\cdot\frac{n-3}{n-1}\cdot\frac{n-4}{n-2}\cdots\frac{2}{4}\cdot\frac{1}{3}
$$

Every numerator cancels against the denominator two places later. Only the first
two denominators $n$ and $n-1$ and the last two numerators $2$ and $1$ survive:

$$
\Pr[C \text{ survives}] \ \ge\ \frac{2}{n(n-1)} = \binom{n}{2}^{-1}.
$$

$\blacksquare$

:::proof{title="Two corollaries the proof hands you for free"}
**A graph has at most $\binom{n}{2}$ distinct minimum cuts.** The argument
holds for *any* fixed minimum cut $C$, and the events "the algorithm outputs
$C$" are disjoint across distinct cuts. Disjoint events each of probability at
least $\binom{n}{2}^{-1}$ cannot number more than $\binom{n}{2}$. This is a
purely combinatorial fact about graphs, proved by analysing an algorithm — and
it is tight: the $n$-cycle has exactly $\binom{n}{2}$ minimum cuts, one per pair
of edges removed.

**Where the repetitions should go.** The failure probability per contraction is
$2/(n-i)$, which is small early and approaches 1 at the end. So the first
contractions are nearly free and the last ones are where the algorithm fails.
Karger-Stein exploits exactly this: contract down to $n/\sqrt{2}$ vertices once,
then recurse **twice** on that smaller graph. Success probability per branch is
about $1/2$, the recursion has depth $\log n$, and the total drops from
$O(n^4)$ to $O(n^2 \log^3 n)$. The analysis told you where to spend, which is
what a good analysis is for.
:::
::::

:::quiz{id=quiz-l04 passing=3}
- id: q1
  prompt: "Randomised quickselect always returns the correct k-th smallest element, but its running time varies. What is it?"
  options:
    - "Monte Carlo, because it uses randomness."
    - "Las Vegas — correctness is guaranteed, running time is the random variable."
    - "Neither; it is deterministic once the seed is fixed."
    - "Both, since the running time affects whether it finishes."
  answerIndex: 1
  explanation: >-
    The split is about what the randomness is allowed to damage. Las Vegas risks
    time, Monte Carlo risks correctness. Fixing a seed makes one run
    reproducible but does not change which quantity is random over the choice of
    seed.
- id: q2
  prompt: "Freivalds' check says True after 10 trials. What is the failure probability, and why is that the right bound?"
  options:
    - "1/2, since each trial is a coin flip."
    - "At most 2^-10, because the error is one-sided: a wrong C is caught with probability at least 1/2 per independent trial, and only an all-miss run reports True."
    - "Zero, because ten trials cover every possible vector."
    - "It cannot be bounded without knowing the matrices."
  answerIndex: 1
  explanation: >-
    One-sided error is what makes the bound this clean. False is always
    trustworthy, so the only failure mode is ten independent misses, each of
    probability at most 1/2. A two-sided error would need a majority vote and a
    Chernoff bound, and would need far more trials for the same confidence.
- id: q3
  prompt: "In Karger's proof, why does the bound 1 - 2/n improve to 1 - 2/(n-i) rather than getting worse?"
  options:
    - "Because contraction removes edges from the cut."
    - "Because the contracted graph has fewer vertices, so the same 'at least nk/2 edges' argument gives a weaker edge bound and a larger hit probability — the per-step odds get worse, and the product is what saves it."
    - "Because the minimum cut shrinks as the graph shrinks."
    - "Because the surviving vertices become more connected."
  answerIndex: 1
  explanation: >-
    The per-step failure probability 2/(n-i) grows as i grows, so later
    contractions are riskier. The minimum cut cannot shrink under contraction —
    that is Step 4 — which is what lets the argument be reapplied at all. The
    telescoping product turns the growing per-step risk into 2/(n(n-1)).
- id: q4
  prompt: "An algorithm succeeds with probability p = 0.001 per run. How many independent runs push the failure probability below 10^-6?"
  options:
    - "1,000 — one over p."
    - "About 13,816 — ln(10^6)/p, since (1-p)^t ≤ e^{-pt}."
    - "10^6, one per unit of the target probability."
    - "It is impossible; p is too small."
  answerIndex: 1
  explanation: >-
    (1-p)^t ≤ e^{-pt}, so t ≥ ln(1/δ)/p = 13.8155/0.001 ≈ 13,816. One over p
    gives failure probability about 1/e ≈ 0.37, not 10^-6 — a useful thing to
    remember, since 1/p repetitions is the answer people reach for.
- id: q5
  prompt: "Why is a randomised algorithm's guarantee stronger than an average-case analysis of a deterministic one?"
  options:
    - "It is not; they are the same statement written differently."
    - "The randomness is in the algorithm, so the guarantee holds for every input — whereas an average-case bound holds only for inputs drawn from the assumed distribution, which an adversary need not respect."
    - "Randomised algorithms are faster in the worst case."
    - "Average-case analysis cannot handle exponential running times."
  answerIndex: 1
  explanation: >-
    Quicksort with a first-element pivot is O(n log n) on average over random
    inputs and quadratic on sorted ones, which is the input you actually get.
    With a random pivot the expectation is over the algorithm's own coins, so no
    input is bad — only unlucky runs are, and they are independent of who chose
    the input.
:::
