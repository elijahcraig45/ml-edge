---
id: t3/s08/l06
title: Rolling arrays, and getting the answer back
tier: t3-algorithms
stage: s08-dynamic-programming
status: published
estimatedMinutes: 45
objectives:
  - Compress a DP table to a rolling window and state exactly what the compression destroys.
  - Reconstruct an optimal solution by walking the table backwards, and by following stored parent pointers, and choose between them.
  - Name the tie-breaking rule your reconstruction uses, and explain why two correct implementations can return different answers.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"The DP is finished when the table holds the optimal value.\"** The value is the cheap half. Almost every real use — a diff, a route, an alignment, a set of chosen items — needs the solution itself, and the code that recovers it is where the off-by-ones live."
  - "**\"Reconstruction needs parent pointers.\"** It needs *either* parent pointers or the full table. If you kept the table you can re-derive each choice by comparing neighbours, at no extra memory. Parent pointers matter when re-deriving is expensive or ambiguous, not by default."
  - "**\"Two implementations that disagree on the answer cannot both be right.\"** Optimal solutions are frequently not unique. Which one you get is decided by your tie-break — whether you move up or left when the two neighbours are equal. A test that pins one specific string is testing your tie-break as much as your DP, which is why the rule belongs in the specification."
  - "**\"Linear space and reconstruction are mutually exclusive.\"** Hirschberg's algorithm gets both, at twice the running time, by finding the midpoint of the alignment with two linear-space passes and recursing on each half. The trade is time for space, not correctness for space."
masteryChecklist:
  - Given a DP over two rows, I can compress it to one array and say which cell I had to save before overwriting.
  - I can walk an edit-distance or LCS table backwards and produce the actual alignment.
  - I can state the tie-breaking rule my backtrack uses and predict which of two equally optimal answers it returns.
  - I can say what Hirschberg's algorithm buys, what it costs, and why the constant factor is 2.
runtimes:
  - engine: python
---

Every dynamic program in this stage so far has returned a number. Almost nothing
outside a textbook wants the number. A diff wants the edit script. A router
wants the route. A build system wants the order. An interviewer, having watched
you compute the length of the longest common subsequence, will ask you for the
subsequence — and this is where most candidates discover that the array they
proudly compressed thirty seconds earlier has thrown it away.

## Compression first, because it is the thing that breaks reconstruction

The edit-distance table is $(n+1) \times (m+1)$, and every cell reads only the
row above and the cell to its left. So two rows suffice. Push a little harder and
one row suffices, provided you save the diagonal before you overwrite it.

```python runnable id=one-row-edit-distance
def edit_distance_one_row(a, b):
    row = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        diagonal = row[0]              # dp[i-1][j-1], about to be destroyed
        row[0] = i
        for j in range(1, len(b) + 1):
            above = row[j]             # still dp[i-1][j]
            row[j] = diagonal if a[i - 1] == b[j - 1] else 1 + min(above, row[j - 1], diagonal)
            diagonal = above           # becomes dp[i-1][j] for the next column
        # row is now dp[i][*]
    return row[len(b)]

print(edit_distance_one_row("kitten", "sitting"))          # 3
print(edit_distance_one_row("quickselect", "quicksort"))   # 4

a, b = "quickselect", "quicksort"
print(f"full table: {(len(a) + 1) * (len(b) + 1)} cells;  one row: {len(b) + 1} cells")
```

The `diagonal` variable is the whole trick, and it is worth stating why it
exists: at the moment you write `row[j]`, the value already sitting there is
$dp[i-1][j]$, and the value you needed a moment ago — $dp[i-1][j-1]$ — was
overwritten on the previous iteration. Saving it one step ahead of the
destruction is the standard shape for compressing any DP whose stencil reaches
diagonally.

For two strings of ten thousand characters, that is 100 million cells against
10,001. It is the difference between a service and an incident.

:::warning{title="What you just deleted"}
The compressed version cannot tell you *which* edits it chose. To know that, you
have to compare a cell against its neighbours, and its neighbours were
overwritten several rows ago.

This is not a limitation you route around with cleverness. It is a genuine
information trade: the table held $\Theta(nm)$ decisions and you kept
$\Theta(m)$ numbers.
:::

## Reconstruction, method one: walk the table backwards

If you kept the table, you need no extra memory at all. Start at the answer cell
and ask, at each step, *which predecessor could have produced this value?*

```python runnable id=lcs-reconstruct
def lcs_with_answer(a, b):
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])

    out = []
    i, j = n, m
    while i > 0 and j > 0:
        if a[i - 1] == b[j - 1]:
            out.append(a[i - 1])       # this character is in the answer
            i, j = i - 1, j - 1
        elif dp[i - 1][j] >= dp[i][j - 1]:
            i -= 1                     # tie goes upwards
        else:
            j -= 1
    return dp[n][m], "".join(reversed(out))

for pair in (("AGGTAB", "GXTXAYB"), ("quickselect", "quicksort"),
             ("graphwalk", "treewalk"), ("aabbcc", "abcabc")):
    length, text = lcs_with_answer(*pair)
    print(f"{pair[0]:>12} / {pair[1]:<10} -> {length}  {text!r}")
```

The backtrack costs $O(n + m)$ steps and no extra memory. It reads the table you
already built, which is why "keep the table" and "recover the answer" are the
same decision.

## Reconstruction, method two: store the choice

Sometimes re-deriving the choice is awkward — the recurrence has many
predecessors, or comparing them costs real work. Then store the decision as you
make it. Longest increasing subsequence is the clean example, because Lesson 3's
`tails` array is famously *not* the answer.

```python runnable id=lis-reconstruct
from bisect import bisect_left

def lis_with_answer(values):
    tails = []          # tails[k]: smallest tail of a length-(k+1) subsequence
    tail_index = []     # tail_index[k]: which position that tail sits at
    parent = [-1] * len(values)

    for i, x in enumerate(values):
        k = bisect_left(tails, x)
        if k == len(tails):
            tails.append(x)
            tail_index.append(i)
        else:
            tails[k] = x
            tail_index[k] = i
        parent[i] = tail_index[k - 1] if k > 0 else -1

    out, cursor = [], tail_index[-1] if tail_index else -1
    while cursor != -1:
        out.append(values[cursor])
        cursor = parent[cursor]
    return list(reversed(out))

sample = [3, 10, 2, 1, 20, 4, 6, 21, 5]
print(sample)
print(lis_with_answer(sample))
print(lis_with_answer([3, 4, 1]))     # tails would say [1, 4]; the answer is [3, 4]
```

`parent[i]` records the position of the element that precedes $i$ in the best
subsequence ending at $i$ — captured *at the moment* `tails[k-1]` was still the
right predecessor. Read it later and it may have been overwritten; that is why
this has to be recorded during the pass rather than reconstructed after it.

:::pitfall{title="Two correct implementations, two different answers"}
Run the LCS backtrack on `("aabbcc", "abcabc")` and it returns `"aabc"`. A
version that breaks ties by going left instead of up returns `"abcc"`. Both have
length 4 and both are correct.

Optimal solutions are usually not unique, and the tie-break in your backtrack —
`dp[i-1][j] >= dp[i][j-1]` versus `>` — silently decides which one you produce.
Two consequences.

**For tests**: a test that pins one exact string is testing your tie-break, so
the tie-break must be part of the specification, not folklore.

**For interviews**: say "there may be several optimal answers; I'm breaking ties
towards the earlier characters of `a`" as you write the loop. It takes four
seconds and it heads off the "are you sure that's the answer?" question, which
is asked precisely to see whether you noticed.
:::

:::checkpoint{id=cp-reconstruct rubric="the value needs one rolling row but the solution needs the whole table or parent pointers,walk backwards asking which predecessor produced this value,ties in the backtrack decide which optimal answer you return"}
You have compressed a DP to a single array and the caller now asks for the
actual solution. What are your options, and what does each cost?
:::

## Having both: Hirschberg's algorithm

Linear space and full reconstruction are not actually exclusive. The trick is
divide and conquer on the alignment itself.

Split $a$ in half at row $\mathrm{mid}$. The optimal alignment crosses that row
at *some* column $j^\star$. Compute the last DP row for $a[:\mathrm{mid}]$ against
all of $b$ (one linear-space forward pass), and the last DP row for the reverse
of $a[\mathrm{mid}:]$ against the reverse of $b$ (one linear-space backward
pass). The best crossing column is the $j$ maximising the sum of the two, and
then the problem splits into two independent halves.

```python runnable id=hirschberg
def lcs_row(a, b):
    """Final DP row of the LCS table for a against b, in O(len(b)) space."""
    previous = [0] * (len(b) + 1)
    for ch in a:
        current = [0] * (len(b) + 1)
        for j in range(1, len(b) + 1):
            current[j] = previous[j - 1] + 1 if ch == b[j - 1] else max(previous[j], current[j - 1])
        previous = current
    return previous

def hirschberg(a, b):
    if not a or not b:
        return ""
    if len(a) == 1:
        return a if a in b else ""
    mid = len(a) // 2
    left = lcs_row(a[:mid], b)
    right = lcs_row(a[mid:][::-1], b[::-1])
    split = max(range(len(b) + 1), key=lambda j: left[j] + right[len(b) - j])
    return hirschberg(a[:mid], b[:split]) + hirschberg(a[mid:], b[split:])

def backtrack(a, b):
    """The quadratic-space version from earlier, for comparison."""
    dp = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            dp[i][j] = dp[i-1][j-1] + 1 if a[i-1] == b[j-1] else max(dp[i-1][j], dp[i][j-1])
    out, i, j = [], len(a), len(b)
    while i > 0 and j > 0:
        if a[i-1] == b[j-1]:
            out.append(a[i-1]); i, j = i-1, j-1
        elif dp[i-1][j] >= dp[i][j-1]:
            i -= 1
        else:
            j -= 1
    return "".join(reversed(out))

for pair in (("AGGTAB", "GXTXAYB"), ("quickselect", "quicksort"), ("aabbcc", "abcabc")):
    print(f"{pair[0]:>12} / {pair[1]:<10}  hirschberg={hirschberg(*pair)!r}  "
          f"backtrack={backtrack(*pair)!r}")
```

Note the last line of output. On `("aabbcc", "abcabc")` Hirschberg returns
`"abcc"` and the table backtrack returns `"aabc"` — a different tie-break,
reached honestly, both optimal.

:::insight{title="Why the constant factor is exactly 2"}
The top-level call does $nm$ cell evaluations, twice over half of $a$ each — so
$nm$ in total. It then recurses on two subproblems whose column ranges partition
$b$: sizes $\tfrac{n}{2} \times j^\star$ and $\tfrac{n}{2} \times (m - j^\star)$, whose
work sums to $\tfrac{nm}{2}$. The level below sums to $\tfrac{nm}{4}$, and so on:

$$
T(n, m) \;=\; nm + \frac{nm}{2} + \frac{nm}{4} + \cdots \;=\; 2nm.
$$

Space is $\Theta(m)$ for the two rows plus $\Theta(\log n)$ recursion depth. Two
times the work for a quadratic reduction in memory is a trade worth having, and
it is how `diff` implementations handle large files without allocating a
gigabyte.
:::

::::track{depth=interview}
## The follow-up you should assume is coming

Reconstruction is not an advanced topic in interviews; it is the *default second
half* of the question. "Find the length" is the warm-up. Plan for it from the
start, and say so.

The sequence that works:

1. **Solve for the value first**, with the full table. Do not compress yet.
2. **Say the compression exists and why you are not doing it yet**: "I could roll
   this to one row for $O(m)$ space, but I'm keeping the table because I expect
   you'll want the actual subsequence."

   That single sentence does three things at once — it shows you know the
   optimisation, that you know its cost, and that you anticipated the follow-up.
   It is close to the highest-value sentence you can say in a DP interview.
3. **Reconstruct by backtracking**, narrating the tie-break out loud.
4. **Only then** offer Hirschberg, if space came up: linear space, both halves,
   twice the time.

:::interview{title="Three questions this prepares you for"}
**"Can you do it in less space?"** Yes — roll the array — and reconstruction is
what it costs. Say the cost unprompted.

**"How many optimal solutions are there?"** Often exponentially many. Counting
them is a second DP over the same table, where a match cell adds its diagonal's
count and a tie adds *both* neighbours' counts. If the interviewer asks it, they
want to see you notice that a tie is where the branching lives.

**"Which one does your code return?"** The one your tie-break selects. Answering
"whichever, they're all optimal" is worse than useless: it is true and it dodges
the question. Answer with the rule.
:::
::::

:::exercise{ref=lcs-string}
:::

:::exercise{ref=knapsack-items}
:::

:::quiz{id=quiz-l06 passing=2}
- id: q1
  prompt: "You compress an edit-distance DP from a full table to one row. What becomes impossible?"
  options:
    - "Computing the distance for inputs longer than the row."
    - "Recovering the edit script, because reconstruction compares a cell to neighbours that no longer exist."
    - "Handling inputs of different lengths."
    - "Nothing; the row contains the same information in less space."
  answerIndex: 1
  explanation: >-
    The value survives compression because each row only ever needed the one
    above it. The decisions do not: backtracking asks which predecessor produced
    each cell, and those predecessors were overwritten rows ago. You kept
    Θ(m) numbers out of Θ(nm) decisions, and that is a real loss of information,
    not an implementation detail.
- id: q2
  prompt: "Two LCS implementations return 'aabc' and 'abcc' for the same input, both of length 4. What follows?"
  options:
    - "One of them has a bug in the DP table."
    - "Nothing is wrong: optimal solutions need not be unique, and the tie-break in the backtrack decides which one you get."
    - "The inputs must contain repeated characters, which LCS does not support."
    - "The second one is not a subsequence of both inputs."
  answerIndex: 1
  explanation: >-
    When dp[i-1][j] equals dp[i][j-1] the backtrack has a genuine choice, and
    moving up versus left leads to different — equally optimal — answers. That is
    why the tie-break has to be stated in the specification if a test is going to
    pin one exact string, and why Hirschberg can legitimately disagree with a
    table backtrack.
- id: q3
  prompt: "What does Hirschberg's algorithm cost relative to the plain quadratic LCS?"
  options:
    - "Θ(n log n) time instead of Θ(nm), and the same space."
    - "About twice the time, and Θ(min(n, m)) space instead of Θ(nm) — with the actual subsequence still recoverable."
    - "The same time and space, but it only returns the length."
    - "Half the time and twice the space."
  answerIndex: 1
  explanation: >-
    Each level of the recursion does half the cell evaluations of the level
    above, so the total is nm + nm/2 + nm/4 + … = 2nm. Space is two rows plus
    O(log n) stack. You give up a factor of two in time and get a quadratic
    reduction in memory while keeping reconstruction — which is why it is what
    large-file diff tools actually run.
:::
