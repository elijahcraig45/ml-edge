---
id: t1/s02/l01
title: From doubling ratio to big-O
tier: t1-foundations
stage: s02-asymptotics-and-recursion
status: published
estimatedMinutes: 45
objectives:
  - Write the definitions of big-O, big-Omega and big-Theta with both quantifiers, and say what each one throws away.
  - Use the limit test to place a function in a growth class, and name the functions it cannot classify.
  - Read an EXPLAIN plan's estimated row count as the planner's own claim about how many times a loop runs.
prerequisites:
  - t1/s01/l03
  - t1/s01/l06
misconceptions:
  - "**\"Big-O means worst case.\"** These are two independent choices. First you pick *which* input you are talking about — worst, best, or average. That gives you a function. Then you bound that function, from above with $O$, from below with $\\Omega$, or both with $\\Theta$. \"The best case is $O(n)$\" is a perfectly ordinary sentence, and quicksort's average case being $\\Theta(n\\log n)$ says nothing about its worst case."
  - "**\"$O(n^2)$ is a description of the algorithm.\"** $O$ is an upper bound and nothing more. Every linear function is $O(n^2)$, and saying so is true, useless, and will be read as not knowing the difference. If you know the growth exactly, say $\\Theta$."
  - "**\"Constants do not matter.\"** They do not matter *to the classification*. They matter enormously to you. A $\\Theta(n)$ algorithm with a 500-microsecond constant loses to a $\\Theta(n\\log n)$ one with a 5-nanosecond constant until $n$ is in the millions. Asymptotics tell you which curve eventually wins, not which program to ship this quarter."
  - "**\"You can prove a bound by measuring.\"** A measurement establishes the ratio over the sizes you tried. The definition quantifies over *all* $n \\ge n_0$. Measurement is how you form the conjecture; counting or an induction is how you close it."
masteryChecklist:
  - Given a function, I can name a constant and a threshold that witness a big-O claim about it.
  - I can say why big-Theta is a stronger claim than big-O, and give a case where only big-O is available.
  - I can take the limit of f(n)/g(n) for the standard growth classes and read the answer off it.
  - Given an EXPLAIN plan, I can find the estimated row count on each node and check it against reality.
runtimes:
  - engine: python
  - engine: duckdb
    datasetId: package-registry
---

Stage 1 gave you a table of operation counts and a rule: double the input, look
at the ratio. Big-O adds no fact to that table. It compresses it, and the
compression is deliberately lossy — it discards the constant factor and every
input below some threshold. Knowing precisely what got discarded is the whole
difference between using the notation and reciting it.

## The ratio already told you the exponent

For $T(n) = c \cdot n^k$, the doubling ratio is $2^k$: the constant $c$ cancels.
You measured $k$ and learned nothing at all about $c$.

That is not a gap in the method. It is the method's point, and big-O is the
notation that makes "the constant is not part of the claim" official:

$$
f(n) = O(g(n))
\quad\Longleftrightarrow\quad
\exists\, c > 0,\ \exists\, n_0 \ge 1,\ \forall\, n \ge n_0:\ f(n) \le c \cdot g(n)
$$

Read the quantifiers in order, because each one is buying something specific.

- $\exists c$ — **you get to pick the constant.** This is where the machine, the
  interpreter and the cost of one comparison all go.
- $\exists n_0$ — **you get to ignore an initial segment.** This is Stage 1's
  advice to measure at several sizes and wait for the ratio to settle, written
  as a quantifier.
- $\forall n \ge n_0$ — **everything after that must obey.** One counterexample
  at any large $n$ kills the claim.

```python runnable id=witness-c-and-n0
# T(n) = 3n^2 + 500n + 20000. Is it O(n^2)? Find a c and an n_0 that prove it.
def T(n):
    return 3 * n**2 + 500 * n + 20000

for n in (1, 10, 50, 100, 500, 1000, 100_000):
    print(f"n = {n:>7}   T(n)/n^2 = {T(n) / n**2:>10.3f}")
```

The ratio starts at 20,503 and falls toward 3. So $c = 3$ never works, $c = 4$
works from $n = 538$ onward, and $c = 20{,}503$ works from $n = 1$ — because the
ratio is largest at $n = 1$ and decreases from there. All three answers are
witnesses — the definition asks you to produce *some*
pair $(c, n_0)$, not the tightest one. The lower-order terms did not disappear;
they were absorbed into your freedom to choose the pair.

:::pitfall{title="A single measurement is not a witness"}
The table above covers seven values of $n$. The definition quantifies over
infinitely many. Measurement is how you form the conjecture — an operation count
or an induction is how you close it. The exercise at the end of this lesson is
built entirely around the gap between those two things.
:::

## Three symbols, three different claims

| Notation | Definition | In words |
| --- | --- | --- |
| $f = O(g)$ | $\exists c, n_0:\ f(n) \le c\,g(n)$ for $n \ge n_0$ | grows *no faster than* $g$ |
| $f = \Omega(g)$ | $\exists c, n_0:\ f(n) \ge c\,g(n)$ for $n \ge n_0$ | grows *at least as fast as* $g$ |
| $f = \Theta(g)$ | both of the above | grows *at the same rate as* $g$ |

$\Theta$ is the one your Stage 1 measurements were reaching for. When the ratio
sat at 4 across three doublings, you were not claiming "no worse than
quadratic". You were claiming "quadratic", and that is $\Theta(n^2)$.

$O$ is weaker, and people reach for it out of habit. Every linear function is
$O(n^2)$. Every linear function is also $O(2^n)$. Both statements are true, both
are useless, and in an interview both read as not knowing the difference.

:::insight{title="Big-O and worst case are independent choices"}
These get welded together in most people's heads and they are orthogonal.

**Choice one:** which input are you talking about — worst, best, or average?
That selects a function $T(n)$.

**Choice two:** how do you bound that function — from above ($O$), from below
($\Omega$), or both ($\Theta$)?

"Insertion sort's best case is $\Theta(n)$" and "insertion sort's worst case is
$\Theta(n^2)$" are both exact, both use $\Theta$, and describe different inputs.
Meanwhile "quicksort is $O(n^2)$" is a claim about the worst case that says
nothing about the average, which is $\Theta(n\log n)$.
:::

## The limit test

Comparing two functions from the definition means inventing constants. Most of
the time you can skip that and take a limit instead. Let

$$
L = \lim_{n \to \infty} \frac{f(n)}{g(n)}
$$

| $L$ | Conclusion |
| --- | --- |
| $0$ | $f = O(g)$ and *not* $\Theta(g)$ — strictly slower growth |
| a finite number $> 0$ | $f = \Theta(g)$ |
| $\infty$ | $f = \Omega(g)$ and *not* $O(g)$ — strictly faster growth |

```python runnable id=limit-test
import math

pairs = [
    ("3n^2 + 500n", "n^2",      lambda n: 3 * n**2 + 500 * n, lambda n: n**2),
    ("n log n",     "n^2",      lambda n: n * math.log2(n),   lambda n: n**2),
    ("2^n",         "n^100",    lambda n: n * math.log(2),    lambda n: 100 * math.log(n)),  # log of each side
    ("log n",       "sqrt(n)",  lambda n: math.log2(n),       lambda n: math.sqrt(n)),
]

for f_name, g_name, f, g in pairs:
    print(f"{f_name:>12} / {g_name:<8}", end="  ")
    for n in (10**2, 10**4, 10**8):
        print(f"n=1e{len(str(n)) - 1}: {f(n) / g(n):>12.5f}", end="   ")
    print()
```

Read each row as a trend, not as three numbers. The first settles at 3, so those
two functions are $\Theta$ of each other. The second and fourth march toward 0,
so those are strict $O$. The third is computed on logarithms — comparing $2^n$
with $n^{100}$ directly overflows a float long before the trend is visible, and
taking logs of both sides preserves the ordering while keeping the numbers
finite. That trick is worth remembering.

:::warning{title="The limit test is sufficient, not necessary"}
If the limit exists, it decides the question. If it does not exist, you have
learned nothing — the functions may still be $\Theta$ of each other. The proof
track below builds the standard counterexample.
:::

## The classes you actually meet

Values at $n = 10^6$, which is a realistic table size and a useful calibration.

| Class | Name | Steps at $n = 10^6$ | Where you meet it |
| --- | --- | --- | --- |
| $\Theta(1)$ | constant | 1 | dict lookup, array index |
| $\Theta(\log n)$ | logarithmic | ~20 | binary search, B-tree descent |
| $\Theta(n)$ | linear | $10^6$ | one scan |
| $\Theta(n \log n)$ | linearithmic | $2 \times 10^7$ | sorting, hash-join with a spill |
| $\Theta(n^2)$ | quadratic | $10^{12}$ | nested loop over the same data |
| $\Theta(2^n)$ | exponential | $10^{301029}$ | naive subset enumeration |

The gap between $n\log n$ and $n^2$ is the one that decides whether a job
finishes. Twenty million steps is a fraction of a second. A trillion is a
fortnight.

:::checkpoint{id=cp-theta-vs-o rubric="O is an upper bound only,Theta claims both bounds,a measured stable ratio supports Theta,c and n0 are chosen not derived"}
A colleague says "this function is $O(n^3)$" about code whose measured doubling
ratio has been a steady 2.0 across four doublings. Their statement is true.
Explain what is wrong with it anyway, and what they should have said.
:::

## The same idea, written on a query plan

:::dataset{id=package-registry tables="packages,versions,downloads"}
:::

A database planner faces your Stage 1 problem and has to solve it without
running anything. Before it executes a query it must decide how to execute it,
and every one of those decisions comes down to a single question: **how many
rows will flow through this operator?** That number is the planner's $T(n)$, and
it prints it for you.

```sql runnable id=explain-first dataset=package-registry
EXPLAIN SELECT name FROM packages WHERE license = 'MIT';
```

The box is one operator — a sequential scan of `packages` with a filter pushed
into it — and the `~10 rows` at the bottom is an **estimated cardinality**. It
is a prediction, made before a single byte was read.

Now check it.

```sql runnable id=explain-actual dataset=package-registry
SELECT license, count(*) AS actual_rows
FROM packages
GROUP BY license
ORDER BY actual_rows DESC;
```

Nine rows are MIT, not ten. Close. Try a rarer value.

```sql runnable id=explain-bsd dataset=package-registry
EXPLAIN SELECT name FROM packages WHERE license = 'BSD-3';
```

Also `~10 rows`. The true answer is 3. The planner did not look at the value at
all — it applied a fixed guess for equality against a string column, and one of
the two guesses happened to land. **Selectivity is the database's version of
"how many times does the loop run"**, and here it is being estimated the way you
would estimate it if someone described the query to you over the phone.

The estimate is not always a guess. Sometimes the statistics are decisive:

```sql runnable id=explain-pruned dataset=package-registry
EXPLAIN SELECT version FROM versions WHERE size_kb > 1000;
```

`EMPTY_RESULT`. The largest `size_kb` in the table is 512, the planner knows the
column's minimum and maximum, and from those two numbers it proved that no row
can match. It deleted the scan. This is the same reasoning as "$n_0$ lets me
ignore the small cases" run in the other direction: a bound on the data lets it
ignore the query.

And sometimes the guess is badly wrong in the expensive direction:

```sql runnable id=explain-skew dataset=package-registry
EXPLAIN SELECT * FROM downloads WHERE count > 500;
```

`~40 rows` estimated, out of 200. The real answer is 196 — the planner assumed a
range predicate keeps about a fifth of the table, and this predicate keeps 98%
of it. On a 200-row table nobody notices. On a join between two large tables, an
estimate that is 5× low is how you get a nested loop where you needed a hash
join, and a query that takes an hour instead of a second.

:::note{title="Why EXPLAIN is in this stage and not in a tuning chapter"}
An execution plan is a **tree**, and the next lesson is about recursion trees.
Every operator asks its children for rows, does some local work, and hands rows
up. The cost of a plan therefore satisfies exactly the kind of recurrence you
are about to learn to solve:

$$
\text{cost}(\text{node}) = \sum_{\text{child}} \text{cost}(\text{child}) + \text{local work}
$$

`EXPLAIN` is not a tuning tool you graduate to. It is a recursion tree with the
cardinality estimates already filled in, and reading one is the same skill as
drawing the other.
:::

:::exercise{ref=witness-pair}
:::

:::exercise{ref=selectivity-report}
:::

::::track{depth=interview}
## Saying a bound out loud

Interviewers listen for three things when you state a complexity, and most
candidates supply one.

**Name the input variable.** "Linear" is ambiguous the moment there are two
inputs. "$O(n + m)$ where $n$ is the number of packages and $m$ the number of
versions" cannot be misread, and it demonstrates that you know the two loops are
not nested. Candidates who say "linear" about a two-input problem get asked
"linear in what?" and often discover their answer was quadratic.

**Use $\Theta$ when you know it.** If you can see that the loop always runs $n$
times, say $\Theta(n)$. Saying $O(n)$ there is not wrong, but it invites "can you
be tighter?", which burns a minute and signals uncertainty.

**Say the space too, unprompted.** "Time $\Theta(n)$, space $\Theta(n)$ for the
set" is a complete answer. "Time $\Theta(n)$" is half of one, and the follow-up
is always about the other half.

:::interview{title="The question behind the question"}
"What's the complexity?" is almost never asked because the interviewer wants the
symbol. They want to find out whether you know **which operation dominates**.

So answer with the operation, then the symbol: "the sort dominates, so
$\Theta(n \log n)$" beats "$\Theta(n\log n)$" every time. If the sort is not
actually the dominant term, you have just told them how to correct you, which is
a much better conversation than being told you are wrong.

The follow-up to prepare for is "and if the input is already sorted?" — which is
the interviewer moving you from worst case to best case, and checking that you
noticed the two choices are independent.
:::
::::

::::track{depth=proof}
## Proving the limit test, and breaking it

The limit test is stated everywhere and derived almost nowhere. It falls
directly out of the definition of a limit, and the derivation shows exactly why
the test fails when the limit does not exist.

**Claim.** If $\displaystyle\lim_{n\to\infty} f(n)/g(n) = L$ with $0 < L < \infty$
and $g(n) > 0$ for large $n$, then $f = \Theta(g)$.

**Proof.** The definition of the limit says: for every $\varepsilon > 0$ there is
an $N$ such that for all $n \ge N$,

$$
\left| \frac{f(n)}{g(n)} - L \right| < \varepsilon
$$

Choose $\varepsilon = L/2$, which is positive because $L > 0$. Then for all
$n \ge N$,

$$
\frac{L}{2} < \frac{f(n)}{g(n)} < \frac{3L}{2}
$$

Multiply through by $g(n) > 0$:

$$
\frac{L}{2}\,g(n) < f(n) < \frac{3L}{2}\,g(n)
$$

The right-hand inequality is the $O$ claim with $c = 3L/2$ and $n_0 = N$. The
left-hand one is the $\Omega$ claim with $c = L/2$ and the same $n_0$. Both
witnesses came out of the same application of the limit definition, which is why
a finite nonzero limit gives you $\Theta$ and not merely $O$. $\blacksquare$

The other two rows of the table come from the same argument. If $L = 0$, take
$\varepsilon = 1$: eventually $f(n) < g(n)$, so $f = O(g)$ — and no constant $c$
can hold $f(n) \ge c\,g(n)$ forever, since the ratio drops below every positive
$c$, so the $\Omega$ half fails and $f \ne \Theta(g)$.

:::proof{title="A function the test cannot classify"}
Let $f(n) = n\,(2 + \sin n)$ and $g(n) = n$.

The ratio $f(n)/g(n) = 2 + \sin n$ oscillates between 1 and 3 forever and
converges to nothing, so $L$ does not exist and the limit test is silent.

But $f = \Theta(g)$ regardless, straight from the definition: $\sin n \in [-1, 1]$
gives $1 \cdot n \le f(n) \le 3 \cdot n$ for every $n \ge 1$. Take $c = 3$,
$n_0 = 1$ for the upper bound and $c = 1$, $n_0 = 1$ for the lower.

The lesson is about which tool is load-bearing. The **definition** is the
theorem; the limit test is a shortcut that happens to work for every function
built from polynomials, logarithms and exponentials — which is most of them, and
not all of them. When a cost function oscillates — a hash table whose load
factor cycles, a cache whose hit rate depends on the access pattern — you go back
to exhibiting $c$ and $n_0$ by hand.
:::
::::

:::quiz{id=quiz-l01 passing=3}
- id: q1
  prompt: "A function's measured doubling ratio has been a stable 2.0 across five doublings. Which claim does that evidence best support?"
  options:
    - "T(n) = O(n), because the work grows with the input."
    - "T(n) = Θ(n), because the ratio pins the growth from both sides."
    - "T(n) = Ω(n), because the work is at least linear."
    - "T(n) = O(n^2), since that is safely true."
  answerIndex: 1
  explanation: >-
    A stable ratio of 2 says the work grows neither faster nor slower than
    linearly, which is exactly what $\Theta$ claims. The $O(n)$ and $\Omega(n)$
    options each state half of it, and $O(n^2)$ is true but throws away the
    information the measurement bought you. Note this is evidence, not proof —
    the definition quantifies over all $n$, and five doublings is five points.
- id: q2
  prompt: "Which pair of statements can both be true of the same sorting algorithm?"
  options:
    - "Its worst case is Θ(n^2) and its average case is Θ(n log n)."
    - "Its worst case is Θ(n log n) and its worst case is O(n)."
    - "It is Θ(n) and it compares every pair of elements."
    - "It is O(n log n) and it is Ω(n^2)."
  answerIndex: 0
  explanation: >-
    Worst case and average case describe different inputs, so they are free to
    have different growth — quicksort is precisely this. The second option
    contradicts itself about a single function. The third is impossible because
    comparing every pair is already $\Theta(n^2)$ work. The fourth asserts an
    upper bound below a lower bound.
- id: q3
  prompt: "$\\lim_{n \\to \\infty} f(n)/g(n) = 0$. What follows?"
  options:
    - "f = Θ(g) — a finite limit always means the same growth rate."
    - "f = O(g) but not Θ(g) — f grows strictly more slowly."
    - "f = Ω(g) — the ratio shrinking means g is the smaller function."
    - "Nothing; a limit of zero means the test does not apply."
  answerIndex: 1
  explanation: >-
    A ratio heading to zero means $f$ is eventually below any constant multiple
    of $g$, which is the $O$ claim and simultaneously destroys the $\Omega$ claim
    — no fixed $c > 0$ can keep $f(n) \ge c\,g(n)$ once the ratio drops below
    $c$. Only a finite *nonzero* limit gives $\Theta$.
- id: q4
  prompt: "EXPLAIN estimates 40 rows out of a 200-row table; the query actually returns 196. What has gone wrong?"
  options:
    - "The plan is invalid and the query will return wrong results."
    - "Nothing is wrong with the answer — the estimate is a prediction used to choose the plan, and here the predicate's selectivity was guessed badly."
    - "The table statistics are stale and must be refreshed before the query can run."
    - "EXPLAIN always reports the row count of the largest table in the query."
  answerIndex: 1
  explanation: >-
    Estimated cardinality never affects correctness — it affects the plan chosen.
    A default guess for a range predicate (about a fifth of the table) missed a
    column whose values are heavily skewed. On 200 rows this costs nothing; on a
    join between two large tables the same 5× error is how a planner picks a
    nested loop where a hash join was needed.
:::
