/**
 * Sales-tax and VAT presets (Canada, United States, France, Belgium, Switzerland).
 * Rates and official sources: docs/REGIONS.md.
 *
 * Each preset is made of one or more components (e.g. Québec = TPS 5 % + TVQ 9,975 %).
 * Since 2013 the QST/TVQ is computed on the selling price excluding GST/TPS (no tax on tax),
 * and each tax is rounded to the cent separately, which is how it must appear on an invoice.
 */
export type TaxLang = "en" | "fr" | "es" | "zh" | "ar";
/** en / fr / es required; zh / ar optional (fall back to English abbreviations such as GST, HST, PST). */
type L10n = Record<"en" | "fr" | "es", string> & { zh?: string; ar?: string };
const pick = (l: L10n, lang: TaxLang) => l[lang] ?? l.en;

export interface TaxComponent {
  code: string;
  label: L10n;
  rate: number; // percent
}

export interface TaxPreset {
  id: string;
  label: L10n;
  components: TaxComponent[];
  /** VAT presets: rates selectable per line (or for the whole document); tax computed per rate. */
  vat?: { rates: number[]; default: number };
  /** Mention printed on the document (e.g. French VAT franchise). */
  mention?: L10n;
}

const GST: TaxComponent = { code: "gst", label: { en: "GST", fr: "TPS", es: "GST" }, rate: 5 };
const HST = (rate: number): TaxComponent => ({
  code: "hst",
  label: { en: "HST", fr: "TVH", es: "HST" },
  rate,
});

export const TAX_PRESETS: TaxPreset[] = [
  {
    id: "gst-qst-qc",
    label: {
      en: "Québec — GST 5% + QST 9.975%",
      fr: "Québec — TPS 5 % + TVQ 9,975 %",
      es: "Quebec — GST 5% + QST 9,975%",
    },
    components: [GST, { code: "qst", label: { en: "QST", fr: "TVQ", es: "QST" }, rate: 9.975 }],
  },
  {
    id: "gst",
    label: { en: "GST 5% only (AB, territories)", fr: "TPS 5 % seulement (AB, territoires)", es: "Solo GST 5%" },
    components: [GST],
  },
  {
    id: "hst-on",
    label: { en: "Ontario — HST 13%", fr: "Ontario — TVH 13 %", es: "Ontario — HST 13%" },
    components: [HST(13)],
  },
  {
    id: "hst-ns",
    label: { en: "Nova Scotia — HST 14%", fr: "Nouvelle-Écosse — TVH 14 %", es: "Nova Scotia — HST 14%" },
    components: [HST(14)],
  },
  {
    // Nova Scotia moved to 14 % on April 1, 2025 (hst-ns above).
    id: "hst-nb",
    label: {
      en: "HST 15% (NB/NL/PE)",
      fr: "TVH 15 % (N.-B./T.-N.-L./Î.-P.-É.)",
      es: "HST 15% (NB/NL/PE)",
    },
    components: [HST(15)],
  },
  {
    id: "gst-pst-bc",
    label: { en: "BC — GST 5% + PST 7%", fr: "C.-B. — TPS 5 % + TVP 7 %", es: "BC — GST 5% + PST 7%" },
    components: [GST, { code: "pst", label: { en: "PST", fr: "TVP", es: "PST" }, rate: 7 }],
  },
  {
    id: "gst-pst-sk",
    label: { en: "SK — GST 5% + PST 6%", fr: "Sask. — TPS 5 % + TVP 6 %", es: "SK — GST 5% + PST 6%" },
    components: [GST, { code: "pst", label: { en: "PST", fr: "TVP", es: "PST" }, rate: 6 }],
  },
  {
    id: "gst-rst-mb",
    label: { en: "MB — GST 5% + RST 7%", fr: "Man. — TPS 5 % + TVD 7 %", es: "MB — GST 5% + RST 7%" },
    components: [GST, { code: "rst", label: { en: "RST", fr: "TVD", es: "RST" }, rate: 7 }],
  },
  {
    // United States: state sales tax entered by the user (customRate) + optional local tax (localRate).
    id: "us-sales",
    label: { en: "Sales tax (rate you enter)", fr: "Taxe de vente (taux saisi)", es: "Sales tax" },
    components: [],
  },
  {
    id: "fr-tva",
    label: { en: "France — VAT 20 / 10 / 5.5%", fr: "France — TVA 20 / 10 / 5,5 %", es: "Francia — IVA 20 / 10 / 5,5%" },
    components: [],
    vat: { rates: [20, 10, 5.5], default: 20 },
  },
  {
    id: "fr-franchise-293b",
    label: { en: "France — VAT franchise (art. 293 B CGI)", fr: "France — Franchise en base de TVA (art. 293 B du CGI)", es: "Francia — franquicia IVA" },
    components: [],
    mention: { en: "VAT not applicable, art. 293 B of the French CGI (TVA non applicable, art. 293 B du CGI)", fr: "TVA non applicable, art. 293 B du CGI", es: "TVA non applicable, art. 293 B du CGI", zh: "TVA non applicable, art. 293 B du CGI（免征增值税）", ar: "TVA non applicable, art. 293 B du CGI" },
  },
  {
    id: "fr-franchise-cibs",
    label: { en: "France — VAT franchise (CIBS wording)", fr: "France — Franchise en base de TVA (mention CIBS)", es: "Francia — franquicia IVA (CIBS)" },
    components: [],
    mention: {
      en: "VAT not applicable, art. L. 223 et seq. of the CIBS (TVA non applicable, art. L. 223 et s. du CIBS)",
      fr: "TVA non applicable, art. L. 223 et s. du code des impositions sur les biens et services (CIBS)",
      es: "TVA non applicable, art. L. 223 et s. du CIBS",
      zh: "TVA non applicable, art. L. 223 et s. du code des impositions sur les biens et services (CIBS)（免征增值税）",
      ar: "TVA non applicable, art. L. 223 et s. du code des impositions sur les biens et services (CIBS)",
    },
  },
  {
    id: "be-tva",
    label: { en: "Belgium — VAT 21 / 12 / 6%", fr: "Belgique — TVA 21 / 12 / 6 %", es: "Bélgica — IVA 21 / 12 / 6%" },
    components: [],
    vat: { rates: [21, 12, 6], default: 21 },
  },
  {
    id: "ch-tva",
    label: { en: "Switzerland — VAT 8.1 / 2.6 / 3.8%", fr: "Suisse — TVA 8,1 / 2,6 / 3,8 %", es: "Suiza — IVA 8,1 / 2,6 / 3,8%" },
    components: [],
    vat: { rates: [8.1, 2.6, 3.8], default: 8.1 },
  },
  { id: "none", label: { en: "No tax", fr: "Aucune taxe", es: "Sin impuesto" }, components: [] },
  { id: "custom", label: { en: "Custom rate", fr: "Taux personnalisé", es: "Tasa personalizada" }, components: [] },
];

/** Default for the Québec market. */
export const DEFAULT_TAX_PRESET = "gst-qst-qc";

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface TaxLine {
  code: string;
  label: string;
  rate: number;
  amount: number;
  /** VAT lines: taxable base at this rate (after discount). */
  base?: number;
}

export interface TaxResult {
  lines: TaxLine[];
  totalTax: number;
  total: number;
}

/** Compute each tax separately on the taxable amount (rounded to the cent). */
export function computeTaxes(
  taxable: number,
  presetId: string,
  lang: TaxLang = "fr",
  customRate = 0,
  localRate = 0
): TaxResult {
  const base = round2(Math.max(0, Number(taxable) || 0));
  let components: TaxComponent[];
  const vatPreset = TAX_PRESETS.find((p) => p.id === presetId && p.vat);
  if (vatPreset?.vat) {
    components = [{ code: "vat", label: VAT_LABEL, rate: vatPreset.vat.default }];
  } else if (presetId === "us-sales") {
    components = [
      customRate > 0 && { code: "sales", label: { en: "Sales tax", fr: "Taxe de vente", es: "Sales tax", zh: "销售税", ar: "ضريبة المبيعات" }, rate: customRate },
      localRate > 0 && { code: "local", label: { en: "Local tax", fr: "Taxe locale", es: "Local tax", zh: "地方税", ar: "الضريبة المحلية" }, rate: localRate },
    ].filter(Boolean) as TaxComponent[];
  } else if (presetId === "custom") {
    components = customRate > 0
      ? [{ code: "custom", label: { en: "Tax", fr: "Taxe", es: "Impuesto", zh: "税", ar: "ضريبة" }, rate: customRate }]
      : [];
  } else {
    const preset = TAX_PRESETS.find((p) => p.id === presetId);
    components = preset ? preset.components : [];
  }
  const lines = components.map((c) => ({
    code: c.code,
    label: pick(c.label, lang),
    rate: c.rate,
    amount: round2((base * c.rate) / 100),
  }));
  const totalTax = round2(lines.reduce((s, l) => s + l.amount, 0));
  return { lines, totalTax, total: round2(base + totalTax) };
}

const VAT_LABEL: L10n = { en: "VAT", fr: "TVA", es: "IVA", zh: "增值税", ar: "ض.ق.م" };

/** Preset names in Chinese and Arabic (menu only; amounts and rules are the same). */
const PRESET_X: Record<string, { zh: string; ar: string }> = {
  "gst-qst-qc": { zh: "魁北克 — GST 5% + QST 9.975%", ar: "كيبيك — GST 5% + QST 9.975%" },
  gst: { zh: "仅 GST 5%（AB 及各地区）", ar: "GST 5% فقط (ألبرتا والأقاليم)" },
  "hst-on": { zh: "安大略 — HST 13%", ar: "أونتاريو — HST 13%" },
  "hst-ns": { zh: "新斯科舍 — HST 14%", ar: "نوفا سكوشا — HST 14%" },
  "hst-nb": { zh: "HST 15%（NB/NL/PE）", ar: "HST 15% (NB/NL/PE)" },
  "gst-pst-bc": { zh: "不列颠哥伦比亚 — GST 5% + PST 7%", ar: "كولومبيا البريطانية — GST 5% + PST 7%" },
  "gst-pst-sk": { zh: "萨斯喀彻温 — GST 5% + PST 6%", ar: "ساسكاتشوان — GST 5% + PST 6%" },
  "gst-rst-mb": { zh: "曼尼托巴 — GST 5% + RST 7%", ar: "مانيتوبا — GST 5% + RST 7%" },
  "us-sales": { zh: "销售税（自行输入税率）", ar: "ضريبة المبيعات (نسبة تدخلها)" },
  "fr-tva": { zh: "法国 — 增值税 20 / 10 / 5.5%", ar: "فرنسا — ض.ق.م 20 / 10 / 5.5%" },
  "fr-franchise-293b": { zh: "法国 — 增值税起征点免税（CGI 第 293 B 条）", ar: "فرنسا — إعفاء من ض.ق.م (المادة 293 B من CGI)" },
  "fr-franchise-cibs": { zh: "法国 — 增值税起征点免税（CIBS 表述）", ar: "فرنسا — إعفاء من ض.ق.م (صيغة CIBS)" },
  "be-tva": { zh: "比利时 — 增值税 21 / 12 / 6%", ar: "بلجيكا — ض.ق.م 21 / 12 / 6%" },
  "ch-tva": { zh: "瑞士 — 增值税 8.1 / 2.6 / 3.8%", ar: "سويسرا — ض.ق.م 8.1 / 2.6 / 3.8%" },
  none: { zh: "不含税", ar: "بدون ضريبة" },
  custom: { zh: "自定义税率", ar: "نسبة مخصصة" },
};
/** Preset name in the menu language. */
export function presetLabelOf(p: TaxPreset, lang: TaxLang): string {
  if (lang === "zh" || lang === "ar") return PRESET_X[p.id]?.[lang] ?? p.label.en;
  return p.label[lang];
}

export const presetOf = (id: string) => TAX_PRESETS.find((p) => p.id === id);
/** A VAT rate valid for the preset (else undefined). */
export function vatRateOf(presetId: string, rate: unknown): number | undefined {
  const v = presetOf(presetId)?.vat;
  return v && typeof rate === "number" && v.rates.includes(rate) ? rate : undefined;
}
/** VAT rate applied to a line: its own rate, else the document rate, else the preset default. */
export function lineVatRate(presetId: string, lineRate?: number, docRate?: number): number {
  const v = presetOf(presetId)?.vat;
  return vatRateOf(presetId, lineRate) ?? vatRateOf(presetId, docRate) ?? v?.default ?? 0;
}

/**
 * Taxes for a whole document. Sales-tax presets: computeTaxes on the taxable amount.
 * VAT presets: lines grouped by rate; the document discount is applied to each group in proportion,
 * each base is rounded to the cent, then the VAT of each rate is rounded to the cent.
 */
export function computeDocTaxes(
  items: { quantity: number; unitPrice: number; vatRate?: number }[],
  taxable: number,
  presetId: string,
  lang: TaxLang = "fr",
  customRate = 0,
  localRate = 0,
  docVat?: number
): TaxResult {
  const p = presetOf(presetId);
  if (!p?.vat) return computeTaxes(taxable, presetId, lang, customRate, localRate);
  const t = round2(Math.max(0, Number(taxable) || 0));
  const gross = new Map<number, number>();
  let subtotal = 0;
  for (const it of items) {
    const amt = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
    subtotal += amt;
    const r = lineVatRate(presetId, it.vatRate, docVat);
    gross.set(r, (gross.get(r) || 0) + amt);
  }
  const ratio = subtotal > 0 ? t / subtotal : 0;
  const lines: TaxLine[] = Array.from(gross.entries())
    .filter(([, g]) => g > 0)
    .sort((a, b) => b[0] - a[0])
    .map(([rate, g]) => {
      const base = round2(g * ratio);
      return { code: "vat", label: pick(VAT_LABEL, lang), rate, amount: round2((base * rate) / 100), base };
    });
  const totalTax = round2(lines.reduce((s, l) => s + l.amount, 0));
  return { lines, totalTax, total: round2(t + totalTax) };
}

/** "9.975" -> "9,975" in French. */
export function formatRate(rate: number, lang: TaxLang = "fr"): string {
  const s = String(rate);
  return lang === "fr" || lang === "es" ? `${s.replace(".", ",")} %` : `${s}%`;
}
