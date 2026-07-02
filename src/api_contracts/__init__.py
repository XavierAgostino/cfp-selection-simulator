"""JSON API export layer: pydantic models + builders that turn engine objects
(DataFrames, PlayoffSelection, bracket pods) into the stable contract consumed
by the Next.js app. See docs/api-contracts.md for the schema documented here.
"""

from __future__ import annotations

SCHEMA_VERSION = 1
