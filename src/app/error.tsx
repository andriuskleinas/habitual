"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
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
        <h1 className="text-3xl leading-tight tracking-[-0.04em] text-balance">
          Something went wrong
        </h1>
        <p className="text-muted-foreground text-pretty">
          That&apos;s on us, not you. Try again. Your streak is safe.
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
