/**
 * Local backup (export / import) of TradeQuote data. Pure helpers, unit-tested in scripts/test.mjs.
 *
 * Everything stays on the user's device: the backup file is built in the browser and downloaded,
 * and an import only reads a file chosen by the user. Nothing is sent to a server.
 *
 * Version 2 (Oct. 2026): history entries may carry the full document (`doc`, see lib/docs.ts) so old
 * quotes/invoices can be reopened and exported to accounting. Version 1 files (summary-only entries)
 * are still accepted and imported as summary-only entries.
 * Version 3 (Oct. 2026): adds the client list (`clients`, lib/clients.ts) and the business logo
 * (`logo`, lib/logo.ts). Version 1 and 2 files are still accepted (no clients, no logo).
 * Version 4 (Oct. 2026): history entries can carry a `status` (and `paidAt` for paid invoices,
 * lib/status.ts). Older files are still accepted (entries without a status are shown as "sent").
 * Version 5 (Oct. 2026): adds the business region (`region`, lib/region.ts) and the region-specific
 * business fields (pst, licence, regNo, vatNo). Older files are still accepted and count as Québec.
 * Québec businesses (the default region) still write version 4 files without a region key, exactly as before.
 *
 * What is exported: document history, business details (incl. RBQ licence), language, the Stripe
 * subscription id (so Pro carries over; it is re-verified with Stripe on the server at each load)
 * and this month's free-plan usage.
 * What is NOT exported/imported: tq_pro_confirmed_at, tq_legacy_pro (the server check decides),
 * tq_last_export / tq_backup_snooze (device-specific).
 * Usage counter: an import can only RAISE this month's counter (max of current vs file), never lower
 * it, so a backup can't be used to reset the free monthly quota.
 */
import { isValidSubscriptionId, monthKey } from "./plan";
import { docKey, sanitizeFullDoc, type DocType, type SavedDoc } from "./docs";
import { CLIENTS_KEY, mergeClients, sanitizeClients, type SavedClient } from "./clients";
import { LOGO_KEY, sanitizeLogo, type Logo } from "./logo";
import { sanitizeStatus } from "./status";
import { DEFAULT_REGION, REGION_KEY, isQuebec, sanitizeRegion, type Region } from "./region";
export type { DocType, SavedDoc };

export const BACKUP_FORMAT = "tradequote-backup";
export const BACKUP_VERSION = 5;
/** Version written for Québec (default region): unchanged v4 format. */
export const QC_BACKUP_VERSION = 4;
export const MAX_BACKUP_BYTES = 8 * 1024 * 1024; // 8 MB (history + clients + logo)
/** History kept in the browser (was 50; raised so merging two devices doesn't silently drop documents). */
export const MAX_HISTORY = 500;
export const LAST_EXPORT_KEY = "tq_last_export";
export const BACKUP_SNOOZE_KEY = "tq_backup_snooze";
export const REMINDER_DAYS = 30;
const DAY_MS = 86_400_000;
const MAX_STR = 1000;

export const COMPANY_FIELDS = ["name", "address", "city", "email", "phone", "bn", "gst", "qst", "rbq", "interac", "pst", "licence", "regNo", "vatNo"] as const;
export type Company = Record<(typeof COMPANY_FIELDS)[number], string>;
const REGION_COMPANY_FIELDS: readonly string[] = ["pst", "licence", "regNo", "vatNo"];
export type BackupLang = "fr" | "en" | "zh" | "ar";
const isBackupLang = (v: unknown): v is BackupLang => v === "fr" || v === "en" || v === "zh" || v === "ar";

export type BackupData = {
  history: SavedDoc[];
  company: Partial<Company>;
  lang?: BackupLang;
  langChoice?: boolean;
  sub?: string;
  usage?: { month: string; count: number };
  clients?: SavedClient[];
  logo?: Logo;
  /** v5: business region (absent in older files = Québec). */
  region?: Region;
};
export type Backup = { format: typeof BACKUP_FORMAT; app: "TradeQuote"; version: number; exportedAt: string; data: BackupData };

export type BackupError = "tooLarge" | "empty" | "notJson" | "wrongApp" | "newerVersion" | "badShape";
export type ParseResult = { ok: true; backup: Backup; skipped: number } | { ok: false; error: BackupError };

type Getter = (key: string) => string | null;

const str = (v: unknown, max = MAX_STR) => (typeof v === "string" ? v.slice(0, max) : null);
const safeJson = (s: string | null): unknown => {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
};

/** Validates/normalizes one history entry; returns null when unusable. */
export function sanitizeDoc(v: unknown): SavedDoc | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const id = typeof o.id === "number" && Number.isFinite(o.id) ? String(o.id) : str(o.id, 100);
  const type = o.type === "quote" || o.type === "invoice" ? o.type : null;
  const number = str(o.number, 100);
  const total = typeof o.total === "number" && Number.isFinite(o.total) ? o.total : null;
  if (!id || !type || number === null || total === null) return null;
  const out: SavedDoc = { id, type, number, clientName: str(o.clientName, 300) ?? "", total, date: str(o.date, 40) ?? "" };
  const doc = sanitizeFullDoc(o.doc);
  if (doc) out.doc = doc;
  if (typeof o.updatedAt === "number" && Number.isFinite(o.updatedAt)) out.updatedAt = o.updatedAt;
  Object.assign(out, sanitizeStatus(type, o.status, o.paidAt));
  return out;
}

export function sanitizeHistory(v: unknown): { docs: SavedDoc[]; skipped: number } {
  if (!Array.isArray(v)) return { docs: [], skipped: 0 };
  const docs: SavedDoc[] = [];
  let skipped = 0;
  for (const x of v) { const d = sanitizeDoc(x); if (d) docs.push(d); else skipped++; }
  return { docs, skipped };
}

export function sanitizeCompany(v: unknown): Partial<Company> {
  const out: Partial<Company> = {};
  if (!v || typeof v !== "object" || Array.isArray(v)) return out;
  const o = v as Record<string, unknown>;
  for (const k of COMPANY_FIELDS) {
    const s = str(o[k], 300);
    // Region-specific fields (v5) are kept only when filled: a Québec profile stays exactly as before.
    if (s !== null && (s !== "" || !REGION_COMPANY_FIELDS.includes(k))) out[k] = s;
  }
  return out;
}

/** Builds the backup object from this browser's localStorage (getter injected for tests). */
export function buildBackup(get: Getter, now: Date = new Date()): Backup {
  const data: BackupData = {
    history: sanitizeHistory(safeJson(get("tq_history"))).docs,
    company: sanitizeCompany(safeJson(get("tq_company"))),
  };
  const lang = get("tq_lang");
  if (isBackupLang(lang)) data.lang = lang;
  if (get("tq_lang_choice") === "1") data.langChoice = true;
  const sub = get("tq_sub");
  if (isValidSubscriptionId(sub)) data.sub = sub;
  const month = get("tq_count_month");
  const count = parseInt(get("tq_count") ?? "", 10);
  if (month && /^\d{4}-\d{2}$/.test(month) && Number.isFinite(count) && count > 0) data.usage = { month, count };
  const clients = sanitizeClients(safeJson(get(CLIENTS_KEY)));
  if (clients.length) data.clients = clients;
  const logo = sanitizeLogo(safeJson(get(LOGO_KEY)));
  if (logo) data.logo = logo;
  // Québec (the default) writes exactly the v4 format, as before: no region key, version 4, so the file
  // stays identical and readable by earlier versions. Other regions write v5 with the region.
  const region = sanitizeRegion(safeJson(get(REGION_KEY)));
  const qc = isQuebec(region);
  if (!qc) data.region = region;
  return { format: BACKUP_FORMAT, app: "TradeQuote", version: qc ? QC_BACKUP_VERSION : BACKUP_VERSION, exportedAt: now.toISOString(), data };
}

/** Local date as YYYY-MM-DD. */
export function localDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function backupFileName(lang: BackupLang = "fr", d: Date = new Date()): string {
  return `tradequote-${lang === "fr" ? "sauvegarde" : "backup"}-${localDate(d)}.json`;
}

/** Parses and validates a backup file's text. `byteSize` = File.size when known. */
export function parseBackup(text: string, byteSize?: number): ParseResult {
  if ((byteSize ?? 0) > MAX_BACKUP_BYTES || text.length > MAX_BACKUP_BYTES) return { ok: false, error: "tooLarge" };
  if (!text.trim()) return { ok: false, error: "empty" };
  let raw: unknown;
  try { raw = JSON.parse(text.replace(/^\uFEFF/, "")); } catch { return { ok: false, error: "notJson" }; }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "wrongApp" };
  const o = raw as Record<string, unknown>;
  if (o.format !== BACKUP_FORMAT) return { ok: false, error: "wrongApp" };
  if (typeof o.version !== "number" || !Number.isInteger(o.version) || o.version < 1) return { ok: false, error: "badShape" };
  if (o.version > BACKUP_VERSION) return { ok: false, error: "newerVersion" };
  const d = o.data as Record<string, unknown> | undefined;
  if (!d || typeof d !== "object" || Array.isArray(d)) return { ok: false, error: "badShape" };
  if (d.history !== undefined && !Array.isArray(d.history)) return { ok: false, error: "badShape" };
  if (d.company !== undefined && (typeof d.company !== "object" || d.company === null || Array.isArray(d.company))) return { ok: false, error: "badShape" };
  if (d.clients !== undefined && !Array.isArray(d.clients)) return { ok: false, error: "badShape" };
  const { docs, skipped } = sanitizeHistory(d.history);
  const data: BackupData = { history: docs, company: sanitizeCompany(d.company) };
  if (isBackupLang(d.lang)) data.lang = d.lang;
  if (d.langChoice === true) data.langChoice = true;
  if (isValidSubscriptionId(d.sub)) data.sub = d.sub;
  const u = d.usage as Record<string, unknown> | undefined;
  if (u && typeof u.month === "string" && /^\d{4}-\d{2}$/.test(u.month) && typeof u.count === "number" && Number.isFinite(u.count) && u.count > 0)
    data.usage = { month: u.month, count: Math.floor(u.count) };
  const clients = sanitizeClients(d.clients);
  if (clients.length) data.clients = clients;
  const logo = sanitizeLogo(d.logo);
  if (logo) data.logo = logo;
  if (d.region !== undefined) data.region = sanitizeRegion(d.region);
  const exportedAt = typeof o.exportedAt === "string" && !isNaN(Date.parse(o.exportedAt)) ? o.exportedAt : "";
  return { ok: true, backup: { format: BACKUP_FORMAT, app: "TradeQuote", version: o.version, exportedAt, data }, skipped };
}

const docTime = (d: SavedDoc) => {
  const t = Date.parse(d.date);
  return Number.isFinite(t) ? t : 0;
};

/**
 * Merges histories without duplicates. A document is a duplicate when it has the same id, or the same
 * type + number (case-insensitive) as one already present. On conflict the CURRENT browser's copy wins,
 * except that a summary-only entry (old version) is completed with the file's full document when the
 * file has it (`upgraded`). Result is sorted newest first (date, then id) and capped at MAX_HISTORY.
 */
export function mergeHistory(current: SavedDoc[], incoming: SavedDoc[]): { history: SavedDoc[]; added: number; duplicates: number; upgraded: number } {
  const ids = new Set(current.map((d) => d.id));
  const keys = new Set(current.map(docKey));
  const out = [...current];
  let added = 0, duplicates = 0, upgraded = 0;
  for (const d of incoming) {
    if (ids.has(d.id) || (d.number.trim() && keys.has(docKey(d)))) {
      duplicates++;
      if (d.doc) {
        const i = out.findIndex((x) => x.id === d.id || (d.number.trim() && docKey(x) === docKey(d)));
        if (i >= 0 && !out[i].doc && docKey(out[i]) === docKey(d)) { out[i] = { ...out[i], doc: d.doc }; upgraded++; }
      }
      // A status set on the other device fills an entry that has none here (this browser's status wins).
      if (d.status) {
        const i = out.findIndex((x) => x.id === d.id || (d.number.trim() && docKey(x) === docKey(d)));
        if (i >= 0 && !out[i].status && out[i].type === d.type) out[i] = { ...out[i], status: d.status, ...(d.paidAt ? { paidAt: d.paidAt } : {}) };
      }
      continue;
    }
    ids.add(d.id); keys.add(docKey(d)); out.push(d); added++;
  }
  out.sort((a, b) => docTime(b) - docTime(a) || (b.id > a.id ? 1 : b.id < a.id ? -1 : 0));
  return { history: out.slice(0, MAX_HISTORY), added, duplicates, upgraded };
}

/** Merge: fields already filled in this browser are kept; empty ones are filled from the file. */
export function mergeCompany(current: Partial<Company>, incoming: Partial<Company>): Partial<Company> {
  const out: Partial<Company> = { ...current };
  for (const k of COMPANY_FIELDS) if (!(current[k] ?? "").trim() && incoming[k]) out[k] = incoming[k];
  return out;
}

export type ImportMode = "merge" | "replace";
export type ImportPlan = {
  /** localStorage keys to write. */
  set: Record<string, string>;
  /** localStorage keys to remove. */
  remove: string[];
  history: SavedDoc[];
  company: Partial<Company>;
  lang: BackupLang | null;
  count: number;
  subChanged: boolean;
  added: number;
  duplicates: number;
  upgraded: number;
  clients: SavedClient[];
  clientsAdded: number;
  logo: Logo | null;
  /** Region after the import (null = unchanged). */
  region: Region | null;
};

/** Computes what an import writes, from the current localStorage (getter) and a parsed backup. */
export function planImport(get: Getter, backup: Backup, mode: ImportMode, now: Date = new Date()): ImportPlan {
  const curHistory = sanitizeHistory(safeJson(get("tq_history"))).docs;
  const curCompany = sanitizeCompany(safeJson(get("tq_company")));
  const d = backup.data;

  let history: SavedDoc[], added: number, duplicates = 0, upgraded = 0;
  if (mode === "replace") { history = mergeHistory([], d.history).history; added = history.length; }
  else ({ history, added, duplicates, upgraded } = mergeHistory(curHistory, d.history));
  const company = mode === "replace" ? { ...d.company } : mergeCompany(curCompany, d.company);

  const set: Record<string, string> = { tq_history: JSON.stringify(history), tq_company: JSON.stringify(company) };
  const remove: string[] = [];

  // Language: replace -> take the file's; merge -> only if this browser has no explicit choice yet.
  let lang: BackupLang | null = null;
  const curChoice = get("tq_lang_choice") === "1";
  if (d.lang && (mode === "replace" || !curChoice)) {
    lang = d.lang; set.tq_lang = d.lang;
    if (d.langChoice) set.tq_lang_choice = "1";
  }

  // Free-plan counter: only ever raised (never reset by an import).
  const thisMonth = monthKey(now);
  const curMonth = get("tq_count_month");
  const curCountRaw = parseInt(get("tq_count") ?? "0", 10);
  const curCount = curMonth === thisMonth && Number.isFinite(curCountRaw) && curCountRaw > 0 ? curCountRaw : 0;
  const fileCount = d.usage && d.usage.month === thisMonth ? d.usage.count : 0;
  const count = Math.max(curCount, fileCount);
  set.tq_count = String(count); set.tq_count_month = thisMonth;

  // Subscription id: carried over so Pro follows; always re-verified with Stripe by the server.
  const curSub = get("tq_sub");
  let subChanged = false;
  if (d.sub && d.sub !== curSub && (mode === "replace" || !isValidSubscriptionId(curSub))) {
    set.tq_sub = d.sub; subChanged = true;
    remove.push("tq_pro_confirmed_at"); // belonged to the previous subscription; the server check decides
  }
  // Client list: merge adds new clients (fills empty fields of existing ones); replace takes the file's.
  const curClients = sanitizeClients(safeJson(get(CLIENTS_KEY)));
  const fileClients = d.clients ?? [];
  // Files older than v3 know nothing about clients/logo: "replace" then keeps this browser's.
  const v3 = backup.version >= 3;
  const cm = mode === "replace" && v3 ? { clients: fileClients, added: fileClients.length } : mergeClients(curClients, fileClients);
  set[CLIENTS_KEY] = JSON.stringify(cm.clients);

  // Logo: merge keeps this browser's logo (takes the file's only if none here); replace takes the file's.
  const curLogo = sanitizeLogo(safeJson(get(LOGO_KEY)));
  let logo = curLogo;
  if (mode === "replace" && v3) logo = d.logo ?? null;
  else if (!curLogo && d.logo) logo = d.logo;
  if (logo) { if (logo !== curLogo) set[LOGO_KEY] = JSON.stringify(logo); }
  else if (curLogo) remove.push(LOGO_KEY);

  // Region (v5): replace -> the file's (older files = Québec); merge -> keep this browser's region,
  // unless this browser has no region and no business details yet (new device) and the file has one.
  let region: Region | null = null;
  if (mode === "replace") region = d.region ?? { ...DEFAULT_REGION };
  else if (d.region && get(REGION_KEY) === null && !curCompany.name) region = d.region;
  // Québec is the default when no region is stored: remove the key rather than writing it (storage as before).
  if (region && isQuebec(region)) { if (get(REGION_KEY) !== null) remove.push(REGION_KEY); }
  else if (region) set[REGION_KEY] = JSON.stringify(region);

  return { set, remove, history, company, lang, count, subChanged, added, duplicates, upgraded, clients: cm.clients, clientsAdded: cm.added, logo, region };
}

/** Gentle reminder: data older than REMINDER_DAYS and no export (or "later") in the last REMINDER_DAYS. */
export function exportReminderDue(opts: { lastExport: string | null; snoozedAt: string | null; history: SavedDoc[]; now?: number }): boolean {
  const now = opts.now ?? Date.now();
  if (!opts.history.length) return false;
  const n = (s: string | null) => { const x = parseInt(s ?? "", 10); return Number.isFinite(x) && x > 0 ? x : 0; };
  // Oldest document time (ids are Date.now() strings when created in the app; fall back to the date field).
  let oldest = now;
  for (const d of opts.history) {
    const t = /^\d{12,14}$/.test(d.id) ? Number(d.id) : docTime(d) || now;
    if (t < oldest) oldest = t;
  }
  const ref = Math.max(n(opts.lastExport), n(opts.snoozedAt), oldest);
  return now - ref > REMINDER_DAYS * DAY_MS;
}
