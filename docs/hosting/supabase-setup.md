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

1. Storage → **New bucket**
2. Name: `artifacts` (or set `SUPABASE_STORAGE_BUCKET`)
3. **Private bucket** (recommended). Do not enable public access.
4. Reads go through the Next.js server proxy: `/api/data/*` using the service role key. Clients never receive storage URLs or the service role key.

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

## 8. Phase scope

| Phase | Shipped |
|-------|---------|
| H2 Postgres metadata | Yes |
| H3 Storage artifact **reads** | Yes |
| H4 hosted job API | Not yet |
| H5 worker uploads | Not yet |
| H6 UI | Not yet |

Local development continues to work with default env (filesystem artifacts, no Supabase).
