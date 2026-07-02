import type { ReactNode } from "react";

interface BracketRoundProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** One labeled section of the Round View — a title plus a stack of game-row cards. */
export function BracketRound({ title, subtitle, children }: BracketRoundProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          {title}
        </h2>
        {subtitle ? (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  );
}
