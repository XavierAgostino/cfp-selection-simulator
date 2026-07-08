import type { ComponentType } from "react";
import {
  Trophy,
  ShieldCheck,
  ListChecks,
  Layers,
  GitBranch,
  Scale,
  Info,
} from "lucide-react";
import type { AuditPhase } from "@/lib/types";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

const STEP_LABELS: Record<string, string> = {
  conference_champions: "Conference champions identified",
  auto_bids: "Automatic bids awarded",
  at_large_selection: "At-large bids selected",
  seeding: "Seeding & byes assigned",
  bracket_reveal: "Bracket revealed",
  tiebreaker: "Tiebreaker applied",
};

const STEP_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  conference_champions: Trophy,
  auto_bids: ShieldCheck,
  at_large_selection: ListChecks,
  seeding: Layers,
  bracket_reveal: GitBranch,
  tiebreaker: Scale,
};

/** "some_step" -> "Some step" when there's no curated label above. */
function humanizeStep(step: string): string {
  if (STEP_LABELS[step]) return STEP_LABELS[step];
  const words = step.split("_").join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

interface SelectionAuditTimelineProps {
  phases: AuditPhase[];
  /** Compact shows fewer phases and tighter spacing for embedding in the dashboard. */
  variant?: "compact" | "full";
  className?: string;
}

/**
 * Vertical timeline of the selection engine's audit trail (audit.json `phases`).
 * `compact` surfaces the 3-4 most meaningful phases for the dashboard; `full`
 * renders every phase with all of its messages, for the methodology page.
 */
export function SelectionAuditTimeline({
  phases,
  variant = "full",
  className,
}: SelectionAuditTimelineProps) {
  const isCompact = variant === "compact";
  const visiblePhases = isCompact ? phases.slice(0, 4) : phases;

  if (visiblePhases.length === 0) {
    return (
      <Empty className="py-8">
        <EmptyHeader>
          <EmptyDescription>
            No audit trail available for this run.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ol className={cn("relative flex flex-col", className)}>
      {visiblePhases.map((phase, index) => {
        const Icon = STEP_ICONS[phase.step] ?? Info;
        const isLast = index === visiblePhases.length - 1;
        const visibleMessages = isCompact
          ? phase.messages.slice(0, 1)
          : phase.messages;

        return (
          <li key={`${phase.step}-${index}`} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast ? (
              <span
                aria-hidden
                className="absolute top-7 left-[15px] h-[calc(100%-1.75rem)] w-px bg-border"
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
              <span
                className={cn(
                  "font-medium text-foreground",
                  isCompact ? "text-sm" : "text-sm",
                )}
              >
                {humanizeStep(phase.step)}
              </span>
              <ul className="flex flex-col gap-0.5">
                {visibleMessages.map((message, messageIndex) => (
                  <li
                    key={messageIndex}
                    className="text-xs leading-relaxed text-muted-foreground"
                  >
                    {message}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
