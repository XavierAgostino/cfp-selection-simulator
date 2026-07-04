# Runtime adapters (H1)

Provider-neutral boundaries for local OSS and future hosted infrastructure.

## Interfaces

| Interface | Local implementation | Hosted (H2+) |
|-----------|---------------------|--------------|
| `ArtifactStore` | `FilesystemArtifactStore` | Supabase Storage |
| `RunCatalogStore` | `LocalRunCatalogStore` | Postgres |
| `JobStore` | `FilesystemJobStore` | Postgres |
| `RunExecutor` | `LocalRunExecutor` | Trigger.dev worker |

## Factory

Import adapters from `@/lib/runtime`:

```typescript
import { getArtifactStore, getJobStore, getRunCatalogStore, getRunExecutor } from "@/lib/runtime";
```

H1 always resolves local adapters. Setting `SELECTION_ROOM_RUNTIME=hosted` throws until H2+ ships.

## Env (future)

- `SELECTION_ROOM_RUNTIME=local|hosted`
- `SELECTION_ROOM_ARTIFACT_STORE=filesystem|supabase`

See [docs/architecture/hosted-production.md](../../../docs/architecture/hosted-production.md).
