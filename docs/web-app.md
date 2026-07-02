# Selection Room Web App

The primary product surface: a Next.js app under [`web/`](../web/) that renders
the engine's exported JSON as a broadcast-style selection show — dashboard,
bracket, rankings, bubble watch, team resumes, and methodology.

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

No environment variables are required. The app reads the engine's exports from
`data/output/api/` at the repo root (override with `SELECTION_ROOM_DATA_DIR`).

## First-run experience

If `data/output/api/runs.json` doesn't exist yet, every page shows the setup
wizard with copy-paste commands (`make setup`, `make demo`). The wizard polls
for data and switches to the dashboard automatically once the first run lands.

## Running new analyses from the site

The **New run** button in the run context bar launches the Python engine
directly from the browser:

- pick a season (2014–2035), week (1–16), and data source
  (**Live CFBD** uses the `CFBD_API_KEY` from the repo's `.env`;
  **Sample data** needs no key),
- the engine runs `sroom run` behind `POST /api/run` (one run at a time),
- live log output streams into the dialog, and the site switches to the new
  run when it finishes.

This works because the Next server lives inside the repo and can see
`.venv/`. If the engine isn't installed yet, the API returns 501 and the UI
points you at `make setup`.

## Pages

| Route | What it shows |
|-------|---------------|
| `/` | Dashboard: projected field, first-round matchups, bubble snapshot |
| `/bracket` | Flagship bracket viewer (full bracket / rounds / matchup cards) |
| `/rankings` | Full composite table with score bars, search, and sorting |
| `/bubble` | Last four in / first four out / next four out + selection audit |
| `/teams/[team]` | Team resume: schedule, score breakdown, selection case |
| `/methodology` | Live weights, 5+7 field rules, seeding eras, data sources |

Every team name is clickable and opens the resume drawer without leaving the
page. Multiple runs can coexist; the run switcher (`?run=<stem>`) flips the
whole site between them.

## Data plumbing

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
