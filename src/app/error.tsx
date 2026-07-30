"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaces the digest in the browser console so a reported error can be
    // matched to the server log entry.
    console.error(error);
  }, [error]);

  return (
    <main
      id="main"
      className="flex flex-1 items-center justify-center px-5 py-16 sm:px-8"
    >
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <span className="bg-destructive/10 text-destructive flex size-14 items-center justify-center rounded-2xl">
          <AlertTriangle className="size-7" aria-hidden />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">
          Something went wrong
        </h1>
        <p className="text-muted-foreground text-pretty">
          That&apos;s on us, not you. Try again — your streak is safe.
        </p>
        {error.digest && (
          <p className="text-muted-foreground font-mono text-xs">
            Reference: {error.digest}
          </p>
        )}
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>
            <RotateCcw className="size-4" aria-hidden />
            Try again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
