"""Simulator configuration."""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Literal, Optional

import yaml

from src.config.formats import PlayoffFormat, get_format_for_year
from src.pipeline.composite import RankingWeights


@dataclass
class SimulatorConfig:
    year: int
    week: int
    start_week: int = 5
    fbs_only: bool = True
    mode: Literal["composite"] = "composite"
    weights: RankingWeights = field(default_factory=RankingWeights)
    playoff_format: Optional[PlayoffFormat] = None

    def __post_init__(self) -> None:
        if self.playoff_format is None:
            if self.year >= 2024:
                self.playoff_format = get_format_for_year(self.year)
            else:
                self.playoff_format = None

    @property
    def config_hash(self) -> str:
        payload = {
            "year": self.year,
            "week": self.week,
            "start_week": self.start_week,
            "weights": asdict(self.weights),
            "mode": self.mode,
            "ruleset": self.playoff_format.name if self.playoff_format else None,
        }
        encoded = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(encoded.encode()).hexdigest()[:16]

    @classmethod
    def from_yaml(cls, path: str | Path) -> SimulatorConfig:
        with open(path) as f:
            data = yaml.safe_load(f)
        weights_data = data.pop("weights", {})
        weights = RankingWeights(**weights_data) if weights_data else RankingWeights()
        fmt = data.pop("playoff_format", None)
        config = cls(weights=weights, **data)
        if fmt and isinstance(fmt, str):
            config.playoff_format = get_format_for_year(config.year)
        return config

    def to_yaml(self, path: str | Path) -> None:
        data = {
            "year": self.year,
            "week": self.week,
            "start_week": self.start_week,
            "fbs_only": self.fbs_only,
            "mode": self.mode,
            "weights": asdict(self.weights),
        }
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            yaml.dump(data, f, default_flow_style=False)
