# Notebooks

Research and exploratory notebooks for the Selection Room.

**Primary user path:** CLI + dashboard, not notebooks.

```bash
make demo
make dashboard
```

See [docs/quickstart.md](../docs/quickstart.md).

---

## Notebooks (legacy research path)

| Notebook | Topic |
|----------|-------|
| `01_data_fetching.ipynb` | CFBD data loading |
| `02_ranking_algorithms.ipynb` | Colley, Massey, Elo |
| `03_composite_rankings.ipynb` | Composite pipeline |
| `04_resume_analysis.ipynb` | Team résumé sheets |
| `05_playoff_selection.ipynb` | Field selection and bracket |
| `06_visualization_report.ipynb` | Reports and charts |
| `08_validation_backtesting.ipynb` | Historical validation |

---

## Running notebooks

```bash
pip install -e ".[jupyter,dev]"
jupyter lab notebooks/
```

Set `CFBD_API_KEY` in `.env` for live data notebooks.

---

## Hygiene

- Strip outputs before committing (`nbstripout` recommended)
- Prefer adding logic to `src/` and tests rather than notebook-only code

---

## Related

- [User Guide](../docs/user-guide.md)
- [Development Guide](../docs/development.md)
