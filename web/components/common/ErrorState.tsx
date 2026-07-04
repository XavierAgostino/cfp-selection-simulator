import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  description?: string;
}

/** Treatment for a failed or missing data fetch (e.g. NotFoundError from lib/data.ts). */
export function ErrorState({
  title = "Data not available yet",
  description = "The selection engine hasn't produced this file yet. Run the exporter, or seed fixtures for local development.",
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card px-6 py-20 text-center">
      <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
