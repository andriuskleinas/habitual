/** Shared auth helpers for the password + magic-link flows. */

/** Where users land after signing in when no explicit destination is given. */
export const DEFAULT_NEXT = "/dashboard";

/**
 * Sanitise a `?next=` value before redirecting to it.
 *
 * `next` arrives from the query string and is echoed into `Location` headers
 * and `emailRedirectTo`, so it must be constrained to same-origin *paths*.
 * Anything protocol-relative (`//evil.com`), absolute (`https://evil.com`) or
 * backslash-escaped (which some browsers normalise to `/`) is rejected.
 */
export function safeNext(value: string | null | undefined): string {
  if (!value) return DEFAULT_NEXT;
  // Must be a single leading slash, and must not start a new authority.
  if (!value.startsWith("/")) return DEFAULT_NEXT;
  if (value.startsWith("//") || value.startsWith("/\\")) return DEFAULT_NEXT;
  if (value.includes("\\")) return DEFAULT_NEXT;
  return value;
}

/** Minimum password length we accept in the UI. */
export const MIN_PASSWORD_LENGTH = 8;

export type PasswordCheck = {
  /** Long enough to submit. */
  valid: boolean;
  /** 0–3, drives the strength meter. */
  score: number;
  label: string;
};

/**
 * Deliberately lenient: length is the only hard requirement, because forced
 * composition rules push people toward predictable substitutions. Everything
 * above the minimum is advisory feedback, not a gate.
 *
 * Supabase enforces its own configured minimum server-side, so this is a UX
 * affordance rather than the security boundary.
 */
export function checkPassword(password: string): PasswordCheck {
  const valid = password.length >= MIN_PASSWORD_LENGTH;
  if (!valid) return { valid, score: 0, label: "Too short" };

  let score = 1;
  if (password.length >= 12) score += 1;
  // Any mix of character classes beyond plain lowercase letters.
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((re) =>
    re.test(password),
  ).length;
  if (classes >= 3) score += 1;

  const label = score >= 3 ? "Strong" : score === 2 ? "Good" : "Fair";
  return { valid, score, label };
}

/**
 * Supabase obfuscates signup on an existing email to prevent enumeration: it
 * returns a user object with an EMPTY `identities` array and no session rather
 * than an error. Detecting that lets us say "sign in instead" instead of
 * leaving the person waiting for a confirmation email that never arrives.
 */
export function isExistingAccount(user: {
  identities?: unknown[] | null;
} | null): boolean {
  return !!user && Array.isArray(user.identities) && user.identities.length === 0;
}
