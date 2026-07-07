"""Release-dated weekly CFP committee ranking fixtures (research-only).

Curated from the CFP selection committee's published weekly top-25 releases,
stored in ``tests/fixtures/cfp_weekly/``. Each fixture carries the release
identity rather than an ambiguous "week": committee release X is fit against
only the games available before that release (``games_through_week``).

Loading enforces the curation rules:
- exactly 25 unique teams per release
- a non-final release may never alias the season's final ranking (the failure
  mode of the old scaffolding, which seeded every week from finals)
- the final release (games_through_week == FINAL_CFP_RANKING_WEEK) must match
  the season's final fixture in ``HISTORICAL_CFP_TOP25`` exactly
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from src.validation.historical import (
    FINAL_CFP_RANKING_WEEK,
    HISTORICAL_CFP_TOP25,
    register_weekly_top25,
)

CFP_WEEKLY_FIXTURES_DIR = Path(__file__).resolve().parents[2] / "tests" / "fixtures" / "cfp_weekly"


@dataclass(frozen=True)
class WeeklyRelease:
    season: int
    ranking_release: int
    release_date: str
    games_through_week: int
    source: str
    top25: Tuple[str, ...]

    @property
    def is_final(self) -> bool:
        return self.games_through_week == FINAL_CFP_RANKING_WEEK


def _parse_fixture(path: Path) -> WeeklyRelease:
    raw = json.loads(path.read_text(encoding="utf-8"))
    release = WeeklyRelease(
        season=int(raw["season"]),
        ranking_release=int(raw["ranking_release"]),
        release_date=str(raw["release_date"]),
        games_through_week=int(raw["games_through_week"]),
        source=str(raw["source"]),
        top25=tuple(raw["top25"]),
    )
    if len(release.top25) != 25 or len(set(release.top25)) != 25:
        raise ValueError(f"{path.name}: expected 25 unique teams")
    if not 1 <= release.games_through_week <= FINAL_CFP_RANKING_WEEK:
        raise ValueError(f"{path.name}: games_through_week out of range")
    return release


def load_weekly_releases(
    fixtures_dir: Optional[Path] = None,
) -> List[WeeklyRelease]:
    """Load and validate every curated release, sorted by season then release."""
    directory = fixtures_dir or CFP_WEEKLY_FIXTURES_DIR
    releases = [_parse_fixture(path) for path in sorted(directory.glob("*.json"))]
    for release in releases:
        final = HISTORICAL_CFP_TOP25.get(release.season)
        if final is None:
            continue
        if release.is_final:
            if list(release.top25) != list(final):
                raise ValueError(
                    f"{release.season} release {release.ranking_release}: final release "
                    "fixture disagrees with HISTORICAL_CFP_TOP25"
                )
        elif list(release.top25) == list(final):
            raise ValueError(
                f"{release.season} release {release.ranking_release}: non-final release "
                "aliases the final ranking"
            )
    return sorted(releases, key=lambda r: (r.season, r.ranking_release))


def register_weekly_releases(
    fixtures_dir: Optional[Path] = None,
) -> List[WeeklyRelease]:
    """Register curated non-final releases as weekly fixtures.

    Each release is keyed by its data cutoff (``games_through_week``) so the
    fitter scores it against only the games the committee had seen. The final
    release is not re-registered: week FINAL_CFP_RANKING_WEEK is already seeded
    from ``HISTORICAL_CFP_TOP25`` (and validated to match on load).
    """
    releases = load_weekly_releases(fixtures_dir)
    for release in releases:
        if not release.is_final:
            register_weekly_top25(release.season, release.games_through_week, list(release.top25))
    return releases


def release_index(
    releases: List[WeeklyRelease],
) -> Dict[Tuple[int, int], WeeklyRelease]:
    """Index releases by (season, games_through_week) for artifact enrichment."""
    return {(r.season, r.games_through_week): r for r in releases}
