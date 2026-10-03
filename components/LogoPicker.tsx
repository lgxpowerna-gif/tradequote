"use client";
import { useRef, useState } from "react";
import type { i18n, Lang } from "@/lib/i18n";
import { MAX_LOGO_CHARS, MAX_LOGO_INPUT_BYTES, resizeTarget, type Logo } from "@/lib/logo";

type T = (typeof i18n)[Lang];
type LogoErr = "logoErrType" | "logoErrSize" | "logoErrRead" | "logoErrBig";

/** Resizes and compresses the picked image on the device (canvas), keeping PNG transparency when it fits. */
async function processLogo(file: File): Promise<Logo> {
  if (!/^image\/(png|jpeg)$/.test(file.type)) throw "logoErrType";
  if (file.size > MAX_LOGO_INPUT_BYTES) throw "logoErrSize";
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej("logoErrRead"); img.src = url; });
    if (!img.naturalWidth || !img.naturalHeight) throw "logoErrRead";
    let max = 600;
    for (let attempt = 0; attempt < 4; attempt++, max = Math.round(max * 0.75)) {
      const { w, h } = resizeTarget(img.naturalWidth, img.naturalHeight, max);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) throw "logoErrRead";
      if (file.type === "image/png") {
        ctx.drawImage(img, 0, 0, w, h);
        const png = c.toDataURL("image/png");
        if (png.length <= MAX_LOGO_CHARS) return { dataUrl: png, w, h };
        ctx.clearRect(0, 0, w, h);
      }
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h); // JPEG has no transparency: white background
      ctx.drawImage(img, 0, 0, w, h);
      for (const q of [0.88, 0.75, 0.6]) {
        const jpg = c.toDataURL("image/jpeg", q);
        if (jpg.length <= MAX_LOGO_CHARS) return { dataUrl: jpg, w, h };
      }
    }
    throw "logoErrBig";
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function LogoPicker({ t, logo, onChange }: { t: T; logo: Logo | null; onChange: (l: Logo | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setErr(null); setBusy(true);
    try { onChange(await processLogo(f)); }
    catch (x) { setErr(t[(typeof x === "string" && x.startsWith("logoErr") ? x : "logoErrRead") as LogoErr]); }
    finally { setBusy(false); }
  };
  return (
    <div className="border-t pt-3 mt-1">
      <div className="text-xs font-medium text-slate-600 mb-1">{t.logoTitle}</div>
      <div className="flex items-center gap-3">
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo.dataUrl} alt="Logo" className="h-12 max-w-[8rem] object-contain border rounded bg-white p-1" data-testid="logo-preview" />
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => ref.current?.click()} className="text-xs border rounded-lg px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50">{busy ? "…" : logo ? t.logoChange : t.logoAdd}</button>
          {logo && <button type="button" onClick={() => onChange(null)} className="text-xs text-red-600 hover:underline">{t.logoRemove}</button>}
        </div>
        <input ref={ref} type="file" accept="image/png,image/jpeg" className="hidden" onChange={onFile} data-testid="logo-file" aria-label={t.logoAdd} />
      </div>
      <p className="text-[11px] text-slate-400 mt-1">{t.logoHint}</p>
      {err && <p role="alert" className="text-[11px] text-red-600 mt-1">{err}</p>}
    </div>
  );
}
