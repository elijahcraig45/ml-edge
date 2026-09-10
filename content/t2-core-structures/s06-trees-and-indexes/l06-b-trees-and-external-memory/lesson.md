---
id: t2/s06/l06
title: B-trees, and what changes when a node is a disk page
tier: t2-core-structures
stage: s06-trees-and-indexes
status: published
estimatedMinutes: 45
objectives:
  - State the external-memory cost model and explain why it counts block transfers rather than comparisons.
  - Compute the height of a B-tree from its fan-out and say why fan-out beats balance for on-disk structures.
  - Explain the two changes a B+ tree makes to a B-tree and what each one buys.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"A B-tree is a binary tree with more children.\"** It is that, but the interesting part is why. The node size is chosen to match the storage block, so that a node costs exactly one transfer. Change the block size and the right fan-out changes with it — the structure is defined by the hardware, not by the algorithm."
  - "**\"B-trees are faster because they are shorter.\"** They are shorter *and* they do more comparisons in total than a balanced BST would. What they minimise is the number of blocks touched, and on a device where one block transfer costs as much as ten thousand comparisons, that is the only count worth minimising."
  - "**\"The B in B-tree stands for binary.\"** It does not, and the distinction matters: a B-tree node holds many keys and has many children. Bayer never said what the B stood for."
masteryChecklist:
  - Given a page size and an entry size, I can compute the fan-out and the resulting tree height for a given row count.
  - I can say what a B+ tree stores in its internal nodes and why that raises the fan-out.
  - I can explain why range scans are cheap in a B+ tree and awkward in a plain B-tree.
runtimes:
  - engine: python
---

Everything up to here counted comparisons, because in memory a comparison is
the unit of work. Move the tree to disk — or to an SSD, or across a network to
object storage — and that stops being true by four orders of magnitude.

An NVMe read takes on the order of 100 microseconds and returns a whole block
whether you wanted one byte or all 8,192. In that time a CPU performs roughly a
hundred thousand comparisons. So the cost model changes:

> **External-memory model.** Work is measured in *block transfers* between slow
> storage and fast memory. Computation inside a block that is already in memory
> is free.

Under that model, an AVL tree is a bad structure, and not by a small margin.

## Why a balanced binary tree is the wrong shape for disk

100 million rows in an AVL tree gives a height of about 27. Each step follows a
pointer to a node that has no reason to be near the previous one, so each step
is its own block transfer: **27 transfers per lookup**, and 26 of the blocks
were fetched to read a single key each.

The fix is not a better balancing rule. It is to make the node as big as the
block, so that one transfer delivers hundreds of keys instead of one.

```python runnable id=fanout
page_bytes = 8192
entry_bytes = 16          # an 8-byte key plus an 8-byte child pointer

fanout = page_bytes // entry_bytes
rows = 100_000_000

def levels(rows, fanout):
    """Levels needed to address `rows` entries with this fan-out."""
    height, capacity = 1, fanout
    while capacity < rows:
        capacity *= fanout
        height += 1
    return height

print(f"entries per {page_bytes}-byte page: {fanout}")
for f in (2, 16, 128, fanout):
    print(f"  fan-out {f:>4}: {levels(rows, f):>2} levels for {rows:,} rows")
```

Fan-out 512 gives three levels. Height falls as $\log_B n$, so multiplying the
fan-out by 256 divides the height by $\log_2 256 = 8$.

Three levels is the number that matters, and in practice it is better than
three. The root is one page and lives in the buffer pool permanently. The
second level of a three-level tree is 512 pages — four megabytes — and is
almost always cached too. So a point lookup on a hundred million rows is
typically **one** physical read.

:::insight{title="Fan-out is bought with a bigger node, and the node is free"}
Increasing the fan-out costs nothing on disk, because you were transferring the
whole block regardless. Searching within the node — a binary search over 512
keys, nine comparisons — happens in memory and does not appear in the cost model
at all. That is the trade in one sentence: **do more work per block so that you
touch fewer blocks.**
:::

## What a B-tree actually guarantees

A B-tree of minimum degree $t$ maintains:

- every node except the root holds between $t-1$ and $2t-1$ keys;
- a node with $k$ keys has exactly $k+1$ children;
- **all leaves are at the same depth**.

That last one is the balance guarantee, and it is enforced by a mechanism quite
unlike AVL's. There are no rotations. When an insert overflows a node, the node
**splits** in half and its middle key is pushed up into the parent. If that
overflows the parent, it splits too. If the split reaches the root, the root
splits and a new root is created above it.

That is why B-trees are balanced by construction: **the tree only ever grows at
the root**, so every leaf gains a level at the same moment. Sorted input — the
case that destroys a plain BST — produces a perfectly good B-tree, because the
rightmost node splits, then splits again, and the depth never becomes lopsided.

:::checkpoint{id=cp-split rubric="a full node splits and pushes its middle key up,splits can cascade to the root,the tree gains height only at the root so all leaves stay level"}
Describe what happens when you insert into a full B-tree node, and explain why
that mechanism keeps every leaf at the same depth.
:::

## B+ trees: two changes, both about scans

Almost every database index is a **B+ tree**, which differs from a B-tree in
exactly two ways.

**1. Values live only in the leaves.** Internal nodes hold separator keys and
child pointers, nothing else. A B-tree that stored an 8-byte key with a 200-byte
row inline would fit 39 entries per page; strip the payload out and the same
page holds 512 separators. Higher fan-out, shorter tree, and the internal levels
— the ones you want cached — become small enough to cache.

**2. The leaves are linked left to right.** Once a search lands on a leaf, the
next key in order is one pointer away, and the one after that is usually in the
same page.

The second change is what makes `WHERE created_at BETWEEN ... AND ...` cheap:
descend once to the first matching key, then walk leaves sequentially — which is
also the access pattern storage is fastest at. In a plain B-tree the successor
of a leaf key may be an ancestor several levels up, so a range scan bounces
around the tree.

```text
        [ 30 | 60 ]                     internal: separators only
       /     |     \
 [10 20]<->[30 40 50]<->[60 70]         leaves: all the data, linked
```

An ordered index scan is: descend to the first leaf, then follow the arrows.
That is the same walk your trie did over the subtree under a prefix, and the
same walk the `ORDER BY` in lesson 7 gets for free when the index already has
the rows in order.

::::track{depth=systems}
## What a column store does instead

DuckDB, Parquet, ClickHouse, BigQuery and Snowflake mostly do not build a B+
tree per column. They store each column separately, in large chunks — Parquet
calls them row groups, DuckDB calls them row groups too, at 122,880 rows each —
and they keep a **zone map** for every chunk: the minimum and maximum value of
each column within it, plus a null count.

That turns a predicate into a skip test. For `WHERE size_kb > 400`, the reader
looks at each row group's stored maximum and skips the entire group without
reading it if the maximum is 400 or less. This is sometimes called a
*negative index*: it never tells you where a row is, only where it cannot be.

The economics are the opposite of a B+ tree's:

| | B+ tree index | Zone maps |
| --- | --- | --- |
| Space | $O(n)$, often 10–30% of the table | two values per chunk per column — free |
| Write cost | every insert updates the tree | statistics recomputed per chunk at write |
| Point lookup | 1–3 page reads out of a billion rows | scan every chunk the predicate cannot exclude |
| Depends on physical order | no | **completely** |

That last row is the whole story. If the rows were written in random order, the
minimum and maximum of every chunk span nearly the whole domain, no chunk can be
excluded, and the zone maps do nothing at all. If the table was sorted by that
column on the way in, each chunk covers a narrow band and a selective predicate
touches one or two chunks.

So the column store's version of "choose your indexes" is **choose your sort
order on write** — one physical ordering per table, and it is why every warehouse
guide tells you to cluster on the column you filter by most. Snowflake calls it a
clustering key, BigQuery calls it clustering, ClickHouse calls it the primary
key even though it is not unique and does not identify anything.

This also explains the plan detail from lesson 5, and it is the same lesson
about sargability with different hardware underneath. A pushed-down filter like
`version>='1.'` can be compared against a chunk's min and max, so whole chunks
are skipped. A filter like `(substr(version, 1, 2) = '1.')` cannot: the engine
has no way to evaluate `substr` against a min/max pair, so every chunk is read
and every row is tested. On a row store an unsargable predicate loses you the
index; on a column store it loses you the zone maps. The advice does not change.
::::

:::exercise{ref=btree-lookup}
:::

:::quiz{id=quiz-l06 passing=2}
- id: q1
  prompt: "Why does a B-tree use nodes with hundreds of keys instead of two?"
  options:
    - "Because comparing many keys at once is faster than comparing two."
    - "Because a node is sized to one storage block, so one transfer delivers hundreds of keys and the height falls as log base B."
    - "Because large nodes need fewer rotations to stay balanced."
    - "Because the CPU cache line is 512 bytes wide."
  answerIndex: 1
  explanation: >-
    The block is transferred whole whether you read one key or all of them, so
    the cost model counts blocks, not comparisons. Filling the block raises the
    fan-out B and drops the height to log_B(n) — three levels instead of 27 for
    a hundred million rows. The extra in-memory comparisons inside a node are
    free by comparison. B-trees have no rotations at all.
- id: q2
  prompt: "What do the internal nodes of a B+ tree contain?"
  options:
    - "The same rows as the leaves, duplicated for faster access."
    - "Separator keys and child pointers only — no row data, which is what raises the fan-out."
    - "Pointers to the table's data pages, one per row."
    - "Nothing; a B+ tree has only leaves."
  answerIndex: 1
  explanation: >-
    Stripping the payload out of the internal levels is the point: the same page
    holds many more separators, so the tree is shorter and the upper levels are
    small enough to stay cached. The data lives once, in the leaves, which are
    linked so a range scan can walk them in order.
- id: q3
  prompt: "A B-tree node overflows during an insert. What happens?"
  options:
    - "The node rotates with its sibling, as in an AVL tree."
    - "The node splits in half and its middle key moves up into the parent, possibly cascading to the root."
    - "The tree is rebuilt from scratch below that point."
    - "The extra key is placed in an overflow page chained to the node."
  answerIndex: 1
  explanation: >-
    Splitting and promoting the middle key is the B-tree's entire rebalancing
    mechanism — no rotations exist. Because a cascade can only ever add a level
    at the root, every leaf gains depth simultaneously and all leaves stay at
    the same level. Overflow pages are a hash-table technique, not a B-tree one.
:::
