---
id: t4/s10/l04
title: A rule-based optimizer in eighty lines
tier: t4-scale-systems
stage: s10-query-execution
status: published
estimatedMinutes: 55
objectives:
  - Represent a query plan as a tree and apply meaning-preserving rewrites to it.
  - Implement predicate pushdown and explain which predicates can legally be pushed through which operators.
  - Explain projection pushdown, and why it is worth more in a columnar engine than a row-major one.
  - Order a multi-way join greedily by estimated cardinality, and measure the difference against the worst order.
prerequisites:
  - t1/s01/l05
  - t1/s01/l06
misconceptions:
  - "**\"The optimizer makes the query faster.\"** It rewrites the plan into a cheaper plan *according to its cost model*, and the cost model runs on estimates. When the estimates are wrong the optimizer confidently chooses a worse plan, and it will do so consistently, because nothing in the loop ever measures anything."
  - "**\"Any filter can be pushed below any join.\"** A filter referencing only the left side can be pushed into the left side of an *inner* join. Push that same filter below an outer join's null-supplying side and you change the answer, because rows that would have been padded with NULLs are now gone before the padding happens. Predicate pushdown is legal exactly where it preserves the relation, not wherever it is faster."
  - "**\"Join order only matters for performance.\"** It only affects performance, and the range of that effect spans many orders of magnitude — in the example in this lesson, a factor of 400 million between the best and worst order of four tables. A difference that large is not a performance difference; it is the difference between a query and a hang."
  - "**\"Rewriting my SQL by hand is how I control the plan.\"** Most hand rewrites — reordering the FROM list, nesting a subquery, moving a predicate from ON to WHERE — are normalised away before the optimizer runs. The rewrites that do change a plan are the ones that change what the optimizer is *allowed* to do, which is lesson 5."
masteryChecklist:
  - I can write a plan as a tree of dicts and walk it recursively.
  - I can say which side of a join a given predicate can be pushed into, and when pushing it would be illegal.
  - I can explain what projection pushdown saves and why it saves more in a column store.
  - Given table sizes and join selectivities, I can order a join greedily and defend the order.
runtimes:
  - engine: python
    packages: []
---

An optimizer is not intelligent. It is a set of rewrite rules over a tree, each
of which preserves the meaning of the plan and is *believed* to lower its cost,
plus a search over join orders driven by a cost model. The rules are short
enough to fit on a page, and you can write the important ones today.

The word to hold onto is *believed*. Every rule in this lesson is unconditional
and safe. The search at the end is not: it depends on estimates, and estimates
are wrong. Lesson 5 is about what happens then.

## A plan is a tree of dicts

```python runnable id=plan-shape
def scan(table):
    return {"op": "scan", "table": table}

def filter_(predicate, child):
    return {"op": "filter", "predicate": predicate, "child": child}

def project(columns, child):
    return {"op": "project", "columns": columns, "child": child}

def join(left, right):
    return {"op": "join", "left": left, "right": right}

def pred(table, column, op, value):
    return {"table": table, "column": column, "op": op, "value": value}

def show(node, depth=0):
    pad = "  " * depth
    if node["op"] == "scan":
        print(pad + "SEQ_SCAN " + node["table"])
    elif node["op"] == "filter":
        p = node["predicate"]
        print(pad + "FILTER %s.%s %s %r" % (p["table"], p["column"], p["op"], p["value"]))
        show(node["child"], depth + 1)
    elif node["op"] == "project":
        print(pad + "PROJECTION " + ", ".join(node["columns"]))
        show(node["child"], depth + 1)
    else:
        print(pad + "HASH_JOIN")
        show(node["left"], depth + 1)
        show(node["right"], depth + 1)

# SELECT name, version
# FROM packages JOIN versions ON packages.id = versions.package_id
# WHERE packages.language = 'python' AND versions.size_kb > 550
plan = filter_(
    pred("versions", "size_kb", ">", 550),
    filter_(
        pred("packages", "language", "=", "python"),
        project(["name", "version"], join(scan("packages"), scan("versions"))),
    ),
)
show(plan)
```

That tree is what the parser hands the optimizer: filters at the top, because
`WHERE` is written after `FROM`, and a join underneath doing all its work before
anything is thrown away.

Nobody would execute it in that order. The whole job of the optimizer is to
notice that.

## Rule 1: predicate pushdown

A filter that mentions only one table can be moved down the tree until it sits
directly on that table's scan. It changes nothing about the answer and it
changes everything about the cost, because every operator between the old
position and the new one now processes fewer rows.

The rule has three cases and they are all short:

- **filter over project** — swap them. Legal as long as the filter's column
  survives the projection.
- **filter over join** — push into whichever side contains the filter's table.
- **filter over scan** — stop. You have arrived.

Here is what it is worth on a two-table join, measured by an interpreter that
counts every row it touches.

```python runnable id=pushdown-win
import time

TABLES = {
    "packages": [
        {"id": i, "name": "pkg-%d" % i,
         "language": "python" if i % 10 == 0 else "rust"}
        for i in range(5000)
    ],
    "versions": [
        {"package_id": i % 5000, "version": "1.0.%d" % i, "size_kb": (i * 37) % 600}
        for i in range(50000)
    ],
}

counters = {"join_out": 0, "touched": 0}

def scan_op(table):
    for row in TABLES[table]:
        counters["touched"] += 1
        yield row

def filter_op(child, p):
    for row in child:
        ok = row[p["column"]] > p["value"] if p["op"] == ">" else row[p["column"]] == p["value"]
        if ok:
            counters["touched"] += 1
            yield row

def join_op(left, right):
    buckets = {}
    for row in left:
        buckets.setdefault(row["id"], []).append(row)
    for row in right:
        for match in buckets.get(row["package_id"], ()):
            counters["join_out"] += 1
            counters["touched"] += 1
            yield {**match, **row}

def run(node):
    if node["op"] == "scan":
        return scan_op(node["table"])
    if node["op"] == "filter":
        return filter_op(run(node["child"]), node["predicate"])
    return join_op(run(node["left"]), run(node["right"]))

def pred(table, column, op, value):
    return {"table": table, "column": column, "op": op, "value": value}

as_written = {
    "op": "filter", "predicate": pred("versions", "size_kb", ">", 550),
    "child": {
        "op": "filter", "predicate": pred("packages", "language", "=", "python"),
        "child": {"op": "join",
                  "left": {"op": "scan", "table": "packages"},
                  "right": {"op": "scan", "table": "versions"}},
    },
}

pushed_down = {
    "op": "join",
    "left": {"op": "filter", "predicate": pred("packages", "language", "=", "python"),
             "child": {"op": "scan", "table": "packages"}},
    "right": {"op": "filter", "predicate": pred("versions", "size_kb", ">", 550),
              "child": {"op": "scan", "table": "versions"}},
}

for label, plan in (("as written", as_written), ("pushed down", pushed_down)):
    counters.update(join_out=0, touched=0)
    start = time.perf_counter()
    out = sum(1 for _ in run(plan))
    ms = (time.perf_counter() - start) * 1000
    print("%-12s rows out %4d | through the join %6d | rows touched %7d | %5.1f ms"
          % (label, out, counters["join_out"], counters["touched"], ms))
```

Same 333 rows out of both. **50,000 rows through the join, against 333** — a
factor of 150 on the operator that costs the most — and about three times less
wall clock.

Notice what did *not* change: both plans scan 55,000 rows, because both have to
read both tables. Pushdown never removes a scan. What it removes is everything
that happens above one.

:::pitfall{title="The push that changes the answer"}
`LEFT JOIN packages ON ... WHERE versions.size_kb > 550` cannot be pushed into
`versions`.

An outer join pads unmatched rows with NULLs. The `WHERE` runs after the
padding, so it sees those NULL-padded rows and discards them — which quietly
turns the outer join into an inner one. Push the predicate *below* the join and
it runs before the padding, on a different set of rows, and the results differ.

The general rule: a predicate can be pushed through an operator when the
operator cannot invent rows or values. Joins that pad with NULLs can. So can
`GROUP BY` with respect to predicates on the aggregate — `HAVING sum(x) > 10`
is not a filter on any input row and cannot be pushed anywhere.

This is the same three-valued-logic hazard as `NOT IN` with a NULL, one level
up: an operator that manufactures NULLs changes what a predicate means.
:::

## Rule 2: projection pushdown

The same idea applied to columns. If the query never mentions
`versions.published_at`, no operator should carry it, and the scan should never
read it.

In a row store this saves memory bandwidth: narrower rows, more rows per cache
line. In a **column store it saves the I/O entirely** — a column nobody
projected is a file that is never opened. That is the reason
`SELECT *` on a wide Parquet table can be a hundred times slower than selecting
the four columns you wanted, while on a row store it is barely worse.

Look back at the plan in lesson 1 and you will see DuckDB reporting exactly
this, as a `Projections:` list inside the `SEQ_SCAN` box. The projection did not
stay a separate operator; it was pushed into the scan and became a decision
about which columns to read at all.

:::checkpoint{id=cp-legal rubric="pushdown is legal when the operator below cannot invent rows or values,an outer join pads with NULLs so pushing past it changes the answer,HAVING on an aggregate refers to no input row"}
Name two places a predicate cannot be pushed past, and say what the two have in
common.
:::

## Rule 3: join order, where the estimates enter

The first two rules are unconditional — apply them always, they always help.
Join ordering is a different kind of rule. Every order returns the same rows;
they differ only in how many rows exist in the middle. And you cannot know how
many that is without knowing the data.

```python runnable id=join-order
from itertools import permutations
from math import prod

def edge_key(a, b):
    return frozenset({a, b})

RELATIONS = {
    "packages": 20_000,
    "versions": 260_000,
    "downloads": 2_000_000,
    "maintainers": 10_000,
}
# Each edge joins on packages.id, whose 20,000 distinct values give a
# selectivity of 1/20000 for a join through that key.
EDGES = {
    edge_key("packages", "versions"): 1 / 20_000,
    edge_key("packages", "downloads"): 1 / 20_000,
    edge_key("packages", "maintainers"): 1 / 20_000,
}

def order_cost(order, relations, edges):
    """Total intermediate rows a left-deep join in this order produces."""
    running = relations[order[0]]
    joined = [order[0]]
    total = 0
    for name in order[1:]:
        selectivity = prod(edges.get(edge_key(name, j), 1.0) for j in joined)
        running = running * relations[name] * selectivity
        total += running
        joined.append(name)
    return total

best = min(permutations(RELATIONS), key=lambda o: order_cost(list(o), RELATIONS, EDGES))
worst = max(permutations(RELATIONS), key=lambda o: order_cost(list(o), RELATIONS, EDGES))

print("best  %-58s %18.0f" % (" -> ".join(best), order_cost(list(best), RELATIONS, EDGES)))
print("worst %-58s %18.0f" % (" -> ".join(worst), order_cost(list(worst), RELATIONS, EDGES)))
print("ratio: %.0f x" % (order_cost(list(worst), RELATIONS, EDGES)
                         / order_cost(list(best), RELATIONS, EDGES)))
```

Thirteen million intermediate rows against five *quadrillion* — a factor of
roughly four hundred million, over four tables that all fit on a laptop.

The reason is visible in the worst order: it starts `versions -> downloads`,
two tables with no edge between them. They only relate *through* `packages`, so
joining them first is a cross product — 260,000 × 2,000,000 rows materialised
before anything can be filtered. This is the single most valuable thing to look
for in a bad plan.

:::insight{title="Where the estimates come in, and why this is the last easy lesson"}
Every number in that cost function is a guess. `2,000,000` is the optimizer's
estimate of the `downloads` row count after its filters. `1/20000` is derived
from a *distinct-value* estimate for `packages.id`, which is itself
approximate.

The rules in this lesson are safe because they are true regardless of the data.
This one is only as good as the numbers, and the numbers come from statistics
that were sampled, approximated, and possibly last refreshed weeks ago.

That is the whole subject of the next lesson.
:::

:::exercise{ref=predicate-pushdown}
:::

:::exercise{ref=greedy-join-order}
:::

::::track{depth=proof}
## Why the optimizer does not just try every order

**The search space.** For $n$ relations, a *left-deep* plan is a permutation, so
there are $n!$ of them. Allowing *bushy* plans — where a join's right input may
itself be a join — the count of join trees is

$$B(n) = \frac{(2n-2)!}{(n-1)!}.$$

Check it on small cases: $B(2) = 2!/1! = 2$, $B(3) = 4!/2! = 12$,
$B(4) = 6!/3! = 120$. At $n = 10$ that is 17,643,225,600 trees against
3,628,800 permutations — bushy plans outnumber left-deep ones by about five
thousand to one, and both are far too many to enumerate.

**The dynamic program, and its exact cost.** Selinger's 1979 algorithm avoids
enumeration by observing that the cheapest plan for a set $S$ of relations is
built from the cheapest plan for some proper subset $S'$ joined to $S
\setminus S'$ — optimal substructure, given a cost function that does not
depend on how a subplan was built. So the DP considers every pair $(S', S)$
with $S' \subset S \subseteq [n]$. Count them:

$$
\sum_{S \subseteq [n]} 2^{|S|} = \sum_{k=0}^{n} \binom{n}{k} 2^{k}
= (1 + 2)^{n} = 3^{n}
$$

by the binomial theorem. So the classic join-ordering DP is $\Theta(3^n)$ time
and $\Theta(2^n)$ space, exactly — and $3^{10} = 59{,}049$, which is nothing.
Ten tables have seventeen billion plans and the DP looks at fifty-nine thousand
pairs.

**Why it is still hard.** $3^n$ is exponential, and the problem it is solving is
genuinely intractable: join ordering is NP-hard, shown for chain queries under
cost functions of this kind by Ibaraki and Kameda (1984) and extended by Cluet
and Moerkotte (1995) to the case where cross products are allowed, where even
star queries are NP-hard. There is no polynomial algorithm to find, only better
heuristics.

**What engines actually do.** Run the exact DP while $n$ is small and switch to
a heuristic above a threshold. PostgreSQL's is literally a configuration
setting: at twelve or more relations in one `FROM`, it abandons the DP for a
genetic algorithm (`geqo_threshold`). $3^{12} = 531{,}441$ — the cutoff is
where the DP stops being free.

:::insight{title="The consequence you can act on"}
Two things follow directly, and both are things you can do on Monday.

A query with twenty joined tables is not being optimized the way you think it
is; it is being *heuristically* ordered, and the heuristic can lose badly.
Breaking it into stages with materialized intermediate results replaces one
intractable search with several tractable ones — and gives the optimizer real
row counts at each boundary rather than estimates.

And the cost model's assumption that a subplan's cost does not depend on its
context is what makes the DP correct. It is also false as soon as sort order
matters, which is why real optimizers carry "interesting orders" alongside cost
and why a plan can legitimately choose a more expensive subplan that arrives
already sorted.
:::
::::

:::quiz{id=quiz-l04 passing=2}
- id: q1
  prompt: "Why can't `WHERE versions.size_kb > 550` be pushed below a LEFT JOIN onto the versions side?"
  options:
    - "Because outer joins are executed by a different operator that has no filter input."
    - "Because the outer join pads unmatched rows with NULLs, and a predicate that runs before the padding sees a different set of rows than one that runs after it."
    - "Because the optimizer cannot determine which table size_kb belongs to."
    - "It can be pushed; the restriction only applies to full outer joins."
  answerIndex: 1
  explanation: >-
    An outer join manufactures rows that did not exist in either input. A
    predicate above the join judges those padded rows; the same predicate below
    the join never sees them and instead removes real rows before padding could
    have happened. The results differ, so the rewrite is illegal — not slow,
    illegal.
- id: q2
  prompt: "Predicate pushdown reduced rows through the join from 50,000 to 333 but only cut wall clock by about 3×. Why not 150×?"
  options:
    - "Because the measurement is dominated by startup overhead."
    - "Because both plans still scan both tables in full, and the scans are most of the remaining work."
    - "Because the hash join was already optimal."
    - "Because Python's dict operations do not scale linearly."
  answerIndex: 1
  explanation: >-
    Pushdown removes work above a scan; it never removes the scan. Both plans
    read all 55,000 base rows, so that cost is a floor. Removing it needs a
    different mechanism — an index, a partition prune, or a zone map that skips
    blocks the predicate cannot match.
- id: q3
  prompt: "In the four-table example, why is the worst order four hundred million times more expensive than the best?"
  options:
    - "Because it builds the hash table on the larger side each time."
    - "Because it joins two tables that have no join condition between them, so the first step is a cross product of 260,000 by 2,000,000 rows."
    - "Because it sorts the intermediate results."
    - "Because it reads the tables in a different physical order."
  answerIndex: 1
  explanation: >-
    The two large tables relate only through `packages`. Joining them directly
    has no predicate to reduce the output, so the intermediate result is the
    full product. Spotting a cross product in a plan — DuckDB prints it as
    CROSS_PRODUCT or as a join with no condition — is the highest-value thing
    to look for when a query has gone from seconds to hours.
:::
