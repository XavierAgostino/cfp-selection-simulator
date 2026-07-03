/**
 * Client-side share-card PNG export. Captures a DOM node with html-to-image,
 * which clones the node, refetches image srcs as data URLs (ESPN's logo CDN
 * sends `access-control-allow-origin: *`), and inlines self-hosted fonts.
 */

import { toPng } from "html-to-image";

export interface ExportPngOptions {
  /** Device-pixel multiplier for the output bitmap. Defaults to 2. */
  pixelRatio?: number;
}

export async function exportNodeToPng(
  node: HTMLElement,
  filename: string,
  options: ExportPngOptions = {},
): Promise<void> {
  // Fonts must be resolved before capture or text falls back mid-render.
  await document.fonts.ready;
  const dataUrl = await toPng(node, {
    pixelRatio: options.pixelRatio ?? 2,
    // Refetch images with CORS instead of reusing the <img> no-cors cache
    // entry, which would taint the capture.
    cacheBust: true,
  });
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
}
