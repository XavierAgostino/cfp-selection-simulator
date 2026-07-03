"use client";

import { ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isBaseRun, runRowSecondary } from "@/lib/runDisplay";
import { formatRunKindLabel } from "@/lib/displayLabels";
import { truncateConfigHash } from "@/lib/recordMeta";
import type { RunSummary } from "@/lib/types";

interface RunSwitcherProps {
  runs: RunSummary[];
  currentStem: string;
  latestStem: string;
}

function navigateToRun(
  stem: string,
  currentStem: string,
  latestStem: string,
  pathname: string,
  searchParams: URLSearchParams,
  router: ReturnType<typeof useRouter>,
) {
  if (stem === currentStem) return;
  const params = new URLSearchParams(searchParams.toString());
  if (stem === latestStem) {
    params.delete("run");
  } else {
    params.set("run", stem);
  }
  const query = params.toString();
  router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  router.refresh();
}

/**
 * Compact run switcher — same catalog as Run Analysis → Runs tab, no extra fetch.
 */
export function RunSwitcher({ runs, currentStem, latestStem }: RunSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentRun = runs.find((run) => run.stem === currentStem);

  function selectRun(stem: string) {
    navigateToRun(stem, currentStem, latestStem, pathname, searchParams, router);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="min-w-36 max-w-52 justify-between gap-1.5 font-medium"
            aria-label="Switch run"
          >
            <span className="truncate">
              {currentRun?.label ?? "Switch run"}
            </span>
            <ChevronDown className="size-4 shrink-0 opacity-60" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-72 p-1">
        {runs.map((run) => {
          const isCurrent = run.stem === currentStem;
          return (
            <DropdownMenuItem
              key={run.stem}
              disabled={isCurrent}
              onClick={() => selectRun(run.stem)}
              className="flex cursor-pointer flex-col items-start gap-1 py-2.5"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium leading-snug">{run.label}</span>
                {isCurrent ? (
                  <Badge variant="chip-neutral" className="text-[10px]">
                    Current
                  </Badge>
                ) : null}
                {!isBaseRun(run) ? (
                  <Badge variant="chip-neutral" className="text-[10px]">
                    {formatRunKindLabel(true)}
                  </Badge>
                ) : (
                  <Badge variant="chip-neutral" className="text-[10px]">
                    {formatRunKindLabel(false)}
                  </Badge>
                )}
              </div>
              <span className="text-xs leading-snug text-muted-foreground">
                {runRowSecondary(run)}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground/60">
                {truncateConfigHash(run.config_hash)}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { navigateToRun };
