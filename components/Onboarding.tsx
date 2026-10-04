"use client";
import { useState } from "react";
import { LANGS, TEMPLATES, type i18n, type Lang } from "@/lib/i18n";
import { formatRbq, isValidRbq } from "@/lib/rbq";
import type { Logo } from "@/lib/logo";
import { LogoPicker } from "@/components/LogoPicker";
import { RegionSelect } from "@/components/RegionSelect";
import { bizFields, isQuebec, type Region } from "@/lib/region";

type T = (typeof i18n)[Lang];
type Biz = { name: string; rbq: string; gst: string; qst: string; pst?: string; licence?: string; regNo?: string; vatNo?: string; bn?: string };

/** Key set once the first-run setup is finished or skipped: it is never shown again. */
export const ONBOARDED_KEY = "tq_onboarded";

/**
 * Short first-run setup (3 steps, skippable): region + language, business name + RBQ (Québec) or
 * licence (elsewhere), then tax/registration numbers and logo (optional), then a trade template.
 * Only shown to new users (no business name, no document).
 */
export function Onboarding({ t, lang, biz, onBiz, logo, onLogo, onClose, region, onRegion, onLang }: {
  t: T;
  lang: Lang;
  region: Region;
  onRegion: (r: Region) => void;
  onLang: (l: Lang) => void;
  biz: Biz;
  onBiz: (b: Partial<Biz>) => void;
  logo: Logo | null;
  onLogo: (l: Logo | null) => void;
  /** template = id of the chosen trade template, null = no template; done = false when skipped. */
  onClose: (r: { done: boolean; template: string | null }) => void;
}) {
  const [step, setStep] = useState(1);
  const inp = "w-full border rounded-lg px-3 py-2.5 text-sm";
  const qc = isQuebec(region);
  const rbqBad = qc && !!biz.rbq && !isValidRbq(biz.rbq);
  const fields = bizFields(region, lang);
  const licence = fields.find((f) => f.key === "licence");
  const regFields = fields.filter((f) => f.key !== "licence" && f.key !== "interac");
  const titles = [t.ob1Title, t.ob2Title, t.ob3Title];
  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="onb-title" data-testid="onb">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="text-xs font-medium text-blue-700">{t.obTitle} · {t.obStep} {step} {t.obOf} 3</div>
          <button type="button" onClick={() => onClose({ done: false, template: null })} className="text-xs text-slate-500 hover:underline" data-testid="onb-skip">{t.obSkip}</button>
        </div>
        <div className="flex gap-1 mb-4" aria-hidden="true">{[1, 2, 3].map((i) => <div key={i} className={`h-1 flex-1 rounded ${i <= step ? "bg-blue-600" : "bg-slate-200"}`} />)}</div>
        <h2 id="onb-title" className="text-xl font-bold mb-1">{titles[step - 1]}</h2>

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">{qc ? t.ob1Text : t.ob1TextOther}</p>
            <div className="rounded-xl border bg-slate-50 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700">{t.region}</span>
                <select value={lang} onChange={(e) => onLang(e.target.value as Lang)} aria-label={`${t.language} / Langue / Language`} className="text-xs border rounded-md px-2 py-1 bg-white" data-testid="onb-lang">
                  {LANGS.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}
                </select>
              </div>
              <RegionSelect t={t} lang={lang} region={region} onChange={onRegion} testPrefix="onb" />
              <p className="text-[11px] text-slate-400">{t.regionHint}</p>
            </div>
            <label className="block text-xs text-slate-600">{t.companyName}
              <input autoFocus value={biz.name} onChange={(e) => onBiz({ name: e.target.value })} className={inp} data-testid="onb-name" />
            </label>
            {qc ? (<>
              <label className="block text-xs text-slate-600">{t.rbq}
                <input inputMode="numeric" value={biz.rbq} onChange={(e) => onBiz({ rbq: formatRbq(e.target.value) })} className={`${inp} ${rbqBad ? "border-red-400" : ""}`} aria-invalid={rbqBad} data-testid="onb-rbq" />
              </label>
              <p className={`text-[11px] ${rbqBad ? "text-red-600" : "text-slate-400"}`}>{rbqBad ? t.rbqInvalid : t.rbqHint}</p>
            </>) : licence && (<>
              <label className="block text-xs text-slate-600">{licence.label}
                <input value={biz.licence || ""} onChange={(e) => onBiz({ licence: e.target.value.slice(0, 120) })} className={inp} data-testid="onb-licence" />
              </label>
              <p className="text-[11px] text-slate-400" data-testid="onb-licence-hint">{licence.hint}</p>
            </>)}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">{qc ? t.ob2Text : t.ob2TextOther}</p>
            {qc ? (
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block text-xs text-slate-600">{t.gst}<input value={biz.gst} onChange={(e) => onBiz({ gst: e.target.value })} className={inp} data-testid="onb-gst" /></label>
                <label className="block text-xs text-slate-600">{t.qst}<input value={biz.qst} onChange={(e) => onBiz({ qst: e.target.value })} className={inp} data-testid="onb-qst" /></label>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {regFields.map((f) => (
                  <label key={f.key} className="block text-xs text-slate-600">{f.label}
                    <input value={biz[f.key as keyof Biz] || ""} onChange={(e) => onBiz({ [f.key]: e.target.value })} className={inp} data-testid={`onb-${f.key}`} />
                  </label>
                ))}
              </div>
            )}
            <LogoPicker t={t} logo={logo} onChange={onLogo} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">{t.ob3Text}</p>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((x) => (
                <button key={x.id} type="button" onClick={() => onClose({ done: true, template: x.id })} className="border rounded-xl px-3 py-3 text-sm font-medium hover:border-blue-500 hover:bg-blue-50 text-left" data-testid={`onb-tpl-${x.id}`}>{x.label[lang]}</button>
              ))}
            </div>
            <button type="button" onClick={() => onClose({ done: true, template: null })} className="w-full text-sm text-blue-700 font-medium py-2" data-testid="onb-finish">{t.obNoTpl}</button>
            <p className="text-[11px] text-slate-400 text-center">{t.obLater}</p>
          </div>
        )}

        {step < 3 && (
          <div className="flex gap-2 mt-5">
            {step > 1 && <button type="button" onClick={() => setStep(step - 1)} className="px-4 py-2.5 rounded-xl border text-sm font-medium">{t.obBack}</button>}
            <button type="button" onClick={() => setStep(step + 1)} disabled={step === 1 && rbqBad} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50" data-testid="onb-next">{t.obNext}</button>
          </div>
        )}
      </div>
    </div>
  );
}
