"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type BidStatusFilter =
  | "all"
  | "in_field"
  | "auto"
  | "at_large"
  | "bubble"
  | "out";

const BID_STATUS_OPTIONS: { value: BidStatusFilter; label: string }[] = [
  { value: "all", label: "All teams" },
  { value: "in_field", label: "In field" },
  { value: "auto", label: "Auto bids" },
  { value: "at_large", label: "At-large bids" },
  { value: "bubble", label: "On the bubble" },
  { value: "out", label: "Out" },
];

function conferenceFilterLabel(conference: string): string {
  return conference === "all" ? "All conferences" : conference;
}

function bidStatusFilterLabel(bidStatus: BidStatusFilter): string {
  return BID_STATUS_OPTIONS.find((opt) => opt.value === bidStatus)?.label ?? bidStatus;
}

interface TableToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  conference: string;
  onConferenceChange: (value: string) => void;
  conferences: string[];
  bidStatus: BidStatusFilter;
  onBidStatusChange: (value: BidStatusFilter) => void;
  resultCount: number;
}

/** Search + conference filter + bid-status filter above the rankings table. */
export function TableToolbar({
  search,
  onSearchChange,
  conference,
  onConferenceChange,
  conferences,
  bidStatus,
  onBidStatusChange,
  resultCount,
}: TableToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-56">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="rankings-search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search teams…"
            className="pl-8"
            aria-label="Search teams"
          />
        </div>
        <Select
          value={conference}
          onValueChange={(v) => onConferenceChange(v ?? "all")}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Conference">
              {conferenceFilterLabel(conference)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All conferences</SelectItem>
            {conferences.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={bidStatus}
          onValueChange={(v) => onBidStatusChange((v ?? "all") as BidStatusFilter)}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Bid status">
              {bidStatusFilterLabel(bidStatus)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {BID_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="shrink-0 text-xs text-muted-foreground">
        {resultCount} {resultCount === 1 ? "team" : "teams"}
      </div>
    </div>
  );
}
