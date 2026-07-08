import type { ReactNode } from "react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

/** Standard "nothing here yet" treatment — used for under-construction pages and empty data sets. */
export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <Empty className="border border-dashed border-border bg-card/40 py-20">
      <EmptyHeader className="max-w-md">
        {icon ? (
          <EmptyMedia
            variant="icon"
            className="size-12 rounded-full border border-border bg-secondary text-muted-foreground [&_svg:not([class*='size-'])]:size-5"
          >
            {icon}
          </EmptyMedia>
        ) : null}
        <EmptyTitle className="text-base font-semibold text-foreground">
          {title}
        </EmptyTitle>
        {description ? (
          <EmptyDescription className="leading-6">{description}</EmptyDescription>
        ) : null}
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}
