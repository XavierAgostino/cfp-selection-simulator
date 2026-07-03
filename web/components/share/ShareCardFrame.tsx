import type { ReactNode } from "react";

interface ShareCardFrameProps {
  /** Natural width of the card in px; the capture renders at 2× this. */
  width: number;
  /** Right-aligned context in the brand row, e.g. "2025 · Week 15". */
  contextLabel?: string;
  /** Extra line in the footer before the standing disclaimer. */
  footnote?: string;
  children: ReactNode;
}

/**
 * Branded frame for exported share images. Forces the dark "broadcast" theme
 * via the `.dark` token class so every export looks the same regardless of
 * the viewer's theme, and always carries the independence disclaimer.
 */
export function ShareCardFrame({
  width,
  contextLabel,
  footnote,
  children,
}: ShareCardFrameProps) {
  return (
    <div className="dark" style={{ width }}>
      <div className="flex flex-col gap-6 border-t-4 border-accent-gold bg-background px-10 pb-8 pt-7 text-foreground">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Plain <img>: html-to-image inlines it; next/image adds nothing offscreen. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/selection-room-icon-128.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9"
            />
            <span className="text-lg font-semibold tracking-tight text-foreground">
              Selection Room
            </span>
          </div>
          {contextLabel ? (
            <span className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {contextLabel}
            </span>
          ) : null}
        </div>

        {children}

        <div className="flex flex-col gap-1 border-t border-border pt-4">
          {footnote ? (
            <span className="text-xs text-muted-foreground">{footnote}</span>
          ) : null}
          <span className="text-xs text-muted-foreground">
            Projected by the Selection Room composite — an independent analytics
            project, not affiliated with the College Football Playoff.
          </span>
        </div>
      </div>
    </div>
  );
}
