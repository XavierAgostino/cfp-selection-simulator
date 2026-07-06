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

/** Resolve Next.js image optimizer URLs to their origin CDN src for CORS capture. */
function unwrapOptimizedImages(node: HTMLElement): void {
  for (const img of node.querySelectorAll("img")) {
    const src = img.getAttribute("src") ?? "";
    if (src.includes("/_next/image")) {
      try {
        const parsed = new URL(src, window.location.origin);
        const original = parsed.searchParams.get("url");
        if (original) {
          img.crossOrigin = "anonymous";
          img.src = original;
        }
      } catch {
        // Keep existing src if parsing fails.
      }
    } else if (src.startsWith("http://") || src.startsWith("https://")) {
      img.crossOrigin = "anonymous";
    } else if (src.startsWith("/")) {
      img.crossOrigin = "anonymous";
    }
  }
}

/** Wait until every image in the capture subtree has loaded or failed. */
async function waitForImages(node: HTMLElement): Promise<void> {
  const images = [...node.querySelectorAll("img")];
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        }),
    ),
  );
}

/** One animation frame so refs/layout/fonts settle after off-screen mount. */
function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export async function exportNodeToPng(
  node: HTMLElement,
  filename: string,
  options: ExportPngOptions = {},
): Promise<void> {
  await waitForPaint();
  await document.fonts.ready;
  inlineSvgPaint(node);
  unwrapOptimizedImages(node);
  await waitForImages(node);
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
