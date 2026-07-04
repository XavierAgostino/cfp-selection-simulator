# Hosted Runs v1 — Supabase project

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
| `20250704180000` | `hosted_runs_v1` — `run_jobs`, `runs`, `scenarios`, RLS + revokes |
| `20250704181500` | `hosted_artifacts_bucket` — private `artifacts` Storage bucket |

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
- Service role key and database URL: **server/worker only** — set in Vercel/Trigger/local `.env.local`, never `NEXT_PUBLIC_*`

## Local env (manual)

Copy secrets from Supabase Dashboard → Settings → API (service role) and Database → connection string (transaction pooler, port 6543).

Use [`web/.env.example`](../web/.env.example) hosted section. Example non-secret values:

```bash
SUPABASE_URL=https://tucqckdwtbrgmqlnwfhj.supabase.co
SUPABASE_STORAGE_BUCKET=artifacts
SELECTION_ROOM_BETA_RUN_CODES=<your-private-codes>
```

## Smoke test

```bash
chmod +x scripts/hosted-smoke.sh
./scripts/hosted-smoke.sh
```

Expect: hosted capabilities, proxied `/api/data/runs.json` 200, POST without/wrong beta → 401, valid beta without Trigger → 503.

After Trigger + worker env: POST → 202, job in `run_jobs`, worker → succeeded, `/dashboard?run=<stem>`.

See [Hosted Runs v1](hosted-runs-v1.md) and [Trigger worker](trigger-worker.md).
