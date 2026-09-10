---
id: t3/s08/l02
title: Designing the state
tier: t3-algorithms
stage: s08-dynamic-programming
status: published
estimatedMinutes: 45
objectives:
  - Apply a fixed four-step procedure to derive a DP state instead of guessing at one.
  - Test a candidate state for sufficiency by exhibiting two histories that share it, and say what a failed test tells you to add.
  - Cost a dynamic program before writing it, from the size of the state space times the transitions per state.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"The state is whatever the loop variables are.\"** Backwards. The loop variables are whatever the state turns out to be. Deriving the state from the problem and then writing the loops is the difference between solving a new problem and recognising an old one."
  - "**\"More state is safer.\"** More state is *correct* more often and costs you the running time, which is the size of the state space. A DP with a redundant coordinate can be exponentially slower than the same DP without it, and the redundant coordinate is usually something the future does not actually need."
  - "**\"If the recurrence gives the right answer on my examples, the state is right.\"** An insufficient state is usually right on small inputs — the two histories that would disagree have to both be reachable and both be plausible optima. Sufficiency is a property you check by construction, not by testing."
  - "**\"Optimal substructure is a property of the problem, so either it holds or the problem is not a DP.\"** It is a property of the problem *together with the state you chose*. Longest simple path has no optimal substructure over the state 'current vertex' and perfectly good optimal substructure over the state 'current vertex plus the set of visited vertices'. Changing the state changes the answer to the question."
masteryChecklist:
  - Given a new optimisation problem, I can name the decision sequence and write down a candidate state without writing any code.
  - I can test a candidate state by constructing two partial solutions that share it and asking whether their best completions can differ.
  - I can compute the running time of a proposed DP from the state count and the branching, and reject a design before implementing it.
  - I can say what a DP state has in common with a Markov state and why the analogy is exact.
runtimes:
  - engine: python
---

Nearly every dynamic program you fail to write, you fail at the state. The
recurrence is usually two lines once the state is right, and no number of lines
rescues a state that is wrong. So this lesson has no new algorithm in it. It has
a procedure.

## What a state is for

A dynamic program builds a solution as a sequence of decisions. At any point you
have made some prefix of them, and you face the rest. The state is the answer to
one question:

> **What do I need to remember about the decisions I have already made, in order
> to evaluate every decision I have left?**

Everything else about the history can be thrown away. That is not an
optimisation — it is the definition. Two histories that lead to the same state
must be *interchangeable*: the legal futures are the same, and each future is
worth the same increment from either one.

:::insight{title="A state is a sufficient statistic"}
Write $P$ and $Q$ for two decision prefixes and $\sigma$ for a candidate state
function. $\sigma$ is a valid state when, for all $P, Q$ with
$\sigma(P) = \sigma(Q)$:

1. the set of legal completions of $P$ equals the set of legal completions of
   $Q$; and
2. for every such completion $C$, the value it adds is the same in both —
   $\mathrm{val}(P \cdot C) - \mathrm{val}(P) = \mathrm{val}(Q \cdot C) - \mathrm{val}(Q)$.

Given those, the best value from a prefix splits cleanly:

$$
\mathrm{best}(P) \;=\; \mathrm{val}(P) \;+\; g\big(\sigma(P)\big),
$$

where $g$ depends on the state alone. $g$ is what your memo stores.

If you have seen Markov chains, this is the same condition: the state screens
the future from the past. If you have seen sufficient statistics, it is that.
The word "state" is doing real work here, not decorating a table.
:::

## The procedure

Four steps, in order, before you write any code.

**1. Name the decision sequence.** What do you decide, and in what order? "For
each day, trade or don't." "For each item, take it or leave it." "For each
position in the string, match, insert, or delete." If you cannot write this
sentence, you are not ready for step 2.

**2. Write down everything you have after $k$ decisions.** Be exhaustive and
uncritical. For 0/1 knapsack: which items you took, their total weight, their
total value, how many items you have looked at.

**3. Cross out everything the future does not need.** The future needs to know
which items remain (that is the index) and how much capacity is left (that is
weight used). It does not need to know *which* items you took, or the value so
far — value accumulates additively and never constrains a later choice. What
survives is the candidate state.

**4. Test it.** Take two prefixes with the same candidate state and different
histories. Can their best completions differ? If yes, the state is missing a
coordinate. If no, you have a state, and the recurrence follows almost
mechanically.

## Step 4, run twice

Here is the test doing its job on a candidate that fails, and then on one that
passes.

```python runnable id=state-test-knapsack
# 0/1 knapsack. Candidate state: the item index alone.
weights = [3, 7, 4]
values = [4, 9, 5]
capacity = 8

# Two histories over the first two items, both at index 2:
#   history A: took item 0        -> weight 3, value 4
#   history B: took item 1        -> weight 7, value 9
# Candidate state says these are the same state. Are their futures the same?

remaining_item = (weights[2], values[2])
print("after history A: capacity left", capacity - 3, "-> item 2 fits:", weights[2] <= capacity - 3)
print("after history B: capacity left", capacity - 7, "-> item 2 fits:", weights[2] <= capacity - 7)
```

The legal completions differ, so condition 1 of the sufficiency test fails
outright. The state is not "which item am I looking at". It is "which item am I
looking at, **and how much capacity is left**". Add the coordinate and the test
passes: two histories with the same index and the same remaining capacity accept
exactly the same sets of remaining items, and each adds exactly the same value.

That is the whole derivation of the knapsack recurrence. Lesson 4 writes it out;
you already have it.

:::pitfall{title="The state that passes every small test"}
An insufficient state usually gives the right answer on the examples in the
problem statement. For the failure to show up, two histories reaching the same
state must both be plausible optima, and small inputs rarely have two.

The consequence: you cannot find a missing coordinate by testing. You find it by
running step 4 on paper, deliberately constructing the pair of histories that
would break it. Do that before you write the loop, not after the submission
comes back wrong on case 47.
:::

## What you gain by forgetting

Step 3 is not tidiness. The size of the state space *is* the running time.

:::insight{title="Cost a DP before you write it"}
$$
T \;=\; |\text{states}| \times (\text{transitions per state}),
\qquad
S \;=\; |\text{states}| \text{ (before compression)}
$$

Knapsack: $n \times C$ states, 2 transitions each, so $\Theta(nC)$. Edit
distance: $n \times m$ states, 3 transitions, $\Theta(nm)$. Held-Karp:
$2^n \times n$ states, $n$ transitions, $\Theta(2^n n^2)$.

Do this arithmetic *before* implementing. A design whose state space is
$2^{40}$ is not a design you should discover after ninety minutes of coding.
:::

Now run the same arithmetic on a state you failed to trim. Suppose you keep
"the set of items taken so far" instead of "the total weight". Every condition
of the sufficiency test still passes — that state is more than sufficient. But
there are $2^n$ subsets against $nC$ index-and-capacity pairs, and you have
turned a pseudo-polynomial algorithm into an exponential one for no gain
whatsoever. Redundant state is not free insurance. It is the bill.

:::checkpoint{id=cp-state rubric="the state must make two histories interchangeable,test by constructing two histories that share the state and asking whether their futures differ,running time is states times transitions"}
State the sufficiency test in your own words, and say what it costs you to add
a coordinate you did not need.
:::

## When the state is not a number

Two more shapes, so the procedure does not feel tied to integers.

**A flag.** Some problems need to remember *what kind of thing* just happened,
not how much of it. In a trading problem where selling forces you to sit out the
next day, the future needs to know whether you currently hold a share and
whether you are inside a cooldown. Those are not quantities; they are modes. The
state is $(\text{day}, \text{mode})$ and the mode has three values.

**An interval.** For problems where you choose a split point rather than a next
element, the natural state is a contiguous range $(i, j)$ of the input — "the
best you can do on this segment, considered on its own". That gives $\Theta(n^2)$
states and $\Theta(n)$ transitions each, hence the $\Theta(n^3)$ that shows up in
matrix chain multiplication and every other interval DP. Lesson 5 is about that
family.

## The order the states must be evaluated in

One requirement is easy to miss until it bites: the dependency graph on states
must be acyclic. `f(a)` may depend on `f(b)` only if `b` is reachable in an
ordering where `b` comes first.

If your recurrence has `f(i)` depending on `f(i+1)` *and* `f(i-1)`, you do not
have a dynamic program — you have a system of equations. Sometimes the fix is a
different state (add a direction coordinate). Sometimes the honest answer is
that you need an iterative solver, and Bellman-Ford relaxing until nothing
changes is exactly that: a DP whose state graph has cycles, run to a fixpoint
instead of in topological order.

::::track{depth=interview}
## Recognising a DP, and talking through the state out loud

### The recognition triggers

Four phrasings account for most of it. When a problem asks for:

- **"How many ways…"** — count over a decision tree.
- **"Minimum / maximum … subject to a constraint"** — optimise over a decision
  tree, where the constraint is the state coordinate you are about to need.
- **"Is it possible to…"** — the same thing with a boolean value.
- **"Longest / shortest … that satisfies a property"** — the property lives in
  the state.

Combined with one structural tell: **brute force is a search tree, and the same
situation recurs at different places in it.** If brute force is a search tree
but no two branches ever reach the same situation, memoization gains nothing and
you are looking at backtracking, not DP.

Say the negative case out loud too. "I checked whether subproblems repeat here,
and they don't — every branch leaves a different remaining set, so a memo would
be all misses" is a strong answer to a question that was fishing for exactly
that.

### The script

When you have recognised it, do not start typing. Say these six things in this
order. It takes about ninety seconds and it is the difference between "knows
some DP" and "can design one".

1. **The decision.** "I'll go day by day, and on each day I decide whether to
   buy, sell, or do nothing."
2. **The state.** "The future only cares about which day I'm on and whether I'm
   holding — so state is `(day, holding)`."
3. **Why it is sufficient.** "Two different trading histories that leave me on
   day 5 holding a share are interchangeable from here: the same moves are
   legal and each is worth the same."
4. **The size.** "That's $2n$ states with a constant number of transitions, so
   linear time and linear space, and I can roll it down to constant space."
5. **The recurrence and base cases.** Write them, then read them back in words.
6. **The evaluation order.** "Day increases, and every state depends only on the
   previous day, so a forward pass."

:::interview{title="The two follow-ups"}
**"Can you do it in less space?"** — Almost always yes when the recurrence looks
back a bounded number of rows, and that is Lesson 6. Answer with the rolling
array and then volunteer the cost: you lose the ability to reconstruct the
actual solution.

**"Now return the actual trades, not the profit."** — This is asked more often
than the value version, and it is where most candidates stall, because the
rolling array they described a moment ago has thrown away everything needed to
answer it. Lesson 6 again. If you have compressed the table, say so before you
are caught: "I'd keep the full table for this, or store parent pointers — the
compressed version can't reconstruct."
:::
::::

:::exercise{ref=cooldown-profit}
:::

:::quiz{id=quiz-l02 passing=2}
- id: q1
  prompt: "You propose a state for a DP. What is the test that it is sufficient?"
  options:
    - "The recurrence produces the right answer on the provided examples."
    - "Any two histories mapping to the same state have the same legal futures, and every future is worth the same increment from either."
    - "The state contains every quantity mentioned in the problem statement."
    - "The number of states is polynomial in the input size."
  answerIndex: 1
  explanation: >-
    Interchangeability is the definition; it is what lets the memo be keyed on
    the state at all. Passing the examples is weak evidence, because the two
    histories that would disagree usually only both exist on larger inputs.
    Polynomially many states is about cost, not correctness — a state can be
    small and insufficient, or huge and perfectly sufficient.
- id: q2
  prompt: "For 0/1 knapsack you keep 'the exact set of items chosen so far' as the state instead of 'total weight so far'. What happens?"
  options:
    - "The DP becomes wrong, because the set does not determine the remaining capacity."
    - "The DP stays correct and becomes exponential, because there are 2^n subsets rather than n × C index-capacity pairs."
    - "Nothing changes; the compiler collapses equivalent states."
    - "It becomes correct on cases where the original state was wrong."
  answerIndex: 1
  explanation: >-
    The set is more than sufficient — it determines the weight, so correctness is
    untouched. What you lose is the merging: two different subsets with the same
    weight are now different states and are solved separately. The state space
    goes from n × C to 2^n. Redundant coordinates cost running time, which is
    exactly the size of the state space.
- id: q3
  prompt: "Your recurrence has f(i) depending on both f(i-1) and f(i+1). What does that tell you?"
  options:
    - "Nothing — evaluate f in two passes, forwards and then backwards."
    - "The state dependency graph has a cycle, so there is no evaluation order and it is not yet a dynamic program."
    - "You need memoization rather than tabulation, since recursion handles either direction."
    - "The problem has no optimal substructure."
  answerIndex: 1
  explanation: >-
    Tabulation needs a topological order on states and memoization needs a
    well-founded recursion; a two-way dependency gives neither, and top-down
    recursion on it will not terminate. Sometimes an extra coordinate (a
    direction) breaks the cycle. Sometimes the honest answer is an iterative
    solver run to a fixpoint — which is what Bellman-Ford is.
:::
