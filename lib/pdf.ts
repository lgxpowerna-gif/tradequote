import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatRate, lineVatRate, presetOf, type TaxLine } from "./tax";
import { DEFAULT_REGION, formatDate, formatMoney as regionMoney, isQuebec, paymentLabel, registrationLines, type Region } from "./region";
import { rbqLine } from "./rbq";
import { fitLogo, logoFormat, type Logo } from "./logo";
import { printableItems } from "./docs";

export type PdfLang = "en" | "fr" | "zh" | "ar";

export type PdfArgs = {
  docType: "quote" | "invoice";
  lang: PdfLang;
  plan: "free" | "pro";
  meta: { number: string; date: string; notes: string; due?: string };
  /** Optional business logo (printed in the header). */
  logo?: Logo | null;
  company: { name: string; address: string; city: string; email: string; phone: string; bn: string; gst: string; qst?: string; rbq?: string; interac: string; pst?: string; licence?: string; regNo?: string; vatNo?: string };
  /** Business region (absent = Québec): currency, date format, registration lines, VAT column. */
  region?: Region;
  /** Tax preset id: VAT column per line and franchise mention. */
  taxPreset?: string;
  /** VAT presets: document rate for lines without their own rate. */
  docVat?: number;
  client: { name: string; address: string; city: string; email: string; phone?: string };
  jobSite: string;
  /** Optional job dates (YYYY-MM-DD), printed under the job site. */
  jobDate?: string;
  jobEndDate?: string;
  items: { description: string; quantity: number; unitPrice: number; vatRate?: number }[];
  subtotal: number;
  discountPct: number;
  discountAmount: number;
  taxLines: TaxLine[];
  total: number;
  depositPct: number;
  depositAmt: number;
  balance: number;
  labels: { description: string; qty: string; rate: string; subtotal: string; total: string; depositAmt: string; balance: string; discount: string };
};

/** PDF words per language (fr/en: the exact wording used before zh/ar were added). */
const W = {
  fr: { quote: "SOUMISSION", invoice: "FACTURE", from: "DE", billTo: "CLIENT", yourBiz: "Votre entreprise", site: "Chantier", job: "Travaux", to: " au ", valid: "Valide jusqu'au", due: "Échéance", terms: "Conditions", wm: "TRADEQUOTE GRATUIT", genPro: "Généré avec TradeQuote Pro", genFree: "Généré avec TradeQuote Gratuit – tradequote.faitle.net", vat: "TVA", net: "Montant HT", subHT: "Sous-total HT", ttc: "Total TTC", sep: " : " },
  en: { quote: "QUOTE", invoice: "INVOICE", from: "FROM", billTo: "BILL TO", yourBiz: "Your Business", site: "Site", job: "Job date", to: " to ", valid: "Valid until", due: "Due date", terms: "Terms", wm: "TRADEQUOTE FREE", genPro: "Generated with TradeQuote Pro", genFree: "Generated with TradeQuote Free", vat: "VAT", net: "Amount excl. VAT", subHT: "Subtotal excl. VAT", ttc: "Total incl. VAT", sep: " : " },
  zh: { quote: "报价单", invoice: "发票", from: "开票方", billTo: "客户", yourBiz: "您的企业", site: "工地", job: "施工日期", to: " 至 ", valid: "有效期至", due: "付款截止日", terms: "条款", wm: "TRADEQUOTE 免费版", genPro: "由 TradeQuote Pro 生成", genFree: "由 TradeQuote 免费版生成 – tradequote.faitle.net", vat: "增值税", net: "不含税金额", subHT: "不含税小计", ttc: "含税总计", sep: "：" },
  ar: { quote: "عرض سعر", invoice: "فاتورة", from: "من", billTo: "العميل", yourBiz: "شركتك", site: "موقع العمل", job: "تاريخ العمل", to: " إلى ", valid: "صالح حتى", due: "تاريخ الاستحقاق", terms: "الشروط", wm: "TRADEQUOTE FREE", genPro: "أُنشئ باستخدام TradeQuote Pro", genFree: "أُنشئ باستخدام TradeQuote المجاني – tradequote.faitle.net", vat: "ض.ق.م", net: "المبلغ دون الضريبة", subHT: "المجموع الفرعي دون الضريبة", ttc: "الإجمالي شامل الضريبة", sep: ": " },
} as const;

export function pdfFileName(a: Pick<PdfArgs, "lang" | "docType" | "meta">): string {
  const fr = a.lang === "fr";
  const safe = a.meta.number.replace(/[\\/:*?"<>|]+/g, "-");
  return `${fr ? (a.docType === "quote" ? "soumission" : "facture") : a.docType}-${safe}.pdf`;
}

/* ───── Embedded fonts for Chinese and Arabic (jsPDF core fonts only cover Latin). ─────
 * public/fonts/tq-zh.ttf: Noto Sans SC subset (GB2312 characters + Latin), public/fonts/tq-ar.ttf: Noto Sans Arabic
 * + Noto Sans Latin (SIL Open Font License, public/fonts/OFL.txt). Built by scripts/build-fonts.py. jsPDF embeds
 * only the glyphs used in each PDF (font subset). Loaded on demand, only for zh / ar documents. */
const FONT_NAME: Record<PdfLang, string> = { fr: "helvetica", en: "helvetica", zh: "TQZH", ar: "TQAR" };
const fontCache: Partial<Record<PdfLang, Promise<string>>> = {};
const fontData: Partial<Record<PdfLang, string>> = {};
export const needsFont = (l: PdfLang) => l === "zh" || l === "ar";

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
  return btoa(bin);
}
/** Loads (once) the font needed by a zh / ar PDF. Resolves immediately for fr / en. */
export function ensurePdfFont(l: PdfLang): Promise<void> {
  if (!needsFont(l) || fontData[l]) return Promise.resolve();
  if (!fontCache[l]) {
    fontCache[l] = fetch(`/fonts/tq-${l}.ttf`).then((r) => { if (!r.ok) throw new Error("font"); return r.arrayBuffer(); }).then(toBase64);
    fontCache[l]!.then((b) => { fontData[l] = b; }, () => { delete fontCache[l]; });
  }
  return fontCache[l]!.then(() => undefined);
}
/** For tests / Node: provide the font bytes directly (base64). */
export function setPdfFont(l: PdfLang, base64: string) { fontData[l] = base64; }

/** Downloads the PDF (unchanged behaviour for fr / en). */
export async function generateTradeQuotePDF(a: PdfArgs) {
  await ensurePdfFont(a.lang);
  buildTradeQuotePDF(a).save(pdfFileName(a));
}

/** Builds the PDF as a File (for the Web Share API). */
export async function tradeQuotePdfFile(a: PdfArgs): Promise<File> {
  await ensurePdfFont(a.lang);
  const blob = buildTradeQuotePDF(a).output("blob");
  return new File([blob], pdfFileName(a), { type: "application/pdf" });
}

const AR = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
/** jsPDF bidi options for a right-to-left paragraph (logical input, visual output, mirrored brackets). */
/** A left-to-right run inside an Arabic line: Latin letters, digits, amounts, dates, ids, e-mails. */
const LTR_RUN = /[($€#A-Za-z0-9][^\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]*[A-Za-z0-9)$€%]|[A-Za-z0-9]/g;
const RTL_OPTS = { isInputVisual: false, isOutputVisual: true, isInputRtl: true, isOutputRtl: false, isSymmetricSwapping: true };

export function buildTradeQuotePDF(a: PdfArgs): jsPDF {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const primary: [number, number, number] = [37, 99, 235];
  const lang = a.lang;
  const fr = lang === "fr";
  const rtl = lang === "ar";
  const S = W[lang];
  const F = FONT_NAME[lang];
  if (needsFont(lang)) {
    const data = fontData[lang];
    if (!data) throw new Error("PDF font not loaded");
    doc.addFileToVFS(`${F}.ttf`, data);
    doc.addFont(`${F}.ttf`, F, "normal");
    doc.addFont(`${F}.ttf`, F, "bold");
  }
  if (rtl) {
    // Arabic: shaping is done by jsPDF; strings containing Arabic are laid out right-to-left. Multi-line text is
    // drawn line by line so Latin-only lines (names, emails, numbers) keep their left-to-right order.
    const orig = doc.text.bind(doc) as (t: string | string[], x: number, y: number, o?: Record<string, unknown>) => jsPDF;
    // A line mixing Arabic with Latin / digits ("صالح حتى: 2026-11-02", "RBQ …", amounts, tax ids) is split into
    // runs: Arabic runs are shaped right-to-left, Latin / number runs are drawn as-is (so dates, amounts and ids keep
    // their order), and the runs are placed right to left in logical order.
    const line = (s: string, x: number, y: number, o?: Record<string, unknown>) => {
      if (!AR.test(s)) return orig(s, x, y, o);
      const parts: [string, boolean][] = [];
      let last = 0;
      for (const m of Array.from(s.matchAll(LTR_RUN))) {
        if ((m.index ?? 0) > last) parts.push([s.slice(last, m.index), true]);
        parts.push([m[0], false]);
        last = (m.index ?? 0) + m[0].length;
      }
      if (last < s.length) parts.push([s.slice(last), true]);
      if (parts.length < 2) return orig(s, x, y, { ...o, ...RTL_OPTS });
      const widths = parts.map(([t]) => doc.getTextWidth(t));
      const total = widths.reduce((a, b) => a + b, 0);
      const al = (o?.align as string) || "left";
      let right = al === "right" ? x : al === "center" ? x + total / 2 : x + total;
      parts.forEach(([t, ar], i) => { orig(t, right, y, { ...o, align: "right", ...(ar ? RTL_OPTS : {}) }); right -= widths[i]; });
      return doc;
    };
    const patched = (t: string | string[], x: number, y: number, o?: Record<string, unknown>) => {
      const lines = Array.isArray(t) ? t : [t];
      const lh = doc.getLineHeight() / doc.internal.scaleFactor;
      lines.forEach((ln, i) => line(ln ?? "", x, y + i * lh, o));
      return doc;
    };
    (doc as unknown as { text: typeof patched }).text = patched;
  }
  /** Text helper: unchanged for fr / en / zh; mirrored (x and alignment) for Arabic. */
  const T = (s: string | string[], x: number, y: number, o?: { align?: "left" | "right" | "center"; angle?: number }) => {
    if (!rtl) return o ? doc.text(s, x, y, o) : doc.text(s, x, y);
    const al = o?.align === "right" ? "left" : o?.align === "center" ? "center" : "right";
    return doc.text(s, o?.align === "center" ? x : w - x, y, { ...o, align: al });
  };
  const setFont = (style: "normal" | "bold") => doc.setFont(F, style);
  const region = a.region || DEFAULT_REGION;
  const preset = presetOf(a.taxPreset || "");
  const vat = !!preset?.vat;
  // jsPDF core fonts are WinAnsi: replace the narrow no-break spaces used by fr number formatting.
  const formatMoney = (n: number) => regionMoney(n, region, lang).replace(/[\u202f\u00a0]/g, " ");
  const fd = (d: string) => formatDate(d, region);
  // RBQ licence: Québec only (elsewhere the optional licence is printed with the registration lines).
  const rbq = isQuebec(region) ? rbqLine(a.company.rbq || "", lang) : "";
  const subtotalLabel = vat ? S.subHT : a.labels.subtotal;
  const totalLabel = vat ? S.ttc : a.labels.total;

  const title = a.docType === "quote" ? S.quote : S.invoice;

  doc.setFillColor(...primary);
  doc.rect(0, 0, w, 26, "F");
  let titleX = 14;
  if (a.logo) {
    try {
      const box = fitLogo(a.logo, 44, 18);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(rtl ? w - 10 - (box.w + 4) : 10, 4, box.w + 4, box.h + 2, 1.5, 1.5, "F");
      doc.addImage(a.logo.dataUrl, logoFormat(a.logo), rtl ? w - 12 - box.w : 12, 5, box.w, box.h, undefined, "FAST");
      titleX = 10 + box.w + 4 + 6;
    } catch { /* unreadable image: PDF without logo */ }
  }
  doc.setTextColor(255);
  setFont("bold");
  doc.setFontSize(16);
  T(title, titleX, 17);
  doc.setFontSize(9);
  setFont("normal");
  T(`# ${a.meta.number}`, w - 14, 12, { align: "right" });
  T(fd(a.meta.date), w - 14, 18, { align: "right" });
  if (rbq) {
    setFont("bold");
    T(rbq, w - 14, 24, { align: "right" });
    setFont("normal");
  }

  let y = 36;
  doc.setTextColor(100);
  doc.setFontSize(8);
  setFont("bold");
  T(S.from, 14, y);
  T(S.billTo, w / 2 + 4, y);
  y += 6;
  doc.setFontSize(11);
  doc.setTextColor(20);
  setFont("bold");
  T(a.company.name || S.yourBiz, 14, y);
  T(a.client.name || "Client", w / 2 + 4, y);
  y += 5;
  setFont("normal");
  doc.setFontSize(8);
  doc.setTextColor(70);
  const sep = S.sep;
  const left = [
    rbq,
    a.company.address,
    a.company.city,
    a.company.email,
    a.company.phone,
    ...registrationLines(a.company, region, lang),
  ].filter(Boolean) as string[];
  const right = [
    a.client.address,
    a.client.city,
    a.client.email,
    a.client.phone || "",
    a.jobSite ? `${S.site}${sep}${a.jobSite}` : "",
    a.jobDate
      ? `${S.job}${sep}${fd(a.jobDate)}${a.jobEndDate && a.jobEndDate > a.jobDate ? S.to + fd(a.jobEndDate) : ""}`
      : "",
    a.meta.due
      ? a.docType === "quote"
        ? `${S.valid}${sep}${fd(a.meta.due)}`
        : `${S.due}${sep}${fd(a.meta.due)}`
      : "",
  ].filter(Boolean) as string[];
  left.forEach((l, i) => {
    // RBQ licence line printed in bold, as required on every quote/invoice
    setFont(rbq && i === 0 ? "bold" : "normal");
    T(l, 14, y + i * 4);
  });
  setFont("normal");
  right.forEach((l, i) => T(l, w / 2 + 4, y + i * 4));

  const startY = Math.max(y + left.length * 4, y + right.length * 4) + 8;
  type Cell = { cellWidth: number; halign?: "left" | "center" | "right" };
  const head = vat
    ? [a.labels.description, a.labels.qty, S.vat, a.labels.rate, S.net]
    : [a.labels.description, a.labels.qty, a.labels.rate, a.labels.subtotal];
  const body = printableItems(a.items).map((i) =>
    vat
      ? [i.description || "—", String(i.quantity), formatRate(lineVatRate(a.taxPreset || "", i.vatRate, a.docVat), lang), formatMoney(i.unitPrice), formatMoney(i.quantity * i.unitPrice)]
      : [i.description || "—", String(i.quantity), formatMoney(i.unitPrice), formatMoney(i.quantity * i.unitPrice)]
  );
  const cols: Cell[] = vat
    ? [{ cellWidth: 76 }, { cellWidth: 16, halign: "center" }, { cellWidth: 18, halign: "center" }, { cellWidth: 31, halign: "right" }, { cellWidth: 31, halign: "right" }]
    : [{ cellWidth: 90 }, { cellWidth: 18, halign: "center" }, { cellWidth: 32, halign: "right" }, { cellWidth: 32, halign: "right" }];
  // Arabic: columns in right-to-left order, text aligned to the right.
  const flip = (c: Cell): Cell => ({ ...c, halign: c.halign === "center" ? "center" : c.halign === "right" ? "left" : "right" });
  const order = rtl ? cols.map((_, k) => cols.length - 1 - k) : cols.map((_, k) => k);
  const columnStyles: Record<number, Cell> = {};
  order.forEach((src, k) => { columnStyles[k] = rtl ? flip(cols[src]) : cols[src]; });
  const fontStyles = needsFont(lang) ? { font: F } : {};
  autoTable(doc, {
    startY,
    head: [order.map((k) => head[k])],
    body: body.map((r) => order.map((k) => r[k])),
    theme: "striped",
    headStyles: { fillColor: primary, textColor: 255, fontStyle: "bold", fontSize: 9, ...fontStyles, ...(rtl ? { halign: "right" } : {}) },
    bodyStyles: { fontSize: 9, ...fontStyles },
    columnStyles,
    margin: { left: 14, right: 14 },
  });

  let fy = (doc as any).lastAutoTable.finalY + 8;
  if (needsFont(lang)) setFont("normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  T(subtotalLabel, w - 70, fy);
  T(formatMoney(a.subtotal), w - 14, fy, { align: "right" });
  if (a.discountPct > 0) {
    fy += 5;
    T(`${a.labels.discount} (${a.discountPct}%)`, w - 70, fy);
    T(`-${formatMoney(a.discountAmount)}`, w - 14, fy, { align: "right" });
  }
  a.taxLines.forEach((line) => {
    fy += 5;
    T(`${line.label} (${formatRate(line.rate, lang)})`, w - 70, fy);
    T(formatMoney(line.amount), w - 14, fy, { align: "right" });
  });
  fy += 6;
  setFont("bold");
  doc.setFontSize(11);
  doc.setTextColor(...primary);
  T(totalLabel, w - 70, fy);
  T(formatMoney(a.total), w - 14, fy, { align: "right" });
  if (preset?.mention) {
    // e.g. French VAT franchise: "TVA non applicable, art. 293 B du CGI".
    fy += 6;
    setFont("bold");
    doc.setFontSize(8);
    doc.setTextColor(30);
    const m = doc.splitTextToSize(presetMention(preset.mention, lang), 110) as string[];
    T(m, w - 14, fy, { align: "right" });
    fy += (m.length - 1) * 4;
  }
  if (a.depositPct > 0) {
    fy += 6;
    setFont("normal");
    doc.setFontSize(9);
    doc.setTextColor(80);
    T(`${a.labels.depositAmt} (${a.depositPct}%)`, w - 70, fy);
    T(formatMoney(a.depositAmt), w - 14, fy, { align: "right" });
    fy += 5;
    setFont("bold");
    T(a.labels.balance, w - 70, fy);
    T(formatMoney(a.balance), w - 14, fy, { align: "right" });
  }
  fy += 12;
  if (a.company.interac) {
    setFont("bold");
    doc.setFontSize(8);
    doc.setTextColor(30);
    const pl = paymentLabel(region, lang);
    T(pl, 14, fy);
    setFont("normal");
    T(a.company.interac, region.country === "CA" && !needsFont(lang) ? 52 : 14 + doc.getTextWidth(pl) + 3, fy);
    fy += 6;
  }
  if (a.meta.notes) {
    setFont("bold");
    doc.setFontSize(8);
    doc.setTextColor(100);
    T(S.terms, 14, fy);
    setFont("normal");
    doc.setTextColor(60);
    T(doc.splitTextToSize(a.meta.notes, w - 28), 14, fy + 4);
  }
  if (a.plan === "free") {
    doc.setFontSize(32);
    doc.setTextColor(230);
    setFont("bold");
    doc.text(S.wm, w / 2, 150, { align: "center", angle: 25 });
  }
  doc.setFontSize(7);
  doc.setTextColor(150);
  setFont("normal");
  T(a.plan === "pro" ? S.genPro : S.genFree, w / 2, 287, { align: "center" });
  return doc;
}

function presetMention(m: { en: string; zh?: string; ar?: string; fr: string }, lang: PdfLang): string {
  return m[lang] ?? m.en;
}
