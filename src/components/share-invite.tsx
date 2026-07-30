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
    <div className="border-border/60 flex flex-col items-center gap-4 rounded-xl border border-dashed px-5 py-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="font-medium">Invite your buddy</p>
        <p className="text-muted-foreground text-sm text-pretty">
          Share this link. They can watch your progress live — no account
          needed.
        </p>
      </div>

      {/* QR stays dark-on-white in both themes so it always scans. */}
      <div className="rounded-xl bg-white p-3">
        <QRCodeSVG value={url} size={148} marginSize={0} level="M" />
      </div>

      <div className="bg-muted text-muted-foreground w-full truncate rounded-lg px-3 py-2 text-center text-xs">
        {url.replace(/^https?:\/\//, "")}
      </div>

      <div className="flex w-full gap-2">
        <Button
          type="button"
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
        {canShare && (
          <Button type="button" className="flex-1" onClick={share}>
            <Share2 className="size-4" />
            Share
          </Button>
        )}
      </div>
    </div>
  );
}
