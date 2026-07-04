import { API_DATA_DIR } from "@/lib/paths";
import { FilesystemArtifactStore } from "@/lib/runtime/artifact-store/filesystem";
import type { ArtifactStore } from "@/lib/runtime/artifact-store/types";
import {
  getDatabaseUrl,
  isHostedRuntimeConfigured,
  resolveArtifactStoreKind,
  resolveRuntimeMode,
} from "@/lib/runtime/config";
import { HostedConfigurationError } from "@/lib/runtime/errors";
import { FilesystemJobStore } from "@/lib/runtime/job-store/filesystem";
import type { JobStore } from "@/lib/runtime/job-store/types";
import { PostgresJobStore } from "@/lib/runtime/job-store/postgres";
import { LocalRunCatalogStore } from "@/lib/runtime/run-catalog-store/local";
import { PostgresRunCatalogStore } from "@/lib/runtime/run-catalog-store/postgres";
import type { RunCatalogStore } from "@/lib/runtime/run-catalog-store/types";
import { LocalRunExecutor } from "@/lib/runtime/run-executor/local";
import type { RunExecutor } from "@/lib/runtime/run-executor/types";

let localArtifactStore: ArtifactStore | null = null;
let localRunCatalogStore: RunCatalogStore | null = null;
let localJobStore: JobStore | null = null;
let localRunExecutor: RunExecutor | null = null;

let hostedRunCatalogStore: RunCatalogStore | null = null;
let hostedJobStore: JobStore | null = null;

function requireHostedDatabase(feature: string): string {
  const url = getDatabaseUrl();
  if (!url) {
    throw new HostedConfigurationError(
      `Hosted ${feature} requires SELECTION_ROOM_DATABASE_URL. ` +
        "Apply supabase/migrations/20250704180000_hosted_runs_v1.sql, then set the Supabase pooler URL. " +
        "Supabase Storage (H3) and the Trigger.dev worker (H5) are not wired yet.",
    );
  }
  return url;
}

export function getArtifactStore(): ArtifactStore {
  if (resolveArtifactStoreKind() === "supabase") {
    throw new HostedConfigurationError(
      "Supabase Storage artifact reads are not implemented yet (H3). " +
        "Keep SELECTION_ROOM_ARTIFACT_STORE=filesystem until H3 ships, or use local runtime mode.",
    );
  }

  if (!localArtifactStore) {
    localArtifactStore = new FilesystemArtifactStore(API_DATA_DIR);
  }
  return localArtifactStore;
}

export function getRunCatalogStore(): RunCatalogStore {
  if (isHostedRuntimeConfigured()) {
    if (!hostedRunCatalogStore) {
      hostedRunCatalogStore = new PostgresRunCatalogStore(requireHostedDatabase("RunCatalogStore"));
    }
    return hostedRunCatalogStore;
  }

  if (!localRunCatalogStore) {
    localRunCatalogStore = new LocalRunCatalogStore(API_DATA_DIR);
  }
  return localRunCatalogStore;
}

export function getJobStore(): JobStore {
  if (isHostedRuntimeConfigured()) {
    if (!hostedJobStore) {
      hostedJobStore = new PostgresJobStore(requireHostedDatabase("JobStore"));
    }
    return hostedJobStore;
  }

  if (!localJobStore) {
    localJobStore = new FilesystemJobStore(API_DATA_DIR);
  }
  return localJobStore;
}

export function getRunExecutor(): RunExecutor {
  if (isHostedRuntimeConfigured()) {
    throw new HostedConfigurationError(
      "Hosted run execution requires the Trigger.dev worker (H5). " +
        "Unset SELECTION_ROOM_RUNTIME=hosted for local Option B subprocess jobs.",
    );
  }

  if (!localRunExecutor) {
    localRunExecutor = new LocalRunExecutor(getJobStore());
  }
  return localRunExecutor;
}

/** Reset cached adapter instances (tests only). */
export function resetRuntimeAdaptersForTests(): void {
  localArtifactStore = null;
  localRunCatalogStore = null;
  localJobStore = null;
  localRunExecutor = null;
  hostedRunCatalogStore = null;
  hostedJobStore = null;
}

export function getRuntimeSummary(): {
  runtime: ReturnType<typeof resolveRuntimeMode>;
  artifact_store: ReturnType<typeof resolveArtifactStoreKind>;
  database_configured: boolean;
} {
  return {
    runtime: resolveRuntimeMode(),
    artifact_store: resolveArtifactStoreKind(),
    database_configured: getDatabaseUrl() !== null,
  };
}
