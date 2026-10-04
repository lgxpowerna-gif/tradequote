/**
 * Document status shown in the history ("Historique"): pure helpers, unit-tested in scripts/test.mjs.
 * Quotes: Brouillon / Envoyée / Acceptée / Refusée. Invoices: Envoyée / Payée (with the payment date).
 * Stored on each history entry (`status`, `paidAt`) and in the JSON backup since v4. Entries saved by
 * older versions have no status: they are shown as "Envoyée" (they were downloaded or shared).
 */
import type { DocStatus, DocType, SavedDoc } from "./docs";

export type { DocStatus };
export const QUOTE_STATUSES: DocStatus[] = ["draft", "sent", "accepted", "refused"];
export const INVOICE_STATUSES: DocStatus[] = ["sent", "paid"];
export const statusesFor = (type: DocType): DocStatus[] => (type === "quote" ? QUOTE_STATUSES : INVOICE_STATUSES);
export const isStatusFor = (type: DocType, s: unknown): s is DocStatus => typeof s === "string" && (statusesFor(type) as string[]).includes(s);

export const STATUS_LABELS: Record<"fr" | "en" | "zh" | "ar", Record<DocStatus, string>> = {
  fr: { draft: "Brouillon", sent: "Envoyée", accepted: "Acceptée", refused: "Refusée", paid: "Payée" },
  en: { draft: "Draft", sent: "Sent", accepted: "Accepted", refused: "Declined", paid: "Paid" },
  zh: { draft: "草稿", sent: "已发送", accepted: "已接受", refused: "已拒绝", paid: "已付款" },
  ar: { draft: "مسودة", sent: "مُرسل", accepted: "مقبول", refused: "مرفوض", paid: "مدفوع" },
};

/** Status of an entry (default "sent" for entries without one). */
export function statusOf(d: Pick<SavedDoc, "type" | "status">): DocStatus {
  return isStatusFor(d.type, d.status) ? d.status : "sent";
}

/**
 * Status after a download or share. A new quote that is only downloaded is a draft; sharing it marks it
 * sent. A new invoice is sent. An existing status is kept (a draft becomes "sent" when shared).
 */
export function statusAfterSave(prev: Pick<SavedDoc, "type" | "status"> | undefined, type: DocType, action: "download" | "share"): DocStatus {
  const cur = prev && prev.type === type && isStatusFor(type, prev.status) ? prev.status : type === "quote" ? (prev ? "sent" : "draft") : "sent";
  return action === "share" && cur === "draft" ? "sent" : cur;
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** Changes the status of one entry. "paid" keeps/sets the payment date (today by default); other statuses clear it. */
export function setStatus(history: SavedDoc[], id: string, status: DocStatus, today: string, paidAt?: string): SavedDoc[] {
  return history.map((d) => {
    if (d.id !== id || !isStatusFor(d.type, status)) return d;
    const next: SavedDoc = { ...d, status };
    if (status === "paid") next.paidAt = paidAt && YMD.test(paidAt) ? paidAt : d.paidAt && YMD.test(d.paidAt) ? d.paidAt : today;
    else delete next.paidAt;
    return next;
  });
}

export type StatusFilter = "all" | "quote" | "invoice" | `${DocType}:${DocStatus}`;
export const STATUS_FILTERS: StatusFilter[] = ["all", "quote:draft", "quote:sent", "quote:accepted", "quote:refused", "invoice:sent", "invoice:paid"];
export function matchesFilter(d: Pick<SavedDoc, "type" | "status">, f: StatusFilter): boolean {
  if (f === "all") return true;
  if (f === "quote" || f === "invoice") return d.type === f;
  const [type, status] = f.split(":");
  return d.type === type && statusOf(d) === status;
}

/** Normalizes status fields read from storage or a backup file. */
export function sanitizeStatus(type: DocType, status: unknown, paidAt: unknown): { status?: DocStatus; paidAt?: string } {
  if (!isStatusFor(type, status)) return {};
  return status === "paid" && typeof paidAt === "string" && YMD.test(paidAt) ? { status, paidAt } : { status };
}
