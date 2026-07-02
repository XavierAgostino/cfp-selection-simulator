"""Composite ranking weights.

Lives in its own leaf module so config, pipeline, and validation can all
import it without creating an import cycle through the pipeline package.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass
class RankingWeights:
    # Defaults chosen by historical backtest 2014-2024 (see docs/research/
    # historical-validation.md): SOR-heavy beat the old 50/30/10/10 mix in
    # every season on committee-field overlap.
    resume: float = 0.40
    predictive: float = 0.30
    sor: float = 0.20
    sos: float = 0.10
    # Resume-internal mix: colley_share * Colley + (1 - colley_share) * raw win%.
    # Not part of the sum-to-1 constraint above.
    colley_share: float = 0.60

    def validate(self) -> None:
        total = self.resume + self.predictive + self.sor + self.sos
        if not np.isclose(total, 1.0, atol=0.01):
            raise ValueError(f"Ranking weights must sum to 1.0, got {total:.4f}")
        if not 0.0 <= self.colley_share <= 1.0:
            raise ValueError(f"colley_share must be within [0, 1], got {self.colley_share}")

    def __post_init__(self) -> None:
        self.validate()
