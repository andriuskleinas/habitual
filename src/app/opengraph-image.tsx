import { ImageResponse } from "next/og";

export const alt = "Habitual — build habits with a buddy watching";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Share-preview card. Every invite link a user sends renders this, so it's the
 * first impression for most new visitors. Plain inline styles only — the OG
 * renderer supports a small subset of CSS and no Tailwind.
 */
export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #22357A 0%, #344EAD 55%, #2F7BD4 100%)",
          padding: "72px",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "rgba(255,255,255,0.18)",
              fontSize: "32px",
            }}
          >
            🔥
          </div>
          <div style={{ fontSize: "34px", fontWeight: 600, letterSpacing: "-0.02em" }}>
            Habitual
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              fontSize: "78px",
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.035em",
              maxWidth: "900px",
            }}
          >
            Build habits with a buddy watching.
          </div>
          <div style={{ fontSize: "32px", color: "rgba(255,255,255,0.82)", maxWidth: "820px" }}>
            Set a daily challenge, put something on the line, and invite a friend
            to hold you to it.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* A streak chain, echoing the in-app check-in grid */}
          {Array.from({ length: 14 }, (_, i) => (
            <div
              key={i}
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: i === 2 ? "rgba(255,255,255,0.22)" : "white",
              }}
            />
          ))}
          <div style={{ fontSize: "28px", color: "rgba(255,255,255,0.82)", marginLeft: "12px" }}>
            13-day streak
          </div>
        </div>
      </div>
    ),
    size,
  );
}
