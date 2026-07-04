import {
  AmericanFootballIcon,
  BeakerIcon,
  Book02Icon,
  CheckmarkBadge01Icon,
  DashboardSquare01Icon,
  File02Icon,
  FilterHorizontalIcon,
  LeftToRightListNumberIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
} from "@hugeicons/core-free-icons";
import { PRIMARY_NAV } from "@/lib/nav";

export const NAV_HUGEICONS = {
  "/dashboard": DashboardSquare01Icon,
  "/bracket": AmericanFootballIcon,
  "/rankings": LeftToRightListNumberIcon,
  "/bubble": FilterHorizontalIcon,
  "/scenario-lab": BeakerIcon,
  "/methodology": Book02Icon,
  "/validation": CheckmarkBadge01Icon,
} as const satisfies Record<(typeof PRIMARY_NAV)[number]["href"], unknown>;

export const SIDEBAR_COLLAPSE_ICON = PanelLeftCloseIcon;
export const SIDEBAR_EXPAND_ICON = PanelLeftOpenIcon;

/** Mobile drawer — documentation hub (not in PRIMARY_NAV). */
export const DOCS_NAV_ICON = File02Icon;
