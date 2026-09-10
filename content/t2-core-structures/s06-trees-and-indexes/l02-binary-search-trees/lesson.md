---
id: t2/s06/l02
title: Binary search trees, and how they degenerate
tier: t2-core-structures
stage: s06-trees-and-indexes
status: published
estimatedMinutes: 45
objectives:
  - State the BST ordering invariant as a property of subtrees and show a tree that satisfies the parent-child version but not it.
  - Implement search, insert, and delete — including the two-child case.
  - Demonstrate that inserting sorted data turns a BST into a linked list, and say what that costs.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"A BST just needs left child < node < right child.\"** That is the local version and it is not enough. The invariant is about whole subtrees: *every* value in the left subtree is smaller, *every* value in the right subtree is larger. A tree can satisfy the local rule at every node and still fail search, because search commits to a direction and never comes back."
  - "**\"BST operations are O(log n).\"** They are $O(h)$. On a balanced tree $h \\approx \\log_2 n$, which is where the claim comes from — but nothing in the insert algorithm produces balance. Feed it sorted data and $h = n$."
  - "**\"Deleting a node means finding something to put in its place, so pick either child.\"** Promoting a child breaks the invariant as soon as the node has two of them. The replacement has to be the inorder successor or predecessor, because those are the only two values that fit in the gap the deleted node leaves behind."
masteryChecklist:
  - Given a tree, I can say whether it is a valid BST and name the exact node that breaks it if not.
  - I can delete a node with two children and explain why the inorder successor is the right replacement.
  - I can predict the height of a BST built by inserting an already-sorted sequence, and say what that does to lookup cost.
runtimes:
  - engine: python
---

A binary search tree is one rule added to last lesson's node, and the rule buys
you a decision: at every node you can discard half the remaining tree without
looking at it. That is the entire idea. Everything else — insert, delete,
balance, B-trees, the index behind `CREATE INDEX` — is machinery to keep that
decision cheap.

The rule is also the first thing people state wrongly, so state it carefully.

## The invariant is about subtrees, not neighbours

> For every node, **every** value in its left subtree is less than the node's
> value, and **every** value in its right subtree is greater.

Compare that with the weaker "left child is smaller, right child is bigger".
Here is a tree that passes the weak rule at every single node and is not a
search tree.

```python runnable id=broken-invariant
# 10 has 5 on the left and 15 on the right: fine.
# 15 has 6 on the left and 20 on the right: also fine, locally.
# But 6 < 10 and it is sitting in 10's RIGHT subtree.
tree = (10, (5, None, None), (15, (6, None, None), (20, None, None)))

def search(node, target):
    """The standard descent: commit to a side and never look back."""
    while node is not None:
        value, left, right = node
        if target == value:
            return True
        node = left if target < value else right
    return False

def inorder(node):
    if node is None:
        return []
    return inorder(node[1]) + [node[0]] + inorder(node[2])

print("inorder walk    :", inorder(tree))
print("search finds 6  :", search(tree, 6))
```

`search` goes left at 10, because 6 < 10, and never sees the node holding 6. The
value is present and unreachable. That is what the subtree version of the
invariant is protecting: the descent is only correct if *going left* really does
mean *everything smaller lives here*.

:::insight{title="The one-line test for a valid BST"}
An inorder traversal of a valid BST is strictly increasing, and that is an
if-and-only-if. It is the cheapest correct check you can write, it is $O(n)$,
and it catches exactly the tree above — whose inorder is `5, 10, 6, 15, 20`.
:::

## Search and insert are the same walk

```python runnable id=insert-and-search
def bst_insert(node, value):
    """Return a new tree with `value` added. Duplicates are ignored."""
    if node is None:
        return (value, None, None)
    v, left, right = node
    if value < v:
        return (v, bst_insert(left, value), right)
    if value > v:
        return (v, left, bst_insert(right, value))
    return node

def inorder(node, out=None):
    out = [] if out is None else out
    if node is not None:
        inorder(node[1], out)
        out.append(node[0])
        inorder(node[2], out)
    return out

tree = None
for value in [50, 30, 70, 20, 40, 60, 80]:
    tree = bst_insert(tree, value)

print(inorder(tree))
```

Insert walks down exactly the path `search` would walk and hangs a new leaf off
the end of it. That is why the two cost the same, and it is also why the *shape*
of the tree is decided entirely by the order the values arrived in.

## Delete, and the case that has teeth

Removing a node splits into three cases by child count.

- **No children.** Detach it. Nothing was relying on it.
- **One child.** Promote the child. The subtree keeps the same range of values
  and the same relationship to everything above it, so the invariant holds.
- **Two children.** Neither child can be promoted: whichever you pick, the other
  subtree has nowhere legal to attach.

For the two-child case, the node's value has to be replaced by a value that
occupies the same position in sorted order — the **inorder successor** (the
smallest value in the right subtree) or, symmetrically, the inorder predecessor.
Copy the successor's value up, then delete the successor from the right subtree.
That recursive delete is guaranteed to be easy, because the leftmost node of a
subtree has no left child, so it lands in case one or case two.

```python runnable id=delete-two-children
def bst_delete(node, value):
    if node is None:
        return None
    v, left, right = node
    if value < v:
        return (v, bst_delete(left, value), right)
    if value > v:
        return (v, left, bst_delete(right, value))
    if left is None:
        return right
    if right is None:
        return left
    successor = right
    while successor[1] is not None:      # leftmost node of the right subtree
        successor = successor[1]
    return (successor[0], left, bst_delete(right, successor[0]))

def inorder(node, out=None):
    out = [] if out is None else out
    if node is not None:
        inorder(node[1], out)
        out.append(node[0])
        inorder(node[2], out)
    return out

def insert(node, value):
    if node is None:
        return (value, None, None)
    v, l, r = node
    if value < v:
        return (v, insert(l, value), r)
    if value > v:
        return (v, l, insert(r, value))
    return node

tree = None
for value in [50, 30, 70, 20, 40, 60, 80]:
    tree = insert(tree, value)

after = bst_delete(tree, 50)
print("before      :", inorder(tree))
print("delete 50   :", inorder(after))
print("new root is :", after[0])
```

The root's successor is 60, so 60 moves up and is removed from below. The
sequence stays sorted, which is the only evidence that matters.

:::pitfall{title="The successor is not always a leaf"}
The leftmost node of the right subtree has no *left* child. It may well have a
right child, and that child has to survive. Code that unlinks the successor
instead of recursively deleting it silently drops a whole subtree, and small
test trees will not catch it — you need a successor that owns a right child
before the bug shows up.
:::

:::checkpoint{id=cp-delete rubric="promoting a child breaks the invariant when there are two,the successor is the smallest value in the right subtree,it fits because it is the next value in sorted order"}
Explain, without code, why deleting a two-child node requires the inorder
successor rather than either of its children.
:::

## The failure mode: sorted input

Nothing in `bst_insert` looks at balance. The tree's shape is a fossil of the
insertion order, and one very common insertion order is the worst possible one.

```python runnable id=degenerate
import random

def bst_insert(node, value):
    if node is None:
        return (value, None, None)
    v, left, right = node
    if value < v:
        return (v, bst_insert(left, value), right)
    if value > v:
        return (v, left, bst_insert(right, value))
    return node

def height(node):
    # Iterative, because the sorted case is exactly deep enough to matter.
    best, stack = 0, [(node, 1)]
    while stack:
        n, d = stack.pop()
        if n is None:
            continue
        best = max(best, d)
        stack.append((n[1], d + 1))
        stack.append((n[2], d + 1))
    return best

values = list(range(500))
shuffled = values[:]
random.Random(7).shuffle(shuffled)

for label, order in (("sorted", values), ("shuffled", shuffled)):
    tree = None
    for value in order:
        tree = bst_insert(tree, value)
    print(f"{label:9s} height = {height(tree):3d}   (log2(500) is about 9)")
```

Sorted input gives height 500. Every insert went right, so the tree is a linked
list with extra pointers, and lookup is a linear scan wearing the costume of a
binary search.

This is not a contrived input. It is the single most likely input there is:
autoincrement primary keys, timestamps, sorted bulk loads, alphabetised names.
A structure whose worst case is triggered by *the most natural order your data
arrives in* is not usable without a fix — which is the next lesson.

:::insight{title="The SQL counterpart, stated early"}
Your database's B+ tree index is a search tree over the indexed column. If it
degenerated on sorted inserts, every table with an autoincrement id would have
an index that is a linked list, and `WHERE id = 12345` would be a full scan. It
does not, because a B+ tree rebalances on every insert. The reason indexes are
trustworthy is that somebody solved this exact problem, and lesson 3 is how.
:::

::::track{depth=interview}
## Recognising this in an interview

"Validate a BST" is asked constantly, and there are two correct answers with
different tells.

The **inorder answer**: walk inorder and check the sequence is strictly
increasing. Correct, $O(n)$, and easy to say in one sentence. Track only the
previous value, not the whole list, or your $O(1)$ extra space becomes $O(n)$.

The **range answer**: recurse carrying `(low, high)` bounds, tightening them on
the way down.

```python
def valid(node, low=None, high=None):
    if node is None:
        return True
    value, left, right = node
    if low is not None and value <= low:
        return False
    if high is not None and value >= high:
        return False
    return valid(left, low, value) and valid(right, value, high)
```

The range version is the one interviewers are usually fishing for, because
writing it means you have understood that the invariant is inherited from
*ancestors*, not only parents. It is also the version that short-circuits on the
first violation.

The trap in both: comparing a node only against its two children. That is the
broken tree from the top of this lesson, and it is the single most common wrong
answer to this question.

:::interview{title="The follow-up you should expect"}
"What is the complexity?" — $O(n)$ time either way, and $O(h)$ space. Then:
"what is $h$?" The honest answer is "$O(\log n)$ if the tree is balanced, $O(n)$
if it is not, and plain BST insert gives you no guarantee at all." Saying that
unprompted is what separates a memorised answer from an understood one.
:::
::::

:::exercise{ref=bst-insert-and-search}
:::

:::exercise{ref=bst-delete}
:::

:::quiz{id=quiz-l02 passing=2}
- id: q1
  prompt: "A tree has root 10, whose right child is 15, whose left child is 6. Every parent-child pair is correctly ordered. Is it a valid BST?"
  options:
    - "Yes — every node is greater than its left child and less than its right child."
    - "No — 6 is less than 10 but sits in 10's right subtree, so a search for 6 goes left and never finds it."
    - "Yes, but lookups are slower than usual."
    - "It cannot be decided without knowing the tree's height."
  answerIndex: 1
  explanation: >-
    The invariant constrains whole subtrees, not neighbouring pairs. Search
    commits to one side at each node, so a value on the wrong side is
    unreachable even though it is present. Its inorder walk gives 5, 10, 6, 15,
    20 — not increasing, which is the fastest way to see the problem.
- id: q2
  prompt: "You delete a node that has two children. Which value replaces it?"
  options:
    - "Its left child, because that subtree is already smaller."
    - "Its right child, because that subtree is already larger."
    - "The smallest value in its right subtree (the inorder successor), which is then deleted from below."
    - "The deepest leaf in the tree, to keep the height down."
  answerIndex: 2
  explanation: >-
    Only the inorder successor or predecessor occupies the same slot in sorted
    order, so only they can sit in the gap without breaking the invariant.
    Promoting a child leaves the other subtree with nowhere legal to attach. The
    deepest leaf has no ordering relationship to the gap at all.
- id: q3
  prompt: "You insert the integers 1 through 1,000,000 in ascending order into a plain BST. What is the cost of looking up 1,000,000 afterwards?"
  options:
    - "About 20 comparisons — log2 of a million."
    - "About 1,000,000 comparisons — every insert went right, so the tree is a chain."
    - "One comparison, because the largest value ends up at the root."
    - "It depends on the machine's cache size."
  answerIndex: 1
  explanation: >-
    Each value is larger than everything before it, so every insert walks the
    whole right spine and extends it. The result has height 1,000,000 and lookup
    is a linear scan. Sorted input is the ordinary case — autoincrement ids,
    timestamps, bulk loads — which is why unbalanced BSTs are not used in
    practice.
:::
