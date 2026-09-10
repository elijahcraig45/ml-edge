---
id: t4/s10/l06
title: The semantic layer, and how to prove its SQL is right
tier: t4-scale-systems
stage: s10-query-execution
status: published
estimatedMinutes: 50
objectives:
  - Describe what a metric definition compiles to, and name the parts of it that a plain SQL query leaves implicit.
  - Detect a fan-out with a grain test, and explain why DISTINCT is not the fix.
  - Distinguish additive, semi-additive and non-additive measures, and say which aggregation each one permits.
  - Write assertion queries that prove generated SQL computes the right number, not merely that it executes.
prerequisites:
  - t1/s01/l05
  - t1/s01/l06
misconceptions:
  - "**\"If the generated SQL runs and returns numbers, it is probably right.\"** Every wrong query in this lesson runs, returns the expected shape, and produces plausible numbers. A fan-out inflates a total by 89% without an error, a NULL, or anything a schema check would notice. Runnable and correct are unrelated properties."
  - "**\"SELECT DISTINCT fixes a fan-out.\"** It removes duplicate *rows*, and a fan-out duplicates *values that were legitimately equal*. Two days with the same download count are two real rows; deduplicating them destroys real data while the inflated total may survive anyway. The fix is to aggregate to the measure's own grain before joining."
  - "**\"An average is an average.\"** The average of per-package ratios is not the ratio of the sums, and the difference here is 14%. Any metric shaped as a ratio has to be defined as `sum(numerator) / sum(denominator)` and computed at the grain it is displayed at, never averaged up from a finer grain."
  - "**\"Testing generated SQL means comparing it to a reference query.\"** That only tells you two queries agree, and the reference was written by the same person with the same misunderstanding. The tests that catch real bugs are invariants — a grain test, a rollup test, a cross-check computed a different way — because they can fail even when both queries look right."
masteryChecklist:
  - I can list what a metric definition carries beyond the SQL expression, and say why the grain is the important part.
  - I can write a grain test that detects a fan-out before anyone looks at the numbers.
  - Given a measure, I can say whether it is additive, semi-additive or non-additive, and what that permits.
  - I can write an assertion query whose empty result is the evidence that a metric is correct.
runtimes:
  - engine: duckdb
    datasetId: package-registry
---

A semantic layer is a compiler. Its input is a metric definition; its output is
SQL; and like every compiler, the interesting question is not whether it
produces output but whether the output means what the input said.

That question is the job. Whether the layer is dbt's metrics, Cube, Looker's
LookML, or a language model writing SQL from a sentence, the code generation is
the easy half. Deciding whether the generated query computes the right number is
the half people get hired for, and it is a *testing* problem, not a prompting
one.

:::dataset{id=package-registry tables="packages,versions,maintainers,package_maintainers,downloads"}
:::

## What a metric definition actually carries

```yaml
metric: total_downloads
  measure:     downloads.count
  aggregation: sum
  grain:       (package_id, day)        # one fact row per package per day
  dimensions:  [packages.language, packages.license, maintainers.country]
  join_paths:
    packages.language  : downloads -> packages
    maintainers.country: downloads -> packages -> package_maintainers -> maintainers
```

Compiled for `total_downloads by language`, that becomes:

```sql
SELECT p.language, sum(d.count) AS total_downloads
FROM downloads d
JOIN packages p ON p.id = d.package_id
GROUP BY p.language;
```

The expression `sum(d.count)` is the least interesting line in the definition.
Everything that makes the layer worth having is the metadata around it:

- **the grain** — what one row of the fact table means. Here, one package on one
  day. Every correctness argument in this lesson is an argument about grain.
- **the join paths** — which route to take from the measure to each dimension.
  A dimension is not reachable by "just joining"; *which* join matters.
- **the permitted dimensions** — because some slicings of a measure are
  meaningless, and a layer that lets you request them will answer confidently.

A hand-written query carries all of this implicitly, in the head of whoever
wrote it. That is exactly why a hand-written query is untestable: there is
nothing to test it against.

## The fan-out, measured

Ask for the same metric sliced by maintainer country. The join path now runs
through `package_maintainers`, which is many-to-many.

```sql runnable id=fanout dataset=package-registry
SELECT
  p.language,
  (SELECT sum(d.count) FROM downloads d WHERE d.package_id IN
     (SELECT id FROM packages WHERE language = p.language))       AS truth,
  sum(d2.count)                                                   AS through_maintainers
FROM packages p
JOIN package_maintainers pm ON pm.package_id = p.id
JOIN downloads d2 ON d2.package_id = p.id
GROUP BY p.language
ORDER BY p.language;
```

Python goes from 198,570 to 376,480. Not an error, not a NULL, not a shape
change — a number 89% too large, in a column that looks exactly right.

The mechanism is the one you implemented in lesson 2. A join emits the full
cross product of the matching runs on each side, so a package with three
maintainers has each of its ten download rows repeated three times, and `sum`
counts each of them three times. The join did nothing wrong. The metric did:
it summed a measure at a grain finer than the measure's own.

:::pitfall{title="Why DISTINCT is not the fix"}
The reflex is `sum(DISTINCT d.count)`. It is wrong twice over.

It removes real data: two days with the same download count are two genuine
facts, and deduplicating collapses them into one. And it does not reliably
remove the inflation either, because deduplication is on the *value*, which has
no relationship to the duplication introduced by the join.

`COUNT(DISTINCT ...)` on a key column is the version that appears to work, and
it hides the bug rather than fixing it: the total is right and the query is
still joining at the wrong grain, so the next measure someone adds to it will
be wrong again.

The fix is structural. Aggregate the measure to its own grain *before* joining
anything that can multiply rows, or replace the multiplying join with a
semi-join when you only need it as a filter.
:::

## Test one: the grain test

You do not need to look at any measure to detect a fan-out. Count rows.

```sql runnable id=grain-test dataset=package-registry
SELECT
  (SELECT count(*) FROM downloads)                       AS fact_rows,
  (SELECT count(*) FROM downloads d
     JOIN package_maintainers pm ON pm.package_id = d.package_id) AS after_join,
  (SELECT count(*) FROM downloads d
     JOIN package_maintainers pm ON pm.package_id = d.package_id)
    - (SELECT count(*) FROM downloads)                   AS rows_invented;
```

200 fact rows in, 260 out. Sixty rows that do not correspond to anything that
happened.

This is the single most valuable test to run against generated SQL, because it
is **independent of the measure**. It does not need a correct answer to compare
against, it does not need a fixture, and it fails on every fan-out regardless of
which column is being summed. If you build one automated check into a text-to-SQL
pipeline, build this one.

:::insight{title="Grain, stated precisely"}
A measure may be summed over a dimension only if the join from measure to
dimension is **many-to-one or one-to-one** — each fact row matches at most one
dimension row. `downloads -> packages` on `package_id` qualifies, because
`packages.id` is unique. `downloads -> package_maintainers` does not.

That single sentence is what a semantic layer encodes and a hand-written query
does not. It is also exactly the property the grain test measures: if the join
is many-to-one, the row count cannot grow.
:::

## Test two: additivity

Some measures cannot be summed along some dimensions no matter how clean the
join is.

```sql runnable id=additivity dataset=package-registry
WITH by_language AS (
  SELECT p.language, count(DISTINCT pm.maintainer_id) AS maintainers
  FROM packages p
  JOIN package_maintainers pm ON pm.package_id = p.id
  GROUP BY p.language
)
SELECT
  (SELECT sum(maintainers) FROM by_language)             AS sum_of_the_parts,
  (SELECT count(DISTINCT pm.maintainer_id)
   FROM packages p JOIN package_maintainers pm ON pm.package_id = p.id) AS the_whole;
```

Eleven against ten. Nothing is broken; a maintainer who works on both a Python
package and a Rust one is counted in both rows and once overall. `COUNT(DISTINCT)`
does not add up, and no fix at the SQL level changes that — it is a property of
the measure.

The standard taxonomy is worth having by name:

| Kind | Summable over | Examples |
| --- | --- | --- |
| **Additive** | every dimension | download count, revenue, row counts |
| **Semi-additive** | every dimension *except time* | account balance, inventory on hand, headcount |
| **Non-additive** | none — must be recomputed at the display grain | ratios, percentages, distinct counts, medians |

A semantic layer's real value is that it stores which of these a measure is and
refuses the illegal rollups. A ratio metric defined as
`sum(numerator) / sum(denominator)` is recomputed correctly at whatever grain
you ask for it. The same metric stored as a per-row ratio and averaged upward
is wrong every time, by an amount nobody can predict.

```sql runnable id=ratio-of-sums dataset=package-registry
WITH dl AS (SELECT package_id, sum(count) AS downloads FROM downloads GROUP BY package_id),
     rl AS (SELECT package_id, count(*) AS releases FROM versions GROUP BY package_id)
SELECT
  p.language,
  round(sum(dl.downloads) / sum(rl.releases), 2) AS ratio_of_sums,
  round(avg(dl.downloads / rl.releases), 2)      AS average_of_ratios
FROM packages p
JOIN dl ON dl.package_id = p.id
JOIN rl ON rl.package_id = p.id
GROUP BY p.language
ORDER BY p.language;
```

For Python: 16,547.5 against 14,228.33 — a 14% difference between two
defensible-looking definitions of "downloads per release". Only one of them is
the metric people think they asked for, and the other is what you get by
averaging a column that was already a ratio.

:::checkpoint{id=cp-grain rubric="a fan-out duplicates fact rows so the sum counts them twice,DISTINCT deduplicates values not rows so it removes real data,pre-aggregate to the measure grain before joining"}
A dashboard's revenue number doubled after someone added a "sales region"
filter. Name the most likely cause and the first query you would run.
:::

## Test three: the assertion query

The tests above share a shape: a query whose *empty or equal* result is the
evidence. That is the form to write generated SQL tests in, because it does not
require you to know the right answer in advance.

Four kinds are worth having, in roughly this order of value:

**Grain assertions.** After every join in the generated query, the fact row
count is unchanged. Fails on every fan-out.

**Invariant assertions.** Return the rows that violate a rule that must always
hold; a correct query returns none.

```sql runnable id=invariant dataset=package-registry
-- Every download row must point at a package that exists,
-- and no total may be negative. Both should return zero rows.
SELECT 'orphan download' AS violation, d.package_id AS detail
FROM downloads d
WHERE NOT EXISTS (SELECT 1 FROM packages p WHERE p.id = d.package_id)
UNION ALL
SELECT 'negative total', p.name
FROM packages p
JOIN downloads d ON d.package_id = p.id
GROUP BY p.name
HAVING sum(d.count) < 0;
```

**Cross-checks.** Compute the same number a structurally different way and
require agreement. Not a rewrite of the same query — a different route: sum the
fact table directly and compare against the metric's total across every value of
a dimension.

**Fixture tests.** A tiny table with a hand-computed answer, so that a
regression in the generator shows up as a diff against a number a human
verified once. These are the only tests that catch a metric being *defined*
wrong rather than *compiled* wrong.

:::warning{title="What comparing against a reference query does not catch"}
The obvious test for generated SQL is "does it return the same rows as the query
I would have written". It is worth having and it is weaker than it looks: the
reference was written by the same person, from the same understanding of the
schema, and will contain the same fan-out.

The tests above are stronger precisely because they do not depend on anyone
knowing the answer. A grain test can fail while both the generated query and
your reference query agree perfectly — and when it does, both are wrong.
:::

:::exercise{ref=grain-audit}
:::

:::exercise{ref=additive-total-by-language}
:::

:::exercise{ref=ratio-metric}
:::

::::track{depth=interview}
## "How would you test a text-to-SQL system?"

The answer that gets the job separates three failure modes and gives a different
test for each. The answer that does not says "compare it to a golden query".

**Failure 1: it does not run.** Syntax errors, hallucinated columns, wrong
types. Free to catch: compile every generated query — `EXPLAIN` it, or run it
inside a transaction you roll back. This is the failure everyone tests for and
the one that matters least, because it is loud.

**Failure 2: it runs and computes the wrong number.** This is the whole problem.
Say the four checks:

- *Grain.* Assert the fact row count survives every join. Catches fan-outs, the
  single most common semantic error, and needs no expected answer.
- *Invariants.* Assertion queries that return the violating rows: no orphans, no
  negative measures, no duplicate keys at the stated grain, totals within a
  plausible range. A correct query returns nothing.
- *Cross-checks.* The same quantity by two structurally different routes. If
  `total by language` summed over all languages does not equal `total`
  ungrouped, something is wrong even though neither number looks odd.
- *Fixtures.* A handful of rows with an answer computed by hand. Slow to write,
  and the only thing that catches a metric whose definition was wrong from the
  start.

**Failure 3: it answers a different question than was asked.** "Active users"
means one thing to finance and another to product. No SQL-level test can catch
this, and saying so is the strongest thing you can say in the interview: the
control is a semantic layer with reviewed, named metric definitions, so that the
model is choosing among defined metrics rather than inventing a definition from
column names.

:::insight{title="The sentence that lands"}
**"Execution accuracy is the easy metric and it is not the one I would ship on.
I want assertions that can fail while the query still runs — a grain test after
every join, and a rollup cross-check — because every expensive bug I have seen
in generated SQL ran fine and returned the wrong number."**

It says you have thought about what breaks rather than what is easy to measure,
and it names the specific control. Follow it with the fan-out example: a total
89% too high, no error, no NULL, nothing a schema check would catch.
:::

Two more points that are worth having ready.

*On evaluation sets:* execution accuracy against a benchmark measures whether
the generated SQL matches a reference on one database. It says nothing about
whether it will fan out on *your* schema, whose many-to-many relationships the
benchmark does not contain. Build the assertion suite against your own schema.

*On the layer as a safety mechanism:* constraining a model to compose defined
metrics and dimensions, rather than emit arbitrary SQL, converts an open-ended
correctness problem into a lookup. That is a smaller and much more testable
system, and it is the direction production systems have gone for exactly this
reason.
::::

:::quiz{id=quiz-l06 passing=2}
- id: q1
  prompt: "A generated query joins a 200-row fact table through a many-to-many bridge and the total comes out 89% high. Which test catches this without knowing the right answer?"
  options:
    - "Comparing the result to a hand-written reference query."
    - "Asserting that the fact table's row count is unchanged after the join."
    - "Checking that no column contains NULL."
    - "Running EXPLAIN to confirm the plan uses a hash join."
  answerIndex: 1
  explanation: >-
    A fan-out is visible as invented rows before any measure is computed, so a
    row-count assertion catches it with no expected value at all. The reference
    query is weaker: it was written from the same understanding of the schema
    and usually contains the same join, so both agree and both are wrong.
- id: q2
  prompt: "Why is `sum(DISTINCT amount)` the wrong response to a fan-out?"
  options:
    - "It is slower than the alternatives."
    - "It deduplicates by value, which removes genuinely distinct facts that happen to be equal, and has no relationship to the duplication the join introduced."
    - "DISTINCT is not allowed inside an aggregate in standard SQL."
    - "It only works when the join key is unique."
  answerIndex: 1
  explanation: >-
    Deduplication happens on the value, and the join duplicated rows. Two real
    days with the same download count collapse into one, so the measure loses
    real data — while the inflation may survive. The structural fix is to
    aggregate to the measure's grain before joining, or to use a semi-join when
    the join is only a filter.
- id: q3
  prompt: "Which measure is semi-additive?"
  options:
    - "Total downloads — summable over every dimension."
    - "Account balance — summable across accounts, but not across days."
    - "Downloads per release — a ratio that must be recomputed at the display grain."
    - "Distinct maintainers — a count that does not add up across any dimension."
  answerIndex: 1
  explanation: >-
    Semi-additive means summable over every dimension except one, and that
    dimension is almost always time. Adding today's balance to yesterday's is
    meaningless; adding two accounts' balances on the same day is not. Ratios
    and distinct counts are non-additive — they add up along nothing and must be
    recomputed wherever they are shown.
:::
