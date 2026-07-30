import Link from "next/link";
import { LogOut, Plus } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

/**
 * Shared chrome for signed-in pages. Previously each page hand-rolled its own
 * header, so the logo, sign-out and back-links drifted apart between views.
 */
export function AppHeader({
  /** Show the "New challenge" shortcut (hidden on the create page itself). */
  showNew = true,
}: {
  showNew?: boolean;
}) {
  return (
    <header className="bg-background/80 sticky top-0 z-50 w-full border-b backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-2 px-5 sm:px-8">
        <Wordmark href="/dashboard" />

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {showNew && (
            <Button size="sm" variant="outline" asChild>
              <Link href="/challenges/new">
                <Plus className="size-4" />
                <span className="hidden sm:inline">New challenge</span>
                <span className="sr-only sm:hidden">New challenge</span>
              </Link>
            </Button>
          )}
          <ThemeToggle />
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="icon" aria-label="Sign out">
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
