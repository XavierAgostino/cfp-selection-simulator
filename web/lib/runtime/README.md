# Runtime adapters (H1+)

Provider-neutral boundaries for local OSS and hosted infrastructure.

## Interfaces

| Interface | Local | Hosted (H2+) |
|-----------|-------|--------------|
| `ArtifactStore` | `FilesystemArtifactStore` | Supabase Storage (H3) |
| `RunCatalogStore` | `LocalRunCatalogStore` | `PostgresRunCatalogStore` |
| `JobStore` | `FilesystemJobStore` | `PostgresJobStore` |
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

| Mode | Env | JobStore / Catalog | Artifacts / Executor |
|------|-----|-------------------|----------------------|
| Local (default) | unset or `SELECTION_ROOM_RUNTIME=local` | Filesystem / DuckDB | Filesystem + subprocess |
| Hosted metadata | `SELECTION_ROOM_RUNTIME=hosted` + `SELECTION_ROOM_DATABASE_URL` | Postgres | Artifacts: filesystem until H3; executor throws until H5 |

Hosted misconfiguration throws `HostedConfigurationError` with the missing phase (H3, H5, or DB URL).

## Env

```bash
SELECTION_ROOM_RUNTIME=local|hosted
SELECTION_ROOM_ARTIFACT_STORE=filesystem|supabase   # supabase blocked until H3
SELECTION_ROOM_DATABASE_URL=                        # required for hosted JobStore/Catalog
SELECTION_ROOM_HOSTED_DAILY_JOB_CAP=10
SELECTION_ROOM_HOSTED_MAX_CONCURRENT=1
```

See [docs/hosting/supabase-setup.md](../../../docs/hosting/supabase-setup.md) and [docs/architecture/hosted-production.md](../../../docs/architecture/hosted-production.md).
