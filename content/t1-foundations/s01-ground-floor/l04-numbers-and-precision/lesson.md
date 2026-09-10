---
id: t1/s01/l04
title: Numbers, precision, and why 0.1 + 0.2 isn't 0.3
tier: t1-foundations
stage: s01-ground-floor
status: published
estimatedMinutes: 35
objectives:
  - Explain why some decimal fractions cannot be represented exactly in binary floating point.
  - Compare floating-point values correctly instead of with `==`.
  - Choose between float, int, and Decimal for a given job — money, counts, measurements.
prerequisites:
  - t1/s01/l01
misconceptions:
  - "**\"Floating point is random or buggy.\"** It is exact and completely deterministic. `0.1 + 0.2` produces the same value every time on every machine. It just is not the value you expected, because 0.1 is not representable in binary."
  - "**\"Rounding to 2 decimals makes money safe.\"** Rounding at the end hides error that has already accumulated through every intermediate operation. For money, use integer cents or `Decimal` throughout — do not compute in float and round at the end."
  - "**\"Python ints overflow like they do in C.\"** They do not. Python integers are arbitrary precision and grow as needed. This is a genuine difference from most languages, and it means integer arithmetic never silently wraps."
masteryChecklist:
  - I can explain in one sentence why 0.1 has no exact binary representation.
  - I compare floats with a tolerance, and can say what an absolute versus a relative tolerance is for.
  - I can name the right numeric type for money, for a row count, and for a physical measurement.
runtimes:
  - engine: python
---

Every value in a computer is stored in a fixed number of bits, and that
constraint leaks into arithmetic in ways that surprise people for years. Ten
minutes now saves a genuinely nasty debugging session later.

## The classic

```python runnable id=classic-float
print(0.1 + 0.2)
print(0.1 + 0.2 == 0.3)
print(f"{0.1:.20f}")
```

Nothing is broken. The third line is the explanation: `0.1` is not stored as
one tenth. It is stored as the closest number a binary fraction can get to one
tenth, which is `0.10000000000000000555…`.

Why? Base 10 can write $\frac{1}{2}$ exactly as `0.5`, but $\frac{1}{3}$ needs
`0.333…` forever. Base 2 has the same problem with different fractions: it can
write $\frac{1}{2}$ and $\frac{1}{4}$ exactly, but $\frac{1}{10}$ recurs
forever. The stored value is truncated, and two truncated values added together
give a slightly-off result.

:::insight{title="The rule this produces"}
Never compare floats with `==`. Ask whether they are *close enough*, and be
explicit about what close enough means.
:::

## Comparing floats properly

```python runnable id=isclose
import math

print(math.isclose(0.1 + 0.2, 0.3))

# Absolute tolerance: "within 0.001 of each other" — right for values near zero.
print(math.isclose(0.0000001, 0.0, abs_tol=1e-6))

# Relative tolerance: "within 0.1% of each other" — right for large values,
# where a fixed absolute tolerance would be absurdly strict.
print(math.isclose(1_000_000.0, 1_000_001.0, rel_tol=1e-3))
```

`math.isclose` defaults to a *relative* tolerance, which is usually what you
want. The exception is comparing against zero: nothing is relatively close to
zero, so you must pass `abs_tol` explicitly. That single gotcha accounts for a
lot of confusing test failures.

:::pitfall{title="Money"}
Never store money in a float. `0.1 + 0.2 != 0.3` becomes a bank reconciliation
that is off by a cent, and the error grows with every transaction. Use integer
**cents**, or `decimal.Decimal` when you need fractional currency. This is also
why the `packages` table in our dataset stores `size_kb` as an `INTEGER`.
:::

```python runnable id=decimal-vs-float
from decimal import Decimal

print("float:  ", 0.1 + 0.2)
print("Decimal:", Decimal("0.1") + Decimal("0.2"))

# The quotes matter. Decimal(0.1) inherits the float's error before it starts.
print("wrong:  ", Decimal(0.1) + Decimal(0.2))
```

That third line is the trap: `Decimal(0.1)` converts an already-imprecise float.
`Decimal("0.1")` parses the decimal string exactly. Always construct `Decimal`
from a string.

## Integers do not have this problem

```python runnable id=big-ints
big = 2 ** 200
print(big)
print(big + 1 - big)          # exact, no matter the size
print(type(big))
```

Python integers are arbitrary precision. They grow to fit and never wrap around.
Costs are real — arithmetic on huge integers is slower than on machine words —
but correctness is never in question.

:::checkpoint{id=cp-types rubric="integer cents or Decimal for money,int for counts,float for measurements"}
Three fields: a product price, a download count, and a package's size in
megabytes measured by a tool that reports fractions. Which numeric type for
each, and why?
:::

:::exercise{ref=safe-average}
:::

:::quiz{id=quiz-l04 passing=2}
- id: q1
  prompt: "Why is `0.1 + 0.2 == 0.3` False in Python?"
  options:
    - "Floating-point arithmetic introduces random error on each operation."
    - "0.1 and 0.2 have no exact binary representation, so their stored values are slightly off before the addition even happens."
    - "Python compares floats by identity rather than value."
    - "The result needs rounding to a fixed number of decimal places first."
  answerIndex: 1
  explanation: >-
    It is entirely deterministic, not random. One tenth recurs forever in
    binary just as one third does in decimal, so the stored values are the
    nearest representable neighbours and their sum misses 0.3 slightly.
- id: q2
  prompt: "You are comparing a computed value against 0.0. Which is correct?"
  options:
    - "`math.isclose(x, 0.0)` — the default tolerance handles it."
    - "`math.isclose(x, 0.0, abs_tol=1e-9)` — relative tolerance is meaningless against zero."
    - "`x == 0.0` — zero is exactly representable, so equality is safe."
    - "`round(x, 9) == 0.0` — rounding removes the error."
  answerIndex: 1
  explanation: >-
    A relative tolerance is a fraction of the expected value, and any fraction
    of zero is zero — so the default can never match. Comparing to zero
    specifically requires an absolute tolerance.
- id: q3
  prompt: "Which type should hold a monetary amount?"
  options:
    - "float, rounded to two decimal places on output."
    - "Integer cents, or Decimal constructed from a string."
    - "float, because currency values are fractional by nature."
    - "Whichever the database returns."
  answerIndex: 1
  explanation: >-
    Rounding at output does not undo error accumulated in every intermediate
    step. Integer cents make representation exact; Decimal("0.10") parses the
    decimal value exactly rather than inheriting a float's error.
:::
