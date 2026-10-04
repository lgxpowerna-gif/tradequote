/**
 * Business region (country + province/state): pure helpers, unit-tested in scripts/test.mjs.
 *
 * Québec is the default and its experience is unchanged (TPS + TVQ, RBQ licence, French, ISO dates,
 * CAD). Other regions get their own taxes (lib/tax.ts presets), registration-number fields, licence
 * hint, currency, date format and default language. Old data without a region counts as Québec.
 * Rates and sources: docs/REGIONS.md.
 */
export type Country = "CA" | "US" | "FR" | "BE" | "CH";
export type Region = { country: Country; sub: string };
export type RLang = "fr" | "en" | "zh" | "ar";
/** fr / en required; zh / ar optional (fall back to English). */
type L10n = { fr: string; en: string; zh?: string; ar?: string };
/** Label in the wanted language (Chinese / Arabic fall back to English). */
export const lab = (l: L10n, lang: RLang) => l[lang] ?? l.en;

export const REGION_KEY = "tq_region";
export const DEFAULT_REGION: Region = { country: "CA", sub: "QC" };

export const COUNTRIES: { code: Country; label: L10n; currency: "CAD" | "USD" | "EUR" | "CHF" }[] = [
  { code: "CA", label: { fr: "Canada", en: "Canada", zh: "加拿大", ar: "كندا" }, currency: "CAD" },
  { code: "US", label: { fr: "États-Unis", en: "United States", zh: "美国", ar: "الولايات المتحدة" }, currency: "USD" },
  { code: "FR", label: { fr: "France", en: "France", zh: "法国", ar: "فرنسا" }, currency: "EUR" },
  { code: "BE", label: { fr: "Belgique", en: "Belgium", zh: "比利时", ar: "بلجيكا" }, currency: "EUR" },
  { code: "CH", label: { fr: "Suisse", en: "Switzerland", zh: "瑞士", ar: "سويسرا" }, currency: "CHF" },
];

export const CA_PROVINCES: { code: string; label: L10n }[] = [
  { code: "QC", label: { fr: "Québec", en: "Quebec", zh: "魁北克", ar: "كيبيك" } },
  { code: "ON", label: { fr: "Ontario", en: "Ontario", zh: "安大略", ar: "أونتاريو" } },
  { code: "BC", label: { fr: "Colombie-Britannique", en: "British Columbia", zh: "不列颠哥伦比亚", ar: "كولومبيا البريطانية" } },
  { code: "AB", label: { fr: "Alberta", en: "Alberta", zh: "艾伯塔", ar: "ألبرتا" } },
  { code: "MB", label: { fr: "Manitoba", en: "Manitoba", zh: "曼尼托巴", ar: "مانيتوبا" } },
  { code: "SK", label: { fr: "Saskatchewan", en: "Saskatchewan", zh: "萨斯喀彻温", ar: "ساسكاتشوان" } },
  { code: "NB", label: { fr: "Nouveau-Brunswick", en: "New Brunswick", zh: "新不伦瑞克", ar: "نيو برونزويك" } },
  { code: "NS", label: { fr: "Nouvelle-Écosse", en: "Nova Scotia", zh: "新斯科舍", ar: "نوفا سكوشا" } },
  { code: "PE", label: { fr: "Île-du-Prince-Édouard", en: "Prince Edward Island", zh: "爱德华王子岛", ar: "جزيرة الأمير إدوارد" } },
  { code: "NL", label: { fr: "Terre-Neuve-et-Labrador", en: "Newfoundland and Labrador", zh: "纽芬兰与拉布拉多", ar: "نيوفاوندلاند ولابرادور" } },
  { code: "YT", label: { fr: "Yukon", en: "Yukon", zh: "育空", ar: "يوكون" } },
  { code: "NT", label: { fr: "Territoires du Nord-Ouest", en: "Northwest Territories", zh: "西北地区", ar: "الأقاليم الشمالية الغربية" } },
  { code: "NU", label: { fr: "Nunavut", en: "Nunavut", zh: "努纳武特", ar: "نونافوت" } },
];

const STATES: [string, string][] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"],
  ["DE", "Delaware"], ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"],
  ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"],
  ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"],
  ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"], ["NC", "North Carolina"],
  ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"],
  ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"],
  ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
];
export const US_STATES: { code: string; label: L10n }[] = STATES.map(([code, name]) => ({ code, label: { fr: name, en: name } }));

/** Province/state list for a country (empty for FR, BE, CH). */
export const subdivisions = (c: Country) => (c === "CA" ? CA_PROVINCES : c === "US" ? US_STATES : []);

export function sanitizeRegion(v: unknown): Region {
  if (!v || typeof v !== "object" || Array.isArray(v)) return { ...DEFAULT_REGION };
  const o = v as Record<string, unknown>;
  const c = COUNTRIES.find((x) => x.code === o.country)?.code;
  if (!c) return { ...DEFAULT_REGION };
  const subs = subdivisions(c);
  if (!subs.length) return { country: c, sub: "" };
  const sub = typeof o.sub === "string" && subs.some((s) => s.code === o.sub) ? o.sub : c === "CA" ? "QC" : "";
  return { country: c, sub };
}

export const isQuebec = (r: Region) => r.country === "CA" && r.sub === "QC";
export const sameRegion = (a: Region, b: Region) => a.country === b.country && a.sub === b.sub;
export const currencyOf = (r: Region) => COUNTRIES.find((c) => c.code === r.country)?.currency ?? "CAD";
/** Québec, France, Belgium and Switzerland default to French; the rest of Canada and the US to English. */
export const defaultLang = (r: Region): RLang => (isQuebec(r) || r.country === "FR" || r.country === "BE" || r.country === "CH" ? "fr" : "en");
/** Uses VAT (TVA) per line instead of sales taxes. */
export const isVatCountry = (r: Region) => r.country === "FR" || r.country === "BE" || r.country === "CH";

/** Intl locale for numbers and currency. */
export function numberLocale(r: Region, lang: RLang): string {
  if (lang === "zh") return "zh-CN";
  // Arabic: Western digits and the English formats keep amounts and numbers readable (and LTR).
  if (lang === "ar") return numberLocale(r, "en");
  if (r.country === "CA") return lang === "fr" ? "fr-CA" : "en-CA";
  if (r.country === "US") return lang === "fr" ? "fr-CA" : "en-US";
  if (lang === "en") return r.country === "CH" ? "en-CH" : "en-IE";
  return r.country === "FR" ? "fr-FR" : r.country === "BE" ? "fr-BE" : "fr-CH";
}

/** Money formatted for the region (no-break spaces kept; the PDF replaces them). */
export function formatMoney(n: number, r: Region, lang: RLang): string {
  return new Intl.NumberFormat(numberLocale(r, lang), { style: "currency", currency: currencyOf(r) }).format(n);
}

/** YYYY-MM-DD as printed: unchanged (ISO) in Canada, MM/DD/YYYY in the US, DD/MM/YYYY in France and Belgium, DD.MM.YYYY in Switzerland. */
export function formatDate(ymd: string, r: Region): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || "");
  if (!m || r.country === "CA") return ymd;
  const [, y, mo, d] = m;
  if (r.country === "US") return `${mo}/${d}/${y}`;
  if (r.country === "CH") return `${d}.${mo}.${y}`;
  return `${d}/${mo}/${y}`;
}

/** Default tax preset (lib/tax.ts) for the region. */
export function defaultTaxPreset(r: Region): string {
  switch (r.country) {
    case "US": return "us-sales";
    case "FR": return "fr-tva";
    case "BE": return "be-tva";
    case "CH": return "ch-tva";
  }
  switch (r.sub) {
    case "QC": return "gst-qst-qc";
    case "ON": return "hst-on";
    case "NS": return "hst-ns";
    case "NB": case "NL": case "PE": return "hst-nb";
    case "BC": return "gst-pst-bc";
    case "SK": return "gst-pst-sk";
    case "MB": return "gst-rst-mb";
    default: return "gst";
  }
}

const CA_PRESETS = ["gst-qst-qc", "gst", "hst-on", "hst-ns", "hst-nb", "gst-pst-bc", "gst-pst-sk", "gst-rst-mb", "none", "custom"];
/** Presets offered in the tax menu for the region (Canada: all Canadian ones, the region's first). */
export function taxPresetsFor(r: Region): string[] {
  if (r.country === "US") return ["us-sales", "none"];
  if (r.country === "FR") return ["fr-tva", "fr-franchise-293b", "fr-franchise-cibs", "none"];
  if (r.country === "BE") return ["be-tva", "none"];
  if (r.country === "CH") return ["ch-tva", "none"];
  const d = defaultTaxPreset(r);
  return [d, ...CA_PRESETS.filter((p) => p !== d)];
}

export function regionLabel(r: Region, lang: RLang): string {
  const c = COUNTRIES.find((x) => x.code === r.country);
  const s = subdivisions(r.country).find((x) => x.code === r.sub);
  return [s && lab(s.label, lang), c && lab(c.label, lang)].filter(Boolean).join(lang === "zh" ? "，" : lang === "ar" ? "، " : ", ");
}

/** Business fields shown for the region, after name / address / city / email / phone. */
export type BizField = "bn" | "gst" | "qst" | "pst" | "rbq" | "licence" | "regNo" | "vatNo" | "interac";
export type FieldInfo = { key: BizField; label: string; hint?: string };

const PST_LABEL: Record<string, L10n> = {
  BC: { fr: "N° TVP (C.-B.)", en: "BC PST number" },
  SK: { fr: "N° TVP (Sask.)", en: "SK PST number" },
  MB: { fr: "N° TVD (Man.)", en: "MB RST number" },
};

export function licenceHint(r: Region, lang: RLang): string {
  if (lang === "zh" || lang === "ar") {
    const z = lang === "zh";
    if (r.country === "CA" && r.sub === "ON") return z ? "可选。安大略省没有全省统一的总承包商执照；部分行业和城市有要求。" : "اختياري. لا توجد في أونتاريو رخصة مقاول عامة على مستوى المقاطعة؛ بعض الحِرَف والبلديات تشترط رخصة.";
    if (r.country === "CA") return z ? "可选：您所在省份、行业或城市要求的执照或许可证（如有）。" : "اختياري: الرخصة أو التصريح الذي تشترطه مقاطعتك أو حرفتك أو بلديتك، إن وجد.";
    if (r.country === "US") return z ? "可选：如您所在州有要求，填写州承包商执照号码。" : "اختياري: رقم رخصة المقاول في ولايتك إذا كانت تشترطها.";
    return z ? "可选：需要在单据上注明的执照、许可、资质或职业保险。" : "اختياري: رخصة أو تصريح أو مؤهل أو تأمين مهني يظهر على مستنداتك.";
  }
  const fr = lang === "fr";
  if (r.country === "CA" && r.sub === "ON")
    return fr ? "Facultatif. L'Ontario n'a pas de licence provinciale générale d'entrepreneur ; certains métiers et municipalités en exigent une." : "Optional. Ontario has no province-wide general contractor licence; some trades and municipalities require one.";
  if (r.country === "CA")
    return fr ? "Facultatif : licence ou permis exigé par votre province, votre métier ou votre municipalité, s'il y a lieu." : "Optional: licence or permit required by your province, trade or municipality, if any.";
  if (r.country === "US")
    return fr ? "Facultatif : numéro de licence d'entrepreneur de votre État, s'il en exige un." : "Optional: your state contractor license number, if your state requires one.";
  return fr ? "Facultatif : licence, permis, qualification ou assurance professionnelle à indiquer sur vos documents." : "Optional: licence, permit, qualification or professional insurance to show on your documents.";
}

/** Fields, labels and hints per region (Québec: exactly the fields used before). */
export function bizFields(r: Region, lang: RLang): FieldInfo[] {
  const X: Record<string, [string, string]> = {
    "NEQ / Business number": ["企业号码 / NEQ", "رقم المؤسسة / NEQ"], "GST/HST number": ["GST/HST 号码", "رقم GST/HST"], "QST number": ["QST 号码", "رقم QST"],
    "RBQ licence (e.g. 1234-5678-01)": ["RBQ 执照（例如 1234-5678-01）", "رخصة RBQ (مثال 1234-5678-01)"], "Interac e-Transfer email": ["Interac 转账邮箱", "بريد تحويل Interac"],
    "Business number (BN)": ["企业号码（BN）", "رقم المؤسسة (BN)"], "Contractor license": ["承包商执照", "رخصة المقاول"], "Licence / permit": ["执照 / 许可证", "رخصة / تصريح"],
    "Sales tax permit no. / EIN": ["销售税许可证号 / EIN", "رقم تصريح ضريبة المبيعات / EIN"], "Payment instructions (check, Zelle, ACH…)": ["付款方式（支票、Zelle、ACH…）", "تعليمات الدفع (شيك، Zelle، ACH…)"],
    "EU VAT number (TVA intracom.)": ["欧盟增值税号（TVA intracom.）", "رقم ض.ق.م الأوروبي (TVA intracom.)"], "Company number (BCE/KBO)": ["企业编号（BCE/KBO）", "رقم الشركة (BCE/KBO)"],
    "VAT number (BE…)": ["增值税号（BE…）", "رقم ض.ق.م (BE…)"], "UID number (CHE-…)": ["企业识别号 IDE（CHE-…）", "رقم IDE (CHE-…)"], "VAT number (CHE-… MWST/TVA)": ["增值税号（CHE-… MWST/TVA）", "رقم ض.ق.م (CHE-… MWST/TVA)"],
    "BC PST number": ["BC PST 号码", "رقم PST كولومبيا البريطانية"], "SK PST number": ["SK PST 号码", "رقم PST ساسكاتشوان"], "MB RST number": ["MB RST 号码", "رقم RST مانيتوبا"],
  };
  const fr = lang === "fr";
  const L = (f: string, e: string) => (fr ? f : lang === "zh" ? X[e]?.[0] ?? e : lang === "ar" ? X[e]?.[1] ?? e : e);
  const licence: FieldInfo = { key: "licence", label: L("Licence / permis", r.country === "US" ? "Contractor license" : "Licence / permit"), hint: licenceHint(r, lang) };
  if (isQuebec(r)) return [
    { key: "bn", label: L("NEQ / N° d'entreprise", "NEQ / Business number") },
    { key: "gst", label: L("N° TPS/TVH", "GST/HST number") },
    { key: "qst", label: L("N° TVQ", "QST number") },
    { key: "rbq", label: L("Licence RBQ (ex. 1234-5678-01)", "RBQ licence (e.g. 1234-5678-01)") },
    { key: "interac", label: L("Courriel Virement Interac", "Interac e-Transfer email") },
  ];
  if (r.country === "CA") {
    const out: FieldInfo[] = [
      { key: "bn", label: L("N° d'entreprise (NE)", "Business number (BN)") },
      { key: "gst", label: L("N° TPS/TVH", "GST/HST number") },
    ];
    if (PST_LABEL[r.sub]) out.push({ key: "pst", label: fr ? PST_LABEL[r.sub].fr : L("", PST_LABEL[r.sub].en) });
    return [...out, licence, { key: "interac", label: L("Courriel Virement Interac", "Interac e-Transfer email") }];
  }
  if (r.country === "US") return [
    { key: "regNo", label: L("N° de permis de taxe de vente / EIN", "Sales tax permit no. / EIN") },
    licence,
    { key: "interac", label: L("Instructions de paiement (chèque, virement…)", "Payment instructions (check, Zelle, ACH…)") },
  ];
  if (r.country === "FR") return [
    { key: "regNo", label: "SIRET" },
    { key: "vatNo", label: L("N° TVA intracommunautaire", "EU VAT number (TVA intracom.)") },
    licence,
    { key: "interac", label: "IBAN" },
  ];
  if (r.country === "BE") return [
    { key: "regNo", label: L("N° d'entreprise (BCE)", "Company number (BCE/KBO)") },
    { key: "vatNo", label: L("N° TVA (BE…)", "VAT number (BE…)") },
    licence,
    { key: "interac", label: "IBAN" },
  ];
  return [
    { key: "regNo", label: L("N° IDE (CHE-…)", "UID number (CHE-…)") },
    { key: "vatNo", label: L("N° TVA (CHE-… TVA)", "VAT number (CHE-… MWST/TVA)") },
    licence,
    { key: "interac", label: "IBAN" },
  ];
}

export type BizInfo = Partial<Record<BizField, string>>;

/** Registration lines printed under the business name on the PDF (Québec: same lines as before). */
export function registrationLines(c: BizInfo, r: Region, lang: RLang): string[] {
  const fr = lang === "fr";
  const v = (k: BizField) => (c[k] || "").trim();
  if (isQuebec(r)) return [
    v("bn") && `${fr ? "NEQ" : "BN"} : ${v("bn")}`,
    v("gst") && `${fr ? "N° TPS/TVH" : "GST/HST #"} : ${v("gst")}`,
    v("qst") && `${fr ? "N° TVQ" : "QST #"} : ${v("qst")}`,
  ].filter(Boolean) as string[];
  const lines: string[] = [];
  const fields = bizFields(r, lang).filter((f) => f.key !== "interac");
  for (const f of fields) if (v(f.key)) lines.push(`${f.label}${fr ? " : " : lang === "zh" ? "：" : ": "}${v(f.key)}`);
  return lines;
}

/** Label of the payment line printed on the PDF (the "interac" field). */
export function paymentLabel(r: Region, lang: RLang): string {
  if (lang === "zh") return r.country === "CA" ? "Interac 转账：" : r.country === "US" ? "付款方式：" : "IBAN：";
  if (lang === "ar") return r.country === "CA" ? "تحويل Interac:" : r.country === "US" ? "الدفع:" : "IBAN:";
  if (r.country === "CA") return lang === "fr" ? "Virement Interac :" : "Interac e-Transfer:";
  if (r.country === "US") return lang === "fr" ? "Paiement :" : "Payment:";
  return "IBAN :";
}
