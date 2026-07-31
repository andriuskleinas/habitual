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
    <div className="border-border/60 flex flex-col gap-3 rounded-xl border border-dashed px-4 py-4">
      {/* The QR used to be the size of the card and pushed everything else
          below the fold. Sending a link is the common case, so the code shrinks
          to a thumbnail beside the copy and the buttons get a full-width row of
          their own. Still dark-on-white in both themes so it always scans. */}
      <div className="flex items-center gap-3">
        <span className="shrink-0 rounded-lg bg-white p-1.5">
          <QRCodeSVG value={url} size={104} marginSize={1} level="M" />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-sm font-medium">Invite your buddy</p>
          <p className="text-muted-foreground text-xs text-pretty">
            Scan it or send the link — they watch live, no account needed.
          </p>
          <p className="text-muted-foreground truncate text-[0.7rem]">
            {url.replace(/^https?:\/\//, "")}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {canShare && (
          <Button type="button" size="sm" className="flex-1" onClick={share}>
            <Share2 className="size-4" />
            Share
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={copy}
        >
          {copied ? (
            <>
              <Check className="size-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-4" />
              Copy link
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
