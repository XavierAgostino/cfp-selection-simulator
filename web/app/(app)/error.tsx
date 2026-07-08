"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col gap-4 py-12">
      <Alert variant="destructive">
        <TriangleAlert />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>
          This page hit an unexpected error. Try again, and if it keeps
          happening, reload the app.
        </AlertDescription>
      </Alert>
      <div>
        <Button variant="outline" size="sm" onClick={reset}>
          <RotateCcw data-icon="inline-start" />
          Try again
        </Button>
      </div>
    </div>
  );
}
