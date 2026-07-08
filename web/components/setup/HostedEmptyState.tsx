import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export function HostedEmptyState() {
  return (
    <Empty className="min-h-[60vh] py-16">
      <EmptyHeader className="max-w-md">
        <EmptyTitle className="text-2xl font-semibold tracking-tight text-foreground">
          No hosted runs are available yet
        </EmptyTitle>
        <EmptyDescription className="leading-relaxed">
          Sign in with GitHub and start a run from Run Analysis. Completed runs
          will appear here once artifacts are uploaded.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
