/**
 * Accounting exports, built 100 % in the browser (pure helpers, unit-tested in scripts/test.mjs).
 *
 * 1. QuickBooks Online "Import invoices" CSV: one row per line item, columns from Intuit's invoice
 *    import sample (InvoiceNo, Customer, InvoiceDate, DueDate, Terms, Location, Memo,
 *    Item(Product/Service), ItemDescription, ItemQuantity, ItemRate, ItemAmount, ItemTaxCode).
 *    QBO limits: 100 invoices / 1 000 rows per file, no negative lines (so a discount is folded into
 *    the line amounts), tax codes are matched to the company's QBO tax codes during the import.
 *    Plain UTF-8 without BOM, comma separator, "." decimals, dates DD/MM/YYYY.
 * 2. Generic spreadsheet CSV (Excel): one row per document with separate TPS / TVQ / TVH / other
 *    tax columns. UTF-8 with BOM so Excel reads accents; French: ";" separator and "," decimals
 *    (Excel fr-CA defaults), English: "," and ".".
 *
 * Old summary-only history entries (no line items, no tax split) are never exported; they are counted
 * in `skippedSummary` so the UI can say so.
 */
import { round2 } from "./tax";
import type { FullDoc, SavedDoc } from "./docs";

export const QBO_MAX_INVOICES = 100;
export const QBO_MAX_ROWS = 1000;
export const QBO_HEADERS = [
  "InvoiceNo", "Customer", "InvoiceDate", "DueDate", "Terms", "Location", "Memo",
  "Item(Product/Service)", "ItemDescription", "ItemQuantity", "ItemRate", "ItemAmount", "ItemTaxCode",
] as const;

/** Default value written in ItemTaxCode per tax preset (re-mapped to the QBO tax codes during import). */
export const QBO_TAX_CODES: Record<string, string> = {
  "gst-qst-qc": "TPS/TVQ QC",
  gst: "TPS",
  "hst-on": "TVH ON",
  "hst-nb": "TVH 15",
  "gst-pst-bc": "TPS/TVP C.-B.",
  "gst-pst-sk": "TPS/TVP SK",
  "gst-rst-mb": "TPS/TVD MB",
  none: "Exonéré",
};
export function qboTaxCode(doc: Pick<FullDoc, "taxPreset" | "customRate">): string {
  if (doc.taxPreset === "custom") return doc.customRate > 0 ? `Taxe ${String(doc.customRate).replace(".", ",")} %` : "Exonéré";
  return QBO_TAX_CODES[doc.taxPreset] ?? "Exonéré";
}

export type DateRange = { from?: string; to?: string };
export type FullSaved = SavedDoc & { doc: FullDoc };

/** Documents with a full copy, of the wanted types, whose date is within [from, to] (YYYY-MM-DD, inclusive), oldest first. */
export function selectDocs(history: SavedDoc[], range: DateRange, types: SavedDoc["type"][] = ["invoice"]): { docs: FullSaved[]; skippedSummary: number } {
  const inRange = (d: string) => (!range.from || d >= range.from) && (!range.to || d <= range.to);
  let skippedSummary = 0;
  const docs: FullSaved[] = [];
  for (const d of history) {
    if (!types.includes(d.type) || !inRange(d.date)) continue;
    if (!d.doc) { skippedSummary++; continue; }
    docs.push(d as FullSaved);
  }
  docs.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.number.localeCompare(b.number)));
  return { docs, skippedSummary };
}

const csvCell = (v: string | number, sep: string) => {
  const s = String(v);
  return s.includes(sep) || /["\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
};
/** Neutralizes spreadsheet formulas in free text (=, +, -, @ at the start) for the Excel file. */
const noFormula = (s: string) => (/^[=+\-@\t\r]/.test(s) ? `'${s}` : s);
const csvRows = (rows: (string | number)[][], sep: string) => rows.map((r) => r.map((c) => csvCell(c, sep)).join(sep)).join("\r\n") + "\r\n";

/** YYYY-MM-DD -> DD/MM/YYYY (QuickBooks: choose the D/M/YYYY date format when importing). */
export const dmy = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : d);
const fix2 = (n: number) => round2(n).toFixed(2);

export type QboLine = { description: string; quantity: number; rate: number; amount: number };

/**
 * Line amounts net of the document discount (QBO can't import negative discount lines). Each line is
 * reduced by the discount %, rounded to the cent, and the rounding remainder goes on the largest line so
 * the lines add up exactly to the pre-tax amount printed on the PDF (subtotal - discount).
 */
export function netLines(doc: FullDoc): QboLine[] {
  const lines = doc.items.filter((i) => i.description.trim() || i.quantity * i.unitPrice !== 0);
  if (!lines.length) return [];
  const gross = lines.map((i) => round2(i.quantity * i.unitPrice));
  if (!(doc.discountPct > 0)) return lines.map((i, k) => ({ description: i.description, quantity: i.quantity, rate: i.unitPrice, amount: gross[k] }));
  const target = round2(round2(gross.reduce((s, x) => s + x, 0)) - doc.discountAmount);
  const net = gross.map((g) => round2(g * (1 - doc.discountPct / 100)));
  const diff = round2(target - net.reduce((s, x) => s + x, 0));
  if (diff !== 0) {
    let big = 0;
    net.forEach((x, k) => { if (Math.abs(x) > Math.abs(net[big])) big = k; });
    net[big] = round2(net[big] + diff);
  }
  return lines.map((i, k) => ({ description: i.description, quantity: 1, rate: net[k], amount: net[k] }));
}

export type QboOptions = { product: string; discountNote: (pct: number, qty: number, unit: number) => string; sitePrefix: string };

/** QuickBooks Online invoice import CSV (invoices only). */
export function buildQboCsv(docs: FullSaved[], opts: QboOptions): { csv: string; invoices: number; rows: number } {
  const rows: (string | number)[][] = [QBO_HEADERS as unknown as string[]];
  let invoices = 0;
  for (const d of docs) {
    if (d.type !== "invoice") continue;
    const doc = d.doc;
    const lines = netLines(doc);
    if (!lines.length) continue;
    invoices++;
    const items = doc.items.filter((i) => i.description.trim() || i.quantity * i.unitPrice !== 0);
    const memo = doc.jobSite ? `${opts.sitePrefix}${doc.jobSite}` : "";
    lines.forEach((l, k) => {
      const src = items[k];
      const desc = doc.discountPct > 0 ? `${l.description} ${opts.discountNote(doc.discountPct, src.quantity, src.unitPrice)}`.trim() : l.description;
      rows.push([
        d.number, doc.client.name || d.clientName || "Client", dmy(d.date), dmy(doc.due || d.date), "", "", memo,
        opts.product, desc, l.quantity, l.rate, fix2(l.amount), qboTaxCode(doc),
      ]);
    });
  }
  return { csv: csvRows(rows, ","), invoices, rows: rows.length - 1 };
}

export type SheetLang = "fr" | "en";
const SHEET_HEADERS: Record<SheetLang, string[]> = {
  fr: ["Type", "Numéro", "Date", "Échéance", "Client", "Courriel client", "Adresse du chantier", "Date des travaux", "Sous-total", "Remise", "Montant avant taxes", "TPS", "TVQ", "TVH", "Autre taxe (TVP/TVD)", "Total des taxes", "Total", "Acompte demandé", "Solde dû", "Taxes appliquées"],
  en: ["Type", "Number", "Date", "Due date", "Client", "Client email", "Job site", "Job date", "Subtotal", "Discount", "Pre-tax amount", "GST", "QST", "HST", "Other tax (PST/RST)", "Total tax", "Total", "Deposit requested", "Balance due", "Taxes applied"],
};

/** Per-document totals split by tax (TPS = gst, TVQ = qst, TVH = hst, anything else = other). */
export function taxSplit(doc: FullDoc) {
  const by = (codes: string[]) => round2(doc.taxLines.filter((l) => codes.includes(l.code)).reduce((s, l) => s + l.amount, 0));
  const gst = by(["gst"]), qst = by(["qst"]), hst = by(["hst"]);
  const totalTax = round2(doc.taxLines.reduce((s, l) => s + l.amount, 0));
  return { gst, qst, hst, other: round2(totalTax - gst - qst - hst), totalTax };
}

/** Spreadsheet CSV with a UTF-8 BOM, one row per document. */
export function buildSheetCsv(docs: FullSaved[], lang: SheetLang): string {
  const sep = lang === "fr" ? ";" : ",";
  const n = (x: number) => (lang === "fr" ? fix2(x).replace(".", ",") : fix2(x));
  const typeLabel = (t: SavedDoc["type"]) => (lang === "fr" ? (t === "quote" ? "Soumission" : "Facture") : t === "quote" ? "Quote" : "Invoice");
  const rows: (string | number)[][] = [SHEET_HEADERS[lang]];
  for (const d of docs) {
    const doc = d.doc;
    const s = taxSplit(doc);
    const pretax = round2(doc.subtotal - doc.discountAmount);
    const applied = doc.taxLines.map((l) => `${l.label} ${lang === "fr" ? String(l.rate).replace(".", ",") + " %" : l.rate + "%"}`).join(" + ");
    rows.push([
      typeLabel(d.type), noFormula(d.number), d.date, doc.due, noFormula(doc.client.name || d.clientName), noFormula(doc.client.email),
      noFormula(doc.jobSite), doc.jobDate, n(doc.subtotal), n(doc.discountAmount), n(pretax), n(s.gst), n(s.qst), n(s.hst), n(s.other),
      n(s.totalTax), n(doc.total), n(doc.depositAmt), n(doc.balance), applied,
    ]);
  }
  return "\uFEFF" + csvRows(rows, sep);
}

export function exportFileName(kind: "qbo" | "sheet", range: DateRange, lang: SheetLang = "fr"): string {
  const span = [range.from, range.to].filter(Boolean).join("_") || "tout";
  const base = kind === "qbo" ? "quickbooks-factures" : lang === "fr" ? "tradequote-documents" : "tradequote-documents";
  return `${base}-${span}.csv`;
}
