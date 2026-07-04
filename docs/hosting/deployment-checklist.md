# Hosted deployment checklist

Separate **hosted beta** from the **public read-only demo**. Do not share env vars between Vercel projects.

## Phase 1 — Local hosted smoke (Supabase + API)

```bash
supabase link --project-ref tucqckdwtbrgmqlnwfhj
SUPABASE_DB_PASSWORD='...' ./scripts/bootstrap-hosted-env.sh
./scripts/hosted-smoke.sh
```

Expected **before Trigger**:

| Check | Expected |
|-------|----------|
| `GET /api/run/capabilities` | `runtime: hosted`, `requires_beta_code: true` |
| `POST` no beta | 401 |
| `POST` wrong beta | 401 |
| `POST` valid beta | 503 `executor_not_configured` |
| `GET /api/data/runs.json` | 200 (server proxy) |
| Public storage URL | non-200 |

## Phase 2 — Local worker (no Trigger cloud)

```bash
./scripts/hosted-worker-smoke.sh
```

Expected:

- Job `queued → running → succeeded` (sample mode)
- `runs` row in Postgres
- Artifacts in Supabase Storage
- Logs without secrets

## Phase 3 — Trigger.dev

**Dashboard/manual (you):**

1. Create project at [trigger.dev](https://trigger.dev)
2. Copy `TRIGGER_SECRET_KEY` and `TRIGGER_PROJECT_REF`
3. Add to `web/.env.hosted.local` (local) and Trigger worker env (cloud)

**CLI:**

```bash
cd web
pnpm dlx trigger.dev@latest login
pnpm deploy:trigger
```

Trigger worker env (server only):

- `SELECTION_ROOM_RUNTIME=hosted`
- `SELECTION_ROOM_DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET=artifacts`
- `CFBD_API_KEY` (live runs only)
- `SELECTION_ROOM_REPO_DIR` / `SELECTION_ROOM_PYTHON` if runtime paths differ

Re-run `./scripts/hosted-smoke.sh` with `TRIGGER_SECRET_KEY` set → valid beta should return **202**.

## Phase 4 — Vercel hosted project

**Dashboard/manual (you):**

1. New Vercel project (not the public demo)
2. Root Directory: `web`
3. Build: `pnpm seed-fixtures:demo && pnpm build` (fixtures harmless; hosted reads Supabase)
4. Set env vars from [Hosted Runs v1](hosted-runs-v1.md) — all server-side except `NEXT_PUBLIC_SITE_URL`

**CLI** (logged in as `xavieragostino`):

```bash
cd web
npx vercel link    # choose new project
npx vercel env add SELECTION_ROOM_RUNTIME
# ... repeat for each secret via dashboard or vercel env add
npx vercel deploy
```

## Phase 5 — End-to-end hosted preview

On preview URL:

1. Run Analysis with beta code → job succeeds
2. `/dashboard?run=<stem>` loads
3. Scenario Lab hosted launch works
4. Logs contain no secrets

## Ops

- Rotate beta: change `SELECTION_ROOM_BETA_RUN_CODES` on Vercel only
- Stuck jobs: mark `failed` in `run_jobs` manually
- Storage orphans: delete unused prefixes after confirming no `runs` row
