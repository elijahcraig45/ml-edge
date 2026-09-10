---
id: t1/s01/l02
title: Collections and what they cost
tier: t1-foundations
stage: s01-ground-floor
status: published
estimatedMinutes: 40
objectives:
  - Choose between a list, a dict, a set, and a tuple based on what the code does with the data.
  - Explain why `x in some_set` is fast and `x in some_list` is not.
  - Recognise the accidentally-quadratic loop, which is the most common performance bug there is.
prerequisites:
  - t1/s01/l01
misconceptions:
  - "**\"A set is just a list without duplicates.\"** Deduplication is a side effect. The point of a set is that membership testing does not depend on how many items it holds — it jumps straight to where the item would be instead of walking."
  - "**\"Dicts are unordered.\"** They were, before Python 3.7. They now preserve insertion order, and that is a language guarantee, not an implementation accident. Sets still have no useful order."
  - "**\"`in` is one operation, so it is cheap.\"** `in` is one *expression*. On a list it is a loop. Putting a list `in` inside another loop is how an instant program becomes a thirty-second one."
masteryChecklist:
  - Given code that searches a collection inside a loop, I can say whether it is quadratic and how to fix it.
  - I can name one thing a list does that a set cannot, and one thing a set does far better.
  - I can explain why dict keys must be hashable and lists cannot be keys.
runtimes:
  - engine: python
---

You now have names, values, and functions. Almost every real program also needs
to hold *many* values, and Python gives you four everyday ways to do it. Picking
between them is not a style question. It changes what your program costs.

## The four, and what each is actually for

| Type | Written | Good at | Bad at |
| --- | --- | --- | --- |
| `list` | `[1, 2, 3]` | order, indexing, appending | searching |
| `dict` | `{"a": 1}` | look up a value *by key* | anything positional |
| `set` | `{1, 2, 3}` | "have I seen this?" | order, duplicates, indexing |
| `tuple` | `(1, 2)` | a fixed record; usable as a dict key | changing |

The interesting line in that table is **searching**. A list has to look at its
elements one at a time, because nothing about a list tells you where an item
would be. A set and a dict compute *where the item belongs* from the item
itself, and go straight there.

That single difference is worth more than every other optimisation in this
lesson combined.

```python runnable id=membership-cost
import time

haystack_list = list(range(200_000))
haystack_set = set(haystack_list)
needle = 199_999          # worst case for the list: the very last item

start = time.perf_counter()
needle in haystack_list
list_ms = (time.perf_counter() - start) * 1000

start = time.perf_counter()
needle in haystack_set
set_ms = (time.perf_counter() - start) * 1000

print(f"list: {list_ms:.4f} ms")
print(f"set:  {set_ms:.4f} ms")
print(f"the set is roughly {list_ms / max(set_ms, 1e-9):,.0f}x faster here")
```

Run it a couple of times. The exact ratio moves around; the shape of the answer
does not. And notice *why* the comparison is fair: both collections hold the
same 200,000 values. The set is not faster because it is smaller. It is faster
because it never had to look.

:::insight{title="The whole of Stage 5, in one sentence"}
A set trades **order** for **position you can compute**. Give up the ability to
ask "what is the third item?", and you buy the ability to answer "is this item
here?" without searching. Stage 5 is entirely about how that trade is
implemented and what it costs when it goes wrong.
:::

## The accidentally quadratic loop

Here is the bug this lesson exists to prevent. It is not exotic — it is the most
common serious performance mistake in working code, and it always looks
reasonable.

```python runnable id=accidentally-quadratic
import time

def find_shared_slow(names_a, names_b):
    """Names appearing in both lists."""
    shared = []
    for name in names_a:
        if name in names_b:        # <- a loop, hiding inside an `if`
            shared.append(name)
    return shared

def find_shared_fast(names_a, names_b):
    lookup = set(names_b)          # pay once
    return [name for name in names_a if name in lookup]

a = [f"pkg-{i}" for i in range(3_000)]
b = [f"pkg-{i}" for i in range(1_500, 4_500)]

for label, fn in (("slow", find_shared_slow), ("fast", find_shared_fast)):
    start = time.perf_counter()
    result = fn(a, b)
    print(f"{label}: {len(result)} shared, {(time.perf_counter() - start) * 1000:.1f} ms")
```

Both functions return the same answer. The slow one runs the inner search once
per outer item, so the work is proportional to `len(a) * len(b)`. The fast one
builds a set once and then does 3,000 instant lookups.

The fix was one line. Finding the line is the skill.

:::pitfall{title="How to spot it in review"}
Look for a search *inside* a loop: `in` on a list, `.index()`, a nested `for`
that scans to find a match, or `list.remove()` in a loop. If the outer thing and
the inner thing both grow with your data, the cost is their product.
:::

:::checkpoint{id=cp-quadratic rubric="a search inside a loop,cost is the product of the two sizes,build a set or dict once outside the loop"}
In your own words: what is the shape you are looking for when you scan code for
this bug, and what is the fix? Answer before scrolling on.
:::

## Why dict keys have rules

A dict computes where a key belongs *from the key's value*. That only works if
the key's value cannot change underneath it — otherwise the dict would be
looking in the wrong place forever after.

```python runnable id=hashable-keys
seen = {}
seen[("arrowkit", "1.4.2")] = 190      # a tuple is fine: it cannot change
print(seen)

try:
    seen[["arrowkit", "1.4.2"]] = 190  # a list can change, so it is not allowed
except TypeError as exc:
    print("TypeError:", exc)
```

`unhashable type: 'list'` is not an arbitrary restriction. It is the language
refusing to let you build a dictionary that would silently lose your data. That
is also why tuples are the natural type for a composite key.

::::track{depth=interview}
## Recognising this in an interview

Interviewers rarely ask you to implement a hash table. They ask a question whose
*answer* is one, and see whether you reach for it.

The trigger phrases are remarkably consistent. When a problem says **"have we
seen"**, **"find the duplicate"**, **"do these two collections overlap"**,
**"count occurrences of"**, or **"find the pair that sums to"** — the answer
almost always starts with a set or a dict.

The move is always the same shape: **trade memory for a lookup you do not have
to search for.** You spend O(n) space building it once, and every subsequent
question is answered without scanning.

Say that trade out loud when you propose it. "I'll use a set here — that's
linear extra space, and it takes the running time from quadratic to linear"
tells the interviewer you know what you are buying and what it costs. Silently
writing the fast version tells them much less.

:::interview{title="The follow-up you should expect"}
"What if the input doesn't fit in memory?" is the standard second question, and
it is not a trick. It is the doorway to Stage 9 — Bloom filters and HyperLogLog
exist precisely because sometimes you cannot afford the exact set. You are not
expected to solve it now; you are expected to recognise that giving up exactness
is the lever.
:::
::::

:::exercise{ref=shared-maintainers}
:::

:::exercise{ref=first-duplicate}
:::

:::quiz{id=quiz-l02 passing=2}
- id: q1
  prompt: "You need to check membership repeatedly against 50,000 names. Which collection?"
  options:
    - "A list, because it keeps insertion order."
    - "A set, because membership does not depend on how many names it holds."
    - "A tuple, because it is immutable and therefore faster."
    - "It makes no difference; `in` is a single operation either way."
  answerIndex: 1
  explanation: >-
    A set computes where the item would be and looks only there. A list must
    scan. Immutability (the tuple option) has nothing to do with lookup cost —
    a tuple searches exactly like a list.
- id: q2
  prompt: "Why can a tuple be a dict key when a list cannot?"
  options:
    - "Tuples use less memory, so they are cheaper to hash."
    - "A dict locates a key from its value, so a key that could change would strand the entry."
    - "Lists are a newer type and key support was never added."
    - "Tuples are ordered and lists are not."
  answerIndex: 1
  explanation: >-
    The dict computes a position from the key's contents at insertion time. If
    the contents later changed, the entry would sit somewhere lookups never
    check. Refusing mutable keys prevents an unfixable class of bug.
- id: q3
  prompt: "A loop over 5,000 items does `if x in big_list` on each pass, where `big_list` has 5,000 items. Roughly how many comparisons?"
  options:
    - "About 5,000 — one per outer item."
    - "About 10,000 — 5,000 plus 5,000."
    - "Up to about 25,000,000 — the product of the two sizes."
    - "It depends only on how many matches are found."
  answerIndex: 2
  explanation: >-
    Each of the 5,000 outer passes may scan all 5,000 inner items, so the work
    is their product. Converting `big_list` to a set once, before the loop,
    reduces it to about 5,000 lookups.
:::
