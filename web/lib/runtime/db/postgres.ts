import postgres from "postgres";

const clients = new Map<string, ReturnType<typeof postgres>>();

/** Shared Postgres client for Supabase pooler (prepare: false). */
export function getPostgresClient(databaseUrl: string): ReturnType<typeof postgres> {
  const existing = clients.get(databaseUrl);
  if (existing) return existing;

  const client = postgres(databaseUrl, {
    prepare: false,
    max: 4,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  clients.set(databaseUrl, client);
  return client;
}

/** Close cached clients (tests only). */
export async function closePostgresClientsForTests(): Promise<void> {
  await Promise.all([...clients.values()].map((client) => client.end()));
  clients.clear();
}
