---
id: t1/s02/l02
title: Recursion as a contract
tier: t1-foundations
stage: s02-asymptotics-and-recursion
status: published
estimatedMinutes: 45
objectives:
  - Write a recursive function by discharging three obligations rather than by tracing calls in your head.
  - Diagnose a broken recursion by naming which of the three obligations failed.
  - Draw the recursion tree of a function and read the per-level work off it.
  - Explain why Python raises RecursionError at around a thousand frames and what to do about it.
prerequisites:
  - t1/s02/l01
misconceptions:
  - "**\"To understand a recursive function you trace the calls.\"** Tracing works to depth three and then stops fitting in working memory, which is why recursion feels like a leap of faith. The working method is the opposite: state what the function returns for an *arbitrary* input, then assume the recursive call already does that. You never simulate more than one level."
  - "**\"The base case is where the work happens.\"** The base case is where the work *stops*. It is the smallest input you can answer without help, and it is usually one line returning a constant. Every recursion bug that produces a wrong number lives in the combine step; every bug that produces a RecursionError lives in the shrinking measure."
  - "**\"Recursion is slower than iteration because function calls are slow.\"** The call overhead is a constant factor, and constant factors are not why deep recursion fails. Recursion fails because each pending call holds a stack frame — the cost is $\\Theta(\\text{depth})$ *memory*, which is a resource that runs out abruptly rather than gradually."
  - "**\"Any recursion can be rewritten as a loop with no extra data structure.\"** Only single-recursive (linear) calls flatten into a plain `while`. A function that recurses over several children needs somewhere to remember the children it has not visited yet — you have not removed the stack, you have moved it from the interpreter into a list you control."
masteryChecklist:
  - Given a recursive function, I can state its contract in one sentence about arbitrary input.
  - I can name the shrinking measure of a recursion and prove it reaches the base case.
  - Given a RecursionError, I can tell a genuinely deep input from a measure that never shrinks.
  - I can read an EXPLAIN plan as a tree and say which operator is the base case.
runtimes:
  - engine: python
  - engine: duckdb
    datasetId: package-registry
---

Recursion goes wrong in exactly one place: people try to simulate it. Tracing
calls works to depth three, stops fitting in working memory at depth four, and
from then on recursion feels like a leap of faith.

It is not a leap. It is three obligations, and if you discharge all three the
function is correct whether or not you can picture it running.

## The three obligations

1. **The contract.** One sentence saying what the function returns, for an
   *arbitrary* input — not for the input you happen to be thinking about.
2. **The base case.** The smallest input where you can honour the contract
   without help.
3. **The shrinking measure.** A non-negative integer, derived from the
   arguments, that strictly decreases on every recursive call. It is what
   guarantees you reach the base case.

Once those exist, you write the recursive step by *assuming the contract already
holds for the smaller input*. That assumption is not optimism; it is the
induction hypothesis, and the shrinking measure is what makes the induction
valid.

```python runnable id=contract-example
# A package and everything it pulls in, as a tree.
tree = {
    "name": "graphwalk", "size_kb": 288,
    "deps": [
        {"name": "arrowkit", "size_kb": 190, "deps": [
            {"name": "lazyseq", "size_kb": 205, "deps": []},
        ]},
        {"name": "chunker", "size_kb": 402, "deps": []},
    ],
}

def install_size(pkg):
    """CONTRACT: total size_kb of pkg plus every package beneath it.

    BASE CASE: a package with no deps -- the loop body never runs.
    MEASURE:   number of packages in the subtree; strictly smaller each call.
    """
    total = pkg["size_kb"]
    for dep in pkg["deps"]:
        total += install_size(dep)   # assume this is already correct
    return total

print(install_size(tree), "KB")
```

The base case is not a separate branch here, and that is normal. "A package with
no deps" is handled by the loop running zero times. Writing an explicit
`if not pkg["deps"]: return pkg["size_kb"]` would be correct and redundant.

:::insight{title="Where each kind of bug lives"}
The three obligations partition the failure modes, which makes debugging
mechanical rather than exploratory.

| Symptom | Broken obligation |
| --- | --- |
| Wrong number, terminates fine | the combine step, or a contract you did not actually state |
| `RecursionError` on small input | the shrinking measure |
| `RecursionError` only on large input | nothing is broken; the input is genuinely deeper than the stack |
| Right for one level, wrong for two | you wrote the contract for your example instead of for arbitrary input |

The last row is the subtle one. If your docstring says "returns the size of the
package and its dependencies" you have described a two-level structure, and your
code will handle two levels.
:::

## What a missing measure looks like

```python runnable id=broken-measure
import sys
sys.setrecursionlimit(200)   # lowered so this fails fast and identically everywhere

def bad_sum(values):
    """CONTRACT: the sum of values. Base case: the empty list sums to 0."""
    if not values:
        return 0
    return values[0] + bad_sum(values[0:])   # slice starts at 0 -- nothing shrank

try:
    print(bad_sum([1, 2, 3]))
except RecursionError:
    print("RecursionError on a 3-element list.")
    print("Contract: fine. Base case: fine. Measure: len(values) never decreases.")
```

The contract is right, the base case is right, and the function still cannot
terminate. `values[0:]` is a copy of the whole list, so the measure `len(values)`
is constant. Changing the slice to `values[1:]` fixes it, and no amount of
staring at the base case would have.

:::pitfall{title="The measure has to be an integer, and it has to be non-negative"}
"The list gets shorter" is a measure. "The tree gets simpler" is not — simpler is
not a number. When you cannot name an integer that decreases, the recursion
usually does not terminate on some input you have not tried, and structural
recursion over a graph with a cycle is the classic case. Graphs get a whole
stage later; the fix there is a `visited` set, which restores a measure by
making "number of unvisited nodes" the thing that shrinks.
:::

## The recursion tree

Every recursive call is a node. The children of a node are the calls it makes.
For `install_size` above:

```
install_size(graphwalk)          288
├── install_size(arrowkit)       190
│   └── install_size(lazyseq)    205
└── install_size(chunker)        402
```

Two numbers describe the shape, and between them they explain every cost result
in the next lesson:

- **Work per level.** Add the local work of every node at the same depth.
- **Number of levels.** The maximum depth of the tree.

Total cost is the sum over levels. Here the local work is constant per node and
there are four nodes, so the computation costs four units. The tree *is* the
computation; counting its nodes counts the work.

That framing generalises immediately. Mergesort on $n$ items splits into two
calls of size $n/2$ and does $\Theta(n)$ work to merge, so its tree has $\log_2 n$
levels with $\Theta(n)$ work on each: $\Theta(n \log n)$. You will derive that
properly in the next lesson. What matters here is that the derivation is a
statement about a picture you can draw.

:::checkpoint{id=cp-obligations rubric="contract stated for arbitrary input,base case is the smallest answerable input,shrinking measure is a decreasing non-negative integer,RecursionError on small input means the measure"}
A function raises `RecursionError` on a three-element list. Which of the three
obligations is broken, and how would you confirm it in one line of added code?
:::

## Why the stack runs out

Each pending call holds a **frame**: its arguments, its locals, and where to
return to. The frames live on a stack, the stack is finite, and Python refuses to
grow it past a configured limit rather than letting the process crash.

```python runnable id=stack-depth
import sys

print("default recursion limit:", sys.getrecursionlimit())
sys.setrecursionlimit(300)   # lowered so the numbers below are the same everywhere

def descend(n):
    """CONTRACT: return n. Uselessly, one frame at a time."""
    if n == 0:
        return 0
    return descend(n - 1)

for n in (50, 200, 5000):
    try:
        descend(n)
        print(f"depth {n:>5}: returned normally")
    except RecursionError:
        print(f"depth {n:>5}: RecursionError")
```

The memory cost of a recursion is $\Theta(\text{depth})$, and depth is not the
same as work. A linear scan written recursively does $\Theta(n)$ work and holds
$\Theta(n)$ frames — that is the version that dies on a million-element list. A
balanced binary recursion does $\Theta(n)$ work but holds only
$\Theta(\log n)$ frames, so a million elements needs about twenty. **Depth, not
work, is what the stack charges you for.**

Python will not rescue you with tail-call optimisation, and the reason is a
deliberate trade: eliminating a tail call erases its frame, and with it the
traceback line that would have told you where the failure came from. Every other
language that skips TCO for the same reason makes the same bet — that stack
traces are worth more than deep recursion. Whether or not you agree, the
consequence for you is fixed: **if the depth can be large, do not recurse.**
Convert to a loop, or to a loop plus an explicit stack you control, which is the
second exercise below.

## A query plan is a recursion tree

:::dataset{id=package-registry tables="packages,versions,package_maintainers"}
:::

The tree in the middle of this lesson and the tree `EXPLAIN` prints are the same
object, drawn by different people.

```sql runnable id=plan-tree dataset=package-registry
EXPLAIN
SELECT p.name, v.version, pm.role
FROM packages p
JOIN versions v ON v.package_id = p.id
JOIN package_maintainers pm ON pm.package_id = p.id
WHERE p.language = 'rust';
```

Read it bottom-up, which is execution order.

| Recursion tree | Query plan |
| --- | --- |
| a call | an operator |
| the calls it makes | its child operators |
| base case | a table scan — rows come from storage, not from another operator |
| combine step | the join or aggregate that consumes its children's rows |
| subproblem size | the estimated cardinality printed on the node |
| depth | pipeline depth, which bounds how much can run in parallel |

The cost of a plan obeys the recurrence you are about to spend a whole lesson
solving:

$$
\text{cost}(\text{node}) \;=\; \sum_{\text{child}} \text{cost}(\text{child}) \;+\; \text{local work}
$$

and the *cardinality* of a node obeys its own recurrence, one that multiplies
rather than adds — which is why estimation errors get worse the further up the
tree you go.

```sql runnable id=plan-actual dataset=package-registry
SELECT count(*) AS actual_rows
FROM packages p
JOIN versions v ON v.package_id = p.id
JOIN package_maintainers pm ON pm.package_id = p.id
WHERE p.language = 'rust';
```

Compare the two. At the leaf, the scan of `packages` is estimated at ~5 rows and
there really are 5 Rust packages. One join up, ~6 estimated and 6 actual. At the
root, ~3 estimated and **7 actual** — the estimate went down while the truth went
up, because `keyspace` has two maintainers and the join fans out instead of
filtering.

That is the whole reason plans go wrong at scale. Leaf estimates come from column
statistics and are usually decent. Every join multiplies two estimates together
and multiplies their errors with them, so a plan ten operators deep can be off by
orders of magnitude at the root while every leaf was nearly right. In the next
lesson you will see the same phenomenon in a recurrence: an error in the
per-level work is amplified by the number of levels.

:::exercise{ref=plan-tree-cost}
:::

:::exercise{ref=preorder-without-recursion}
:::

::::track{depth=systems}
## What the stack actually costs, and what real engines do instead

A CPython frame is not free and not enormous. It carries the code object, the
argument and local slots, the value stack, the previous frame pointer, and the
exception state. Since CPython 3.11 those frames live in a contiguous chunk of
memory rather than being individually heap-allocated objects, which made calls
substantially cheaper — but each one still occupies space proportional to the
function's number of locals, and they still stack up.

`sys.setrecursionlimit` raises the *Python-level* counter. It does not enlarge
the *C* stack underneath it, which is fixed when the thread is created (commonly
8 MB on Linux, 512 KB inside a thread, and considerably less in a WebAssembly
runtime). Raise the limit far enough and you do not get a `RecursionError` —
you get a segmentation fault, because the interpreter's own C recursion runs off
the end of a stack it does not manage. This is why the correct response to
"RecursionError on real data" is never "raise the limit".

Real query engines settled this long ago and in two different directions.

**Postgres recurses.** Its executor calls `ExecProcNode` on a child, which calls
it again on that node's child, so plan depth becomes C stack depth. It guards
this with an explicit `check_stack_depth()` call and a `max_stack_depth` GUC, and
a sufficiently deep plan is refused with an error rather than a crash. Same
problem you have, same solution: a counter checked before descending.

**DuckDB does not.** Its execution model is push-based and vectorised: a pipeline
is compiled into a flat sequence of operators, and a chunk of a couple of
thousand rows is pushed through them by a scheduler loop. There is no host-stack
frame per plan node, which is exactly the "convert the recursion into an explicit
structure you control" move from the exercise below, applied to an entire
execution engine. It is also what makes the plan parallelisable — a recursion is
hard to hand to another thread, a work queue is not.

The lesson generalises past databases. Any time depth is data-dependent — a JSON
document from a user, a directory tree, a dependency graph, a parse tree — the
recursion depth is under someone else's control, and someone else's control means
an attacker's control. A recursive JSON parser with no depth cap is a real,
routinely-exploited denial-of-service bug: a few kilobytes of nested brackets and
the process is gone.
::::

:::quiz{id=quiz-l02 passing=3}
- id: q1
  prompt: "A recursive function raises RecursionError on a 3-element list. What is the most likely cause?"
  options:
    - "The base case is missing a return statement."
    - "The shrinking measure does not actually shrink on every call."
    - "Python's recursion limit is set too low for this workload."
    - "The list is being copied, which uses too much memory."
  answerIndex: 1
  explanation: >-
    Three elements cannot exhaust a thousand frames, so the depth is not the
    problem — the recursion is not making progress toward the base case. A
    missing return in the base case gives you `None` and a TypeError, not a
    RecursionError. Raising the limit here would turn a fast failure into a slow
    one.
- id: q2
  prompt: "A recursive function does $\\Theta(n)$ total work. How much stack does it hold?"
  options:
    - "Θ(n) — work and depth are the same quantity."
    - "Θ(1) — frames are popped as soon as each call returns."
    - "It depends on the shape: Θ(n) if the recursion is a chain, Θ(log n) if it splits in half."
    - "Θ(log n) — the stack is always logarithmic in the work."
  answerIndex: 2
  explanation: >-
    Depth and work are independent. Summing a list one element at a time does
    $\Theta(n)$ work at depth $n$; a balanced divide-and-conquer does $\Theta(n)$
    work at depth $\Theta(\log n)$. Frames are indeed popped on return, but every
    call on the path from the root to the current node is still pending.
- id: q3
  prompt: "In an EXPLAIN plan, what corresponds to a recursion's base case?"
  options:
    - "The top operator, because it is what returns the final answer."
    - "A table scan — it produces rows from storage rather than from another operator."
    - "The join with the smallest estimated cardinality."
    - "Nothing; a query plan has no base case because it does not recurse."
  answerIndex: 1
  explanation: >-
    A base case answers without asking anything else. In a plan that is a leaf
    scan, which reads storage directly. The top operator is the root call, and
    reading a plan bottom-up is reading it in the order the base cases resolve.
- id: q4
  prompt: "Why does a leaf cardinality estimate tend to be more accurate than the root's?"
  options:
    - "Leaves are executed first, so their numbers are measured rather than estimated."
    - "Leaves are estimated from column statistics, while each join multiplies two estimates and their errors together."
    - "The optimizer spends more time on leaves because they dominate the cost."
    - "Root estimates are rounded to the nearest power of ten."
  answerIndex: 1
  explanation: >-
    Leaf estimates come from real statistics about one column. Every join above
    them combines two estimates multiplicatively, so relative errors compound —
    ten operators of 2x error each is a 1000x error at the root. Nothing is
    measured during planning; EXPLAIN ANALYZE is what gives you measured rows.
:::
