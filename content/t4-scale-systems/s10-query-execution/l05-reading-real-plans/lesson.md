---
id: t4/s10/l05
title: Reading real plans, and finding the estimate that lied
tier: t4-scale-systems
stage: s10-query-execution
status: published
estimatedMinutes: 55
objectives:
  - Read a DuckDB EXPLAIN plan as an operator tree and name each node's toy-engine counterpart.
  - Compare estimated rows to actual rows with EXPLAIN ANALYZE, and locate the first estimate that went wrong.
  - Explain where an equality estimate and a range estimate come from, and why both are wrong on this dataset.
  - Show that a cardinality error compounds multiplicatively up a join tree, and say why the deepest estimate matters most.
  - Recognise a materialized CTE and a correlated subquery in a plan, and rewrite around them deliberately.
prerequisites:
  - t1/s01/l05
  - t1/s01/l06
misconceptions:
  - "**\"The row numbers in EXPLAIN are what the query will actually do.\"** They are estimates, produced before a single row is read. `EXPLAIN` shows guesses; only `EXPLAIN ANALYZE` shows facts. Reading the first as the second is the most common way people misdiagnose a slow query."
  - "**\"A wrong estimate makes the plan a bit worse.\"** Estimates multiply up a join tree. Two children each estimated 2× low make their join 4× low, and the error keeps compounding — Leis et al. measured errors growing by orders of magnitude across three joins on real data. The plan chosen from a 1,000× underestimate is not slightly wrong; it is a different algorithm."
  - "**\"A CTE is just a named subquery, so it never affects the plan.\"** In DuckDB an ordinary CTE is inlined and optimised as if you had written it out. `AS MATERIALIZED` deliberately is not: it forces a materialization boundary that predicates cannot cross freely. PostgreSQL had the opposite default until version 12, which is where the folklore comes from."
  - "**\"Correlated subqueries execute once per outer row.\"** They did, in engines from the 1990s. A modern optimizer *decorrelates* them into joins before execution. What survives is a scaffold — DuckDB shows it as `DELIM_JOIN` — and rewriting the query as an explicit join gives a plan without it, which is usually but not always faster."
masteryChecklist:
  - Given an EXPLAIN plan, I can name every operator and say which side of a join is likely the build side.
  - I can run EXPLAIN ANALYZE, compare estimated to actual, and name the operator whose estimate failed first.
  - I can state the equality and range selectivity defaults an engine falls back on, and show a case where each is wrong.
  - I can explain why an error at a leaf is worse than the same error at the root.
  - I can spot a materialized CTE or a DELIM_JOIN in a plan and say what rewrite removes it.
runtimes:
  - engine: duckdb
    datasetId: package-registry
---

Your optimizer in lesson 4 used numbers you typed in. A real one derives them
from statistics about the data, and the difference between a fast plan and a
catastrophic one is almost always a number in that derivation being wrong.

This lesson is about reading the numbers. Everything below has been run against
the DuckDB build that runs in this page, and every plan fragment is real output.

:::dataset{id=package-registry tables="packages,versions,downloads"}
:::

:::note{title="How to run a plan on this site"}
The result grid cannot render DuckDB's box-drawing plan output legibly, so plan
text appears here as quoted output rather than in a runnable cell. To produce it
yourself, use the **Explain** button underneath the editor of any SQL exercise
on this page — it runs `EXPLAIN` on whatever is in the editor. Paste any query
from this lesson in and press it.
:::

## A plan is your toy engine, printed upside down

```sql
SELECT p.name, v.version
FROM packages p
JOIN versions v ON v.package_id = p.id
WHERE p.language = 'python';
```

```text
┌───────────────────────────┐
│         PROJECTION        │
│            name           │
│          version          │
│          ~6 rows          │
└─────────────┬─────────────┘
┌─────────────┴─────────────┐
│         HASH_JOIN         │
│      Join Type: INNER     │
│        Conditions:        ├──────────────┐
│      package_id = id      │              │
│          ~6 rows          │              │
└─────────────┬─────────────┘              │
┌─────────────┴─────────────┐┌─────────────┴─────────────┐
│         SEQ_SCAN          ││         SEQ_SCAN          │
│      Table: versions      ││      Table: packages      │
│        Projections:       ││        Projections:       │
│         package_id        ││             id            │
│          version          ││            name           │
│                           ││          Filters:         │
│                           ││     language='python'     │
│          ~26 rows         ││          ~5 rows          │
└───────────────────────────┘└───────────────────────────┘
```

Four things to read off it, in the order they matter.

**The operators are the ones you wrote.** `SEQ_SCAN` is `scan`, `HASH_JOIN` is
`hash_join`, `PROJECTION` is `project`. There is no fifth thing.

**Both rules from lesson 4 already fired.** `Filters: language='python'` is
inside the scan, not above it — predicate pushdown. `Projections: id, name`
means the scan reads two of the six columns — projection pushdown. Neither
appears as its own operator, because both were folded into the leaf.

**`~N rows` is an estimate.** The tilde is doing a lot of work. Those numbers
were produced before any data was read, and the rest of this lesson is about
how wrong they are.

**Which side is the build side is not printed.** DuckDB does not label it. The
row estimates under each child are what the decision was made from, so the side
with the smaller estimate is the one it intends to build on — which is another
reason a wrong estimate here is expensive.

## EXPLAIN ANALYZE turns guesses into facts

Same query, run for real:

```text
┌───────────────────────────┐
│         HASH_JOIN         │
│      Join Type: INNER     │
│      id = package_id      │
│           9 rows          │
│          (0.00s)          │
└─────────────┬─────────────┘
┌─────────────┴─────────────┐┌─────────────┴─────────────┐
│         TABLE_SCAN        ││         TABLE_SCAN        │
│      Table: packages      ││      Table: versions      │
│          Filters:         ││    Filters: size_kb>100   │
│     language='python'     ││                           │
│           8 rows          ││          13 rows          │
│          (0.00s)          ││          (0.00s)          │
└───────────────────────────┘└───────────────────────────┘
```

(This is the plan for `SELECT count(*) FROM packages p JOIN versions v ON
v.package_id = p.id WHERE p.language = 'python' AND v.size_kb > 100`.)

Two differences from `EXPLAIN` are worth naming, because they trip people up.

The counts have no tilde: `8 rows`, not `~5 rows`. These are measured. And the
scan operator is called `TABLE_SCAN` here where `EXPLAIN` called it `SEQ_SCAN` —
the same operator, printed by a different code path. If you are grepping plan
text for operator names, that inconsistency will bite you.

Now put the two side by side:

| Operator | Estimated | Actual | Error |
| --- | --- | --- | --- |
| scan `packages` where `language = 'python'` | 5 | 8 | 1.6× low |
| scan `versions` where `size_kb > 100` | 5 | 13 | 2.6× low |
| the join | 1 | 9 | 9× low |

Three estimates, all low, and the one at the top is the worst by a wide margin.
That is not a coincidence.

## Where the numbers come from

DuckDB will tell you what it knows about a table.

```sql runnable id=summarize dataset=package-registry
SELECT column_name, count, approx_unique, null_percentage
FROM (SUMMARIZE packages);
```

`approx_unique` is the number of distinct values, estimated with a
HyperLogLog sketch rather than counted. Two of those rows are worth staring at:

- `id` reports **21** distinct values in a 20-row table. A count of distinct
  values cannot exceed the row count, so this one is provably wrong — that is
  what "approximate" means, and the sketch has no idea it has overshot.
- `license` reports **2**. Run `SELECT count(DISTINCT license) FROM packages`
  and you get 3.

Now watch those numbers become plan estimates.

**Equality predicates use $\text{rows} / \text{ndv}$.** `language` has 4
distinct values in 20 rows, so any `language = ?` is estimated at
$20/4 = 5$ rows. Both of these are estimated at 5:

```sql runnable id=uniformity dataset=package-registry
SELECT
  (SELECT count(*) FROM packages WHERE language = 'python') AS actually_python,
  (SELECT count(*) FROM packages WHERE language = 'js')     AS actually_js;
```

8 and 3. The estimate is the same for both because the model assumes values are
distributed uniformly across the distinct values, and languages are not. This
is the **uniformity assumption**, and it is wrong in exactly the way real data
is always wrong.

The same mechanism, one step worse, for `license = 'MIT'`: the sketch said 2
distinct licenses, so the estimate is $20/2 = 10$. The true answer is 9 —
close, but arrived at from a wrong distinct count and a wrong distribution, two
errors that happened to nearly cancel.

**Range predicates fall back to a fixed guess.** With no histogram to consult,
`>` and `<` get a default selectivity of 20%:

```sql runnable id=range-default dataset=package-registry
SELECT
  count(*)                                   AS all_rows,
  count(*) FILTER (WHERE count > 500)        AS actually_over_500,
  CAST(count(*) * 0.2 AS INTEGER)            AS what_the_optimizer_guesses
FROM downloads;
```

200 rows, 40 guessed, **196 actual**. The optimizer believes this filter
removes 80% of the table; it removes 2%. A plan built on that belief will put
this scan on the build side of a join and discover, at runtime, that it is
holding five times more rows than it planned for.

:::insight{title="Statistics are a cache, and caches go stale"}
Every number above was derived at the moment the table was created. On a real
warehouse, statistics are gathered by an explicit job — `ANALYZE`, a nightly
maintenance window, an autovacuum daemon — over a *sample* of the table.

So the estimates are approximate twice over: an approximation of a sample of a
snapshot. When a table doubles overnight and the statistics job has not run, the
optimizer plans as if it were yesterday's table. "Did the stats get refreshed?"
is a diagnostic question, not a formality.
:::

:::checkpoint{id=cp-estimates rubric="equality uses rows divided by distinct count,ranges fall back to a fixed default selectivity,both assume uniformity which real data violates"}
Say where the estimate of 5 rows for `language = 'python'` came from, and name
the assumption that made it wrong.
:::

## Why the error at the bottom is the dangerous one

An engine estimates a join's output from its children's:

$$\widehat{|A \bowtie B|} \;=\; \widehat{|A|} \cdot \widehat{|B|} \cdot s$$

where $s$ is a selectivity derived from the join key's distinct count. It is a
*product*, so the relative errors of the inputs multiply. Write $e_A$ for the
factor by which $A$'s estimate is wrong. Then

$$\frac{\widehat{|A \bowtie B|}}{|A \bowtie B|} = e_A \cdot e_B \cdot e_s.$$

In the table above, $e_A = 1/1.6$ and $e_B = 1/2.6$; their product is about
$1/4.2$, and the observed join error was $1/9$ — the rest coming from the join
selectivity term being wrong too.

Now stack joins. A left-deep tree of $k$ joins feeds each join's output into the
next, so an error introduced at the bottom is multiplied by every selectivity
above it:

$$\frac{\widehat{|R_1 \bowtie \cdots \bowtie R_k|}}{|R_1 \bowtie \cdots \bowtie R_k|} \;=\; \prod_{i} e_i.$$

Errors do not average out. They compound, and they compound in the same
direction, because the errors all come from the same two assumptions —
uniformity and independence — and both fail in the same direction on correlated
data. Leis et al.'s 2015 study *How Good Are Query Optimizers, Really?* measured
this on real data across major engines and found estimation errors growing by
orders of magnitude with each additional join.

:::pitfall{title="Which is why you read a plan bottom-up"}
When a plan is bad, the interesting operator is almost never the expensive one
at the top. It is the deepest node where estimated and actual first diverge —
everything above it inherited that error and made its decisions from it.

`EXPLAIN ANALYZE`, find the lowest node where estimate and actual disagree
badly, and fix *that*. Fixing a node above it is treating a symptom.
:::

## Fences: two rewrites that change the plan

Most SQL rewrites are cosmetic — the optimizer normalises them away. Two are
not, because they change what the optimizer is permitted to do.

### The materialized CTE

An ordinary CTE in DuckDB is inlined and optimised as if you had written the
subquery inline. Adding `MATERIALIZED` asks for it to be computed once into a
temporary result:

```sql
WITH release_sizes AS MATERIALIZED (
  SELECT p.name AS package, v.version, v.size_kb
  FROM packages p JOIN versions v ON v.package_id = p.id
)
SELECT package, version, size_kb FROM release_sizes WHERE size_kb > 200;
```

The plan grows a `CTE` node, a `CTE_SCAN`, and a `FILTER` sitting above that
scan:

```text
│           FILTER          │
│      (size_kb > 200)      │
│          ~4 rows          │
└─────────────┬─────────────┘
┌─────────────┴─────────────┐
│          CTE_SCAN         │
│        CTE Index: 0       │
│          ~4 rows          │
└───────────────────────────┘
```

Drop the word `MATERIALIZED` and both disappear: the plan is a single
`HASH_JOIN` over two `SEQ_SCAN`s, with `Filters: size_kb>200` inside the
`versions` scan.

:::warning{title="What is actually true here, as opposed to the folklore"}
The folklore is "a CTE is an optimization fence". Measured on this build, that
is only partly right, and the details matter.

DuckDB still pushes `size_kb>200` into the base scan *inside* the materialized
CTE, because this CTE is referenced once — so the fence is not absolute. What
you actually pay is the materialization itself plus a redundant `FILTER` above
`CTE_SCAN`.

The fence becomes real when a materialized CTE is referenced **more than once
with different predicates**. Then no single predicate can be pushed into the
shared result; DuckDB pushes down the disjunction of them as an "optional"
filter and keeps a real `FILTER` above every reference.

And the well-known version of this folklore is about a different engine:
PostgreSQL materialized every CTE unconditionally until version 12, which is
where "CTEs are fences" comes from. It is now `MATERIALIZED`-by-request there
too.
:::

### The correlated subquery

```sql
SELECT p.name FROM packages p
WHERE EXISTS (SELECT 1 FROM versions v
              WHERE v.package_id = p.id AND v.size_kb > 300);
```

The textbook fear is that this runs the subquery once per outer row. It does
not — modern optimizers decorrelate it into a join. But the general
decorrelation algorithm leaves scaffolding, and DuckDB prints it:

```text
│      LEFT_DELIM_JOIN      │
│      Join Type: SEMI      │
        ...
│         DELIM_SCAN        │
│       Delim Index: 1      │
```

`DELIM_JOIN` is a *duplicate-eliminating* join: the machinery that lets an
arbitrary correlated subquery be turned into a join by collecting the distinct
correlated values, evaluating the subquery once per distinct value, and joining
the results back. It is correct for any subquery, which is why it is the
fallback.

Say the same thing as a set membership instead:

```sql
SELECT p.name FROM packages p
WHERE p.id IN (SELECT v.package_id FROM versions v WHERE v.size_kb > 300);
```

and the plan collapses to a `HASH_JOIN` with `Join Type: SEMI` over two plain
scans. No delim, no scaffold. Same two rows out.

:::pitfall{title="IN and EXISTS are not interchangeable when NULLs are involved"}
That rewrite is safe here because `versions.package_id` is never NULL. It is not
safe in general: `x IN (SELECT nullable_col ...)` inherits the three-valued
logic problem, and its negation `NOT IN` collapses to zero rows the moment the
subquery yields a single NULL.

`EXISTS` asks a two-valued question and cannot collapse that way. So the honest
rule is: rewrite `EXISTS` to `IN` when you know the column is non-nullable, and
never rewrite `NOT EXISTS` to `NOT IN` at all.
:::

## Linear and bushy

Every join in the plans above has a base table on at least one side. A plan
shaped that way is **linear** — a chain. A **bushy** plan has a join whose two
children are both joins, which lets two independent subtrees be built in
parallel, and which is why the search space in lesson 4 was $\frac{(2n-2)!}{(n-1)!}$
rather than $n!$.

On this schema everything joins through `packages`, so there are no independent
subtrees to build and every good plan is linear. You see bushy plans where a
query has two genuinely separate join clusters that meet at the top — a fact
worth knowing mostly so that you recognise a plan that suddenly is not linear
and ask why.

:::exercise{ref=inline-the-cte}
:::

:::exercise{ref=decorrelate-the-subquery}
:::

::::track{depth=interview}
## "This query is slow. What do you do?"

The question is asked to find out whether you have a procedure or a pile of
tricks. Say the procedure, in order, and say why each step comes where it does.

**1. Get the plan and the actuals, not the SQL.** "First thing I want is
`EXPLAIN ANALYZE`, or the equivalent profile. Reading the SQL tells me what was
asked for; the plan tells me what the engine decided, and those are different
questions."

**2. Read it bottom-up for the first estimate that is wrong.** "I compare
estimated against actual rows at every node and find the *lowest* node where
they diverge by more than about an order of magnitude. Everything above that
node made its decisions from a wrong number, so nothing above it is worth
looking at yet."

**3. Ask why that estimate is wrong.** There are only a few answers, and naming
them is the part that shows you have done this:

- *Stale statistics.* The table grew and nothing re-analysed it.
- *Correlated columns.* The optimizer multiplies selectivities as if predicates
  were independent. `WHERE country = 'FI' AND language = 'finnish'` is estimated
  as the product of two selectivities and is really almost one of them.
- *An opaque predicate.* A function call, a `LIKE '%x%'`, a parameter the
  planner cannot see — the engine falls back to a default constant.
- *An estimate through several joins.* The error compounded; the fix is
  upstream.

**4. Name the consequence, not just the number.** "A 1,000× underestimate on a
build side means the engine planned a hash join for 10,000 rows and got 10
million, so it spilled to disk — that is where the time went, and the fix is to
make the estimate right, not to add an index."

**5. Only then, act.** Refresh statistics. Add the multi-column statistics
object if the engine supports one. Materialize an intermediate result so the
next stage plans from a real row count instead of an estimate. Rewrite the
predicate into a form the planner can see through. Add an index if the profile
says the scan is genuinely the cost.

:::insight{title="What separates the two answers"}
The weak answer starts with "I'd add an index." It might even work. But it names
a fix before naming a cause, and the interviewer is listening for whether you
would have known *which* index — which you only know from the plan.

The strongest single sentence you can say is: **"I look for the deepest node
where estimated and actual diverge, because the error at that node has been
multiplied by everything above it."** It shows you know the cost model is
multiplicative, which is the whole reason plans fail the way they do.
:::

One more thing worth saying out loud: some queries are slow because they are
big. If the join genuinely emits two hundred million rows, no plan makes that
cheap — the lower bound from lesson 2 says so. Recognising that a query is slow
because it was asked for too much, and saying so, is a better answer than a
tuning attempt that cannot work.
::::

:::quiz{id=quiz-l05 passing=2}
- id: q1
  prompt: "An EXPLAIN plan shows `~5 rows` under a scan and EXPLAIN ANALYZE shows 8. Three joins above it, the estimate is off by 1,000×. Why?"
  options:
    - "The upper operators have their own independent estimation bugs."
    - "Join cardinality is estimated as a product of its inputs, so each child's relative error multiplies into the parent's — and the same error keeps compounding up the tree."
    - "EXPLAIN ANALYZE counts rows differently from EXPLAIN."
    - "The optimizer re-estimates from scratch at each level, so errors should not accumulate."
  answerIndex: 1
  explanation: >-
    A join's estimate is the product of its children's estimates and a
    selectivity, so relative errors multiply rather than average. Because the
    underlying mistakes come from the same two assumptions — uniformity and
    independence — they usually err in the same direction, and the product grows
    fast. This is why you diagnose a plan from the bottom up.
- id: q2
  prompt: "`SUMMARIZE packages` reports `approx_unique = 21` for a 20-row table's primary key. What does that tell you?"
  options:
    - "The table has a duplicate row that SUMMARIZE is counting twice."
    - "The distinct count is a sketch, not a count — it can and does exceed the row count, and equality estimates are derived from it."
    - "The statistics are stale and need refreshing."
    - "SUMMARIZE counts NULLs as a distinct value."
    - "The id column has a gap in its numbering."
  answerIndex: 1
  explanation: >-
    Distinct counts come from a HyperLogLog sketch with a relative error of a
    few percent, and nothing constrains the result to be at most the row count.
    It matters because an equality predicate's estimate is rows divided by this
    number — so an error here propagates straight into every plan that filters
    on the column.
- id: q3
  prompt: "You rewrite `WHERE EXISTS (SELECT 1 FROM v WHERE v.package_id = p.id ...)` as `WHERE p.id IN (SELECT package_id FROM v WHERE ...)` and the DELIM_JOIN disappears. When is that rewrite unsafe?"
  options:
    - "Never — IN and EXISTS are defined to be equivalent."
    - "When the subquery's column can be NULL, because IN inherits three-valued logic and its negation collapses to zero rows."
    - "When the outer table is larger than the inner one."
    - "When the subquery has a GROUP BY."
  answerIndex: 1
  explanation: >-
    For a positive EXISTS on a non-nullable column the two are equivalent, which
    is what makes the rewrite useful. Once the subquery can produce NULL they
    diverge, and `NOT IN` is the dangerous case: a single NULL makes every
    comparison UNKNOWN and the whole result empty. `NOT EXISTS` asks a
    two-valued question and never does that.
:::
