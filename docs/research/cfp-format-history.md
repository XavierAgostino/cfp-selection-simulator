# CFP Format History

This document tracks official College Football Playoff format changes relevant to field selection and seeding in this simulator.

## 2014–2023: Four-Team Era

- Four teams selected by the CFP Selection Committee.
- Semifinals at New Year's Six bowl sites; national championship game one week later.
- No automatic conference champion bids.

## 2024: First 12-Team Format

- **Field:** 5 highest-ranked conference champions (automatic bids) + 7 at-large teams.
- **Seeding:** Top four **conference champions** received seeds 1–4 and first-round byes.
- Remaining eight teams played first-round games on campus (5 vs 12, 6 vs 11, 7 vs 10, 8 vs 9).
- Quarterfinals at NY6 sites; no reseeding after first round.

Simulator config:

```python
PlayoffFormat(
    name="2024",
    auto_bids=5,
    at_large=7,
    seeding="champion_byes",
    bye_rule="top_4_conference_champions",
)
```

## 2025–26 and Beyond: Straight Seeding

- **Field:** unchanged — 5 highest-ranked conference champions + 7 at-large.
- **Seeding:** Teams seeded 1–12 by **final committee ranking** (straight seeding).
- **Byes:** Top four **overall** ranked teams receive first-round byes, regardless of conference champion status.
- First-round pairings unchanged (5/12, 6/11, 7/10, 8/9).

Simulator config:

```python
PlayoffFormat(
    name="2025_plus",
    auto_bids=5,
    at_large=7,
    seeding="straight",
    bye_rule="top_4_overall",
)
```

## Sources

- [College Football Playoff format overview](https://www.collegefootballplayoff.com/sports/2024/2/28/format.aspx)
- CFP announcement of 2025–26 seeding and bye policy updates (five conference champions still guaranteed access; straight seeding by final rank).

## Implementation

Use `get_format_for_year(year)` from `src.config.formats`:

| Year | Format name | Seeding |
|------|-------------|---------|
| 2024 | `2024` | `champion_byes` |
| 2025+ | `2025_plus` | `straight` |

Years 2014–2023 raise `ValueError` — use historical validation modules for the 4-team era.
