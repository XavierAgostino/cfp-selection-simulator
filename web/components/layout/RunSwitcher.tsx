"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RunSummary } from "@/lib/types";

interface RunSwitcherProps {
  runs: RunSummary[];
  currentStem: string;
  latestStem: string;
}

function runLabel(run: RunSummary): string {
  return `${run.season} · Week ${run.week}`;
}

/**
 * Season/week run switcher driven by runs.json. Selecting the latest run
 * clears the ?run= param (pages then read the flat latest copies); any other
 * run pins ?run={stem}.
 */
export function RunSwitcher({ runs, currentStem, latestStem }: RunSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(stem: string | null) {
    if (!stem || stem === currentStem) return;
    const params = new URLSearchParams(searchParams.toString());
    if (stem === latestStem) {
      params.delete("run");
    } else {
      params.set("run", stem);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <Select value={currentStem} onValueChange={handleChange}>
      <SelectTrigger
        size="sm"
        aria-label="Switch run"
        className="bg-card font-medium tabular-nums"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {runs.map((run) => (
          <SelectItem key={run.stem} value={run.stem}>
            <span className="tabular-nums">{runLabel(run)}</span>
            {run.stem === latestStem ? (
              <span className="ml-1.5 text-xs text-muted-foreground">latest</span>
            ) : null}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
