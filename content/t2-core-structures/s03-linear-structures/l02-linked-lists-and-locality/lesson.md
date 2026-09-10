---
id: t2/s03/l02
title: Linked lists, and the traversal they lose
tier: t2-core-structures
stage: s03-linear-structures
status: published
estimatedMinutes: 45
objectives:
  - Build singly, doubly, and circular linked lists, and say what the extra pointer buys in each case.
  - Explain why a linked list and an array have the same asymptotic traversal cost and very different real cost.
  - Name the workload where a linked list genuinely wins, and the one where it never does.
prerequisites:
  - t1/s01/l02
  - t2/s03/l01
misconceptions:
  - "**\"Linked lists are faster for insertion.\"** Insertion *given a pointer to the position* is O(1). Finding the position is O(n), and you almost always have to find it. An array's insertion is O(n) too — the difference is that the array's O(n) is a `memmove` running at memory bandwidth and the list's O(n) is a chain of dependent cache misses."
  - "**\"Same big-O means same speed.\"** Traversing 200,000 nodes and 200,000 array slots are both O(n). Measured below, the scattered chain takes about seven times as long. Big-O deliberately hides the constant, and here the constant is the memory hierarchy."
  - "**\"A doubly linked list is just a convenience.\"** It is what makes *deletion given a node* O(1). With only forward links you cannot unlink a node you are standing on, because you cannot reach its predecessor — which is why every LRU cache is a doubly linked list."
  - "**\"Python's list is a linked list.\"** It is a dynamic array of pointers. `collections.deque` is not a linked list either — it is a doubly linked list *of fixed-size blocks*, which is a deliberate hybrid to get block locality back."
masteryChecklist:
  - I can draw the pointer updates for inserting and deleting a node in a doubly linked list, including at the head and tail.
  - I can explain a cache line and say why it makes array traversal faster than list traversal at equal big-O.
  - I can name why a circular list with a sentinel removes most of the special-case branches.
  - Given a workload description, I can say whether a linked list is the right answer and defend it on constants rather than asymptotics.
runtimes:
  - engine: python
---

A linked list gives up the one thing an array is built on: you can no longer
compute where element `i` lives. In exchange you get a structure that never has
to move an element to make room for another, and that can splice a node out of
the middle without touching anything else.

That is a real trade, and it is a much worse trade than it looks on paper.

## The three shapes

Every linked list is nodes plus links. What varies is how many links each node
has, and whether the last one points at anything.

| Shape | Each node holds | Bought you | Cost |
| --- | --- | --- | --- |
| singly | `value`, `next` | one pointer per node | can only move forward |
| doubly | `value`, `next`, `prev` | O(1) delete given a node; backwards walks | two pointers per node |
| circular | tail's `next` points at the head | no "end" to special-case; round-robin | must count, or you loop forever |

```python runnable id=three-shapes
class Node:
    __slots__ = ("value", "next", "prev")

    def __init__(self, value):
        self.value = value
        self.next = None
        self.prev = None


def link_doubly(values):
    """Return (head, tail) of a doubly linked chain."""
    head = tail = None
    for value in values:
        node = Node(value)
        if head is None:
            head = tail = node
        else:
            node.prev = tail
            tail.next = node
            tail = node
    return head, tail


head, tail = link_doubly(["a", "b", "c", "d"])

# Delete "c" knowing only the node itself — this is the doubly linked payoff.
target = head.next.next
target.prev.next = target.next
target.next.prev = target.prev

node, forwards = head, []
while node is not None:
    forwards.append(node.value)
    node = node.next

node, backwards = tail, []
while node is not None:
    backwards.append(node.value)
    node = node.prev

print("forwards: ", forwards)
print("backwards:", backwards)
```

Those two lines that delete `c` are the entire argument for doubly linked lists.
They run in constant time, they do not depend on the length, and there is no
version of them for a singly linked list — with only `next`, you cannot reach
the node behind you, so you cannot repair the chain.

:::pitfall{title="The two lines are wrong at the ends"}
`target.prev.next` raises `AttributeError` when `target` is the head, and
`target.next.prev` raises when it is the tail. Real implementations either write
four branches or add a **sentinel** node that is permanently present and never
holds data, so that head and tail are ordinary interior nodes. The sentinel is
almost always the better choice: branches you never write are branches you never
get wrong.
:::

## The measurement that matters

Traversing an array and traversing a linked list are both O(n). Run them.

```python runnable id=pointer-chasing
import random, time

N = 200_000


class Cell:
    __slots__ = ("value", "next")

    def __init__(self, value):
        self.value = value
        self.next = None


def chain(order):
    """Link N cells together, visiting them in `order`."""
    cells = [Cell(i) for i in range(N)]
    for a, b in zip(order, order[1:]):
        cells[a].next = cells[b]
    return cells[order[0]]


def sum_array(values):
    total = 0
    for value in values:
        total += value
    return total


def sum_chain(head):
    total = 0
    node = head
    while node is not None:
        total += node.value
        node = node.next
    return total


in_order = list(range(N))
scattered = list(range(N))
random.Random(7).shuffle(scattered)

cases = [
    ("array", sum_array, list(range(N))),
    ("chain, linked in allocation order", sum_chain, chain(in_order)),
    ("chain, linked in scattered order", sum_chain, chain(scattered)),
]
for label, fn, arg in cases:
    start = time.perf_counter()
    fn(arg)
    print(f"{label:>35}: {(time.perf_counter() - start) * 1000:7.1f} ms")
```

Three traversals, same length, same O(n), same number of additions. On the
machine this lesson was written on the array takes about 2.5 ms, the chain
linked in allocation order about 4 ms, and the scattered chain about 17 ms.

The interesting comparison is not array against chain. It is **chain against
chain**. Identical code, identical structure, identical instruction count — the
only difference is the order the nodes happen to sit in memory. That rules out
every explanation except memory layout.

## Why the memory hierarchy decides this

The CPU does not read one word at a time. It reads a **cache line** — 64 bytes,
eight machine words on a 64-bit system — and keeps it in L1. It also runs a
**prefetcher** that watches your access pattern, notices you are walking forward
at a constant stride, and starts fetching lines before you ask.

Walking an array does both of those things right by accident. One cache miss
brings in eight slots; the prefetcher sees the stride and the next lines are
already in flight before you need them. You pay one memory latency for every
eight elements, and even that is hidden.

Walking a scattered chain defeats both. Each node is at an address you cannot
know until you have *read the previous node*, so there is nothing for the
prefetcher to predict, and no two consecutive nodes are likely to share a line.
Every step is a full round trip to memory, and the round trips cannot overlap
because each depends on the last. This is called a **dependent load chain**, and
it is the worst access pattern a modern CPU has.

The numbers involved are not subtle:

| Where the data is | Roughly how long |
| --- | --- |
| L1 cache | ~1 ns |
| L3 cache | ~15 ns |
| Main memory | ~80 ns |

A traversal that hits L1 and one that goes to DRAM every step differ by a factor
of fifty in the load itself. Asymptotic analysis counts both as one step.

:::insight{title="What this does to the advice"}
"Use a linked list when you insert a lot" is advice from an era when arithmetic
was expensive and memory was flat. On current hardware, arrays win far more
often than the asymptotics suggest — including at insertion, up to surprisingly
large sizes, because `memmove` runs at gigabytes per second and a cache miss
does not.

Linked structures still win where the trade is genuine: you hold a direct
pointer to the position, the elements are large enough that moving them is the
real cost, or the collection is being spliced rather than scanned. An LRU cache
is the canonical case, and it is a doubly linked list for exactly the reason
above — deletion given a node has to be O(1).
:::

:::checkpoint{id=cp-locality rubric="both traversals are order n,the difference is cache lines and prefetching,a chain of dependent loads cannot be predicted"}
Two chains of 200,000 nodes traverse at very different speeds. The code is
identical. Explain the difference to someone who knows big-O and has not thought
about hardware.
:::

## The relational counterpart: the secondary-index lookup

Pointer chasing has an exact analogue one floor up, and it has a name: the
**index lookup with row fetch**.

A secondary index stores `(indexed_column, row_pointer)` sorted by the column.
Scanning the index is a contiguous, cache-friendly, prefetchable walk — an array
traversal. But every row you actually want lives somewhere else, and getting it
means following the pointer to a page that has nothing to do with the page
before it. That fetch is a cache miss with a disk or network attached.

This is why query planners refuse to use an index past a certain selectivity.
Below a few percent of the table, following pointers wins. Above it, the planner
switches to a **full scan** — reading every page in physical order, prefetching
happily — even though the scan touches far more rows. It has chosen the array
traversal over the pointer chase for the same reason your array beat the
scattered chain: sequential access is not a little faster than random access, it
is an order of magnitude faster.

::::track{depth=systems}
## What real systems do about it

Nobody who cares about speed ships a textbook linked list. Three fixes recur.

**Blocking.** Store many elements per node. `collections.deque` is a doubly
linked list of fixed-size blocks — 64 pointers per block in CPython — so you
follow one link per 64 elements instead of one per element, and each block is a
contiguous array you can prefetch. B-trees are the same idea taken to disk: a
node holds hundreds of keys so that one expensive fetch does hundreds of
elements' worth of work. **Unrolled linked list** is the general name.

**Arena allocation.** Allocate all the nodes from one contiguous block and link
them with 32-bit indices into that block instead of 64-bit pointers. Nodes are
now half the size, they are all near each other, and a freshly built list is
laid out in traversal order — which is precisely the "linked in allocation
order" case that was three times faster than the scattered one above. Every
serious graph and tree library does this.

**Not using a list at all.** A query engine that needs an ordered sequence of
rows does not build a linked list of row objects. It builds a **columnar
batch**: one contiguous array per column, a few thousand rows at a time. Arrow
record batches, DuckDB vectors, and ClickHouse blocks are all this. The reason
is exactly the measurement above — the engine wants every inner loop to be a
sequential scan over one type, so the prefetcher works and the loop vectorizes.

:::insight{title="The pattern behind all three"}
Each fix reintroduces contiguity somewhere. Blocking gets it inside the node,
arenas get it across nodes, columnar layout gets it across rows. When a linked
structure is fast in production, it is almost always because someone put an
array back into it.
:::
::::

:::exercise{ref=reverse-links}
:::

:::exercise{ref=nth-from-end}
:::

:::quiz{id=quiz-l02 passing=2}
- id: q1
  prompt: "Two 200,000-node chains are traversed with identical code. One is four times slower. What is the most likely cause?"
  options:
    - "The slow one has longer values, so the additions cost more."
    - "Its nodes are scattered in memory, so each step is a cache miss that cannot be prefetched."
    - "Python garbage-collects more often on the slow one."
    - "One of them is doubly linked and the extra pointer slows the walk."
  answerIndex: 1
  explanation: >-
    The instruction count is the same, so the difference has to come from the
    memory system. Nodes at unpredictable addresses defeat both the cache line
    and the prefetcher, and each load depends on the previous one, so the
    latencies cannot overlap.
- id: q2
  prompt: "Why can't you delete a node from a singly linked list in O(1) when you are given only that node?"
  options:
    - "You can — set the node's value to None."
    - "Because the predecessor's `next` must be repaired, and there is no way to reach the predecessor."
    - "Because the list has to be re-sorted afterwards."
    - "Because deletion always requires the head pointer."
  answerIndex: 1
  explanation: >-
    Unlinking means making the previous node point past this one, and a forward
    link gives you no way back. That single limitation is the whole reason
    doubly linked lists exist, and the reason an LRU cache uses one.
- id: q3
  prompt: "A query planner has an index on a column and estimates the filter matches 40% of the table. It chooses a full scan. Why?"
  options:
    - "The index must be corrupt or out of date."
    - "Because 40% of the rows means 40% of the index is useless."
    - "Because fetching that many rows through the index is random access, and a sequential scan of every page is cheaper than that many pointer chases."
    - "Because indexes only work on unique columns."
  answerIndex: 2
  explanation: >-
    Each index hit costs a random page fetch — the storage-layer version of a
    dependent load. Past a small selectivity, reading every page in physical
    order costs less in total than chasing that many pointers, even though the
    scan touches more rows.
:::
