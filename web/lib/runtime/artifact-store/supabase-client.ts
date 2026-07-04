import { createClient } from "@supabase/supabase-js";

import type {
  SupabaseStorageBackend,
  SupabaseStorageConfig,
} from "@/lib/runtime/artifact-store/supabase-types";

function isNotFoundError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("not found") ||
    lower.includes("does not exist") ||
    lower.includes("object not found")
  );
}

export function createSupabaseStorageBackend(
  config: SupabaseStorageConfig,
): SupabaseStorageBackend {
  const client = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const bucket = config.bucket;

  return {
    async downloadObject(path: string) {
      const { data, error } = await client.storage.from(bucket).download(path);
      if (error) {
        if (isNotFoundError(error.message)) {
          return { body: null, notFound: true };
        }
        throw new Error(`supabase_storage_download_failed:${path}:${error.message}`);
      }
      if (!data) {
        return { body: null, notFound: true };
      }
      return { body: new Uint8Array(await data.arrayBuffer()), notFound: false };
    },

    async listObjects(prefix: string) {
      const folder = prefix.replace(/\/$/, "");
      const { data, error } = await client.storage.from(bucket).list(folder, {
        limit: 1000,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) {
        if (isNotFoundError(error.message)) {
          return { names: [] };
        }
        throw new Error(`supabase_storage_list_failed:${prefix}:${error.message}`);
      }
      const names = (data ?? [])
        .map((entry) => entry.name)
        .filter((name): name is string => typeof name === "string" && name.length > 0);
      return { names };
    },
  };
}
