"use client";

import * as React from "react";
import { TeamResumeDrawer } from "@/components/team/TeamResumeDrawer";

type TeamDrawerContextValue = {
  /** Open the resume drawer for a team (canonical team name from the API payloads). */
  openTeam: (team: string) => void;
  close: () => void;
};

const TeamDrawerContext = React.createContext<TeamDrawerContextValue | null>(
  null,
);

export function useTeamDrawer(): TeamDrawerContextValue {
  const ctx = React.useContext(TeamDrawerContext);
  if (!ctx) {
    throw new Error("useTeamDrawer must be used within TeamDrawerProvider");
  }
  return ctx;
}

export function TeamDrawerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [team, setTeam] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);

  const value = React.useMemo<TeamDrawerContextValue>(
    () => ({
      openTeam: (next) => {
        setTeam(next);
        setOpen(true);
      },
      close: () => setOpen(false),
    }),
    [],
  );

  return (
    <TeamDrawerContext.Provider value={value}>
      {children}
      <TeamResumeDrawer team={team} open={open} onOpenChange={setOpen} />
    </TeamDrawerContext.Provider>
  );
}
