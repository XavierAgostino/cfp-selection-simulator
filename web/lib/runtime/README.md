# Runtime adapters (H1–H3)

Provider-neutral boundaries for local OSS and hosted infrastructure.

## Interfaces

| Interface | Local / demo | Hosted |
|-----------|--------------|--------|
| `ArtifactStore` | `FilesystemArtifactStore` | `SupabaseArtifactStore` (H3) |
| `RunCatalogStore` | `LocalRunCatalogStore` | `PostgresRunCatalogStore` (H2) |
| `JobStore` | `FilesystemJobStore` | `PostgresJobStore` (H2) |
| `RunExecutor` | `LocalRunExecutor` | Trigger.dev worker (H5) |

## Factory

```typescript
import {
  getArtifactStore,
  getJobStore,
  getRunCatalogStore,
  getRunExecutor,
} from "@/lib/runtime";
```

| Mode | Env | Artifacts | Metadata | Execution |
|------|-----|-----------|----------|-----------|
| Local (default) | unset | Filesystem | DuckDB / runs.json | Subprocess |
| Public site | demo env | Bundled `.demo-data` (real 2025 run) | Fixture runs.json | Disabled |
| Hosted | `SELECTION_ROOM_RUNTIME=hosted` | Supabase Storage when `SELECTION_ROOM_ARTIFACT_STORE=supabase` | Postgres | H5 (throws today) |

All web reads go through `/api/data` (proxy). Storage URLs and service role keys never reach the client.

## Env

```bash
SELECTION_ROOM_RUNTIME=local|hosted
SELECTION_ROOM_ARTIFACT_STORE=filesystem|supabase
SELECTION_ROOM_DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=artifacts
```

See [docs/hosting/supabase-setup.md](../../../docs/hosting/supabase-setup.md) and [docs/architecture/hosted-production.md](../../../docs/architecture/hosted-production.md).
