# Render Bootstrap Checklist (Single-Service Path)

**Status:** Secondary / bootstrap option. **Primary architecture:** [Hosted production](../architecture/hosted-production.md) (Vercel + worker + object storage + Postgres).

Use this checklist when evaluating a **single Render Web Service** that runs Next.js, Python, and local disk together. That pattern is a **valid bootstrap / single-service path** for early deployment. It is **less aligned** with the long-term separation of web, worker, artifact storage, and metadata — but it matches much of today's codebase without adapter refactors.

---

## Feasibility summary

| Component | Feasible on Render Web Service? |
|-----------|--------------------------------|
| Next.js (read JSON pages) | Yes — needs seeded `runs.json` or prior demo run |
| Option B jobs (subprocess) | Yes — persistent disk + Python in image |
| JSON export contract | Yes — writable `data/output/api/` |
| DuckDB dual-write | Yes — same writable `data/output/` |
| Run Analysis modal | Yes — depends on APIs above |
| Live CFBD | Yes — `CFBD_API_KEY` secret |

**Not feasible:** Vercel-style static export or pure serverless without persistent process and disk.

---

## Service requirements

- **Type:** Render Web Service (not Static Site)
- **Runtime:** Docker recommended (Node + Python 3.11 in one image)
- **Persistent disk:** Recommended so jobs, exports, and DuckDB survive redeploy
- **Instances:** Single instance (one active job guard today)
- **Health check:** `GET /api/run/capabilities` or `/`

Free tier spin-down and ephemeral filesystem limits apply. Without a persistent disk, redeploy wipes `data/output/`.

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `SELECTION_ROOM_REPO_DIR` | Repo root (e.g. `/app`) when cwd is `/app/web` |
| `SELECTION_ROOM_ENABLE_RUN_JOBS` | `1` to enable browser runs |
| `SELECTION_ROOM_STORE_REQUIRED` | `1` default — JSON/DuckDB sync |
| `CFBD_API_KEY` | Live CFBD (secret) |
| `SELECTION_ROOM_LIVE_RUN_THROTTLE_MINUTES` | Production throttle (default 5) |

Mount persistent disk at `/app/data/output` so jobs, API JSON, and DuckDB share one volume.

**Note:** `JOBS_DIR` has no separate env override today; mount the full `data/output` tree.

---

## Reference Docker outline (not committed)

```dockerfile
# Build: pip install -e ".[app]" && cd web && pnpm install && pnpm build
# Runtime: WORKDIR /app/web, CMD pnpm start
# Volume: /app/data/output
```

Build must produce `/app/.venv/bin/python` (used by `runJob.ts` and catalog subprocess).

---

## Verification matrix

Run after deploy (or locally with `pnpm build && pnpm start`):

| # | Check | Pass criteria |
|---|-------|---------------|
| 1 | `GET /api/run/capabilities` | `run_generation_enabled`, `engine_available`, `storage_writable` true |
| 2 | Run Analysis → Sample job | Succeeds; navigates to run |
| 3 | `data/output/api/runs.json` | Updates after job |
| 4 | Dashboard / Rankings / Bracket | JSON loads (not setup wizard) |
| 5 | `selection_room.duckdb` | Exists after export |
| 6 | `GET /api/runs/catalog` | Lists runs (`duckdb` or `runs_json`) |
| 7 | Switch run dropdown | URL and page data change |
| 8 | Restart with disk | Runs/jobs/DB persist |
| 9 | Restart without disk | Document expected data loss |

---

## When to choose this vs hosted architecture

| Choose Render bootstrap | Choose Vercel + worker + storage + Postgres |
|-------------------------|---------------------------------------------|
| Fastest path with current code | Serious public / multi-user product |
| Single tenant, low traffic | Separate web scale from worker scale |
| Accept disk coupling | Share links, job history, retries at scale |
| Temporary staging | Long-term operational model |

When the product outgrows single-service hosting, implement [Hosted Architecture H1–H7](../architecture/hosted-production.md#migration-order-locked) rather than extending local-disk patterns further.

---

## Related

- [Hosted production architecture](../architecture/hosted-production.md)
- [Development guide](../development.md) — env vars, stuck jobs, DuckDB
