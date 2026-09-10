---
id: t2/s03/l06
title: Grouping, and set algebra you already know
tier: t2-core-structures
stage: s03-linear-structures
status: published
estimatedMinutes: 45
objectives:
  - Place GROUP BY and HAVING correctly in the engine's clause evaluation order, and say why WHERE cannot filter an aggregate.
  - Map UNION, UNION ALL, INTERSECT and EXCEPT onto Python's set and list operations, including what each does to duplicates.
  - Use CTEs to name intermediate results and turn a nested query into a readable sequence.
prerequisites:
  - t2/s03/l05
  - t1/s01/l06
misconceptions:
  - "**\"`HAVING` is just `WHERE` for aggregates, so it does not matter which one you use when both work.\"** It matters a lot. `WHERE` discards rows before grouping; `HAVING` discards groups after. Same answer when the condition is on a non-aggregated column, very different cost — the `HAVING` version groups rows it is about to throw away."
  - "**\"`UNION` is a cheap way to stick two results together.\"** `UNION` deduplicates, which means a sort or a hash of the combined result. `UNION ALL` is the concatenation. If the halves are disjoint and you write `UNION`, you have paid for a deduplication that removes nothing."
  - "**\"`COUNT(*)` and `COUNT(column)` are the same inside a `GROUP BY`.\"** They differ by exactly the NULLs in that column, and after a `LEFT JOIN` the difference is the whole point: `count(*)` counts a padded no-match row as 1, `count(right.id)` counts it as 0."
  - "**\"A CTE is a performance feature.\"** In most modern engines it is inlined and optimised exactly like a subquery, so it is a readability feature. Assuming it materialises — or assuming it does not — is how people get surprised; Postgres changed this behaviour in version 12."
masteryChecklist:
  - I can recite the clause evaluation order and use it to explain why an alias works in ORDER BY but not in WHERE.
  - I can pick between WHERE and HAVING for a given condition and justify it on cost, not just correctness.
  - Given a set-operation query, I can write the equivalent Python with sets and say what happens to duplicates.
  - I can rewrite a two-level nested subquery as CTEs and explain why the result is easier to review.
runtimes:
  - engine: duckdb
    datasetId: package-registry
---

`GROUP BY` collapses many rows into one. Everything confusing about it follows
from a single question: *at what point in the query does that collapse happen?*
Answer that and `HAVING`, the alias rules, and half of SQL's error messages stop
being arbitrary.

## The order the engine works in

You write clauses in one order. The engine evaluates them in another.

```
FROM  →  WHERE  →  GROUP BY  →  HAVING  →  SELECT  →  ORDER BY  →  LIMIT
```

Every rule that follows is a consequence of that line.

```sql runnable id=where-vs-having dataset=package-registry
-- WHERE runs before the grouping, so it filters rows.
-- HAVING runs after, so it filters groups.
SELECT
  p.language,
  count(*)          AS release_count,
  sum(v.size_kb)    AS total_kb
FROM packages p
JOIN versions v ON v.package_id = p.id
WHERE NOT v.is_prerelease          -- drop prerelease rows before grouping
GROUP BY p.language
HAVING count(*) >= 3               -- drop small groups after grouping
ORDER BY total_kb DESC;
```

Try moving `NOT v.is_prerelease` into `HAVING` and `count(*) >= 3` into `WHERE`.
The second swap fails outright — `WHERE` runs before any group exists, so there
is nothing to count. That error is not the parser being fussy; it is the
evaluation order made visible.

The same order explains the alias rules, which otherwise look inconsistent:

- `WHERE total_kb > 100` — **fails**. `SELECT` has not run, so the alias does
  not exist.
- `ORDER BY total_kb` — **works**. `SELECT` ran one step ago.

:::insight{title="When both work, use WHERE"}
A condition on a non-aggregated column can be written either way and both give
the same answer. `WHERE` is the right choice, because it removes rows the engine
then never has to hash, group, or aggregate.

On twenty rows this is invisible. On a billion-row table, filtering before the
aggregation instead of after it is often the difference between seconds and
minutes — and it is exactly what "predicate pushdown" means when you read it in
a query plan.
:::

:::checkpoint{id=cp-order rubric="from where group by having select order by limit,where runs before grouping so it cannot see aggregates,order by runs after select so it can use aliases"}
Write down the clause evaluation order, then use it to explain both of these in
one sentence each: why `WHERE count(*) > 3` is an error, and why
`ORDER BY release_count` is fine.
:::

## COUNT after an outer join

The count variants from the NULL lesson come back with teeth once a `LEFT JOIN`
is involved.

```sql runnable id=count-after-left-join dataset=package-registry
SELECT
  p.name,
  count(*)                     AS count_star,
  count(v.id)                  AS count_versions,
  count(DISTINCT v.is_prerelease) AS distinct_flags
FROM packages p
LEFT JOIN versions v
  ON v.package_id = p.id AND v.is_prerelease
GROUP BY p.name
ORDER BY count_versions, p.name
LIMIT 6;
```

Look at the rows where `count_star` is 1 and `count_versions` is 0. Those are
packages with no prerelease at all: the `LEFT JOIN` manufactured a single
NULL-padded row, `count(*)` counted that row, and `count(v.id)` correctly
counted zero actual versions.

`count(*)` after a `LEFT JOIN` never returns 0. If you want "how many matched",
you must count a column from the right side.

:::pitfall{title="The dashboard that says every package has one release"}
This is the most common `LEFT JOIN` bug after the `WHERE`-versus-`ON` one. The
query looks right, the number is plausible, and every entity with no children
reports exactly 1 child instead of 0. The floor of 1 is the tell — if a "number
of X per Y" column has a minimum of 1 and you expected some Ys to have none,
check what you are counting.
:::

## Set operations are Python set operations

SQL's four set operators have exact Python twins, and knowing the pairing means
you never have to remember which one deduplicates.

| SQL | Python | Duplicates | Costs |
| --- | --- | --- | --- |
| `UNION ALL` | `list_a + list_b` | kept | nothing — concatenation |
| `UNION` | `set_a \| set_b` | removed | a sort or a hash |
| `INTERSECT` | `set_a & set_b` | removed | a sort or a hash |
| `EXCEPT` | `set_a - set_b` | removed | a sort or a hash |

```sql runnable id=set-ops dataset=package-registry
WITH owners AS (
  SELECT maintainer_id FROM package_maintainers WHERE role = 'owner'
),
contributors AS (
  SELECT maintainer_id FROM package_maintainers WHERE role = 'contributor'
)
SELECT 'owner rows (UNION ALL keeps duplicates)' AS label,
       count(*) AS n FROM (SELECT * FROM owners UNION ALL SELECT * FROM contributors)
UNION ALL
SELECT 'distinct people in either role (UNION)',
       count(*) FROM (SELECT * FROM owners UNION SELECT * FROM contributors)
UNION ALL
SELECT 'both roles somewhere (INTERSECT)',
       count(*) FROM (SELECT * FROM owners INTERSECT SELECT * FROM contributors)
UNION ALL
SELECT 'owner but never contributor (EXCEPT)',
       count(*) FROM (SELECT * FROM owners EXCEPT SELECT * FROM contributors)
ORDER BY label;
```

26 link rows in total. 10 distinct people. 5 who hold both roles somewhere, 3
who only ever own, and 2 who only ever contribute — and 5 + 3 + 2 = 10, which is
the partition you would expect from `a & b`, `a - b`, `b - a` on Python sets.

:::note{title="The `ALL` variants exist for the others too"}
`INTERSECT ALL` and `EXCEPT ALL` are multiset operations: they count copies. If
the left side holds a value three times and the right side twice, `EXCEPT ALL`
returns it once. They are rare in application code and they are exactly what the
grader for these SQL exercises uses, because comparing multisets is how you
check two results are identical *including* duplicates.
:::

:::insight{title="EXCEPT is an anti-join with a different shape"}
`SELECT id FROM a EXCEPT SELECT id FROM b` and `SELECT id FROM a WHERE NOT
EXISTS (SELECT 1 FROM b WHERE b.id = a.id)` answer the same question.

They are not interchangeable. `EXCEPT` compares *whole rows* and deduplicates
the result; the anti-join compares on a join condition and preserves duplicates
from the left side. Reach for `EXCEPT` when the two sides are naturally the same
shape and you want a set. Reach for `NOT EXISTS` when you want the left table's
rows, all of its columns, and its duplicates intact.
:::

## CTEs: naming the steps

A `WITH` clause names an intermediate result. That is all it does, and it is
worth a lot.

```sql runnable id=cte-readability dataset=package-registry
WITH package_downloads AS (
  SELECT package_id, sum(count) AS total_downloads
  FROM downloads
  GROUP BY package_id
),
ranked AS (
  SELECT
    p.name,
    p.language,
    d.total_downloads
  FROM packages p
  JOIN package_downloads d ON d.package_id = p.id
)
SELECT language, count(*) AS packages, sum(total_downloads) AS downloads
FROM ranked
GROUP BY language
ORDER BY downloads DESC;
```

Each CTE is a named step you can check on its own: select from
`package_downloads` alone and confirm it has twenty rows before you trust
anything built on it. The nested-subquery version of this query computes the
same thing and has to be read inside-out.

The pre-aggregation fix for the fan-out trap in the previous lesson was a CTE
for exactly this reason. "Reduce this branch to one row per package" is a step
that deserves a name.

:::warning{title="What a CTE is not"}
It is not a temporary table and it is not, in general, a materialisation hint.
Most engines inline a CTE into the query and optimise the whole thing together,
and a CTE referenced twice may well be *computed* twice.

Postgres is the cautionary tale: before version 12 a CTE was an optimisation
fence that was always materialised, and a great deal of advice written before
2019 depends on that. Since 12 it inlines by default, with `MATERIALIZED` and
`NOT MATERIALIZED` available when you need to say which you meant. If it
matters to your query, say so explicitly rather than relying on the default.
:::

:::exercise{ref=busy-maintainers}
:::

:::exercise{ref=owner-and-contributor}
:::

## The Python counterpart

`GROUP BY` is a dictionary keyed by the grouping columns.

```python
totals = {}
for row in rows:
    key = row["language"]
    totals[key] = totals.get(key, 0) + row["size_kb"]
```

That is a hash aggregate, which is what the engine builds when it sees
`GROUP BY language`. The key is the group, the value is the running state of
each aggregate, and one pass over the input fills it. `count`, `sum` and `min`
each need one number of state; `avg` needs two (a sum and a count), which is why
it is not a special case at all.

`HAVING` is the filter applied to `totals.items()` after that loop, and `WHERE`
is a filter inside it. Written this way, the reason `WHERE` cannot see a count
is obvious: the loop has not finished.

::::track{depth=systems}
## What the engine actually builds

There are two ways to compute `GROUP BY`, and every engine has both.

**Hash aggregation** is the dictionary above. One pass over the input, a hash
table keyed by the grouping columns, the aggregate state updated in place. It is
O(n) and it is the default whenever the hash table fits in memory.

**Sort aggregation** sorts the input by the grouping key and then walks it,
emitting a group each time the key changes. It costs a sort, and it needs only
the state for the group currently in hand. Engines pick it when the input is
already sorted — from an index, or from a merge join upstream — or when the hash
table would not fit.

That second case is the interesting one. A hash aggregate's memory is
proportional to the number of *distinct groups*, not to the input size. Group a
trillion rows by country and the table has 200 entries; group them by user id
and it has a billion. When it will not fit, the engine **spills**: it partitions
the input by a hash of the key, writes the partitions to disk, and processes
them one at a time — because rows with the same key always land in the same
partition, so each partition can be aggregated independently.

That partition-and-recurse structure is the same one that makes distributed
aggregation work. `GROUP BY` across a cluster is a **shuffle**: each node
partitions its rows by hash of the key and sends each partition to the node
that owns it. Two properties make it cheap:

- Aggregates like `count`, `sum`, `min` and `max` are *decomposable*. Each node
  can pre-aggregate locally and send one partial result per group instead of
  every row. This is a combiner, and it usually cuts the network traffic by
  orders of magnitude.
- `avg` is decomposable too, as long as you ship `(sum, count)` and divide at
  the end rather than shipping averages. Averaging averages is wrong whenever
  the groups differ in size, and it is a classic distributed-systems bug.

:::insight{title="Which aggregates do not decompose"}
`count(DISTINCT x)` does not. Every node has to know about every value to avoid
double-counting, so the values themselves have to move, and the shuffle no
longer shrinks. That is why `COUNT(DISTINCT)` on a large key is dramatically
more expensive than `COUNT`, and why approximate sketches exist — HyperLogLog
gives you a decomposable, mergeable summary in a few kilobytes. Stage 9 builds
one.

Median has the same problem for the same reason, which is why so many systems
offer an approximate quantile instead.
:::
::::

:::quiz{id=quiz-l06 passing=3}
- id: q1
  prompt: "Why is `WHERE count(*) > 3` an error while `HAVING count(*) > 3` is not?"
  options:
    - "WHERE only supports comparisons against literals."
    - "WHERE is evaluated before GROUP BY, so no group and no count exist yet."
    - "count(*) is only valid in the SELECT list."
    - "HAVING is faster, so the parser prefers it."
  answerIndex: 1
  explanation: >-
    The evaluation order is FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY.
    WHERE sees individual rows; the count does not exist until the grouping has
    happened. HAVING runs after, which is precisely why it can talk about
    aggregates.
- id: q2
  prompt: "You combine two result sets you know are disjoint. Which operator should you use?"
  options:
    - "UNION, because it is the standard way to combine results."
    - "UNION ALL, because there are no duplicates to remove and it avoids the deduplication cost."
    - "INTERSECT, because the sets do not overlap."
    - "EXCEPT, to keep the first set intact."
  answerIndex: 1
  explanation: >-
    UNION deduplicates, which means sorting or hashing the whole combined
    result. If you already know the halves are disjoint, that work removes
    nothing. UNION ALL is a concatenation and is the honest statement of intent.
- id: q3
  prompt: "After `LEFT JOIN versions v ON ...`, `count(*)` grouped by package never returns 0. Why?"
  options:
    - "count(*) has a minimum of 1 by definition."
    - "The LEFT JOIN emits one NULL-padded row for a package with no matches, and count(*) counts that row."
    - "GROUP BY discards empty groups."
    - "Because versions is never empty."
  answerIndex: 1
  explanation: >-
    The padded row exists, so counting rows counts it. To count actual matches
    you must count a column from the right side — count(v.id) — which is NULL
    on the padded row and therefore skipped.
- id: q4
  prompt: "Why is `COUNT(DISTINCT user_id)` so much more expensive than `COUNT(*)` in a distributed query?"
  options:
    - "DISTINCT forces a full table scan and COUNT(*) does not."
    - "It is not; the two cost the same."
    - "COUNT is decomposable, so each node can send one partial per group, while DISTINCT requires the values themselves to move so duplicates can be detected across nodes."
    - "DISTINCT is evaluated row by row rather than in batches."
  answerIndex: 2
  explanation: >-
    A count can be pre-aggregated locally and summed centrally. A distinct count
    cannot: a value seen on two nodes must not be counted twice, so the values
    have to be shuffled and the network traffic no longer shrinks. Sketches such
    as HyperLogLog exist to restore the mergeability at the cost of exactness.
:::
