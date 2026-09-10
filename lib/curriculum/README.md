# The v2 curriculum system

A from-scratch DS&A curriculum — basic to graduate level, taught in Python and
SQL, with every exercise runnable and graded in the learner's browser.

It is **completely independent of the v1 curriculum** in `lib/authored-*.ts`.
An ESLint `no-restricted-imports` rule enforces the separation; see "Why the
fence" below.

## Where things live

| Path | What |
| --- | --- |
| `content/` | All authored content. Markdown + YAML, no TypeScript. |
| `lib/curriculum/schema.ts` | Zod schemas — the source of truth for on-disk shapes. |
| `lib/curriculum/compile/` | Markdown + YAML → the compiled artifact. Build time only. |
| `lib/curriculum/artifact.ts` | The compiled types the renderer sees. |
| `lib/curriculum/load.ts` | Read access. Never throws; returns `LoadResult`. |
| `lib/runtime/python/` | Pyodide worker, client, grading harness. |
| `lib/runtime/sql/` | DuckDB client, grader, Node runner for CI. |
| `lib/progress/` | localStorage progress, namespaced `mle.learn.v2:`. |
| `components/learn/` | The renderer. |
| `app/learn/` | Routes. Statically prerendered. |

## Authoring a lesson

```bash
npm run curriculum:new -- --tier t1-foundations --stage s01-ground-floor \
  --lesson l07-my-lesson --id t1/s01/l07 --title "My lesson"
npm run dev          # hot-reloads content
npm run curriculum:check
```

A lesson is a directory:

```
l07-my-lesson/
  lesson.md                  frontmatter + prose + directives
  figures/*.svg              inlined at build time
  exercises/<id>/
    exercise.yaml            metadata, prompt, hints, walkthrough, grading
    starter.py | starter.sql
    solution.py | solution.sql
    tests.yaml               Python only
```

Add the directory slug to the stage's `lessons:` list, and flip
`status: draft` → `published` only when the whole stage is ready. Draft content
is excluded from production builds, so draft URLs 404; set
`NEXT_PUBLIC_CURRICULUM_PREVIEW=1` to see it locally.

### Directives

Ordinary markdown, plus:

```markdown
:::note / :::warning / :::pitfall / :::insight / :::interview / :::proof
:::figure{src=./figures/x.svg alt="..."}
:::checkpoint{id=cp-1 rubric="point one,point two"}
:::quiz{id=quiz-1 passing=2}          — YAML list of questions
:::dataset{id=package-registry tables="packages,versions"}
:::exercise{ref=<exercise-directory-name>}
::::track{depth=proof}                — wraps blocks into a depth track
```

Runnable code is a fenced block with `runnable` in its meta:

````markdown
```python runnable id=example
print("hi")
```

```sql runnable id=peek dataset=package-registry
SELECT * FROM packages LIMIT 5;
```
````

Note `::::track` uses **four** colons so it can contain three-colon directives.

### Depth tracks

Every lesson has a required spine plus at most two optional passes —
`interview`, `proof`, or `systems`. `core` is the default a learner sees.
Choosing a pass only ever *adds* blocks, so the spine must never depend on one.

Rules, enforced by review rather than by the compiler:
- one spine, at most two tracks, never three;
- no `proof` track without a genuine theorem;
- each stage should contain at least one lesson of each track type.

## The build artifact

`prebuild` runs three codegen steps before `next build`:

| Script | Output | Why |
| --- | --- | --- |
| `harness:generate` | `lib/runtime/python/harness.generated.ts` | Turbopack has no raw-text import, and a custom webpack config would fail the build |
| `curriculum:artifact` | `.curriculum/artifact.json` | Compiled once; see below |
| `search:index` | `public/assets/search-index.json` | Fetched on first search, not embedded in the page |

The artifact matters. Compiling means markdown, KaTeX and Shiki over every
lesson, and Next prerenders with a worker pool where each worker is its own
process — React's `cache()` is per-render-pass, so without the artifact every
worker recompiled everything and pages blew past the 60-second export timeout.
`load.ts` reads the artifact when it exists and falls back to compiling, which
is what lets `next dev` pick up content edits with no build step.

Assets live under `/assets/`, **not** `/curriculum/`: that prefix permanently
redirects to `/learn` for the retired v1 routes, and a 308 on an asset path is
invisible until a dataset silently fails to load.

## Grading

**Python.** `tests.yaml` entries are executed in a namespace seeded from the
learner's definitions, each in a *fresh* copy so tests cannot leak helpers into
one another. Add `complexityBudget` when the exercise is about efficiency rather
than correctness — it runs the solution against a large input under a wall-clock
or line-event ceiling, which is the only way to reject a correct-but-quadratic
answer.

**SQL.** The learner's query and the reference solution both run inside one
transaction that is always rolled back, and are compared with `EXCEPT ALL` in
both directions — so duplicates count and multiset equality is exact. Optional
`require` assertions check row counts, result predicates, required syntax, and
**execution-plan shape**. Plan assertions are why the DuckDB version is pinned.

## What `curriculum:check` guarantees

- Every file parses and validates against its schema.
- Every `ref=`, `dataset=` and prerequisite id resolves; no duplicate ids.
- Every Python solution passes its own tests under real CPython.
- Every Python starter fails at least one test — or, if the exercise has a
  budget, fails the budget. A starter that already passes is a build failure.
- Every Python solution meets its own complexity budget.
- Every SQL solution passes its own grading in real DuckDB, and every SQL
  starter does not.

**What it cannot check:** the reference solution *is* the oracle, so a solution
that correctly answers the wrong question will pass. Pin the intent with a
`require: rowcount` or `predicate` assertion when the prose makes a specific
numeric claim — that is what caught a wrong row count during Stage 1 authoring.

Grading is client-side, so hidden tests and reference solutions are present in
the shipped bundle. Hidden means "not shown", not "not obtainable". That is the
right trade for a free self-serve site; the graders are written as pure
functions so they can be lifted into a server route if that ever changes.

## Why the loader never throws

The system this replaced built its course list while evaluating a top-level
array literal and threw if a lesson id was missing — turning one bad record into
a 500 on every route that imported it.

This loader is function-based with no top-level side effects, and returns
`{ ok: false }` rather than throwing, so a malformed lesson degrades to a 404 for
one URL. Problem compilation follows the same rule: failures are collected, not
thrown, so a half-written problem cannot 404 every lesson on the site.
`curriculum:check` turns both into build failures.

## Runtimes and cost

Pyodide and DuckDB load from jsDelivr, pinned to exact versions. Cloud Run bills
egress per byte and these runtimes are tens of megabytes, so a CDN is both
cheaper and faster than self-hosting from a single region. `npm run
runtimes:vendor` mirrors them into `public/runtime/` for offline use; set
`NEXT_PUBLIC_RUNTIME_ORIGIN=self` to switch.

Both engines load lazily on viewport entry, so a Python-only lesson never
downloads DuckDB.
