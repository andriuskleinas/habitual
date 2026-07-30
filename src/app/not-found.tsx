import Link from "next/link";
import { Compass } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-5 sm:px-8">
        <Wordmark />
      </header>
      <main
        id="main"
        className="flex flex-1 items-center justify-center px-5 py-16 sm:px-8"
      >
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <span className="bg-accent text-accent-foreground flex size-14 items-center justify-center rounded-2xl">
            <Compass className="size-7" aria-hidden />
          </span>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            This page isn&apos;t here
          </h1>
          <p className="text-muted-foreground text-pretty">
            The link may be broken, or the challenge it pointed to was removed.
            Invite links expire if the owner deletes the challenge.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/">Go home</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">My dashboard</Link>
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
