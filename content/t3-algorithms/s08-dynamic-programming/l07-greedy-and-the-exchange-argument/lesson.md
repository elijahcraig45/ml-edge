---
id: t3/s08/l07
title: Greedy, and how to know it works
tier: t3-algorithms
stage: s08-dynamic-programming
status: published
estimatedMinutes: 50
objectives:
  - State the two things a greedy algorithm needs — the greedy-choice property and optimal substructure — and check them on a specific problem.
  - Prove the earliest-finishing-time rule optimal with an exchange argument.
  - Prove Huffman coding optimal, and say which step of the proof each of the two lemmas supplies.
  - Produce a counterexample for a plausible greedy rule instead of testing it until it looks right.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"Greedy is what you try before you write the DP.\"** Greedy is what you write *after* you have proved that keeping one candidate is enough. Reversing the order is how a plausible rule reaches production, because a wrong greedy algorithm returns a good answer on almost every input someone will think to test."
  - "**\"If greedy is right on all my test cases, it is right.\"** Greedy failures are usually near-misses. Sorting knapsack by value per kilobyte gets within a few percent on random data and is wrong; you find that by constructing an adversarial instance, not by sampling."
  - "**\"Huffman is optimal because short codes for frequent symbols is the obvious rule.\"** That intuition does not distinguish Huffman from a dozen other rules that also give frequent symbols short codes and are not optimal. What makes Huffman optimal is a specific pair of facts: the two rarest symbols can be assumed to be siblings at maximum depth, and merging them yields an equivalent smaller instance."
  - "**\"Greedy and DP are alternatives for the same problems.\"** They apply to overlapping but different problem sets, and the boundary can be a single word in the statement. Merging any two batches is greedy; merging only *adjacent* batches is a cubic interval DP with no greedy rule at all."
masteryChecklist:
  - Given a proposed greedy rule, I can either give an exchange argument or construct a counterexample.
  - I can prove the earliest-finish-time interval scheduler optimal without looking it up.
  - I can state Huffman's two lemmas and say why neither alone is enough.
  - I can explain why greedy is optimal for fractional knapsack and not for 0/1 knapsack, in terms of what the exchange has to swap in.
runtimes:
  - engine: python
---

A greedy algorithm is a dynamic program with the search deleted. Where the DP
considers every first choice and takes the best result, greedy commits to one
first choice and never looks back. That is a spectacular saving — usually
$\Theta(n \log n)$ against $\Theta(n^2)$ or worse — and it is sound only if you
can prove the choice you commit to is never wrong.

The proof is not optional decoration. A wrong greedy algorithm does not look
wrong: it agrees with the optimum on most inputs and misses by a few percent on
the rest, which is exactly the failure mode that survives code review and ships.

## Four plausible rules, one that works

Schedule as many jobs as possible on one machine. Each job has a fixed start and
end; two jobs conflict if they overlap. Four rules suggest themselves, and three
of them are wrong.

```python runnable id=four-rules
def schedule(intervals, key):
    chosen, last_end = [], float("-inf")
    for job in sorted(intervals, key=key):
        start, end = job
        if start >= last_end:
            chosen.append(job)
            last_end = end
    return chosen

rules = {
    "earliest start   ": lambda j: j[0],
    "shortest duration": lambda j: j[1] - j[0],
    "earliest finish  ": lambda j: j[1],
}

instances = {
    "one hog":        [(0, 10), (1, 2), (3, 4), (5, 6)],
    "short blocker":  [(0, 5), (4, 6), (5, 10)],
    "mixed":          [(1, 4), (3, 5), (0, 6), (5, 7), (3, 9), (5, 9), (6, 10), (8, 11)],
}

for name, jobs in instances.items():
    print(f"{name}:")
    for label, key in rules.items():
        picked = schedule(jobs, key)
        print(f"    {label} -> {len(picked)}  {picked}")
```

Earliest start loses to a single long job that blocks everything. Shortest
duration loses to a short job straddling the boundary between two long ones that
would both have fitted. Earliest finish wins all three — and, unlike the other
two, it wins *every* instance, which is a claim that needs a proof rather than a
table.

:::insight{title="Why finishing time is the right thing to be greedy about"}
The resource you are competing for is the machine's remaining time. Of all the
jobs still compatible with what you have scheduled, the one that finishes
earliest leaves the machine free earliest — so it leaves the largest possible
set of futures available.

That sentence is not a proof, but it is the shape of one: the greedy choice is
the one that *dominates* every alternative with respect to the state that the
rest of the problem depends on. When you are looking for the right greedy rule,
look for the choice that dominates on the state, not the choice that looks
locally best on the objective.
:::

## The two obligations

Every correct greedy algorithm discharges exactly two proof obligations. Both.

**1. The greedy-choice property.** There exists an optimal solution containing
the greedy choice. Note the wording: not "every optimal solution", and not "the
greedy choice is in *the* optimum" — only that you never lose by taking it. This
is what an *exchange argument* establishes: take any optimal solution, and show
you can swap the greedy choice in without making it worse.

**2. Optimal substructure.** After committing to the greedy choice, what remains
is an instance of the same problem, and solving it optimally completes an optimal
whole. This is the same property Lesson 1 defined, and greedy needs it for the
same reason the DP does.

Miss the first and you commit to a choice no optimal solution contains. Miss the
second and your correct first move is followed by a subproblem that is not the
problem you think you are solving.

:::checkpoint{id=cp-two-obligations rubric="greedy choice property: some optimal solution contains the greedy choice,optimal substructure: what remains is the same problem and solving it optimally completes an optimal whole,you need both"}
Name the two things you must prove about a greedy rule, and say what goes wrong
if you have only the second.
:::

## Where greedy fails, and how narrowly

Three failures worth carrying around, because each is one word away from a
problem where greedy is right.

```python runnable id=greedy-failures
import heapq
from functools import lru_cache

# 1. Coin change. Greedy is optimal for (1, 5, 10, 25). It is not for (1, 3, 4).
def greedy_coins(amount, coins):
    count = 0
    for c in sorted(coins, reverse=True):
        take = amount // c
        count += take
        amount -= take * c
    return count if amount == 0 else None

def optimal_coins(amount, coins):
    best = [0] + [float("inf")] * amount
    for t in range(1, amount + 1):
        best[t] = min((best[t - c] + 1 for c in coins if c <= t), default=float("inf"))
    return best[amount]

print("coins (1,5,10,25) for 30:", greedy_coins(30, (1, 5, 10, 25)), optimal_coins(30, (1, 5, 10, 25)))
print("coins (1,3,4)     for  6:", greedy_coins(6, (1, 3, 4)), optimal_coins(6, (1, 3, 4)))

# 2. Knapsack. Greedy by density is optimal for fractions, not for whole items.
items = [(190, 92000), (402, 31880), (22, 20200), (512, 11960),
         (18, 9080), (71, 7210), (154, 6460)]

def greedy_density(items, capacity):
    total = 0
    for weight, value in sorted(items, key=lambda it: -it[1] / it[0]):
        if weight <= capacity:
            capacity -= weight
            total += value
    return total

def optimal_knapsack(items, capacity):
    best = [0] * (capacity + 1)
    for weight, value in items:
        for c in range(capacity, weight - 1, -1):
            best[c] = max(best[c], best[c - weight] + value)
    return best[capacity]

print("knapsack 700KB:          ", greedy_density(items, 700), optimal_knapsack(items, 700))
```

Greedy coin change is optimal for the coin systems most currencies use and wrong
for `(1, 3, 4)`: it takes 4, then two 1s, for three coins, where 3 + 3 is two.
Greedy knapsack is optimal when you may take a fraction of an item and wrong
when you may not — and the reason is precise. The fractional exchange argument
works because any spare capacity left by removing an item can be refilled with a
*slice* of the next-densest one. Forbid slicing and the exchange has nothing to
swap in, and the proof, not merely the algorithm, stops working.

The third failure you have already seen. Lesson 5 merged batches: merging any two
greedily is optimal (that is Huffman), and merging only *adjacent* pairs makes
greedy wrong by 80 downloads and forces a $\Theta(n^3)$ interval DP. One word in
the problem statement.

## Huffman coding

Given symbol frequencies, build a binary prefix code minimising the total encoded
length $\sum_s f_s \cdot \mathrm{depth}(s)$. The algorithm is three lines: repeatedly
remove the two least-frequent nodes, join them under a new node whose frequency
is their sum, and put it back.

```python runnable id=huffman
import heapq

def huffman_cost(frequencies):
    """Total encoded length: the sum of every merge, which equals sum(f * depth)."""
    if len(frequencies) < 2:
        return 0
    heap = list(frequencies)
    heapq.heapify(heap)
    total = 0
    while len(heap) > 1:
        a, b = heapq.heappop(heap), heapq.heappop(heap)
        total += a + b
        heapq.heappush(heap, a + b)
    return total

def code_lengths(frequencies):
    """The same run, tracking each symbol's depth, to check the identity."""
    heap = [(f, [i]) for i, f in enumerate(frequencies)]
    heapq.heapify(heap)
    depth = {i: 0 for i in range(len(frequencies))}
    while len(heap) > 1:
        (f1, g1), (f2, g2) = heapq.heappop(heap), heapq.heappop(heap)
        for i in g1 + g2:
            depth[i] += 1
        heapq.heappush(heap, (f1 + f2, g1 + g2))
    return depth

freqs = [5, 9, 12, 13, 16, 45]
depth = code_lengths(freqs)
print("merge total     :", huffman_cost(freqs))
print("sum f * depth   :", sum(f * depth[i] for i, f in enumerate(freqs)))
print("code lengths    :", [depth[i] for i in range(len(freqs))])
```

The two numbers agree, and that is not a coincidence: every merge adds one to the
depth of every symbol beneath it, so the sum of the merges counts each symbol's
frequency once per level it sits below the root. That identity is what makes the
sum-of-merges formulation legitimate, and it is also what the proof will use.

Two claims carry the algorithm, and the proof track establishes both.

> **Lemma 1 (the greedy choice).** If $x$ and $y$ are the two least-frequent
> symbols, some optimal prefix code has $x$ and $y$ as sibling leaves at maximum
> depth.

> **Lemma 2 (optimal substructure).** Replacing $x$ and $y$ with a single symbol
> $z$ of frequency $f_x + f_y$ gives an instance whose optimal cost is exactly
> $f_x + f_y$ less than the original's.

Neither alone is enough. Lemma 1 without Lemma 2 tells you a safe first move and
leaves you no way to continue. Lemma 2 without Lemma 1 tells you the reduction is
faithful but not that merging *the two smallest* is the reduction to make.

## When greedy works in general

There is one clean sufficient condition. A **matroid** is a ground set with a
family of "independent" subsets closed under taking subsets and satisfying an
exchange axiom: if $A$ and $B$ are independent and $|A| < |B|$, some element of
$B \setminus A$ can be added to $A$ keeping it independent. The Rado–Edmonds
theorem says that for *any* weight function, taking elements in decreasing weight
order while preserving independence yields a maximum-weight independent set —
and, less famously, that greedy failing for some weight function proves the
structure is not a matroid.

Spanning forests of a graph form a matroid, which is why Kruskal's algorithm is
greedy and correct. Sets of pairwise-disjoint intervals do **not** form a matroid,
and interval scheduling is optimal anyway, by the exchange argument below. So the
theorem is a sufficient condition and a genuinely useful one — but the exchange
argument is the tool you will actually reach for, because it applies where the
theorem does not.

::::track{depth=proof}
## Two proofs, done properly

:::proof{title="Earliest finishing time is optimal for interval scheduling"}
**Setup.** Jobs $J = \{j_1, \dots, j_n\}$, each an interval $[s_i, f_i)$. A
schedule is a subset of pairwise-disjoint jobs. Let $G = \langle g_1, g_2, \dots,
g_k \rangle$ be the jobs the greedy algorithm selects, in the order it selects
them, always taking the compatible job with the smallest finishing time.

**Claim.** No schedule has more than $k$ jobs.

**Step 1: greedy stays ahead.** For every $r \le k$, and every schedule
$O = \langle o_1, \dots, o_m \rangle$ listed in increasing finishing time with
$m \ge r$, we have $f(g_r) \le f(o_r)$.

*Induction on $r$.* For $r = 1$: greedy picks the globally earliest-finishing
job, and $o_1$ is some job, so $f(g_1) \le f(o_1)$.

Assume $f(g_{r-1}) \le f(o_{r-1})$. Since $O$ is a valid schedule,
$s(o_r) \ge f(o_{r-1}) \ge f(g_{r-1})$, so $o_r$ is compatible with everything
greedy has selected so far and was therefore *available* to greedy at step $r$.
Greedy chose the available job with the smallest finishing time, so
$f(g_r) \le f(o_r)$.

**Step 2: the conclusion.** Suppose some schedule $O$ has $m > k$ jobs. By
Step 1, $f(g_k) \le f(o_k)$. Then $s(o_{k+1}) \ge f(o_k) \ge f(g_k)$, so
$o_{k+1}$ is compatible with all of $G$ and was available when greedy stopped —
contradicting the fact that greedy stops only when nothing is available. Hence
$m \le k$. $\blacksquare$
:::

The same theorem admits a pure exchange argument, and it is worth seeing the two
side by side. Take any optimal $O$ ordered by finishing time. Since
$f(g_1) \le f(o_1)$, the set $(O \setminus \{o_1\}) \cup \{g_1\}$ is still
pairwise disjoint — $g_1$ finishes no later than $o_1$ did, so it cannot collide
with $o_2, o_3, \dots$ — and it has the same size, so it is also optimal.
Repeating the swap converts $O$ into $G$ one element at a time without ever
shrinking it. "Greedy stays ahead" is the induction packaged as a measure;
exchange is the induction packaged as a transformation. Most greedy proofs can be
written either way, and the exchange form generalises further.

:::proof{title="Huffman's algorithm is optimal"}
**Setup.** An alphabet $C$ with frequencies $f_s > 0$. A prefix code is a binary
tree whose leaves are the symbols; its cost is
$B(T) = \sum_{s \in C} f_s \cdot d_T(s)$ where $d_T(s)$ is $s$'s depth. We want a
tree of minimum cost. Note first that an optimal tree is **full** — every
internal node has two children — since a node with one child can be spliced out,
strictly reducing depths.

**Lemma 1 (greedy choice).** Let $x, y$ be two symbols of lowest frequency. There
is an optimal tree in which $x$ and $y$ are siblings at maximum depth.

*Proof.* Let $T$ be optimal, and let $a, b$ be two sibling leaves at maximum
depth (they exist: take any deepest leaf; because $T$ is full, its sibling is
also a leaf at that depth). Without loss of generality $f_a \le f_b$ and
$f_x \le f_y$.

Build $T'$ by swapping $x$ with $a$. The cost changes by

$$
B(T) - B(T') = (f_a - f_x)\big(d_T(a) - d_T(x)\big).
$$

Both factors are non-negative: $f_x \le f_a$ because $x$ is of minimum
frequency, and $d_T(x) \le d_T(a)$ because $a$ is at maximum depth. So
$B(T') \le B(T)$. Swapping $y$ with $b$ in $T'$ gives $T''$ with
$B(T'') \le B(T') \le B(T)$ by the same argument.

$T$ was optimal, so $B(T'') = B(T)$, and $T''$ is an optimal tree in which $x$
and $y$ are siblings at maximum depth. $\square$

**Lemma 2 (optimal substructure).** Let $z$ be a new symbol with
$f_z = f_x + f_y$, and let $C' = (C \setminus \{x, y\}) \cup \{z\}$. If $T'$ is an
optimal tree for $C'$, then the tree $T$ obtained by giving $z$'s leaf two
children $x$ and $y$ is optimal for $C$.

*Proof.* First the cost identity. In $T$, $x$ and $y$ sit one level below where
$z$ sat, and every other symbol is unmoved, so

$$
B(T) = B(T') - f_z\,d_{T'}(z) + (f_x + f_y)\big(d_{T'}(z) + 1\big) = B(T') + f_x + f_y,
$$

using $f_z = f_x + f_y$.

Now suppose $T$ is not optimal for $C$. By Lemma 1 there is an optimal tree $U$
for $C$ in which $x$ and $y$ are siblings, and $B(U) < B(T)$. Contract that
sibling pair into a single leaf $z$ to obtain $U'$, a tree for $C'$. The same
identity gives $B(U') = B(U) - f_x - f_y$. Then

$$
B(U') = B(U) - f_x - f_y < B(T) - f_x - f_y = B(T'),
$$

contradicting the optimality of $T'$. So $T$ is optimal. $\square$

**Theorem.** Huffman's algorithm produces an optimal prefix code.

*Proof.* Induction on $|C|$. For $|C| = 2$ any full tree assigns both symbols
depth 1 and every prefix code has cost $f_1 + f_2$, so the algorithm's output is
optimal. For $|C| > 2$: the algorithm merges the two least-frequent symbols
$x, y$ into $z$ and then, by the inductive hypothesis, produces an optimal tree
$T'$ for the $(|C|-1)$-symbol instance. Lemma 2 says expanding $z$ back into $x$
and $y$ yields an optimal tree for $C$. $\blacksquare$
:::

Look at what each lemma did. Lemma 1 is the greedy-choice property and it is
established by exchange — construct a swap and show the cost does not increase.
Lemma 2 is optimal substructure and it is established by cut-and-paste, the same
move as Lesson 1's proof. Those are the two obligations from the spine, and
essentially every greedy correctness proof you will write or read has this exact
two-part shape.

### The counterexample habit

When you cannot find the exchange, look for the instance that breaks it, and look
in the place the exchange argument was failing. Greedy knapsack by density fails
because removing a dense item leaves capacity that nothing can fill, so build an
instance where the leftover capacity is large and unusable: one item of size 6 and
value 12 (density 2), two items of size 5 and value 9 (density 1.8), capacity 10.
Greedy takes the dense item and cannot afford anything else, scoring 12; the
optimum takes both of the others for 18. Two lines, and it settles the question
that a thousand random tests would not.
::::

:::exercise{ref=interval-scheduling}
:::

:::exercise{ref=huffman-cost}
:::

:::quiz{id=quiz-l07 passing=2}
- id: q1
  prompt: "What exactly does an exchange argument establish?"
  options:
    - "That the greedy solution is the unique optimum."
    - "That some optimal solution contains the greedy choice, so committing to it loses nothing."
    - "That the problem has overlapping subproblems."
    - "That the greedy algorithm runs in O(n log n) time."
  answerIndex: 1
  explanation: >-
    The argument takes an arbitrary optimal solution and swaps the greedy choice
    in without increasing the cost. That proves the choice is safe, not that it
    is forced — there may be many optima, and greedy finds one of them. You still
    owe a separate optimal-substructure argument for what happens after the
    choice.
- id: q2
  prompt: "Greedy by value per unit weight is optimal for fractional knapsack and not for 0/1. What breaks?"
  options:
    - "0/1 knapsack has no optimal substructure."
    - "The exchange argument needs to refill the capacity freed by removing an item, and with whole items only there may be nothing that fits."
    - "Sorting by density is unstable when two items have the same ratio."
    - "0/1 knapsack is NP-hard, so no polynomial algorithm can be correct."
  answerIndex: 1
  explanation: >-
    In the fractional problem you can always top up spare capacity with a slice of
    the next-densest item, which is precisely what makes the swap non-worsening.
    Whole items leave a gap that may be unfillable, so the swap can lose value and
    the proof fails — before the algorithm does. 0/1 knapsack does have optimal
    substructure; that is why the DP works.
- id: q3
  prompt: "Which of these problems does NOT have an optimal greedy algorithm?"
  options:
    - "Merging batches into one, where any two batches may be merged."
    - "Merging batches into one, where only adjacent batches may be merged."
    - "Selecting the maximum number of pairwise non-overlapping intervals."
    - "Building a minimum spanning tree."
  answerIndex: 1
  explanation: >-
    Unrestricted merging is Huffman's algorithm and is optimal. Adding the
    adjacency constraint removes the freedom the exchange argument needs, and the
    problem becomes a Θ(n³) interval DP — on the lesson's ten batches, greedy
    costs 30,488 against an optimum of 30,408. Interval scheduling has an exchange
    argument, and spanning forests form a matroid, so both of those are greedy.
:::
