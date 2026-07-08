"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { useRankings } from "@/components/team/useRankings";
import { useTeamDrawer } from "@/components/team/TeamDrawerProvider";
import { PRIMARY_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";
import type { RunCatalogResponse } from "@/lib/runCatalog";
import type { RunSummary } from "@/lib/types";

/** Cmd+K palette: jump to a page, an existing run, or a team's resume. */
export function CommandMenu() {
  const router = useRouter();
  const { openTeam } = useTeamDrawer();
  const [open, setOpen] = React.useState(false);
  const [hasOpened, setHasOpened] = React.useState(false);
  const [isMac, setIsMac] = React.useState(true);
  const [runs, setRuns] = React.useState<RunSummary[]>([]);

  const show = React.useCallback(() => {
    setHasOpened(true);
    setOpen(true);
  }, []);

  React.useEffect(() => {
    // Platform read has to run client-side post-hydration to keep the SSR
    // markup (which defaults to the ⌘ glyph) from mismatching.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMac(/Mac|iPhone|iPad/i.test(navigator.platform));
  }, []);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        // fumadocs' RootProvider registers its own Cmd/Ctrl+K search on
        // `window`. This listener is on `document`, which fires first in the
        // bubble phase, so stopping propagation here keeps the fumadocs search
        // from also opening on app pages. Docs pages don't mount this menu, so
        // their fumadocs Cmd+K keeps working.
        event.stopPropagation();
        setHasOpened(true);
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Fetch the run catalog the first time the palette opens.
  React.useEffect(() => {
    if (!hasOpened || runs.length > 0) return;
    let cancelled = false;
    fetch("/api/runs/catalog", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<RunCatalogResponse>) : null))
      .then((next) => {
        if (!cancelled && next) setRuns(next.runs);
      })
      .catch(() => {
        // A missing catalog just means no run group; nav and teams still work.
      });
    return () => {
      cancelled = true;
    };
  }, [hasOpened, runs.length]);

  const go = React.useCallback((action: () => void) => {
    setOpen(false);
    action();
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={show}
        aria-hidden={open}
        tabIndex={open ? -1 : undefined}
        className={cn(
          "gap-2 font-normal text-muted-foreground",
          // Hide the resting trigger while the palette is open so only the
          // dialog's search bar shows (otherwise the button sits blurred
          // behind the light overlay and reads as a second search bar).
          open && "invisible",
        )}
      >
        <Search data-icon="inline-start" />
        <span className="hidden sm:inline">Search</span>
        <Kbd className="hidden sm:inline-flex">{isMac ? "⌘" : "Ctrl"} K</Kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Command menu"
        description="Jump to a page, run, or team."
      >
        <Command>
          <CommandInput placeholder="Search pages, runs, and teams…" />
          <CommandList>
          <CommandEmpty>No matches found.</CommandEmpty>

          <CommandGroup heading="Go to">
            {PRIMARY_NAV.map(({ href, label }) => (
              <CommandItem
                key={href}
                value={`page ${label}`}
                onSelect={() => go(() => router.push(href))}
              >
                {label}
              </CommandItem>
            ))}
          </CommandGroup>

          {runs.length > 0 ? (
            <CommandGroup heading="Runs">
              {runs.map((r) => (
                <CommandItem
                  key={r.stem}
                  value={`run ${r.label} ${r.stem}`}
                  onSelect={() =>
                    go(() =>
                      router.push(`/dashboard?run=${encodeURIComponent(r.stem)}`),
                    )
                  }
                >
                  <FlaskConical />
                  {r.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

            {hasOpened ? (
              <TeamsCommandGroup onSelect={(team) => go(() => openTeam(team))} />
            ) : null}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}

/**
 * Teams group, split out so the rankings fetch is deferred until the palette
 * is first opened (this only mounts once `hasOpened` flips true).
 */
function TeamsCommandGroup({
  onSelect,
}: {
  onSelect: (team: string) => void;
}) {
  const rankings = useRankings(null);
  if (rankings.status !== "ready" || rankings.data.teams.length === 0) {
    return null;
  }

  return (
    <CommandGroup heading="Teams">
      {rankings.data.teams.map((team) => (
        <CommandItem
          key={team.team}
          value={`team ${team.team} ${team.conference}`}
          onSelect={() => onSelect(team.team)}
        >
          <TeamLogoTile
            team={team.team}
            logoUrl={team.logo_url}
            abbreviation={team.abbreviation}
            primaryColor={team.primary_color}
            size={18}
          />
          <span className="truncate">{team.team}</span>
          <span className="ml-auto text-xs text-muted-foreground">
            {team.conference}
          </span>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}
