"use client";

import { useEffect, useState, type ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface ValidationTab {
  /** Stable id; doubles as the URL hash for deep linking. */
  id: string;
  label: string;
  content: ReactNode;
}

/**
 * Hash-synced tab shell for the validation sections. The active tab mirrors the
 * URL hash so deep links keep working: /validation#committee-tendencies (the
 * dashboard teaser target) opens the Committee Tendencies tab, and switching
 * tabs rewrites the hash without scrolling or pushing a history entry. Splitting
 * the three heavy sections behind tabs is the point of this change: only the
 * active panel is in the accessibility tree at a time.
 */
export function ValidationTabs({ tabs }: { tabs: ValidationTab[] }) {
  const validIds = tabs.map((tab) => tab.id);
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  // Adopt the URL hash on mount and on later hash changes (in-app deep links,
  // browser back/forward). An empty or unknown hash leaves the current tab as is.
  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash && validIds.includes(hash)) setActive(hash);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
    // validIds is derived from tabs; the joined key keeps the dep stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validIds.join("|")]);

  const handleChange = (value: string) => {
    setActive(value);
    // Reflect the tab in the URL without scrolling to an anchor or adding a
    // history entry on every switch.
    window.history.replaceState(null, "", `#${value}`);
  };

  return (
    <Tabs value={active} onValueChange={(value) => handleChange(value as string)}>
      <div className="overflow-x-auto pb-2">
        <TabsList variant="line" className="w-max min-w-full justify-start">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="mt-2">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
