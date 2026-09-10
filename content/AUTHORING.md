# How to write a lesson

Mechanics — directives, schema, what the checker enforces — are in
`lib/curriculum/README.md`. This file is about **what makes a lesson good**.
Read `content/t1-foundations/s01-ground-floor/` first; it is the reference
implementation and every rule below is visible in it.

## The bar

This site is a public, free curriculum that doubles as its author's
credentialing artifact. A technical hiring manager will read it. That sets the
bar: **every paragraph must carry information a competent engineer does not
already have.** If a sentence could appear in any tutorial on the topic, cut it.

## Voice

- Second person, present tense, plain words. "You will spend more time reading
  errors than writing code."
- Short declarative sentences. Vary length; do not write in a monotone.
- Say the interesting thing first. Do not build up to it.
- No throat-clearing: never open with "In this lesson, we will explore…".
  Open with the question the lesson answers, or a claim worth arguing with.
- Contractions are fine. Exclamation marks are not.
- Never use "simply", "just", "obviously", "of course", "as we all know". They
  are all ways of telling a struggling reader that they should not be
  struggling.
- No emoji. No "Let's dive in". No section that exists only to transition.

## Banned constructions

These read as machine-written and will be rejected in review:

- "It's important to note that…", "It's worth mentioning…"
- "In today's fast-paced world…", "In the world of…"
- Tricolons used decoratively: "fast, efficient, and scalable"
- "Whether you're a beginner or an expert…"
- Concluding paragraphs that restate the lesson with no new content
- Any sentence of the form "X is a powerful tool that allows you to Y"

## Structure of a good lesson

1. **Open with the problem.** Why does this idea exist? What breaks without it?
2. **One central idea**, developed. Not five ideas mentioned.
3. **Runnable code early.** The learner should execute something in the first
   screenful. Use `runnable` fences liberally — they cost nothing and they turn
   reading into doing.
4. **A checkpoint** partway through, asking the learner to articulate the idea
   before reading the answer.
5. **Graded exercises** that are about the idea, not about Python trivia.
6. **A quiz** where every wrong option is a belief someone actually holds.

## Specific rules that carry a lot of weight

**Misconceptions must be real.** The `misconceptions` frontmatter is required
and it is the most valuable field in the file. Write beliefs learners actually
hold and explain precisely why they are wrong. "Students sometimes find
recursion confusing" is not a misconception. "The base case is where the work
happens" is.

**Quiz distractors must be plausible.** If three options are obviously silly,
the question tests nothing. Each wrong option should be a specific
misunderstanding, and the explanation should say why the right answer is right
*and* why the tempting wrong one is wrong.

**Verify every numeric claim.** If the prose says "four rows have a NULL
license", run the query and check. Reviewers do check, and the content checker
will catch it if you pin the number with a `require: rowcount` assertion.

**Name the SQL counterpart.** Every stage teaches a data structure and its
relational twin. Say the connection explicitly — "a hash join *is* a hash
table" — because that pairing is the reason this curriculum exists.

**Hints form a ladder.** Hint 1 is a nudge that reframes the problem. Hint 2
names the technique. Hint 3 is close to the answer. Never repeat the prompt.

**Solution walkthroughs teach the trade-off**, not just the code. Say what the
alternative was and why this one wins — and where it would stop winning.

## Display math needs its delimiters on their own lines

This is the one formatting trap that bites everybody:

```markdown
$$
\sum_{k=0}^{n} \binom{n}{k} 2^{k} = 3^{n}
$$
```

Writing `$$\sum ... = 3^{n}$$` across two lines makes remark-math mis-pair the
delimiters, and KaTeX renders a red error span rather than failing loudly.
`curriculum:check` catches this now and fails the build, but it is easier to get
right the first time. Single-line `$$...$$` and inline `$...$` are both fine.

## Markdown works everywhere

Every authored text field is compiled as markdown, including the short ones —
quiz options, objectives, mastery-checklist items, hints and checkpoint rubric
points. Backticks and `$math$` render properly in all of them, so write
`` `dict` `` and `$\Theta(n \log n)$` naturally rather than spelling them out.

## Exercises

- Prefer problems that are **about the lesson's idea**. A sorting lesson should
  not be graded on string formatting.
- Every exercise needs at least one **hidden** test covering an edge case the
  visible ones do not: empty input, ties, mutation of the argument, ordering.
- Use `forbid` when the exercise is "implement it yourself" and a built-in would
  short-circuit it.
- Use `complexityBudget` when a correct-but-slow answer must be rejected.
  Measure both solutions first and put the threshold between them with at least
  3× headroom on each side; write the measured numbers into a comment.
- SQL exercises: set `compare: ordered` **only** when the ordering is part of
  the question. Pin numeric claims with `require: rowcount`.

## Depth tracks

Each lesson may carry at most two optional passes, wrapped in `::::track`:

- `interview` — the recognition trigger, stated flatly, plus how to say the
  trade-off out loud.
- `proof` — a real theorem with a real derivation. **Do not invent one to fill
  the slot.** If there is no theorem, there is no proof track.
- `systems` — what a real engine or ML system does with this exact structure.

The spine must stand alone. A learner on the core path must never encounter a
dangling reference to something only a track explained.

Across a stage, aim for at least one lesson of each track type.

## Before you finish

```bash
npm run curriculum:check -- --stage <tier>/<stage>
```

This executes every solution against its own tests and every SQL query against
real DuckDB. It is not a linter; it is the contract. A lesson that does not pass
is not finished.
