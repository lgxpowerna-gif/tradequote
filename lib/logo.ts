/**
 * Business logo printed in the PDF header. The image is resized and compressed in the browser
 * (components/LogoPicker.tsx) and stored in localStorage (tq_logo) as a data URL, with its pixel size.
 * Pure validation helpers here (unit-tested in scripts/test.mjs).
 */
export const LOGO_KEY = "tq_logo";
/** Max file the user can pick (before compression). */
export const MAX_LOGO_INPUT_BYTES = 5 * 1024 * 1024;
/** Max stored data URL length (~150 KB of image). */
export const MAX_LOGO_CHARS = 200_000;
/** Longest side after resizing, in pixels (sharp enough for ~40 mm on paper). */
export const LOGO_MAX_PX = 600;

export type Logo = { dataUrl: string; w: number; h: number };

const DATA_URL = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*$/;

export function sanitizeLogo(v: unknown): Logo | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const { dataUrl, w, h } = o;
  if (typeof dataUrl !== "string" || dataUrl.length > MAX_LOGO_CHARS || !DATA_URL.test(dataUrl)) return null;
  if (typeof w !== "number" || typeof h !== "number" || !(w > 0 && h > 0 && w <= 4000 && h <= 4000)) return null;
  return { dataUrl, w: Math.round(w), h: Math.round(h) };
}

export const logoFormat = (l: Logo): "PNG" | "JPEG" => (l.dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG");

/** Fits the logo in a box (mm), keeping its proportions. */
export function fitLogo(l: Pick<Logo, "w" | "h">, maxW: number, maxH: number): { w: number; h: number } {
  const r = Math.min(maxW / l.w, maxH / l.h);
  return { w: l.w * r, h: l.h * r };
}

/** Target size after resizing (longest side ≤ max, never upscaled). */
export function resizeTarget(w: number, h: number, max = LOGO_MAX_PX): { w: number; h: number } {
  const r = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * r)), h: Math.max(1, Math.round(h * r)) };
}
