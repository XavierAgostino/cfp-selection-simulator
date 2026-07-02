import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * Serves the Python exporter's output verbatim from
 * data/output/api/ (repo root) — or wherever SELECTION_ROOM_DATA_DIR points.
 * Never cached: the underlying files change every time the engine reruns.
 */
const DATA_DIR =
  process.env.SELECTION_ROOM_DATA_DIR ??
  path.resolve(/* turbopackIgnore: true */ process.cwd(), "../data/output/api");

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

  // Reject path traversal and anything that isn't a plain .json file.
  if (segments.some((segment) => segment.includes("..") || segment.includes("\0"))) {
    return notFound();
  }
  const requestedPath = segments.join("/");
  if (!requestedPath.endsWith(".json")) {
    return notFound();
  }

  const resolvedDataDir = path.resolve(DATA_DIR);
  const filePath = path.resolve(resolvedDataDir, requestedPath);

  // Ensure the resolved path is still inside the data directory.
  if (
    filePath !== resolvedDataDir &&
    !filePath.startsWith(resolvedDataDir + path.sep)
  ) {
    return notFound();
  }

  try {
    const contents = await fs.readFile(filePath, "utf-8");
    return new NextResponse(contents, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "ENOENT"
    ) {
      return notFound();
    }
    return NextResponse.json(
      { error: "internal_error" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
