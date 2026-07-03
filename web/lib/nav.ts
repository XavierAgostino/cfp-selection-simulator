/** Primary app routes — shared by header nav and breadcrumbs. */
export const PRIMARY_NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/bracket", label: "Bracket" },
  { href: "/rankings", label: "Rankings" },
  { href: "/bubble", label: "Bubble" },
  { href: "/scenario-lab", label: "Scenario Lab" },
  { href: "/methodology", label: "Methodology" },
  { href: "/validation", label: "Validation" },
] as const;

export type FooterNavLink = {
  href: string;
  label: string;
  external?: boolean;
  /** Small brand icon beside the label (footer only). */
  icon?: "github";
};

export type FooterNavSection = {
  title: string;
  links: FooterNavLink[];
};

/** Footer-only navigation. Docs are not in PRIMARY_NAV. */
export const FOOTER_NAV: FooterNavSection[] = [
  {
    title: "Product",
    links: [
      { href: "/", label: "Dashboard" },
      { href: "/bracket", label: "Bracket" },
      { href: "/rankings", label: "Rankings" },
      { href: "/bubble", label: "Bubble" },
      { href: "/scenario-lab", label: "Scenario Lab" },
      { href: "/validation", label: "Validation" },
    ],
  },
  {
    title: "Docs",
    links: [
      { href: "/docs/getting-started", label: "Getting started" },
      { href: "/docs/methodology", label: "Methodology" },
      { href: "/docs/api-contracts", label: "API contracts" },
      { href: "/docs/local-development", label: "Local development" },
    ],
  },
  {
    title: "Project",
    links: [
      {
        href: "https://github.com/XavierAgostino/cfp-selection-simulator",
        label: "GitHub",
        external: true,
        icon: "github",
      },
      { href: "/docs/methodology/data-sources", label: "Data sources" },
      { href: "/docs/limitations-and-ethics", label: "Limitations & ethics" },
    ],
  },
];

export const FOOTER_DISCLAIMER =
  "Independent project. Not affiliated with the College Football Playoff, NCAA, ESPN, or any conference.";

export const FOOTER_TAGLINE = "CFP Selection, Explained";
export const FOOTER_PRODUCT_NAME = "Selection Room";

export type MobileNavLink = {
  href: string;
  label: string;
};

export type MobileNavGroup = {
  title: string;
  links: readonly MobileNavLink[];
};

/** Grouped mobile drawer navigation (includes docs; not used on desktop). */
export const MOBILE_NAV_GROUPS: readonly MobileNavGroup[] = [
  {
    title: "Product",
    links: [
      { href: "/", label: "Dashboard" },
      { href: "/bracket", label: "Bracket" },
      { href: "/rankings", label: "Rankings" },
      { href: "/bubble", label: "Bubble" },
    ],
  },
  {
    title: "Analysis",
    links: [
      { href: "/scenario-lab", label: "Scenario Lab" },
      { href: "/validation", label: "Validation" },
      { href: "/methodology", label: "Methodology" },
    ],
  },
  {
    title: "Docs",
    links: [{ href: "/docs", label: "Documentation" }],
  },
] as const;
