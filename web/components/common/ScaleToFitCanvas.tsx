"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ScaleToFitCanvasProps {
  /** Natural width of the canvas at 1:1 scale (px). */
  designWidth: number;
  children: React.ReactNode;
  className?: string;
}

/**
 * Keeps a fixed-layout canvas proportional to its container. Scales down when
 * the container is narrower than the design width (including browser zoom),
 * never scales above 1:1.
 */
export function ScaleToFitCanvas({
  designWidth,
  children,
  className,
}: ScaleToFitCanvasProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [layout, setLayout] = React.useState({ scale: 1, height: 0 });

  const measure = React.useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const available = container.clientWidth;
    const scale = available >= designWidth ? 1 : available / designWidth;
    const naturalHeight = content.offsetHeight;
    setLayout({ scale, height: naturalHeight * scale });
  }, [designWidth]);

  React.useLayoutEffect(() => {
    measure();
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(content);
    return () => observer.disconnect();
  }, [measure]);

  const { scale, height } = layout;

  return (
    <div ref={containerRef} className={cn("w-full", className)}>
      <div
        className="mx-auto"
        style={{
          width: designWidth * scale,
          height: height > 0 ? height : undefined,
        }}
      >
        <div
          ref={contentRef}
          style={{
            width: designWidth,
            transform: scale === 1 ? undefined : `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
