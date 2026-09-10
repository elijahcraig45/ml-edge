---
id: t2/s06/l05
title: Tries, and why LIKE 'abc%' is fast
tier: t2-core-structures
stage: s06-trees-and-indexes
status: published
estimatedMinutes: 45
objectives:
  - Implement a trie and explain why lookup cost depends on the key length, not the number of keys.
  - Enumerate every key under a prefix by walking the subtree rooted at that prefix.
  - Explain why a prefix predicate becomes a range scan on a sorted index and a suffix predicate cannot.
prerequisites:
  - t1/s01/l02
misconceptions:
  - "**\"A trie is faster than a hash set.\"** For exact membership it is usually slower — a hash set is one hash and one probe, a trie is one dict lookup per character. What a trie can do that a hash set cannot do at all is answer *prefix* questions, because a hash deliberately destroys the relationship between similar keys."
  - "**\"`LIKE '%abc'` is slow because of the wildcard.\"** The wildcard's *position* is the whole story. `LIKE 'abc%'` is a contiguous range of an ordered index and costs a seek plus a scan of the matches; `LIKE '%abc'` is not a range in any ordering of the keys, so nothing but a full scan will find them."
  - "**\"Every node in a trie is a word.\"** A node is a *prefix*. `arrowkit` puts seven internal nodes in the trie that are not words. Forgetting the end-of-word flag makes `contains('arrow')` return true for a trie holding only `arrowkit`, and small tests rarely catch it."
masteryChecklist:
  - I can say what a trie lookup costs in terms of key length and alphabet size, without reference to the number of stored keys.
  - I can enumerate every key under a prefix and say why the walk starts at the prefix node rather than the root.
  - Given a LIKE pattern, I can say whether an ordered index can serve it and rewrite it as an explicit range when it can.
runtimes:
  - engine: python
  - engine: duckdb
    datasetId: package-registry
---

A hash set answers "is `arrowkit` in here?" in constant time and cannot answer
"what starts with `arr`?" at all. That is not an implementation gap. A hash
function is *designed* to scatter similar keys, so by the time the data is in
the table, `arrowkit` and `arrowlib` have nothing to do with one another.

Prefix questions need a structure that keeps related keys together. There are
two, they look nothing alike, and they are the same idea.

## A trie stores prefixes, not words

Each node is a prefix; each edge is one character. The word `arrow` is the path
`a → r → r → o → w`, and every node along it is a real prefix that other words
may share.

```python runnable id=trie-basics
class Node:
    __slots__ = ("children", "is_word")
    def __init__(self):
        self.children = {}
        self.is_word = False

root = Node()

def insert(word):
    node = root
    for ch in word:
        node = node.children.setdefault(ch, Node())
    node.is_word = True

def descend(text):
    """The node reached by following `text`, or None."""
    node = root
    for ch in text:
        if ch not in node.children:
            return None
        node = node.children[ch]
    return node

for word in ["arrow", "arrowkit", "array", "bit", "bitmask"]:
    insert(word)

node = descend("arr")
print("'arr' is a stored word :", node is not None and node.is_word)
print("'arr' is a prefix      :", node is not None)
print("children of 'arr'      :", sorted(node.children))
```

`arr` exists as a node and is not a word. That is the distinction the `is_word`
flag exists for, and dropping it is the most common trie bug: without it,
`contains("arrow")` is true for a trie that only ever stored `arrowkit`.

Note what the cost of `descend` depends on. It is one dict lookup per character
— five for `arrow` — and it does not mention the number of stored words
anywhere. A trie holding five words and a trie holding fifty million answer
`descend("arrow")` in the same five steps.

## The prefix question is a subtree

Once you are standing at the prefix node, every word under that prefix is in its
subtree, and nowhere else. Enumeration is a traversal of a subtree you have
already located.

```python runnable id=trie-prefix
class Node:
    __slots__ = ("children", "is_word")
    def __init__(self):
        self.children = {}
        self.is_word = False

root = Node()

def insert(word):
    node = root
    for ch in word:
        node = node.children.setdefault(ch, Node())
    node.is_word = True

for word in ["arrow", "arrowkit", "array", "arrayfire", "bit", "bitmask"]:
    insert(word)

def words_with_prefix(prefix):
    node = root
    for ch in prefix:
        if ch not in node.children:
            return []
        node = node.children[ch]

    out, stack = [], [(prefix, node)]
    while stack:                      # the explicit stack from lesson 1
        text, current = stack.pop()
        if current.is_word:
            out.append(text)
        for ch, child in current.children.items():
            stack.append((text + ch, child))
    return sorted(out)

print("arr ->", words_with_prefix("arr"))
print("arra ->", words_with_prefix("arra"))
print("z ->", words_with_prefix("z"))
```

The cost is $O(|p|)$ to find the node plus $O(\text{output})$ to walk it. There
is no term for the size of the dictionary — a trie over the entire English
language answers `arr` by touching only the words that begin with `arr`.

:::pitfall{title="What a trie costs you"}
Space. A node per distinct prefix means storing `international` and
`internationalisation` costs 20 nodes, each a Python dict. For a large word
list a trie can use an order of magnitude more memory than the strings it holds.

The standard fix is a **radix tree** (a PATRICIA trie): collapse every chain of
single-child nodes into one edge labelled with the whole substring. Lookup is
unchanged; the node count drops to $O(\text{number of keys})$. Every serious
trie in production is a radix tree, and IP routing tables are the canonical
example.
:::

:::checkpoint{id=cp-prefix rubric="the prefix node roots a subtree,every word under the prefix is in it,cost is prefix length plus output size"}
Why does enumerating words under a prefix not depend on how many words the trie
holds in total?
:::

## The same property, in a sorted structure

Now the other representation. Sort the keys and look at what a prefix does to
the ordering:

```text
array
arrayfire
arrow          <- every string starting with "arr" is contiguous
arrowkit
bit
bitmask
```

Strings starting with `arr` form an unbroken block, and they must, because
string comparison reads left to right: anything beginning with `arr` sorts at or
after `"arr"` and strictly before `"ars"` — the same prefix with its last
character bumped by one. So

$$
\texttt{s LIKE 'arr\%'} \quad\Longleftrightarrow\quad
\texttt{'arr'} \le s < \texttt{'ars'}
$$

That is a **range**, and a range is precisely what a sorted structure — a
B-tree, an index, a sorted array — answers with a seek followed by a scan.

The trie and the sorted index are storing the same fact in two shapes. The trie
makes shared prefixes explicit as shared paths; the sorted index leaves them
implicit as adjacency. Both let you jump to a prefix and read forward.

Your database performs that rewrite for you. Here are the two filters DuckDB
actually plans for the same predicate written two ways — the first is a prefix
`LIKE`, the second wraps the column in a function:

```text
WHERE version LIKE '1.%'
  ->  Filters: version>='1.' AND version<'1/'      (a range)

WHERE substr(version, 1, 2) = '1.'
  ->  Filters: (substr(version, 1, 2) = '1.')      (a function, per row)
```

The first is bounds an index can seek to. The second has to be evaluated on
every row, because the engine knows nothing about what `substr` does to the
ordering. Same rows, different amount of the table read. Verify the rewrite is
faithful:

```sql runnable id=prefix-is-a-range dataset=package-registry
SELECT
  count(*) FILTER (WHERE version LIKE '1.%')                  AS via_like,
  count(*) FILTER (WHERE version >= '1.' AND version < '1/')  AS via_range,
  count(*) FILTER (WHERE version LIKE '%.0')                  AS suffix_match
FROM versions;
```

Ten rows either way — `'1/'` is `'1.'` with `.` bumped to the next character,
which is the successor bound in the formula above.

## Why the leading wildcard is different

`LIKE '%.0'` matches 21 rows in that same table, and no ordering of the version
strings puts those 21 next to each other. A suffix says nothing about the
leading characters, so it says nothing about sort position. There is no range,
so there is no seek, so there is a full scan — and that is a property of the
question, not a limitation of the index.

Three real fixes, all of which work by *making the suffix into a prefix*:

- **Store the reverse.** Keep a `reverse(name)` column, index that, and turn
  `name LIKE '%kit'` into `reversed_name LIKE 'tik%'`. Postgres does this with a
  single expression index and no extra column.
- **Index every trigram.** Break each string into overlapping three-character
  pieces and index those, so `%bitmas%` becomes a lookup of `bit`, `itm`,
  `tma`, `mas`. This is Postgres's `pg_trgm`.
- **Use a real text index.** Full-text and search engines invert the problem
  entirely, mapping tokens to documents.

Each one adds a structure and a maintenance cost. None of them makes the
original index able to answer the original question — because it cannot.

:::insight{title="The rule to carry forward"}
An ordered index can answer any predicate that translates into *a contiguous
range of the indexed value*. Equality, `BETWEEN`, `<`, `>`, and a prefix `LIKE`
all do. A leading wildcard, a function wrapped around the column, and an `OR`
across unrelated columns all do not. Lesson 7 is that sentence applied to real
query plans, and the word for it is **sargable**.
:::

:::exercise{ref=trie-autocomplete}
:::

:::exercise{ref=prefix-release-scan}
:::

:::quiz{id=quiz-l05 passing=2}
- id: q1
  prompt: "A trie holds only the word `arrowkit`. What does looking up `arrow` find?"
  options:
    - "Nothing — the path does not exist."
    - "A node, which is why the end-of-word flag matters: the node exists as a prefix but is not a stored word."
    - "The word `arrowkit`, because prefixes resolve to the nearest stored word."
    - "An error, because partial paths are not stored."
  answerIndex: 1
  explanation: >-
    Every character of every inserted word creates a node, so `arrow` is
    reachable. Only the flag distinguishes a prefix from a word. Code that
    treats "the path exists" as "the word is present" reports false positives
    for every prefix of every stored word.
- id: q2
  prompt: "Why can an ordered index serve `name LIKE 'arr%'` but not `name LIKE '%arr'`?"
  options:
    - "The trailing wildcard matches fewer rows, so the optimiser prefers it."
    - "A prefix defines a contiguous range — everything from 'arr' up to but not including 'ars' — while a suffix does not correspond to any range of the sort order."
    - "Leading wildcards are not supported by B-tree indexes in most engines."
    - "The leading wildcard forces the column to be cast to text first."
  answerIndex: 1
  explanation: >-
    String comparison reads left to right, so a shared prefix means adjacency in
    sort order and the match is one seek plus a scan. A suffix constrains the
    end of the string and leaves the sort position unconstrained, so the
    matching rows are scattered everywhere and only a full scan finds them.
- id: q3
  prompt: "You store fifty million words in a trie. What does looking up a five-letter word cost?"
  options:
    - "About 25 steps — log2 of fifty million."
    - "Five steps — one per character, independent of how many words are stored."
    - "Fifty million steps in the worst case."
    - "It depends on the alphabet size at each node."
  answerIndex: 1
  explanation: >-
    A trie descent follows one edge per character, so the cost is the key's
    length. The number of stored keys never enters it. Alphabet size affects how
    a single node's children are stored — a dict lookup here — but not the
    number of descents.
:::
