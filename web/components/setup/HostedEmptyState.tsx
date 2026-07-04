export function HostedEmptyState() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        No hosted runs are available yet
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        Start a hosted run from Run Analysis if you have beta access. Completed runs
        will appear here once artifacts are uploaded.
      </p>
    </div>
  );
}
