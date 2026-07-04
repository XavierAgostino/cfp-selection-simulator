import { getRunCatalogStore } from "@/lib/runtime";
import type {
  RunCatalogResponse,
  RunCatalogSource,
} from "@/lib/runtime/run-catalog-store/types";

export type { RunCatalogResponse, RunCatalogSource };

export async function loadRunCatalog(limit = 100): Promise<RunCatalogResponse> {
  return getRunCatalogStore().loadCatalog(limit);
}
