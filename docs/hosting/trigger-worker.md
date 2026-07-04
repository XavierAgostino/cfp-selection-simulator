# Trigger.dev worker setup

Hosted Runs v1 executes Python outside Vercel via **Trigger.dev**. The Vercel API creates a Postgres job row and enqueues task `run-hosted-job`; the Trigger worker shells out to the repo CLI.

See also: [Hosted Runs v1 overview](hosted-runs-v1.md), [Supabase setup](supabase-setup.md).

---

## 1. Create a Trigger.dev project

1. Sign up at [trigger.dev](https://trigger.dev).
2. Create a project and note the **project ref** (`proj_...`).
3. Generate environment secret keys from **API Keys** in the dashboard:
   - **Development** (`tr_dev_...`) — local `pnpm dev:trigger` only
   - **Production** (`tr_prod_...`) — required for `pnpm deploy:trigger` and hosted enqueue (`TRIGGER_SECRET_KEY`)

---

## 2. Environment variables

Set these on **Vercel** (API enqueue) and on the **Trigger worker** (Python execution). All are server/worker only.

| Variable | Required | Purpose |
|----------|----------|---------|
| `TRIGGER_SECRET_KEY` | Yes | Authenticate Trigger SDK |
| `TRIGGER_PROJECT_REF` | Yes | Project ref for `trigger.config.ts` |
| `SELECTION_ROOM_HOSTED_EXECUTOR` | Yes | Set to `trigger` |
| `SELECTION_ROOM_RUNTIME` | Yes | `hosted` |
| `SELECTION_ROOM_ARTIFACT_STORE` | Yes | `supabase` |
| `SELECTION_ROOM_DATABASE_URL` | Yes | Supabase Postgres pooler URL |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Storage upload + server reads |
| `SUPABASE_STORAGE_BUCKET` | Yes | e.g. `artifacts` |
| `SELECTION_ROOM_BETA_ACCESS_CODE` or `SELECTION_ROOM_BETA_RUN_CODES` | Yes | Beta gate validation on Vercel |
| `SELECTION_ROOM_HOSTED_DAILY_JOB_CAP` | Recommended | Default `10` |
| `SELECTION_ROOM_HOSTED_MAX_CONCURRENT` | Recommended | Default `1` |
| `CFBD_API_KEY` | For live runs | Server/worker only |
| `SELECTION_ROOM_PYTHON` | Optional | Python binary (default `python3`) |
| `SELECTION_ROOM_REPO_DIR` | Optional | Repo root on worker (default parent of `web/`) |
| `SELECTION_ROOM_WORKER_DATA_OUTPUT` | Optional | Temp export dir on worker |

**Not forwarded to worker subprocess:** `SELECTION_ROOM_BETA_*`, `TRIGGER_SECRET_KEY` (see `web/lib/runtime/run-executor/worker-env.ts`).

---

## 3. Deploy the Trigger task

From `web/` (loads `web/.env.hosted.local` automatically):

```bash
cd web
pnpm deploy:trigger
```

The deploy script syncs `web/trigger-project.ts` from `TRIGGER_PROJECT_REF` before upload. That ref is **not secret** (Trigger requires it in the bundled config). Set `TRIGGER_PROJECT_REF=proj_...` in `web/.env.hosted.local` first.

Do **not** rely on the old placeholder `proj_selection_room`; that was never a real project.

Task definition: [`web/trigger/run-hosted-job.ts`](../../web/trigger/run-hosted-job.ts)

Config: [`web/trigger.config.ts`](../../web/trigger.config.ts)

The task:

- ID: `run-hosted-job`
- Payload: `{ jobId: string }` only (no secrets in payload)
- Runs: `python -m src.cli.main worker run-job <jobId>` with filtered env
- Max duration: 3600s, 2 retry attempts

---

## 4. Worker runtime expectations

The Trigger worker machine (or dev runner) must have:

1. **Python 3.9+** with repo dependencies installed (`make setup` or equivalent venv).
2. **Full repo checkout** including `src/` and `data/` sample paths the pipeline expects.
3. **Network** access to Supabase Postgres and Storage.
4. **Writable temp directory** for export (`SELECTION_ROOM_WORKER_DATA_OUTPUT` or system temp).

Set `SELECTION_ROOM_REPO_DIR` if the worker cwd is not the monorepo root. Set `SELECTION_ROOM_PYTHON` if `python3` is not on PATH (e.g. `.venv/bin/python`).

---

## 5. Test locally before cloud Trigger

Validate the Python worker path without Trigger first:

```bash
# Hosted env (same as Supabase setup doc)
export SELECTION_ROOM_RUNTIME=hosted
export SELECTION_ROOM_ARTIFACT_STORE=supabase
export SELECTION_ROOM_DATABASE_URL=postgresql://...
export SUPABASE_URL=https://[ref].supabase.co
export SUPABASE_SERVICE_ROLE_KEY=...
export SUPABASE_STORAGE_BUCKET=artifacts
export SELECTION_ROOM_BETA_ACCESS_CODE=your-beta-code
export SELECTION_ROOM_HOSTED_EXECUTOR=trigger

# Start web in hosted mode
cd web && pnpm dev

# Create a job via UI or curl (include beta header)
curl -X POST http://localhost:3000/api/run \
  -H "Content-Type: application/json" \
  -H "X-Selection-Room-Beta-Code: your-beta-code" \
  -d '{"season":2025,"week":15,"data_source":"sample"}'

# Run worker CLI against returned job_id
cd ..
python -m src.cli.main worker run-job run_YYYYMMDD_HHMMSS_xxxxxx
```

Verify:

- Postgres: `run_jobs.status = succeeded`, `run_stem` set
- Storage: `runs/{stem}/*.json`, `runs.json`, `latest.json`
- App: `curl http://localhost:3000/api/data/runs.json`
- UI: `/dashboard?run=<stem>`

Then wire Trigger and repeat end-to-end through the hosted UI.

---

## 6. Failure handling and logs

| Failure | Behavior |
|---------|----------|
| Enqueue fails after DB insert | API marks job `failed` |
| Worker crash mid-run | Job `failed`, error in `error_message` |
| Invalid beta / cap / active job | API rejects before DB row (except enqueue failure path) |
| CFBD unavailable on live run | 400 `cfbd_unavailable` at API |

Logs:

- Worker stdout/stderr appended to `run_jobs.logs_text` with redaction ([`src/worker/redaction.py`](../../src/worker/redaction.py)).
- UI polls `GET /api/run/:id/logs`.
- Trigger dashboard shows task runs and retries.

**Stuck `running` jobs:** if a worker dies without updating Postgres, manually set status to `failed` (see ops notes in [hosted-runs-v1.md](hosted-runs-v1.md)).

---

## 7. Ops notes

- **Rotate beta code:** update `SELECTION_ROOM_BETA_ACCESS_CODE` / `SELECTION_ROOM_BETA_RUN_CODES` on Vercel only; redeploy. Client sessionStorage codes expire with the browser session.
- **Tune daily cap:** `SELECTION_ROOM_HOSTED_DAILY_JOB_CAP` on Vercel.
- **Clear stuck jobs:** `UPDATE run_jobs SET status = 'failed', error_message = 'manual reset', finished_at = now() WHERE id = '...';`
- **Inspect artifacts:** Supabase Dashboard → Storage → `artifacts` bucket.
- **Orphan artifacts:** failed uploads may leave partial objects; safe to delete orphaned prefixes after confirming no `runs` row references them.
- **CFBD quota:** live hosted runs consume CFBD API quota from the server/worker key; monitor usage during beta.

---

## 8. Verification

After deploy:

```bash
# Vercel project env set; Trigger deploy complete
curl -s https://your-hosted.vercel.app/api/run/capabilities | jq .
# Expect runtime: hosted, executor_configured: true (when Trigger env present)
```

Run the [manual smoke checklist](hosted-runs-v1.md#manual-smoke-checklist) from the hosted UI.
