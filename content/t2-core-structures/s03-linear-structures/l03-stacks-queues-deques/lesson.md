---
id: t2/s03/l03
title: Stacks, queues and deques are contracts
tier: t2-core-structures
stage: s03-linear-structures
status: published
estimatedMinutes: 45
objectives:
  - State the stack, queue, and deque contracts as sets of operations, independently of any implementation.
  - Choose an implementation for a given contract and defend it on the operations the caller actually performs.
  - Implement a circular buffer, including the full-versus-empty ambiguity and the three standard resolutions.
prerequisites:
  - t2/s03/l01
misconceptions:
  - "**\"A stack is a list.\"** A stack is *push, pop, peek, is-empty*. A list is one possible implementation and so is a linked list, a fixed array with an index, or the CPU's own call stack. Confusing the contract with the container is why people say 'use a stack' when they mean 'use a list', and then reach for `list.pop(0)` when the contract was really a queue."
  - "**\"A Python list makes a fine queue.\"** It makes a fine *stack*. As a queue it is quadratic, because `pop(0)` shifts every remaining element. The list is O(1) at one end and O(n) at the other, and a queue needs both ends."
  - "**\"`collections.deque` is a linked list.\"** It is a doubly linked list of fixed-size *blocks*, 64 slots each. That is a deliberate hybrid: block-internal operations get array locality, and only every 64th operation touches a pointer."
  - "**\"A ring buffer just needs head and tail indices.\"** Two indices into `c` slots can express `c` distinct states, and occupancy has `c + 1` possible values. One state is unrepresentable, which is why `head == tail` means both empty and full unless you add something."
masteryChecklist:
  - I can write down the stack, queue, and deque contracts without naming a single Python type.
  - Given a problem, I can say which contract it needs before deciding what to build it out of.
  - I can explain the full/empty ambiguity in a ring buffer and give all three standard fixes.
  - I can say why `list.pop(0)` in a loop is a bug and name two structures that fix it.
runtimes:
  - engine: python
---

A stack is not a list. A stack is a promise about which element comes out next,
and a list is one of several things you could keep that promise with. Keeping
those two ideas separate is most of what this lesson is for, because the moment
they blur you get code that uses a list as a queue and is quadratic.

## Three contracts

| Contract | Insert | Remove | The rule |
| --- | --- | --- | --- |
| **stack** | push (one end) | pop (same end) | last in, first out |
| **queue** | enqueue (back) | dequeue (front) | first in, first out |
| **deque** | either end | either end | you choose |

Every one of those operations should be O(1). That is part of the contract too —
a "queue" whose dequeue is O(n) is not a queue, it is a list you are misusing.

Notice what is *not* in the table: indexing, searching, sorting, length-based
access. Contracts are defined by what they refuse as much as by what they offer.
A stack that lets you peek at the third element is not a stack, and the
restriction is the point: it is what lets an implementation be a bare array with
one index, or a fixed block of memory, or a hardware register.

## The bug the contract prevents

```python runnable id=list-as-queue
import time

def drain_with_list(n):
    queue = []
    for i in range(n):
        queue.append(i)
    while queue:
        queue.pop(0)              # dequeue from the front: O(n) every time

def drain_with_deque(n):
    from collections import deque
    queue = deque()
    for i in range(n):
        queue.append(i)
    while queue:
        queue.popleft()           # O(1)

for n in (20_000, 40_000, 80_000):
    row = [f"n = {n:>6,}"]
    for label, fn in (("list", drain_with_list), ("deque", drain_with_deque)):
        start = time.perf_counter()
        fn(n)
        row.append(f"{label} {(time.perf_counter() - start) * 1000:8.1f} ms")
    print("   ".join(row))
```

Double `n`: the deque time doubles, the list time quadruples. Both versions are
"a queue". Only one of them satisfies the contract.

The reason is Lesson 1's asymmetry. A list is contiguous, so removing from the
front means shifting everything down one slot. Fast at one end, linear at the
other — which is exactly a stack, and exactly not a queue.

:::insight{title="Why `deque` is not the obvious structure"}
A textbook would reach for a doubly linked list: O(1) at both ends by
construction. CPython instead uses a doubly linked list **of 64-slot blocks**,
so 63 out of every 64 appends write into a contiguous array and never touch a
pointer.

That design is Lesson 2's measurement turned into a data structure. Pure linked
lists lose on locality, pure arrays lose at the front, and blocking recovers
most of both.
:::

:::checkpoint{id=cp-contract rubric="a stack is push pop peek,a queue is enqueue dequeue,the contract says nothing about the container,a list is O(1) at one end only"}
Without naming any Python type, write down the operations a queue must support
and the cost each must have. Then say why a list fails it and a deque does not.
:::

## The ring buffer

Sometimes you cannot allocate. An audio callback, a network driver, a kernel log,
a batch pipeline with a memory ceiling — these need a queue with a fixed maximum
size and no allocation after startup. The answer is a **circular buffer**: one
preallocated block, treated as if its ends were joined.

```python runnable id=ring-walkthrough
capacity = 4
slots = [None] * capacity
head = 0      # index of the oldest item
count = 0     # how many are live

def show(label):
    print(f"{label:<12} slots={slots}  head={head} count={count}")

for item in "abc":
    tail = (head + count) % capacity
    slots[tail] = item
    count += 1
show("pushed abc")

for _ in range(2):
    head = (head + 1) % capacity
    count -= 1
show("popped 2")

for item in "de":
    tail = (head + count) % capacity
    slots[tail] = item
    count += 1
show("pushed de")     # 'd' and 'e' wrapped around to the front of the block
```

Nothing moves. `head` walks forward, wraps at the end, and the block is reused
forever. Push and pop are each a handful of integer operations with no
allocation and no copying, which is why this structure turns up wherever
latency has to be predictable.

## The off-by-one everybody writes

The natural implementation keeps a `head` and a `tail` index and drops the
count. It is smaller and it seems sufficient — until you ask what `head == tail`
means.

Push `capacity` items and the tail wraps all the way around to the head. Pop
them all and the head catches up to the tail. **Both** end with `head == tail`,
and the code has no way to tell "completely full" from "completely empty".

```python runnable id=full-empty-ambiguity
capacity = 4

def state(head, tail):
    return "head == tail" if head == tail else f"gap of {(tail - head) % capacity}"

head, tail = 0, 0
print("empty buffer:      ", state(head, tail))

# Four pushes wrap the tail right back to where the head is.
for _ in range(capacity):
    tail = (tail + 1) % capacity
print("four items pushed: ", state(head, tail))

print()
print("Two indices into", capacity, "slots can encode", capacity, "differences.")
print("Occupancy has", capacity + 1, "possible values: 0 through", capacity)
print("One state has nowhere to live.")
```

This is a counting argument, not a coding mistake, and no rearrangement of the
modular arithmetic fixes it. There are exactly three ways out:

1. **Keep a count.** One extra field. Every slot usable, `len()` free.
2. **Sacrifice a slot.** Declare the buffer full one early, so `head == tail`
   can only mean empty. Costs a slot, saves a field — and it is what
   lock-free single-producer/single-consumer queues in C pick, because the
   count would be a third value needing atomic updates.
3. **Let the indices grow without bound**, taking the modulus only when
   indexing. `tail - head` is then the length directly. Free in Python;
   in C you have to reason about integer overflow, which works out if the
   capacity is a power of two and bites you if it is not.

:::pitfall{title="The failure mode you will actually hit"}
The sacrificed-slot version is not wrong, but it silently gives you a buffer
that is one smaller than you asked for. Size a ring buffer at exactly the batch
size your pipeline emits and it will block on the last item of every batch,
forever, for reasons that will not be obvious from any log line.

If you did not write the implementation, test its capacity before you trust it.
:::

:::exercise{ref=ring-buffer}
:::

:::exercise{ref=rpn-evaluator}
:::

## The relational counterpart: an operator's buffer

Every operator in a query plan holds a bounded queue between itself and the
operator downstream, and it is a ring buffer for the same reasons yours is:
fixed memory, no allocation on the hot path, O(1) at both ends.

That queue is where **backpressure** lives. When a downstream operator is slower
than its producer, the buffer fills; when it is full, the producer blocks. Scale
that up and it is the whole design of a streaming system — Kafka's consumer
fetch buffers, Flink's network buffers, and the exchange operators in a
distributed query engine are all bounded queues whose fullness is the flow
control signal.

A deque is the right contract because the ends do different jobs: the producer
only ever touches the back, the consumer only ever touches the front, and
because those are separate ends, they can be separate threads that never need a
lock between them. That is the single-producer/single-consumer queue, and it is
one of the few genuinely lock-free structures in wide production use.

::::track{depth=interview}
## Recognising a stack or queue problem

Interviewers rarely say "use a stack". They describe a shape, and the shape has
tells.

**Reach for a stack when the problem says "matching", "nesting", "most recent",
or "undo".** Balanced brackets, evaluating an expression, the next-greater
element, simplifying a path, backtracking through choices, iterative
depth-first search. The common thread is that you need the *most recent*
unresolved thing, and everything before it stays pending.

**Reach for a queue when the problem says "level", "layer", "in order of
arrival", or "shortest number of steps".** Breadth-first search, level-order
tree traversal, task scheduling, rate limiting over a window. The common thread
is fairness: whatever has waited longest goes next.

**Reach for a deque when you need to drop things from the front that are no
longer competitive.** Sliding-window maximum is the canonical one, and it is
worth being able to describe: as you slide a window across an array, keep a
deque of indices whose values are decreasing. New element arrives — pop
everything smaller off the *back*, because they can never be the maximum again
while this one is in the window. Then pop off the *front* anything that has
fallen out of the window. The front is always the current maximum, and the
whole scan is O(n) because each index is pushed once and popped once.

:::interview{title="How to say it out loud"}
"This needs a queue — I want first-in-first-out, and I want both ends to be
O(1), so I'll use a deque rather than a list, because `list.pop(0)` is linear."

Three clauses: the contract, the cost requirement, the implementation and why.
Naming the contract before the container is the part that reads as senior. It
also protects you, because if the interviewer then adds "and you can't allocate
after startup", you change the implementation and the algorithm survives
untouched.
:::

The follow-up to be ready for is "what if two threads use it?" — and the honest
answer is that the contract does not change but every implementation choice
does. That is where the sacrificed-slot ring buffer comes back, because it needs
one fewer shared variable than the counted one.
::::

:::quiz{id=quiz-l03 passing=2}
- id: q1
  prompt: "Why is a Python list a fine stack but a poor queue?"
  options:
    - "Lists cannot store enough elements to be a queue."
    - "`append` and `pop` at the end are O(1), but `pop(0)` shifts every remaining element, so it is O(n)."
    - "Because lists are ordered and queues are not."
    - "Because a queue must be thread-safe and a list is not."
  answerIndex: 1
  explanation: >-
    A list is contiguous, which makes one end cheap and the other end linear.
    A stack only ever touches the cheap end. A queue touches both, so using a
    list makes every dequeue O(n) and the whole drain quadratic.
- id: q2
  prompt: "A ring buffer with capacity 8 tracks only head and tail. What goes wrong?"
  options:
    - "Nothing — two indices are sufficient."
    - "`head == tail` cannot distinguish empty from full, because 8 slots give 8 index differences and occupancy has 9 possible values."
    - "The indices overflow after 8 pushes."
    - "Wrap-around requires a power-of-two capacity, and 8 qualifies, so it works."
  answerIndex: 1
  explanation: >-
    It is a counting argument: nine occupancy states will not fit in eight
    representable differences. The fixes are to add a count, to give up one
    slot so full is unreachable, or to let the indices grow unbounded so their
    difference is the length.
- id: q3
  prompt: "What does calling something \"a stack contract\" buy you over calling it \"a list\"?"
  options:
    - "Nothing; they describe the same thing."
    - "It fixes the implementation, so the code is more portable."
    - "It states the operations and their costs without fixing the implementation, so the algorithm survives a change of container."
    - "It makes the structure thread-safe by definition."
  answerIndex: 2
  explanation: >-
    The contract is push, pop, peek, is-empty, each O(1). Any structure meeting
    it will run the algorithm unchanged — which is why the same postfix
    evaluator runs on a Python list, a fixed C array, and a hardware stack.
:::
