import { NextResponse } from "next/server";

import { loadRunCatalog } from "@/lib/runCatalog";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const catalog = await loadRunCatalog();
  return NextResponse.json(catalog, { headers: noStore });
}
