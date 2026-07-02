"""Structured audit trail for playoff field selection."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import List


class AuditStep(str, Enum):
    FOUND_CHAMPIONS = "found_champions"
    AUTO_BIDS = "auto_bids"
    AT_LARGE = "at_large"
    DISPLACEMENT = "displacement"
    FINAL_FIELD = "final_field"
    FIRST_FOUR_OUT = "first_four_out"


@dataclass
class AuditEntry:
    step: AuditStep
    message: str


@dataclass
class SelectionAudit:
    entries: List[AuditEntry] = field(default_factory=list)

    def add(self, step: AuditStep, message: str) -> None:
        self.entries.append(AuditEntry(step=step, message=message))

    def to_log(self) -> List[str]:
        return [entry.message for entry in self.entries]

    def steps(self) -> List[AuditStep]:
        return [entry.step for entry in self.entries]
