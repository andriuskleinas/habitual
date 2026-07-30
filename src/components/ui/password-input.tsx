"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Password field with a reveal toggle. Paste is deliberately NOT blocked —
 * blocking it fights password managers and produces weaker passwords.
 */
export function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  const fallbackId = useId();
  const id = props.id ?? fallbackId;

  return (
    <div className="relative">
      <Input
        {...props}
        id={id}
        type={visible ? "text" : "password"}
        className={cn("pr-11", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        // Not a form control the user tabs through on the happy path; the
        // label still announces its purpose when reached.
        aria-label={visible ? "Hide password" : "Show password"}
        aria-controls={id}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md transition-colors"
      >
        {visible ? (
          <EyeOff className="size-4" aria-hidden />
        ) : (
          <Eye className="size-4" aria-hidden />
        )}
      </button>
    </div>
  );
}

/** Compact strength meter shown under a new-password field. */
export function PasswordStrength({
  score,
  label,
  show,
}: {
  score: number;
  label: string;
  show: boolean;
}) {
  if (!show) return null;
  const tone =
    score >= 3 ? "bg-success" : score === 2 ? "bg-primary" : "bg-warning";

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < score ? tone : "bg-muted",
            )}
          />
        ))}
      </div>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}
