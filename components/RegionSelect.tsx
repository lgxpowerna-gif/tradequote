"use client";
import { COUNTRIES, lab, sanitizeRegion, subdivisions, type Country, type Region } from "@/lib/region";
import type { i18n, Lang } from "@/lib/i18n";

type T = (typeof i18n)[Lang];

/** Country + province/state selects (business region). */
export function RegionSelect({ t, lang, region, onChange, testPrefix, className = "" }: {
  t: T; lang: Lang; region: Region; onChange: (r: Region) => void; testPrefix: string; className?: string;
}) {
  const subs = subdivisions(region.country);
  const sel = "w-full border rounded-lg px-2 py-2 text-sm bg-white";
  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`}>
      <label className="text-[11px] text-slate-500">{t.country}
        <select value={region.country} onChange={(e) => onChange(sanitizeRegion({ country: e.target.value as Country }))} className={sel} data-testid={`${testPrefix}-country`}>
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{lab(c.label, lang)}</option>)}
        </select>
      </label>
      {subs.length > 0 ? (
        <label className="text-[11px] text-slate-500">{region.country === "CA" ? t.province : t.usState}
          <select value={region.sub} onChange={(e) => onChange(sanitizeRegion({ country: region.country, sub: e.target.value }))} className={sel} data-testid={`${testPrefix}-sub`}>
            {region.country === "US" && <option value="">{t.pickState}</option>}
            {subs.map((s) => <option key={s.code} value={s.code}>{lab(s.label, lang)}</option>)}
          </select>
        </label>
      ) : <div />}
    </div>
  );
}
