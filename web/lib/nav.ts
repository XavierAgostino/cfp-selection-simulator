/** Primary app routes — shared by header nav and breadcrumbs. */
export const PRIMARY_NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/bracket", label: "Bracket" },
  { href: "/rankings", label: "Rankings" },
  { href: "/bubble", label: "Bubble" },
  { href: "/scenario-lab", label: "Scenario Lab" },
  { href: "/methodology", label: "Methodology" },
] as const;
