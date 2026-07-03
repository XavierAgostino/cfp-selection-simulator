"""File-based locks for concurrent export safety."""

from __future__ import annotations

import os
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, Optional

from src.pipeline.paths import DATA_OUTPUT

try:
    import fcntl

    _HAS_FCNTL = True
except ImportError:  # pragma: no cover - Windows
    _HAS_FCNTL = False

_LOCK_PATH = DATA_OUTPUT / ".export.lock"
_POLL_INTERVAL_S = 0.05
_DEFAULT_TIMEOUT_S = 120.0


def _acquire_fcntl_lock(lock_path: Path, timeout_s: float) -> Optional[object]:
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    handle = lock_path.open("a+")
    deadline = time.monotonic() + timeout_s
    while True:
        try:
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            handle.seek(0)
            handle.truncate()
            handle.write(str(os.getpid()))
            handle.flush()
            return handle
        except BlockingIOError:
            if time.monotonic() >= deadline:
                handle.close()
                raise TimeoutError(f"Timed out waiting for export lock: {lock_path}")
            time.sleep(_POLL_INTERVAL_S)


def _acquire_lockfile(lock_path: Path, timeout_s: float) -> None:
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    deadline = time.monotonic() + timeout_s
    while True:
        try:
            fd = os.open(str(lock_path), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            with os.fdopen(fd, "w") as handle:
                handle.write(str(os.getpid()))
            return
        except FileExistsError:
            if time.monotonic() >= deadline:
                raise TimeoutError(f"Timed out waiting for export lock: {lock_path}")
            time.sleep(_POLL_INTERVAL_S)


def _release_fcntl_lock(handle: object) -> None:
    file_handle = handle
    assert hasattr(file_handle, "fileno")
    fcntl.flock(file_handle.fileno(), fcntl.LOCK_UN)
    file_handle.close()


def _release_lockfile(lock_path: Path) -> None:
    try:
        lock_path.unlink(missing_ok=True)
    except OSError:
        pass


@contextmanager
def export_lock(timeout_s: float = _DEFAULT_TIMEOUT_S) -> Iterator[None]:
    """Serialize runs.json regeneration and flat API writes."""
    if _HAS_FCNTL:
        handle = _acquire_fcntl_lock(_LOCK_PATH, timeout_s)
        try:
            yield
        finally:
            _release_fcntl_lock(handle)
        return

    _acquire_lockfile(_LOCK_PATH, timeout_s)
    try:
        yield
    finally:
        _release_lockfile(_LOCK_PATH)
