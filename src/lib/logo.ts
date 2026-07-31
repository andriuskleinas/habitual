/**
 * The Habitual monogram — geometry only, no React, so the header, the favicon
 * and the OG card can all draw the same mark.
 *
 * The shape is an `H` whose counter is a figure with both arms raised: the two
 * uprights are the arms and legs, the slot between them opens into the round
 * head, and the shallow scoop along the bottom separates the legs.
 *
 * It is a *single* closed path — outer outline first, head second — relying on
 * the default nonzero fill rule. The head sits in the slot, which is outside
 * the outline and therefore has winding 0, so the extra subpath fills rather
 * than punches a hole. One path means one fill: the mark recolours with a
 * single `currentColor` and there is no second shape to fall out of alignment
 * when it is scaled down to a 16px favicon.
 *
 * Drawn in a 100 × 103 box — the proportions of the mark itself, with no tile
 * or padding around it. Whatever draws it owns its own padding.
 */
export const LOGO_VIEWBOX = "0 0 100 103";

/** Aspect ratio of {@link LOGO_VIEWBOX}, for sizing the mark inside a tile. */
export const LOGO_ASPECT = 100 / 103;

export const LOGO_PATH =
  // Outer outline, clockwise from the left upright's shoulder: over the rounded
  // top of the left arm, down into the slot, around the head, up the right arm,
  // down the right edge, then back across the scoop between the legs.
  "M0 13.55A13.55 13.55 0 0 1 27.1 13.55" +
  "L27.1 42.2A22.9 22.9 0 0 0 72.9 42.2" +
  "L72.9 13.55A13.55 13.55 0 0 1 100 13.55" +
  "L100 89.45A13.55 13.55 0 0 1 72.9 89.45" +
  "A22.9 13.7 0 0 0 27.1 89.45" +
  "A13.55 13.55 0 0 1 0 89.45Z" +
  // The head, concentric with the slot's rounded end.
  "M36.3 42.5a13.7 13.7 0 1 0 27.4 0a13.7 13.7 0 1 0-27.4 0Z";

/**
 * The small cut — same mark, opened up for favicon sizes.
 *
 * At a 16px tab icon the glyph is only ~10px tall, and in {@link LOGO_PATH}
 * the ring around the head (9.2 units) and the bridge under it (10.65) both
 * land under a pixel. They close up, and the mark collapses into a plain `H`.
 * This cut shrinks the head 13.7 → 13 and lifts the bottom scoop 13.7 → 11,
 * which widens the ring to 9.9 and the bridge to 13.35 — enough for the head
 * to stay a separate dot once rasterised.
 *
 * Optical sizing, not a different logo: only the favicon uses it. Anything
 * with the resolution to hold the detail — the header, the iOS icon, the share
 * cards — draws {@link LOGO_PATH}. The two are never seen side by side.
 *
 * NOTE: `src/app/icon.svg` is a static file and can't import this, so it
 * carries its own copy of the `d` below. Change one, change both — and
 * regenerate `src/app/favicon.ico` from it (see that file's provenance in the
 * commit that added it).
 */
export const LOGO_PATH_SMALL =
  "M0 13.55A13.55 13.55 0 0 1 27.1 13.55" +
  "L27.1 42.2A22.9 22.9 0 0 0 72.9 42.2" +
  "L72.9 13.55A13.55 13.55 0 0 1 100 13.55" +
  "L100 89.45A13.55 13.55 0 0 1 72.9 89.45" +
  "A22.9 11 0 0 0 27.1 89.45" +
  "A13.55 13.55 0 0 1 0 89.45Z" +
  "M37 42.5a13 13 0 1 0 26 0a13 13 0 1 0-26 0Z";

/**
 * Brand gradient stops as hex. `globals.css` is the source of truth, but SVG
 * files and the OG renderer can't read a custom property — these are
 * `--brand-from` / `--brand-to` converted from oklch. Keep them in step.
 *
 * `BRAND_DEEP` has no token behind it: it is `--brand-from` taken darker along
 * the same hue (268°), and exists only to give the share cards a corner to
 * start from.
 */
export const BRAND_DEEP = "#22357A";
export const BRAND_FROM = "#344EAD";
export const BRAND_TO = "#0486D3";

/**
 * The share-card background. Both OG routes used to carry their own copy of
 * this string, and both had drifted off the tokens — the end stop sat at hue
 * 255° against `--brand-to`'s 245°, so share cards ended in a different blue
 * from the app. One constant, so they can't drift apart again.
 */
export const BRAND_GRADIENT = `linear-gradient(135deg, ${BRAND_DEEP} 0%, ${BRAND_FROM} 55%, ${BRAND_TO} 100%)`;
