"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CirclePlay, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface JobState {
  status: "idle" | "running" | "succeeded" | "failed";
  stem?: string;
  logTail?: string[];
}

interface NewRunDialogProps {
  defaultYear: number;
  defaultWeek: number;
}

/** Launches a fresh engine run (sample or live CFBD) without leaving the site. */
export function NewRunDialog({ defaultYear, defaultWeek }: NewRunDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [year, setYear] = React.useState(String(defaultYear));
  const [week, setWeek] = React.useState(String(defaultWeek));
  const [source, setSource] = React.useState<"sample" | "live">("live");
  const [job, setJob] = React.useState<JobState>({ status: "idle" });
  const logRef = React.useRef<HTMLPreElement>(null);

  const running = job.status === "running";

  React.useEffect(() => {
    if (!running) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/run", { cache: "no-store" });
        if (!res.ok) return;
        const next: JobState = await res.json();
        setJob(next);
        if (next.status === "succeeded") {
          toast.success(`Run complete — ${next.stem?.replace("_", " · ")}`);
          router.push(next.stem ? `/?run=${next.stem}` : "/");
          router.refresh();
          setOpen(false);
        } else if (next.status === "failed") {
          toast.error("Run failed — see the log for details.");
        }
      } catch {
        // transient poll failure; keep polling
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [running, router]);

  React.useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [job.logTail?.length]);

  async function launch() {
    const yearNum = Number(year);
    const weekNum = Number(week);
    if (!Number.isInteger(yearNum) || yearNum < 2014 || yearNum > 2035) {
      toast.error("Season must be between 2014 and 2035.");
      return;
    }
    if (!Number.isInteger(weekNum) || weekNum < 1 || weekNum > 16) {
      toast.error("Week must be between 1 and 16.");
      return;
    }

    const res = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: yearNum,
        week: weekNum,
        sample: source === "sample",
      }),
    });
    if (res.status === 409) {
      toast.error("A run is already in progress.");
      return;
    }
    if (res.status === 501) {
      toast.error(
        "Engine unavailable — run `make setup` in the repo, then retry.",
      );
      return;
    }
    if (!res.ok) {
      toast.error("Could not start the run.");
      return;
    }
    setJob(await res.json());
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="default" size="sm" className="gap-1.5">
            <CirclePlay className="size-4" />
            New run
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Run a new analysis</DialogTitle>
          <DialogDescription>
            Rank the field, select the 12, and build the bracket for any
            season and week. The site switches to the new run when it lands.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Season
            <Input
              type="number"
              inputMode="numeric"
              min={2014}
              max={2035}
              value={year}
              disabled={running}
              onChange={(e) => setYear(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Week
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={16}
              value={week}
              disabled={running}
              onChange={(e) => setWeek(e.target.value)}
            />
          </label>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Data source
          </span>
          <ToggleGroup
            value={[source]}
            onValueChange={(value) => {
              const next = value[0] as "sample" | "live" | undefined;
              if (next) setSource(next);
            }}
            disabled={running}
            className="justify-start"
          >
            <ToggleGroupItem value="live">Live CFBD</ToggleGroupItem>
            <ToggleGroupItem value="sample">Sample data</ToggleGroupItem>
          </ToggleGroup>
          {source === "live" ? (
            <p className="text-xs text-muted-foreground">
              Fetches real results with the{" "}
              <code className="rounded bg-secondary px-1 py-0.5 text-[11px]">
                CFBD_API_KEY
              </code>{" "}
              from your <code className="rounded bg-secondary px-1 py-0.5 text-[11px]">.env</code>.
            </p>
          ) : null}
        </div>

        {job.status !== "idle" && job.logTail && job.logTail.length > 0 ? (
          <pre
            ref={logRef}
            className="max-h-36 overflow-y-auto rounded-lg bg-secondary p-3 font-mono text-[11px] leading-relaxed text-muted-foreground"
          >
            {job.logTail.join("\n")}
          </pre>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          {job.status === "failed" ? (
            <Badge variant="chip-red">Run failed</Badge>
          ) : (
            <span />
          )}
          <Button onClick={launch} disabled={running} className="gap-1.5">
            {running ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Running…
              </>
            ) : (
              "Start run"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
