---
id: t1/s02/l03
title: Solving recurrences, and where the Master Theorem quits
tier: t1-foundations
stage: s02-asymptotics-and-recursion
status: published
estimatedMinutes: 45
objectives:
  - Turn a recursive function into a recurrence and solve it by summing its recursion tree level by level.
  - Apply the Master Theorem by comparing a against b to the power k, and state which of its three cases you are in.
  - Name three shapes of recurrence the Master Theorem cannot solve, and say why each one escapes it.
  - Prove an asymptotic bound by substitution, including why a sloppy induction appears to prove a false bound.
prerequisites:
  - t1/s02/l02
misconceptions:
  - "**\"The Master Theorem solves recurrences.\"** It solves one family: $T(n) = a\\,T(n/b) + f(n)$ with $a$ and $b$ constant and $f$ polynomially comparable to $n^{\\log_b a}$. `T(n) = T(n-1) + n`, `T(n) = T(n/3) + T(2n/3) + n` and `T(n) = 2T(n/2) + n/\\log n` are all ordinary recurrences and none of them is in that family. The recursion tree solves all four."
  - "**\"Case 2 is when the work is evenly split.\"** Case 2 is when the *total work per level* is the same at every level. That happens because $a$ subproblems of size $n/b$ each doing $f(n/b)$ work multiply back out to $f(n)$ — a statement about how $a$, $b$ and $f$ interact, not about balance in the split."
  - "**\"If the induction goes through, the bound is proved.\"** Substitution requires the *same* constant $c$ on both sides. Deriving $T(n) \\le cn + n$ and declaring it $O(n)$ silently lets $c$ grow with $n$, which proves nothing — and this exact slip 'proves' that mergesort is linear."
  - "**\"$\\log n$ levels means the answer has a $\\log n$ in it.\"** Every divide-by-$b$ recurrence has $\\log_b n$ levels. Whether a $\\log$ survives into the answer depends on whether the per-level totals form a flat series (it survives) or a geometric one (it does not). $T(n) = 2T(n/2) + 1$ has $\\log_2 n$ levels and solves to $\\Theta(n)$."
masteryChecklist:
  - Given a recursive function, I can write its recurrence and draw two levels of its tree.
  - I can compute the per-level work of a recursion tree and say whether the series is flat, increasing or decreasing.
  - I can apply the Master Theorem using integer arithmetic instead of a logarithm, and say why that is more reliable.
  - I can carry out a substitution proof and identify where a proof of a false bound breaks.
runtimes:
  - engine: python
---

A recurrence is what you get when you write a recursion's cost down honestly.
Solving it is turning $T(n) = 2T(n/2) + n$ into $\Theta(n\log n)$ by argument
rather than by recognition. There is one method that always works, one theorem
that works often and fast, and a specific list of recurrences the theorem
refuses. All three are in this lesson, and the theorem is the least important of
them.

## The recursion tree is the method

Draw the tree of calls. Annotate each node with its **local** work — what the
call does apart from its recursive calls. Then add the tree up level by level,
because levels are where the pattern lives.

For $T(n) = 2T(n/2) + n$:

```
level 0:              n                          total: n
                    /   \
level 1:         n/2     n/2                     total: n
                /  \     /  \
level 2:      n/4  n/4  n/4  n/4                 total: n
                    ...
level log2(n):  1  1  1  ...  1   (n of them)    total: n
```

Level $i$ holds $2^i$ nodes of size $n/2^i$, each doing $n/2^i$ local work. The
$2^i$ and the $1/2^i$ cancel: **every level totals $n$.** There are
$\log_2 n + 1$ levels. So $T(n) = \Theta(n\log n)$.

Change one thing and the answer changes completely.

```python runnable id=three-recurrences
import math

def unroll(a, split, local, kmax):
    """T(2^k) computed bottom-up. `local` is the non-recursive work at size n."""
    values = {1: 1}
    for k in range(1, kmax + 1):
        n = 2 ** k
        values[n] = a * values[n // split] + local(n)
        # `a` subproblems of size n/split, plus this call's own work.
    return values

flat  = unroll(2, 2, lambda n: n, 20)   # T(n) = 2T(n/2) + n
leafy = unroll(2, 2, lambda n: 1, 20)   # T(n) = 2T(n/2) + 1
thin  = unroll(1, 2, lambda n: 1, 20)   # T(n) = T(n/2) + 1

print(f"{'n':>9} {'2T(n/2)+n':>12} {'/(n log n)':>11} {'2T(n/2)+1':>10} {'/n':>6} {'T(n/2)+1':>9} {'/log n':>7}")
for k in (4, 8, 12, 16, 20):
    n = 2 ** k
    print(f"{n:>9} {flat[n]:>12} {flat[n]/(n*math.log2(n)):>11.4f}"
          f" {leafy[n]:>10} {leafy[n]/n:>6.2f} {thin[n]:>9} {thin[n]/math.log2(n):>7.2f}")
```

Three recurrences, three different answers, and the ratios in the table are what
tell you so — the same doubling-ratio instinct from Stage 1, pointed at a
closed form instead of at a program.

- $T(n) = 2T(n/2) + n$: every level totals $n$, $\log n$ levels, $\Theta(n\log n)$.
- $T(n) = 2T(n/2) + 1$: level $i$ totals $2^i$, so the **last** level dominates and
  the sum is $2^{\log_2 n} = n$. $\Theta(n)$ — the $\log n$ levels leave no trace.
- $T(n) = T(n/2) + 1$: one node per level, one unit each, $\Theta(\log n)$.

:::insight{title="Three regimes, and that is all there are"}
Sum the tree by levels and the series is one of exactly three things.

| Per-level series | Dominated by | Answer |
| --- | --- | --- |
| increasing geometric | the last level — the leaves | $\Theta(\text{number of leaves})$ |
| flat | nothing; every level contributes equally | $\Theta(\text{level total} \times \text{depth})$ |
| decreasing geometric | the first level — the root | $\Theta(\text{root work})$ |

The Master Theorem is these three rows, with the arithmetic done in advance. It
is a lookup table, not an insight, and the insight is the table above.
:::

## The Master Theorem

For $T(n) = a\,T(n/b) + f(n)$ with constants $a \ge 1$, $b > 1$, the whole
question is how $f(n)$ compares against the **watershed function**
$n^{\log_b a}$ — which is the number of leaves in the tree, since the tree has
$\log_b n$ levels and branches $a$ ways.

$$
\text{number of leaves} \;=\; a^{\log_b n} \;=\; n^{\log_b a}
$$

| Case | Condition | Result | Regime |
| --- | --- | --- | --- |
| 1 | $f(n) = O\!\left(n^{\log_b a - \varepsilon}\right)$ | $\Theta\!\left(n^{\log_b a}\right)$ | leaves win |
| 2 | $f(n) = \Theta\!\left(n^{\log_b a}\right)$ | $\Theta\!\left(n^{\log_b a}\log n\right)$ | tie |
| 3 | $f(n) = \Omega\!\left(n^{\log_b a + \varepsilon}\right)$ and $a f(n/b) \le c f(n)$ for some $c < 1$ | $\Theta(f(n))$ | root wins |

The $\varepsilon > 0$ in cases 1 and 3 is not decoration. It demands that $f$ be
**polynomially** smaller or larger than the watershed — smaller by a factor of
$n^\varepsilon$, not by a factor of $\log n$. That single requirement is where
most of the theorem's failures come from.

:::insight{title="Compare $a$ with $b^k$, never $\log_b a$ with $k$"}
When $f(n) = \Theta(n^k)$ for an integer $k$ — which covers nearly every
divide-and-conquer algorithm you will meet — the three cases reduce to a
comparison of two integers:

$$
a > b^k \Rightarrow \text{case 1}, \qquad
a = b^k \Rightarrow \text{case 2}, \qquad
a < b^k \Rightarrow \text{case 3}
$$

This is $\log_b a$ versus $k$ with both sides raised to the power $b$, and it is
strictly better than computing the logarithm. `math.log(243, 3)` returns
`4.999999999999999`, so a program that compares it against `5` concludes
"case 3" for a recurrence that is squarely case 2. `243 == 3 ** 5` is exact and
always will be. Stage 1's floating-point lesson was not a detour.
:::

Worked, quickly:

- **Mergesort**, $T(n) = 2T(n/2) + \Theta(n)$: $a = 2$, $b = 2$, $k = 1$,
  $b^k = 2 = a$. Case 2: $\Theta(n\log n)$.
- **Binary search**, $T(n) = T(n/2) + \Theta(1)$: $a = 1$, $b = 2$, $k = 0$,
  $b^k = 1 = a$. Case 2: $\Theta(\log n)$.
- **Karatsuba multiplication**, $T(n) = 3T(n/2) + \Theta(n)$: $a = 3 > b^k = 2$.
  Case 1: $\Theta(n^{\log_2 3}) = \Theta(n^{1.585})$.
- **Naive matrix multiply by blocks**, $T(n) = 8T(n/2) + \Theta(n^2)$:
  $a = 8 > b^k = 4$. Case 1: $\Theta(n^3)$. Strassen's $7T(n/2) + \Theta(n^2)$ is
  still case 1, at $\Theta(n^{2.807})$ — one fewer multiplication moves the
  exponent, which is the entire point of the algorithm.

:::checkpoint{id=cp-regime rubric="compare a with b^k,a greater than b^k means leaves dominate,a equals b^k gives an extra log factor,the exponent not the constant decides"}
$T(n) = 4T(n/2) + n^2$ and $T(n) = 5T(n/2) + n^2$ differ by one subproblem.
Without looking anything up, say which case each falls into and why the answers
are not the same shape.
:::

## Where it quits

Three shapes escape the theorem, and each one escapes for a different reason.

**The gap is not polynomial.** Take $T(n) = 2T(n/2) + n/\log_2 n$. The watershed
is $n^{\log_2 2} = n$, and $n/\log_2 n$ is genuinely smaller than $n$ — but only
by a logarithmic factor, not by any $n^\varepsilon$. No case applies. The tree
still answers it: level $i$ totals $n / \log_2(n/2^i) = n/(\log_2 n - i)$, and
summing that over $i$ gives $n \sum_{j=1}^{\log_2 n} 1/j \approx n \ln\log_2 n$.

```python runnable id=non-polynomial-gap
import math

values = {1: 1.0, 2: 1.0}
for k in range(2, 26):
    n = 2 ** k
    values[n] = 2 * values[n // 2] + n / k      # local work n / log2(n) = n / k

print(f"{'n':>12} {'T(n)':>16} {'T/(n loglog n)':>16} {'T/n':>8}")
for k in (4, 10, 16, 22, 25):
    n = 2 ** k
    print(f"{n:>12} {values[n]:>16.1f}"
          f" {values[n]/(n*math.log2(math.log2(n))):>16.4f} {values[n]/n:>8.3f}")
```

The middle column settles near 0.71 while the right-hand one keeps climbing. So
$T(n) = \Theta(n\log\log n)$ — strictly between $n$ and $n\log n$, a growth class
you would never guess and the Master Theorem cannot reach.

**Case 3's regularity condition fails.** $T(n) = T(n/2) + n(2 + \sin n)$ has
watershed $n^{\log_2 1} = n^0 = 1$, and $f(n) = n(2 + \sin n)$ is polynomially
larger, so case 3 is the candidate. But case 3 also demands
$a f(n/b) \le c f(n)$ for some fixed $c < 1$, and here that ratio is
$\tfrac{1}{2}\cdot\frac{2 + \sin(n/2)}{2 + \sin n}$, which reaches $1.5$ whenever
$\sin(n/2)$ is near $1$ and $\sin n$ is near $-1$. No such $c$ exists. The
condition is not a technicality: it is the statement "the work really does shrink
geometrically as you descend", and an oscillating $f$ does not.

**$a$ or $b$ is not constant.** The theorem is stated for fixed $a$ and $b$, and
these are not:

| Recurrence | Why it escapes | Actual answer |
| --- | --- | --- |
| $T(n) = T(n-1) + n$ | subtract-and-conquer; there is no $b$ | $\Theta(n^2)$ |
| $T(n) = T(n/3) + T(2n/3) + n$ | two different $b$'s | $\Theta(n\log n)$ |
| $T(n) = \sqrt{n}\,T(\sqrt{n}\,) + n$ | $a$ and $b$ both depend on $n$ | $\Theta(n\log\log n)$ |

The middle row is worth a moment. Its tree is lopsided: the shortest root-to-leaf
path has $\log_3 n$ levels and the longest has $\log_{3/2} n$, so the levels are
not all full. Every full level still totals $n$, which gives $\Omega(n\log n)$,
and the total is at most $n$ per level for $\log_{3/2} n$ levels, giving
$O(n\log n)$. The two bounds meet, so $\Theta(n\log n)$ — proved with nothing but
the tree.

## Substitution: guess, then prove by induction

The tree gives you the answer. Induction is how you make it a proof, and it is
the only technique here that handles floors, ceilings, and recurrences with no
pattern at all.

**Claim.** $T(n) = 2T(n/2) + n$ with $T(1) = 1$ satisfies $T(n) \le c\,n\log_2 n$
for a suitable constant $c$ and all $n \ge 2$.

**Inductive step.** Assume it holds for $n/2$. Then

$$
\begin{aligned}
T(n) &= 2T(n/2) + n \\
     &\le 2\left(c\,\tfrac{n}{2}\log_2 \tfrac{n}{2}\right) + n \\
     &= c\,n(\log_2 n - 1) + n \\
     &= c\,n\log_2 n - cn + n \\
     &\le c\,n\log_2 n \quad \text{whenever } c \ge 1
\end{aligned}
$$

**Base case.** Not $n = 1$: $c \cdot 1 \cdot \log_2 1 = 0$ and $T(1) = 1 > 0$, so
the claim is false there for every $c$. Start at $n = 2$ instead, where
$T(2) = 2T(1) + 2 = 4$ and the bound is $2c$, so $c \ge 2$ suffices. Choosing
$c = 2$ satisfies the base case and the step. $\blacksquare$

Shifting the base case is not a dodge. The definition of $O$ hands you an $n_0$
precisely so that finitely many small inputs can be excluded, and $\log_2 1 = 0$
is exactly the kind of small-input misbehaviour it exists for.

:::warning{title="The proof that mergesort is linear"}
Guess $T(n) \le cn$ instead and run the same step:

$$
T(n) = 2T(n/2) + n \le 2\left(c\,\tfrac{n}{2}\right) + n = cn + n
$$

Now write "$cn + n = O(n)$, so $T(n) = O(n)$" and you have proved something false.

The error is precise: the induction must reproduce the hypothesis **with the same
constant**. You needed $T(n) \le cn$ and you derived $T(n) \le (c+1)n$. A
different constant at every level is a constant that grows with the depth, and
the depth is $\log n$ — which is where the missing $\log n$ went.

The rule that prevents this: **never let $O(\cdot)$ appear inside a substitution
proof.** Carry explicit constants, and finish by producing the identical
inequality you assumed.
:::

:::exercise{ref=master-case}
:::

:::exercise{ref=merge-comparisons}
:::

::::track{depth=proof}
## Proving the Master Theorem from the tree

The theorem is the recursion tree summed once, in general. Take $n$ a power of
$b$ and $T(1) = \Theta(1)$; the general case needs floors and ceilings and
changes nothing.

**Unroll.** Level $i$ has $a^i$ subproblems, each of size $n/b^i$, each doing
$f(n/b^i)$ local work. The recursion bottoms out at level $L = \log_b n$, where
there are $a^L = a^{\log_b n} = n^{\log_b a}$ leaves. So

$$
T(n) \;=\; \underbrace{\Theta\!\left(n^{\log_b a}\right)}_{\text{leaves}}
\;+\; \underbrace{\sum_{i=0}^{L-1} a^i f\!\left(\frac{n}{b^i}\right)}_{\displaystyle g(n)}
$$

Everything now turns on the series $g(n)$. Substitute $f(n) = n^k$ and each term
becomes

$$
a^i \left(\frac{n}{b^i}\right)^k = n^k \left(\frac{a}{b^k}\right)^i
$$

so $g(n)$ is a geometric series with ratio $r = a/b^k$ and first term $n^k$.
Three cases, and they are the three rows of the table earlier.

**$r > 1$, i.e. $a > b^k$ (case 1).** A geometric series with ratio above 1 is
dominated by its last term, within a constant factor $\frac{r}{r-1}$:

$$
g(n) = n^k \cdot \frac{r^{L} - 1}{r - 1} = \Theta\!\left(n^k r^{L}\right)
= \Theta\!\left(n^k \frac{a^L}{b^{kL}}\right)
= \Theta\!\left(n^k \frac{n^{\log_b a}}{n^{k}}\right)
= \Theta\!\left(n^{\log_b a}\right)
$$

using $b^L = n$. The internal-node work is the same order as the leaf term, so
$T(n) = \Theta(n^{\log_b a})$: **the leaves pay for everything.**

**$r = 1$, i.e. $a = b^k$ (case 2).** Every term equals $n^k$ and there are
$L = \log_b n$ of them, so $g(n) = n^k \log_b n$. The leaf term is
$n^{\log_b a} = n^k$, which the sum swallows. $T(n) = \Theta(n^k \log n)$.

**$r < 1$, i.e. $a < b^k$ (case 3).** A geometric series with ratio below 1 is
dominated by its *first* term and bounded by $\frac{1}{1-r}$ times it, no matter
how many terms there are:

$$
g(n) \le n^k \sum_{i=0}^{\infty} r^i = \frac{n^k}{1-r} = \Theta(n^k) = \Theta(f(n))
$$

and the leaf term $n^{\log_b a}$ is asymptotically smaller than $n^k$ because
$\log_b a < k$. So $T(n) = \Theta(f(n))$: **the root pays for everything.**

:::proof{title="What the two side conditions are actually doing"}
The derivation above assumed $f(n) = n^k$, and the theorem is stated for general
$f$. The gap between those is exactly the fine print.

The **$\varepsilon$** in cases 1 and 3 is what guarantees the ratio $r$ is bounded
away from 1 by a constant. If $f$ is smaller than the watershed by only a
$\log n$ factor, then $r$ approaches 1 as $n$ grows, the series stops being
geometric in any useful sense, and the "dominated by one end" argument
evaporates. That is why $T(n) = 2T(n/2) + n/\log n$ is unreachable: its per-level
totals form a harmonic series, whose sum is $\Theta(\log L) = \Theta(\log\log n)$
levels' worth — neither one end nor flat.

The **regularity condition** $a f(n/b) \le c f(n)$ with $c < 1$ is the general-$f$
replacement for "$r < 1$". For $f(n) = n^k$ it holds automatically with
$c = a/b^k$. For an $f$ that wobbles, no fixed $c$ exists and the series can fail
to decrease even though $f$ is polynomially above the watershed — which is the
$n(2+\sin n)$ counterexample from the spine, and the reason case 3 is the only
case carrying an extra hypothesis.
:::
::::

:::quiz{id=quiz-l03 passing=3}
- id: q1
  prompt: "$T(n) = 2T(n/2) + 1$. How many levels does the recursion tree have, and what is the solution?"
  options:
    - "log2(n) levels, so Θ(log n)."
    - "log2(n) levels, and Θ(n) — the level totals double, so the leaves dominate."
    - "n levels, so Θ(n)."
    - "log2(n) levels, so Θ(n log n) — one n per level."
  answerIndex: 1
  explanation: >-
    Level $i$ holds $2^i$ nodes doing one unit each, so the level totals are
    $1, 2, 4, \dots$ — an increasing geometric series whose sum is dominated by
    the last level, which has $n$ leaves. The number of levels is logarithmic and
    contributes no log factor to the answer, because the series is geometric
    rather than flat.
- id: q2
  prompt: "Which recurrence is NOT solvable by the Master Theorem?"
  options:
    - "T(n) = 7T(n/2) + n^2"
    - "T(n) = T(n/2) + 1"
    - "T(n) = 2T(n/2) + n/log n"
    - "T(n) = 4T(n/3) + n"
  answerIndex: 2
  explanation: >-
    The watershed for the third is $n^{\log_2 2} = n$, and $n/\log n$ is smaller
    than $n$ but not by any factor of $n^\varepsilon$ — the gap is logarithmic,
    so neither case 1 nor case 2 applies. Its true answer is
    $\Theta(n \log\log n)$. The other three have $f(n) = \Theta(n^k)$ and are
    settled by comparing $a$ with $b^k$: 7 > 4 (case 1), 1 = 1 (case 2), 4 > 3
    (case 1).
- id: q3
  prompt: "A substitution proof assumes $T(m) \\le cm$ for all $m < n$ and derives $T(n) \\le cn + n$. What has been shown?"
  options:
    - "That T(n) = O(n), since cn + n is a constant multiple of n."
    - "Nothing about the guess — the step must reproduce T(n) <= cn with the same c, and it produced a larger constant."
    - "That T(n) = Ω(n), since the derived bound exceeds cn."
    - "That the guess is right but c needs to be chosen larger."
  answerIndex: 1
  explanation: >-
    An induction proves nothing unless the conclusion is the hypothesis. Ending
    with $(c+1)n$ means the constant grows by 1 per level, and over $\log n$
    levels that is the missing $\log n$ factor. Choosing a larger $c$ does not
    help: whatever $c$ you pick, the step still returns $c + 1$.
- id: q4
  prompt: "Why is `a == b ** k` a better test than `math.log(a, b) == k`?"
  options:
    - "It is faster, and speed matters inside an optimizer."
    - "It is exact: math.log(243, 3) is 4.999999999999999, so the float test misclassifies a case-2 recurrence as case 3."
    - "math.log cannot take a base argument, so the second form does not run."
    - "They are equivalent; the integer form is only a style preference."
  answerIndex: 1
  explanation: >-
    Logarithms of exact powers do not always come back exact in binary floating
    point — `math.log(243, 3)` lands just below 5 and `math.log(125, 5)` just
    above 3. Both errors flip the case. Integer exponentiation of small values is
    exact, so the comparison it feeds is too.
:::
