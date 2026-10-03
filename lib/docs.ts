/**
 * Full documents kept in the history (pure helpers, unit-tested in scripts/test.mjs).
 *
 * Since backup format v2 each history entry can carry the complete document (`doc`): client,
 * job site, job dates, line items, tax preset, discount, deposit and the computed totals. Entries
 * created by older versions only have the summary (number, client name, date, total); they are kept
 * as-is and shown as "summary only" (they can't be reopened or exported line by line).
 */
import { computeTaxes, round2, type TaxLine } from "./tax";

export type DocType = "quote" | "invoice";
/** History status (lib/status.ts): quotes draft/sent/accepted/refused, invoices sent/paid. */
export type DocStatus = "draft" | "sent" | "accepted" | "refused" | "paid";
export const MAX_ITEMS = 200;
const MAX_STR = 1000;

export type DocItem = { description: string; quantity: number; unitPrice: number };
export type DocClient = { name: string; address: string; city: string; email: string; phone?: string };

/** Complete document as stored in history (amounts are the ones printed on the PDF). */
export type FullDoc = {
  client: DocClient;
  jobSite: string;
  /** Job (work) start date YYYY-MM-DD, optional; used for the calendar event. */
  jobDate: string;
  /** Optional last day of the job, YYYY-MM-DD (inclusive). */
  jobEndDate: string;
  due: string;
  notes: string;
  items: DocItem[];
  taxPreset: string;
  customRate: number;
  discountPct: number;
  depositPct: number;
  subtotal: number;
  discountAmount: number;
  taxLines: TaxLine[];
  total: number;
  depositAmt: number;
  balance: number;
};

export type SavedDoc = {
  id: string;
  type: DocType;
  number: string;
  clientName: string;
  total: number;
  date: string;
  /** Present for documents created with this version (backup v2); absent for old summary-only entries. */
  doc?: FullDoc;
  /** Last time the entry was saved (ms). */
  updatedAt?: number;
  /** Status shown in the history (absent on entries saved by older versions). */
  status?: DocStatus;
  /** Payment date YYYY-MM-DD when an invoice is marked paid. */
  paidAt?: string;
};

/** Lines printed on the PDF: lines with no description AND a 0 $ amount are left out. */
export function printableItems<T extends DocItem>(items: T[]): T[] {
  return items.filter((i) => i.description.trim() !== "" || i.quantity * i.unitPrice !== 0);
}
/** Lines with a description whose amount is 0 $ (e.g. template lines not priced yet). */
export function zeroLines<T extends DocItem>(items: T[]): T[] {
  return items.filter((i) => i.description.trim() !== "" && round2(i.quantity * i.unitPrice) === 0);
}

const str = (v: unknown, max = MAX_STR) => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const ymd = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");

export type Totals = Pick<FullDoc, "subtotal" | "discountAmount" | "taxLines" | "total" | "depositAmt" | "balance">;

/** Same arithmetic as the editor (rounded to the cent where printed). */
export function computeTotals(items: DocItem[], discountPct: number, taxPreset: string, customRate: number, depositPct: number, lang: "fr" | "en" = "fr"): Totals {
  const subtotal = round2(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0));
  const discountAmount = round2(subtotal * (discountPct / 100));
  const taxable = Math.max(0, subtotal - discountAmount);
  const t = computeTaxes(taxable, taxPreset, lang, customRate);
  const depositAmt = round2(t.total * (depositPct / 100));
  return { subtotal, discountAmount, taxLines: t.lines, total: t.total, depositAmt, balance: round2(t.total - depositAmt) };
}

/** Validates/normalizes a full document; returns undefined when unusable. */
export function sanitizeFullDoc(v: unknown): FullDoc | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const o = v as Record<string, unknown>;
  if (!Array.isArray(o.items)) return undefined;
  const items: DocItem[] = [];
  for (const x of o.items.slice(0, MAX_ITEMS)) {
    if (!x || typeof x !== "object") continue;
    const it = x as Record<string, unknown>;
    items.push({ description: str(it.description), quantity: num(it.quantity), unitPrice: num(it.unitPrice) });
  }
  const c = (o.client && typeof o.client === "object" ? o.client : {}) as Record<string, unknown>;
  const taxLines: TaxLine[] = Array.isArray(o.taxLines)
    ? o.taxLines.slice(0, 10).filter((l) => l && typeof l === "object").map((l) => {
        const t = l as Record<string, unknown>;
        return { code: str(t.code, 20), label: str(t.label, 40), rate: num(t.rate), amount: num(t.amount) };
      })
    : [];
  return {
    client: { name: str(c.name, 300), address: str(c.address, 300), city: str(c.city, 300), email: str(c.email, 300), phone: str(c.phone, 60) },
    jobSite: str(o.jobSite, 300),
    jobDate: ymd(o.jobDate),
    jobEndDate: ymd(o.jobEndDate),
    due: ymd(o.due),
    notes: str(o.notes, 4000),
    items,
    taxPreset: str(o.taxPreset, 40) || "none",
    customRate: num(o.customRate),
    discountPct: num(o.discountPct),
    depositPct: num(o.depositPct),
    subtotal: num(o.subtotal),
    discountAmount: num(o.discountAmount),
    taxLines,
    total: num(o.total),
    depositAmt: num(o.depositAmt),
    balance: num(o.balance),
  };
}

export const docKey = (d: Pick<SavedDoc, "type" | "number">) => `${d.type}|${d.number.trim().toLowerCase()}`;

/**
 * Saves a document in the history: replaces the entry with the same type + number (keeping its id),
 * otherwise adds it at the top. `isNew` tells the caller whether it counts as a new document for the
 * free monthly quota (a re-download of the same number for the same client does not).
 */
export function upsertHistory(history: SavedDoc[], entry: SavedDoc, max: number): { history: SavedDoc[]; isNew: boolean } {
  const k = docKey(entry);
  const i = entry.number.trim() ? history.findIndex((d) => docKey(d) === k) : -1;
  if (i < 0) return { history: [entry, ...history].slice(0, max), isNew: true };
  const prev = history[i];
  const sameClient = prev.clientName.trim().toLowerCase() === entry.clientName.trim().toLowerCase();
  const merged: SavedDoc = { ...entry, id: prev.id };
  // Status chosen in the history is kept when the document is downloaded again.
  if (!merged.status && prev.status && prev.type === entry.type) merged.status = prev.status;
  if (!merged.paidAt && prev.paidAt && merged.status === "paid") merged.paidAt = prev.paidAt;
  const next = [merged, ...history.slice(0, i), ...history.slice(i + 1)];
  return { history: next.slice(0, max), isNew: !sameClient };
}

/** Next free document number for this year, e.g. S-2026-0007 (sequence after the highest one in history). */
export function nextDocNumber(history: SavedDoc[], type: DocType, lang: "fr" | "en", now: Date = new Date()): string {
  const prefix = type === "quote" ? (lang === "fr" ? "S" : "Q") : lang === "fr" ? "F" : "INV";
  const year = now.getFullYear();
  const re = new RegExp(`^${prefix}-${year}-(\\d{1,6})$`, "i");
  let max = 0;
  for (const d of history) {
    if (d.type !== type) continue;
    const m = re.exec(d.number.trim());
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${year}-${String(max + 1).padStart(4, "0")}`;
}
