---
id: t2/s06/l07
title: CREATE INDEX, and reading the plan it changes
tier: t2-core-structures
stage: s06-trees-and-indexes
status: published
estimatedMinutes: 50
objectives:
  - Create an index and read an execution plan closely enough to say whether it was used.
  - Write sargable predicates, and recognise the three ways people accidentally stop being able to use an index.
  - Order the columns of a composite index using the left-prefix rule, and say when a covering index earns its extra column.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"Adding an index makes queries faster.\"** It makes *some* queries faster and every write slower, because every insert, update and delete has to maintain the tree. An index also costs storage — often 10 to 30% of the table per index. An unused index is pure overhead, and most databases have several."
  - "**\"The optimiser will use my index if it can.\"** It uses the index if it *estimates* the index is cheaper. Fetching 40% of a table through an index means one random read per row plus the index descent, which is usually slower than reading the table sequentially. A full scan is not a failure, and forcing an index on an unselective predicate makes things worse."
  - "**\"`WHERE lower(name) = 'x'` uses the index on name, since it's the same column.\"** It does not. The index stores `name`, not `lower(name)`, and the engine cannot invert an arbitrary function to work out which index entries could match. Once a column is wrapped in a function it is a different value, and only an index on that expression can help."
masteryChecklist:
  - Given a plan, I can find the scan node and say whether it was an index scan or a sequential scan.
  - Given a slow query, I can spot the predicate that is not sargable and rewrite it as a range.
  - Given a set of queries, I can choose the column order for one composite index and justify it with the left-prefix rule.
runtimes:
  - engine: duckdb
    datasetId: package-registry
---

You have now built every part of an index. `CREATE INDEX` builds a B+ tree over
one or more columns, keeps it correct through every write, and hands the query
planner a second way to find rows. This lesson is about the half you cannot
write yourself: deciding when the planner will actually use it.

The tool for that is the execution plan, and the skill is reading one closely
enough to notice what is *missing* from it.

:::warning{title="What DuckDB will and will not show you"}
The engine in this page is DuckDB, a column store, and its indexes are not B+
trees — they are adaptive radix trees, used for equality lookups and for
enforcing constraints. Three consequences you should know before you trust
anything you see here:

1. `EXPLAIN` shows the *planned* operators, and DuckDB decides between an index
   scan and a sequential scan at execution time. Only `EXPLAIN ANALYZE` names
   which one ran.
2. DuckDB's index serves single-column equality. It does not serve range
   predicates, and it does not serve a prefix of a composite key — where a row
   store's B+ tree does both.
3. Nothing here uses an index to satisfy `ORDER BY`.

So the plans below are real and were run to produce this page, and where the
concept is a row-store B+ tree property that DuckDB does not implement, this
lesson says so rather than pretending. The concepts are the ones you will use
against Postgres, MySQL and SQL Server; the demonstrations are honest about
which engine they came from.
:::

## Creating one, and seeing that it exists

```sql runnable id=create-index dataset=package-registry
DROP INDEX IF EXISTS idx_packages_name;
CREATE INDEX idx_packages_name ON packages(name);
CREATE INDEX IF NOT EXISTS idx_packages_language_created ON packages(language, created_at);

SELECT index_name, table_name, sql
FROM duckdb_indexes()
ORDER BY index_name
LIMIT 10;
```

Two indexes, one on a single column and one on a pair. Each is a separate
structure holding a sorted copy of those columns plus a pointer back to the row,
maintained on every write to the table.

That maintenance is the reason "add an index" is not free advice. A table with
six indexes turns one row insert into seven structure updates, and a bulk load
into that table can be several times slower than a load into an unindexed copy
followed by building the indexes at the end — which is why that is the standard
recipe for a large load.

## Reading a plan: find the scan

Plans print as a tree and are read **bottom-up**: the leaves touch the tables,
each node consumes its children's rows, and the root produces your result. The
node to look at first is always the bottom one.

Here is the same query before and after the index existed, from
`EXPLAIN ANALYZE` — trimmed to the scan node, which is the only part that
changed:

```text
-- no index on packages(name)
┌───────────────────────────┐
│         TABLE_SCAN        │
│      Table: packages      │
│   Type: Sequential Scan   │      <- every row read, filter applied to each
│          Filters:         │
│      name='arrowkit'      │
│           1 row           │
└───────────────────────────┘

-- after CREATE INDEX idx_packages_name ON packages(name)
┌───────────────────────────┐
│         TABLE_SCAN        │
│      Table: packages      │
│      Type: Index Scan     │      <- descend the tree, fetch one row
│          Filters:         │
│      name='arrowkit'      │
│           1 row           │
└───────────────────────────┘
```

One word changed and the algorithm underneath it changed completely: from
$O(n)$ rows examined to $O(\log n)$ tree steps and one row fetched. Every
runnable block on this page is editable, so paste an `EXPLAIN ANALYZE` in front
of a query if you want to see the full tree — it is wide, and the result table
here will squash it onto one line.

## Sargability: the property that decides everything

A predicate is **sargable** — from *Search ARGument able*, an IBM term that
outlived the system it named — if it can be turned into a contiguous range of
the indexed value. That is the same property from lesson 5, now with a name: an
ordered index can seek to a bound and read forward, and it can do nothing else.

Here is the failure that shows up most often in real code.

```sql runnable id=sargable-year dataset=package-registry
-- Same three packages, two ways of asking.
SELECT
  count(*) FILTER (WHERE year(created_at) = 2021)                                            AS via_year,
  count(*) FILTER (WHERE created_at >= DATE '2021-01-01' AND created_at < DATE '2022-01-01') AS via_range,
  count(*)                                                                                   AS rows_in_table
FROM packages;
```

Three rows either way. The plans are not the same shape at all:

```text
-- WHERE year(created_at) = 2021
┌───────────────────────────┐
│           FILTER          │     <- a separate operator, run on every row
│("year"(created_at) = 2021)│
│          ~4 rows          │
└─────────────┬─────────────┘
┌─────────────┴─────────────┐
│         SEQ_SCAN          │
│      Table: packages      │
│          ~20 rows         │     <- all 20 rows leave the scan
└───────────────────────────┘

-- WHERE created_at >= DATE '2021-01-01' AND created_at < DATE '2022-01-01'
┌───────────────────────────┐
│         SEQ_SCAN          │
│      Table: packages      │
│          Filters:         │     <- the bounds are IN the scan
│ created_at>='2021-01-01': │
│ :DATE AND created_at<'2022│
│       -01-01'::DATE       │
│          ~4 rows          │     <- only matching rows leave the scan
└───────────────────────────┘
```

The range version becomes *bounds*, which a scan can use to skip data and an
index can seek to. The `year()` version becomes an expression the engine can
only evaluate one row at a time, so every row has to be produced first.

Three shapes cause almost all of these, and each has the same fix — **move the
work off the column**:

| Unsargable | Sargable rewrite |
| --- | --- |
| `WHERE year(created_at) = 2021` | `WHERE created_at >= DATE '2021-01-01' AND created_at < DATE '2022-01-01'` |
| `WHERE lower(name) = 'arrowkit'` | `WHERE name = lower('Arrowkit')` — the function moves to the constant |
| `WHERE size_kb * 2 > 400` | `WHERE size_kb > 200` |
| `WHERE name LIKE '%kit'` | no rewrite exists; see lesson 5 |

:::pitfall{title="The implicit function you did not write"}
A comparison between mismatched types inserts a cast, and a cast is a function.
`WHERE varchar_column = 12345` may become `CAST(varchar_column AS BIGINT) =
12345` and stop being sargable, with nothing in the query text to show for it.
When an index is mysteriously ignored, check the column types before anything
else.
:::

## When the function is the question: expression indexes

Sometimes you genuinely need `lower(name)` — case-insensitive lookup is a real
requirement, not a mistake. The answer is to index the expression itself, so the
tree stores the values you are actually searching for.

```sql runnable id=expression-index dataset=package-registry
DROP INDEX IF EXISTS idx_packages_lower_name;
CREATE INDEX idx_packages_lower_name ON packages(lower(name));

SELECT index_name, sql
FROM duckdb_indexes()
WHERE index_name = 'idx_packages_lower_name'
LIMIT 5;
```

With that index in place, `WHERE lower(name) = 'arrowkit'` becomes an index
scan — the exact predicate that could not use the plain index on `name`. The
rule underneath both facts is one rule: **an index can serve a predicate on the
expression it stores, and on nothing else.** `packages(name)` stores names;
`packages(lower(name))` stores lowercased names; neither can answer the other's
question.

The cost is that the expression is evaluated on every insert and update, and
must be deterministic — an index on `now() - created_at` would be wrong the
moment it was written.

:::checkpoint{id=cp-sargable rubric="the index stores the column's values not the function's,the engine cannot invert the function to find matching entries,move the function to the constant side or index the expression"}
Explain why an index on `created_at` cannot serve
`WHERE year(created_at) = 2021`, and give the two different fixes.
:::

## Composite indexes and the left-prefix rule

An index on `(language, created_at)` sorts by `language` first and breaks ties
with `created_at` — exactly like `ORDER BY language, created_at`. Picture the
entries and the rule follows:

```text
js,     2015-10-12
js,     2017-06-30
python, 2016-04-18
python, 2018-01-24
python, 2019-03-11     <- everything with language='python' is contiguous
rust,   2019-12-01
```

Rows for one language are contiguous, and *within* that block they are ordered
by date. So the index serves:

- `WHERE language = 'python'` — one contiguous block;
- `WHERE language = 'python' AND created_at >= DATE '2019-01-01'` — a range
  inside that block;
- `WHERE language = 'python' ORDER BY created_at` — the block is already in
  date order.

And it does **not** serve `WHERE created_at >= DATE '2019-01-01'` on its own.
Dates appear in every language block, scattered through the index; there is no
contiguous range to seek to. That is the **left-prefix rule**: a composite index
can be used for a query that constrains a leading prefix of its columns —
`(a)`, `(a, b)`, `(a, b, c)` — and not for one that starts in the middle.

```sql runnable id=left-prefix dataset=package-registry
-- The query the (language, created_at) index serves: equality on the leading
-- column, then a range on the second.
SELECT name, created_at
FROM packages
WHERE language = 'python'
  AND created_at >= DATE '2019-01-01'
ORDER BY created_at;
```

Two consequences worth remembering:

- **Put the equality columns first.** Once the index hits a range on a column,
  the columns after it are no longer contiguous, so the index cannot use them to
  narrow anything further. `(language, created_at)` serves an equality and then
  a range; `(created_at, language)` cannot use `language` at all when the date
  is a range.
- **You need fewer indexes than you think.** `(a, b, c)` also serves queries on
  `(a)` and `(a, b)`, so three separate indexes are usually one index and two
  mistakes.

DuckDB's radix-tree index will not demonstrate this — it only matches full
single-column equalities — so the query above runs as a sequential scan here.
The rule is a property of ordered B+ trees, and it is the single most useful
thing to know when someone hands you a slow query and a table with four indexes.

## Covering indexes and index-only scans

An index scan normally does two things: walk the tree to find the matching
entries, then follow each pointer back to the table to fetch the columns you
selected. That second step is one random read per matching row, and on a query
returning a few thousand rows it is most of the cost.

If every column the query needs is already *in* the index, the second step
disappears. That is a **covering index**, and the plan node has its own name —
`Index Only Scan` in Postgres, `Using index` in MySQL's `EXPLAIN`.

```sql
-- The index has to carry name as well, purely so the query never touches the table.
CREATE INDEX idx_pkg_lang_created_name ON packages(language, created_at, name);
```

`name` is not there to be searched on. It is there to be *returned*. That is the
trade: a wider index costs more space and more write time, and buys the removal
of a random I/O per row. It is worth it for a hot query on a large table and a
waste everywhere else.

The same reasoning explains why `SELECT *` is a performance decision and not
only a style one: it guarantees no index can ever cover the query.

## ORDER BY without a sort

An index is stored in order, so a query whose `ORDER BY` matches the index order
can read the index and skip sorting entirely. The evidence is a plan with **no
sort node in it** — the sort did not get faster, it stopped existing.

That matters most with `LIMIT`. `ORDER BY created_at LIMIT 10` served by an
index reads ten index entries and stops. The same query without a usable index
must produce every row and rank them, which is the `TOP_N` node from lesson 4 —
a bounded heap, better than a full sort, and still a pass over the whole table.

DuckDB does not do this: it always plans an `ORDER_BY` (or `TOP_N`) node,
because its indexes are not ordered scans. In Postgres or MySQL this is one of
the largest wins a well-chosen index offers, and it is worth checking for
explicitly — find the sort node in the plan and ask why it is still there.

::::track{depth=systems}
## Clustered and secondary indexes, and the extra lookup

Everything above assumed the index is a separate structure that points at rows
living somewhere else. That is a **secondary index**, and looking a row up
through it costs the tree descent *plus* a fetch of the row.

A **clustered index** removes the second step by making the index *be* the
table: the leaves of the B+ tree hold the full rows, in index order. There can
be only one, because the rows can only be laid out one way.

InnoDB — MySQL's storage engine — always clusters on the primary key, and this
has a consequence that surprises people the first time they meet it. A secondary
index in InnoDB does not store a pointer to a disk location. It stores the
**primary key value**, and looking a row up through a secondary index is
therefore *two* B+ tree descents:

```text
SELECT * FROM packages WHERE name = 'arrowkit';

  1. descend the secondary index on (name)   ->  yields the primary key, id = 1
  2. descend the clustered primary key index ->  yields the row
```

Three practical consequences follow directly:

- **A fat primary key is expensive twice.** Every secondary index stores a copy
  of it. A 36-byte UUID primary key with five secondary indexes stores that UUID
  six times per row.
- **Secondary indexes cover more than they look like they do.** They implicitly
  contain the primary key, so `SELECT id FROM packages WHERE name = ?` is
  index-only in InnoDB even though `id` is not named in the index.
- **Random primary keys hurt inserts.** Rows are physically ordered by the
  clustered key, so a random UUID inserts into the middle of the table and
  splits pages all over it. An ascending key always appends to the rightmost
  page. This is the entire argument behind ULIDs, UUIDv7, and Twitter-style
  snowflake ids — they are UUIDs with the timestamp moved to the front so that
  the values sort in insertion order.

Postgres makes the opposite choice: every index is secondary, and the table is a
heap with no order at all. It gets flexibility — no index is privileged — and
pays with a visibility check on index-only scans, and with `CLUSTER`, a one-shot
physical reordering that is not maintained afterwards.

Neither design is better. They are two answers to "how many random reads is one
row worth", and knowing which one you are on tells you what your primary key
choice is really costing.
::::

:::exercise{ref=sargable-year-filter}
:::

:::exercise{ref=composite-left-prefix}
:::

:::quiz{id=quiz-l07 passing=2}
- id: q1
  prompt: "Why can't an index on `created_at` serve `WHERE year(created_at) = 2021`?"
  options:
    - "Because year() is not a deterministic function."
    - "Because the index stores created_at values, and the engine cannot invert year() to work out which index entries could match."
    - "Because indexes only work on integer columns."
    - "Because the comparison is to a literal rather than to a parameter."
  answerIndex: 1
  explanation: >-
    The index is sorted by created_at, and knowing that year(x) = 2021 tells the
    engine nothing about where x sits in that ordering without evaluating the
    function on every value. Rewriting it as a range on created_at gives the
    index two bounds to seek to; indexing the expression year(created_at) also
    works, and stores exactly the values being compared.
- id: q2
  prompt: "You have an index on `(language, created_at)`. Which query can it help with?"
  options:
    - "WHERE created_at > DATE '2020-01-01'"
    - "WHERE language = 'python' AND created_at > DATE '2020-01-01'"
    - "WHERE lower(language) = 'python'"
    - "WHERE created_at > DATE '2020-01-01' ORDER BY language"
  answerIndex: 1
  explanation: >-
    The index sorts by language first, so entries for one language are
    contiguous and are ordered by date within that block — an equality on the
    leading column followed by a range on the second is exactly the shape it
    serves. A predicate on created_at alone starts in the middle of the key and
    matches no contiguous range, and wrapping language in lower() searches for a
    value the index does not store.
- id: q3
  prompt: "What is a covering index?"
  options:
    - "An index that covers every column of the table."
    - "An index that contains every column the query needs, so the engine never has to fetch the row itself."
    - "An index that is automatically created to cover a foreign key."
    - "A backup index used when the primary index is being rebuilt."
  answerIndex: 1
  explanation: >-
    Adding the selected columns to the index removes the per-row trip back to
    the table — one random read per matching row — and the plan reports an
    index-only scan. The extra columns are stored to be returned, not to be
    searched. The cost is a wider index, so it pays off on a hot query and
    nowhere else. It is also why SELECT * guarantees no index can cover.
:::
