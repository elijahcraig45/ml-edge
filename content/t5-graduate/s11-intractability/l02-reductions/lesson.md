---
id: t5/s11/l02
title: Reductions, and the direction that proves nothing
tier: t5-graduate
stage: s11-intractability
status: published
estimatedMinutes: 55
objectives:
  - Write down a Karp reduction as a mapping function plus a certificate transformer, and say which correctness obligations each carries.
  - Choose the direction of a reduction correctly, and explain what the reverse direction would have proved instead.
  - Follow the chain 3SAT to clique to vertex cover to independent set, and reproduce each construction.
  - Prove a new problem NP-hard by picking a source problem and exhibiting the map.
  - State the homomorphism theorem for conjunctive queries and why containment is NP-complete.
prerequisites: []
misconceptions:
  - "**\"To prove my problem B is hard, I show B reduces to a hard problem A.\"** Backwards. $B \\le_p A$ says B is *no harder* than A, which is what you would show to prove B **easy**. To prove B hard you need $A \\le_p B$ — an instance of the known-hard problem, rebuilt as an instance of yours. Every incorrect NP-hardness proof you will ever read has this error in it."
  - "**\"A reduction is an algorithm that solves A using B as a subroutine, called as often as needed.\"** That is a *Turing* (Cook) reduction, and it is a weaker tool. A **Karp** (many-one) reduction is stricter: one call, no post-processing, $x \\in A \\iff f(x) \\in B$. NP-completeness is defined with Karp reductions, and the distinction matters — under Turing reductions NP and co-NP would be indistinguishable."
  - "**\"The reduction has to preserve the solution, so it must map optimal to optimal.\"** Karp reductions preserve the *yes/no answer*, nothing more. The clique-to-vertex-cover reduction maps a maximum clique to a minimum cover, inverting the objective. Reductions that preserve approximation quality are a different and much stricter thing — L-reductions — and most Karp reductions are not among them."
  - "**\"If the map runs in polynomial time then the reduction is correct.\"** Polynomial time is one of three obligations. You also owe both directions of the iff: every yes-instance of A maps to a yes-instance of B, **and** every no-instance maps to a no-instance. The second is the one people skip, and it is the one that fails, usually because the constructed instance has solutions that do not correspond to anything in the original."
  - "**\"Testing the two queries on our database showed the same rows, so one contains the other.\"** Containment quantifies over *all* databases. Agreeing on your data refutes nothing and proves nothing — it is consistent with containment in either direction or neither. A single database can only ever produce a counterexample."
masteryChecklist:
  - Given a new problem, I can name a plausible source problem and say which direction the map has to run.
  - I can write the 3SAT-to-clique construction from memory and say why k equals the number of clauses.
  - I can transform a certificate for A into a certificate for B, and say why that is not required for correctness but is required for understanding.
  - I can explain the canonical-database method for conjunctive query containment.
runtimes:
  - engine: python
  - engine: duckdb
    datasetId: package-registry
---

Every NP-hardness proof in the literature is the same three lines. Only the
middle one is interesting.

A **Karp reduction** from problem $A$ to problem $B$, written $A \le_p B$, is a
function $f$ such that

$$
f \text{ is computable in polynomial time}, \qquad
x \in A \iff f(x) \in B .
$$

That is it. No calling $B$ twice, no adjusting the answer afterwards. One
instance in, one instance out, the answer preserved exactly.

Its meaning is: **$B$ is at least as hard as $A$**, because a fast algorithm for
$B$ would give a fast algorithm for $A$ — run $f$, then run the algorithm for
$B$, then return its answer verbatim.

## The direction, and why getting it backwards proves nothing

You want to show your problem $B$ is hard. You look for a reduction. There are
two of them available and only one is worth anything.

| You prove | It means | Useful for |
| --- | --- | --- |
| $B \le_p A$ (yours into a known-hard one) | $B$ is **no harder** than $A$ | showing $B$ is in NP, or that $B$ is easy if $A$ is |
| $A \le_p B$ (known-hard one into yours) | $B$ is **at least as hard** as $A$ | proving $B$ is NP-hard |

Reducing your problem to SAT is something you can always do for any problem in
NP — that is exactly what Cook-Levin says. So $B \le_p \text{SAT}$ carries no
information about $B$'s hardness whatsoever. It is a true statement about every
NP problem, including the ones solvable in linear time.

:::pitfall{title="The sentence to say out loud before you write anything"}
"I am going to take an arbitrary instance of *the problem I already know is
hard*, and build from it an instance of *my problem*."

If the sentence comes out the other way round, the proof is wrong, and it is
wrong in a way that reads perfectly fluently. This is the single most common
error in student proofs and it survives into published papers.
:::

## 3SAT to clique

Take a 3-CNF formula with $m$ clauses. Build a graph with $3m$ vertices — one
per literal occurrence, so clause $i$ contributes vertices for its three
literals. Put an edge between two vertices when

- they come from **different** clauses, and
- their literals are **not complementary** (not $x$ and $\lnot x$).

Ask for a clique of size $k = m$.

```python runnable id=sat-to-clique-demo
def sat_to_clique(clauses):
    """3-CNF -> (num_vertices, edges, k). Vertex 3*i + a is literal a of clause i."""
    m = len(clauses)
    edges = set()
    for i in range(m):
        for j in range(i + 1, m):
            for a in range(3):
                for b in range(3):
                    if clauses[i][a] != -clauses[j][b]:
                        edges.add((3 * i + a, 3 * j + b))
    return 3 * m, edges, m

formula = [(1, -2, 3), (-1, 2, 3), (1, 2, -3)]
n, edges, k = sat_to_clique(formula)
print(f"{len(formula)} clauses -> {n} vertices, {len(edges)} edges, looking for a {k}-clique")
print("vertex 0 (x1 of clause 0) -- vertex 4 (x2 of clause 1):", (0, 4) in edges,
      "  <- compatible literals in different clauses")
print("vertex 1 (-x2 of clause 0) -- vertex 4 (x2 of clause 1):", (1, 4) in edges,
      "  <- complementary, so never joined")
print("vertex 0 -- vertex 1 (same clause):", (0, 1) in edges,
      "  <- a clique can hold at most one literal per clause")
```

**Why it works.** A clique of size $m$ must contain exactly one vertex from each
clause, because vertices inside a clause are never adjacent. Picking one vertex
per clause is picking one literal per clause to make true. The non-complementary
condition is precisely the statement that those choices can all be true at once —
you never chose both $x$ and $\lnot x$. So a clique of size $m$ *is* a satisfying
assignment, read off the vertices, and conversely.

Both directions of the iff are one sentence each here, and that is what a good
construction feels like.

:::checkpoint{id=cp-direction rubric="one vertex per clause,non-adjacent inside a clause,complementary literals not joined"}
Why does the construction forbid edges *within* a clause? Say what would go
wrong with the proof if those edges were added.
:::

## Clique to vertex cover to independent set

These three are the same problem, and the reductions are complementation.

$S$ is a clique in $G$ $\iff$ $S$ is an independent set in $\overline{G}$
$\iff$ $V \setminus S$ is a vertex cover of $\overline{G}$.

The second equivalence is worth doing on paper: $V \setminus S$ covers every edge
of $\overline{G}$ exactly when no edge of $\overline{G}$ has both ends inside
$S$, which is exactly when $S$ is independent in $\overline{G}$.

So:

- $\text{CLIQUE}(G, k) \le_p \text{INDEPENDENT-SET}(\overline{G}, k)$
- $\text{INDEPENDENT-SET}(G, k) \le_p \text{VERTEX-COVER}(G, n - k)$

Note that the second one does not even change the graph. It changes the
*question*, and $k \mapsto n - k$ is where the whole reduction lives.

```python runnable id=complement-demo
from itertools import combinations

def complement(n, edges):
    present = {(min(u, v), max(u, v)) for u, v in edges}
    return {(u, v) for u, v in combinations(range(n), 2) if (u, v) not in present}

# A 5-cycle. Its largest clique has 2 vertices — any single edge.
n, edges = 5, [(0, 1), (1, 2), (2, 3), (3, 4), (4, 0)]
comp = complement(n, edges)
print("complement edges:", sorted(comp))

clique = {0, 1}                       # a 2-clique of the 5-cycle
print("is a clique of G:", all((min(u, v), max(u, v)) in {(min(a,b), max(a,b))
                                                          for a, b in edges}
                               for u, v in combinations(clique, 2)))

cover = set(range(n)) - clique        # the complement of a clique covers the complement graph
print("covers every complement edge:", all(u in cover or v in cover for u, v in comp))
print("sizes:", len(clique), "->", len(cover), "= n - k =", n - len(clique))
```

:::insight{title="The certificate transformer"}
A Karp reduction only has to preserve the answer bit. But every correct
reduction you will meet also comes with a way to carry a *certificate* across —
satisfying assignment to clique, clique to cover, subset to knapsack choice.

That map is not required for the theorem. It is required for you: writing it
forces you to say exactly which object in $B$ corresponds to which object in
$A$, and it is where a broken reduction breaks. The exercises below grade both,
which turns "the reduction is correct" from a claim into a test that runs.
:::

## Subset sum to knapsack

The decision version of knapsack: given weights $w_i$, values $v_i$, capacity
$C$ and a value goal $V$, is there a subset with $\sum w_i \le C$ and
$\sum v_i \ge V$?

Given a subset-sum instance $(a_1, \dots, a_n, t)$, set

$$
w_i = v_i = a_i, \qquad C = t, \qquad V = t .
$$

A subset with weight $\le t$ *and* value $\ge t$ has $\sum a_i \le t$ and
$\sum a_i \ge t$, so $\sum a_i = t$ exactly. The two inequalities squeeze the
equality out. Conversely a subset summing to $t$ satisfies both.

The trap: setting $C = \sum_i a_i$ "to be safe" destroys the reduction, because
then any subset summing to more than $t$ satisfies both constraints and every
instance becomes a yes. That is a no-instance mapping to a yes-instance — the
half of the iff nobody checks.

## The SQL half: conjunctive query containment

A **conjunctive query** is a `SELECT-FROM-WHERE` with only equijoins and
conjunctions — no negation, no union, no aggregation. Written in rule form:

$$
Q(x, z) \;\text{:-}\; \mathrm{edge}(x, y),\ \mathrm{edge}(y, z)
$$

$Q_1 \subseteq Q_2$ means: **on every database**, every row $Q_1$ returns,
$Q_2$ returns too. That is the property a rewrite rule needs before an optimiser
is allowed to apply it, and it is what view-based query rewriting is built on.

:::warning{title="Your data cannot settle this"}
Run two queries on the registry's co-maintainer graph — one asking for
endpoints of a 2-path, one asking for endpoints of a 2-path that continues one
more hop.

```sql runnable id=containment-cannot-be-tested dataset=package-registry
WITH edge AS (
  SELECT DISTINCT a.package_id AS x, b.package_id AS y
  FROM package_maintainers a
  JOIN package_maintainers b
    ON a.maintainer_id = b.maintainer_id AND a.package_id <> b.package_id
),
q2 AS (   -- Q2(x,z) :- edge(x,y), edge(y,z)
  SELECT DISTINCT e1.x AS x, e2.y AS z
  FROM edge e1 JOIN edge e2 ON e2.x = e1.y
),
q1 AS (   -- Q1(x,z) :- edge(x,y), edge(y,z), edge(z,w)
  SELECT DISTINCT e1.x AS x, e2.y AS z
  FROM edge e1 JOIN edge e2 ON e2.x = e1.y JOIN edge e3 ON e3.x = e2.y
)
SELECT
  (SELECT count(*) FROM q1)                                        AS q1_rows,
  (SELECT count(*) FROM q2)                                        AS q2_rows,
  (SELECT count(*) FROM (SELECT * FROM q1 EXCEPT SELECT * FROM q2)) AS in_q1_only,
  (SELECT count(*) FROM (SELECT * FROM q2 EXCEPT SELECT * FROM q1)) AS in_q2_only;
```

Identical: 98 rows each, no difference in either direction. And yet
$Q_1 \subseteq Q_2$ is **true** while $Q_2 \subseteq Q_1$ is **false**. The
registry graph has no vertex of out-degree zero, so every 2-path happens to
extend; a database with one dead-end vertex separates them immediately. Equality
on your data is not evidence.
:::

**The homomorphism theorem** (Chandra and Merlin, 1977). For conjunctive queries
$Q_1$ and $Q_2$,

$$
Q_1 \subseteq Q_2 \iff \text{there is a homomorphism } h : Q_2 \to Q_1 .
$$

A homomorphism maps the variables of $Q_2$ to terms of $Q_1$ such that every
atom of $Q_2$'s body lands on an atom of $Q_1$'s body, constants map to
themselves, and $Q_2$'s head lands on $Q_1$'s head.

Note the direction — the map runs from the **containing** query to the
**contained** one. It reads backwards the first three times.

For the example above: $h$ maps $Q_2$'s $x, y, z$ to $Q_1$'s $x, y, z$, and
every atom of $Q_2$ is already an atom of $Q_1$. So $Q_1 \subseteq Q_2$. In the
other direction there is nowhere for $Q_1$'s $w$ to go: $Q_2$'s body has no atom
$\mathrm{edge}(z, \cdot)$ with $z$ already bound as the head's second column.

Searching for a homomorphism means assigning each of $Q_2$'s variables to one of
$Q_1$'s terms subject to constraints. That is a constraint satisfaction problem,
and it is NP-complete.

:::exercise{ref=sat-to-clique}
:::

:::exercise{ref=clique-to-vertex-cover}
:::

:::exercise{ref=query-containment}
:::

::::track{depth=proof}
## Conjunctive query containment is NP-complete

**Membership in NP.** The certificate is the homomorphism $h$ itself: a table
mapping each variable of $Q_2$ to a term of $Q_1$, so at most $|Q_2|$ entries.
Verifying it means checking every atom of $Q_2$ maps into $Q_1$'s body, which is
$O(|Q_1| \cdot |Q_2|)$. Short certificate, polynomial verifier.

**Hardness.** Reduce from CLIQUE. Given a graph $G = (V, E)$ and a number $k$,
build two conjunctive queries over one binary relation $e$.

Let $Q_2$ be the $k$-clique **pattern**:

$$
Q_2(\,) \;\text{:-}\; \{\, e(u_i, u_j) \;:\; 1 \le i \ne j \le k \,\}
$$

with $k$ variables $u_1, \dots, u_k$ and an atom for every ordered pair of
distinct indices. Let $Q_1$ be the **frozen graph**:

$$
Q_1(\,) \;\text{:-}\; \{\, e(a_u, a_v) \;:\; (u, v) \in E \,\}
$$

with one variable $a_u$ per vertex of $G$, and one atom per edge in each
direction. Both queries have empty heads, so the head condition is vacuous and
$h$ only has to place the body.

Building both takes $O(k^2 + |E|)$ time — polynomial, and independent of any
knowledge of whether $G$ has a clique.

*Yes-instance to yes-instance.* Suppose $G$ has a clique
$\{v_1, \dots, v_k\}$. Define $h(u_i) = a_{v_i}$. Every atom $e(u_i, u_j)$ of
$Q_2$ maps to $e(a_{v_i}, a_{v_j})$, which is an atom of $Q_1$ because
$(v_i, v_j) \in E$ — that is what being a clique means. So $h$ is a
homomorphism, and $Q_1 \subseteq Q_2$.

*No-instance to no-instance.* Suppose $Q_1 \subseteq Q_2$, so some homomorphism
$h$ exists. The $u_i$ are pairwise constrained by the atoms $e(u_i, u_j)$, and
$Q_1$ has no atom $e(a_v, a_v)$ — $G$ is simple, no self-loops — so
$h(u_i) \ne h(u_j)$ for $i \ne j$. Hence $h$ picks $k$ **distinct** vertices, and
for every pair the atom $e(h(u_i), h(u_j))$ is in $Q_1$, meaning every pair is an
edge of $G$. That is a $k$-clique.

Both directions hold, the map is polynomial, and CLIQUE is NP-hard. Therefore
containment is NP-hard, and with membership above, NP-complete. $\blacksquare$

:::proof{title="What the proof actually tells a query optimiser"}
The reduction shows the hardness is driven by $k$ — the size of the *containing*
query — not by the data. Queries in production have a handful of atoms, and
$O(|Q_1|^{|Q_2|})$ with $|Q_2| = 4$ is nothing. This is the standard shape of
database complexity results: **combined complexity** (query and data both
inputs) is intractable, while **data complexity** (query fixed) is in
LOGSPACE. Vardi drew that distinction in 1982 and it is why anyone ships a query
optimiser at all.

The same proof also yields the sharper statement: containment restricted to
**acyclic** conjunctive queries is in polynomial time, because Yannakakis's
algorithm solves the homomorphism problem on acyclic patterns in polynomial
time. The $k$-clique pattern is as cyclic as a query gets, and that is not a
coincidence — cyclicity is the thing being reduced to.
:::

**Proving a new problem NP-hard, as a procedure.**

1. Confirm your problem is in NP first, by naming the certificate. If it is not,
   you are proving NP-hardness only, and you should say so.
2. Pick a source problem whose *structure* resembles yours. Choosing badly
   makes the construction fight you. Selection, sharpened by practice: partition
   or subset-sum for anything with numbers that must balance; 3SAT for anything
   with independent binary choices under local constraints; clique or
   independent set for anything about mutual compatibility; 3-colouring for
   conflicts; Hamiltonian path for anything about visiting everything once;
   set cover for anything about picking few things to satisfy many demands.
3. Write the map. Say what every part of the source instance becomes.
4. Prove **both** directions of the iff. Write them as separate paragraphs so
   you cannot skip one.
5. Check the map is polynomial *and* that it does not need to know the answer.
   A "reduction" that solves $A$ and then emits a trivial yes-instance or
   no-instance of $B$ preserves the answer perfectly and proves nothing.
::::

:::quiz{id=quiz-l02 passing=3}
- id: q1
  prompt: "You want to prove that CREW-SCHEDULING is NP-hard. Which reduction do you build?"
  options:
    - "A polynomial map from CREW-SCHEDULING instances to 3SAT instances."
    - "A polynomial map from 3SAT instances to CREW-SCHEDULING instances."
    - "An algorithm that solves 3SAT by calling a CREW-SCHEDULING solver many times."
    - "A proof that CREW-SCHEDULING has a polynomial-time verifier."
  answerIndex: 1
  explanation: >-
    Hardness flows into your problem: take an arbitrary 3SAT instance and build a
    scheduling instance with the same answer. Option 1 is the backwards version
    and holds for every problem in NP, so it says nothing. Option 3 is a Turing
    reduction — it does establish hardness but is not the Karp reduction
    NP-completeness is defined with. Option 4 proves membership in NP, which is
    the other half of NP-completeness, not hardness.
- id: q2
  prompt: "In the 3SAT-to-clique reduction, why is k set to the number of clauses?"
  options:
    - "Because the graph has 3m vertices and m is a third of them."
    - "Because a clique cannot contain two vertices from the same clause, so a clique of size m is exactly one true literal chosen from each clause."
    - "Because m is the smallest k for which the problem stays NP-hard."
    - "Because larger cliques would include complementary literals."
    - "Because the number of variables is unknown at construction time."
  answerIndex: 1
  explanation: >-
    Vertices within a clause are pairwise non-adjacent, so any clique has at most
    one vertex per clause, and a clique of size m has exactly one from each. The
    remaining condition — no complementary pair — makes that selection a
    consistent assignment. Option 4 is a true observation about the edges but not
    the reason for the value of k.
- id: q3
  prompt: "A reduction maps subset-sum to knapsack by setting weights and values to the numbers, capacity to the target, and the value goal to sum(numbers). What breaks?"
  options:
    - "Nothing — it still runs in polynomial time."
    - "Yes-instances can become no-instances: a subset summing exactly to the target reaches value t, not sum(numbers), so it fails the value goal."
    - "No-instances become yes-instances, because the capacity is too large."
    - "The reduction is a Turing reduction rather than a Karp reduction."
  answerIndex: 1
  explanation: >-
    With V = sum(numbers) the only subset meeting the value goal is the whole
    set, which almost never fits under capacity t. Genuine yes-instances of
    subset-sum map to no-instances of knapsack, so the forward direction of the
    iff fails. Polynomial time is necessary and nowhere near sufficient.
- id: q4
  prompt: "Two conjunctive queries return exactly the same rows on your production database. What have you proved about containment?"
  options:
    - "Each contains the other, since containment is defined by the rows returned."
    - "Nothing. Containment quantifies over all databases; one database can produce a counterexample but never a proof."
    - "Neither contains the other, since containment requires strict inequality."
    - "They are equivalent up to renaming of variables."
  answerIndex: 1
  explanation: >-
    Agreement on one instance is consistent with containment in one direction,
    both, or neither. The lesson's example is exactly this: 98 rows each on the
    registry graph, yet containment holds in one direction only. Deciding it
    needs the homomorphism test, which is why the problem is NP-complete rather
    than a matter of running the queries.
- id: q5
  prompt: "The homomorphism theorem says Q1 ⊆ Q2 iff there is a homomorphism from Q2 to Q1. Which way does the map run and why is that surprising?"
  options:
    - "From Q1 to Q2, matching the direction of the containment."
    - "From Q2 to Q1 — the containing query's pattern must be found inside the contained query's body, which is the opposite of the containment arrow."
    - "In both directions; the theorem requires an isomorphism."
    - "From Q2 to Q1 only when Q2 has more atoms than Q1."
  answerIndex: 1
  explanation: >-
    The contained query is the more specific one, so its body carries more
    constraints; the containing query's pattern has to be embeddable in it.
    Adding atoms to a query can only shrink its answer set, so a query with a
    superset of another's atoms is contained in it — and the homomorphism goes
    from the smaller pattern into the bigger body. The number of atoms is
    suggestive but not decisive, since variables can be identified.
:::
