import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { displayName, initials, type ProfileNames } from "@/lib/profile";
import { cn } from "@/lib/utils";

/**
 * Shared chrome for signed-in pages.
 *
 * Deliberately just two things: the mark home, and you. "New challenge" moved
 * to the dashboard, where starting one is the actual job, and the theme switch
 * moved to /account — both were competing with the one action that matters on
 * a challenge page, which is checking in.
 */
export function AppHeader({
  /** Names for the avatar; omit on pages that haven't loaded a profile. */
  profile,
  /** Marks the avatar as current when we're already on the account page. */
  current,
}: {
  profile?: ProfileNames;
  current?: "account";
}) {
  return (
    <header className="bg-background/80 sticky top-0 z-50 w-full border-b backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-2 px-5 sm:px-8">
        <Wordmark href="/dashboard" />

        <Link
          href="/account"
          aria-label="Your profile and settings"
          aria-current={current === "account" ? "page" : undefined}
          className={cn(
            "ml-auto flex items-center gap-2 rounded-full py-1 pr-1 pl-3 transition-colors",
            "hover:bg-muted aria-[current=page]:bg-muted",
          )}
        >
          {profile && (
            <span className="hidden max-w-[12rem] truncate text-sm font-medium sm:block">
              {displayName(profile)}
            </span>
          )}
          <span className="from-brand-from to-brand-to text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold shadow-sm">
            {profile ? initials(profile) : "•"}
          </span>
        </Link>
      </div>
    </header>
  );
}
