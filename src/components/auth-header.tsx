import { Wordmark } from "@/components/brand";

/**
 * Chrome for the signed-out entry points — sign in, sign up, password reset.
 *
 * Just the mark, home. Sign-in, signup and forgot-password each hand-rolled the
 * same header with a theme toggle beside it; the toggle went away with dark mode
 * becoming an account feature, and the three copies had already started to
 * drift, so what's left is one component.
 */
export function AuthHeader() {
  return (
    <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-5 sm:px-8">
      <Wordmark />
    </header>
  );
}
