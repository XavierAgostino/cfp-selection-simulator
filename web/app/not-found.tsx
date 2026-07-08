import Link from "next/link";
import { Compass } from "lucide-react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center px-6">
      <Empty className="w-full">
        <EmptyHeader className="max-w-md">
          <EmptyMedia
            variant="icon"
            className="size-12 rounded-full border border-border bg-secondary text-muted-foreground [&_svg:not([class*='size-'])]:size-5"
          >
            <Compass />
          </EmptyMedia>
          <EmptyTitle className="text-2xl font-semibold tracking-tight text-foreground">
            Page not found
          </EmptyTitle>
          <EmptyDescription className="leading-relaxed">
            That page does not exist or has moved. Head back to the dashboard or
            browse the current field.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center gap-2">
          <Button nativeButton={false} render={<Link href="/dashboard" />}>
            Back to dashboard
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/rankings" />}
          >
            Browse rankings
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
