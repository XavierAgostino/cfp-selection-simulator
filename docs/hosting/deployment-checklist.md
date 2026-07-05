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
| `GET /api/run/capabilities` | `runtime: hosted`, `requires_auth: true`, `authenticated: false` |
| `POST` signed out, no bypass | 401 `auth_required` |
| `POST` wrong beta bypass | 401 `auth_required` |
| `POST` valid beta bypass | 503 `executor_not_configured` |
| `GET /api/data/runs.json` | 200 (server proxy) |
| Public storage URL | non-200 |

> Run launch is gated by **Supabase Auth (GitHub sign-in)**. The legacy beta code
> still works as a header-only bypass for curl smoke tests; browser users sign in
> with GitHub. The smoke script needs `NEXT_PUBLIC_SUPABASE_URL` +
> `NEXT_PUBLIC_SUPABASE_ANON_KEY` set (it derives them from the linked project).

## Phase 2 — Local worker (no Trigger cloud)

```bash
./scripts/hosted-worker-smoke.sh
```

Expected:

- Job `queued → running → succeeded` (sample mode)
- `runs` row in Postgres
- Artifacts in Supabase Storage
- Logs without secrets

## Seed the official sample field

So a fresh anonymous visitor browses real data with zero setup (this is what lets
the hosted project stand alone — no separate read-only demo project needed):

```bash
node scripts/seed-hosted-catalog.mjs --dry-run   # preview
node scripts/seed-hosted-catalog.mjs             # upload + upsert
```

Idempotent. Uploads every `data/output/api/*.json` (root indexes, root flat copies
that the default `?run` view reads, and per-run copies) to Storage, then upserts one
`runs` row per entry in `runs.json` with weights/flags in `manifest_json`. Re-run
after regenerating artifacts to refresh the catalog.

## Sign-in gate (Supabase Auth + GitHub)

Browsing is always open. Launching a run requires a signed-in GitHub user, with a
per-user daily quota (`SELECTION_ROOM_HOSTED_USER_DAILY_JOB_CAP`, default 5) on top
of the global caps.

**Manual (you), one time:**

1. **GitHub OAuth app** — GitHub → Settings → Developer settings → OAuth Apps → New.
   - Homepage URL: your hosted domain.
   - Authorization callback URL: `https://<supabase-ref>.supabase.co/auth/v1/callback`
     (Supabase brokers the OAuth handshake; the app returns to `/auth/callback`).
   - Copy the Client ID and generate a Client Secret.
2. **Supabase → Authentication → Providers → GitHub** — enable, paste Client ID/Secret.
3. **Supabase → Authentication → URL Configuration** — add your hosted origin(s) and
   `http://localhost:3099` (smoke) to the redirect allow-list.
4. **Apply the migration** so per-user quota can be counted:
   `supabase db push` (adds `run_jobs.user_id` + index — `20260705180000_run_jobs_user_id.sql`).

The two `NEXT_PUBLIC_SUPABASE_*` values are public (they ship in the bundle) — set
them on Vercel and in `web/.env.hosted.local`.

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
- Do **not** set local `SELECTION_ROOM_REPO_DIR` / `SELECTION_ROOM_PYTHON` on Trigger (use `pnpm deploy:trigger`, which stages monorepo sources and sets cloud Python paths)

Re-run `./scripts/hosted-smoke.sh` with `TRIGGER_SECRET_KEY` set → valid beta should return **202**.

Verify Trigger cloud execution (bypasses API daily cap):

```bash
JOB=$(node scripts/create-hosted-test-job.mjs)
cd web && set -a && source .env.hosted.local && set +a
node --input-type=module -e "
import { configure, tasks } from '@trigger.dev/sdk/v3';
configure({ secretKey: process.env.TRIGGER_SECRET_KEY });
const handle = await tasks.trigger('run-hosted-job', { jobId: process.argv[1] });
console.log(handle.id);
" "$JOB"
# Poll run_jobs until status=succeeded
```

### Weekly official run (scheduled)

`web/trigger/weekly-official-run.ts` (task id `weekly-official-run`) keeps the
catalog's default field current on its own. It fires **Tuesday 10pm ET**
(`0 22 * * 2`, `America/New_York`), just after the CFP committee releases its
rankings, resolves the **latest committee week** from CFBD, and launches an
official run (`user_id` null, so no per-user quota is consumed) through the same
`run-hosted-job` path as user runs.

It is **dormant by default** — the run body returns `skipped: disabled` unless
`SELECTION_ROOM_OFFICIAL_RUN_ENABLED=1`, so the schedule can deploy now and spend
zero CFBD quota off-season. The schedule itself still registers on
`pnpm deploy:trigger` and shows up in the Trigger dashboard (each dormant fire is
a benign skipped run).

**Activate in-season** (Trigger worker env — server only):

- `SELECTION_ROOM_OFFICIAL_RUN_ENABLED=1`
- `SELECTION_ROOM_OFFICIAL_RUN_SOURCE=cfbd` (default; `sample` for off-season tests)
- `SELECTION_ROOM_OFFICIAL_RUN_SEASON=auto` (default; a year to pin)
- `SELECTION_ROOM_OFFICIAL_RUN_WEEK=auto` (default; 1–16 to pin a week)
- Requires `CFBD_API_KEY` for auto week detection.

> **First-week validation:** confirm the auto-detected committee week matches the
> week you want analyzed (CFBD labels the committee poll with a `week`; verify it
> lines up with the games the run should cover). If it's off by one, pin
> `SELECTION_ROOM_OFFICIAL_RUN_WEEK` for that cycle.

**Test the whole path now (off-season, no live quota):** flip the switch on with
`SOURCE=sample` and an explicit `WEEK`, trigger `weekly-official-run` once from
the dashboard, and confirm a `run_jobs` row + catalog `runs` row appear.

## Phase 4 — Vercel hosted project

**Dashboard/manual (you):**

1. New Vercel project (not the public demo)
2. Root Directory: `web`
3. Build: `pnpm seed-fixtures:demo && pnpm build` (fixtures harmless; hosted reads Supabase)
4. Set env vars from [Hosted Runs v1](hosted-runs-v1.md) — all server-side except `NEXT_PUBLIC_SITE_URL`

**CLI** (logged in as `xavieragostino`):

```bash
./scripts/vercel-link-hosted.sh
NEXT_PUBLIC_SITE_URL=https://selection-room-hosted.vercel.app ./scripts/sync-vercel-hosted-env.sh production
# Deploy from repo root (project rootDirectory=web)
npx vercel deploy --prod --yes
```

Keep public demo linked separately (`selection-room`). Use `./scripts/vercel-link-demo.sh` before demo deploys.

**Project settings** (must match `selection-room` demo except env vars):

| Setting | Value |
|---------|-------|
| Root Directory | `web` |
| Framework | Next.js |
| Build Command | `pnpm seed-fixtures:demo && pnpm build` |
| Git repo | `XavierAgostino/cfp-selection-simulator` |

Deploy from **repo root**, not `web/`. CLI deploys from `web/` fail with `web/web` path errors when rootDirectory is set.

**Deployment protection:** if `/api/run/capabilities` returns an HTML login page, disable Vercel Authentication / Deployment Protection for `selection-room-hosted`, or use a protection bypass token for smoke tests.

## Phase 5 — End-to-end hosted preview

On preview URL:

1. Signed out, the global header shows a **Sign in** affordance; after GitHub OAuth it
   becomes the account avatar (menu → Sign out). Header shows nothing on demo/local.
2. Sign in with GitHub, then Run Analysis → job succeeds
3. `/dashboard?run=<stem>` loads
4. Scenario Lab hosted launch works (signed in)
5. Signed-out visitor can browse the field but sees the sign-in gate on launch
6. Logs contain no secrets

## Ops

- Per-user quota: `SELECTION_ROOM_HOSTED_USER_DAILY_JOB_CAP` (default 5) on Vercel
- Abusive user: no `user_id` allow/deny list yet — lower the per-user cap or revoke at
  the Supabase Auth level (delete/ban the user)
- Legacy beta bypass: `SELECTION_ROOM_BETA_RUN_CODES` still works if set; leave unset
  to make GitHub sign-in the only path
- Stuck jobs: mark `failed` in `run_jobs` manually
- Storage orphans: delete unused prefixes after confirming no `runs` row
