# Development Guide

For contributors working on the simulator codebase.

---

## Setup

```bash
git clone https://github.com/XavierAgostino/cfp-selection-simulator.git
cd cfp-selection-simulator
make setup
```

Installs `pip install -e ".[app,dev]"` including `sroom`, pytest, black, isort, flake8.

---

## Test

```bash
make test
# or
pytest tests/ -v
```

With coverage:

```bash
pytest tests/ -v --cov=src
```

---

## Lint and format

```bash
make lint      # check only
make format    # auto-fix black + isort
```

Black is pinned to 23.x for CI consistency (`black>=23.12.1,<25`).

---

## Full verification

```bash
make verify
```

Runs tests, lint, and a sample-mode smoke run.

---

## Sample mode during development

```bash
make demo
sroom doctor
sroom outputs --latest
```

No API key required.

---

## Adding tests

- Place tests in `tests/test_*.py`
- Use fixtures from `tests/conftest.py` and `tests/fixtures/`
- Selection/seeding changes **require** unit tests (see `tests/test_seeding_2024.py`, `tests/test_field.py`)

---

## Notebook hygiene

- Do not commit large embedded outputs (`nbstripout` recommended)
- Notebooks are secondary to CLI; do not add notebook-only required steps to README

---

## API key handling

- Never commit `.env` or API keys
- Use `.env.example` as template
- CI does not run live CFBD fetches

---

## Release checklist

1. `make verify` passes
2. Update `CHANGELOG.md`
3. Bump version in `pyproject.toml` and `src/__init__.py`
4. README + docs updated for behavior changes
5. Push to `main`; confirm GitHub Actions green

---

## CI

Workflow: `.github/workflows/ci.yml`

- Python 3.9–3.12 matrix
- flake8, black, isort on `src/`, `tests/`, `app/`
- pytest with coverage

---

## Related

- [Contributing](../CONTRIBUTING.md)
- [Project Structure](project-structure.md)
