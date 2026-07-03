import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CommandBlock } from "@/components/setup/CommandBlock";
import { DataPoller } from "@/components/setup/DataPoller";

const STEPS: {
  title: string;
  body: string;
  commands: string[];
  optional?: boolean;
}[] = [
  {
    title: "Set up the engine",
    body: "One-time: creates the Python virtualenv and installs the selection engine. Run from the repo root.",
    commands: ["make setup"],
  },
  {
    title: "Produce your first field",
    body: "Runs the full pipeline on the bundled sample season: rankings, selection, bracket, and the JSON this app reads. No API key needed.",
    commands: ["make demo"],
  },
  {
    title: "Or go live",
    body: "With a free CollegeFootballData key in your .env, run any real season and week.",
    commands: ["./bin/sroom run --year 2025 --week 15"],
    optional: true,
  },
];

/**
 * Full-page first-run experience, shown by FirstRunGate until the pipeline
 * writes data/output/api/runs.json. DataPoller below swaps in the real app
 * the moment the first run lands.
 */
export function SetupWizard() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8 py-10">
      <div className="flex flex-col gap-3">
        <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
          Selection Room
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Let&apos;s put a field on the board.
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          This app renders whatever the selection engine last produced, and it
          has not produced anything yet. Two commands in your terminal fix
          that.
        </p>
      </div>

      <ol className="flex flex-col gap-4">
        {STEPS.map((step, index) => (
          <li key={step.title}>
            <Card className="border-border bg-card">
              <CardContent className="flex gap-3.5 px-4 py-4">
                <span
                  aria-hidden
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
                >
                  {index + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-foreground">
                      {step.title}
                    </h2>
                    {step.optional ? (
                      <Badge variant="chip-neutral">Optional</Badge>
                    ) : null}
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                  {step.commands.map((command) => (
                    <CommandBlock key={command} command={command} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-3 border-t border-border pt-5">
        <DataPoller />
        <p className="text-xs text-muted-foreground">
          Need a key for live data? Grab one free at{" "}
          <a
            href="https://collegefootballdata.com/key"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            collegefootballdata.com
          </a>{" "}
          and drop it in <code className="font-mono text-foreground">.env</code>{" "}
          as <code className="font-mono text-foreground">CFBD_API_KEY</code>.
        </p>
      </div>
    </div>
  );
}
