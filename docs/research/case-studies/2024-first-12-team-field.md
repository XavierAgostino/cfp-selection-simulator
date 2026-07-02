# Case Study: 2024 First 12-Team Field

## Context

2024 was the first 12-team College Football Playoff. Five conference champions received automatic bids; seven at-large teams filled the field. Top four **conference champions** received first-round byes (distinct from 2025+ straight seeding).

## Simulator relevance

This is the primary validation target for `PlayoffFormat` `2024` rules:

```bash
cfp-sim run --config configs/2024.yaml --sample
```

Compare against 2025 rules:

```bash
cfp-sim run --config configs/2025.yaml --sample
```

Inspect bye assignments in `data/output/brackets/*_bracket.csv`.

## Implementation

- `src/config/formats.py` — `champion_byes` seeding mode
- `src/selection/seeding.py` — `seed_champion_byes()`
- Tests: `tests/test_seeding_2024.py`

## Related

- [CFP Format History](../cfp-format-history.md)
- [User Guide](../../user-guide.md)
