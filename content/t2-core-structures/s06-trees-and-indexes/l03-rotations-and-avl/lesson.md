---
id: t2/s06/l03
title: Rotations, and the height guarantee they buy
tier: t2-core-structures
stage: s06-trees-and-indexes
status: published
estimatedMinutes: 50
objectives:
  - Compute a node's balance factor and identify which of the four rotation cases applies.
  - Implement left and right rotation as a local relabeling that preserves the inorder sequence.
  - State the AVL height bound and explain why red-black trees trade a taller tree for cheaper updates.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"A rotation moves values around the tree.\"** A rotation changes three pointers and nothing else. The inorder sequence before and after a rotation is *identical* — that is the property that makes it legal at all. If your rotation changes the sorted order, it is not a rotation."
  - "**\"Rebalancing means rebuilding the tree.\"** An AVL insert performs at most one rotation (or one double rotation) in total, no matter how tall the tree is. The rebalance walk is $O(\\log n)$ pointer updates, not a reconstruction."
  - "**\"AVL and red-black are two names for the same thing.\"** They enforce different invariants and land in different places. AVL keeps height under about $1.44 \\log_2 n$ and pays with more rotations on write; red-black allows up to $2 \\log_2 n$ and rotates less. Read-heavy workloads prefer AVL; write-heavy in-memory maps mostly ship red-black."
masteryChecklist:
  - Given a node's balance factor and its heavier child's balance factor, I can name which of the four rotations applies.
  - I can write rotate_left and rotate_right from memory and check them by comparing inorder sequences.
  - I can state the AVL height bound and say what it guarantees about worst-case lookup.
runtimes:
  - engine: python
---

The previous lesson ended with a binary search tree of height 500 built from
500 sorted values. The fix is not a better insert algorithm. It is a repair
step that runs after every insert, costs $O(1)$, and is applied on the way back
up the insertion path.

That repair is a **rotation**, and it is the smallest interesting operation in
this stage.

## A rotation is a relabeling that preserves order

Take a node `y` with a left child `x`. A right rotation makes `x` the parent
and `y` the child:

```text
      y                x
     / \              / \
    x   C    ==>     A   y
   / \                  / \
  A   B                B   C
```

Read both trees inorder. Left tree: `A, x, B, y, C`. Right tree: `A, x, B, y,
C`. The same. Every value stayed on the same side of every other value; only
the *depths* changed. `A` moved up one level, `C` moved down one.

This is why rotations are the only rebalancing primitive that needs no
justification beyond a picture — they cannot break the search invariant,
because they do not change the order.

To make the height cheap to consult, store it in the node. From here a node is
a four-tuple `(value, left, right, height)`.

```python runnable id=rotations
def height(node):
    return 0 if node is None else node[3]

def make(value, left, right):
    """Build a node with its height computed from its children."""
    return (value, left, right, 1 + max(height(left), height(right)))

def rotate_right(node):
    value, left, right, _ = node
    lv, ll, lr, _ = left
    return make(lv, ll, make(value, lr, right))

def rotate_left(node):
    value, left, right, _ = node
    rv, rl, rr, _ = right
    return make(rv, make(value, left, rl), rr)

def inorder(node):
    return [] if node is None else inorder(node[1]) + [node[0]] + inorder(node[2])

# A right-leaning chain: 1 -> 2 -> 3
chain = make(1, None, make(2, None, make(3, None, None)))
print("chain    height", height(chain), inorder(chain))

fixed = rotate_left(chain)
print("rotated  height", height(fixed), inorder(fixed))
```

Height 3 became height 2, and the inorder list is unchanged. Note the order the
two `make` calls run in: the inner node is rebuilt first, so its height is
correct before the outer node reads it. Getting that backwards is the most
common rotation bug, and it does not show up as a wrong answer — it shows up as
a tree that slowly stops being balanced.

## The balance factor, and four cases

Define the **balance factor** of a node as

$$\mathrm{bf}(n) = h(\mathrm{left}(n)) - h(\mathrm{right}(n))$$

An AVL tree is a BST in which every node has $\mathrm{bf} \in \{-1, 0, +1\}$. A
single insert can push exactly one node to $\pm 2$, and there are four ways it
can happen — named by the two steps of the path from the unbalanced node down
toward the new leaf.

| Case | Condition | Fix |
| --- | --- | --- |
| Left-Left | $\mathrm{bf} > 1$ and the left child leans left (or is level) | `rotate_right(node)` |
| Left-Right | $\mathrm{bf} > 1$ and the left child leans right | `rotate_left` the left child, then `rotate_right(node)` |
| Right-Right | $\mathrm{bf} < -1$ and the right child leans right (or is level) | `rotate_left(node)` |
| Right-Left | $\mathrm{bf} < -1$ and the right child leans left | `rotate_right` the right child, then `rotate_left(node)` |

The two "straight" cases need one rotation. The two "bent" cases need two, and
the first rotation exists only to straighten the bend so the second one can
work. Try to fix Left-Right with a single right rotation and you get a
Right-Left tree — same imbalance, mirrored.

```python runnable id=four-cases
def height(node):
    return 0 if node is None else node[3]

def make(value, left, right):
    return (value, left, right, 1 + max(height(left), height(right)))

def rotate_right(node):
    value, left, right, _ = node
    lv, ll, lr, _ = left
    return make(lv, ll, make(value, lr, right))

def rotate_left(node):
    value, left, right, _ = node
    rv, rl, rr, _ = right
    return make(rv, make(value, left, rl), rr)

def rebalance(node):
    value, left, right, _ = node
    bf = height(left) - height(right)
    if bf > 1:
        if height(left[1]) < height(left[2]):        # left child leans right
            node = make(value, rotate_left(left), right)
        return rotate_right(node)
    if bf < -1:
        if height(right[2]) < height(right[1]):      # right child leans left
            node = make(value, left, rotate_right(right))
        return rotate_left(node)
    return node

def avl_insert(node, value):
    if node is None:
        return (value, None, None, 1)
    v, left, right, _ = node
    if value < v:
        return rebalance(make(v, avl_insert(left, value), right))
    if value > v:
        return rebalance(make(v, left, avl_insert(right, value)))
    return node

for sequence in ([1, 2, 3], [3, 2, 1], [1, 3, 2], [3, 1, 2]):
    tree = None
    for value in sequence:
        tree = avl_insert(tree, value)
    print(f"insert {sequence} -> root {tree[0]}, height {tree[3]}")
```

All four orders produce the same balanced tree with 2 at the root. That is the
point of the four cases: whatever order the data arrives in, the shape converges.

:::insight{title="Where the rebalancing actually happens"}
`avl_insert` calls `rebalance` on the way *back up*, after the recursive call
returns. That is the only moment when the child's new height is known and the
current node's height can be recomputed. An insert therefore touches $O(\log n)$
nodes and performs **at most one** rotation or double rotation in total —
after the first fix, every ancestor's height is back to what it was before.
:::

:::checkpoint{id=cp-cases rubric="balance factor is left height minus right height,the second letter names the heavy grandchild direction,bent cases need a rotation to straighten before the main rotation"}
A node has $\mathrm{bf} = +2$ and its left child has $\mathrm{bf} = -1$. Which
case is it, and which rotations do you apply in which order?
:::

## What the guarantee is worth

```python runnable id=guarantee
import math

def height(node):
    return 0 if node is None else node[3]

def make(value, left, right):
    return (value, left, right, 1 + max(height(left), height(right)))

def rotate_right(node):
    value, left, right, _ = node
    lv, ll, lr, _ = left
    return make(lv, ll, make(value, lr, right))

def rotate_left(node):
    value, left, right, _ = node
    rv, rl, rr, _ = right
    return make(rv, make(value, left, rl), rr)

def rebalance(node):
    value, left, right, _ = node
    bf = height(left) - height(right)
    if bf > 1:
        if height(left[1]) < height(left[2]):
            node = make(value, rotate_left(left), right)
        return rotate_right(node)
    if bf < -1:
        if height(right[2]) < height(right[1]):
            node = make(value, left, rotate_right(right))
        return rotate_left(node)
    return node

def avl_insert(node, value):
    if node is None:
        return (value, None, None, 1)
    v, left, right, _ = node
    if value < v:
        return rebalance(make(v, avl_insert(left, value), right))
    if value > v:
        return rebalance(make(v, left, avl_insert(right, value)))
    return node

tree = None
for value in range(1, 1001):        # the worst possible order for a plain BST
    tree = avl_insert(tree, value)

n = 1000
print("AVL height after 1000 ascending inserts:", tree[3])
print("plain BST height on the same input:     ", n)
print(f"the AVL bound 1.4405*log2(n+2) - 0.3277 = {1.4405 * math.log2(n + 2) - 0.3277:.2f}")
```

Height 10 instead of 1000. The bound says it could not have exceeded 14 no
matter what order the values arrived in — that is what a *guarantee* means, as
opposed to the "usually fine" you get from a plain BST on random data.

## Red-black trees, for reading only

AVL is not the only way. A red-black tree colours each node and enforces five
rules:

1. Every node is red or black.
2. The root is black.
3. Every leaf (the null child slots) is black.
4. A red node's children are both black — so no two reds in a row.
5. Every path from a given node down to any of its leaves contains the same
   number of black nodes.

Rules 4 and 5 together bound the height: the longest root-to-leaf path can
alternate red and black, and the shortest can be all black, so the longest is at
most twice the shortest, giving $h \le 2\log_2(n+1)$.

That is a weaker bound than AVL's $1.44\log_2 n$ — a red-black tree can be
noticeably taller — and it is bought deliberately. Because the invariant is
looser, an insert or delete needs fewer rotations to restore it, and the
recolouring that does most of the work is cheaper than a pointer rearrangement.
Read-mostly workloads prefer the shorter AVL tree; general-purpose ordered maps
prefer the cheaper red-black update, which is why C++'s `std::map`, Java's
`TreeMap`, and the Linux kernel's interval trees are all red-black.

Do not implement one now. Know the invariants, know that the mechanism is the
same rotations you just wrote plus a colour, and know which trade each one is
making.

::::track{depth=proof}
## Why the height bound is what it is

The bound comes from asking the opposite question: what is the *fewest* nodes an
AVL tree of height $h$ can have? Call it $N(h)$. If we can show $N(h)$ grows
exponentially in $h$, then $h$ must grow logarithmically in $n$.

**Setting up the recurrence.** A sparsest AVL tree of height $h$ has a root, and
one of its subtrees must have height $h-1$. To keep the node count minimal the
other subtree should be as short as the invariant allows, which is $h-2$. Both
subtrees must themselves be sparsest AVL trees of their heights. So

$$N(h) = 1 + N(h-1) + N(h-2), \qquad N(0) = 0,\; N(1) = 1.$$

**Solving it.** Compare with the Fibonacci numbers $F_1 = F_2 = 1$,
$F_k = F_{k-1} + F_{k-2}$. Claim: $N(h) = F_{h+2} - 1$.

*Base cases.* $N(0) = 0 = F_2 - 1 = 1 - 1$. $N(1) = 1 = F_3 - 1 = 2 - 1$.

*Inductive step.* Assume it holds for $h-1$ and $h-2$. Then

$$N(h) = 1 + (F_{h+1} - 1) + (F_h - 1) = (F_{h+1} + F_h) - 1 = F_{h+2} - 1.$$

**Turning it into a bound on $h$.** By Binet's formula,
$F_k = (\varphi^k - \psi^k)/\sqrt{5}$ where $\varphi = (1+\sqrt5)/2 \approx
1.618$ and $|\psi| < 1$, so $F_k > \varphi^k/\sqrt5 - 1$.

Any AVL tree of height $h$ with $n$ nodes satisfies $n \ge N(h)$, so

$$
n \;\ge\; F_{h+2} - 1 \;>\; \frac{\varphi^{h+2}}{\sqrt5} - 2
\quad\Longrightarrow\quad \varphi^{h+2} < \sqrt5\,(n+2).
$$

Take $\log_2$ of both sides and divide by $\log_2\varphi \approx 0.6942$:

$$
h + 2 \;<\; \frac{\log_2(n+2) + \log_2\sqrt5}{\log_2\varphi}
\;=\; 1.4405\log_2(n+2) + 1.6723,
$$

$$\boxed{\,h \;<\; 1.4405\log_2(n+2) - 0.3277\,}$$

**Reading the result.** The constant $1.4405 = 1/\log_2\varphi$ is the price of
allowing a balance factor of $\pm 1$ instead of demanding a perfectly balanced
tree. An AVL tree is at most about 44% taller than a perfect binary tree, ever,
on any input. For a million nodes that is 28 levels instead of 20 — and the
alternative, on sorted input, was a million.

The appearance of $\varphi$ is not a coincidence dressed up as one. The sparsest
AVL tree of height $h$ *is* the Fibonacci tree: root, a sparsest tree of height
$h-1$ on one side, a sparsest tree of height $h-2$ on the other. The recurrence
was Fibonacci's before we solved anything.
::::

:::exercise{ref=avl-rotations}
:::

:::quiz{id=quiz-l03 passing=2}
- id: q1
  prompt: "What does a rotation change?"
  options:
    - "The inorder sequence, which is why it has to be applied carefully."
    - "The depths of some subtrees, while leaving the inorder sequence identical."
    - "The values stored in the nodes, swapping a parent with a child."
    - "The height of every node in the tree."
  answerIndex: 1
  explanation: >-
    A rotation rearranges three links so that one subtree rises a level and
    another descends. Every value stays on the same side of every other value,
    so inorder is unchanged — which is exactly why a rotation can never break
    the search invariant. Only nodes on the rotated path have their heights
    recomputed.
- id: q2
  prompt: "A node has balance factor +2 and its left child has balance factor -1. Which fix applies?"
  options:
    - "A single right rotation on the node."
    - "A single left rotation on the node."
    - "Left-rotate the left child, then right-rotate the node."
    - "Right-rotate the left child, then left-rotate the node."
  answerIndex: 2
  explanation: >-
    +2 means left-heavy, and a left child with balance factor -1 leans right —
    the Left-Right case. The path to the new leaf bends, and a single right
    rotation would only produce the mirrored imbalance. The first rotation
    straightens the bend so the second one can do its job.
- id: q3
  prompt: "Why do many general-purpose ordered maps use red-black trees rather than AVL trees?"
  options:
    - "Red-black trees are shorter, so lookups are faster."
    - "Red-black trees allow a looser height bound and therefore need fewer rotations per update."
    - "AVL trees cannot store duplicate keys."
    - "Red-black trees do not need rotations at all — recolouring is enough."
  answerIndex: 1
  explanation: >-
    Red-black trees are *taller* — up to 2 log2(n+1) against AVL's 1.44 log2 n —
    and that slack is the point: a looser invariant is restored with less work
    per insert or delete. Recolouring handles many cases but not all; rotations
    are still needed, only less often.
:::
