# The ML Edge

A free data structures and algorithms curriculum, from first principles to
graduate level, taught in **Python and SQL** — with every exercise runnable and
auto-graded in the browser.

Live at [mle-edge.dev](https://mle-edge.dev).

## The idea

Every data structure has an exact relational twin, and almost nobody teaches the
pair together.

- A hash join **is** a hash table.
- A merge join **is** merge sort.
- An index scan **is** a B-tree search.
- A window function **is** a sliding-window scan.
- A recursive CTE **is** breadth-first search — where `UNION` vs `UNION ALL`
  literally *is* the visited set.
- The optimiser's join enumeration **is** bitmask DP.

So SQL is not a separate track here. It is woven through every stage as the
answer to "how does a real system do this at scale?"

## How it works

- **Everything runs in your browser.** Python via Pyodide, SQL via DuckDB-WASM.
  No accounts, no sandbox service, no per-submission server cost.
- **Python is graded against hidden tests**, in a fresh namespace per test, with
  a timeout that survives an infinite loop.
- **SQL is graded three ways**: result-set equivalence against a reference
  solution run in your own engine, optional assertions on row counts and result
  predicates, and — the unusual one — assertions on the **execution plan**.
  That is the only way to teach index design as a skill rather than a story.
- **Correct-but-slow is rejected.** Exercises can carry a complexity budget, so
  a quadratic solution to a linear problem fails even though its answer is right.
- **One lesson, three ways through it.** A required spine plus optional
  `interview`, `proof` and `systems` passes. Choosing a pass only ever adds
  content.
- **Progress is yours.** localStorage by default; sign in to sync across devices.

## Repository layout

```
content/            All authored curriculum. Markdown + YAML, no TypeScript.
  AUTHORING.md      How to write a lesson. Read before contributing content.
  curriculum.yaml   Tier and stage order.
  datasets/         Shared SQL datasets.
  problems/         Standalone problems for the bank.
  <tier>/<stage>/   Lessons.

lib/curriculum/     Schema, compiler, loader.  README.md explains the system.
lib/runtime/        Pyodide worker + DuckDB client, and the graders.
lib/progress/       localStorage progress and Firestore sync.
components/learn/   The lesson renderer.
components/problems/The problem bank and interview mode.
app/learn/          Curriculum routes (statically prerendered).
app/problems/       Problem bank routes.
scripts/            Content checker, scaffolding, runtime vendoring.
```

Two documents carry the detail: **`lib/curriculum/README.md`** for how the
system works, and **`content/AUTHORING.md`** for how to write for it.

## Local setup

```bash
npm install
npm run dev          # http://localhost:3000
```

No environment variables are required. Firebase is entirely optional — every
feature works signed out.

To see unpublished content locally:

```bash
NEXT_PUBLIC_CURRICULUM_PREVIEW=1 npm run dev
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server; content hot-reloads |
| `npm run build` | Production build; prerenders every lesson and problem |
| `npm run verify` | lint + types + unit tests + content check |
| `npm run test` | Vitest unit tests |
| `npm run test:e2e` | Playwright, against a locally built server |
| `npm run test:smoke` | Playwright against production |
| `npm run curriculum:check` | **Executes every authored exercise.** See below |
| `npm run curriculum:check -- --stage <tier>/<stage>` | Validate one stage |
| `npm run curriculum:new -- --tier … --stage … --lesson … --id …` | Scaffold a lesson |
| `npm run runtimes:vendor` | Mirror the wasm runtimes into `public/` |

## The content contract

`curriculum:check` is the reason content can be trusted. It does not lint — it
runs things:

- Every file parses and validates against its Zod schema.
- Every exercise reference, dataset reference and prerequisite resolves.
- **Every Python solution passes its own tests**, under real CPython.
- **Every Python starter fails** at least one test — or, for a
  budgeted exercise, fails the budget. A starter that already passes is a build
  failure, because the exercise would be a no-op.
- **Every Python solution meets its own complexity budget**, so a budget cannot
  be so tight it rejects correct answers.
- **Every SQL solution passes its own grading** in real DuckDB, and every SQL
  starter fails.

CI runs this before anything deploys.

Its one honest limit: the reference solution *is* the oracle, so a solution that
correctly answers the wrong question will pass. Pin the intent with a `rowcount`
or `predicate` assertion when the prose makes a specific claim.

## Deployment

Cloud Run, via GitHub Actions on push to `main`, gated on the verify job. See
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the cost model, Firestore rules,
and environment variables.

## History

An earlier version of this site was a broader ML curriculum with a daily news
and quiz pipeline. It has been retired: those routes now redirect to the
curriculum, and roughly 16,500 lines of content-as-TypeScript came out with it.
Git history has all of it if you want to look.
