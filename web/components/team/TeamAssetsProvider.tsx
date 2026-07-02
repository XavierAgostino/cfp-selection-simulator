"use client";

import * as React from "react";
import type { TeamAssetsPayload } from "@/lib/types";
import { useTeamAssets } from "@/components/team/useTeamAssets";

type TeamAssetsContextValue = {
  assets: TeamAssetsPayload | null;
  status: "loading" | "error" | "ready";
};

const TeamAssetsContext = React.createContext<TeamAssetsContextValue>({
  assets: null,
  status: "loading",
});

export function useTeamAssetsContext(): TeamAssetsContextValue {
  return React.useContext(TeamAssetsContext);
}

export function TeamAssetsProvider({ children }: { children: React.ReactNode }) {
  const state = useTeamAssets();
  const value = React.useMemo<TeamAssetsContextValue>(
    () => ({
      assets: state.status === "ready" ? state.data : null,
      status: state.status,
    }),
    [state],
  );

  return (
    <TeamAssetsContext.Provider value={value}>{children}</TeamAssetsContext.Provider>
  );
}
