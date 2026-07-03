# Contributing

Thanks for contributing to the Selection Room.

## AI-assisted contributions

Do not add `Co-Authored-By` trailers or list AI tools as project authors. Commits
should be authored by human contributors only.

---

## Before opening a PR

```bash
make setup
make verify
```

`make verify` runs tests, lint (black/isort/flake8), and a sample-mode smoke run.

---

## PR expectations

- Tests for new selection, seeding, or ranking logic
- No committed output files under `data/output/`
- No notebook output bloat (strip outputs before commit)
- Docs updated when behavior or CLI changes
- Black 23.x formatting (`make format`)

---

## Good first areas

- Tests (`tests/`)
- Documentation (`docs/`)
- Sample data improvements (`data/processed/sample/`)
- Dashboard polish (`app/streamlit_app.py`)
- Visualization and bracket UX

---

## Where to learn more

- [Development Guide](docs/development.md)
- [Project Structure](docs/project-structure.md)
- [Documentation index](docs/index.md)
