import {
  BadgeCheck,
  BookOpen,
  FileText,
  FlaskConical,
  LayoutDashboard,
  ListFilter,
  ListOrdered,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { PRIMARY_NAV } from "@/lib/nav";

export const NAV_ICONS = {
  "/dashboard": LayoutDashboard,
  "/bracket": Trophy,
  "/rankings": ListOrdered,
  "/bubble": ListFilter,
  "/scenario-lab": FlaskConical,
  "/methodology": BookOpen,
  "/validation": BadgeCheck,
} as const satisfies Record<(typeof PRIMARY_NAV)[number]["href"], LucideIcon>;

/** Mobile drawer — documentation hub (not in PRIMARY_NAV). */
export const DOCS_NAV_ICON = FileText;
