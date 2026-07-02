"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandBlockProps {
  command: string;
  className?: string;
}

/** Copy-paste terminal command with a copy button — the setup wizard's workhorse. */
export function CommandBlock({ command, className }: CommandBlockProps) {
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable (e.g. non-secure context) — user can select manually.
    }
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-md border border-border bg-secondary/40 py-2 pr-1.5 pl-3",
        className,
      )}
    >
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[13px] text-foreground">
        <span aria-hidden className="mr-1.5 select-none text-muted-foreground/60">
          $
        </span>
        {command}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Copied" : `Copy command: ${command}`}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-result-win" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
