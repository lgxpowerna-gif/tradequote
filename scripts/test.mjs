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
  assert.equal(b.version, 1);
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
  assert.deepEqual(backup.parseBackup(JSON.stringify({ ...ok, version: 2 })), { ok: false, error: "newerVersion" });
  assert.deepEqual(backup.parseBackup(JSON.stringify({ ...ok, version: "1" })), { ok: false, error: "badShape" });
  assert.deepEqual(backup.parseBackup(JSON.stringify({ ...ok, data: { history: "x" } })), { ok: false, error: "badShape" });
  assert.deepEqual(backup.parseBackup(JSON.stringify({ ...ok, data: { company: [] } })), { ok: false, error: "badShape" });
  assert.deepEqual(backup.parseBackup(JSON.stringify({ ...ok, data: null })), { ok: false, error: "badShape" });
  assert.deepEqual(backup.parseBackup("{}", 6 * 1024 * 1024), { ok: false, error: "tooLarge" });
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

fs.rmSync(tmp, { recursive: true, force: true });
console.log(process.exitCode ? "FAILED" : `\n${passed} tests passed`);
