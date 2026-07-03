"""Store write failure policy."""

from __future__ import annotations

import os


def store_required() -> bool:
    """When True (default), store write failures fail the export."""
    val = os.environ.get("SELECTION_ROOM_STORE_REQUIRED", "1").strip().lower()
    return val not in ("0", "false", "no")
