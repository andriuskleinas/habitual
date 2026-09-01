"use client";

import { useEffect } from "react";
import { signOutForInactivity } from "@/app/auth/actions";

/** How long a signed-in user can go without interacting before being signed out. */
const TIMEOUT_MS = 30 * 60 * 1000;

/** Coalesces frequent events (mousemove fires constantly) into one write. */
const THROTTLE_MS = 15 * 1000;

const STORAGE_KEY = "habitual:lastActive";

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
] as const;

/** localStorage can throw (private mode, quota) — degrade to in-memory-only timing. */
function readStored(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

function writeStored(at: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(at));
  } catch {
    // Nothing to persist across tabs/reloads; the in-tab timer still runs.
  }
}

/**
 * Silently signs an idle user out after `TIMEOUT_MS`. Mounted once in
 * `AppHeader`, which only ever renders on pages that already required a
 * signed-in user — nothing to do on the public marketing or invite pages.
 *
 * The clock is shared across tabs via localStorage: activity in one tab
 * resets the timer everywhere, and a tab that's been backgrounded (where
 * `setTimeout` can be throttled by the browser) re-checks the real elapsed
 * time on regaining visibility rather than trusting a possibly-delayed timer.
 */
export function InactivityWatcher() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    function signOut() {
      void signOutForInactivity(
        window.location.pathname + window.location.search,
      );
    }

    function scheduleFrom(startedAt: number) {
      clearTimeout(timer);
      const remaining = TIMEOUT_MS - (Date.now() - startedAt);
      if (remaining <= 0) {
        signOut();
      } else {
        timer = setTimeout(signOut, remaining);
      }
    }

    function markActive(at: number) {
      writeStored(at);
      scheduleFrom(at);
    }

    // Loading an authenticated page is itself activity — this also covers the
    // client-side navigation case, where a fresh instance of this component
    // mounts on every route change (there's no shared layout above these
    // pages to persist it across one).
    markActive(Date.now());

    let lastMarked = Date.now();
    function onActivity() {
      const now = Date.now();
      if (now - lastMarked < THROTTLE_MS) return;
      lastMarked = now;
      markActive(now);
    }

    function onVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      scheduleFrom(readStored() ?? Date.now());
    }

    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      scheduleFrom(Number(e.newValue));
    }

    for (const type of ACTIVITY_EVENTS) {
      window.addEventListener(type, onActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("storage", onStorage);

    return () => {
      clearTimeout(timer);
      for (const type of ACTIVITY_EVENTS) {
        window.removeEventListener(type, onActivity);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
