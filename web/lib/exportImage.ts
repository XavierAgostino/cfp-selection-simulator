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

function resolveImageSrc(rawSrc: string): string | null {
  if (!rawSrc) return null;

  if (rawSrc.includes("/_next/image")) {
    try {
      const parsed = new URL(rawSrc, window.location.origin);
      const original = parsed.searchParams.get("url");
      if (original) return normalizeRemoteUrl(original);
    } catch {
      return null;
    }
  }

  if (rawSrc.startsWith("//")) {
    return normalizeRemoteUrl(`https:${rawSrc}`);
  }

  if (rawSrc.startsWith("http://") || rawSrc.startsWith("https://")) {
    return normalizeRemoteUrl(rawSrc);
  }

  if (rawSrc.startsWith("/")) {
    return `${window.location.origin}${rawSrc}`;
  }

  return null;
}

/** ESPN and other artifact URLs are stored as http; upgrade for HTTPS pages. */
function normalizeRemoteUrl(url: string): string {
  return url.replace(/^http:\/\//i, "https://");
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Failed to read image blob"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image blob"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Prefetch every <img> as a data URL so html-to-image never hits a tainted
 * canvas (mixed http/https ESPN logos, Next optimizer URLs, no-cors cache).
 */
async function inlineImagesAsDataUrls(node: HTMLElement): Promise<void> {
  const images = [...node.querySelectorAll("img")];

  await Promise.all(
    images.map(async (img) => {
      const resolved = resolveImageSrc(img.getAttribute("src") ?? "");
      if (!resolved) return;

      try {
        const response = await fetch(resolved, { mode: "cors", cache: "no-store" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const dataUrl = await blobToDataUrl(await response.blob());
        img.removeAttribute("crossorigin");
        img.src = dataUrl;
      } catch {
        // Best-effort: leave the original src for html-to-image to retry.
        if (resolved !== img.getAttribute("src")) {
          img.src = resolved;
        }
      }
    }),
  );

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
export function waitForExportMount(): Promise<void> {
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
  await waitForExportMount();
  await document.fonts.ready;
  inlineSvgPaint(node);
  await inlineImagesAsDataUrls(node);
  const dataUrl = await toPng(node, {
    pixelRatio: options.pixelRatio ?? 2,
    cacheBust: false,
  });
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
}
