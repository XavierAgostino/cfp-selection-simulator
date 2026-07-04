# Selection Room Docs

Documentation funnel: **Quickstart → Web App → User Guide → CLI / Output Files / Configuration → Research → Development**

> [!TIP]
> New here? Start with [Quickstart](quickstart.md), then open [Web App](web-app.md) and run `make web`.

---

## Reading these docs

Docs use [GitHub alert syntax](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#alerts) for callouts. They render on GitHub and in most Markdown previews.

| Block | Use for |
|-------|---------|
| `> [!TIP]` | Shortcuts, recommended paths, quality-of-life hints |
| `> [!NOTE]` | Context that helps but is not required to proceed |
| `> [!IMPORTANT]` | Requirements, constraints, or decisions that affect behavior |
| `> [!WARNING]` | Misconfiguration, data loss, or security-sensitive setup |

Example:

```markdown
> [!TIP]
> Run `make demo` before touching live CFBD data.
```

---

## Start here

| Doc | Audience | Purpose |
|-----|----------|---------|
| [Quickstart](quickstart.md) | Everyone | Install and run in 5 minutes |
| [Web App](web-app.md) | Everyone | **Primary product surface** — Next.js Selection Room app |
| [User Guide](user-guide.md) | Analysts, fans | Understand outputs and workflows |
| [CLI Reference](cli-reference.md) | Power users | Complete command reference |
| [Output Files](output-files.md) | Data explorers | CSV/JSON column reference and run identity |
| [Configuration](configuration.md) | Researchers | YAML configs and reproducibility |
| [API Contracts](api-contracts.md) | Developers | JSON contract mirror for Python exports ↔ web app |

---

## Research and methodology

The [Research index](research/index.md) is the **methodology homepage** — committee alignment, model design, validation, and limitations.

| Doc | Purpose |
|-----|---------|
| [Research index](research/index.md) | Canonical research documentation structure |
| [CFP Committee Alignment](research/cfp-committee-alignment.md) | Simulator vs official committee practice |
| [CFP Format History](research/cfp-format-history.md) | 4-team, 2024, 2025+ rules |
| [Model Methodology](research/model-methodology.md) | Composite pipeline and default weights |
| [Metric Definitions](research/metric-definitions.md) | SOR, SOS, resume, predictive, Selection Stability |
| [Historical Validation](research/historical-validation.md) | Backtest design and results (canonical validation) |
| [Sensitivity Analysis](research/sensitivity-analysis.md) | Selection Stability (canonical uncertainty doc) |
| [Data Sources](research/data-sources.md) | CFBD, caching, conference championships |
| [Limitations & Ethics](research/limitations-and-ethics.md) | Scope and responsible use |
| [Case studies](research/case-studies/) | Notable selection debates |

---

## Contributors

| Doc | Purpose |
|-----|---------|
| [Project Structure](project-structure.md) | Codebase layout |
| [Hosted Runs v1](hosting/hosted-runs-v1.md) | Deploy and operate hosted live beta |
| [Supabase setup](hosting/supabase-setup.md) | Postgres + Storage for hosted mode |
| [Supabase project (provisioned)](hosting/supabase-project.md) | Linked project ref, migrations, verification |
| [Deployment checklist](hosting/deployment-checklist.md) | Trigger, Vercel, E2E smoke |
| [Trigger worker setup](hosting/trigger-worker.md) | Trigger.dev worker deploy |
| [Hosted production architecture](architecture/hosted-production.md) | Adapter design and migration history |
| [Development Guide](development.md) | Setup, test, release |
| [Public demo readiness](release/public-demo-readiness.md) | Vercel read-only v1 beta deploy |
| [Contributing](../CONTRIBUTING.md) | PR expectations |

---
