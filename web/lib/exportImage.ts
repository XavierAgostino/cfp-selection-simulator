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

/**
 * html-to-image does not reliably carry class-based paint (Tailwind
 * `fill-*`/`stroke-*`, theme variables) into inline SVG internals, so vector
 * marks like the CFP Playoff logo capture with the SVG default black fill.
 * Baking the computed paint into inline styles survives the clone verbatim.
 * Callers pass transient off-screen nodes, so mutating them is safe.
 */
function inlineSvgPaint(node: HTMLElement): void {
  for (const el of node.querySelectorAll<SVGElement>("svg, svg *")) {
    const computed = window.getComputedStyle(el);
    el.style.fill = computed.fill;
    el.style.stroke = computed.stroke;
    el.style.color = computed.color;
  }
}

export async function exportNodeToPng(
  node: HTMLElement,
  filename: string,
  options: ExportPngOptions = {},
): Promise<void> {
  // Fonts must be resolved before capture or text falls back mid-render.
  await document.fonts.ready;
  inlineSvgPaint(node);
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
