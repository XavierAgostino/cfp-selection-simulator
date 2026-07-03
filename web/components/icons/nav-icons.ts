import {
  AmericanFootballIcon,
  BeakerIcon,
  Book02Icon,
  DashboardSquare01Icon,
  FilterHorizontalIcon,
  LeftToRightListNumberIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
} from "@hugeicons/core-free-icons";
import { PRIMARY_NAV } from "@/lib/nav";

export const NAV_HUGEICONS = {
  "/": DashboardSquare01Icon,
  "/bracket": AmericanFootballIcon,
  "/rankings": LeftToRightListNumberIcon,
  "/bubble": FilterHorizontalIcon,
  "/scenario-lab": BeakerIcon,
  "/methodology": Book02Icon,
} as const satisfies Record<(typeof PRIMARY_NAV)[number]["href"], unknown>;

export const SIDEBAR_COLLAPSE_ICON = PanelLeftCloseIcon;
export const SIDEBAR_EXPAND_ICON = PanelLeftOpenIcon;
