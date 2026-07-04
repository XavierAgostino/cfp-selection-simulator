# Supabase setup for Hosted Runs (H2+)

Hosted metadata uses **Supabase Postgres** only in H2. Artifact storage (H3) and the worker (H5) are separate steps.

## 1. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Note the **Project URL** and **service role key** (Settings → API). Never expose the service role key to the browser.

## 2. Apply the migration

From the repo root, with [Supabase CLI](https://supabase.com/docs/guides/cli) linked to your project:

```bash
supabase db push
```

Or run the SQL manually in the Supabase SQL editor:

[`supabase/migrations/20250704180000_hosted_runs_v1.sql`](../../supabase/migrations/20250704180000_hosted_runs_v1.sql)

Tables: `run_jobs`, `runs`, `scenarios`. RLS is enabled with no public policies; use the service-role pooler URL from server/worker only.

## 3. Environment variables (hosted Vercel / worker)

```bash
SELECTION_ROOM_RUNTIME=hosted
SELECTION_ROOM_DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=artifacts   # reserved for H3, unused in H2

SELECTION_ROOM_HOSTED_DAILY_JOB_CAP=10
SELECTION_ROOM_HOSTED_MAX_CONCURRENT=1
```

Use the **transaction pooler** connection string (`:6543`) with `prepare: false` (already set in the app).

## 4. Manual verification (H2)

With `SELECTION_ROOM_RUNTIME=hosted` and `SELECTION_ROOM_DATABASE_URL` set:

```bash
cd web
pnpm exec tsx -e "
  process.env.SELECTION_ROOM_RUNTIME='hosted';
  const { getJobStore, getRunCatalogStore } = await import('./lib/runtime/index.ts');
  const jobs = await getJobStore().listRecentJobs(1);
  const catalog = await getRunCatalogStore().loadCatalog(1);
  console.log({ jobs, catalog });
"
```

Expected: empty arrays, `catalog.source === 'postgres'`, no connection errors.

Insert a test run:

```sql
INSERT INTO runs (stem, season, week, source, artifact_base_url, label)
VALUES ('2025_week15', 2025, 15, 'sample', 'supabase://artifacts/runs/2025_week15/', 'Test run');
```

Reload catalog; the run should appear.

## 5. Security notes

- Service role key and `SELECTION_ROOM_DATABASE_URL` are **server/worker only**.
- Do not set `NEXT_PUBLIC_` vars for secrets.
- RLS is enabled on all three tables; anon/authenticated roles have no grants.
- `SUPABASE_STORAGE_BUCKET` is documented for H3 but not used until artifact storage ships.

## 6. What H2 does not include

- Supabase Storage reads/writes (H3)
- Trigger.dev worker (H5)
- Run Analysis UI changes (H6)
- Public demo or local OSS behavior changes

Local development continues to work with default env (no `SELECTION_ROOM_RUNTIME=hosted`).
