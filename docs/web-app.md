# Selection Room Web App

The **primary product surface**: a Next.js app under [`web/`](../web/) that renders
the engine's exported JSON as a broadcast-style selection show — dashboard,
bracket, rankings, bubble watch, team resumes, and methodology.

> [!TIP]
> Read-only browsing works with zero config after `make demo`. Run generation from the browser needs extra setup (see below).

---

## Running it

```bash
make web            # pnpm install + dev server at http://localhost:3000
```

or directly:

```bash
cd web
pnpm install
pnpm dev            # development
pnpm build && pnpm start   # production
```

No environment variables are required for **read-only** browsing. The app reads
the engine's exports from `data/output/api/` at the repo root (override with
`SELECTION_ROOM_DATA_DIR`).

> [!IMPORTANT]
> **Run Analysis from the browser** requires a persistent Node server (not static export or serverless-only hosting), Python installed, writable `data/output/`, and `SELECTION_ROOM_ENABLE_RUN_JOBS=1`. See [Development Guide](development.md) for env vars and stuck-job recovery.

> [!WARNING]
> Live CFBD runs use the **server's** `CFBD_API_KEY`. The key is never sent to the browser, but it must exist in the server's environment for live jobs to succeed.

## First-run experience

If `data/output/api/runs.json` doesn't exist yet, every page shows the setup
wizard with copy-paste commands (`make setup`, `make demo`). The wizard polls
for data and switches to the dashboard automatically once the first run lands.

> [!TIP]
> You can open `make web` before running the engine. The wizard stays visible until the first export completes.

## Running analyses from the site

The **Run Analysis** button in the run header opens a workspace with three tabs —
**Create**, **Runs**, and **Jobs** — to launch the Python engine via server-backed
jobs (Option B MVP):

1. On open, the dialog probes `GET /api/run/capabilities`.
2. Pick season (2014–2035), week (1–16), and data source:
   - **Sample data** — no API key
   - **Live CFBD** — uses the server's `CFBD_API_KEY` (never exposed to the browser)
3. `POST /api/run` accepts the job and returns `{ job_id }` with HTTP 202.
4. The UI polls `GET /api/run/[jobId]` and `GET /api/run/[jobId]/logs` every 2s.
5. On success, the site navigates to `?run=<stem>` where `stem` is resolved from
   `runs.json` (matching `run_id`, `scenario_id === "base"`, `data_source`, and
   `generated_at >= job.started_at`).

### Default week semantics

Run Analysis defaults to the **latest selection-relevant week** for the chosen season and data source, not a fixed demo week.

| Week | Meaning (when shown) |
|------|----------------------|
| **16** | Final selection window — preferred when data includes conference championship results |
| **15** | Pre-final / championship window — fallback when Week 16 is unavailable |

> [!NOTE]
> The bundled **sample demo** fixture currently stops at Week 15, so sample runs default to Week 15. **Live CFBD** runs prefer Week 16 when no local cache caps the season lower. The server resolves defaults via `GET /api/run/week-defaults`.

**One job at a time.** A second POST while a job is active returns 409. Live CFBD
runs without a server key return 400 (`cfbd_unavailable`). Live runs are throttled
by `SELECTION_ROOM_LIVE_RUN_THROTTLE_MINUTES` (default 5; set `0` for local dev).
Sample runs are exempt.

**Deployment requirements:** persistent Node process, Python + `.venv/`, writable
`data/output/jobs/` for job metadata and logs. Not intended for Vercel-style
serverless functions that cannot spawn background subprocesses after the response.

If run generation is disabled (`SELECTION_ROOM_ENABLE_RUN_JOBS` unset), the dialog
shows a deployment message and the API returns 501. If the engine is missing,
the UI points you at `make setup`.

### Job API

| Route | Purpose |
|-------|---------|
| `GET /api/run/capabilities` | Deployment probe (`run_generation_enabled`, `live_cfbd_enabled`, etc.) |
| `POST /api/run` | Create job (`{ season, week, data_source }`) → 202 + `job_id` |
| `GET /api/run` | Active or most recent job (legacy compat) |
| `GET /api/run/[jobId]` | Full job record (status, stem, error, pid, exit_code) |
| `GET /api/run/[jobId]/logs` | Redacted log tail (~200 lines) |

Job files live under `data/output/jobs/` (not served via `/api/data/`).

## Pages

| Route | What it shows |
|-------|---------------|
| `/` | Dashboard: projected field, first-round matchups, bubble snapshot |
| `/bracket` | Flagship bracket viewer (full bracket / rounds / matchup cards) |
| `/rankings` | Full composite table with score bars, search, and sorting |
| `/bubble` | Last four in / first four out / next four out + selection audit + **Selection Stability** board |
| `/teams/[team]` | Team resume: schedule, score breakdown, selection case + **Selection Stability** strip |
| `/methodology` | Live weights, 5+7 field rules, seeding eras, data sources |

Every team name is clickable and opens the resume drawer without leaving the
page. Multiple runs can coexist; the run switcher (`?run=<stem>`) flips the
whole site between them.

## Selection Stability

When `sensitivity.json` exists for the active run, the Bubble page shows a
Selection Stability board and the Team Resume drawer shows a compact stability
strip. Frequencies are 0–1 on the wire; the UI renders percentages.

If `sensitivity.json` is missing (older runs), Selection Stability surfaces are
omitted entirely — no proxy values.

Selection Stability varies model weights only. It does not simulate future game
outcomes. See [Sensitivity Analysis](research/sensitivity-analysis.md).

## Scenario Lab

Scenario Lab (interactive weight sliders and field diff) is **planned** but not
yet shipped. Do not expect in-app scenario editing today.

## Data plumbing

> [!NOTE]
> JSON under `data/output/api/` is the web contract. Pages never read DuckDB directly; the Python exporter is the single source of truth.

- `GET /api/data/<path>.json` serves `data/output/api/` verbatim
  (404 → `{"error": "not_found"}`), never cached.
- The contract between the Python exporter and the app is documented in
  [api-contracts.md](api-contracts.md) and enforced by
  `tests/test_api_contracts.py` on the Python side and `web/lib/types.ts` on
  the TypeScript side.

## Development

```bash
cd web
pnpm lint           # eslint
pnpm exec tsc --noEmit
pnpm build
```

CI runs all three on every push (see `.github/workflows/ci.yml`).

## Related

- [User Guide](user-guide.md)
- [Output Files](output-files.md)
- [API Contracts](api-contracts.md)
