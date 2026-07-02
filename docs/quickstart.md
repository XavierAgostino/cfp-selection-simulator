# Quickstart

Get the simulator running in under five minutes. No API key required for demo mode.

---

## 1. Install

```bash
git clone https://github.com/XavierAgostino/cfp-selection-simulator.git
cd cfp-selection-simulator
make setup
```

This runs `pip install -e ".[app,dev]"` and installs the `sroom` CLI.

Verify your environment:

```bash
sroom doctor
```

---

## 2. Run sample demo

```bash
make demo
```

Equivalent:

```bash
sroom run --year 2025 --week 15 --sample
```

Expected terminal output includes steps for loading games, rankings, field selection, seeding, bracket HTML, and manifest.

---

## 3. Inspect outputs

```bash
sroom outputs --latest
```

Files land under:

```
data/output/
├── rankings/   2025_week15_rankings.csv
├── fields/     2025_week15_field.csv
├── brackets/   2025_week15_bracket.csv
│               2025_week15_bracket.html
├── audits/     2025_week15_audit.json
└── runs/       2025_week15_manifest.json
```

Open the HTML bracket:

```bash
sroom open --latest
```

Column reference: [Output Files](output-files.md)

---

## 4. Launch dashboard

```bash
make dashboard
```

Use the sidebar to toggle sample vs live data. See [Dashboard Guide](dashboard-guide.md).

---

## 5. Run with live data

```bash
cp .env.example .env
# Edit .env and set CFBD_API_KEY

export CFBD_API_KEY="your_key_here"
sroom run --year 2025 --week 15
```

Or use a config file:

```bash
sroom run --config configs/2025.yaml
```

---

## One-shot demo script

```bash
./scripts/demo.sh
```

Installs, runs doctor, executes sample pipeline, generates bracket HTML, and lists outputs.

---

## Next steps

- [User Guide](user-guide.md) — how selection and seeding work
- [CLI Reference](cli-reference.md) — all commands and flags
- [Dashboard Guide](dashboard-guide.md) — Streamlit tabs
- [Research Methodology](research/index.md) — model and validation
