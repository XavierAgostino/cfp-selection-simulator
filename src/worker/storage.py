"""Upload JSON artifacts to Supabase Storage (server/worker only)."""

from __future__ import annotations

import json
from pathlib import Path

import requests


class StorageUploadError(RuntimeError):
    pass


class SupabaseArtifactUploader:
    def __init__(self, supabase_url: str, service_role_key: str, bucket: str) -> None:
        self._base = supabase_url.rstrip("/")
        self._service_role_key = service_role_key
        self._bucket = bucket

    def upload_json_file(self, local_path: Path, storage_key: str) -> None:
        body = local_path.read_bytes()
        url = f"{self._base}/storage/v1/object/{self._bucket}/{storage_key}"
        response = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {self._service_role_key}",
                "Content-Type": "application/json",
                "x-upsert": "true",
            },
            data=body,
            timeout=120,
        )
        if response.status_code >= 400:
            raise StorageUploadError(
                f"upload failed for {storage_key}: HTTP {response.status_code} {response.text[:200]}"
            )

    def upload_json_object(self, storage_key: str, payload: object) -> None:
        body = json.dumps(payload, indent=2).encode("utf-8")
        url = f"{self._base}/storage/v1/object/{self._bucket}/{storage_key}"
        response = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {self._service_role_key}",
                "Content-Type": "application/json",
                "x-upsert": "true",
            },
            data=body,
            timeout=120,
        )
        if response.status_code >= 400:
            raise StorageUploadError(
                f"upload failed for {storage_key}: HTTP {response.status_code} {response.text[:200]}"
            )
