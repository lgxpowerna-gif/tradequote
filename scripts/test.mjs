// Minimal dependency-free unit tests: transpile lib/*.ts with the project's TypeScript and assert.
// Run: npm test
import ts from "typescript";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "libtest-"));
async function load(rel) {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  const out = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText.replace(/from "\.\/([\w-]+)"/g, 'from "./$1.mjs"'); // lib-relative imports -> transpiled siblings
  const file = path.join(tmp, path.basename(rel).replace(/\.ts$/, ".mjs"));
  fs.writeFileSync(file, out);
  return import(pathToFileURL(file).href);
}

let passed = 0;
const test = async (name, fn) => {
  try { await fn(); passed++; console.log("  ✓", name); }
  catch (e) { console.error("  ✗", name, "\n", e.message); process.exitCode = 1; }
};

const tax = await load("lib/tax.ts");
const plan = await load("lib/plan.ts");

console.log("tax");
await test("default preset is Québec TPS+TVQ", () => {
  const p = tax.TAX_PRESETS.find((x) => x.id === tax.DEFAULT_TAX_PRESET);
  assert.deepEqual(p.components.map((c) => [c.label.fr, c.rate]), [["TPS", 5], ["TVQ", 9.975]]);
});
await test("100 $ -> TPS 5,00 + TVQ 9,98 = 114,98", () => {
  const r = tax.computeTaxes(100, tax.DEFAULT_TAX_PRESET, "fr");
  assert.deepEqual(r.lines.map((l) => [l.label, l.amount]), [["TPS", 5], ["TVQ", 9.98]]);
  assert.equal(r.totalTax, 14.98);
  assert.equal(r.total, 114.98);
});
await test("1 234,56 $ -> TPS 61,73 + TVQ 123,15 = 1 419,44", () => {
  const r = tax.computeTaxes(1234.56, tax.DEFAULT_TAX_PRESET, "fr");
  assert.deepEqual(r.lines.map((l) => l.amount), [61.73, 123.15]);
  assert.equal(r.total, 1419.44);
});
await test("TVQ is not charged on TPS", () => {
  const r = tax.computeTaxes(1000, tax.DEFAULT_TAX_PRESET, "fr");
  assert.equal(r.lines[1].amount, 99.75);
});
await test("English labels GST/QST", () => {
  const r = tax.computeTaxes(10, tax.DEFAULT_TAX_PRESET, "en");
  assert.deepEqual(r.lines.map((l) => l.label), ["GST", "QST"]);
});
await test("Ontario HST 13 % single line", () => {
  const id = tax.TAX_PRESETS.find((p) => p.components.length === 1 && p.components[0].rate === 13).id;
  const r = tax.computeTaxes(200, id, "fr");
  assert.equal(r.lines.length, 1);
  assert.equal(r.lines[0].label, "TVH");
  assert.equal(r.total, 226);
});
await test("no tax / custom / negative input", () => {
  const none = tax.TAX_PRESETS.find((p) => p.id === "none").id;
  assert.equal(tax.computeTaxes(50, none).total, 50);
  assert.equal(tax.computeTaxes(100, "custom", "fr", 8).total, 108);
  assert.equal(tax.computeTaxes(-20, tax.DEFAULT_TAX_PRESET).total, 0);
});
await test("formatRate fr/en", () => {
  assert.equal(tax.formatRate(9.975, "fr"), "9,975 %");
  assert.equal(tax.formatRate(9.975, "en"), "9.975%");
});

console.log("plan");
await test("legacy Pro migration keeps old Pro users until 2027-01-01 (Toronto)", () => {
  assert.equal(plan.migrateLegacyPlan("pro", null), "legacy");
  assert.equal(plan.migrateLegacyPlan("pro", "sub_1PqRsTuVwXyZ"), "none");
  assert.equal(plan.migrateLegacyPlan("free", null), "none");
  assert.equal(plan.migrateLegacyPlan(null, null), "none");
  assert.equal(plan.legacyProActive("1", Date.UTC(2026, 11, 31, 12)), true);
  assert.equal(plan.legacyProActive("1", Date.UTC(2027, 0, 1, 6)), false);
  assert.equal(plan.legacyProActive(null, Date.UTC(2026, 9, 1)), false);
});

await test("entitled only for this app and active-like statuses", () => {
  assert.equal(plan.isEntitled("active", "APPNAME", "APPNAME"), true);
  assert.equal(plan.isEntitled("trialing", "APPNAME", "APPNAME"), true);
  assert.equal(plan.isEntitled("canceled", "APPNAME", "APPNAME"), false);
  assert.equal(plan.isEntitled("active", "other-app", "APPNAME"), false);
  assert.equal(plan.isEntitled("active", undefined, "APPNAME"), false);
});
await test("subscription id validation", () => {
  assert.equal(plan.isValidSubscriptionId("sub_1PqRsTuVwXyZ"), true);
  assert.equal(plan.isValidSubscriptionId("pro"), false);
  assert.equal(plan.isValidSubscriptionId("sub_../../x"), false);
  assert.equal(plan.isValidSubscriptionId(null), false);
});
await test("free counter resets each month", () => {
  const oct = new Date(2026, 9, 15);
  assert.equal(plan.monthKey(oct), "2026-10");
  assert.equal(plan.countForThisMonth("2026-10", "4", oct), 4);
  assert.equal(plan.countForThisMonth("2026-09", "5", oct), 0);
  assert.equal(plan.countForThisMonth(null, "5", oct), 0);
});
await test("resolvePro: server wins, offline grace 7 days", () => {
  const now = 1_000_000_000_000;
  assert.equal(plan.resolvePro(true, null, now), true);
  assert.equal(plan.resolvePro(false, now, now), false);
  assert.equal(plan.resolvePro(null, now - 86400000, now), true);
  assert.equal(plan.resolvePro(null, now - 8 * 86400000, now), false);
  assert.equal(plan.resolvePro(null, null, now), false);
});

const rbq = await load("lib/rbq.ts");
console.log("rbq");
await test("format while typing", () => {
  assert.equal(rbq.formatRbq("1234"), "1234");
  assert.equal(rbq.formatRbq("123456"), "1234-56");
  assert.equal(rbq.formatRbq("1234567801"), "1234-5678-01");
  assert.equal(rbq.formatRbq("1234 5678 01 99"), "1234-5678-01");
});
await test("validation: exactly 10 digits", () => {
  assert.equal(rbq.isValidRbq("1234-5678-01"), true);
  assert.equal(rbq.isValidRbq("1234567801"), true);
  assert.equal(rbq.isValidRbq("1234-5678-0"), false);
  assert.equal(rbq.isValidRbq("abcd-5678-01"), false);
  assert.equal(rbq.isValidRbq(""), false);
});
await test("line printed on documents", () => {
  assert.equal(rbq.rbqLine("1234567801", "fr"), "Licence RBQ : 1234-5678-01");
  assert.equal(rbq.rbqLine("1234567801", "en"), "RBQ licence: 1234-5678-01");
  assert.equal(rbq.rbqLine("12", "fr"), "");
});

const docsLib = await load("lib/docs.ts");
const clientsLib = await load("lib/clients.ts");
const logoLib = await load("lib/logo.ts");
const backup = await load("lib/backup.ts");
console.log("backup");
const store = (o) => (k) => (k in o ? o[k] : null);
const oct = new Date(2026, 9, 2, 12);
const doc = (id, number, date = "2026-10-01", type = "quote", total = 100) => ({ id, type, number, clientName: "Client " + id, total, date });
const fullStore = {
  tq_history: JSON.stringify([doc("1790000000001", "S-2026-1001"), doc("1790000000002", "F-2026-2002", "2026-09-15", "invoice", 250.5)]),
  tq_company: JSON.stringify({ name: "Rénos Laurier", rbq: "1234-5678-01", gst: "123", evil: "<script>" }),
  tq_lang: "en", tq_lang_choice: "1", tq_sub: "sub_1PqRsTuVwXyZ", tq_count: "3", tq_count_month: "2026-10",
  tq_pro_confirmed_at: "1790000000000", tq_legacy_pro: "1", tq_last_export: "1", tq_plan: "pro",
};
await test("export: version, date, user keys only (no confirmed_at / legacy / last_export)", () => {
  const b = backup.buildBackup(store(fullStore), oct);
  assert.equal(b.format, "tradequote-backup");
  assert.equal(b.version, 3);
  assert.equal(b.exportedAt, oct.toISOString());
  assert.equal(b.data.history.length, 2);
  assert.deepEqual(b.data.company, { name: "Rénos Laurier", rbq: "1234-5678-01", gst: "123" });
  assert.equal(b.data.lang, "en");
  assert.equal(b.data.langChoice, true);
  assert.equal(b.data.sub, "sub_1PqRsTuVwXyZ");
  assert.deepEqual(b.data.usage, { month: "2026-10", count: 3 });
  const json = JSON.stringify(b);
  for (const k of ["pro_confirmed", "legacy", "last_export", "tq_plan"]) assert.ok(!json.includes(k), k);
});
await test("export from empty browser + file name", () => {
  const b = backup.buildBackup(store({ tq_sub: "pro", tq_history: "not json" }), oct);
  assert.deepEqual(b.data.history, []);
  assert.deepEqual(b.data.company, {});
  assert.equal(b.data.sub, undefined);
  assert.equal(backup.backupFileName("fr", oct), "tradequote-sauvegarde-2026-10-02.json");
  assert.equal(backup.backupFileName("en", oct), "tradequote-backup-2026-10-02.json");
});
await test("round trip: export -> parse", () => {
  const b = backup.buildBackup(store(fullStore), oct);
  const r = backup.parseBackup(JSON.stringify(b, null, 2));
  assert.equal(r.ok, true);
  assert.deepEqual(r.backup.data, b.data);
  assert.equal(r.skipped, 0);
});
await test("parse: clear error codes for invalid files", () => {
  const ok = { format: "tradequote-backup", version: 1, exportedAt: "2026-10-02T00:00:00Z", data: { history: [] } };
  assert.deepEqual(backup.parseBackup("{oops"), { ok: false, error: "notJson" });
  assert.deepEqual(backup.parseBackup("   "), { ok: false, error: "empty" });
  assert.deepEqual(backup.parseBackup("[]"), { ok: false, error: "wrongApp" });
  assert.deepEqual(backup.parseBackup(JSON.stringify({ format: "facturepro-backup", version: 1, data: {} })), { ok: false, error: "wrongApp" });
  assert.deepEqual(backup.parseBackup(JSON.stringify({ ...ok, version: 4 })), { ok: false, error: "newerVersion" });
  assert.deepEqual(backup.parseBackup(JSON.stringify({ ...ok, version: "1" })), { ok: false, error: "badShape" });
  assert.deepEqual(backup.parseBackup(JSON.stringify({ ...ok, data: { history: "x" } })), { ok: false, error: "badShape" });
  assert.deepEqual(backup.parseBackup(JSON.stringify({ ...ok, data: { company: [] } })), { ok: false, error: "badShape" });
  assert.deepEqual(backup.parseBackup(JSON.stringify({ ...ok, data: null })), { ok: false, error: "badShape" });
  assert.deepEqual(backup.parseBackup("{}", 9 * 1024 * 1024), { ok: false, error: "tooLarge" });
  assert.equal(backup.parseBackup("\uFEFF" + JSON.stringify(ok)).ok, true);
});
await test("parse: invalid history entries skipped, bad sub/usage dropped", () => {
  const r = backup.parseBackup(JSON.stringify({ format: "tradequote-backup", version: 1, data: {
    history: [doc("a", "S-1"), { id: "b", type: "hack", number: "x", total: 1 }, null, { id: 5, type: "invoice", number: "F-9", total: "12" }, { id: 6, type: "invoice", number: "F-6", total: 12 }],
    sub: "sub_../../x", usage: { month: "2026-10", count: -4 }, lang: "de" } }));
  assert.equal(r.ok, true);
  assert.deepEqual(r.backup.data.history.map((d) => d.id), ["a", "6"]);
  assert.equal(r.skipped, 3);
  assert.equal(r.backup.data.sub, undefined);
  assert.equal(r.backup.data.usage, undefined);
  assert.equal(r.backup.data.lang, undefined);
});
await test("merge history: no duplicates by id or by type+number, current copy wins, newest first", () => {
  const cur = [doc("1", "S-2026-1001", "2026-10-01"), doc("2", "F-2026-2002", "2026-09-01", "invoice")];
  const inc = [doc("1", "S-2026-1001", "2026-10-01", "quote", 999), doc("99", "s-2026-1001 "), doc("3", "S-2026-3003", "2026-09-20"), doc("4", "F-2026-1001", "2026-08-01", "invoice")];
  const m = backup.mergeHistory(cur, inc);
  assert.deepEqual(m.history.map((d) => d.id), ["1", "3", "2", "4"]);
  assert.equal(m.history[0].total, 100);
  assert.equal(m.added, 2);
  assert.equal(m.duplicates, 2);
});
await test("merge history is capped", () => {
  const many = Array.from({ length: backup.MAX_HISTORY + 20 }, (_, i) => doc(String(i), "S-" + i));
  assert.equal(backup.mergeHistory([], many).history.length, backup.MAX_HISTORY);
});
const fileFrom = (data) => backup.parseBackup(JSON.stringify({ format: "tradequote-backup", version: 1, exportedAt: oct.toISOString(), data })).backup;
await test("import merge: keeps filled company fields, fills empty ones, keeps explicit lang", () => {
  const cur = store({ tq_history: JSON.stringify([doc("1", "S-1")]), tq_company: JSON.stringify({ name: "Ici", rbq: "" }), tq_lang: "fr", tq_lang_choice: "1" });
  const p = backup.planImport(cur, fileFrom({ history: [doc("2", "S-2", "2026-10-02")], company: { name: "Fichier", rbq: "1234-5678-01" }, lang: "en", langChoice: true }), "merge", oct);
  assert.deepEqual(p.history.map((d) => d.id), ["2", "1"]);
  assert.equal(p.company.name, "Ici");
  assert.equal(p.company.rbq, "1234-5678-01");
  assert.equal(p.lang, null);
  assert.equal(p.set.tq_lang, undefined);
  assert.equal(JSON.parse(p.set.tq_history).length, 2);
});
await test("import replace: file wins for history, company, lang", () => {
  const cur = store({ tq_history: JSON.stringify([doc("1", "S-1")]), tq_company: JSON.stringify({ name: "Ici", phone: "819" }), tq_lang: "fr", tq_lang_choice: "1" });
  const p = backup.planImport(cur, fileFrom({ history: [doc("2", "S-2")], company: { name: "Fichier" }, lang: "en", langChoice: true }), "replace", oct);
  assert.deepEqual(p.history.map((d) => d.id), ["2"]);
  assert.deepEqual(p.company, { name: "Fichier" });
  assert.equal(p.set.tq_lang, "en");
  assert.equal(p.set.tq_lang_choice, "1");
});
await test("import never lowers the free monthly counter", () => {
  const f = (usage) => fileFrom({ history: [], usage });
  // file says 0 / older month -> current kept
  assert.equal(backup.planImport(store({ tq_count: "4", tq_count_month: "2026-10" }), f({ month: "2026-09", count: 1 }), "replace", oct).count, 4);
  assert.equal(backup.planImport(store({ tq_count: "4", tq_count_month: "2026-10" }), f(undefined), "replace", oct).count, 4);
  assert.equal(backup.planImport(store({ tq_count: "4", tq_count_month: "2026-10" }), f({ month: "2026-10", count: 2 }), "merge", oct).count, 4);
  // file has a higher count this month -> raised (moving devices doesn't grant a fresh quota)
  const p = backup.planImport(store({}), f({ month: "2026-10", count: 5 }), "merge", oct);
  assert.equal(p.count, 5);
  assert.equal(p.set.tq_count, "5");
  assert.equal(p.set.tq_count_month, "2026-10");
  // stale current month counts as 0
  assert.equal(backup.planImport(store({ tq_count: "5", tq_count_month: "2026-09" }), f(undefined), "merge", oct).count, 0);
});
await test("import subscription id: carried over, re-verification forced, never legacy/confirmed flags", () => {
  const file = fileFrom({ history: [], sub: "sub_NEWsubscription1" });
  const p = backup.planImport(store({}), file, "merge", oct);
  assert.equal(p.set.tq_sub, "sub_NEWsubscription1");
  assert.equal(p.subChanged, true);
  assert.deepEqual(p.remove, ["tq_pro_confirmed_at"]);
  for (const k of Object.keys(p.set)) assert.ok(!["tq_pro_confirmed_at", "tq_legacy_pro", "tq_plan"].includes(k), k);
  // merge keeps an existing valid subscription; replace takes the file's
  assert.equal(backup.planImport(store({ tq_sub: "sub_OLDsubscription1" }), file, "merge", oct).subChanged, false);
  assert.equal(backup.planImport(store({ tq_sub: "sub_OLDsubscription1" }), file, "replace", oct).set.tq_sub, "sub_NEWsubscription1");
  assert.equal(backup.planImport(store({ tq_sub: "sub_NEWsubscription1" }), file, "replace", oct).subChanged, false);
});
await test("export reminder: only when data is > 30 days old and no export/snooze in 30 days", () => {
  const now = Date.UTC(2026, 9, 2);
  const day = 86400000;
  const old = [doc(String(now - 40 * day), "S-1")];
  const fresh = [doc(String(now - 5 * day), "S-1")];
  assert.equal(backup.exportReminderDue({ lastExport: null, snoozedAt: null, history: [], now }), false);
  assert.equal(backup.exportReminderDue({ lastExport: null, snoozedAt: null, history: fresh, now }), false);
  assert.equal(backup.exportReminderDue({ lastExport: null, snoozedAt: null, history: old, now }), true);
  assert.equal(backup.exportReminderDue({ lastExport: String(now - 10 * day), snoozedAt: null, history: old, now }), false);
  assert.equal(backup.exportReminderDue({ lastExport: String(now - 31 * day), snoozedAt: null, history: old, now }), true);
  assert.equal(backup.exportReminderDue({ lastExport: String(now - 31 * day), snoozedAt: String(now - day), history: old, now }), false);
});

/* ───────── full documents (backup v2) ───────── */
const accounting = await load("lib/accounting.ts");
const schedule = await load("lib/schedule.ts");
const full = (over = {}) => {
  const items = over.items ?? [{ description: "Bardeaux d'asphalte (par paquet)", quantity: 30, unitPrice: 42.5 }, { description: "Main-d'œuvre – pose (par heure)", quantity: 16, unitPrice: 65 }];
  const t = docsLib.computeTotals(items, over.discountPct ?? 0, over.taxPreset ?? "gst-qst-qc", 0, over.depositPct ?? 0, "fr");
  return { client: { name: "Jean Tremblay", address: "12 rue Principale", city: "Mont-Laurier", email: "jean@example.com" }, jobSite: "12 rue Principale, Mont-Laurier", jobDate: "2026-10-15", jobEndDate: "2026-10-16", due: "2026-10-31", notes: "Merci", items, taxPreset: over.taxPreset ?? "gst-qst-qc", customRate: 0, discountPct: over.discountPct ?? 0, depositPct: over.depositPct ?? 0, ...t };
};
const fdoc = (id, number, date, type = "invoice", over) => { const d = full(over); return { id, type, number, clientName: d.client.name, total: d.total, date, doc: d }; };
console.log("full documents / backup v2");
await test("computeTotals: TPS/TVQ on 2 315 $ with 10 % discount and 30 % deposit", () => {
  const t = docsLib.computeTotals([{ description: "a", quantity: 1, unitPrice: 2315 }], 10, "gst-qst-qc", 0, 30, "fr");
  assert.equal(t.subtotal, 2315); assert.equal(t.discountAmount, 231.5);
  assert.deepEqual(t.taxLines.map((l) => [l.code, l.amount]), [["gst", 104.18], ["qst", 207.83]]);
  assert.equal(t.total, 2395.51); assert.equal(t.depositAmt, 718.65); assert.equal(t.balance, 1676.86);
});
await test("v2 export/parse keeps the full document; v1 summary entries still accepted", () => {
  const h = [fdoc("1790000000003", "F-2026-0001", "2026-10-02"), doc("1790000000001", "S-2026-1001")];
  const b = backup.buildBackup(store({ tq_history: JSON.stringify(h) }), oct);
  assert.equal(b.version, 3);
  const r = backup.parseBackup(JSON.stringify(b));
  assert.equal(r.ok, true);
  assert.deepEqual(r.backup.data.history[0].doc.items, h[0].doc.items);
  assert.equal(r.backup.data.history[0].doc.taxLines[1].code, "qst");
  assert.equal(r.backup.data.history[1].doc, undefined);
  const v1 = backup.parseBackup(JSON.stringify({ format: "tradequote-backup", version: 1, exportedAt: "2026-09-01T00:00:00Z", data: { history: [doc("5", "S-2026-0005")], company: { name: "Vieux" } } }));
  assert.equal(v1.ok, true); assert.equal(v1.backup.data.history.length, 1); assert.equal(v1.backup.data.history[0].doc, undefined);
});
await test("sanitizeFullDoc drops junk and caps sizes", () => {
  assert.equal(docsLib.sanitizeFullDoc(null), undefined);
  assert.equal(docsLib.sanitizeFullDoc({ items: "x" }), undefined);
  const d = docsLib.sanitizeFullDoc({ items: [{ description: 5, quantity: "2", unitPrice: 3 }, null], jobDate: "15/10/2026", client: { name: "<b>" }, total: NaN });
  assert.deepEqual(d.items, [{ description: "", quantity: 0, unitPrice: 3 }]);
  assert.equal(d.jobDate, ""); assert.equal(d.total, 0); assert.equal(d.client.name, "<b>");
});
await test("merge: summary-only entry is completed by the file's full copy", () => {
  const cur = [doc("1", "F-2026-0001", "2026-10-01", "invoice")];
  const m = backup.mergeHistory(cur, [fdoc("1", "F-2026-0001", "2026-10-01")]);
  assert.equal(m.added, 0); assert.equal(m.duplicates, 1); assert.equal(m.upgraded, 1);
  assert.ok(m.history[0].doc);
  // a full current copy is never replaced
  const m2 = backup.mergeHistory([fdoc("1", "F-2026-0001", "2026-10-01")], [fdoc("1", "F-2026-0001", "2026-10-01", "invoice", { discountPct: 50 })]);
  assert.equal(m2.upgraded, 0); assert.equal(m2.history[0].doc.discountPct, 0);
});
await test("upsertHistory + nextDocNumber", () => {
  const h = [fdoc("1", "F-2026-0007", "2026-10-01"), doc("2", "S-2026-4821")];
  assert.equal(docsLib.nextDocNumber(h, "invoice", "fr", oct), "F-2026-0008");
  assert.equal(docsLib.nextDocNumber(h, "quote", "fr", oct), "S-2026-4822");
  assert.equal(docsLib.nextDocNumber([], "quote", "en", oct), "Q-2026-0001");
  const up = docsLib.upsertHistory(h, { ...fdoc("9", "f-2026-0007 ", "2026-10-03"), clientName: "Jean Tremblay" }, 500);
  assert.equal(up.isNew, false); assert.equal(up.history.length, 2); assert.equal(up.history[0].id, "1"); assert.equal(up.history[0].date, "2026-10-03");
  const add = docsLib.upsertHistory(h, fdoc("9", "F-2026-0008", "2026-10-03"), 500);
  assert.equal(add.isNew, true); assert.equal(add.history.length, 3);
});

/* ───────── clients + logo (backup v3) ───────── */
console.log("clients / logo / backup v3");
const { clientKey } = clientsLib;
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
await test("clientKey ignores case, accents and spacing", () => {
  assert.equal(clientKey("  Jean   TRÉMBLAY "), clientKey("jean tremblay"));
  assert.notEqual(clientKey("Jean Tremblay"), clientKey("Jeanne Tremblay"));
});
await test("upsertClient: adds, updates, empty fields never erase, most recent first, skips 'Client'", () => {
  let l = clientsLib.upsertClient([], { name: "Jean Tremblay", address: "12 rue Principale", city: "Mont-Laurier", email: "jean@example.com", phone: "819-555-0101" }, 1);
  l = clientsLib.upsertClient(l, { name: "Marie Côté", city: "Ferme-Neuve" }, 2);
  assert.deepEqual(l.map((c) => c.name), ["Marie Côté", "Jean Tremblay"]);
  const id = l[1].id;
  l = clientsLib.upsertClient(l, { name: "jean tremblay", address: "", phone: "819-555-9999" }, 3);
  assert.equal(l.length, 2); assert.equal(l[0].id, id); assert.equal(l[0].name, "jean tremblay");
  assert.equal(l[0].address, "12 rue Principale"); assert.equal(l[0].phone, "819-555-9999"); assert.equal(l[0].updatedAt, 3);
  assert.equal(clientsLib.upsertClient(l, { name: "  " }).length, 2);
  assert.equal(clientsLib.upsertClient(l, { name: "Client" }).length, 2);
  assert.equal(clientsLib.findClient(l, "MARIE COTE").city, "Ferme-Neuve");
  assert.equal(clientsLib.findClient(l, ""), undefined);
});
await test("sanitizeClients: junk dropped, duplicates removed, capped", () => {
  const l = clientsLib.sanitizeClients([{ name: "A", phone: 5 }, null, { name: "" }, { name: "a " }, "x", { name: "B", email: "b@x.ca", evil: 1 }]);
  assert.deepEqual(l.map((c) => c.name), ["A", "B"]);
  assert.equal(l[0].phone, ""); assert.equal(l[1].evil, undefined);
  assert.deepEqual(clientsLib.sanitizeClients("x"), []);
  assert.equal(clientsLib.sanitizeClients(Array.from({ length: clientsLib.MAX_CLIENTS + 5 }, (_, i) => ({ name: "C" + i }))).length, clientsLib.MAX_CLIENTS);
});
await test("mergeClients: adds new ones, fills only empty fields", () => {
  const cur = clientsLib.sanitizeClients([{ id: "1", name: "Jean Tremblay", phone: "", email: "ici@x.ca" }]);
  const inc = clientsLib.sanitizeClients([{ id: "9", name: "JEAN TREMBLAY", phone: "819", email: "fichier@x.ca" }, { id: "2", name: "Marie" }]);
  const m = clientsLib.mergeClients(cur, inc);
  assert.equal(m.added, 1); assert.equal(m.clients.length, 2);
  assert.equal(m.clients[0].phone, "819"); assert.equal(m.clients[0].email, "ici@x.ca"); assert.equal(m.clients[0].id, "1");
});
await test("logo: only PNG/JPEG data URLs within the size limit", () => {
  assert.deepEqual(logoLib.sanitizeLogo({ dataUrl: PNG, w: 1, h: 1 }), { dataUrl: PNG, w: 1, h: 1 });
  assert.equal(logoLib.sanitizeLogo({ dataUrl: PNG.replace("png", "svg+xml"), w: 1, h: 1 }), null);
  assert.equal(logoLib.sanitizeLogo({ dataUrl: "javascript:alert(1)", w: 1, h: 1 }), null);
  assert.equal(logoLib.sanitizeLogo({ dataUrl: PNG, w: 0, h: 1 }), null);
  assert.equal(logoLib.sanitizeLogo({ dataUrl: "data:image/png;base64," + "A".repeat(logoLib.MAX_LOGO_CHARS), w: 1, h: 1 }), null);
  assert.equal(logoLib.logoFormat({ dataUrl: PNG, w: 1, h: 1 }), "PNG");
  assert.equal(logoLib.logoFormat({ dataUrl: "data:image/jpeg;base64,AAAA", w: 1, h: 1 }), "JPEG");
});
await test("logo: resize target (never upscaled) and fit in the PDF box", () => {
  assert.deepEqual(logoLib.resizeTarget(2400, 1200), { w: 600, h: 300 });
  assert.deepEqual(logoLib.resizeTarget(300, 900), { w: 200, h: 600 });
  assert.deepEqual(logoLib.resizeTarget(120, 80), { w: 120, h: 80 });
  assert.deepEqual(logoLib.fitLogo({ w: 600, h: 300 }, 40, 24), { w: 40, h: 20 });
  assert.deepEqual(logoLib.fitLogo({ w: 100, h: 200 }, 40, 24), { w: 12, h: 24 });
});
const v3Store = { tq_clients: JSON.stringify([{ id: "c1", name: "Jean Tremblay", address: "12 rue Principale", city: "Mont-Laurier", email: "jean@example.com", phone: "819-555-0101", updatedAt: 1 }]), tq_logo: JSON.stringify({ dataUrl: PNG, w: 1, h: 1 }) };
await test("backup v3: clients + logo exported and parsed back", () => {
  const b = backup.buildBackup(store(v3Store), oct);
  assert.equal(b.version, 3);
  assert.equal(b.data.clients[0].phone, "819-555-0101");
  assert.equal(b.data.logo.dataUrl, PNG);
  const r = backup.parseBackup(JSON.stringify(b));
  assert.equal(r.ok, true); assert.deepEqual(r.backup.data, b.data);
  assert.deepEqual(backup.parseBackup(JSON.stringify({ ...b, data: { clients: "x" } })), { ok: false, error: "badShape" });
  const bad = backup.parseBackup(JSON.stringify({ ...b, data: { logo: { dataUrl: "data:text/html;base64,AAAA", w: 1, h: 1 } } }));
  assert.equal(bad.ok, true); assert.equal(bad.backup.data.logo, undefined);
});
await test("import v3: merge adds clients and keeps the current logo; replace takes the file's", () => {
  const file = backup.parseBackup(JSON.stringify(backup.buildBackup(store(v3Store), oct))).backup;
  const otherLogo = JSON.stringify({ dataUrl: "data:image/jpeg;base64,AAAA", w: 2, h: 2 });
  const cur = store({ tq_clients: JSON.stringify([{ id: "x", name: "Marie Côté" }]), tq_logo: otherLogo });
  const m = backup.planImport(cur, file, "merge", oct);
  assert.equal(m.clientsAdded, 1); assert.deepEqual(m.clients.map((c) => c.name), ["Marie Côté", "Jean Tremblay"]);
  assert.equal(m.logo.w, 2); assert.equal(m.set.tq_logo, undefined);
  assert.equal(JSON.parse(m.set.tq_clients).length, 2);
  const rp = backup.planImport(cur, file, "replace", oct);
  assert.deepEqual(rp.clients.map((c) => c.name), ["Jean Tremblay"]); assert.equal(rp.logo.dataUrl, PNG);
  assert.equal(JSON.parse(rp.set.tq_logo).dataUrl, PNG);
  // file without a logo in replace mode removes it; empty browser takes the file's logo on merge
  const noLogo = backup.parseBackup(JSON.stringify(backup.buildBackup(store({ tq_clients: v3Store.tq_clients }), oct))).backup;
  assert.ok(backup.planImport(cur, noLogo, "replace", oct).remove.includes("tq_logo"));
  assert.equal(backup.planImport(store({}), file, "merge", oct).logo.dataUrl, PNG);
});
await test("import v1/v2 files: still accepted, replace keeps this browser's clients and logo", () => {
  const cur = store(v3Store);
  for (const version of [1, 2]) {
    const f = backup.parseBackup(JSON.stringify({ format: "tradequote-backup", version, exportedAt: "2026-09-01T00:00:00Z", data: { history: [doc("5", "S-2026-0005")], company: { name: "Vieux" } } }));
    assert.equal(f.ok, true);
    const p = backup.planImport(cur, f.backup, "replace", oct);
    assert.deepEqual(p.clients.map((c) => c.name), ["Jean Tremblay"]); assert.equal(p.logo.dataUrl, PNG);
    assert.ok(!p.remove.includes("tq_logo")); assert.equal(p.history.length, 1); assert.equal(p.company.name, "Vieux");
  }
});
await test("client phone kept in full documents", () => {
  const d = docsLib.sanitizeFullDoc({ ...full(), client: { name: "Jean", phone: "819-555-0101" } });
  assert.equal(d.client.phone, "819-555-0101");
  assert.equal(docsLib.sanitizeFullDoc({ ...full(), client: { name: "Jean" } }).client.phone, "");
});

console.log("accounting export");
await test("selectDocs: date range, invoices only, summary entries counted as skipped", () => {
  const h = [fdoc("1", "F-2026-0002", "2026-10-02"), fdoc("2", "F-2026-0001", "2026-09-30"), fdoc("3", "S-2026-0001", "2026-10-01", "quote"), doc("4", "F-2026-0900", "2026-10-01", "invoice"), fdoc("5", "F-2025-0001", "2025-12-31")];
  const r = accounting.selectDocs(h, { from: "2026-09-30", to: "2026-10-31" });
  assert.deepEqual(r.docs.map((d) => d.number), ["F-2026-0001", "F-2026-0002"]);
  assert.equal(r.skippedSummary, 1);
  assert.equal(accounting.selectDocs(h, { from: "2026-10-01" }, ["invoice", "quote"]).docs.length, 2);
});
const qboOpts = { product: "Services", sitePrefix: "Chantier : ", discountNote: (p) => `(remise ${p} % incluse)` };
await test("QBO CSV: headers, one row per line, DD/MM/YYYY, no BOM, tax code", () => {
  const { csv, invoices, rows } = accounting.buildQboCsv([fdoc("1", "F-2026-0001", "2026-10-02")], qboOpts);
  const lines = csv.trimEnd().split("\r\n");
  assert.equal(csv.charCodeAt(0), "I".charCodeAt(0));
  assert.equal(lines[0], "InvoiceNo,Customer,InvoiceDate,DueDate,Terms,Location,Memo,Item(Product/Service),ItemDescription,ItemQuantity,ItemRate,ItemAmount,ItemTaxCode");
  assert.equal(invoices, 1); assert.equal(rows, 2);
  assert.equal(lines[1], "F-2026-0001,Jean Tremblay,02/10/2026,31/10/2026,,,\"Chantier : 12 rue Principale, Mont-Laurier\",Services,Bardeaux d'asphalte (par paquet),30,42.5,1275.00,TPS/TVQ QC");
  assert.equal(lines[2].split(",").slice(-4).join(","), "16,65,1040.00,TPS/TVQ QC");
});
await test("QBO CSV: discount folded into line amounts, sum = pre-tax amount", () => {
  const d = fdoc("1", "F-2026-0003", "2026-10-02", "invoice", { discountPct: 7.5, items: [{ description: "A", quantity: 3, unitPrice: 33.33 }, { description: "B", quantity: 1, unitPrice: 0.05 }, { description: "", quantity: 0, unitPrice: 0 }] });
  const lines = accounting.netLines(d.doc);
  assert.equal(lines.length, 2);
  const sum = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
  assert.equal(sum, Math.round((d.doc.subtotal - d.doc.discountAmount) * 100) / 100);
  assert.ok(lines.every((l) => l.quantity === 1 && l.rate === l.amount));
  const { csv } = accounting.buildQboCsv([d], qboOpts);
  assert.ok(csv.includes("A (remise 7.5 % incluse)"));
  assert.ok(!/,-\d/.test(csv));
});
await test("QBO tax codes per preset", () => {
  assert.equal(accounting.qboTaxCode({ taxPreset: "hst-on", customRate: 0 }), "TVH ON");
  assert.equal(accounting.qboTaxCode({ taxPreset: "none", customRate: 0 }), "Exonéré");
  assert.equal(accounting.qboTaxCode({ taxPreset: "custom", customRate: 8.5 }), "Taxe 8,5 %");
});
await test("Excel CSV (fr): BOM, ';' separator, ',' decimals, TPS/TVQ columns add up", () => {
  const d = fdoc("1", "F-2026-0001", "2026-10-02", "invoice", { depositPct: 30 });
  const csv = accounting.buildSheetCsv([d, fdoc("2", "=HYPERLINK(1)", "2026-10-03", "quote")], "fr");
  assert.equal(csv.charCodeAt(0), 0xfeff);
  const [head, row, row2] = csv.slice(1).trimEnd().split("\r\n").map((l) => l.split(";"));
  const col = (n) => row[head.indexOf(n)];
  assert.equal(col("TPS"), "115,75"); assert.equal(col("TVQ"), "230,92"); assert.equal(col("Montant avant taxes"), "2315,00");
  assert.equal(col("Total"), "2661,67"); assert.equal(col("Acompte demandé"), "798,50"); assert.equal(col("Solde dû"), "1863,17");
  assert.equal(col("TVH"), "0,00"); assert.equal(col("Taxes appliquées"), "TPS 5 % + TVQ 9,975 %");
  assert.equal(row2[0], "Soumission"); assert.equal(row2[1], "'=HYPERLINK(1)");
  const en = accounting.buildSheetCsv([d], "en").slice(1).split("\r\n")[1].split(",");
  assert.ok(en.includes("115.75") && en.includes("2661.67"));
});

console.log("share / calendar");
const si = { lang: "fr", docType: "quote", number: "S-2026-0001", clientName: "Jean Tremblay", clientEmail: "jean@example.com", clientAddress: "12 rue Principale, Mont-Laurier", jobSite: "45, ch. du Lac; Ferme-Neuve", jobDate: "2026-10-15", jobEndDate: "2026-10-16", total: "2 661,67 $", companyName: "Toitures Nord", companyPhone: "819-555-0000" };
await test("mailto: recipient, subject, body with CRLF, no attachment text in the message", () => {
  const m = schedule.mailtoLink(si);
  assert.ok(m.startsWith("mailto:jean%40example.com?subject="));
  const q = new URLSearchParams(m.split("?")[1]);
  assert.equal(q.get("subject"), "Soumission n° S-2026-0001 – Toitures Nord");
  const body = q.get("body");
  assert.ok(body.includes("Bonjour Jean Tremblay,\r\n"));
  assert.ok(body.includes("au montant de 2 661,67 $ (taxes incluses)"));
  assert.ok(body.includes("Date prévue des travaux : jeudi 15 octobre 2026 au vendredi 16 octobre 2026"));
  assert.ok(!/joindre|attach/i.test(body));
});
await test("Google Calendar link: all-day span with exclusive end, location, Toronto tz", () => {
  const u = new URL(schedule.googleCalendarUrl(si));
  assert.equal(u.origin + u.pathname, "https://calendar.google.com/calendar/render");
  assert.equal(u.searchParams.get("action"), "TEMPLATE");
  assert.equal(u.searchParams.get("dates"), "20261015/20261017");
  assert.equal(u.searchParams.get("location"), "45, ch. du Lac; Ferme-Neuve");
  assert.equal(u.searchParams.get("text"), "Travaux – Jean Tremblay (S-2026-0001)");
  assert.equal(schedule.googleCalendarUrl({ ...si, jobDate: "" }), null);
  assert.equal(new URL(schedule.googleCalendarUrl({ ...si, jobEndDate: "2026-10-01" })).searchParams.get("dates"), "20261015/20261016");
  assert.equal(new URL(schedule.googleCalendarUrl({ ...si, jobDate: "2026-12-31", jobEndDate: "" })).searchParams.get("dates"), "20261231/20270101");
});
await test(".ics: RFC 5545 structure, escaping, CRLF, folding at 75 octets", () => {
  const ics = schedule.buildIcs({ ...si, clientName: "Jean Tremblay ".repeat(6).trim() }, new Date(Date.UTC(2026, 9, 3, 17, 5, 9)));
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"));
  assert.ok(ics.endsWith("END:VEVENT\r\nEND:VCALENDAR\r\n"));
  assert.ok(ics.includes("DTSTART;VALUE=DATE:20261015\r\nDTEND;VALUE=DATE:20261017\r\n"));
  assert.ok(ics.includes("DTSTAMP:20261003T170509Z"));
  assert.ok(ics.includes("LOCATION:45\\, ch. du Lac\\; Ferme-Neuve"));
  assert.ok(!/\r(?!\n)|(?<!\r)\n/.test(ics), "only CRLF");
  for (const line of ics.split("\r\n")) assert.ok(new TextEncoder().encode(line).length <= 75, line);
  const unfolded = ics.replace(/\r\n /g, "");
  assert.ok(unfolded.includes("SUMMARY:Travaux – " + "Jean Tremblay ".repeat(6).trim() + " (S-2026-0001)"));
  assert.equal(schedule.icsFileName(si), "travaux-S-2026-0001.ics");
  assert.equal(schedule.buildIcs({ ...si, jobDate: "" }), null);
});

fs.rmSync(tmp, { recursive: true, force: true });
console.log(process.exitCode ? "FAILED" : `\n${passed} tests passed`);
