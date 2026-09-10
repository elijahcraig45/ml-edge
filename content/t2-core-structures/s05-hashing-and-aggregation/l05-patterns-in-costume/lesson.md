---
id: t2/s05/l05
title: Four interview problems, one data structure
tier: t2-core-structures
stage: s05-hashing-and-aggregation
status: published
estimatedMinutes: 45
objectives:
  - Recognise a hash-map problem from its wording rather than from its topic label.
  - Turn "equal under some relation" into a canonical key.
  - "Derive the prefix-sum-plus-hashmap counting argument, including why the map starts at `{0: 1}`."
  - Explain why an LRU cache needs both a hash map and a linked list, and what each one contributes.
prerequisites:
  - t2/s05/l04
misconceptions:
  - "**\"Subarray-sum-equals-k is a sliding window.\"** Only when every element is non-negative, because a window's sum is then monotone in its width and shrinking it always helps. With a single negative number the sum can fall below the target and climb back, so there is no valid shrink rule and the window approach silently misses answers."
  - "**\"`counts = {0: 1}` is an off-by-one fix.\"** It is a data point. The empty prefix has sum 0 and it has genuinely been seen once — before the first element. Without it, every subarray that starts at index 0 goes uncounted, which on `[3, -1, 2, -1, 3]` with $k = 3$ turns the answer 4 into 2."
  - "**\"Two-sum is trivially a dict, so there is nothing to get wrong.\"** Store the current value in the map before checking for its complement and an element pairs with itself: `two_sum([120, ...], 240)` returns `(0, 0)`. The check has to happen first. Interviewers ask about a target that is exactly twice an element for precisely this reason."
  - "**\"An LRU cache is just an ordered dict.\"** `OrderedDict` *is* the answer, and it is a hash map plus a doubly linked list underneath. If you cannot say what each half is for — the map gives $O(1)$ addressing, the list gives $O(1)$ reordering — then you have memorised an API rather than a design."
masteryChecklist:
  - Given a problem statement, I can spot the phrase that means "use a hash map".
  - I can explain why sum(i..j) = P[j+1] - P[i] turns a subarray question into a pair-counting question.
  - I can say what breaks in a two-sum solution that inserts before it checks.
  - I can name the two structures inside an LRU cache and the operation each one makes constant-time.
runtimes:
  - engine: python
---

Four problems that look unrelated. Two-sum is about arithmetic, group-anagrams
about strings, subarray-sum-equals-k about arrays, LRU cache about systems
design. They are the same problem: *make the answer computable by lookup instead
of by search*, and pay for it in memory.

The point of this lesson is not the four solutions. It is the recognition —
learning what a problem sounds like when a hash map is the answer, so that you
reach for one before you have finished reading.

## Two-sum, and the bug in it

"Find the two elements that add to the target." The naive answer checks every
pair. The real answer notices that once you fix one element, the other is
determined: you are not searching for a pair, you are searching for a *value*.

```python runnable id=two-sum
def two_sum(sizes, target):
    """Indices of the two release sizes that add to `target`, or None."""
    seen = {}                       # value -> the index it was seen at
    for i, size in enumerate(sizes):
        if target - size in seen:   # check FIRST
            return (seen[target - size], i)
        seen[size] = i              # then record
    return None

sizes = [120, 138, 190, 44, 61]
print("251 ->", two_sum(sizes, 251))   # 190 + 61
print("240 ->", two_sum(sizes, 240))   # only one 120, so there is no pair
```

Swap the two statements in the loop and the second call returns `(0, 0)`: the
120 at index 0 pairs with itself. Checking before recording is what encodes "the
partner must be a *different* element", and it costs nothing. Interviewers who
ask for a target equal to twice an element are testing exactly this line.

## Group anagrams, and the idea of a canonical key

"Group these words so that words made of the same letters are together." The
grouping relation is not equality, so you cannot use the words as keys. But you
can build something that *is* equal exactly when the relation holds.

```python runnable id=canonical-key
names = ["stop", "pots", "tops", "arrowkit", "opts", "kit"]

groups = {}
for name in names:
    key = "".join(sorted(name))     # the canonical form
    groups.setdefault(key, []).append(name)

for key, members in groups.items():
    print(f"{key:>10}  {members}")
```

That is the whole technique, and it generalises well past anagrams: a canonical
key turns "equal under some relation" into "equal", which is the only thing a
hash map understands. Case-insensitive grouping canonicalises with `.lower()`.
Grouping points by which cell of a grid they fall in canonicalises with integer
division. Deduplicating records that differ only in whitespace canonicalises
with a normaliser. Same move every time.

Sorting each word costs $O(k \log k)$ for a word of length $k$. The alternative
canonical form is a 26-element count tuple, which is $O(k)$ — worth saying out
loud in an interview, rarely worth writing, because $k$ is small and `sorted` is C.

:::checkpoint{id=cp-canonical rubric="a hash map can only compare keys with equality,a canonical form makes equal-under-the-relation into equal,the canonical form must be hashable"}
You need to group release artifacts that are identical apart from build
metadata (`1.4.2+build.7` and `1.4.2+build.9` are the same release). Say what
the canonical key is and what property it must have to be usable as a dict key.
:::

## Subarray sum equals k

This is the one worth deriving rather than memorising, because the derivation is
reusable and the code is not.

Define prefix sums $P_0 = 0$ and $P_{j} = a_0 + \cdots + a_{j-1}$. Then the sum
of the subarray from $i$ to $j$ inclusive is

$$\text{sum}(i \ldots j) = P_{j+1} - P_{i}.$$

So "how many subarrays sum to $k$" becomes "how many *pairs* $(i, j+1)$ with
$i < j+1$ satisfy $P_{j+1} - P_i = k$" — which is two-sum again, wearing an
array for a hat. Walk the prefix sums left to right; at each position ask how
many earlier prefix sums equal $P_{\text{now}} - k$; keep a count of every
prefix sum seen so far in a map.

```python runnable id=subarray-sum
def count_subarrays(nums, k):
    counts = {0: 1}          # the empty prefix: sum 0, seen once, before we start
    running = 0
    total = 0
    for x in nums:
        running += x
        total += counts.get(running - k, 0)
        counts[running] = counts.get(running, 0) + 1
    return total

def count_subarrays_without_the_seed(nums, k):
    counts = {}
    running = 0
    total = 0
    for x in nums:
        running += x
        total += counts.get(running - k, 0)
        counts[running] = counts.get(running, 0) + 1
    return total

nums = [3, -1, 2, -1, 3]
print("prefix sums:", [0] + [sum(nums[:i + 1]) for i in range(len(nums))])
print("answer:            ", count_subarrays(nums, 3))
print("without {0: 1}:    ", count_subarrays_without_the_seed(nums, 3))
print("the four subarrays:", [(i, j) for i in range(5) for j in range(i, 5) if sum(nums[i:j + 1]) == 3])
```

The seed is not a fudge. $P_0 = 0$ is a real prefix — the empty one — and it has
been seen exactly once before the loop begins. Drop it and you lose every
subarray that starts at index 0, which here is two of the four.

:::warning{title="Why this is not a sliding window"}
The array above contains a negative number, and that is fatal to the window
approach. A sliding window works when widening the window can only increase the
sum and narrowing it can only decrease it, so "sum too big, shrink from the
left" is a valid move. With negatives, shrinking can *increase* the sum, so
there is no rule that tells the window when to move, and any two-pointer
solution you write will be wrong on some input with a negative in it. If a
problem says "all elements are positive", the window is available and cheaper.
If it does not say so, it is a prefix-sum problem.
:::

The same skeleton — prefix aggregate, plus a map of aggregates already seen —
solves "longest subarray summing to k" (store the *first* index of each prefix
sum instead of a count), "subarray sum divisible by k" (key on
`running % k`), and "longest subarray with equal counts of two values" (key on
the running difference). Learn the skeleton, not the four variants.

## LRU cache: when one structure is not enough

An LRU cache needs two constant-time abilities at once:

- **find a key** — that is a hash map;
- **move an entry to the front, and drop the entry at the back** — that is a
  doubly linked list.

Neither structure does both. A list can be reordered in $O(1)$ given a node, but
finding the node takes a scan. A map finds in $O(1)$ but has no notion of
"least recently used". So you keep both, and the map's *values are the list's
nodes*:

```python
self.map = {}                 # key -> node
# node = [key, value, prev, next], threaded between a head and a tail sentinel
```

`get(key)`: look the node up in the map, unlink it, push it to the front, return
its value. `put(key, value)` on a full cache: the eviction victim is the node
before the tail sentinel, and its `key` field is what lets you delete the right
entry from the map — which is why the node stores the key as well as the value.
Without that back-reference you would have to search the map for the node, and
the whole design collapses.

The head and tail sentinels are worth the two extra objects. They mean unlink
and push never have to check for `None`, so there are no special cases for the
first or last element, and that is where the bugs would otherwise be.

:::insight{title="The general move"}
Whenever a problem needs *both* addressability and order, the answer is a hash
map pointing into an ordered structure. LRU is map + doubly linked list. An
"insert, delete and get-random in O(1)" set is map + array, with the removed
element swapped with the last. A priority queue with `decrease-key` is map +
heap, with the map holding positions. In every case the map turns "where is
this?" into a lookup, and the second structure provides whatever order the map
threw away.
:::

::::track{depth=interview}
## Reading the problem

Interviewers do not say "use a hash map". They say one of these, and every one
of them is the same instruction:

| What the problem says | What it means |
| --- | --- |
| "have we seen…", "find the duplicate" | set of seen values |
| "count occurrences", "most frequent" | map value → count |
| "find the pair that sums to" | map value → index, look up the complement |
| "group by", "anagrams", "same after normalising" | map canonical key → list |
| "subarray/substring with property P" | map running aggregate → count or first index |
| "O(1) get and put with eviction" | map + a second ordered structure |
| "first non-repeating", "first unique" | one counting pass, then one scanning pass |

The last row is worth a note: two passes is often the clean answer and people
avoid it because it feels wasteful. Two linear passes is still linear, and it is
much easier to get right than one clever pass.

**Say the trade out loud.** "I'll build a map of prefix sums — that's O(n) extra
space, and it takes this from O(n²) to O(n)" is one sentence that tells the
interviewer you chose the memory cost rather than stumbling into it. Silently
writing the fast version communicates far less, and if you get the code slightly
wrong, there is nothing left to give you credit for.

**The follow-ups you should expect, and short answers.**

*"What if the array is too large to hold the map?"* The map is bounded by the
number of *distinct* prefix sums, not by $n$. If that is still too large, you
are in the streaming setting: approximate counting with Count–Min Sketch,
approximate distinctness with HyperLogLog, both of which trade exactness for
constant memory.

*"What if there are duplicates / what if no answer exists / what about an empty
input?"* Have the answer ready before you are asked. For two-sum the questions
are "can an element pair with itself" (no) and "are there multiple answers"
(return the first).

*"Can you do it without extra space?"* For two-sum on a *sorted* array, yes —
two pointers, $O(1)$ space. Volunteering that is a strong move, because it shows
you know the hash map is buying you the ability to work on unsorted input in one
pass, and that if the input were sorted you would not need it.

:::interview{title="The tell"}
When a candidate writes the nested loop first and then optimises, interviewers
usually read it as thoroughness. When a candidate writes the map immediately and
cannot say what it costs, they read it as recall. Stating the brute force in one
sentence, naming its complexity, and then saying "I can trade O(n) space for
that" is the sequence that reads as understanding — and it takes about fifteen
seconds.
:::
::::

:::exercise{ref=group-anagrams}
:::

:::exercise{ref=subarray-sum-k}
:::

:::exercise{ref=lru-cache}
:::

:::quiz{id=quiz-l05 passing=3}
- id: q1
  prompt: "In two-sum, why must the check for the complement happen before inserting the current value?"
  options:
    - "For speed — inserting first would do an extra hash computation."
    - "Because otherwise an element can pair with itself when the target is twice its value."
    - "Because dict insertion invalidates iteration."
    - "It does not matter; both orders are correct."
  answerIndex: 1
  explanation: >-
    Insert first and `target - size` finds the element that was just added, so
    two_sum([120, ...], 240) returns (0, 0) — one element used twice. Checking
    first restricts the map to strictly earlier elements, which is exactly the
    "two different indices" requirement.
- id: q2
  prompt: "Why does the prefix-sum count map start as {0: 1}?"
  options:
    - "To avoid a KeyError on the first iteration."
    - "Because the empty prefix has sum 0 and has genuinely occurred once; without it, subarrays starting at index 0 are never counted."
    - "Because 0 is always one of the answers."
    - "To make the counts sum to n."
  answerIndex: 1
  explanation: >-
    P[0] = 0 is a real prefix sum. A subarray starting at index 0 corresponds to
    the pair (P[0], P[j+1]), so if P[0] is not in the map that pair is invisible.
    On [3, -1, 2, -1, 3] with k = 3 the correct answer is 4 and the unseeded
    version returns 2. A `.get(..., 0)` default prevents the KeyError but does
    not fix the count.
- id: q3
  prompt: "When is a sliding window a valid substitute for the prefix-sum hashmap on 'count subarrays summing to k'?"
  options:
    - "Always — they are the same algorithm."
    - "When the array is sorted."
    - "When all elements are non-negative, so the window sum is monotone in the window's width."
    - "When k is positive."
  answerIndex: 2
  explanation: >-
    The window relies on being able to say "sum too large, shrink from the left"
    and know the sum decreases. That requires non-negative elements. A single
    negative value breaks the invariant, and a two-pointer solution will miss
    subarrays. Sorting is irrelevant — sorting an array destroys its subarrays.
- id: q4
  prompt: "In an LRU cache built from a dict and a doubly linked list, why does each list node store the key as well as the value?"
  options:
    - "For debugging output."
    - "Because eviction starts from the list — you find the least recently used node and need its key to remove the matching dict entry."
    - "Because the dict stores keys by reference and they could be garbage collected."
    - "To allow the list to be sorted by key."
  answerIndex: 1
  explanation: >-
    Eviction goes list → map: the victim is the node at the tail, and you need
    its key to delete the right map entry. Without the back-reference you would
    have to scan the map to find which key points at that node, which makes
    eviction O(n) and defeats the design.
:::
