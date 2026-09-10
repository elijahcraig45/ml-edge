---
id: t1/s01/l01
title: Values, names, and what a program actually does
tier: t1-foundations
stage: s01-ground-floor
status: published
estimatedMinutes: 35
objectives:
  - Write a Python function that takes arguments and returns a value.
  - Explain the difference between a name and the value it points at.
  - Read a traceback and go straight to the line that broke.
prerequisites: []
misconceptions:
  - "**\"`=` means equals.\"** It does not. `=` binds a name to a value. `==` asks whether two values are equal. Reading `x = x + 1` as a mathematical claim makes it look false; reading it as *rebind `x` to one more than its current value* makes it obvious."
  - "**\"The error is on the last line of the traceback.\"** The last line names the *kind* of error. The line you usually need is the last one pointing at code you wrote, which is generally a few lines above it."
  - "**\"Assigning one list to another copies it.\"** `b = a` gives the same list a second name. Mutating through `b` changes what `a` sees, because there was only ever one list."
masteryChecklist:
  - I can write a function with parameters, a return value, and a docstring.
  - Given a traceback, I can name the error type and point at the line that caused it.
  - I can explain why two names can refer to one list, and what that means when I mutate it.
runtimes:
  - engine: python
---

Programming starts with a smaller idea than most introductions admit: a program
computes **values**, and gives some of them **names** so it can refer to them
later. Nearly everything else is built on that.

## A name is a label, not a box

The most common mental model of a variable — a box you put a value into — breaks
down almost immediately. A better one: a value exists somewhere, and a name is a
label pointing at it. Assignment moves the label. It does not touch the value.

```python runnable id=names-point-at-values
a = [1, 2, 3]
b = a            # not a copy — a second label on the same list
b.append(4)

print("a is", a)
print("b is", b)
print("same object?", a is b)
```

Run it. `a` changed, because there was never a second list to change. If you
wanted a copy you had to ask for one — `b = a.copy()` or `b = list(a)`.

:::pitfall{title="This bug will find you"}
Passing a list into a function and mutating it there changes the caller's list
too. That is occasionally what you want and frequently a surprise. When a
function mutates its argument, say so in the name: `sort_in_place(rows)` reads
very differently from `sorted_rows(rows)`.
:::

## Functions name a computation

A function does for computations what a variable does for values: it gives one a
name so you can use it without restating it.

```python runnable id=first-function
def total_size(sizes):
    """Return the sum of a list of package sizes, in kilobytes."""
    running = 0
    for size in sizes:
        running += size
    return running

print(total_size([120, 138, 190]))
print(total_size([]))
```

Two details worth noticing now, because they come back constantly:

- The **docstring** says what the function returns, not how it works. How it
  works is visible in the code; what it means is not.
- `total_size([])` returns `0`, not an error. An empty input is a case, not a
  mistake, and choosing what it returns is a design decision you should make on
  purpose.

:::checkpoint{id=cp-empty rubric="identity element,avoids a special case,callers do not need an if"}
`total_size([])` returns `0`. Why is `0` the right answer here rather than
`None` or an error? What would callers have to write if it returned `None`?
:::

## Reading a traceback

You will spend more time reading errors than writing code. Python's tracebacks
are unusually informative, and they read **bottom-up**: the last line is the
error type and message, and above it is the chain of calls that got there.

```python runnable id=read-a-traceback
def average_size(sizes):
    return total_size(sizes) / len(sizes)

def total_size(sizes):
    return sum(sizes)

print(average_size([]))
```

Run it, and you get:

```
ZeroDivisionError: division by zero
```

The type tells you *what* went wrong. The frame above it tells you *where*:
`average_size`, on the division. The fix is a decision, not a mechanic — should
the average of nothing be `0`, `None`, or an error? For an average, an error is
defensible: there is no meaningful average of no items, and silently returning
`0` would let a bug travel further before anyone notices.

:::note
`sum(sizes)` already does what `total_size` did. Python's built-ins are written
in C and are faster than an equivalent Python loop — but we wrote the loop first
on purpose. Knowing what the built-in is doing for you is the whole subject of
this curriculum.
:::

:::exercise{ref=package-summary}
:::

:::quiz{id=quiz-l01 passing=2}
- id: q1
  prompt: "After `a = [1, 2]` and `b = a`, what does `b.append(3)` do to `a`?"
  options:
    - "Nothing — `b` is a copy, so `a` is still `[1, 2]`."
    - "`a` becomes `[1, 2, 3]`, because `a` and `b` name the same list."
    - "It raises an error, because `a` is already bound."
    - "`a` becomes `[1, 2, 3]` only if `a` was declared mutable."
  answerIndex: 1
  explanation: >-
    `b = a` binds a second name to the same list object. There is only one list,
    so mutating it through either name is visible through both. `a is b` is True.
- id: q2
  prompt: "You get a traceback ending in `KeyError: 'license'`. Where do you look first?"
  options:
    - "The last line of the traceback, since that is where the error happened."
    - "The first line, since that is where the program started."
    - "The lowest frame that points at code you wrote, since that is where the bad key was used."
    - "The Python version, since KeyError behaviour changed recently."
  answerIndex: 2
  explanation: >-
    The final line names the error type and the offending key. The useful
    location is the deepest frame in *your* code — library frames below it are
    usually just the messenger.
- id: q3
  prompt: "Why does a docstring say what a function returns rather than how it works?"
  options:
    - "Because Python requires the return type in the docstring."
    - "Because how it works is already visible in the code, while what it means is not."
    - "Because docstrings are stripped at runtime, so implementation detail would be lost."
    - "Because the how changes less often than the what."
  answerIndex: 1
  explanation: >-
    A caller needs to know the contract — inputs, output, edge cases. The
    implementation is right there for anyone who needs it, and it changes more
    often than the contract does.
:::
