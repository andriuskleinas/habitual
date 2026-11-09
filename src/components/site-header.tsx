import { Wordmark } from "@/components/brand";
import { SiteHeaderCta } from "@/components/site-header-cta";

const links = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

/**
 * Marketing nav, on the same ink as the hero it sits over. Sticky so the
 * primary CTA is reachable from any scroll depth; on mobile the section links
 * collapse away and the CTA stays.
 *
 * Ink is a fixed section colour, not dark mode, so this is the same for every
 * visitor. No theme switch: dark mode is an account feature, and it lives in
 * one place, the picker on /account.
 */
export function SiteHeader() {
  return (
    <header className="band-ink border-ink-line sticky top-0 z-50 w-full border-b">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-5 sm:px-8">
        <Wordmark tone="inverse" />

        <nav
          aria-label="Sections"
          className="text-ink-muted ml-8 hidden items-center gap-7 text-sm md:flex"
        >
          {links.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="hover:text-ink-foreground rounded-sm py-1 transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <SiteHeaderCta />
        </div>
      </div>
    </header>
  );
}
