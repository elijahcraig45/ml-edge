---
id: t2/s04/l06
title: The same algorithm, written twice
tier: t2-core-structures
stage: s04-sorting-and-windows
status: published
estimatedMinutes: 50
objectives:
  - Write ROW_NUMBER, RANK, DENSE_RANK, NTILE, LAG and LEAD, and say which one a question actually needs.
  - State exactly which rows a ROWS, RANGE or GROUPS frame contains, and predict where they disagree.
  - Implement a sliding-window maximum with a monotonic deque and produce the identical result with a SQL window frame.
prerequisites:
  - t1/s01/l02
  - t2/s04/l05
misconceptions:
  - "**\"A window function is a GROUP BY that keeps the other columns.\"** It is a sort followed by a linear scan carrying a running aggregate. That is why it can look backwards a fixed number of rows, or forwards, or at a moving range — none of which a GROUP BY can express."
  - "**\"If I write ORDER BY inside OVER, I get a running total.\"** You get whatever the *default frame* is, and the default is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` — which includes every row tied with the current one on the sort key. With duplicate sort keys that is not a running total, it is a per-group total repeated on every tied row."
  - "**\"ROWS and RANGE are two spellings of the same thing.\"** ROWS counts physical rows. RANGE counts *values* of the sort key, so it pulls in every peer that ties with the current row and, with a numeric or date offset, every row within that distance. They agree only when the sort key is unique, which is exactly when nobody checks."
  - "**\"RANK and ROW_NUMBER differ only on ties, so it rarely matters.\"** Ties are the only interesting case. `ROW_NUMBER() <= 3` on a tied leaderboard silently picks a winner at random and drops an equally-qualified row; `RANK() <= 3` keeps every tied row, so a three-way tie for third returns five rows rather than three. Choosing between them *is* the business decision."
masteryChecklist:
  - Given a window specification, I can name the exact set of rows in the frame for a given row.
  - I can explain why the default frame produces a per-day total rather than a per-row running total when the sort key repeats.
  - I can write a trailing-window aggregate in SQL and the equivalent monotonic-deque scan in Python, and get the same numbers.
runtimes:
  - engine: duckdb
    datasetId: package-registry
  - engine: python
---

Here are two pieces of code.

```sql
MAX(count) OVER (PARTITION BY package_id ORDER BY day
                 ROWS BETWEEN 4 PRECEDING AND CURRENT ROW)
```

```python
while dq and nums[dq[-1]] <= x:
    dq.pop()
dq.append(i)
```

They are the same algorithm. One is declarative and runs inside a database
engine; the other is the monotonic deque from lesson 5. A window function *is* a
sort followed by a linear scan with a sliding aggregate — which is the sentence
this entire lesson exists to make concrete.

:::dataset{id=package-registry tables="packages,downloads"}
:::

## A window function does not collapse rows

`GROUP BY` replaces many rows with one. A window function computes over many
rows and attaches the answer to **every** row, leaving the row count alone.

```sql runnable id=window-vs-group dataset=package-registry
SELECT day, count,
       sum(count) OVER (PARTITION BY package_id) AS package_total,
       round(100.0 * count / sum(count) OVER (PARTITION BY package_id), 2) AS pct_of_total
FROM downloads
WHERE package_id = 20
ORDER BY day;
```

Ten rows in, ten rows out, each carrying a total computed across all ten. Doing
this with `GROUP BY` needs a subquery and a join; the window form needs neither,
and — this is the part that matters for cost — the engine computes it in **one**
pass over the partition rather than reading the table twice.

The `OVER (...)` clause has three optional parts, and every window function is
built from them:

| Part | What it does |
| --- | --- |
| `PARTITION BY` | splits the rows into independent groups; the window never crosses a partition |
| `ORDER BY` | sorts within the partition, which is what makes "previous" and "trailing" meaningful |
| frame (`ROWS` / `RANGE` / `GROUPS`) | picks which rows *around the current row* the aggregate sees |

Leave out `PARTITION BY` and the whole result set is one partition. Leave out
`ORDER BY` and the frame is the entire partition, which is what produced
`package_total` above. Leave out the frame but keep `ORDER BY` and you get a
default frame that is not the one you expect — that is the second half of this
lesson.

## The ranking family, and why the choice is a decision

```sql runnable id=ranking-family dataset=package-registry
SELECT name, language,
       row_number() OVER (ORDER BY language, name) AS rn,
       rank()       OVER (ORDER BY language)       AS rnk,
       dense_rank() OVER (ORDER BY language)       AS drnk,
       ntile(4)     OVER (ORDER BY language, name) AS quartile
FROM packages
ORDER BY language, name;
```

Twenty packages across four languages, so `language` has heavy ties. Read the
columns against each other:

- `row_number()` — 1 to 20, no ties. Every row gets a distinct number.
- `rank()` — 1, 1, 1, 4, 4, … Ties share a number and the next value **skips**.
  Three packages tied at 1 means the next rank is 4.
- `dense_rank()` — 1, 1, 1, 2, 2, … Ties share a number and nothing is skipped.
- `ntile(4)` — four buckets of five, assigned by position after the sort.

:::warning{title="ROW_NUMBER over a tied key is arbitrary"}
`rn` uses `ORDER BY language, name`, and that second column is doing real work.
With `ORDER BY language` alone, `row_number()` still returns 1 to 20 — but
*which* Python package gets 4 and which gets 5 is unspecified. Lesson 1 said SQL
sorts are not required to be stable; this is where that bites.

A `ROW_NUMBER` over a non-unique ordering is a coin flip the engine is free to
re-flip after a data change or a version upgrade. If you are going to filter on
it, the sort key must be unique. Add the tiebreaker.
:::

Choosing between the three is a product question wearing an implementation
costume. "Top 3 packages by downloads" with a three-way tie for third:
`row_number() <= 3` returns three rows and drops a package that did exactly as
well as one you kept; `rank() <= 3` returns five rows; `dense_rank() <= 3` also
returns five here but would differ if the tie were higher up. Someone has to
decide which is right, and it is not the person writing the SQL.

## LAG and LEAD: reach across rows

```sql runnable id=lag-lead dataset=package-registry
SELECT day, count,
       lag(count)  OVER (PARTITION BY package_id ORDER BY day) AS prev_day,
       count - lag(count) OVER (PARTITION BY package_id ORDER BY day) AS change,
       lead(count) OVER (PARTITION BY package_id ORDER BY day) AS next_day
FROM downloads
WHERE package_id = 3
ORDER BY day;
```

`lag(x)` is the previous row's `x` within the partition; `lead(x)` is the next
one's. The first row's `lag` is NULL and the last row's `lead` is NULL, because
there is no such row — and everything you know about NULL propagation applies to
the `change` column, which is NULL on the first day rather than equal to
`count`. Use `lag(count, 1, 0)` if you want a default instead.

Before window functions existed, "compare each day to the day before" was a
self-join on `d1.day = d2.day + 1`, which reads the table twice and quietly
loses rows where a day is missing. `lag` reads it once and takes the previous
row *that exists*, which is a different — usually better — definition.

:::checkpoint{id=cp-window-shape rubric="partition by splits into independent groups,order by sorts within the partition,the frame chooses which rows around the current row the aggregate sees"}
Name the three parts of an `OVER (...)` clause and say what each one controls.
Then say what you get if you supply none of them.
:::

## Frames: ROWS, RANGE, and the default that is not what you meant

The frame answers one question: **for this row, which rows does the aggregate
see?** There are three ways to say it.

- `ROWS BETWEEN a PRECEDING AND b FOLLOWING` — counts **physical rows**.
- `RANGE BETWEEN a PRECEDING AND b FOLLOWING` — counts **values of the sort
  key**. Every row whose key is within `a` of the current key is in.
- `GROUPS BETWEEN a PRECEDING AND b FOLLOWING` — counts **distinct key groups**,
  taking whole groups of tied rows at a time.

They coincide when the sort key is unique and has no gaps. Real data satisfies
neither condition.

Here is the difference, on one package's busy days — which have a gap, because
2024-03-05 fell below the threshold:

```sql runnable id=frame-kinds dataset=package-registry
WITH busy AS (
  SELECT day, count FROM downloads WHERE package_id = 10 AND count >= 1000
)
SELECT day, count,
  sum(count) OVER (ORDER BY day ROWS   BETWEEN 1 PRECEDING AND CURRENT ROW) AS rows_1,
  sum(count) OVER (ORDER BY day RANGE  BETWEEN 1 PRECEDING AND CURRENT ROW) AS range_1,
  sum(count) OVER (ORDER BY day GROUPS BETWEEN 1 PRECEDING AND CURRENT ROW) AS groups_1
FROM busy
ORDER BY day;
```

Seven of the eight rows agree. The row for **2024-03-06** does not: `rows_1` and
`groups_1` are 2320, `range_1` is 1020. `RANGE 1 PRECEDING` means "keys within
one day", the previous busy day is 2024-03-04 — three days earlier — so the
frame contains only the current row. `ROWS` and `GROUPS` both mean "one step
back in the sequence", and there is one.

Neither answer is wrong. They answer different questions: "the last two
readings" versus "everything from the last 48 hours". Which one your report
needs is a question you have to ask.

:::pitfall{title="The silent bug: the default frame pulls in peers"}
When you write `ORDER BY` inside `OVER` and no frame, the SQL standard supplies
one: `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. Read that carefully.
It is a **RANGE** frame, so "current row" means *every row tied with the current
row on the sort key*.

If the sort key is unique, that is a running total and everything is fine. If it
is not:

```sql runnable id=default-frame-trap dataset=package-registry
SELECT day, package_id, count,
       sum(count) OVER (ORDER BY day) AS looks_like_a_running_total,
       sum(count) OVER (ORDER BY day ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS actual_running_total
FROM downloads
WHERE package_id IN (1, 2, 3)
ORDER BY day, package_id
LIMIT 7;
```

Three packages share each day, so every row on 2024-03-01 reports 17300 — that
day's closing total for the three — while the true per-row running total climbs
9280, 13900, 17300. Over the full `downloads` table, 190 of the 200 rows differ between
the two. The only rows that agree are the last row of each day, which is why
this bug survives a spot check: the last row of the first page usually looks
right.

**The habit:** if you write `ORDER BY` inside `OVER`, write the frame too. If you
mean physical rows, say `ROWS`.
:::

## QUALIFY, and top-N-per-group

A window function cannot appear in `WHERE`, because `WHERE` runs before windows
are computed. The classic workaround is a subquery. `QUALIFY` — DuckDB,
Snowflake, BigQuery, Teradata — is a `WHERE` that runs *after* the window
functions, and it turns the most common report in analytics into four lines.

```sql runnable id=qualify-top-n dataset=package-registry
WITH totals AS (
  SELECT p.language, p.name, sum(d.count) AS total
  FROM packages p
  JOIN downloads d ON d.package_id = p.id
  GROUP BY p.language, p.name
)
SELECT language, name, total
FROM totals
QUALIFY row_number() OVER (PARTITION BY language ORDER BY total DESC, name) <= 2
ORDER BY language, total DESC;
```

Eight rows: the top two packages in each of the four languages. Note the
tiebreaker `, name` inside the window's `ORDER BY` — without it, two packages
with identical totals would be separated by an unspecified coin flip, and the
query would be non-deterministic in exactly the way the warning above described.

Without `QUALIFY` the same query is:

```sql
SELECT language, name, total FROM (
  SELECT language, name, total,
         row_number() OVER (PARTITION BY language ORDER BY total DESC, name) AS rn
  FROM totals
) WHERE rn <= 2;
```

Same plan, more nesting. Postgres has no `QUALIFY`, so the subquery form is the
one to keep in your fingers.

## The tie: one algorithm, two languages

Now the point of the lesson. Take package 20's ten days and compute, for each
day, the **maximum over that day and the four before it**.

In SQL that is a frame:

```sql runnable id=trailing-max-sql dataset=package-registry
SELECT day, count,
       max(count) OVER (PARTITION BY package_id ORDER BY day
                        ROWS BETWEEN 4 PRECEDING AND CURRENT ROW) AS max_5d
FROM downloads
WHERE package_id = 20
ORDER BY day;
```

In Python it is the monotonic deque:

```python runnable id=trailing-max-python
from collections import deque

counts = [770, 850, 490, 570, 650, 730, 810, 450, 530, 610]   # package 20, in day order
k = 5

out = []
dq = deque()                       # indices, values strictly decreasing
for i, x in enumerate(counts):
    while dq and counts[dq[-1]] <= x:
        dq.pop()                   # x is newer and at least as large: those are dead
    dq.append(i)
    if dq[0] <= i - k:
        dq.popleft()               # the front has fallen out of the window
    out.append(counts[dq[0]])

print("day :", list(range(1, 11)))
print("max :", out)
```

Both produce `770, 850, 850, 850, 850, 850, 810, 810, 810, 810`. Run them and
compare.

The correspondence is exact, term by term:

| SQL | Python |
| --- | --- |
| `PARTITION BY package_id` | choosing which list you scan |
| `ORDER BY day` | the list already being in day order |
| `ROWS BETWEEN 4 PRECEDING AND CURRENT ROW` | `if dq[0] <= i - k: dq.popleft()` |
| `MAX(...)` | `counts[dq[0]]` |
| the engine's single pass over the sorted partition | the `for` loop |

One difference is worth naming. The SQL frame is *clipped* at the start of the
partition: day 1 has no four preceding rows, so its frame holds one row, and the
answer is that row. The Python loop reproduces that by emitting a value for every
index, including the first four where the window is not yet full. The classic
interview phrasing of "sliding window maximum" instead returns only the
$n - k + 1$ full windows — the same algorithm with the first $k-1$ outputs
dropped.

:::insight{title="What you now know about the engine"}
A window function is not magic and it is not free. When you write
`OVER (PARTITION BY a ORDER BY b ...)` the engine must **sort** by `(a, b)` —
that is the $n\log n$ from lesson 1 — and then make **one linear pass** carrying
whatever state the frame requires. A trailing `MAX` needs a monotonic deque; a
trailing `SUM` needs one running total and a subtraction; `UNBOUNDED PRECEDING`
needs a single accumulator.

Which means: several window functions sharing one `OVER` clause cost one sort
between them, and window functions with *different* `PARTITION BY` or `ORDER BY`
each cost their own. That is a real, checkable optimisation — reuse the window
specification where you can, and name it with a `WINDOW w AS (...)` clause when
the query repeats it.
:::

::::track{depth=systems}
## What the plan actually shows

DuckDB will tell you what it is doing. `EXPLAIN` prints the physical plan, and
the operator names map straight onto this lesson.

```sql runnable id=explain-window dataset=package-registry
EXPLAIN
SELECT package_id, day,
       max(count) OVER (PARTITION BY package_id ORDER BY day
                        ROWS BETWEEN 4 PRECEDING AND CURRENT ROW) AS max_5d
FROM downloads;
```

There is a `WINDOW` operator over a `SEQ_SCAN`, and — worth noticing — **no
separate `ORDER_BY` operator**. The window operator does its own sorting
internally, partition by partition, because it needs the data sorted anyway and
can then stream one pass through it. That is the sentence from the top of the
lesson, visible in the plan.

Now the other half: **top-N does not need a sort at all.**

```sql runnable id=explain-top-n dataset=package-registry
EXPLAIN
SELECT name, created_at
FROM packages
ORDER BY created_at
LIMIT 3;
```

The plan says `TOP_N`, not `ORDER_BY`. Remove the `LIMIT` and it says
`ORDER_BY`. That difference is a bounded heap:

- **`ORDER_BY`** materialises every row, sorts all $n$ of them, and spills to
  disk if they do not fit in the sort buffer. Cost $\Theta(n\log n)$, memory
  $\Theta(n)$.
- **`TOP_N`** keeps a heap of size $k$. For each row, compare against the heap's
  worst element and either discard it or push and pop. Cost $\Theta(n\log k)$,
  memory $\Theta(k)$.

At $n = 10^9$ and $k = 10$ that is the difference between 30 billion comparisons
with a disk spill and 10 billion comparisons in 10 words of memory. It is also
the reason `ORDER BY x LIMIT 10` is safe on a huge table while `ORDER BY x` on
its own is a way to fill a disk.

Two practical consequences.

**`LIMIT` without `ORDER BY` is not a cheap `ORDER BY ... LIMIT`.** It is a
different query — it returns arbitrary rows — and the optimiser cannot rescue
you.

**A very large `OFFSET` defeats it.** `ORDER BY x LIMIT 10 OFFSET 1000000` needs
the top 1,000,010 rows, so the heap is that big and you are close to a full sort
again. Keyset pagination — `WHERE (x, id) > (last_x, last_id) ORDER BY x, id
LIMIT 10` — keeps the bound at 10 no matter how deep the user scrolls. Note the
`id` in both the filter and the ordering: that is the unique tiebreaker from
lesson 1, and without it a tie on `x` at a page boundary duplicates or skips a
row.
::::

:::exercise{ref=trailing-max-python}
:::

:::exercise{ref=trailing-max-window}
:::

:::exercise{ref=per-row-running-total}
:::

:::exercise{ref=three-day-rolling-total}
:::

:::exercise{ref=top-two-per-language}
:::

:::quiz{id=quiz-l06 passing=3}
- id: q1
  prompt: "`SUM(x) OVER (ORDER BY day)` over a table with 20 rows per day. What does each row get?"
  options:
    - "The running total of x over all rows up to and including that physical row."
    - "The total of x for that day only."
    - "The running total through the end of that day, identical for all 20 rows sharing the day."
    - "The grand total of x, because no frame was specified."
  answerIndex: 2
  explanation: >-
    The default frame is RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW, and
    under RANGE the "current row" includes every peer tied on the sort key. So
    all 20 rows of a day see the same frame — everything through the end of that
    day — and report the same number. A true per-row running total needs ROWS
    BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW. Only the last row of each day
    agrees with it, which is why the bug survives a quick look.
- id: q2
  prompt: "You want the last two readings for each row, ordered by a timestamp that has gaps. Which frame?"
  options:
    - "RANGE BETWEEN 1 PRECEDING AND CURRENT ROW"
    - "ROWS BETWEEN 1 PRECEDING AND CURRENT ROW"
    - "GROUPS BETWEEN 1 PRECEDING AND CURRENT ROW, because timestamps are unique"
    - "No frame — ORDER BY alone gives the previous row."
  answerIndex: 1
  explanation: >-
    "The last two readings" counts rows, so ROWS is the frame that says it.
    RANGE 1 PRECEDING counts key *values*, so a gap in the timestamps empties
    the frame down to the current row alone — a different question, and the right
    one if you meant "the last 24 hours". GROUPS would work when the key is truly
    unique, but ROWS states the intent directly. Omitting the frame gives the
    RANGE UNBOUNDED PRECEDING default, which is a running aggregate over
    everything so far.
- id: q3
  prompt: "Three packages tie for third place by downloads. `QUALIFY row_number() OVER (ORDER BY total DESC) <= 3` returns what?"
  options:
    - "Five rows, because ties all get row number 3."
    - "Three rows, with one of the three tied packages picked arbitrarily."
    - "An error, because row_number cannot break ties."
    - "Three rows, with the tie broken alphabetically by name."
  answerIndex: 1
  explanation: >-
    ROW_NUMBER always produces distinct numbers, so it assigns 3, 4 and 5 to the
    tied packages in an unspecified order and the filter keeps only one of them.
    Nothing breaks it alphabetically unless you add `, name` to the window's
    ORDER BY. If you want all tied rows, use RANK; if you want a deterministic
    three, add a unique tiebreaker and say so.
- id: q4
  prompt: "`WHERE row_number() OVER (PARTITION BY language ORDER BY total DESC) <= 2` is rejected by every engine. Why?"
  options:
    - "Window functions cannot be used with PARTITION BY inside a filter."
    - "WHERE is evaluated before window functions are computed, so the value does not exist yet."
    - "row_number returns a string, which cannot be compared with 2."
    - "The query is missing a GROUP BY, which window functions require."
  answerIndex: 1
  explanation: >-
    Window functions run after WHERE and GROUP BY have already chosen the rows —
    which is the whole reason they can see neighbouring rows at all. So the value
    does not exist when WHERE runs. The fix is a second filter that runs later:
    QUALIFY in DuckDB, Snowflake and BigQuery, or wrapping the query in a
    subquery and filtering on the alias outside, which is what you need in
    PostgreSQL.
:::
