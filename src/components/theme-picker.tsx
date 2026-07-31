"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Choice = "light" | "dark" | "system";

const OPTIONS: { value: Choice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/**
 * The full theme control, for the account page — the header only ever had a
 * two-way flip, which quietly took "follow my system" away from anyone who
 * touched it once. Same storage contract as `ThemeScript`: "light"/"dark" is an
 * explicit override, an absent key means follow the OS.
 *
 * Rendered as radios so it's keyboard- and screen-reader-native, and deferred
 * until mount because the server can't know what the script resolved to.
 */
export function ThemePicker() {
  const [choice, setChoice] = useState<Choice | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme");
      setChoice(stored === "light" || stored === "dark" ? stored : "system");
    } catch {
      setChoice("system");
    }
  }, []);

  function pick(next: Choice) {
    setChoice(next);

    const dark =
      next === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
        : next === "dark";
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";

    try {
      // Removing the key is what re-enables the ThemeScript's live OS listener.
      if (next === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch {
      // Private mode / blocked storage — the choice still holds for this visit.
    }
  }

  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="sr-only">Theme</legend>
      <div
        className="bg-muted/60 grid grid-cols-3 gap-1 rounded-xl p-1"
        // Until mount we don't know which is active; dimming avoids flashing
        // the wrong selection.
        aria-busy={choice === null}
      >
        {OPTIONS.map(({ value, label, icon: Icon }) => {
          const active = choice === value;
          return (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                "has-[:focus-visible]:outline-ring has-[:focus-visible]:rounded-lg has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2",
                // Brand fill rather than a raised surface: on a dark card a
                // "lifted" chip is darker than its track, which reads inverted.
                active
                  ? "bg-primary/15 text-primary ring-primary/30 ring-1"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <input
                type="radio"
                name="theme"
                value={value}
                checked={active}
                onChange={() => pick(value)}
                className="sr-only"
              />
              <Icon className="size-4" aria-hidden />
              {label}
            </label>
          );
        })}
      </div>
      <p className="text-muted-foreground text-xs">
        {choice === "system"
          ? "Following your device setting."
          : "Set for this browser."}
      </p>
    </fieldset>
  );
}
