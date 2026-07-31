/**
 * How a person is named across the app.
 *
 * A profile has three optional name fields and one guaranteed one (email), so
 * every surface needs the same fallback chain rather than each page inventing
 * its own. The nickname wins wherever we're talking *to* someone, because the
 * whole product is a friend nagging you — "Hey Andy" beats "Hey Andrius
 * Kleinas".
 */

export type ProfileNames = {
  name?: string | null;
  surname?: string | null;
  nickname?: string | null;
  email?: string | null;
};

/** Longest each field is allowed to be — mirrors the CHECK constraints. */
export const NAME_MAX = 60;
export const NICKNAME_MAX = 40;

/** What we greet someone by: nickname → first name → the email's local part. */
export function displayName(p: ProfileNames): string {
  const nickname = p.nickname?.trim();
  if (nickname) return nickname;
  const name = p.name?.trim();
  if (name) return name;
  const local = p.email?.split("@")[0]?.trim();
  return local || "there";
}

/** "Andrius Kleinas" — the formal one, empty when neither part is set. */
export function fullName(p: ProfileNames): string {
  return [p.name?.trim(), p.surname?.trim()].filter(Boolean).join(" ");
}

/**
 * Up to two letters for the avatar tile. Prefers initials of the real name,
 * falls back to the first letters of whatever we do have.
 */
export function initials(p: ProfileNames): string {
  const first = p.name?.trim();
  const last = p.surname?.trim();
  if (first && last) return (first[0] + last[0]).toUpperCase();

  const source = first || p.nickname?.trim() || p.email?.trim() || "";
  // Two words in one field ("Ana Maria") still yields two letters.
  const words = source.split(/[\s._-]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (source.slice(0, 2) || "?").toUpperCase();
}
