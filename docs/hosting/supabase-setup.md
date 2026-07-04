# Supabase setup for Hosted Runs

Hosted infrastructure uses **Supabase Postgres** (H2) for job/run metadata and **Supabase Storage** (H3) for JSON artifacts. The worker (H5) uploads artifacts later; H3 supports **server-side reads only** through `/api/data`.

## 1. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Note the **Project URL** and **service role key** (Settings → API). Never expose the service role key to the browser.

## 2. Apply the Postgres migration

From the repo root, with [Supabase CLI](https://supabase.com/docs/guides/cli) linked to your project:

```bash
supabase db push
```

Or run the SQL manually in the Supabase SQL editor:

[`supabase/migrations/20250704180000_hosted_runs_v1.sql`](../../supabase/migrations/20250704180000_hosted_runs_v1.sql)

Tables: `run_jobs`, `runs`, `scenarios`. RLS is enabled with no public policies; use the service-role pooler URL from server/worker only.

## 3. Create a private Storage bucket (H3)

The repo migration [`20250704181500_hosted_artifacts_bucket.sql`](../../supabase/migrations/20250704181500_hosted_artifacts_bucket.sql) creates the private `artifacts` bucket when you run `supabase db push`. Manual Dashboard creation is optional if the migration is applied.

1. Storage → verify bucket **`artifacts`** exists (`SUPABASE_STORAGE_BUCKET`)
2. **Private bucket** (`public = false`). Do not enable public access.
3. Reads go through the Next.js server proxy: `/api/data/*` using the service role key. Clients never receive storage URLs or the service role key.

Upload test fixtures (linked project):

```bash
pnpm --dir web seed-fixtures:demo
supabase storage cp web/.demo-data/runs.json ss:///artifacts/runs.json --linked --experimental
supabase storage cp web/.demo-data/latest.json ss:///artifacts/latest.json --linked --experimental
```

Dedicated project details: [supabase-project.md](supabase-project.md).

### Object layout

Mirror the local `data/output/api/` contract:

```
artifacts/                          ← bucket root
  runs.json
  latest.json
  team-assets.json
  runs/2025_week15/rankings.json
  runs/2025_week15/field.json
  runs/2025_week15/bracket.json
  runs/2025_week15/audit.json
  runs/2025_week15/team-resumes.json
  runs/2025_week15/sensitivity.json
```

Upload via Supabase Dashboard → Storage, or CLI/API using the service role key.

## 4. Environment variables (hosted Vercel / worker)

```bash
SELECTION_ROOM_RUNTIME=hosted
SELECTION_ROOM_ARTIFACT_STORE=supabase
SELECTION_ROOM_DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=artifacts

SELECTION_ROOM_HOSTED_DAILY_JOB_CAP=10
SELECTION_ROOM_HOSTED_MAX_CONCURRENT=1
```

Use the **transaction pooler** connection string (`:6543`) with `prepare: false` (already set in the app).

Local OSS and public demo do **not** need these vars.

## 5. Manual verification (H3 artifact reads)

1. Upload minimal fixtures to the `artifacts` bucket (copy from `web/fixtures/` or `.demo-data/` after `pnpm seed-fixtures:demo`):
   - `runs.json`
   - `latest.json`
   - `runs/2025_week15/rankings.json` (and sibling files as needed)

2. Set hosted + supabase env vars locally and start the app:

```bash
cd web
SELECTION_ROOM_RUNTIME=hosted \
SELECTION_ROOM_ARTIFACT_STORE=supabase \
SELECTION_ROOM_DATABASE_URL=... \
SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
pnpm dev
```

3. Request proxied reads (no direct storage URLs):

```bash
curl -s http://localhost:3000/api/data/runs.json | head
curl -s "http://localhost:3000/api/data/runs/2025_week15/rankings.json" | head
```

Expected: JSON payloads. Missing objects return `404 {"error":"not_found"}` (not SetupWizard).

4. Scenario diff (requires both stems' artifacts in storage):

```bash
curl -s "http://localhost:3000/api/scenario/diff?base=2025_week15&scenario=2025_week15__w45-25-20-10"
```

## 6. Manual verification (H2 Postgres metadata)

With `SELECTION_ROOM_RUNTIME=hosted` and `SELECTION_ROOM_DATABASE_URL` set, catalog/jobs resolve from Postgres. See H2 steps in git history or run:

```sql
INSERT INTO runs (stem, season, week, source, artifact_base_url, label)
VALUES ('2025_week15', 2025, 15, 'sample', 'supabase://artifacts/runs/2025_week15/', 'Test run');
```

`GET /api/runs/catalog` should list the row when Postgres is configured (metadata only; payloads still from Storage in H3).

## 7. Security notes

- Service role key and `SELECTION_ROOM_DATABASE_URL` are **server/worker only**.
- Do not set `NEXT_PUBLIC_` vars for secrets.
- Keep the Storage bucket **private**; proxy reads through `/api/data`.
- RLS is enabled on Postgres tables; anon/authenticated roles have no grants.

## 8. Manual verification (H5 worker execution)

The hosted worker runs outside Vercel. Test the Python CLI locally before deploying Trigger.dev:

```bash
# Apply migration + create Supabase bucket (sections 2–3 above)

# Hosted env (server/worker only)
export SELECTION_ROOM_RUNTIME=hosted
export SELECTION_ROOM_ARTIFACT_STORE=supabase
export SELECTION_ROOM_DATABASE_URL=postgresql://...
export SUPABASE_URL=https://[ref].supabase.co
export SUPABASE_SERVICE_ROLE_KEY=...
export SUPABASE_STORAGE_BUCKET=artifacts
export SELECTION_ROOM_BETA_ACCESS_CODE=your-beta-code
export TRIGGER_SECRET_KEY=tr_dev_...
export SELECTION_ROOM_HOSTED_EXECUTOR=trigger
export TRIGGER_PROJECT_REF=proj_...

# Optional: CFBD live runs
export CFBD_API_KEY=...

# 1. Start web in hosted mode and create a job (POST /api/run with beta code)
cd web && pnpm dev

# 2. Run the worker CLI against the queued job id
cd ..
python -m src.cli.main worker run-job run_YYYYMMDD_HHMMSS_xxxxxx

# 3. Verify Postgres
# run_jobs.status = succeeded, run_stem set, artifact_base_url set
# runs row exists for the stem

# 4. Verify Storage objects (Dashboard or API): runs.json, latest.json, runs/{stem}/*.json

# 5. Verify reads through the app proxy
curl -s http://localhost:3000/api/data/runs.json | head
curl -s "http://localhost:3000/api/data/runs/{stem}/rankings.json" | head
```

Deploy Trigger.dev worker from `web/`:

```bash
cd web
pnpm dlx trigger.dev@latest deploy
```

The Trigger task `run-hosted-job` shells out to `python -m src.cli.main worker run-job <jobId>`. The worker image must include Python, repo checkout, and the env vars above. The Trigger payload contains only `{ jobId }`; secrets are injected via Trigger worker env, not logged by the task.

### Global artifact files (`runs.json`, `latest.json`)

Hosted v1 enforces **one active job globally**, so global `runs.json` and `latest.json` writes from the worker are serialized per job completion. Postgres `runs` is the catalog source of truth in hosted mode; these root artifacts exist for `/api/data` proxy compatibility with the local JSON layout.

Longer term, catalog should be derived from Postgres and per-run artifacts should avoid relying on global file mutation across concurrent jobs.

Completed runs open at `/dashboard?run=<stem>` (H6 UI wiring).

## 9. Phase scope

| Phase | Shipped |
|-------|---------|
| H2 Postgres metadata | Yes |
| H3 Storage artifact **reads** | Yes |
| H4 hosted job API gating | Yes |
| H5 worker uploads + Trigger.dev | Yes |
| H6 hosted UI (beta code + job polling) | Yes |
| H7 docs / deploy runbook | Yes |

## 10. Metadata tables

| Table | Purpose |
|-------|---------|
| `run_jobs` | Job queue state, logs, error, `run_stem`, Trigger run id |
| `runs` | Run catalog metadata (stem, season, week, source, artifact URL) |
| `scenarios` | Scenario weight runs linked to base run stem |

Payload JSON lives in Storage only. The web app reads artifacts through `/api/data/*`; catalog and jobs come from Postgres when `SELECTION_ROOM_RUNTIME=hosted`.

## 11. Ops notes

- **Rotate beta code:** change `SELECTION_ROOM_BETA_ACCESS_CODE` on Vercel; no client-side config.
- **Tune daily cap:** `SELECTION_ROOM_HOSTED_DAILY_JOB_CAP`.
- **Stuck `running` jobs:** manually mark failed in `run_jobs` if worker died (see [trigger-worker.md](trigger-worker.md)).
- **Storage cleanup:** delete orphan object prefixes only after confirming no matching `runs.stem`.
- **CFBD quota:** live runs use server/worker `CFBD_API_KEY`.

See [Hosted Runs v1](hosted-runs-v1.md) for the full smoke checklist and security summary.
