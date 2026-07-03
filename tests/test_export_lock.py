"""Tests for export file locking."""

from __future__ import annotations

import threading
import time

from src.pipeline import locks


def test_export_lock_serializes_concurrent_holders(tmp_path, monkeypatch):
    monkeypatch.setattr(locks, "_LOCK_PATH", tmp_path / ".export.lock")

    order: list[str] = []
    barrier = threading.Barrier(2)

    def worker(name: str) -> None:
        barrier.wait()
        with locks.export_lock(timeout_s=5.0):
            order.append(f"{name}-start")
            time.sleep(0.05)
            order.append(f"{name}-end")

    threads = [
        threading.Thread(target=worker, args=("a",)),
        threading.Thread(target=worker, args=("b",)),
    ]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=10)

    assert len(order) == 4
    for name in ("a", "b"):
        start_idx = order.index(f"{name}-start")
        end_idx = order.index(f"{name}-end")
        assert start_idx < end_idx

    a_start, a_end = order.index("a-start"), order.index("a-end")
    b_start, b_end = order.index("b-start"), order.index("b-end")
    assert a_end < b_start or b_end < a_start
