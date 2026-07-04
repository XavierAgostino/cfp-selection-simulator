import { API_DATA_DIR } from "@/lib/paths";
import { FilesystemArtifactStore } from "@/lib/runtime/artifact-store/filesystem";
import type { ArtifactStore } from "@/lib/runtime/artifact-store/types";
import {
  isHostedRuntimeConfigured,
  resolveArtifactStoreKind,
  resolveRuntimeMode,
} from "@/lib/runtime/config";
import { FilesystemJobStore } from "@/lib/runtime/job-store/filesystem";
import type { JobStore } from "@/lib/runtime/job-store/types";
import { LocalRunCatalogStore } from "@/lib/runtime/run-catalog-store/local";
import type { RunCatalogStore } from "@/lib/runtime/run-catalog-store/types";
import { LocalRunExecutor } from "@/lib/runtime/run-executor/local";
import type { RunExecutor } from "@/lib/runtime/run-executor/types";

let artifactStore: ArtifactStore | null = null;
let runCatalogStore: RunCatalogStore | null = null;
let jobStore: JobStore | null = null;
let runExecutor: RunExecutor | null = null;

function assertLocalRuntimeOnly(feature: string): void {
  if (isHostedRuntimeConfigured()) {
    throw new Error(
      `${feature} is not implemented for hosted runtime yet (H2+). ` +
        "Unset SELECTION_ROOM_RUNTIME=hosted for local development.",
    );
  }
  if (resolveArtifactStoreKind() === "supabase") {
    throw new Error(
      `${feature} is not implemented for supabase artifact store yet (H3+).`,
    );
  }
}

export function getArtifactStore(): ArtifactStore {
  assertLocalRuntimeOnly("ArtifactStore");
  if (!artifactStore) {
    artifactStore = new FilesystemArtifactStore(API_DATA_DIR);
  }
  return artifactStore;
}

export function getRunCatalogStore(): RunCatalogStore {
  assertLocalRuntimeOnly("RunCatalogStore");
  if (!runCatalogStore) {
    runCatalogStore = new LocalRunCatalogStore(API_DATA_DIR);
  }
  return runCatalogStore;
}

export function getJobStore(): JobStore {
  assertLocalRuntimeOnly("JobStore");
  if (!jobStore) {
    jobStore = new FilesystemJobStore(API_DATA_DIR);
  }
  return jobStore;
}

export function getRunExecutor(): RunExecutor {
  assertLocalRuntimeOnly("RunExecutor");
  if (!runExecutor) {
    runExecutor = new LocalRunExecutor(getJobStore());
  }
  return runExecutor;
}

/** Reset cached adapter instances (tests only). */
export function resetRuntimeAdaptersForTests(): void {
  artifactStore = null;
  runCatalogStore = null;
  jobStore = null;
  runExecutor = null;
}

export function getRuntimeSummary(): {
  runtime: ReturnType<typeof resolveRuntimeMode>;
  artifact_store: ReturnType<typeof resolveArtifactStoreKind>;
} {
  return {
    runtime: resolveRuntimeMode(),
    artifact_store: resolveArtifactStoreKind(),
  };
}
