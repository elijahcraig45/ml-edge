# Deploying

## What runs where

| Piece | Where | Notes |
| --- | --- | --- |
| The site | Cloud Run (`mledge`, us-central1) | `output: "standalone"`, min instances 0 |
| Python + SQL runtimes | jsDelivr CDN | Pinned versions; see "Cost" below |
| Learner progress | localStorage, optionally mirrored to Firestore | Guest mode is fully functional |
| Curriculum content | Baked into the build | `/learn` and `/problems` are prerendered |

## Continuous deployment

`.github/workflows/deploy.yml` runs on every push and every pull request.

1. **verify** — lint, `tsc --noEmit`, Vitest, `curriculum:check`, Playwright.
2. **deploy** — only on `main`, and only with `needs: verify`.

`curriculum:check` is the slow step (~45s at 71 lessons) because it executes
every authored solution under CPython and every SQL query under DuckDB. That is
the point of it; it is not doing static analysis.

`curriculum:check` executes every authored solution against its own tests, so
broken content cannot reach production. Nothing deploys without it passing.

## Firestore rules

Progress sync writes to `users/{uid}/progress/curriculumProgress`. Deploy the
rules whenever they change:

```bash
npx firebase-tools deploy --only firestore:rules --project <project-id>
```

The rules deny by default. A learner can read and write only their own subtree;
published content is world-readable and client-unwritable (the server uses the
Admin SDK, which bypasses rules).

**Progress sync is optional.** If Firestore is unreachable or the rules deny,
`syncProgress` fails silently and the site keeps working from localStorage —
that path is tested, and the site must never depend on it.

## Cost

The design keeps marginal cost near zero on purpose:

- **Grading is client-side.** Pyodide and DuckDB run in the learner's browser.
  No server compute per submission, and no sandbox to operate.
- **`/learn` and `/problems` are statically prerendered.** Cloud Run serves
  files; it scales to zero when idle.
- **Runtimes load from jsDelivr, not from us.** Cloud Run bills egress per byte
  and these runtimes are tens of megabytes. A CDN is free, and edge-cached
  closer to the learner than a single us-central1 region.
  `npm run runtimes:vendor` plus `NEXT_PUBLIC_RUNTIME_ORIGIN=self` switches to
  self-hosting for offline or air-gapped use.
- **Both engines load lazily**, on viewport entry. A Python-only lesson never
  downloads DuckDB.
- **Firestore holds one small document per learner**, written on load and on
  completion — comfortably inside the free tier for a site of this size.

- **The build context is 5MB.** `gcloud run deploy --source .` uploads the
  working tree to Cloud Build and reads `.gcloudignore` — *not* `.dockerignore`.
  Without it, `docs/` alone put ~700MB over the wire on every single deploy.
  Keep both ignore files in step when adding large directories.

The legacy daily pipeline (Gemini calls, TTS, ffmpeg video generation, GCS
storage) has been removed from the codebase, but **its Cloud Scheduler job is
still live in GCP and will now be calling a route that no longer exists.**
Pause or delete it to stop the spend and the error noise:

```bash
gcloud scheduler jobs list --location us-central1
gcloud scheduler jobs pause <job-name> --location us-central1
```

The GCS bucket and BigQuery dataset it wrote to are likewise still there and can
be deleted once you are sure you want the history gone.

## Environment

Required for the curriculum: none. The site builds and serves with no
environment variables at all.

Optional:

| Variable | Effect |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_*` | Enables sign-in and cloud progress sync |
| `NEXT_PUBLIC_CURRICULUM_PREVIEW=1` | Renders `status: draft` content locally |
| `NEXT_PUBLIC_RUNTIME_ORIGIN=self` | Serves wasm runtimes from `public/runtime/` |
| `PLAYWRIGHT_BASE_URL` | Points e2e at an already-running server |

The legacy news/quiz pipeline additionally needs `NEWS_API_KEY`,
`GEMINI_API_KEY`, `CRON_SECRET`, `GCS_CURRICULUM_BUCKET` and
`BIGQUERY_CURRICULUM_DATASET`.
