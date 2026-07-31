"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Supabase's session cookie, as written by `@supabase/ssr`: `sb-<ref>-auth-token`,
 * plus `.0`/`.1`… when the value is large enough to be split across chunks. The
 * PKCE code-verifier cookies share that prefix, so they're excluded — otherwise a
 * half-finished sign-in would read as a session.
 */
const SESSION_COOKIE = /^sb-.+-auth-token(\.\d+)?$/;

function hasSessionCookie(): boolean {
  return document.cookie
    .split("; ")
    .some((c) => SESSION_COOKIE.test(c.split("=")[0]));
}

/**
 * The marketing header's right-hand actions: sign-in CTAs for visitors, a way
 * back to the dashboard for anyone already signed in.
 *
 * Deliberately decided in the browser from cookie presence rather than on the
 * server. The landing page is statically generated and CDN-served; reading the
 * session during render would make every visit dynamic — and cost an auth round
 * trip on the conversion page — to change one link that only matters to the
 * minority of visitors who are already signed in. Pulling in the Supabase
 * browser client just to ask the same question would put all of supabase-js in
 * the landing bundle for the same reason.
 *
 * This is presentation only, never an authorisation decision: `/dashboard` is
 * still guarded by the middleware, so a stale cookie costs a redirect to the
 * login page, not access. Signed-out is the pre-hydration default, which is both
 * the correct no-JS fallback and what the static HTML already says — so there's
 * nothing to mismatch.
 */
export function SiteHeaderCta() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(hasSessionCookie());

    // Catch a sign-out (or sign-in) that happened in another tab while this
    // page sat open in the background.
    function sync() {
      if (document.visibilityState === "visible") {
        setSignedIn(hasSessionCookie());
      }
    }
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  if (signedIn) {
    return (
      <Button size="sm" asChild>
        <Link href="/dashboard">
          <LayoutDashboard className="size-4" aria-hidden />
          Dashboard
        </Link>
      </Button>
    );
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
        <Link href="/login">Sign in</Link>
      </Button>
      <Button size="sm" asChild>
        <Link href="/signup">Start free</Link>
      </Button>
    </>
  );
}
