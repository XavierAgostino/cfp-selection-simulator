"""Tests for hosted worker Postgres store transitions."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from src.worker.postgres import HostedJobStore


def test_mark_failed_stores_redacted_error() -> None:
    store = HostedJobStore("postgres://example")
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.__enter__.return_value = mock_conn
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

    with patch("src.worker.postgres.psycopg.connect", return_value=mock_conn):
        store.mark_failed(
            "run_test",
            error_message="CFBD_API_KEY=secret-value failed",
            exit_code=1,
        )

    update_sql = mock_cursor.execute.call_args[0][0]
    assert "failed" in update_sql
    params = mock_cursor.execute.call_args[0][1]
    assert "secret-value" not in params[0]
    assert "[REDACTED]" in params[0]
