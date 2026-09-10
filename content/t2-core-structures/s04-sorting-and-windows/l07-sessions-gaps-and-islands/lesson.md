---
id: t2/s04/l07
title: Sessions, gaps, and islands
tier: t2-core-structures
stage: s04-sorting-and-windows
status: published
estimatedMinutes: 45
objectives:
  - Sessionise an ordered event stream with LAG plus a cumulative SUM, and explain why the cumulative SUM is a prefix sum.
  - Solve gaps-and-islands with the row_number difference trick, and say why the difference is constant inside an island.
  - Recognise the family of problems — streaks, sessions, uptime intervals, consecutive logins — that all reduce to the same two queries.
prerequisites:
  - t1/s01/l02
  - t2/s04/l06
misconceptions:
  - "**\"Sessions come from the data.\"** No log has a session column. A session is a *decision* — \"more than 30 minutes of silence ends it\" — and that threshold is a business rule you are implementing, not a fact you are reading."
  - "**\"You need a self-join to compare a row with its neighbour.\"** `LAG` does it in one pass. A self-join on `t1.day = t2.day + 1` also silently drops rows whose neighbour is missing, which on gappy data is precisely the case you are trying to detect."
  - "**\"The cumulative SUM in a sessionisation query is a counter, so it needs a loop or a recursive CTE.\"** It is a prefix sum over a column of 0s and 1s, computed by the same single linear pass as any other running total. Recursive CTEs are for graph reachability, not for this."
  - "**\"The row_number trick is a clever hack.\"** It is a one-line proof. Inside a run of consecutive days both the day and the row number increase by exactly one per row, so their difference is invariant — and it changes precisely where the run breaks. Two counters advancing in lockstep is a technique, not a trick."
masteryChecklist:
  - I can write LAG plus a cumulative SUM to number the sessions in an event stream.
  - I can explain why `day - row_number()` is constant within a run of consecutive days.
  - Given a "longest streak" or "consecutive days" question, I can name which of the two patterns applies and why.
runtimes:
  - engine: duckdb
    datasetId: package-registry
  - engine: python
---

No event log has a session column. What it has is timestamps, and somebody's
opinion about how much silence ends a session.

Turning the first into the second is one of the most common jobs in analytics,
and it has a standard two-step shape that you should be able to write without
thinking. Both steps are things you already have: `LAG` from the last lesson,
and a prefix sum from the one before that.

:::dataset{id=package-registry tables="downloads"}
:::

## Step 1: find the boundaries

Call a package **busy** on a day when it records at least 1,000 downloads. A
busy *streak* is a run of consecutive busy days. Package 10 is busy on eight of
the ten days — with a hole in the middle.

```sql runnable id=find-gaps dataset=package-registry
WITH busy AS (
  SELECT package_id, day, count FROM downloads WHERE count >= 1000
)
SELECT day, count,
       lag(day) OVER (PARTITION BY package_id ORDER BY day) AS prev_busy_day,
       day - lag(day) OVER (PARTITION BY package_id ORDER BY day) AS gap_days
FROM busy
WHERE package_id = 10
ORDER BY day;
```

Six rows report `gap_days = 1`. One reports `2`, and one reports NULL because it
is the first busy day and has no predecessor. Those two are the streak
starts.

Note what `lag` gave you: the previous row **in the filtered set**. 2024-03-05
does not appear at all — the package was not busy — so `lag` skipped straight
over it. A self-join on `day = day - 1` would have found nothing there and
produced a NULL you would then have to interpret. `lag` asks the question you
meant.

## Step 2: turn boundaries into ids

Flag each streak start with a 1 and everything else with a 0, then take the
**cumulative sum** of that flag. Every row inside a streak carries the same
total, and the total goes up by one at each new streak.

```sql runnable id=sessionize dataset=package-registry
WITH busy AS (
  SELECT package_id, day, count FROM downloads WHERE count >= 1000
),
flagged AS (
  SELECT package_id, day, count,
         CASE
           WHEN day - lag(day) OVER (PARTITION BY package_id ORDER BY day) = 1 THEN 0
           ELSE 1                      -- a gap, or the very first row (LAG is NULL)
         END AS starts_streak
  FROM busy
),
numbered AS (
  SELECT *,
         sum(starts_streak) OVER (
           PARTITION BY package_id ORDER BY day
           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
         ) AS streak_id
  FROM flagged
)
SELECT day, count, starts_streak, streak_id
FROM numbered
WHERE package_id = 10
ORDER BY day;
```

That is the whole technique. Two window functions, one pass each.

Three details worth pinning down.

**The NULL is doing work.** On the first row `lag(day)` is NULL, so
`day - lag(day)` is NULL, and `NULL = 1` is UNKNOWN — not TRUE — so the `CASE`
falls through to `ELSE 1`. The first row of every partition is a streak start,
and three-valued logic delivers that for free. Writing
`WHEN ... <> 1 THEN 1 ELSE 0` instead would give 0 on the first row and break
every streak id by one.

**`ROWS`, not the default frame.** `sum(...) OVER (ORDER BY day)` would use the
`RANGE` default. Here `day` is unique inside a partition, so it happens not to
matter — but writing `ROWS` costs nothing and makes the query correct for the
day someone removes the `PARTITION BY`. Cheap insurance.

**The cumulative sum is a prefix sum.** It is the same construction as lesson 5's
`prefix` array, over a column of 0s and 1s. The engine builds it with one running
accumulator in a single pass. No loop, no recursive CTE.

Once each row carries a `streak_id`, the streaks themselves are an ordinary
`GROUP BY`:

```sql runnable id=streak-summary dataset=package-registry
WITH busy AS (
  SELECT package_id, day, count FROM downloads WHERE count >= 1000
),
flagged AS (
  SELECT package_id, day, count,
         CASE WHEN day - lag(day) OVER (PARTITION BY package_id ORDER BY day) = 1
              THEN 0 ELSE 1 END AS starts_streak
  FROM busy
),
numbered AS (
  SELECT package_id, day, count,
         sum(starts_streak) OVER (PARTITION BY package_id ORDER BY day
                                  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS streak_id
  FROM flagged
)
SELECT package_id, min(day) AS started_on, max(day) AS ended_on,
       count(*) AS days, sum(count) AS total
FROM numbered
GROUP BY package_id, streak_id
ORDER BY package_id, started_on;
```

Twenty streaks across fifteen packages. Nine packages are busy on all ten days
and contribute one streak each; the other six break into two, except `orderby`,
which clears the threshold on a single day.

The two CTEs are not stylistic. Most engines, DuckDB included, refuse to nest one
window function inside another — `sum(... lag(...) OVER ...) OVER ...` is a
binder error — because the second window would have to be evaluated over the
output of the first, which is a separate pass. Splitting into a `flagged` step
and a `numbered` step is how you write that second pass down.

:::checkpoint{id=cp-session rubric="lag gives the previous event so you can measure the gap,a boundary flag is 1 when the gap exceeds the threshold,a cumulative sum of the flag gives every row in a session the same id"}
Describe the two-step sessionisation recipe without looking. What does each
window function contribute, and why does adding up a column of 0s and 1s produce
group ids?
:::

## The other way: two counters in lockstep

There is a second solution to the same problem, and it is shorter.

Inside a run of consecutive days, the day advances by 1 per row **and** the row
number advances by 1 per row. So their difference does not change — and it
changes exactly when the run breaks.

```sql runnable id=row-number-trick dataset=package-registry
WITH busy AS (
  SELECT package_id, day, count FROM downloads WHERE count >= 1000
),
anchored AS (
  SELECT package_id, day, count,
         row_number() OVER (PARTITION BY package_id ORDER BY day) AS rn,
         day - CAST(row_number() OVER (PARTITION BY package_id ORDER BY day) AS INTEGER) AS island_key
  FROM busy
)
SELECT day, count, rn, island_key
FROM anchored
WHERE package_id = 10
ORDER BY day;
```

`island_key` is 2024-02-28 for the first four rows and 2024-03-01 for the last
four. It is not a date anybody cares about — it is an arbitrary anchor that
happens to be shared by exactly the members of one island. Group by it and you
get the islands.

The `GROUP BY package_id, island_key` version returns the same twenty streaks as
the `LAG` version. Two derivations, one answer.

:::insight{title="When to use which"}
The `row_number` trick is shorter but it only works when "consecutive" means
**a step of exactly one** in a countable sequence: successive days, successive
integers, successive sequence numbers. It has nothing to offer for "events less
than 30 minutes apart", because there is no unit to count in.

The `LAG` + cumulative-`SUM` version handles any threshold — 30 minutes, 1 day,
5 seconds — and generalises to boundary rules that have nothing to do with time:
start a new session when the user changes, when the status flips, when the price
moves more than 2%. Learn the `LAG` form as the default; keep the `row_number`
trick for the consecutive-integer special case, where it is genuinely tidier.
:::

## The same thing in Python

Nothing here is SQL-specific. Sessionising a sorted list of timestamps is one
pass with one comparison:

```python runnable id=sessionize-python
def sessionize(timestamps, max_gap):
    """Group sorted timestamps into sessions; a gap > max_gap starts a new one."""
    sessions = []
    for t in timestamps:
        if sessions and t - sessions[-1][-1] <= max_gap:
            sessions[-1].append(t)          # extend the open session
        else:
            sessions.append([t])            # boundary: start a new one
    return sessions


events = [0, 5, 9, 40, 41, 43, 100, 101]
for i, session in enumerate(sessionize(events, max_gap=10), start=1):
    span = session[-1] - session[0]
    print(f"session {i}: {session}  ({len(session)} events, span {span})")
```

The correspondence is line for line. `sessions[-1][-1]` is `lag`. The
`if`/`else` is the `CASE`. Appending to a new list rather than the current one is
the cumulative sum incrementing. And the whole thing is $\Theta(n)$ on sorted
input, for the same reason the SQL version is: one pass, one comparison per row,
no looking backwards more than a step.

::::track{depth=interview}
## Recognising the family

Gaps-and-islands problems arrive wearing many costumes and are all the same
question: **partition an ordered sequence into maximal runs that satisfy a
neighbour condition.**

| How it is asked | What it is |
| --- | --- |
| "longest streak of consecutive days logged in" | islands over dates, then `max(count(*))` |
| "sessionise these page views with a 30-minute timeout" | `LAG` + cumulative `SUM` |
| "find periods when the service was down" | islands over rows where `status <> 'up'` |
| "collapse adjacent duplicate rows" | islands over runs where the value does not change |
| "how many separate outages, not how many bad minutes" | count the islands, not the rows |
| "billing periods where the plan didn't change" | islands over `plan_id` |
| "merge overlapping intervals" | sort by start, then a running `max(end)` boundary flag |

The interview signal is naming the shape rather than deriving it. "That's a
gaps-and-islands problem — I'll flag the boundaries with `LAG` and take a
cumulative sum of the flag to get group ids" is a complete answer to the design
question, and it takes six seconds.

:::interview{title="The two follow-ups"}
**"What if the events aren't sorted?"** Then the window function's `ORDER BY`
sorts them, and you have paid $n\log n$. That is usually fine and worth
saying out loud. It stops being fine when the table is huge and the sort spills
to disk — at which point the answer is a covering index or a pre-clustered
table, so the engine can read the rows already ordered and skip the sort. If the
data lands sorted by time, say so; it is the difference between one pass and a
spill.

**"What if two events share a timestamp?"** Now the sort key is not unique, and
everything from lesson 6 applies: `LAG` picks one of the tied rows arbitrarily,
and a `RANGE` frame swallows all of them. Add a tiebreaker to the `ORDER BY` —
an event id — and say why. Interviewers who ask this are checking whether you
know that "ordered by timestamp" is not the same as "totally ordered".
:::

One more worth having ready, because it is the same machinery pointed
sideways: **merging overlapping intervals**. Sort by start, then walk once
carrying the maximum end seen so far; a new interval starts an island when its
start exceeds that running maximum. Same sort, same single pass, same boundary
flag — and it is the standard answer to "merge these calendar bookings", which
is asked constantly.
::::

:::exercise{ref=rising-streaks}
:::

:::exercise{ref=find-islands}
:::

:::quiz{id=quiz-l07 passing=2}
- id: q1
  prompt: "In the sessionisation query, why does a cumulative SUM of a 0/1 flag produce session ids?"
  options:
    - "Because SUM assigns each group a unique number by hashing it."
    - "Because the running total only increases at a boundary, so every row between two boundaries carries the same total."
    - "Because SUM over a window is evaluated once per group."
    - "Because the flag column is already the session id."
  answerIndex: 1
  explanation: >-
    The flag is 1 exactly at the rows that start a session and 0 everywhere else,
    so the running total is constant between boundaries and increments by one at
    each. That constant is the session id. It is a prefix sum over 0s and 1s —
    the same construction as lesson 5's prefix array — computed in one pass with
    a single accumulator, not a group-wise evaluation.
- id: q2
  prompt: "Why is `day - row_number()` constant inside a run of consecutive days?"
  options:
    - "Because row_number is always equal to the day of the month."
    - "Because both increase by exactly one per row inside the run, so their difference does not change; a gap advances the day by more than one and shifts it."
    - "Because the rows are sorted, so all differences are equal."
    - "Because subtraction of a date and an integer is defined to be constant."
  answerIndex: 1
  explanation: >-
    Two counters advancing in lockstep have an invariant difference. A one-day
    gap advances `day` by two while `row_number` advances by one, so the
    difference jumps and a new island begins. Sorting alone guarantees nothing —
    the trick needs the step to be exactly one, which is why it does not
    generalise to "events within 30 minutes".
- id: q3
  prompt: "You need to sessionise clickstream events with a 30-minute inactivity timeout. Which approach?"
  options:
    - "`day - row_number()`, since it is shorter."
    - "A recursive CTE, since each session depends on the previous row."
    - "LAG to measure the gap to the previous event, a flag when it exceeds 30 minutes, and a cumulative SUM of the flag."
    - "A self-join on the events table matching each event to the one before it."
  answerIndex: 2
  explanation: >-
    The row_number trick needs consecutive integers with a step of one, and
    "within 30 minutes" has no such unit. Recursive CTEs are for reachability, not
    for a running total the window framework already computes in one pass. A
    self-join reads the table twice and needs care to match "the previous event"
    rather than "an event 30 minutes ago". LAG plus a cumulative SUM is one pass
    and states the rule directly.
:::
