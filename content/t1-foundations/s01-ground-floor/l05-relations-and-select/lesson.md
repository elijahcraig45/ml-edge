---
id: t1/s01/l05
title: Relations, and what SELECT actually asks for
tier: t1-foundations
stage: s01-ground-floor
status: published
estimatedMinutes: 45
objectives:
  - Describe a table as a set of rows, and explain why row order is not guaranteed without ORDER BY.
  - Write SELECT / WHERE / ORDER BY / LIMIT against a real schema.
  - Explain why SQL is declarative — you describe the result, not the loop that builds it.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"Rows come back in the order they were inserted.\"** Nothing guarantees that. Without `ORDER BY`, the engine may return rows in whatever order is cheapest, and that order can change when the data grows or an index appears. A query that relies on it is correct by luck."
  - "**\"`LIMIT 10` gives me the top 10.\"** It gives you *ten rows*. Which ten is undefined unless you also say `ORDER BY`. `LIMIT` without `ORDER BY` is one of the most common sources of quietly wrong reports."
  - "**\"`WHERE` filters the rows I selected.\"** Conceptually `WHERE` runs first and `SELECT` shapes what survives. This is why you cannot use a `SELECT` alias in the `WHERE` of the same query."
masteryChecklist:
  - I can write a query with a filter, a sort, and a row limit, and say what each clause contributes.
  - I can explain why LIMIT without ORDER BY is a bug rather than a shortcut.
  - I can read a table's schema and name which column I would filter on for a given question.
runtimes:
  - engine: duckdb
    datasetId: package-registry
---

You have been telling a computer *how* to compute things. SQL is different: you
describe *what you want*, and the engine decides how to get it. That shift is
the reason a database can reorganise your query into something a hundred times
faster without changing its meaning — and the reason you will spend Stage 10
learning to read what it decided.

## A table is a set of rows

Formally a relation is a **set** of tuples. Two consequences follow immediately,
and both surprise people:

1. **There is no inherent order.** A set is unordered. If you want an order, you
   must ask for one.
2. **Columns are named, not positional.** You refer to `name`, not to "the
   second column".

Here is the schema every SQL exercise in this curriculum uses. Learn it once —
it comes back in every later stage.

:::dataset{id=package-registry tables="packages,versions"}
:::

## Your first query

```sql runnable id=first-select dataset=package-registry
SELECT name, language, license
FROM packages
LIMIT 5;
```

Run it. Then change `5` to `3`, or add another column. The database is real and
running in your browser — there is no server to wait for and nothing you can
break, so experiment freely.

`SELECT` chooses columns. `FROM` names the table. `LIMIT` caps how many rows come
back.

## Filtering with WHERE

```sql runnable id=where-clause dataset=package-registry
SELECT name, created_at
FROM packages
WHERE language = 'python'
ORDER BY created_at
LIMIT 5;
```

Read it in the order the engine conceptually applies it, which is *not* the
order you write it:

1. `FROM packages` — start with every row
2. `WHERE language = 'python'` — keep the rows that match
3. `ORDER BY created_at` — arrange what survived
4. `SELECT name, created_at` — keep only these columns
5. `LIMIT 5` — take the first five of the ordered result

That sequence explains a rule that otherwise looks arbitrary: you cannot use a
column alias defined in `SELECT` inside `WHERE`, because `WHERE` already ran.

:::pitfall{title="LIMIT without ORDER BY"}
`SELECT name FROM packages LIMIT 5` returns five rows, and the engine is free to
pick *any* five. It will often look stable — until the table grows, or someone
adds an index, or the query runs on a different machine. Then your "top 5
packages" report quietly changes. If you use `LIMIT`, say what "first" means.
:::

:::checkpoint{id=cp-order rubric="a relation is a set so has no order,the engine may choose any order,ORDER BY is the only guarantee"}
Explain to a colleague why `LIMIT 10` without `ORDER BY` is a bug and not a
shortcut, in two sentences.
:::

## Declarative, not imperative

In Python you would write the loop:

```python
recent = []
for package in packages:
    if package["language"] == "python":
        recent.append(package)
recent.sort(key=lambda p: p["created_at"])
recent = recent[:5]
```

In SQL you write the *description* and the engine writes the loop. It might scan
the table, or use an index, or reorder the work entirely — decisions it makes
from statistics about your data. You will see exactly those decisions in Stage 2
when you run `EXPLAIN`.

:::insight{title="The trade"}
Giving up control over *how* is what buys you the optimiser. The engine can
change its plan as your data grows, without you rewriting anything. The cost is
that when a query is slow, "read the code" is no longer enough — you have to
read the plan. That is a skill, and it is worth having.
:::

::::track{depth=systems}
## What the engine actually does with ORDER BY ... LIMIT

Read `ORDER BY created_at DESC LIMIT 3` literally and it says: sort every row,
then throw away all but three. On a billion-row table that would be absurd, and
no real engine does it.

A **top-N sort** keeps a bounded structure of the best 3 rows seen so far and
streams the table past it once. Each row is compared against the worst of the
current three; most rows lose immediately and are discarded. Memory stays
constant regardless of table size.

That structure is a heap, and you will build one in Stage 6. The same operation
also appears as "top-k", which is one of the most common interview problems
there is — so this is one algorithm wearing three hats: a query plan node, a
data structure, and an interview question.

:::insight{title="Why this matters for how you write queries"}
The engine can only make this optimisation when it can see the `LIMIT`. Fetch
all rows into Python and slice the first three yourself, and you have paid for
the full sort and the full network transfer. Pushing the limit down into the
query is not a micro-optimisation — it changes the algorithm the database picks.
:::

You will see this decision named explicitly in the plan output in Stage 2, and
you will learn to force and diagnose it in Stage 10.
::::

:::exercise{ref=recent-rust-packages}
:::

:::exercise{ref=largest-releases}
:::

:::quiz{id=quiz-l05 passing=2}
- id: q1
  prompt: "Why is row order not guaranteed without ORDER BY?"
  options:
    - "Because the rows are stored alphabetically internally."
    - "Because a relation is a set of rows, so the engine may return them in whatever order is cheapest."
    - "Because ORDER BY is required by the SQL standard in every query."
    - "Because insertion order is only kept for tables under a certain size."
  answerIndex: 1
  explanation: >-
    Sets have no order, so the engine is free to produce rows in whatever order
    its chosen plan happens to yield — and that plan can change with the data,
    the indexes, or the version.
- id: q2
  prompt: "Why can't you use a SELECT alias inside WHERE in the same query?"
  options:
    - "Aliases are only valid in the query that defines them, and WHERE is a different query."
    - "WHERE is applied before SELECT, so the alias does not exist yet."
    - "Aliases are strings, and WHERE requires column references."
    - "You can — it works in every engine."
  answerIndex: 1
  explanation: >-
    Filtering conceptually happens before projection. By the time SELECT names
    an alias, WHERE has already run, so the name is not yet defined.
- id: q3
  prompt: "What does `SELECT name FROM packages LIMIT 3` return?"
  options:
    - "The three alphabetically first names."
    - "The three most recently created packages."
    - "Three names, with no guarantee about which three."
    - "An error, because LIMIT requires ORDER BY."
  answerIndex: 2
  explanation: >-
    LIMIT caps the row count and says nothing about which rows. Without ORDER BY
    the choice is up to the engine, and it can change without warning.
:::
