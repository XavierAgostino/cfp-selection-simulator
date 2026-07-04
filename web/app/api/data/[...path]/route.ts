import { NextRequest, NextResponse } from "next/server";

import { getArtifactStore } from "@/lib/runtime";

export const dynamic = "force-dynamic";

/**
 * Serves the Python exporter's output verbatim from
 * data/output/api/ (repo root) — or wherever SELECTION_ROOM_DATA_DIR points.
 * Never cached: the underlying files change every time the engine reruns.
 */
function notFound() {
  return NextResponse.json(
    { error: "not_found" },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;

  if (!segments || segments.length === 0) {
    return notFound();
  }

  const requestedPath = segments.join("/");
  const contents = await getArtifactStore().readText(requestedPath);
  if (contents === null) {
    return notFound();
  }

  return new NextResponse(contents, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
