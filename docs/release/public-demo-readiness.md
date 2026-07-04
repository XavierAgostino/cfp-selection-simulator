# Public Demo / v1 Beta Readiness

Selection Room **v1 beta** is an **independent CFP selection analysis workspace**.
The first public release is a **read-only demo** using **generated artifacts** and
the **transparent baseline model** (40/30/20/10 composite weights). It is not a
hosted analyst platform, not affiliated with the CFP/NCAA/ESPN, and does not
imply live predictions when data is static.

**Research status (do not expand before demo launch):** V2.4 implementation is
complete; full 2014–2024 evaluation is pending CFBD quota/cache population.
V2.5 is deferred. Research implementation is frozen for v1 beta release
hardening. Nothing in v2 research is promoted into production defaults.

---

## Operating modes

| Mode | Audience | Data | Run generation |
|------|----------|------|----------------|
| **Public demo** | Web visitors | Bundled fixtures at build (`web/.demo-data/`) | Disabled |
| **Local OSS** | Contributors, analysts | `data/output/api/` from `make demo` | Optional (`SELECTION_ROOM_ENABLE_RUN_JOBS=1`) |
| **Hosted analyst platform** | Future | Object storage + worker | Documented, not implemented |

---

## Readiness assessment

### Ready

- Product surface: landing, dashboard, bracket, rankings, bubble, Scenario Lab, validation, methodology, docs
- Committed fixtures: `web/lib/fixtures/` (10 JSON files including validation)
- Client exports: rankings CSV, bracket PNG, resume card PNG
- Run jobs degrade gracefully when env unset
- V2 research isolated in `src/calibration/`; no web calibration UI

### Implemented for public demo

- `pnpm seed-fixtures:demo` bundles fixtures into `web/.demo-data/` at build time
- `web/vercel.json` runs seed + build
- `NEXT_PUBLIC_SELECTION_ROOM_DEMO_MODE=1` hides Run Analysis and adjusts Scenario Lab copy
- Demo `runs.json` lists only bundled stems (no 404 run picker entries)

### Still manual before first deploy

- Create/link Vercel project with **Root Directory** = `web`
- Set production env: `SELECTION_ROOM_DATA_DIR=.demo-data`, `NEXT_PUBLIC_SELECTION_ROOM_DEMO_MODE=1`, `NEXT_PUBLIC_SITE_URL=<url>`
- Do **not** set `SELECTION_ROOM_ENABLE_RUN_JOBS` or `CFBD_API_KEY` on public demo
- Smoke test preview URL after deploy

---

## Blockers (resolved in this pass)

| ID | Issue | Fix |
|----|-------|-----|
| B1 | No artifact data on Vercel | `seed-fixtures:demo` + `SELECTION_ROOM_DATA_DIR=.demo-data` |
| B2 | No Vercel config | `web/vercel.json` |
| B3 | Confusing Run Analysis copy | Demo mode hides button; Scenario Lab uses public-demo messaging |
| B4 | Week 14 listed but not bundled | Removed from demo `runs.json`; seed copies all listed stems + sensitivity per-run |
| B5 | Docs implied local-only | README, web-app, development updated |

---

## Non-blockers (explicitly deferred)

- Auth, Clerk, accounts
- Postgres / Neon / Supabase
- Hosted run jobs, workers, billing
- V2.5 injuries/VORP/full PBP
- Full V2.4 SOR evaluation (pending CFBD quota)
- Promoting any V2 weight experiments
- Hosted adapters H1–H7
- Scenario share URLs (v1.1)

---

## Vercel deployment

1. Import repo; set **Root Directory** to `web`
2. Framework: Next.js (auto-detected)
3. Build command (from `vercel.json`): `pnpm seed-fixtures:demo && pnpm build`
4. Environment variables:

| Variable | Value |
|----------|-------|
| `SELECTION_ROOM_DATA_DIR` | `.demo-data` |
| `NEXT_PUBLIC_SELECTION_ROOM_DEMO_MODE` | `1` |
| `NEXT_PUBLIC_SITE_URL` | `https://your-project.vercel.app` |

5. Deploy preview, smoke test routes, promote to production

See also [`web/.env.example`](../web/.env.example).

---

## Verification checklist

### Local production build (mirrors Vercel)

```bash
cd web
cp .env.example .env.local   # adjust NEXT_PUBLIC_SITE_URL if needed
pnpm seed-fixtures:demo
pnpm lint
pnpm exec tsc --noEmit
pnpm build
pnpm start
```

### Routes

- [ ] `/` — landing
- [ ] `/dashboard` — not SetupWizard
- [ ] `/bracket`, `/rankings`, `/bubble`, `/methodology`, `/validation`, `/scenario-lab`, `/docs`
- [ ] `/teams/[team]` — resume page

### Demo mode

- [ ] No CFBD key required
- [ ] Run Analysis button hidden
- [ ] Scenario Lab launch disabled with public-demo copy
- [ ] `GET /api/run/capabilities` → `run_generation_enabled: false`

### Exports

- [ ] Rankings CSV, bracket PNG, resume card PNG

### Repo hygiene

- [ ] `web/.demo-data/` not committed
- [ ] No `data/output/` or `data/cache/` committed

---

## Release checklist

1. Merge public demo readiness commits
2. Tag `v1.0.0-beta.1` (optional)
3. Deploy Vercel production with demo env vars
4. Smoke test production URL
5. Add live demo link to README
6. Keep research frozen until post-beta

---

## Suggested commit sequence

1. `Build: bundle demo fixtures for Vercel deploy`
2. `feat(web): public demo mode flag and Run Analysis UX`
3. `chore(web): add Vercel config and web env example`
4. `Docs: public demo readiness and v1 beta release framing`

Do not mix with V2.4 cache/SOR work in the same commits.

---

## Public release language

**Use:** Selection Room v1 beta, independent CFP selection analysis workspace, public demo, generated artifacts, transparent baseline model, research evaluated before promotion.

**Avoid:** final platform, official CFP tool, best/correct model, committee replacement, hosted SaaS, live predictions (when data is static).

---

## Related

- [Web App](../web-app.md)
- [Development Guide](../development.md)
- [Hosted production architecture](../architecture/hosted-production.md) (future)
- [v2 research board](../research/v2-tracks-research.md)
