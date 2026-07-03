"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, CirclePlay, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { navigateToRun } from "@/components/layout/RunSwitcher";
import { cn } from "@/lib/utils";
import {
  dataSourceLabel,
  formatRulesetShort,
  formatWeightsLabeled,
  isBaseRun,
  LIVE_CFBD_HELPER,
  runCatalogSecondary,
  SAMPLE_DEMO_HELPER,
  SEASON_OPTIONS,
  WEEK_OPTIONS,
} from "@/lib/runDisplay";
import type { WeekDefaultsResponse } from "@/app/api/run/week-defaults/route";
import { fetchWeekDefaults, weekOptionLabel } from "@/lib/defaultWeek";
import type { RunCatalogResponse } from "@/lib/runCatalog";
import type { RunCapabilities, RunJobRecord } from "@/lib/runJob";
import { invalidateRunPayloadCache } from "@/lib/runPayloadCache";
import { truncateConfigHash } from "@/lib/recordMeta";
import type { RunSummary } from "@/lib/types";

interface RunAnalysisDialogProps {
  defaultYear: number;
  currentRun: RunSummary;
  currentStem: string;
  latestStem: string;
  catalog: RunCatalogResponse;
  jobs: RunJobRecord[];
  onRefreshCatalog: () => Promise<void>;
  onRefreshJobs: () => Promise<void>;
  onRunCompleted: () => Promise<void>;
}

/** Default composite weights (read-only until Scenario Lab). */
const DEFAULT_WEIGHTS = {
  resume: 0.4,
  predictive: 0.3,
  sor: 0.2,
  sos: 0.1,
};

type AnalysisTab = "create" | "runs" | "jobs";

function isInProgress(status: RunJobRecord["status"]): boolean {
  return status === "queued" || status === "running";
}

function statusLabel(status: RunJobRecord["status"]): string {
  switch (status) {
    case "queued":
      return "Queued";
    case "running":
      return "Running";
    case "succeeded":
      return "Succeeded";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
  }
}

function statusBadgeVariant(
  status: RunJobRecord["status"],
): "chip-neutral" | "chip-green" | "chip-red" {
  if (status === "succeeded") return "chip-green";
  if (status === "failed" || status === "cancelled") return "chip-red";
  return "chip-neutral";
}

function jobSummaryLine(job: RunJobRecord): string {
  const source =
    job.request.data_source === "cfbd" ? "Live CFBD" : "Sample demo";
  return `${job.request.season} Week ${job.request.week} · ${source}`;
}

interface CurrentRunBannerProps {
  run: RunSummary;
}

function CurrentRunBanner({ run }: CurrentRunBannerProps) {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/30 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Current
      </p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{run.label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {dataSourceLabel(run)} · {formatRulesetShort(run.ruleset)} ·{" "}
        {formatWeightsLabeled(run.weights)}
      </p>
    </div>
  );
}

interface RunCatalogRowsProps {
  runs: RunSummary[];
  currentStem: string;
  latestStem: string;
  onOpen: () => void;
}

function RunCatalogRows({
  runs,
  currentStem,
  latestStem,
  onOpen,
}: RunCatalogRowsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (runs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No runs found. Create one from the Create tab.
      </p>
    );
  }

  return (
    <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
      {runs.map((run) => {
        const isCurrent = run.stem === currentStem;
        return (
          <li key={run.stem}>
            <button
              type="button"
              disabled={isCurrent}
              onClick={() => {
                navigateToRun(
                  run.stem,
                  currentStem,
                  latestStem,
                  pathname,
                  searchParams,
                  router,
                );
                onOpen();
              }}
              className={cn(
                "flex w-full flex-col gap-1.5 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors",
                isCurrent
                  ? "border-border/60 bg-secondary/50"
                  : "hover:border-border/40 hover:bg-accent/50",
              )}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-medium text-foreground">
                  {run.label}
                </span>
                {isCurrent ? (
                  <Badge variant="chip-neutral" className="text-[10px]">
                    Current
                  </Badge>
                ) : null}
                {isBaseRun(run) ? (
                  <Badge variant="chip-neutral" className="text-[10px]">
                    Base
                  </Badge>
                ) : (
                  <Badge variant="chip-neutral" className="text-[10px]">
                    Scenario
                  </Badge>
                )}
                {run.has_sensitivity ? (
                  <Badge variant="chip-neutral" className="text-[10px]">
                    Has stability
                  </Badge>
                ) : null}
                {run.has_bracket ? (
                  <Badge variant="chip-neutral" className="text-[10px]">
                    Bracket ready
                  </Badge>
                ) : null}
              </div>
              <span className="text-xs text-muted-foreground">
                {runCatalogSecondary(run)}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground/60">
                {truncateConfigHash(run.config_hash)}
              </span>
              {!isCurrent ? (
                <span className="text-xs font-medium text-primary">Open</span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

interface JobsPanelProps {
  jobs: RunJobRecord[];
  currentStem: string;
  latestStem: string;
  onOpenRun: () => void;
  onRefresh: () => void;
}

function JobsPanel({
  jobs,
  currentStem,
  latestStem,
  onOpenRun,
  onRefresh,
}: JobsPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [expandedJobId, setExpandedJobId] = React.useState<string | null>(null);
  const [logCache, setLogCache] = React.useState<Record<string, string[]>>({});

  async function loadLogs(jobId: string) {
    if (logCache[jobId]) return;
    try {
      const res = await fetch(`/api/run/${encodeURIComponent(jobId)}/logs`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const payload = (await res.json()) as { lines: string[] };
      setLogCache((prev) => ({ ...prev, [jobId]: payload.lines ?? [] }));
    } catch {
      // ignore
    }
  }

  function openRun(stem: string) {
    navigateToRun(stem, currentStem, latestStem, pathname, searchParams, router);
    onOpenRun();
  }

  if (jobs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No recent jobs. Start an analysis from the Create tab.
      </p>
    );
  }

  return (
    <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
      {jobs.map((job) => {
        const expanded = expandedJobId === job.job_id;
        return (
          <li
            key={job.job_id}
            className="rounded-lg border border-border/50 bg-card/50 px-3 py-2.5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={statusBadgeVariant(job.status)} className="text-[10px]">
                    {statusLabel(job.status)}
                  </Badge>
                  <span className="text-sm font-medium">{jobSummaryLine(job)}</span>
                </div>
                {job.error ? (
                  <p className="mt-1 text-xs text-destructive">{job.error}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1.5">
                {job.status === "succeeded" && job.stem && job.stem !== currentStem ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openRun(job.stem!)}
                  >
                    Open run
                  </Button>
                ) : null}
              </div>
            </div>

            <Collapsible
              open={expanded}
              onOpenChange={(open) => {
                setExpandedJobId(open ? job.job_id : null);
                if (open) void loadLogs(job.job_id);
              }}
            >
              <CollapsibleTrigger className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform",
                    expanded && "rotate-180",
                  )}
                />
                Log details
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="mt-2 max-h-32 overflow-y-auto rounded-md bg-secondary p-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
                  {(logCache[job.job_id] ?? []).join("\n") || "No log output yet."}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          </li>
        );
      })}
      <li>
        <Button type="button" variant="ghost" size="sm" onClick={onRefresh}>
          Refresh jobs
        </Button>
      </li>
    </ul>
  );
}

/** Run workspace: create analyses, switch runs, inspect jobs — without leaving the page. */
export function RunAnalysisDialog({
  defaultYear,
  currentRun,
  currentStem,
  latestStem,
  catalog,
  jobs: jobsProp,
  onRefreshCatalog: _onRefreshCatalog,
  onRefreshJobs,
  onRunCompleted,
}: RunAnalysisDialogProps) {
  void _onRefreshCatalog;
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<AnalysisTab>("create");
  const [year, setYear] = React.useState(String(defaultYear));
  const [week, setWeek] = React.useState("15");
  const [source, setSource] = React.useState<"sample" | "live">("sample");
  const [weekDefaults, setWeekDefaults] =
    React.useState<WeekDefaultsResponse | null>(null);
  const [capabilities, setCapabilities] = React.useState<RunCapabilities | null>(
    null,
  );
  const [jobs, setJobs] = React.useState<RunJobRecord[]>(jobsProp);
  const [prevJobsProp, setPrevJobsProp] = React.useState(jobsProp);
  if (jobsProp !== prevJobsProp) {
    setPrevJobsProp(jobsProp);
    setJobs(jobsProp);
  }

  const [openFormKey, setOpenFormKey] = React.useState<string | null>(null);
  const formResetKey = open ? "open" : null;
  if (formResetKey !== openFormKey) {
    setOpenFormKey(formResetKey);
    if (formResetKey !== null) {
      setYear(String(defaultYear));
      setSource("sample");
    }
  }

  const [jobId, setJobId] = React.useState<string | null>(null);
  const [job, setJob] = React.useState<RunJobRecord | null>(null);
  const [logLines, setLogLines] = React.useState<string[]>([]);
  const logRef = React.useRef<HTMLPreElement>(null);

  const running = job !== null && isInProgress(job.status);
  const generationEnabled = capabilities?.run_generation_enabled ?? false;
  const liveEnabled = capabilities?.live_cfbd_enabled ?? false;
  const catalogRuns = catalog.runs;
  const catalogLatestStem = catalog.latest_stem ?? latestStem;

  const weekChoices = React.useMemo(() => {
    const maxWeek = weekDefaults?.max_available_week ?? WEEK_OPTIONS.length;
    return WEEK_OPTIONS.filter((w) => w <= maxWeek);
  }, [weekDefaults]);

  React.useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const season = Number.parseInt(year, 10);
    if (!Number.isFinite(season)) return;

    fetchWeekDefaults(season, source)
      .then((defaults) => {
        if (cancelled) return;
        setWeekDefaults(defaults);
        setWeek(String(defaults.default_week));
      })
      .catch(() => {
        if (cancelled) return;
        setWeekDefaults(null);
      });

    return () => {
      cancelled = true;
    };
  }, [open, year, source]);

  React.useEffect(() => {
    if (!open) return;

    let cancelled = false;
    fetch("/api/run/capabilities", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: RunCapabilities | null) => {
        if (cancelled || !data) return;
        setCapabilities(data);
        if (!data.live_cfbd_enabled) setSource("sample");
        if (data.active_job_id) setTab("jobs");
      })
      .catch(() => {
        if (!cancelled) setCapabilities(null);
      });

    return () => {
      cancelled = true;
    };
  }, [open, defaultYear]);

  React.useEffect(() => {
    if (!jobId || !running) return;

    const interval = setInterval(async () => {
      try {
        const [statusRes, logsRes] = await Promise.all([
          fetch(`/api/run/${encodeURIComponent(jobId)}`, { cache: "no-store" }),
          fetch(`/api/run/${encodeURIComponent(jobId)}/logs`, {
            cache: "no-store",
          }),
        ]);
        if (!statusRes.ok) return;

        const next = (await statusRes.json()) as RunJobRecord;
        setJob(next);
        setJobs((prev) => {
          const rest = prev.filter((j) => j.job_id !== next.job_id);
          return [next, ...rest];
        });

        if (logsRes.ok) {
          const logsPayload = (await logsRes.json()) as { lines: string[] };
          setLogLines(logsPayload.lines ?? []);
        }

        if (next.status === "succeeded" && next.stem) {
          invalidateRunPayloadCache(next.stem);
          await onRunCompleted();
          const completedLabel =
            catalogRuns.find((run) => run.stem === next.stem)?.label ??
            `${next.request.season} Week ${next.request.week} · Base`;
          toast.success(`Analysis complete: ${completedLabel}`);
          const params = new URLSearchParams();
          if (next.stem !== latestStem) {
            params.set("run", next.stem);
          }
          router.push(params.size ? `/?${params.toString()}` : "/");
          router.refresh();
          setOpen(false);
          setJobId(null);
          setJob(null);
        } else if (next.status === "failed") {
          toast.error(next.error ?? "Run failed. See the Jobs tab for details.");
          setTab("jobs");
        }
      } catch {
        // transient poll failure; keep polling
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, running, router, latestStem, onRunCompleted, catalogRuns]);

  React.useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [logLines.length]);

  async function launch() {
    if (!generationEnabled) {
      toast.error("Run generation is unavailable in this deployment.");
      return;
    }

    const season = Number(year);
    const weekNum = Number(week);
    if (!Number.isInteger(season) || season < 2014 || season > 2035) {
      toast.error("Season must be between 2014 and 2035.");
      return;
    }
    if (!Number.isInteger(weekNum) || weekNum < 1 || weekNum > 16) {
      toast.error("Week must be between 1 and 16.");
      return;
    }

    const data_source = source === "sample" ? "sample" : "cfbd";

    const res = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ season, week: weekNum, data_source }),
    });

    if (res.status === 409) {
      toast.error("Another run is already in progress.");
      setTab("jobs");
      void onRefreshJobs();
      return;
    }
    if (res.status === 429) {
      toast.error("Live runs are throttled. Wait a few minutes and retry.");
      return;
    }
    if (res.status === 400) {
      const payload = (await res.json()) as { error?: string };
      if (payload.error === "cfbd_unavailable") {
        toast.error("Live CFBD is not configured on this server.");
      } else {
        toast.error("Invalid run parameters.");
      }
      return;
    }
    if (res.status === 501) {
      toast.error(
        "Run generation unavailable. Enable SELECTION_ROOM_ENABLE_RUN_JOBS and run make setup.",
        {
          action: {
            label: "Setup",
            onClick: () => window.open("/setup", "_blank"),
          },
        },
      );
      return;
    }
    if (!res.ok) {
      toast.error("Could not start the run.");
      return;
    }

    const payload = (await res.json()) as { job_id: string };
    const newJob: RunJobRecord = {
      job_id: payload.job_id,
      status: "queued",
      created_at: new Date().toISOString(),
      started_at: null,
      finished_at: null,
      request: { season, week: weekNum, data_source },
      stem: null,
      error: null,
      pid: null,
      exit_code: null,
    };
    setJobId(payload.job_id);
    setLogLines([]);
    setJob(newJob);
    setJobs((prev) => [newJob, ...prev]);
    setTab("jobs");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="default" size="sm" className="gap-1.5">
            <CirclePlay className="size-4" />
            Run Analysis
          </Button>
        }
      />
      <DialogContent className="flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-hidden sm:max-w-lg">
        <DialogHeader className="shrink-0 pb-3">
          <DialogTitle>Run Analysis</DialogTitle>
          <DialogDescription>
            Create analyses, switch runs, and check job status without leaving
            this page.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-1">
          <div className="flex flex-col gap-4 pb-2">
            <CurrentRunBanner run={currentRun} />

            <Tabs
              value={tab}
              onValueChange={(value) => setTab(value as AnalysisTab)}
            >
              <TabsList className="w-full">
                <TabsTrigger value="create" className="flex-1">
                  Create
                </TabsTrigger>
                <TabsTrigger value="runs" className="flex-1">
                  Runs
                </TabsTrigger>
                <TabsTrigger value="jobs" className="flex-1">
                  Jobs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="create" className="mt-4 space-y-4">
                {!generationEnabled && capabilities !== null ? (
                  <p className="rounded-lg bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">
                    Run generation is unavailable. Requires persistent Node,
                    Python, writable storage, and{" "}
                    <code className="text-xs">SELECTION_ROOM_ENABLE_RUN_JOBS=1</code>
                    .
                  </p>
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="text-muted-foreground">Season</span>
                    <Select
                      value={year}
                      onValueChange={(v) => v && setYear(v)}
                      disabled={running}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEASON_OPTIONS.map((s) => (
                          <SelectItem key={s} value={String(s)}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="text-muted-foreground">Week</span>
                    <Select
                      value={week}
                      onValueChange={(v) => v && setWeek(v)}
                      disabled={running}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {weekChoices.map((w) => (
                          <SelectItem key={w} value={String(w)}>
                            {weekOptionLabel(w, weekDefaults?.week_labels)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-sm text-muted-foreground">Data source</span>
                  <ToggleGroup
                    value={[source]}
                    onValueChange={(value) => {
                      const next = value[0] as "sample" | "live" | undefined;
                      if (next) setSource(next);
                    }}
                    disabled={running || !generationEnabled}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="live" disabled={!liveEnabled}>
                      Live CFBD
                    </ToggleGroupItem>
                    <ToggleGroupItem value="sample">Sample demo</ToggleGroupItem>
                  </ToggleGroup>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {source === "live"
                      ? liveEnabled
                        ? LIVE_CFBD_HELPER
                        : "Live CFBD is not configured on this server. Use Sample demo, or set CFBD_API_KEY on the server."
                      : SAMPLE_DEMO_HELPER}
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Model defaults
                  </span>
                  <p className="text-sm text-foreground/90">
                    {formatWeightsLabeled(DEFAULT_WEIGHTS)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Custom weights come later in Scenario Lab.
                  </p>
                </div>

                {running ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <LoaderCircle className="size-4 animate-spin" />
                    Job {statusLabel(job!.status).toLowerCase()}. See the Jobs tab
                    for logs.
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="runs" className="mt-4">
                <p className="mb-2 text-xs text-muted-foreground">
                  Available runs
                  {catalog.source === "duckdb" ? " · from local store" : ""}
                </p>
                <RunCatalogRows
                  runs={catalogRuns}
                  currentStem={currentStem}
                  latestStem={catalogLatestStem}
                  onOpen={() => setOpen(false)}
                />
              </TabsContent>

              <TabsContent value="jobs" className="mt-4">
                <p className="mb-2 text-xs text-muted-foreground">Recent jobs</p>
                {running && logLines.length > 0 ? (
                  <pre
                    ref={logRef}
                    className="mb-3 max-h-28 overflow-y-auto rounded-lg bg-secondary p-3 font-mono text-[11px] leading-relaxed text-muted-foreground"
                  >
                    {logLines.join("\n")}
                  </pre>
                ) : null}
                <JobsPanel
                  jobs={jobs}
                  currentStem={currentStem}
                  latestStem={latestStem}
                  onOpenRun={() => setOpen(false)}
                  onRefresh={() => void onRefreshJobs()}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {tab === "create" ? (
          <DialogFooter className="shrink-0 gap-2 border-t border-border/40 pt-4 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={running}
            >
              Close
            </Button>
            <Button
              onClick={launch}
              disabled={running || !generationEnabled}
              className="gap-1.5"
            >
              {running ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Running…
                </>
              ) : (
                "Run Analysis"
              )}
            </Button>
          </DialogFooter>
        ) : (
          <DialogFooter className="shrink-0 border-t border-border/40 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated Use RunAnalysisDialog */
export const NewRunDialog = RunAnalysisDialog;
