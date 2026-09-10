---
id: t1/s01/l06
title: NULL, and the logic that has three values
tier: t1-foundations
stage: s01-ground-floor
status: published
estimatedMinutes: 45
objectives:
  - Predict the result of a comparison involving NULL before running it.
  - Explain why COUNT(*) and COUNT(column) can disagree, and which one answers which question.
  - Recognise the NOT IN trap and write a query that avoids it.
prerequisites:
  - t1/s01/l05
misconceptions:
  - "**\"NULL means zero, or empty string.\"** It means *unknown*. Zero is a known quantity and the empty string is a known value; NULL is the absence of information. `0 = 0` is true, `'' = ''` is true, and `NULL = NULL` is neither."
  - "**\"`WHERE x != 'a'` returns every row where x isn't 'a'.\"** It returns rows where x is *known* not to be 'a'. Rows where x is NULL are excluded, because the engine cannot confirm the inequality."
  - "**\"NULL rows are just skipped, which is close enough.\"** Aggregates skip them, `WHERE` excludes them, and `NOT IN` with a NULL returns *nothing at all*. Three different behaviours; assuming one rule covers all three is how wrong numbers reach dashboards."
masteryChecklist:
  - I can say what `NULL = NULL` evaluates to and why it is not `TRUE`.
  - I can explain the difference between COUNT(*), COUNT(col) and COUNT(DISTINCT col) on a column containing NULLs.
  - Given a NOT IN subquery, I can say whether a NULL could silently empty the result, and rewrite it safely.
runtimes:
  - engine: duckdb
    datasetId: package-registry
---

Most programming languages have two truth values. SQL has three: `TRUE`,
`FALSE`, and `UNKNOWN`. That third value exists because real data has holes, and
it changes the meaning of nearly every operator you have learned.

This is the single largest source of quietly wrong analytics. Not crashes —
*wrong numbers that look plausible*. That is why it is here, in the first stage,
rather than filed under advanced topics.

## NULL is unknown, not empty

Our `packages` table has a nullable `license`. Some packages never declared one.

```sql runnable id=null-basics dataset=package-registry
SELECT
  NULL = NULL      AS null_equals_null,
  NULL <> NULL     AS null_not_equals_null,
  NULL = 1         AS null_equals_one,
  NULL IS NULL     AS null_is_null;
```

The first three are `NULL` — that is `UNKNOWN` being displayed. Only the fourth
is `true`.

The reasoning is worth internalising: if two values are both unknown, are they
equal? You cannot say. Two packages might both have undeclared licenses, and
that tells you nothing about whether the licenses match. So SQL refuses to
guess, and `IS NULL` exists precisely because `= NULL` can never work.

## What that does to WHERE

`WHERE` keeps rows where the condition is `TRUE`. Not `UNKNOWN` — `TRUE`.

```sql runnable id=where-null dataset=package-registry
SELECT
  (SELECT count(*) FROM packages)                          AS all_packages,
  (SELECT count(*) FROM packages WHERE license = 'MIT')    AS mit,
  (SELECT count(*) FROM packages WHERE license <> 'MIT')   AS not_mit,
  (SELECT count(*) FROM packages WHERE license IS NULL)    AS unknown_license;
```

Run it, then add up `mit` and `not_mit`. They do not reach `all_packages`. The
four rows with a NULL license are in neither bucket — for those rows both
conditions evaluate to `UNKNOWN`, and `WHERE` discards them both times.

:::pitfall{title="The report that quietly loses rows"}
"Packages not under MIT" sounds like a complete complement of "packages under
MIT". It is not. If you mean *including* the ones with no declared license, you
have to say so:

```sql
WHERE license <> 'MIT' OR license IS NULL
```

Every report that splits a nullable column into two buckets needs this, and
almost none of them have it.
:::

## COUNT is where it becomes visible

```sql runnable id=count-variants dataset=package-registry
SELECT
  count(*)                 AS rows_total,
  count(license)           AS licenses_known,
  count(DISTINCT license)  AS distinct_licenses
FROM packages;
```

Three counts, three different questions:

- `count(*)` counts **rows**. It never skips anything.
- `count(license)` counts **non-NULL values** in that column.
- `count(DISTINCT license)` counts **distinct non-NULL values**.

The gap between the first two is exactly your missing-data rate — which makes
`count(*) - count(col)` a genuinely useful data-quality check, not just trivia.

The same skipping applies to `AVG`, `SUM`, `MIN` and `MAX`: they ignore NULLs.
So `AVG(size_kb)` is the average *of the rows that have a size*, which is only
the average you wanted if you know the missing ones are missing at random.

:::checkpoint{id=cp-count rubric="count(*) counts rows,count(col) counts non-null values,the difference is the missing rate"}
A colleague reports "average package size is 172 KB" from a column where 30% of
rows are NULL. What have they actually measured, and what would you ask them?
:::

## The NOT IN trap

This is the one that costs people an afternoon.

```sql runnable id=not-in-trap dataset=package-registry
-- Intent: packages whose license is not one of these.
SELECT count(*) AS surprising_result
FROM packages
WHERE license NOT IN ('MIT', 'Apache-2.0', NULL);
```

Zero rows. Not "few" — *zero*, every time, no matter what the data holds.

`x NOT IN (a, b, c)` expands to `x <> a AND x <> b AND x <> c`. With a NULL in
the list, one of those comparisons is always `UNKNOWN`, and `TRUE AND UNKNOWN`
is `UNKNOWN`, which `WHERE` discards. The whole result collapses.

You rarely write a literal `NULL` in a list. You very often write
`WHERE id NOT IN (SELECT some_nullable_column FROM ...)` — and the day that
subquery returns its first NULL, the report silently goes empty.

```sql runnable id=not-exists-fix dataset=package-registry
-- NOT EXISTS is NULL-safe: it asks whether a matching row exists,
-- which is a question with only two answers.
SELECT count(*) AS safe_result
FROM packages p
WHERE NOT EXISTS (
  SELECT 1 FROM packages q
  WHERE q.license = p.license AND q.license = 'MIT'
);
```

:::insight{title="The habit to build"}
Whenever you write `NOT IN` with a subquery, ask one question: *can that column
be NULL?* If yes — or if you are not certain — use `NOT EXISTS`, which cannot
collapse this way. Many teams ban `NOT IN` on subqueries outright for exactly
this reason.
:::

:::exercise{ref=unlicensed-packages}
:::

:::exercise{ref=missing-data-report}
:::

:::quiz{id=quiz-l06 passing=2}
- id: q1
  prompt: "What does `NULL = NULL` evaluate to?"
  options:
    - "TRUE — both sides are identical."
    - "FALSE — NULL never equals anything."
    - "NULL (UNKNOWN) — two unknown values cannot be shown to be equal."
    - "It raises an error."
  answerIndex: 2
  explanation: >-
    Equality asks whether two values are the same. If both are unknown, the
    answer is unknowable, so SQL returns UNKNOWN rather than guessing. This is
    why `IS NULL` exists as a separate operator.
- id: q2
  prompt: "A table has 20 rows; 4 have a NULL license. What do count(*) and count(license) return?"
  options:
    - "20 and 20 — count ignores NULLs in both forms."
    - "20 and 16 — count(*) counts rows, count(license) counts non-NULL values."
    - "16 and 16 — NULL rows are excluded from the table scan."
    - "20 and 4 — count(license) counts the NULLs."
  answerIndex: 1
  explanation: >-
    count(*) counts rows regardless of content. count(col) counts non-NULL
    values in that column. Their difference — 4 here — is exactly the number of
    missing values, which makes it a handy data-quality probe.
- id: q3
  prompt: "Why can `WHERE id NOT IN (SELECT parent_id FROM t)` return zero rows unexpectedly?"
  options:
    - "Because the subquery runs once per row and times out."
    - "Because if parent_id contains any NULL, every comparison becomes UNKNOWN and WHERE discards every row."
    - "Because NOT IN requires an index on parent_id."
    - "Because subqueries in NOT IN are evaluated as strings."
  answerIndex: 1
  explanation: >-
    NOT IN expands to a chain of `<>` comparisons joined by AND. A single NULL
    makes one link UNKNOWN, and TRUE AND UNKNOWN is UNKNOWN — so no row ever
    qualifies. NOT EXISTS asks a two-valued question and is safe.
:::
