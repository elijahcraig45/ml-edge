---
id: t3/s07/l07
title: Backtracking is DFS on a graph you never build
tier: t3-algorithms
stage: s07-graphs
status: published
estimatedMinutes: 50
objectives:
  - "Describe any backtracking problem in four words: state, moves, feasibility, goal."
  - Write the mutate-recurse-undo pattern and say why it beats copying the state.
  - Prune by rejecting a partial state before recursing, and measure what that buys.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"Backtracking is a separate technique from graph search.\"** It is depth-first search over a graph whose nodes are partial solutions and whose edges are single moves. The only difference from lesson 2 is that the graph is generated on demand instead of stored, because it is far too large to store."
  - "**\"You need a visited set, like every other traversal.\"** Only when two different move sequences can reach the same state. When the state graph is a *tree* — subsets indexed by position, permutations tracking a used-set, n-queens filling one row at a time — every state has exactly one path to it, so there is nothing to revisit. Word search on a grid is the opposite case, and there the in-place marking is the visited set."
  - "**\"Pruning is an optimisation.\"** For anything of interesting size it is the difference between running and not running. Eight queens has 19,173,961 states in the unpruned tree and 2,057 with the feasibility check moved before the recursion. Same answer, four orders of magnitude."
  - "**\"Copying the partial solution at each step is cleaner and basically free.\"** It is cleaner. It is not free: at depth $d$ you copy $O(d)$ elements per node, which multiplies the total work by the depth. Mutate and undo keeps one shared buffer, and the undo is a single `pop`."
masteryChecklist:
  - Given a new backtracking problem, I can name its state, its moves, its feasibility test and its goal test before writing any code.
  - I can write the append-recurse-pop pattern without leaving state behind on the way out.
  - I can say when a backtracking search needs a visited set and when it does not.
runtimes:
  - engine: python
---

Backtracking has a reputation for being a distinct, slightly mysterious
technique. It is not. It is the depth-first search from lesson 2, run over a
graph nobody ever builds.

The nodes of that graph are **partial solutions**. The edges are **one move**.
The search is the same DFS you have already written, and the only thing that
changes is that `graph[node]` is replaced by a loop that generates the
neighbours as it goes.

Four questions describe any instance of it:

| Question | For n-queens |
| --- | --- |
| **State** — what is a partial solution? | queens placed in rows $0..r-1$ |
| **Moves** — what extends it? | place a queen in row $r$, in some column |
| **Feasibility** — is this state still viable? | no shared column or diagonal |
| **Goal** — when is it complete? | $r = n$ |

Answer those four and the code writes itself. Failing to answer them is why
backtracking feels hard.

## The shape, on the simplest possible problem

Subsets. State is "a decision has been made about the first $i$ items". Moves
are "skip item $i$" and "take item $i$". Every state is complete when $i$ reaches
the end, and nothing is ever infeasible.

```python runnable id=subsets
def subsets(items):
    out, chosen = [], []

    def visit(i):
        if i == len(items):          # goal test
            out.append(list(chosen))  # snapshot, because `chosen` keeps changing
            return
        visit(i + 1)                  # move 1: skip items[i]
        chosen.append(items[i])       # move 2: take items[i]
        visit(i + 1)
        chosen.pop()                  # UNDO — the line the technique is named for

    visit(0)
    return out

for s in subsets(["a", "b", "c"]):
    print(s)
```

Eight subsets from three items. The state graph is a binary tree of depth 3 with
8 leaves, and `visit` is a DFS over it. The graph is never materialised; each
node exists only while its call frame is on the stack.

**`chosen.pop()` is the whole idea.** One list is shared by every node in the
tree. Going down a branch pushes onto it, coming back up pops. At any moment
`chosen` holds exactly the choices on the path from the root to where you are —
which is what "the current partial solution" means. `list(chosen)` at the goal
takes a snapshot, because the buffer itself will be different a moment later.

The alternative is to pass `chosen + [items[i]]` and never mutate. It is shorter
and it allocates a new list at every one of the $2^n$ nodes, each costing $O(n)$
to copy. Mutate-and-undo does $O(1)$ work per edge.

:::pitfall{title="The forgotten undo"}
Every mutation before the recursive call needs an exactly matching undo after it.
Miss one and the corruption does not surface where you made it — it surfaces in
a sibling branch, minutes of debugging later, as an answer that is wrong in a way
that looks random.

Write the pair together, always: `add` then `recurse` then `remove`, adjacent
lines. If you find yourself wanting to `return` from the middle, restructure so
the undo still runs, or use `try/finally`.
:::

## Pruning: the feasibility test moves before the recursion

Here is n-queens with the check where it belongs.

```python runnable id=n-queens
def n_queens(n):
    cols, diag, anti = set(), set(), set()
    states = solutions = 0

    def place(row):
        nonlocal states, solutions
        states += 1
        if row == n:                                   # goal
            solutions += 1
            return
        for col in range(n):
            if col in cols or (row - col) in diag or (row + col) in anti:
                continue                               # PRUNE: infeasible, do not descend
            cols.add(col); diag.add(row - col); anti.add(row + col)
            place(row + 1)
            cols.remove(col); diag.remove(row - col); anti.remove(row + col)

    place(0)
    return solutions, states

solutions, states = n_queens(8)
full_tree = sum(8 ** k for k in range(9))     # every way to put one queen per row
print(f"solutions: {solutions}")
print(f"states visited with pruning: {states:,}")
print(f"states in the unpruned tree: {full_tree:,}")
print(f"ratio: {full_tree / states:,.0f}x")
```

92 solutions, 2,057 states explored, out of a tree with 19,173,961 nodes. The
answer is identical either way; only the pruning differs.

The feasibility test itself is worth a look. A queen at `(row, col)` attacks
its column, its `row - col` diagonal and its `row + col` anti-diagonal — three
integers, three sets, three constant-time lookups. Rewriting "does this conflict
with any queen already placed?" as three set memberships instead of a loop over
placed queens is the same move as lesson 2's accidentally-quadratic fix, applied
inside a search.

:::insight{title="Where to put the check"}
There are only two places a feasibility test can go: before the recursive call,
or at the goal. At the goal it is a filter and you explore the entire tree.
Before the call it is a prune and whole subtrees never exist.

They give the same answer. That is precisely why the mistake survives: the
filter version is correct, and it is correct at a size where you cannot wait for
it to finish.
:::

:::checkpoint{id=cp-four-questions rubric="state is the partial solution,moves generate the neighbours,feasibility rejects a state before recursing,goal test says when it is complete"}
Take "generate all valid combinations of $n$ pairs of parentheses". Name its
state, its moves, its feasibility test and its goal test — before writing a
line.
:::

## When the state graph is not a tree

Subsets, permutations and n-queens all have a state graph that is a *tree*:
every partial solution is reachable by exactly one sequence of moves, so no
state is ever revisited and no visited set is needed.

Word search on a grid is different. You can arrive at the same cell along many
paths, and the constraint is that a single path must not reuse a cell. So the
visited set is back — but it is a set for the *current path*, exactly like the
grey colour in lesson 2's cycle detection, and it must be undone on the way out.

```python runnable id=word-search
def exists(board, word):
    rows, cols = len(board), len(board[0])

    def visit(r, c, i):
        if i == len(word):
            return True                                # goal: whole word matched
        if not (0 <= r < rows and 0 <= c < cols) or board[r][c] != word[i]:
            return False                               # off-grid or wrong letter
        board[r][c] = "#"                              # mark: on the current path
        found = any(visit(r + dr, c + dc, i + 1)
                    for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        board[r][c] = word[i]                          # UNDO the mark
        return found

    return any(visit(r, c, 0) for r in range(rows) for c in range(cols))

BOARD = [list("ABCE"), list("SFCS"), list("ADEE")]
for word in ("ABCCED", "SEE", "ABCB"):
    grid = [row[:] for row in BOARD]
    print(f"{word:8} {exists(grid, word)}")
```

`ABCB` fails because the second `B` would have to reuse the cell holding the
first. Marking with `"#"` and restoring the original letter is a visited set that
lives inside the data — no extra structure, and it unwinds automatically with
the recursion.

Note the difference from a graph traversal's visited set: there you mark a node
and *never* unmark it, because you only want to reach each node once overall.
Here you unmark, because a cell excluded from one path is perfectly available to
a different one. "Visited on this path" and "visited ever" are different
questions, and mixing them up gives you a search that misses answers.

## Permutations and combinations, in the same frame

```python runnable id=permutations-and-combinations
def permutations(items):
    out, current, used = [], [], set()

    def visit():
        if len(current) == len(items):
            out.append(list(current)); return
        for i, item in enumerate(items):
            if i in used:
                continue                       # feasibility: each item once
            used.add(i); current.append(item)
            visit()
            current.pop(); used.remove(i)      # undo, in reverse order

    visit()
    return out

def combinations(items, k):
    out, chosen = [], []

    def visit(start):
        if len(chosen) == k:
            out.append(list(chosen)); return
        # Prune: stop when too few items remain to ever reach length k.
        for i in range(start, len(items) - (k - len(chosen)) + 1):
            chosen.append(items[i])
            visit(i + 1)                       # `start` forbids going backwards
            chosen.pop()

    visit(0)
    return out

print("permutations:", permutations([1, 2, 3]))
print("combinations:", combinations([1, 2, 3, 4], 2))
```

Three variations on one skeleton. The differences are entirely in the
feasibility test:

- **Subsets** — no test. Every state is viable.
- **Permutations** — a `used` set. Order matters, so every unused item is a
  legal next move.
- **Combinations** — a `start` index. Order does *not* matter, so forcing
  indices to increase is what stops `[1,2]` and `[2,1]` both appearing. The
  bound on `range` is a second prune: if fewer than `k - len(chosen)` items
  remain, no completion exists, so do not start one.

::::track{depth=interview}
## Recognising it, and talking about the cost

**The trigger** is "generate all", "find every", "count the ways", "return all
possible" — plus a constraint that rules some of them out. If the problem wanted
*one* answer you would usually reach for greedy or dynamic programming; "all
of them" with a constraint is backtracking.

The standard set is small and worth recognising on sight: subsets, subsets with
duplicates, permutations, combination sum, palindrome partitioning, generate
parentheses, word search, n-queens, sudoku solver, restore IP addresses.

**Say the four questions out loud before you write.** "The state is the partial
assignment, a move is placing the next value, it is infeasible if it conflicts
with what is already placed, and it is complete when every position is filled."
That takes fifteen seconds and it is the difference between a structured
solution and a pile of nested loops.

**On complexity, be honest and precise.** Backtracking is exponential and the
useful statement is about the *output*, not the search: permutations is
$O(n \cdot n!)$ because there are $n!$ results each costing $n$ to emit;
subsets is $O(n \cdot 2^n)$. For n-queens there is no closed form, and the right
answer is "exponential, but the pruning cuts it enormously — for $n = 8$ it is
about two thousand states against nineteen million".

Never claim pruning changes the complexity class. It does not. It changes the
base of the exponent and the constant, and on real inputs that is what decides
whether the program returns.

:::interview{title="The two follow-ups"}
**"Can you avoid the copy at each leaf?"** Yes, if the caller only needs to
*consume* each solution rather than hold all of them — `yield list(current)` or
pass a callback. The copy at the goal is unavoidable if you are returning a list
of lists, because the buffer is reused. The copies people should actually remove
are the ones at every internal node.

**"How would you handle duplicates in the input?"** Sort first, then at each
level skip an item equal to the previous one *unless* the previous one was just
taken. That is the standard idiom, it is two lines, and it is the second half of
about a third of these questions.
:::
::::

:::exercise{ref=n-queens-count}
:::

:::exercise{ref=word-search-grid}
:::

:::quiz{id=quiz-l07 passing=2}
- id: q1
  prompt: "What is the graph that backtracking is searching?"
  options:
    - "The input graph, traversed depth-first."
    - "A graph whose nodes are partial solutions and whose edges are single moves, generated on demand rather than stored."
    - "A tree built up front and then traversed."
    - "There is no graph; backtracking is a distinct technique."
  answerIndex: 1
  explanation: >-
    Each recursive call is a node, each loop iteration is an edge, and the whole
    structure exists only as call frames. Building it first is impossible for
    anything interesting — the eight-queens tree has 19 million nodes and sudoku
    is far worse.
- id: q2
  prompt: "Why do subsets and permutations need no visited set, while word search on a grid does?"
  options:
    - "Because grids are two-dimensional and lists are not."
    - "Because in subsets and permutations each state is reachable by exactly one move sequence, so nothing can be revisited; on a grid many paths reach the same cell."
    - "Because the grid problem is a search and the others are enumerations."
    - "Because word search uses recursion and the others use iteration."
    - "Because the grid contains duplicate letters."
  answerIndex: 1
  explanation: >-
    The state graph for subsets or permutations is a tree — one path per state —
    so a visited set would never fire. On a grid the state graph has cycles, and
    the marking prevents a single path reusing a cell. Note it is a *per-path*
    mark that gets undone, not the permanent mark a graph traversal uses.
- id: q3
  prompt: "Moving the feasibility check from the goal test to just before the recursive call changes what?"
  options:
    - "The answer, since some valid solutions are now skipped."
    - "The complexity class, from exponential to polynomial."
    - "The number of states explored — often by orders of magnitude — while leaving the answer identical."
    - "Nothing measurable; the compiler hoists the check anyway."
  answerIndex: 2
  explanation: >-
    A prune removes whole subtrees that cannot contain a solution, so the answer
    is unchanged and the work collapses — 19,173,961 states to 2,057 for
    eight queens. It does not change the complexity class: the search is still
    exponential, with a much smaller base and constant.
:::
