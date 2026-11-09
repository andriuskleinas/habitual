"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Owner-facing invite sharer. Every channel wraps the SAME link (`/i/<token>`):
 * a scannable QR, a copy button, and — where supported — the native Web Share
 * sheet. The absolute URL is resolved on the client from the live origin so it
 * is always correct regardless of the deployed host.
 */
export function ShareInvite({
  path,
  baseUrl,
  title,
}: {
  /** Invite path, e.g. `/i/<token>`. */
  path: string;
  /** Server-known origin for the first render (env fallback); may be empty. */
  baseUrl: string;
  /** Challenge title, used in the native share text. */
  title: string;
}) {
  // Tolerate a trailing slash on the configured base (e.g. ".../") so we never
  // emit a double slash before the client resolves the real origin.
  const [url, setUrl] = useState(`${baseUrl.replace(/\/+$/, "")}${path}`);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  // Resolve the real origin once mounted (beats any stale env base) and detect
  // Web Share support (guarded so SSR and first paint stay in sync).
  useEffect(() => {
    setUrl(`${window.location.origin}${path}`);
    setCanShare(typeof navigator !== "undefined" && !!navigator.share);
  }, [path]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (insecure context / permissions) — no-op.
    }
  }

  async function share() {
    try {
      await navigator.share({
        title: "Watch my challenge on Habitual",
        text: `Keep me accountable: ${title}`,
        url,
      });
    } catch {
      // User dismissed the share sheet, or share failed — nothing to do.
    }
  }

  return (
    <section className="border-border bg-card flex flex-col gap-4 rounded-3xl border p-5">
      <div>
        <h2 className="text-lg tracking-[-0.02em]">Your buddy</h2>
        <p className="text-muted-foreground mt-1 text-sm text-pretty">
          Send this link. They can watch live without an account, and sign in
          only to cheer or nudge.
        </p>
      </div>

      {/* The link first: sending it is the common case. The copy control
          lives inside the field so the URL and the action read as one thing. */}
      <div className="border-input flex min-w-0 items-center gap-2 rounded-full border py-1 pr-1 pl-4">
        <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm">
          {url.replace(/^https?:\/\//, "")}
        </span>
        <Button type="button" size="sm" variant="secondary" onClick={copy}>
          {copied ? (
            <>
              <Check className="size-3.5" aria-hidden />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" aria-hidden />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* QR as a thumbnail, for showing someone in the room. Dark-on-white in
          both themes so it always scans. */}
      <div className="flex items-center gap-4">
        <span className="shrink-0 rounded-xl bg-white p-1.5 ring-1 ring-black/5">
          <QRCodeSVG value={url} size={84} marginSize={1} level="M" />
        </span>
        <div className="flex min-w-0 flex-col items-start gap-2">
          <p className="text-muted-foreground text-xs text-pretty">
            Or let them scan it from your screen.
          </p>
          {canShare && (
            <Button type="button" size="sm" onClick={share}>
              <Share2 className="size-3.5" aria-hidden />
              Share
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
