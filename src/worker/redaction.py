"""Safe log redaction for hosted worker output."""

from __future__ import annotations

import re

REDACTION_PATTERNS = [
    re.compile(r"CFBD_API_KEY=\S+", re.IGNORECASE),
    re.compile(r"Authorization:\s*Bearer\s+\S+", re.IGNORECASE),
    re.compile(r"Bearer\s+[A-Za-z0-9._-]+", re.IGNORECASE),
    re.compile(r"SUPABASE_SERVICE_ROLE_KEY=\S+", re.IGNORECASE),
    re.compile(r"SELECTION_ROOM_DATABASE_URL=\S+", re.IGNORECASE),
    re.compile(r"postgresql://\S+", re.IGNORECASE),
    re.compile(r"postgres://\S+", re.IGNORECASE),
]


def redact_log_line(line: str) -> str:
    out = line
    for pattern in REDACTION_PATTERNS:
        out = pattern.sub("[REDACTED]", out)
    return out
