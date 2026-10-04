"use client";
import { useMemo, useState } from "react";
import { baseLang, type i18n, type Lang } from "@/lib/i18n";
import type { SavedDoc } from "@/lib/docs";
import { QBO_MAX_INVOICES, QBO_MAX_ROWS, buildQboCsv, buildSheetCsv, exportFileName, selectDocs } from "@/lib/accounting";
import { localDate } from "@/lib/backup";
import { DEFAULT_REGION, formatMoney, isQuebec, type Region } from "@/lib/region";

type T = (typeof i18n)[Lang];

function downloadText(text: string, name: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Accounting export (Pro): QuickBooks Online invoice CSV + spreadsheet CSV with TPS/TVQ columns, built locally. */
export function AccountingExport({ lang, t, history, pro, onUpgrade, onDone, region = DEFAULT_REGION }: {
  lang: Lang; t: T; history: SavedDoc[]; pro: boolean; onUpgrade: () => void; onDone: (msg: string) => void; region?: Region;
}) {
  const ca = region.country === "CA";
  // CSV files are French or English (QuickBooks / Excel); Chinese and Arabic interfaces export in English.
  const sl = baseLang(lang);
  const now = new Date();
  const [from, setFrom] = useState(`${now.getFullYear()}-01-01`);
  const [to, setTo] = useState(localDate(now));
  const [quotes, setQuotes] = useState(false);
  const range = { from: from || undefined, to: to || undefined };
  const inv = useMemo(() => selectDocs(history, range, ["invoice"]), [history, from, to]); // eslint-disable-line react-hooks/exhaustive-deps
  const qbo = useMemo(() => buildQboCsv(inv.docs, {
    product: t.accProduct,
    sitePrefix: lang === "fr" ? "Chantier : " : "Job site: ",
    region,
    codeLang: isQuebec(region) ? "fr" : sl,
    discountNote: (pct, qty, unit) => lang === "fr"
      ? `(${String(qty).replace(".", ",")} × ${ca ? unit.toFixed(2).replace(".", ",") + " $" : formatMoney(unit, region, sl).replace(/[\u202f\u00a0]/g, " ")}, remise ${String(pct).replace(".", ",")} % incluse)`
      : `(${qty} × ${ca ? "$" + unit.toFixed(2) : formatMoney(unit, region, sl)}, ${pct}% discount included)`,
  }), [inv, lang, t.accProduct, region]); // eslint-disable-line react-hooks/exhaustive-deps
  const tooBig = qbo.invoices > QBO_MAX_INVOICES || qbo.rows > QBO_MAX_ROWS;

  const exportQbo = () => {
    if (!pro) { onUpgrade(); return; }
    downloadText(qbo.csv, exportFileName("qbo", range, sl));
    onDone(t.accDone);
  };
  const exportSheet = () => {
    if (!pro) { onUpgrade(); return; }
    const sel = quotes ? selectDocs(history, range, ["invoice", "quote"]) : inv;
    downloadText(buildSheetCsv(sel.docs, sl, region), exportFileName("sheet", range, sl));
    onDone(t.accDone);
  };
  const inp = "border rounded-lg px-3 py-2 text-sm";
  const none = inv.docs.length === 0;
  return (
    <section id="export-comptable" className="bg-white border rounded-2xl p-5 mb-6" aria-labelledby="acc-title">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="acc-title" className="font-semibold">📊 {t.accTitle}</h3>
        <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{t.accPro}</span>
      </div>
      <p className="text-sm text-slate-600 mt-1">{t.accNote}</p>
      <div className="flex flex-wrap items-end gap-3 mt-3">
        <label className="text-xs text-slate-500">{t.accFrom}<br /><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inp} data-testid="acc-from" /></label>
        <label className="text-xs text-slate-500">{t.accTo}<br /><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inp} data-testid="acc-to" /></label>
        <label className="text-xs text-slate-600 flex items-center gap-2 pb-2"><input type="checkbox" checked={quotes} onChange={(e) => setQuotes(e.target.checked)} /> {t.accQuotes}</label>
      </div>
      <p className="text-xs text-slate-500 mt-2" data-testid="acc-count">
        <strong>{inv.docs.length}</strong> {t.accFound}
        {inv.skippedSummary > 0 && <> · {inv.skippedSummary} {t.accSkipped}</>}
      </p>
      {tooBig && <p role="alert" className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{t.accLimit}</p>}
      <div className="flex flex-wrap gap-2 mt-3">
        <button type="button" onClick={exportQbo} disabled={pro && (none || tooBig)} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg">{!pro && "🔒 "}{t.accQbo}</button>
        <button type="button" onClick={exportSheet} disabled={pro && none && !quotes} className="border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-sm font-medium px-4 py-2 rounded-lg">{!pro && "🔒 "}{t.accSheet}</button>
      </div>
      {!pro && <p className="text-xs text-amber-800 mt-2">{t.accProOnly} <button type="button" onClick={onUpgrade} className="underline font-semibold">{t.upgrade}</button></p>}
      {pro && none && <p className="text-xs text-slate-500 mt-2">{t.accNone}</p>}
      <details className="mt-3 text-[11px] text-slate-500">
        <summary className="cursor-pointer">QuickBooks / Excel ?</summary>
        <p className="mt-1">{region.country === "US" ? t.accQboHelpUs : t.accQboHelp}</p>
        <p className="mt-1">{t.accSheetHelp}</p>
      </details>
    </section>
  );
}
