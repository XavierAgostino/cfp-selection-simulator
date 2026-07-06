# Hosted Runs v1: Supabase project

Dedicated Supabase project for Selection Room hosted live beta. **Do not reuse unrelated app projects.**

## Project

| Field | Value |
|-------|-------|
| Name | `selection-room-hosted` |
| Project ref | `tucqckdwtbrgmqlnwfhj` |
| Region | `us-east-1` |
| URL | `https://tucqckdwtbrgmqlnwfhj.supabase.co` |
| Status | Active (provisioned 2026-07-04) |

Link this repo:

```bash
supabase link --project-ref tucqckdwtbrgmqlnwfhj
supabase db push
```

## Migrations applied

| Version | Name |
|---------|------|
| `20250704180000` | `hosted_runs_v1`: `run_jobs`, `runs`, `scenarios`, RLS + revokes |
| `20250704181500` | `hosted_artifacts_bucket`: private `artifacts` Storage bucket |

Verify with MCP or SQL:

```sql
SELECT id, public FROM storage.buckets WHERE id = 'artifacts';
SELECT COUNT(*) FROM run_jobs;
```

## Storage

- Bucket: `artifacts` (**private**, `public = false`)
- Test objects uploaded via CLI:

```bash
pnpm --dir web seed-fixtures:demo
supabase storage cp web/.demo-data/runs.json ss:///artifacts/runs.json --linked --experimental
supabase storage cp web/.demo-data/latest.json ss:///artifacts/latest.json --linked --experimental
supabase storage cp web/.demo-data/runs/2025_week15/rankings.json ss:///artifacts/runs/2025_week15/rankings.json --linked --experimental
```

Public object URL returns non-200 (bucket is not public). Reads go through `/api/data/*` with the service role on the server.

## Security verified (MCP)

- `run_jobs`, `runs`, `scenarios`: RLS enabled, **no policies**, `anon`/`authenticated` have **no grants**
- Only `service_role` has table privileges
- Service role key and database URL: **server/worker only**, set in Vercel/Trigger/local `.env.local`, never `NEXT_PUBLIC_*`

## Local env (manual)

The Supabase CLI `pooler-url` file does **not** include the database password. Bootstrap requires one of:

```bash
# Option A: password from Dashboard → Connect → Database
SUPABASE_DB_PASSWORD='...' ./scripts/bootstrap-hosted-env.sh

# Option B: full transaction pooler URL (port 6543)
SELECTION_ROOM_DATABASE_URL='postgresql://postgres.tucqckdwtbrgmqlnwfhj:...@aws-0-us-east-1.pooler.supabase.com:6543/postgres' \
  ./scripts/bootstrap-hosted-env.sh
```

Then:

```bash
chmod +x scripts/hosted-smoke.sh scripts/hosted-worker-smoke.sh
./scripts/hosted-smoke.sh
./scripts/hosted-worker-smoke.sh   # after bootstrap with password
```

Copy secrets from Supabase Dashboard → Settings → API (service role) and Database → connection string. Use [`web/.env.example`](../web/.env.example) hosted section for the full variable list.

See [Hosted Runs v1](hosted-runs-v1.md) and [Trigger worker](trigger-worker.md).
