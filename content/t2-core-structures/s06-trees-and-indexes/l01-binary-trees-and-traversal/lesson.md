---
id: t2/s06/l01
title: Binary trees, and the stack you cannot see
tier: t2-core-structures
stage: s06-trees-and-indexes
status: published
estimatedMinutes: 45
objectives:
  - Write preorder, inorder and postorder traversals recursively, and say what distinguishes them.
  - Rewrite a recursive traversal as a loop with an explicit stack, and name what the stack holds.
  - Explain why level order needs a queue rather than a stack.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"Iterative traversal is a different algorithm from the recursive one.\"** It is the same algorithm with the bookkeeping written out. Recursion stores the pending right-subtree work on the interpreter's call stack; the iterative version stores it on a list. Every `return` address in the recursive version is a value you can see in the list version."
  - "**\"Inorder means left-to-right, so it is the sorted order.\"** Inorder is a shape-based rule: left subtree, node, right subtree. It produces sorted output only when the tree happens to satisfy the search-tree ordering invariant, which is the *next* lesson. On an arbitrary binary tree, inorder is not sorted."
  - "**\"Depth-first and breadth-first differ by which node you visit first.\"** They differ by which *container* holds the pending work. Take an iterative preorder, swap the stack for a queue, change nothing else, and you have level order. The container is the algorithm."
masteryChecklist:
  - Given a small tree drawn on paper, I can write out all four traversal orders without running code.
  - I can convert a recursive traversal into a loop with an explicit stack and explain each push.
  - I can say which traversal I need for "free the whole tree", "print an expression", and "copy a tree".
runtimes:
  - engine: python
---

Recursion is a data structure you did not declare. Every pending call is a
frame holding a node and a place to resume, and the interpreter keeps those
frames on a stack you cannot inspect. Writing a traversal iteratively is not a
performance trick — it is the exercise of declaring that structure yourself, and
after you have done it once, recursion stops being magic.

Everything in this stage is a tree. A B+ tree index, a heap, a union-find
forest: all of them are this lesson's node with different rules bolted on. So
start with the plainest possible version.

## A tree is a value with two smaller trees inside it

```python runnable id=build-tree
# A node is (value, left, right). The empty tree is None.
tree = (
    "d",
    ("b", ("a", None, None), ("c", None, None)),
    ("f", ("e", None, None), ("g", None, None)),
)

def size(node):
    if node is None:
        return 0
    return 1 + size(node[1]) + size(node[2])

def height(node):
    if node is None:
        return 0
    return 1 + max(height(node[1]), height(node[2]))

print("size:", size(tree), "height:", height(tree))
```

Both functions have the same shape, and it is the shape of every tree algorithm
you will write: **handle the empty case, then combine the answers from the two
children.** The recursion is not decoration. It is the definition of the type
turned into code.

## Three depth-first orders, one line apart

Preorder, inorder and postorder differ by *when you record the node* relative to
recursing into its children. That is all.

```python runnable id=three-orders
tree = (
    "d",
    ("b", ("a", None, None), ("c", None, None)),
    ("f", ("e", None, None), ("g", None, None)),
)

def preorder(node, out):
    if node is None:
        return out
    out.append(node[0])          # node first
    preorder(node[1], out)
    preorder(node[2], out)
    return out

def inorder(node, out):
    if node is None:
        return out
    inorder(node[1], out)
    out.append(node[0])          # node in the middle
    inorder(node[2], out)
    return out

def postorder(node, out):
    if node is None:
        return out
    postorder(node[1], out)
    postorder(node[2], out)
    out.append(node[0])          # node last
    return out

print("pre :", preorder(tree, []))
print("in  :", inorder(tree, []))
print("post:", postorder(tree, []))
```

The three are not interchangeable, and the choice is usually forced:

| Order | You need it when |
| --- | --- |
| preorder | you must see a node **before** its children — copying a tree, serialising it, descending an index |
| inorder | the node's value belongs **between** the two subtrees' values — reading a BST in sorted order, printing an infix expression |
| postorder | you must finish the children **before** the node — freeing memory, evaluating an expression tree, computing subtree sizes |

Postorder is the one people get wrong under pressure. If your answer for a node
depends on answers from both children, it is postorder, whatever you called it.

## Making the invisible stack visible

Here is preorder with no recursion at all.

```python runnable id=iterative-preorder
tree = (
    "d",
    ("b", ("a", None, None), ("c", None, None)),
    ("f", ("e", None, None), ("g", None, None)),
)

def preorder_iterative(root, trace=False):
    out = []
    stack = [root] if root is not None else []
    while stack:
        if trace:
            print("  stack:", [n[0] for n in stack])
        node = stack.pop()
        out.append(node[0])
        # Right first, so left comes off the stack first.
        if node[2] is not None:
            stack.append(node[2])
        if node[1] is not None:
            stack.append(node[1])
    return out

print(preorder_iterative(tree, trace=True))
```

Read the trace. The stack never holds "work in progress" — it holds **subtrees
nobody has looked at yet**. That is exactly what the recursive version's pending
frames held: each frame that had already appended its value was sitting there to
remember one thing, which right subtree still needed visiting.

The pushing order is the part that looks backwards. A stack reverses, so to pop
the left child first you have to push it last.

Inorder is harder, and the reason is worth stating precisely: in preorder you
are finished with a node the moment you pop it, but in inorder you must return
to a node *after* its left subtree completes. So the loop needs two phases.

```python runnable id=iterative-inorder
tree = (
    "d",
    ("b", ("a", None, None), ("c", None, None)),
    ("f", ("e", None, None), ("g", None, None)),
)

def inorder_iterative(root):
    out, stack, node = [], [], root
    while stack or node is not None:
        while node is not None:      # descend left, remembering the way back
            stack.append(node)
            node = node[1]
        node = stack.pop()           # nothing further left: this node is next
        out.append(node[0])
        node = node[2]               # now do its right subtree
    return out

print(inorder_iterative(tree))
```

The inner `while` is the descent. The stack holds the ancestors you still owe a
visit to — which is precisely the chain of frames a recursive `inorder` would
have open at the same moment. Same stack, different storage.

:::insight{title="Why this is worth the effort"}
Beyond the interview, there are two real reasons to know the loop form. Python's
recursion limit is 1000 by default, so a tree that has degenerated into a chain
of 5,000 nodes — the exact failure mode of the next lesson — crashes a recursive
traversal and does not touch the iterative one. And a materialised stack can be
saved: that is how a database cursor pauses mid-index-scan, returns a page of
rows, and resumes later. You cannot pause a call stack.
:::

:::checkpoint{id=cp-stack rubric="the stack holds subtrees not yet visited,it is the same information the call stack held,push right before left because a stack reverses"}
Without scrolling back: what is in the stack during an iterative preorder, and
why is the right child pushed before the left one?
:::

## The fourth traversal changes one word

Level order visits every node at depth 1, then every node at depth 2, and so on.
The code is the iterative preorder with the stack replaced by a queue.

```python runnable id=level-order
from collections import deque

tree = (
    "d",
    ("b", ("a", None, None), ("c", None, None)),
    ("f", ("e", None, None), ("g", None, None)),
)

def level_order(root):
    out = []
    queue = deque([root] if root is not None else [])
    while queue:
        node = queue.popleft()       # popleft, not pop — the only real change
        out.append(node[0])
        if node[1] is not None:
            queue.append(node[1])
        if node[2] is not None:
            queue.append(node[2])
    return out

print(level_order(tree))
```

Stack: go deep before wide. Queue: go wide before deep. Nothing else in the
function moved. Hold on to that, because in the graphs stage the same swap turns
depth-first search into breadth-first search, and it will be the same two lines.

:::pitfall{title="`list.pop(0)` is not a queue"}
`deque.popleft()` is constant time. `list.pop(0)` shifts every remaining element
down one slot, so a level-order traversal built on a list is quadratic in the
number of nodes. It gives the right answer on your six-node test tree and falls
over on real data — the accidentally-quadratic loop from Stage 1, wearing a hat.
:::

::::track{depth=interview}
## Recognising this in an interview

Tree questions are asked far more often than trees are implemented, because a
tree traversal is the smallest problem that shows whether you can hold a
recursive invariant in your head.

Three recognition triggers, and what each one is really asking:

- **"Do it without recursion."** They want to know whether you understand what
  recursion was doing. Say the sentence out loud — "I'll keep the pending
  subtrees on an explicit stack, which is what the call stack was holding" —
  and then write the loop.
- **"What if the tree is very deep?"** This is the same question in disguise.
  A skewed tree of $n$ nodes has depth $n$, so recursion is $O(n)$ stack frames
  and will blow the limit. Iterative traversal uses heap memory instead, which
  is far larger.
- **"Return the values in sorted order."** Inorder — but only if it is a
  *search* tree. Ask. If the interviewer says it is an arbitrary binary tree,
  inorder gives you nothing and you need a sort.

The trade to say out loud: recursion costs you $O(h)$ stack frames and buys
clarity; the explicit stack costs you $O(h)$ heap and buys you control over
depth and the ability to pause. On a balanced tree $h = O(\log n)$ and nobody
cares. On a degenerate one $h = n$ and it is the whole problem.

:::interview{title="The follow-up"}
"Can you do it in $O(1)$ extra space?" is the trap-door question. The answer is
Morris traversal: temporarily rewrite the unused right pointers of predecessor
nodes to thread the tree, then undo them on the way back. You are not expected
to produce it cold. You *are* expected to know it exists and that the price is
mutating the tree during the walk, which makes it unusable if anything else can
read the tree concurrently.
:::
::::

:::exercise{ref=traversal-order}
:::

:::exercise{ref=iterative-inorder}
:::

:::quiz{id=quiz-l01 passing=2}
- id: q1
  prompt: "In an iterative preorder traversal, what does the stack contain?"
  options:
    - "The values already visited, so they can be reversed at the end."
    - "Subtrees that have not been visited yet — the same pending work the call stack held."
    - "The path from the root to the current node, and nothing else."
    - "One entry per level of the tree, reused as the traversal descends."
  answerIndex: 1
  explanation: >-
    Each push records a subtree nobody has looked at. That is exactly what a
    recursive call's pending frame was remembering. The path-to-current-node
    answer describes the *inorder* stack, not the preorder one — a real
    difference between the two loops, and a good reason to write both.
- id: q2
  prompt: "You need to compute the size of every subtree and store it on each node. Which traversal?"
  options:
    - "Preorder — the node is processed before its children."
    - "Inorder — it visits nodes in a natural order."
    - "Postorder — the node's answer depends on both children's answers."
    - "Level order — it processes the tree one depth at a time."
  answerIndex: 2
  explanation: >-
    A subtree's size is 1 plus both children's sizes, so both children must be
    finished first. That is the definition of postorder. Preorder would ask for
    the children's answers before computing them, and level order visits parents
    before children, which is the wrong direction for a bottom-up computation.
- id: q3
  prompt: "You have an iterative preorder traversal that uses a stack. You replace the stack with a queue and change nothing else. What do you get?"
  options:
    - "Postorder traversal."
    - "Inorder traversal."
    - "Level-order traversal."
    - "The same preorder, because the queue holds the same nodes."
  answerIndex: 2
  explanation: >-
    A stack takes the most recently pushed node, so the traversal dives; a queue
    takes the oldest, so it finishes each depth before starting the next. Same
    code, same nodes, different container — and the same swap turns DFS into BFS
    on a graph.
:::
