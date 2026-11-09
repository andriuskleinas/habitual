import { ImageResponse } from "next/og";
import { INK, INK_FOREGROUND, LOGO_PATH, LOGO_VIEWBOX } from "@/lib/logo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * Home-screen icon for iOS, which won't take an SVG. Full-bleed on purpose —
 * iOS applies its own rounded mask, so rounding it here would show as a dark
 * fringe inside the corners.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: INK,
        }}
      >
        <svg viewBox={LOGO_VIEWBOX} width={93} height={96} fill={INK_FOREGROUND}>
          <path d={LOGO_PATH} />
        </svg>
      </div>
    ),
    size,
  );
}
