/**
 * Client list ("carnet de clients"), kept in this browser's localStorage (tq_clients) and in the JSON
 * backup since v3. Pure helpers, unit-tested in scripts/test.mjs.
 *
 * Clients are saved automatically when a document is downloaded or shared. The key is the client name
 * (case/accents/spacing-insensitive): saving again updates the fields that were filled in.
 */
export const CLIENTS_KEY = "tq_clients";
export const MAX_CLIENTS = 1000;
export const CLIENT_FIELDS = ["name", "address", "city", "email", "phone"] as const;
export type ClientField = (typeof CLIENT_FIELDS)[number];
export type SavedClient = Record<ClientField, string> & { id: string; updatedAt: number };

const str = (v: unknown, max = 300) => (typeof v === "string" ? v.slice(0, max) : "");

/** "  Jean  TREMBLAY " and "Jean Tremblay" are the same client. */
export function clientKey(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function sanitizeClient(v: unknown): SavedClient | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const name = str(o.name).trim();
  if (!name) return null;
  const id = str(o.id, 100) || `c${clientKey(name).replace(/[^a-z0-9]/g, "").slice(0, 40)}`;
  const updatedAt = typeof o.updatedAt === "number" && Number.isFinite(o.updatedAt) ? o.updatedAt : 0;
  return { id, name, address: str(o.address), city: str(o.city), email: str(o.email), phone: str(o.phone, 60), updatedAt };
}

/** Valid, de-duplicated (by name key, first wins), capped list. */
export function sanitizeClients(v: unknown): SavedClient[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: SavedClient[] = [];
  for (const x of v) {
    const c = sanitizeClient(x);
    if (!c || seen.has(clientKey(c.name))) continue;
    seen.add(clientKey(c.name)); out.push(c);
    if (out.length >= MAX_CLIENTS) break;
  }
  return out;
}

/**
 * Saves (or updates) a client from a document. Non-empty fields from the document replace the saved
 * ones; empty fields never erase what was saved. Most recently used first.
 */
export function upsertClient(list: SavedClient[], c: Partial<Record<ClientField, string>>, now = Date.now()): SavedClient[] {
  const name = (c.name ?? "").trim();
  if (!name || clientKey(name) === "client") return list;
  const k = clientKey(name);
  const i = list.findIndex((x) => clientKey(x.name) === k);
  const prev = i >= 0 ? list[i] : null;
  const next: SavedClient = { id: prev?.id ?? `c${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`, name, address: "", city: "", email: "", phone: "", updatedAt: now };
  for (const f of CLIENT_FIELDS) if (f !== "name") next[f] = ((c[f] ?? "").trim() || prev?.[f] || "").slice(0, f === "phone" ? 60 : 300);
  const rest = i >= 0 ? [...list.slice(0, i), ...list.slice(i + 1)] : list;
  return [next, ...rest].slice(0, MAX_CLIENTS);
}

/** Finds the saved client whose name matches exactly (case/accent-insensitive). */
export function findClient(list: SavedClient[], name: string): SavedClient | undefined {
  const k = clientKey(name);
  return k ? list.find((x) => clientKey(x.name) === k) : undefined;
}

/** Backup merge: clients from the file are added; for a client already here, only empty fields are filled. */
export function mergeClients(current: SavedClient[], incoming: SavedClient[]): { clients: SavedClient[]; added: number } {
  const out = [...current];
  let added = 0;
  for (const c of incoming) {
    const i = out.findIndex((x) => clientKey(x.name) === clientKey(c.name));
    if (i < 0) { out.push(c); added++; continue; }
    const cur = { ...out[i] };
    for (const f of CLIENT_FIELDS) if (!cur[f].trim() && c[f]) cur[f] = c[f];
    out[i] = cur;
  }
  return { clients: out.slice(0, MAX_CLIENTS), added };
}
