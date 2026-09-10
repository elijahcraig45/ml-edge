---
id: t2/s03/l05
title: Joins, cardinality, and the fan-out trap
tier: t2-core-structures
stage: s03-linear-structures
status: published
estimatedMinutes: 50
objectives:
  - Choose between inner, left, right, full, cross, semi and anti joins from the wording of a question.
  - Compute the row count of a join before running it, from the cardinality of the two sides.
  - Detect and fix a fan-out — two one-to-many joins from the same parent silently multiplying an aggregate.
prerequisites:
  - t1/s01/l05
  - t1/s01/l06
misconceptions:
  - "**\"A join returns one row per row of the left table.\"** It returns one row per *matching pair*. If two rows on the right match, you get two rows out. That is not an edge case; it is the definition, and it is where fan-out comes from."
  - "**\"Adding DISTINCT fixes duplicate rows.\"** It removes duplicate rows after the engine has built them, which hides the symptom and costs a sort or a hash. Worse, `SUM(DISTINCT x)` deduplicates *values*, so two days that genuinely had the same download count collapse into one. DISTINCT after a join is a smell, not a fix."
  - "**\"A LEFT JOIN can't lose rows.\"** It cannot — until you put a condition on the right table in `WHERE` instead of in `ON`. `WHERE r.col = 'x'` is false for the NULLs the LEFT JOIN just manufactured, so it silently converts your left join back into an inner join."
  - "**\"Semi-join is just an inner join plus DISTINCT.\"** They produce the same rows here and they are different operators. A semi-join can stop scanning the right side at the first match and never builds a duplicate; DISTINCT builds every duplicate and then removes it. On a large fact table that difference is the difference between a query finishing and not."
masteryChecklist:
  - Given two tables and their cardinalities, I can predict how many rows a join produces before running it.
  - I can name which join type a question needs from its wording — "never", "at least one", "including those with none".
  - I can spot a fan-out by comparing row counts before and after a join.
  - I can fix a fan-out by pre-aggregating each branch, and say why SUM(DISTINCT) is not a fix.
runtimes:
  - engine: duckdb
    datasetId: package-registry
---

A join can produce more rows than either input. Most working SQL bugs that
produce *plausible wrong numbers* rather than errors come from that one
sentence, and the worst of them is in the second half of this lesson.

:::dataset{id=package-registry tables="packages,versions,maintainers,package_maintainers,downloads"}
:::

## A join is a filtered cross product

Start from the operation that has no filtering at all.

```sql runnable id=cross-join dataset=package-registry
SELECT
  (SELECT count(*) FROM packages)                             AS packages,
  (SELECT count(*) FROM maintainers)                          AS maintainers,
  (SELECT count(*) FROM packages CROSS JOIN maintainers)      AS cross_product;
```

Twenty packages, ten maintainers, two hundred rows: every pairing, no
condition. Every other join is this, with a condition applied and some rule for
what happens to rows that find no partner.

| Join | Keeps | Row count |
| --- | --- | --- |
| `CROSS` | every pair | `left × right` |
| `INNER` | pairs that match | one per matching pair |
| `LEFT` | matching pairs, plus unmatched left rows padded with NULL | ≥ left, if right can match more than once |
| `RIGHT` | mirror image of LEFT | ≥ right |
| `FULL` | both sides' unmatched rows, padded | ≥ max(left, right) |
| `SEMI` | left rows that have *at least one* match | ≤ left, never duplicated |
| `ANTI` | left rows that have *no* match | ≤ left, never duplicated |

Semi and anti are the two that Python programmers usually have not met, and
they are the two you need most often, because they are how you say "has some"
and "has none" without letting the right-hand table change your row count.

```sql runnable id=semi-and-anti dataset=package-registry
-- SEMI: packages with at least one prerelease. One row per package.
SELECT 'semi: has a prerelease' AS question, count(*) AS packages
FROM packages p
WHERE EXISTS (SELECT 1 FROM versions v WHERE v.package_id = p.id AND v.is_prerelease)

UNION ALL

-- ANTI: packages with no prerelease at all.
SELECT 'anti: has no prerelease', count(*)
FROM packages p
WHERE NOT EXISTS (SELECT 1 FROM versions v WHERE v.package_id = p.id AND v.is_prerelease)

UNION ALL

SELECT 'total packages', count(*) FROM packages;
```

Seven and thirteen, adding to twenty. Semi and anti partition the left table
exactly, which is a property no inner join has.

:::note{title="Why the syntax looks nothing like the name"}
Most engines have no `SEMI JOIN` keyword. You write `EXISTS` or `IN`, and the
planner recognises it and picks a semi-join operator. Read a query plan and you
will see `SEMI` and `ANTI` named explicitly even though your SQL never said
them. DuckDB does this; so do Postgres, Spark, and Snowflake.
:::

## Cardinality arithmetic

You can compute a join's row count before you run it, and you should, because
the answer is the difference between a report and a wrong report.

Each package has 1..3 versions. Each package has 1..3 maintainers. So:

```sql runnable id=cardinality dataset=package-registry
SELECT
  (SELECT count(*) FROM packages)                    AS packages,
  (SELECT count(*) FROM versions)                    AS versions,
  (SELECT count(*) FROM package_maintainers)         AS links,
  (SELECT count(*) FROM packages p
     JOIN versions v ON v.package_id = p.id)         AS with_versions,
  (SELECT count(*) FROM packages p
     JOIN versions v ON v.package_id = p.id
     JOIN package_maintainers pm ON pm.package_id = p.id)
                                                     AS both;
```

Joining `packages` to `versions` gives 26 rows — one per version, because the
join is driven by the many side. Add `package_maintainers` and you get 37, which
is not 26 + 26 and not 26 either. It is

$$
\sum_{p \in \text{packages}} \text{versions}(p) \times \text{maintainers}(p)
$$

The two child tables have nothing to do with each other, and the join has
multiplied them anyway.

:::checkpoint{id=cp-cardinality rubric="a join emits one row per matching pair,two one-to-many children multiply,the row count is the sum over parents of the product"}
`packages` joined to `versions` gives 26 rows. `packages` joined to
`package_maintainers` gives 26 rows. Joining all three gives 37. Explain where
37 comes from, in terms of a single package.
:::

## The fan-out trap

Here is the bug. It is the most valuable thing in this stage.

```sql runnable id=fanout dataset=package-registry
-- "Total downloads and team size for each package." Looks completely normal.
SELECT
  p.name,
  sum(d.count)                       AS total_downloads,
  count(DISTINCT pm.maintainer_id)   AS maintainer_count
FROM packages p
JOIN downloads d            ON d.package_id = p.id
JOIN package_maintainers pm ON pm.package_id = p.id
GROUP BY p.name
ORDER BY total_downloads DESC
LIMIT 5;
```

`arrowkit` reports 184,000 downloads. Now check it against the source table:

```sql runnable id=fanout-truth dataset=package-registry
SELECT
  sum(count)  AS arrowkit_real_total,
  count(*)    AS download_rows
FROM downloads
WHERE package_id = 1;
```

92,000, from ten rows. The report is exactly double, and `arrowkit` has exactly
two maintainers. `chunker` has three and is exactly triple. Every package with
one maintainer is correct.

The mechanism is the cardinality arithmetic from a moment ago. `packages ⋈
downloads` produces 10 rows per package. Joining `package_maintainers` onto that
produces 10 × (number of maintainers) rows, each carrying the same download
count, and `sum` faithfully adds up every copy.

:::pitfall{title="Why this bug survives review"}
Nothing errors. The row count is right — twenty packages, twenty rows. Seventeen
of the twenty numbers are correct, because seventeen packages have a single
maintainer. The three that are wrong are wrong by a clean integer factor, so
they do not look corrupted, they look large.

And the wrongness is *proportional to team size*, which correlates with how
important a package is. Your most significant packages are the most inflated.
:::

### The fix, and the non-fixes

**The fix: pre-aggregate each branch to one row per parent before joining.**

```sql runnable id=fanout-fixed dataset=package-registry
WITH package_downloads AS (
  SELECT package_id, sum(count) AS total_downloads
  FROM downloads
  GROUP BY package_id
),
package_team AS (
  SELECT package_id, count(*) AS maintainer_count
  FROM package_maintainers
  GROUP BY package_id
)
SELECT p.name, d.total_downloads, t.maintainer_count
FROM packages p
JOIN package_downloads d ON d.package_id = p.id
JOIN package_team t      ON t.package_id = p.id
ORDER BY d.total_downloads DESC
LIMIT 5;
```

Both CTEs are one row per package, so neither join can multiply anything. The
totals are now the same numbers you get from `downloads` alone, because nothing
was ever duplicated.

**Non-fix 1: `SUM(DISTINCT d.count)`.** `DISTINCT` deduplicates *values*, not
rows. Two different days with the same download count are two legitimate rows
holding the same number, and this would collapse them. It converts an inflated
answer into a deflated one, which is worse, because now the error is not a clean
factor and you cannot spot it.

**Non-fix 2: `SELECT DISTINCT` on the whole query.** That deduplicates output
rows, and the output rows here are already distinct — one per package. It does
nothing at all, at the cost of a sort.

**Non-fix 3: dividing by the maintainer count.** It produces the right answer on
this data and it is a landmine. It encodes an assumption about the fan-out
factor into the arithmetic, so the day a package gains a maintainer between the
two joins — or the day someone adds a third one-to-many join — it is silently
wrong again with no trace of the reasoning.

:::insight{title="The habit that catches it every time"}
After adding a join, check whether the row count changed:

```sql
SELECT count(*) FROM a;                            -- before
SELECT count(*) FROM a JOIN b ON ...;              -- after
```

If it grew and you did not intend a fan-out, then every `SUM`, `AVG`, `COUNT`
and window function downstream is now wrong. This takes four seconds and it is
the single highest-value habit in analytical SQL.
:::

## The other half: LEFT JOIN and where the condition goes

A `LEFT JOIN` promises to keep every left row. There is one way to break that
promise, and everybody does it once.

```sql runnable id=left-join-where dataset=package-registry
SELECT
  (SELECT count(*) FROM packages)                          AS all_packages,

  (SELECT count(*) FROM packages p
     LEFT JOIN versions v
       ON v.package_id = p.id AND v.is_prerelease)         AS condition_in_on,

  (SELECT count(*) FROM packages p
     LEFT JOIN versions v ON v.package_id = p.id
   WHERE v.is_prerelease)                                  AS condition_in_where;
```

With the condition in `ON`, the join keeps all twenty packages and pads the
thirteen with no prerelease with NULLs. With the same condition in `WHERE`, the
NULLs the join just manufactured fail the test and get discarded — leaving seven
rows, which is what an inner join would have given you.

:::pitfall{title="The rule"}
In a `LEFT JOIN`, a condition on the **right** table belongs in `ON`. A
condition on the **left** table belongs in `WHERE`. Getting this backwards turns
your outer join into an inner join with no warning and no error.

The one exception is deliberate: `WHERE right.key IS NULL` after a `LEFT JOIN`
is the anti-join idiom, and it works precisely because it selects the
manufactured NULLs rather than rejecting them.
:::

:::exercise{ref=python-maintainers}
:::

:::exercise{ref=never-owned}
:::

:::exercise{ref=download-and-maintainer-report}
:::

## The Python counterpart

An inner join on an equality condition is a dictionary lookup inside a loop.
That is not an analogy — it is what a hash join does, and you will build one in
Stage 5.

```python
# packages ⋈ package_maintainers, written out
by_package = {}
for link in package_maintainers:            # build side
    by_package.setdefault(link["package_id"], []).append(link)

for package in packages:                     # probe side
    for link in by_package.get(package["id"], []):
        emit(package, link)                  # <- the nested loop IS the fan-out
```

The inner `for` is where extra rows come from, and seeing it as a loop makes the
fan-out obvious in a way the SQL does not. If `by_package[id]` holds three
links, the body runs three times, and anything you accumulate outside the loop
gets three copies.

`EXISTS` is the same code with `break` after the first match. `NOT EXISTS` is
`if not by_package.get(id)`. Every join type in the table above is a small
variation on those five lines.

::::track{depth=interview}
## What interviewers are checking

Join questions are rarely about syntax. They are about whether you know what the
row count will be, and there are three questions that come up over and over.

**"What's the difference between a LEFT JOIN and an INNER JOIN?"** The weak
answer is "left keeps all the left rows". The strong answer adds the failure
mode: "and the thing to watch is that a filter on the right table in `WHERE`
turns it back into an inner join, because it rejects the NULLs the outer join
just created."

**"This query is returning too many rows. What's wrong?"** They want you to say
*fan-out* and to reach for the row-count comparison rather than for `DISTINCT`.
Say it as arithmetic: "if I'm joining two one-to-many children of the same
parent, I'm getting the product per parent. I'd pre-aggregate each side to one
row per parent before joining."

**"How would you check that a report is right?"** Cross-foot it. Compute the
grand total independently from a single table, then check that the sum of your
per-row results matches. In this dataset that is 363,840 downloads either way —
and the fan-out version gives 551,770, so the check catches it immediately.

:::interview{title="The sentence to have ready"}
"Before I add a join I ask what it does to the grain of the result. If the join
key isn't unique on the other side, the grain changes, and every aggregate
downstream has to be re-examined."

*Grain* — the level one row represents — is the vocabulary that separates people
who have debugged this from people who have read about it. It is also exactly
the right concept: the fan-out bug is a grain change nobody noticed.
:::
::::

:::quiz{id=quiz-l05 passing=3}
- id: q1
  prompt: "`packages` joined to `versions` gives 26 rows. `packages` joined to `package_maintainers` gives 26 rows. How many rows does joining all three give?"
  options:
    - "26 — the join key is the same, so the rows line up."
    - "52 — the two joins add together."
    - "37 — for each package, the number of versions times the number of maintainers, summed."
    - "520 — the product of the two totals."
  answerIndex: 2
  explanation: >-
    A join emits one row per matching pair, so two one-to-many children of the
    same parent produce their product for each parent. Summing that product
    over the twenty packages gives 37. Neither addition nor a global product is
    the right model.
- id: q2
  prompt: "A report joins `downloads` and `package_maintainers` to `packages` and sums downloads. arrowkit shows 184,000 instead of 92,000. What is the correct fix?"
  options:
    - "Use `SUM(DISTINCT d.count)` to remove the duplicates."
    - "Add `SELECT DISTINCT` to the outer query."
    - "Pre-aggregate downloads and maintainers separately, then join the one-row-per-package results."
    - "Divide the total by the number of maintainers."
  answerIndex: 2
  explanation: >-
    The duplication happens inside the join, so it has to be prevented there.
    SUM(DISTINCT) deduplicates values and would drop two days that genuinely
    had equal counts; SELECT DISTINCT does nothing since the output rows are
    already unique; dividing hard-codes the fan-out factor and breaks the next
    time the data or the query changes.
- id: q3
  prompt: "Why does `LEFT JOIN versions v ON v.package_id = p.id WHERE v.is_prerelease` return fewer rows than expected?"
  options:
    - "Because LEFT JOIN is not supported with a WHERE clause."
    - "Because the WHERE runs after the join and discards the NULL-padded rows, making it an inner join."
    - "Because `is_prerelease` is a boolean and booleans cannot be filtered."
    - "Because the join condition should use `=` rather than a boolean column."
  answerIndex: 1
  explanation: >-
    The outer join manufactures NULL rows for packages with no prerelease, and
    `WHERE NULL` is UNKNOWN, so those rows are dropped. Moving the condition
    into `ON` filters what may match while still keeping every left row.
- id: q4
  prompt: "Which question calls for an anti-join?"
  options:
    - "Which maintainers maintain at least one Python package?"
    - "Which maintainers have never owned a package?"
    - "How many packages does each maintainer maintain?"
    - "Which packages and maintainers are paired together?"
  answerIndex: 1
  explanation: >-
    A requirement phrased as "never" is a statement about the absence of any
    matching row, which is exactly an anti-join — NOT EXISTS, or a LEFT JOIN
    with IS NULL. "At least one" is a semi-join, "how many" is an aggregate,
    and the last is a plain inner join.
:::
