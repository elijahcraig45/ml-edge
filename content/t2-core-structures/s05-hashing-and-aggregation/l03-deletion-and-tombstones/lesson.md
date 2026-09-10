---
id: t2/s05/l03
title: Deletion is the hard part
tier: t2-core-structures
stage: s05-hashing-and-aggregation
status: published
estimatedMinutes: 50
objectives:
  - Explain, from the lookup rule, why blanking a slot in an open-addressed table loses other keys.
  - State the deletion contract as invariants a table must preserve, not as a recipe.
  - Implement tombstoned deletion, including the tombstone-reuse rule that avoids duplicate keys.
  - Describe backward-shift deletion and say which probe schemes it works for.
prerequisites:
  - t2/s05/l02
misconceptions:
  - "**\"Deleting is the reverse of inserting.\"** Inserting adds information: it makes a slot occupied, which can only ever *extend* somebody's probe run. Deleting removes information, and an empty slot is a *terminator* — it is the signal that tells every lookup to stop. Removing an entry and removing a terminator are different acts, and only one of them is what you meant."
  - "**\"Tombstones are an optimisation you can skip in a simple implementation.\"** They are a correctness device. Without them, deleting one key silently makes an unrelated key unfindable while it is still sitting in the array. No exception is raised and no test that inserts-then-looks-up will notice."
  - "**\"A table with few live entries is a fast table.\"** A table can hold zero entries and still cost a full scan per lookup, because every slot is a tombstone. Probe length is governed by the number of *non-empty* slots, and tombstones are non-empty."
  - "**\"Reuse the first tombstone you find.\"** Only if you have already established the key is not further along the probe sequence. Writing into the first tombstone without finishing the scan inserts a second copy of a key that was already in the table, and lookups then find whichever copy comes first."
masteryChecklist:
  - I can state why a lookup stops at the first empty slot, and what that rule implies about deletion.
  - I can write the three slot states and say how each of lookup, insert and delete treats them.
  - I can explain why a delete-heavy workload needs a rehash even though the table is not growing.
  - I can say when backward-shift deletion is available and what it buys over tombstones.
runtimes:
  - engine: python
---

Here is the shortest correct statement of the problem. In an open-addressed
table, a lookup stops at the first empty slot, because an empty slot proves the
key was never inserted. So an empty slot is not merely "a slot with nothing in
it" — it is a **terminator** that some other key's probe run depends on. Delete
by writing empty, and you cut somebody else's run in half.

Most courses mention tombstones in a sentence. This lesson is the sentence
expanded, because the gap between knowing the word and being able to write
`delete` correctly is where the actual understanding is.

## Watch it lose a key

Eight slots, linear probing, integer keys — and remember from Lesson 1 that
`hash(n) == n` for small integers, so 1 and 9 both home to slot 1.

```python runnable id=blank-slot-loses-data
M = 8
slots = [None] * M

def insert(key):
    i = key % M
    while slots[i] is not None:
        i = (i + 1) % M
    slots[i] = key

def find(key):
    """Walk the probe sequence, stopping at the first empty slot."""
    i, probes = key % M, 0
    while slots[i] is not None:
        probes += 1
        if slots[i] == key:
            return f"found at slot {i} after {probes} probe(s)"
        i = (i + 1) % M
    return f"NOT FOUND after {probes + 1} probe(s)"

insert(1)
insert(9)          # 9 % 8 == 1 too, so it lands in slot 2
print("slots:", slots)
print("find(9):", find(9))

slots[1] = None    # "delete" key 1 the obvious way
print()
print("after blanking slot 1:", slots)
print("find(9):", find(9))
print("but 9 is still in the table at slot", slots.index(9))
```

The table reports that 9 is not present while it is visibly sitting in slot 2.
Nothing raised. Nothing logged. The array is *more* full than the table's own
lookup believes it is, and it will stay that way until something rehashes.

Now notice what would happen if you re-inserted 9: the insert stops at the first
empty slot, which is now slot 1, and you get 9 in slot 1 and 9 in slot 2. One
key, two entries, two different values. That is the second-order failure, and it
is the one that corrupts data rather than merely losing it.

:::warning{title="Why no test catches this"}
The natural unit test inserts keys and looks them up. The natural second test
deletes a key and checks it is gone. Both pass. The failure needs three keys
*and* a collision *and* a delete of the earlier one — which is a state your
tests will only reach by accident, and production will reach in the first
minute.
:::

## Three states, not two

The fix is to give a slot a third state.

| State | Lookup does | Insert does | Delete does |
| --- | --- | --- | --- |
| `EMPTY` | stop, report absent | claim it, stop | stop, report absent |
| `DELETED` (tombstone) | keep going | remember it, **keep going** | keep going |
| occupied | compare key; keep going on mismatch | compare key; overwrite on match | mark `DELETED` on match |

A tombstone says: *something used to be here, so do not conclude anything from
this slot, but you may reuse it.* Lookups treat it like an occupied slot they
did not match. Inserts treat it like an empty slot they are allowed to take —
with one condition that is the actual subtlety of the whole design.

**An insert may not stop at the first tombstone.** It must remember the
tombstone's index and keep probing until it hits a genuine `EMPTY` or finds the
key. Only then does it write, into the remembered tombstone if there was one.
Stopping early inserts a duplicate of a key that lives further down the run, and
from then on the two copies shadow each other unpredictably.

:::checkpoint{id=cp-tombstone rubric="an empty slot terminates a probe run,blanking a slot truncates another key's run,a tombstone keeps the run intact while freeing the space"}
Explain to someone who has just written `slots[i] = None` in their `delete`
what will go wrong, using the words "probe run" and "terminator". Then say what
their `insert` must do differently once tombstones exist.
:::

## The deletion contract

State it as invariants and the implementation writes itself.

1. **Run integrity.** For every key $k$ in the table, every slot strictly
   between $h(k)$ and $k$'s actual slot, in probe order, is non-`EMPTY`. Delete
   must never create an `EMPTY` inside a live run.
2. **Uniqueness.** Each key occupies at most one slot. Insert must therefore
   finish the scan before reusing a tombstone.
3. **Accounting.** `len()` counts live entries. Probe length is governed by
   `live + tombstones`. These are different numbers and the resize policy must
   watch the second one.

Invariant 3 is the one that surprises people, and this is what violating it
looks like:

```python runnable id=tombstone-leak
EMPTY, DELETED = "<empty>", "<gone>"
M = 8
slots = [EMPTY] * M

def put(key):
    i, free = key % M, -1
    for _ in range(M):
        if slots[i] is DELETED and free < 0:
            free = i
        elif slots[i] is EMPTY:
            slots[free if free >= 0 else i] = key
            return
        elif slots[i] == key:
            return
        i = (i + 1) % M
    raise RuntimeError("table full")

def delete(key):
    i = key % M
    for _ in range(M):
        if slots[i] is EMPTY:
            return
        if slots[i] == key:
            slots[i] = DELETED
            return
        i = (i + 1) % M

def probes_to_miss(key):
    i, n = key % M, 0
    for _ in range(M):
        n += 1
        if slots[i] is EMPTY:
            return n
        i = (i + 1) % M
    return n

print(f"{'round':>5} {'live entries':>13} {'probes to say not-here':>24}")
for r in range(7):
    put(r)
    delete(r)
    live = sum(1 for s in slots if s is not EMPTY and s is not DELETED)
    print(f"{r:>5} {live:>13} {probes_to_miss(0):>24}")
print()
print("slots:", slots)
```

Seven put-and-delete pairs, each on a different key. The table ends holding
**nothing**, and a lookup for a missing key costs eight probes in an eight-slot
table. Every operation was correct in isolation. The load factor, measured the
way most people measure it — live entries over capacity — is zero.

This is the shape of every cache, every session store, every job queue: entries
arrive, entries leave, the size stays flat and the tombstones accumulate
forever. The fix is that the resize check must use $\text{live} + \text{tombstones}$,
and the "resize" it triggers is often to the *same* capacity — a rehash whose
only purpose is to sweep the tombstones out. A table that rehashes into an array
of identical size looks like a bug in a code review and is the opposite.

## The other contract: backward-shift deletion

Tombstones are not the only answer. If you are using **linear probing** — and
only then — you can delete without them, by repairing the run in place. This is
Knuth's Algorithm R, and it is what Rust's `hashbrown` does.

Blank the slot, then walk forward. For each occupied slot $j$ you meet, ask
whether its home slot $k$ would still find it if it moved back to the hole at
$i$. It would, exactly when $i$ lies cyclically within $[k, j]$:

$$(i - k) \bmod m \;\le\; (j - k) \bmod m .$$

If so, move the entry from $j$ to $i$, and the hole becomes $j$. Continue until
you reach a genuinely empty slot, which ends the run and ends the repair.

The condition is doing real work. An entry whose home slot is *after* the hole —
in probe order — never reached the hole on its way in, so moving it back would
put it before its own home and make it unfindable. The inequality is the test
for exactly that, and getting it backwards produces a table that loses keys in a
way that only shows up under wrap-around.

| | Tombstones | Backward shift |
| --- | --- | --- |
| Works with | any probe sequence | linear probing only |
| Delete cost | $O(1)$ | $O(\text{run length})$ |
| Needs periodic rehash | yes | no |
| Lookup cost after many deletes | degrades until rehash | unchanged |
| Extra slot state | yes | no |

Neither is free. Tombstones move the cost from delete to a later rehash;
backward shift pays it immediately and keeps the table clean. Which is right
depends on whether your latency budget prefers a steady small tax or an
occasional large one — the same question that shows up again in the next lesson
as amortized versus worst-case growth.

:::insight{title="Why chaining looks so good all of a sudden"}
None of this exists in a chained table. Deleting is unlinking a node, the
invariant "every key with this hash is somewhere in this list" is untouched, and
there is no such thing as a terminator. When someone asks in an interview why
you would ever choose chaining over open addressing, "deletion is trivial and
does not degrade the table" is a better answer than anything about pointers.
:::

::::track{depth=interview}
## When this comes up

The question is almost never "implement a hash table". It is **"implement an
LRU cache"** or **"design a rate limiter"** or **"build a symbol table"**, and
then, four minutes from the end, *"how would you delete an entry?"*

That is the question. Everything before it was setup.

**What a good answer sounds like.** "If I'm chaining, deletion is an unlink and
there's nothing to discuss. If I'm open-addressed, I can't blank the slot,
because a lookup stops at the first empty slot and blanking would truncate the
probe run of any key that had to pass through it. So I'd use a tombstone — a
third slot state that lookups skip over and inserts may reuse, but only after
finishing the scan, otherwise I'd insert a duplicate. And I'd track tombstones
in the resize condition, because a delete-heavy workload can drive lookups to
O(m) with the table logically empty."

Four sentences. Every one of them is a fact the interviewer is checking for, and
almost nobody says the third or the fourth.

**The follow-ups, in the order they come.**

*"Can you avoid tombstones entirely?"* Yes, with backward-shift deletion, if the
probe sequence is linear. Say that constraint out loud — it is what separates
having read about it from understanding it.

*"When do you rehash?"* When live plus tombstones crosses the load threshold,
possibly into a table of the same size. Naming the same-size rehash is a strong
signal.

*"What if two threads delete at once?"* You have just been moved to a different
question. The honest answer is that lock-free open addressing needs tombstones
that are never reused without a full quiescence, or an epoch scheme — and that
this is why concurrent maps usually shard the table and lock a shard.

:::interview{title="The trap in the question itself"}
If you are asked to implement a hash map and you choose open addressing without
being asked to, you have volunteered for this whole conversation. Choosing
chaining and *saying why* — "deletion is simpler and I'd rather spend the time
on the eviction policy" — is a legitimate move and shows you know what the
trade is. Choosing open addressing because it sounds more impressive, and then
writing `slots[i] = None`, is the worst outcome available.
:::
::::

:::exercise{ref=open-addressed-map}
:::

:::exercise{ref=backward-shift-delete}
:::

:::quiz{id=quiz-l03 passing=3}
- id: q1
  prompt: "In an 8-slot linearly probed table, keys 1 and 9 occupy slots 1 and 2. You set slot 1 to EMPTY to delete key 1. What is the state of the table?"
  options:
    - "Correct: key 1 is gone and key 9 is unaffected."
    - "Key 9 is now unreachable by lookup, although it is still stored in slot 2."
    - "Key 9 has been overwritten and its value is lost."
    - "The table will raise a KeyError on the next lookup of 9."
  answerIndex: 1
  explanation: >-
    A lookup for 9 starts at slot 1 (9 % 8 == 1), sees EMPTY, and concludes the
    key was never inserted. The data is intact and unreachable — which is
    worse than losing it, because a later insert of 9 will take the empty slot
    and produce two entries for one key.
- id: q2
  prompt: "Why must an insert keep probing past the first tombstone it finds?"
  options:
    - "To keep the probe sequence balanced across the table."
    - "Because the key may already exist further along the run; stopping early would insert a duplicate."
    - "Because tombstones must be reused in the order they were created."
    - "It does not need to — the first tombstone is always the correct slot."
  answerIndex: 1
  explanation: >-
    The tombstone tells you the slot is free, not that the key is absent. The key
    could be sitting past it, placed there before the deletion happened. The
    correct algorithm remembers the first tombstone's index, keeps scanning to a
    genuine EMPTY (or a match), and only then writes.
- id: q3
  prompt: "A table with 1024 slots currently holds 3 live entries and 700 tombstones. What does a lookup for an absent key cost?"
  options:
    - "About 1 probe — the table is nearly empty."
    - "About 3 probes — one per live entry."
    - "Potentially hundreds of probes, because tombstones do not terminate a probe run."
    - "Exactly 1024 probes, always."
  answerIndex: 2
  explanation: >-
    Probe length depends on the number of non-EMPTY slots, and a tombstone is
    non-EMPTY. With 703 of 1024 slots non-empty the effective load factor is
    0.69, not 0.003. This is why the resize condition must count tombstones, and
    why the remedy is sometimes a rehash into a table of the same size.
- id: q4
  prompt: "Which statement about backward-shift deletion is correct?"
  options:
    - "It works with any probe sequence and removes the need for tombstones."
    - "It works only with linear probing, and moves entries back into the hole when their home slot is cyclically at or before it."
    - "It is faster than tombstoning on every workload because it avoids rehashing."
    - "It requires the table to be at most half full."
  answerIndex: 1
  explanation: >-
    The repair relies on knowing that the run is a contiguous stretch of slots,
    which is only true for linear probing; with quadratic or double hashing the
    entries that passed through a slot are not the ones adjacent to it. It also
    is not uniformly faster — deletion costs the length of the run rather than
    O(1), so it trades a steady tax for the occasional rehash.
:::
