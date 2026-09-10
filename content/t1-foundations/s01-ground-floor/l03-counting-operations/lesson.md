---
id: t1/s01/l03
title: Counting operations before naming them
tier: t1-foundations
stage: s01-ground-floor
status: published
estimatedMinutes: 40
objectives:
  - Instrument a function with an operation counter and read the resulting growth table.
  - Identify a growth pattern — flat, doubling, squaring — from measured numbers alone.
  - Explain why measured time and counted operations disagree, and when to trust each.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"Faster on my laptop means a better algorithm.\"** Wall-clock time mixes the algorithm with your CPU, the interpreter, other processes, and caching. Doubling the input and watching how the *count* responds isolates the algorithm; timing one input tells you almost nothing."
  - "**\"Fewer lines of code means fewer operations.\"** `sorted(items)` is one line and does far more work than a three-line scan for the maximum. Line count measures typing, not computation."
  - "**\"If it's fast on 1,000 items it will be fine on a million.\"** That holds for linear growth and fails badly for quadratic. A function that takes 0.4s on 1,000 items takes about 400 seconds on 1,000,000 — which is the entire reason for measuring growth rather than a single point."
masteryChecklist:
  - I can wrap a comparison in a counter and produce a table of input size against operation count.
  - Given such a table, I can say whether doubling the input doubles or quadruples the work.
  - I can explain why I would trust an operation count over a stopwatch when comparing two algorithms.
runtimes:
  - engine: python
---

Stage 2 gives you the notation — $O(n)$, $\Theta(n \log n)$, and the rest. This
lesson deliberately comes first, because notation you have not *seen the need
for* is just ritual. So before naming anything, we are going to measure.

## Count the operation that matters

Pick the operation your algorithm actually spends its time on — usually a
comparison or a step through data — and count it.

```python runnable id=counting-max
def max_with_count(values):
    """Return (largest value, number of comparisons performed)."""
    if not values:
        return None, 0
    largest = values[0]
    comparisons = 0
    for value in values[1:]:
        comparisons += 1
        if value > largest:
            largest = value
    return largest, comparisons

for n in (10, 100, 1000, 10000):
    _, count = max_with_count(list(range(n)))
    print(f"n = {n:>6}   comparisons = {count:>6}")
```

The table is the point. Every time `n` grows by 10×, the count grows by 10×.
Work is proportional to input size — you have to look at everything once, and
you never look twice.

## Now one that grows differently

```python runnable id=counting-pairs
def has_duplicate_pairs(values):
    """Check every pair for equality. Returns (found, comparisons)."""
    comparisons = 0
    for i in range(len(values)):
        for j in range(i + 1, len(values)):
            comparisons += 1
            if values[i] == values[j]:
                return True, comparisons
    return False, comparisons

for n in (10, 100, 200, 400):
    _, count = has_duplicate_pairs(list(range(n)))
    print(f"n = {n:>4}   comparisons = {count:>8,}")
```

Look at what doubling does. From 100 to 200 the count roughly **quadruples**;
from 200 to 400 it quadruples again. That is the signature of nested loops over
the same data: double the input, quadruple the work.

:::insight{title="The diagnostic that needs no theory"}
Double the input and look at the ratio of counts.

| Ratio when input doubles | What you have |
| --- | --- |
| about 1 | the work does not depend on input size |
| a bit more than 2 | linear, with a logarithmic factor |
| about 2 | linear |
| about 4 | quadratic |
| about 8 | cubic |

You can apply this to code you did not write and do not understand, which makes
it one of the most portable skills in this curriculum.
:::

:::checkpoint{id=cp-ratio rubric="doubling the input,ratio of counts,4x means quadratic"}
You are handed an unfamiliar function and you can only run it, not read it. How
would you find out whether its cost is linear or quadratic?
:::

## Counting versus timing

Both are useful; they answer different questions.

```python runnable id=count-vs-time
import time

def linear_scan(values, target):
    steps = 0
    for value in values:
        steps += 1
        if value == target:
            return steps
    return steps

data = list(range(100_000))

start = time.perf_counter()
steps = linear_scan(data, 99_999)
elapsed = (time.perf_counter() - start) * 1000

print(f"steps taken:  {steps:,}")
print(f"time taken:   {elapsed:.2f} ms")
print("Run this a few times — the step count never moves, the timing does.")
```

The step count is a property of the algorithm and the input. The timing is a
property of the algorithm, the input, this machine, this interpreter, and
whatever else the CPU was doing. When comparing two algorithms, count. When
deciding whether something is fast *enough* for real users, time it.

:::note{title="Where this goes"}
In Stage 2 you will write $\Theta(n^2)$ for the pair-checking function. That is
not a new fact — it is shorthand for the table you just produced. In Stage 5 you
will make the duplicate check linear with a set, and the same measurement will
prove it worked.
:::

::::track{depth=proof}
## Why the doubling ratio identifies the growth class

The table earlier was empirical. Here is why it works.

Suppose the operation count is $T(n) = c \cdot n^k$ for some constants $c > 0$
and $k \ge 1$. Then the ratio when the input doubles is

$$
\frac{T(2n)}{T(n)} = \frac{c\,(2n)^k}{c\,n^k} = \frac{c\,2^k n^k}{c\,n^k} = 2^k
$$

Both $c$ and $n$ cancel. That is the whole trick, and it is why the method is so
robust: the ratio depends **only on the exponent**, not on the constant factor,
not on your machine, and not on the input size you happened to pick.

So a measured ratio of $2$ means $2^k = 2$, giving $k = 1$ — linear. A ratio of
$4$ means $k = 2$ — quadratic. A ratio of $8$ means cubic.

:::proof{title="Where the clean argument breaks down"}
Two honest caveats.

**Logarithmic factors do not cancel.** For $T(n) = c\,n\log n$, the ratio is
$2\log(2n)/\log(n) = 2(1 + 1/\log_2 n)$, which is a little above 2 and drifts
*toward* 2 as $n$ grows. That is why the table says "a bit more than 2" rather
than giving an exact figure, and why $n\log n$ is genuinely hard to distinguish
from linear by measurement alone.

**Lower-order terms matter at small $n$.** For $T(n) = n^2 + 1000n$, the linear
term dominates until $n \approx 1000$, so a measurement at $n = 100$ reports a
ratio near 2 and you conclude "linear". Measure at several sizes and watch
whether the ratio is *stable*. A drifting ratio means you have not reached the
range where the leading term dominates.
:::
::::

:::exercise{ref=count-comparisons}
:::

:::quiz{id=quiz-l03 passing=2}
- id: q1
  prompt: "Doubling the input makes the operation count go from 2,500 to 10,000. What is the growth?"
  options:
    - "Linear — the count went up with the input."
    - "Quadratic — doubling the input quadrupled the work."
    - "Logarithmic — the count grew more slowly than the input."
    - "Constant — 10,000 is still a small number."
  answerIndex: 1
  explanation: >-
    10,000 / 2,500 = 4. A 4× response to a 2× input is the signature of
    quadratic growth. The absolute size of the number is irrelevant; the ratio
    is what carries the information.
- id: q2
  prompt: "Why prefer an operation count over a stopwatch when comparing two algorithms?"
  options:
    - "Counting is more precise because timers have limited resolution."
    - "The count depends only on the algorithm and input, while timing also mixes in the machine, interpreter and system load."
    - "Counting works on any input size, but timing only works on large inputs."
    - "Timing cannot be automated in tests."
  answerIndex: 1
  explanation: >-
    Both are legitimate measurements of different things. The count isolates the
    algorithm and is reproducible. Timing answers "is this fast enough in
    practice", which is a question about a whole system, not an algorithm.
- id: q3
  prompt: "A function takes 0.4 seconds on 1,000 items and its work is quadratic. Roughly how long on 100,000 items?"
  options:
    - "About 40 seconds — 100× the input, 100× the time."
    - "About 4,000 seconds — 100× the input, 10,000× the time."
    - "About 0.4 seconds — modern CPUs absorb the difference."
    - "It cannot be estimated without running it."
  answerIndex: 1
  explanation: >-
    Quadratic means the work scales with the square of the input. Growing the
    input 100× multiplies the work by 100² = 10,000, so 0.4s becomes roughly
    4,000s — over an hour. This is why the growth rate matters more than the
    starting speed.
:::
