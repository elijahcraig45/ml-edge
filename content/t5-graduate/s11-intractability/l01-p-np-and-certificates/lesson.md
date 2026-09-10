---
id: t5/s11/l01
title: P, NP, and the certificate you can check
tier: t5-graduate
stage: s11-intractability
status: published
estimatedMinutes: 50
objectives:
  - Define P and NP in terms of verifiers and certificates, and say what a certificate is for a given problem.
  - Distinguish NP-complete from NP-hard, and explain why one is a membership claim and the other is not.
  - State the Cook-Levin theorem and say what it buys you when you are trying to prove something hard.
  - Explain why join ordering is NP-hard and what a real planner does about it.
prerequisites: []
misconceptions:
  - "**\"NP stands for 'not polynomial'.\"** It stands for *nondeterministic polynomial time*. Every problem in P is also in NP — P is a subset of NP, not its complement. Sorting is in NP. So is addition. The class is defined by how cheaply a *solution* can be checked, and a problem you can solve in polynomial time you can certainly check in polynomial time."
  - "**\"NP-complete means no polynomial algorithm exists.\"** It means none is known and that finding one would give a polynomial algorithm for every problem in NP at once. That is a statement about the *state of the world*, not a proved impossibility. $P \\ne NP$ is a conjecture. It is a very well-supported conjecture, and it is still a conjecture."
  - "**\"NP-hard and NP-complete are synonyms.\"** NP-complete is NP-hard *and in NP*. The halting problem is NP-hard and is not in NP — it is not decidable at all, so no certificate of bounded size can exist for it. Calling an undecidable problem NP-complete is a category error you will hear in interviews."
  - "**\"The certificate is the answer.\"** For a decision problem the answer is one bit. The certificate is the *evidence* — a satisfying assignment, a tour, a subset — and its defining property is that checking it is cheap even though finding it may not be. A problem is in NP when yes-instances have short, cheaply-checkable evidence. Nothing is required of no-instances, which is exactly why NP is not obviously closed under complement."
  - "**\"Exponential-time algorithms are useless in practice.\"** SAT solvers routinely dispatch industrial instances with millions of variables. Worst-case hardness says nothing about the instances you actually have. The correct conclusion from an NP-completeness proof is 'stop looking for a worst-case-polynomial algorithm', not 'give up'."
masteryChecklist:
  - I can write down the certificate and the verifier for a decision problem I have just been handed.
  - I can say, without hedging, what NP-complete claims and what it does not claim.
  - I can explain why Cook-Levin is what makes the reduction technique usable at all.
  - I can explain to a colleague why the query planner stops enumerating plans at around a dozen relations.
runtimes:
  - engine: python
  - engine: duckdb
    datasetId: package-registry
---

Here is the definition that does all the work, and it is about checking, not
solving.

A decision problem is **in NP** when every yes-instance has a *certificate* — a
string, polynomially bounded in the size of the instance — that a polynomial-time
**verifier** accepts, and no no-instance has any certificate the verifier
accepts. That is the whole definition. It says nothing about how hard the
problem is to solve.

Start by writing a verifier, because until you have written one the definition
stays abstract.

```python runnable id=verify-cover
edges = [(0, 1), (1, 2), (2, 3), (3, 0), (0, 2)]

def verifies_cover(n, edges, k, certificate):
    """Is `certificate` a vertex cover of size at most k?"""
    chosen = set(certificate)
    if len(chosen) > k or any(v not in range(n) for v in chosen):
        return False
    return all(u in chosen or v in chosen for u, v in edges)

print(verifies_cover(4, edges, 2, [0, 2]))   # True  — a genuine certificate
print(verifies_cover(4, edges, 2, [0, 1]))   # False — misses edge (2, 3)
print(verifies_cover(4, edges, 1, [0, 2]))   # False — too big for k = 1
```

Three lines of real work. Finding a cover of size $k$ in a graph with $n$
vertices, by contrast, has no known algorithm faster than roughly $2^k$ times a
polynomial — and for $k$ near $n/2$ that is exponential in the input.

That gap — cheap to check, expensive to find — is the only thing NP is about.

## The four names, stated precisely

Fix an alphabet and think of a decision problem as a language $L$: the set of
instances whose answer is yes.

- $L \in \mathrm{P}$ when some deterministic algorithm decides "$x \in L$?" in
  time polynomial in $|x|$.
- $L \in \mathrm{NP}$ when there is a polynomial-time verifier $V$ and a
  polynomial $p$ such that
  $$x \in L \iff \exists\, c,\ |c| \le p(|x|),\ V(x, c) = \text{accept}.$$
- $L$ is **NP-hard** when every $L' \in \mathrm{NP}$ reduces to $L$ in
  polynomial time. NP-hardness says "at least as hard as everything in NP". It
  does not say $L$ is in NP.
- $L$ is **NP-complete** when it is NP-hard **and** $L \in \mathrm{NP}$.

$\mathrm{P} \subseteq \mathrm{NP}$, immediately: if you can decide $x \in L$ in
polynomial time, take the empty string as the certificate and let the verifier
ignore it and just decide. Nothing subtle happens there. The open question is
whether the containment is strict.

:::warning{title="The name is a historical accident"}
NP is short for *nondeterministic polynomial time*: the class a nondeterministic
Turing machine decides in polynomial time. Guessing a certificate and checking it
is the same thing as a nondeterministic machine branching on the guess, which is
why the two definitions coincide. "Not polynomial" is not what the letters mean,
and a problem in P is also in NP.
:::

## What the certificate is, per problem

| Problem | Instance | Certificate | Verifier does |
| --- | --- | --- | --- |
| SAT | a CNF formula | an assignment | evaluate the formula |
| Vertex cover | graph, $k$ | a set of $\le k$ vertices | check every edge is touched |
| Subset sum | numbers, target | a subset | add it up |
| Hamiltonian cycle | graph | a vertex ordering | check each consecutive pair is an edge |
| Composite number | an integer $N$ | a nontrivial factor | one division |
| Join ordering | query, cost model, budget $B$ | a join tree | cost the tree, compare to $B$ |

The last row is the one you will meet at work, and it is the subject of the
second half of this lesson.

Notice what is *not* on the list. "Is this formula unsatisfiable?" has no obvious
certificate: to convince you, I would have to rule out every assignment. That
problem is in **co-NP**, and whether $\mathrm{NP} = \text{co-}\mathrm{NP}$ is
open too. The asymmetry between yes and no in the definition is real, not an
artefact of how it is written.

:::checkpoint{id=cp-certificate rubric="short evidence,checked in polynomial time,no false certificate for a no-instance"}
A colleague proposes a new problem: "given a set of microservices and their
call graph, is there a deployment order that avoids all circular waits?" What
would you have to exhibit to put this problem in NP, and what two properties
must it have?
:::

## NP-complete: the load-bearing idea

There are thousands of NP-complete problems and they are all, in a precise
sense, the same problem wearing different clothes. A polynomial algorithm for
any one of them yields a polynomial algorithm for all of them.

That is a strong claim and it needs a starting point. You cannot prove a problem
NP-hard by reducing *some* problem to it — you need every problem in NP to
reduce to it, and NP is an infinite class of languages. The starting point is:

:::insight{title="Cook-Levin"}
**SAT is NP-complete.**

Take any language $L \in \mathrm{NP}$ decided by a nondeterministic machine in
time $p(|x|)$. The proof builds, in time polynomial in $|x|$, a Boolean formula
$\varphi_x$ whose variables describe the machine's entire computation
tableau — one variable per (time step, tape cell, symbol) and per (time step,
state) — with clauses asserting that the tableau starts correctly, that each row
follows from the previous one by a legal transition, and that some row is
accepting. Then $\varphi_x$ is satisfiable exactly when the machine has an
accepting computation on $x$.

Independently proved by Stephen Cook (1971) and Leonid Levin (1973).
:::

Cook-Levin is what makes the whole enterprise usable. Because it exists, you
never again have to argue about Turing machines. To show a new problem $B$ is
NP-hard, you reduce **one** already-known NP-hard problem $A$ to $B$, and
transitivity of polynomial reductions does the rest. Lesson 2 is entirely about
getting that step right.

## Join ordering is NP-hard

Now the version of this that is in your database.

A query joining $n$ relations can be evaluated in many orders. Join is
associative and commutative, so the orders are the binary trees over the $n$
relations. The planner's job is to pick the cheapest one under a cost model
built from cardinality estimates.

The search space is not subtle.

```sql runnable id=plan-space dataset=package-registry
SELECT
  n,
  CAST(round(exp(lgamma(n + 1))) AS BIGINT)                                AS left_deep_orders,
  CAST(round(exp(lgamma(2 * n - 1)) / exp(lgamma(n))) AS BIGINT)           AS bushy_trees,
  CAST(pow(3, n) AS BIGINT)                                                AS dp_subproblem_pairs
FROM range(2, 16) t(n)
ORDER BY n;
```

`left_deep_orders` is $n!$. `bushy_trees` is $\frac{(2n-2)!}{(n-1)!}$, the number
of binary trees over $n$ labelled leaves. `dp_subproblem_pairs` is $3^n$, which
is the number of (subset, split) pairs the dynamic program considers — because
$\sum_{S \subseteq [n]} 2^{|S|} = 3^n$.

Look at the row for $n = 12$: 531,441 subproblem pairs for the DP, against
479,001,600 left-deep orderings and about $2.8 \times 10^{13}$ bushy trees. The
DP is roughly a thousand times cheaper than enumerating left-deep plans and
about $10^8$ times cheaper than enumerating bushy ones, *and it returns the
optimum of the larger space*. That is why it is worth writing. It is also why it
runs out of room only three or four relations later: $3^n$ is still exponential,
and at $n = 16$ it is 43 million.

:::note{title="What the hardness result actually says"}
Ibaraki and Kameda (1984) showed that optimal join ordering is NP-hard for
tree-shaped queries under a nontrivial cost model, and Cluet and Moerkotte
(1995) strengthened it: even for a **star** query with a cost function as simple
as the cost of a Cartesian product, finding the optimal *left-deep* order is
NP-hard. Restricting the shape of the plan does not rescue you.

The decision version — "is there a join tree of cost at most $B$?" — is in NP:
the tree is the certificate, and costing it is one pass. So join ordering's
decision version is NP-complete, and the optimisation version is NP-hard.
:::

The DP that planners actually run only ever visits *connected* subsets of the
join graph, because a plan that joins two relations with no join predicate
between them is a Cartesian product and is (usually) discarded. That is a real
saving on sparse join graphs, and it is what the exercise below measures.

:::pitfall{title="The estimates are the bigger problem"}
Even a planner that searched the space perfectly would still be optimising the
wrong function, because join cardinality estimates compound multiplicatively and
are routinely off by orders of magnitude several joins in. A famous 2015 study
by Leis et al. found estimation error, not search, to be the dominant source of
bad plans. So the correct reading of "join ordering is NP-hard" is not "plans
are bad because search is hard" — it is "search is hard *and* the objective is
noisy, so spending exponential effort on exact search would be spending it in
the wrong place."
:::

:::exercise{ref=planner-search-space}
:::

:::exercise{ref=certificate-verifiers}
:::

::::track{depth=systems}
## Where the planner gives up

Every mature optimiser has a cliff, and it is written down in the source.

**PostgreSQL.** `geqo_threshold` defaults to 12. Below it, the planner runs
`standard_join_search`, the Selinger-style bottom-up DP over connected subsets.
At 12 or more relations in one `FROM` list, it switches to GEQO — a genetic
algorithm that encodes a left-deep order as a permutation, breeds a population
of them, and returns the best it found. GEQO's answer is not optimal and is not
even deterministic across runs unless `geqo_seed` is fixed.

**MySQL / MariaDB.** `optimizer_search_depth` bounds a greedy depth-first search;
`optimizer_prune_level` turns on heuristic pruning that can discard the optimal
plan. The default depth is 62, meaning "exhaustive", but the pruning is on.

**DuckDB.** Runs a DP over connected subgraphs and falls back to a greedy
enumerator past a threshold; the join order optimiser has an explicit
`disable_optimizer` escape hatch for exactly the cases where it goes wrong.

**Spark.** Cost-based join reordering (`spark.sql.cbo.joinReorder.enabled`) is
capped by `joinReorder.dp.threshold`, default 12, and is off by default
entirely without column statistics.

Three engines, three search strategies, the same number: twelve. Nobody
coordinated that. $3^{12} \approx 5.3 \times 10^5$ subproblem pairs is roughly
where the DP's own runtime starts to be a visible fraction of the query's, and
that is a property of the arithmetic, not of any one codebase.

The practical consequence for you: **a query with more than a dozen joined
relations is being planned by a heuristic.** If such a query is slow, the fix is
usually not an index. It is to break the query into CTEs or temp tables so the
planner faces several small problems instead of one it will not solve, or to
pin the order explicitly where the engine allows it (`STRAIGHT_JOIN`,
`join_collapse_limit = 1`, optimiser hints).
::::

::::track{depth=interview}
## Saying "this is NP-hard" without sounding like you are quitting

The failure mode is announcing hardness and stopping. The interviewer hears
"I do not want to solve this." What they are listening for is the sentence after
the diagnosis.

The shape that works is three beats, in this order.

1. **Name the reduction.** "Scheduling these jobs with the precedence
   constraints is bin packing with conflicts — that's NP-hard, so I'm not going
   to find an exact polynomial algorithm."
2. **Name what you would give up.** There are exactly four things you can trade
   away, and saying which one makes the answer concrete: optimality (approximate
   it), worst-case running time (exact, exponential, but fast on real inputs —
   branch and bound, an ILP solver, a SAT solver), generality (the instances we
   actually get are trees / have bounded treewidth / have $k \le 5$), or
   determinism (randomise).
3. **Name the check.** "I'd compute a lower bound from the LP relaxation so we
   can see how far off the heuristic is on production data." An engineer who
   ships a heuristic without a way to measure its gap has shipped an unfalsifiable
   claim.

:::interview{title="The trap question"}
"Could you write an exponential algorithm instead?" — Often yes, and often it is
the right answer. $n = 20$ items means $2^{20} \approx 10^6$ subsets, which is a
millisecond. The interviewer is checking whether you can distinguish asymptotic
hardness from a hard *instance*. The strong answer states the input size at
which the exact method stops being viable and what you would switch to at that
point.

The reverse trap: being asked to "optimise" something NP-hard and quietly
producing a greedy heuristic without saying it is one. Say the word
"approximation" out loud, and if you know the ratio, give it.
:::
::::

:::quiz{id=quiz-l01 passing=3}
- id: q1
  prompt: "Which statement about a problem in P is correct?"
  options:
    - "It cannot be in NP, since NP means the problem is not polynomial."
    - "It is also in NP, because a polynomial-time decider is a verifier that ignores its certificate."
    - "It is in NP only if someone has exhibited a certificate for it."
    - "It is NP-complete, since it reduces to SAT in polynomial time."
  answerIndex: 1
  explanation: >-
    P is a subset of NP. Take the empty certificate and let the verifier run the
    polynomial decider. The fourth option is the common confusion: everything in
    NP reduces to SAT, so reducing to SAT proves membership in NP, not
    NP-hardness. NP-hardness needs reductions running the other way — into your
    problem, not out of it.
- id: q2
  prompt: "You show the halting problem is NP-hard. What follows?"
  options:
    - "The halting problem is NP-complete."
    - "P = NP."
    - "Nothing about NP-completeness — NP-completeness also requires membership in NP, and the halting problem is not even decidable."
    - "The reduction must be wrong, since NP-hard problems are all decidable."
  answerIndex: 2
  explanation: >-
    NP-complete = NP-hard AND in NP. NP-hardness is a lower bound on difficulty
    and puts no ceiling on it, so undecidable problems can be and are NP-hard.
    The last option inverts the definition.
- id: q3
  prompt: "Why is the Cook-Levin theorem needed before any other NP-hardness proof is useful?"
  options:
    - "It shows SAT solvers are fast in practice, which justifies reducing to SAT."
    - "It supplies the first problem known to be NP-hard, so later proofs can reduce from a concrete problem instead of from every language in NP."
    - "It proves P ≠ NP for the special case of Boolean formulas."
    - "It shows every NP problem has a certificate, which is what makes verification possible."
  answerIndex: 1
  explanation: >-
    Without a seed, "every language in NP reduces to my problem" would have to be
    re-argued from Turing machines every time. Cook-Levin does that argument once
    for SAT; everything after is transitivity. It proves nothing about P versus
    NP, and certificates come from the definition of NP, not from this theorem.
- id: q4
  prompt: "PostgreSQL switches from dynamic programming to a genetic algorithm at 12 relations. What is the best reading of that number?"
  options:
    - "Twelve is the largest number of relations for which an optimal plan exists."
    - "Beyond twelve, the DP's own cost — on the order of 3^n subproblem pairs — becomes a significant fraction of query runtime, so the planner trades optimality for planning time."
    - "Queries with more than twelve relations are always Cartesian products."
    - "Twelve is a PostgreSQL-specific limit with no counterpart in other engines."
  answerIndex: 1
  explanation: >-
    An optimal plan always exists; the question is whether you can afford to find
    it. 3^12 is about 531,000 subproblem pairs, and the constant per pair is not
    small. Spark's joinReorder.dp.threshold and DuckDB's greedy fallback land in
    the same place independently, which is the giveaway that the number comes
    from the arithmetic rather than from one codebase.
- id: q5
  prompt: "A certificate for a yes-instance of subset sum is the subset itself. What plays the same role for a no-instance?"
  options:
    - "The empty subset, since it sums to zero."
    - "The full list of subsets that fail, which is exponentially long."
    - "Nothing is required — NP constrains only yes-instances, which is why the complement problem sits in co-NP and may be strictly harder."
    - "The target value, since it certifies the instance is well-formed."
  answerIndex: 2
  explanation: >-
    The definition of NP is one-sided on purpose: yes-instances must have short
    accepted certificates and no-instances must have none. Nothing says a
    no-instance carries short evidence of its no-ness. That asymmetry is exactly
    what separates NP from co-NP, and whether they are equal is open.
:::
