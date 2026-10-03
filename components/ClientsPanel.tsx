"use client";
import { useState } from "react";
import type { i18n, Lang } from "@/lib/i18n";
import { CLIENT_FIELDS, clientKey, type ClientField, type SavedClient } from "@/lib/clients";

type T = (typeof i18n)[Lang];

/** Client list: search, edit, delete, start a new quote for a client. */
export function ClientsPanel({ t, clients, onSave, onDelete, onNewQuote }: {
  t: T;
  clients: SavedClient[];
  onSave: (c: SavedClient) => void;
  onDelete: (id: string) => void;
  onNewQuote: (c: SavedClient) => void;
}) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<SavedClient | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const k = clientKey(q);
  const shown = k ? clients.filter((c) => CLIENT_FIELDS.some((f) => clientKey(c[f]).includes(k))) : clients;
  const label: Record<ClientField, string> = { name: t.clientName, address: t.address, city: t.city, email: t.email, phone: t.phone };
  const save = () => {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) return;
    if (clients.some((c) => c.id !== editing.id && clientKey(c.name) === clientKey(name))) { setErr(t.clientExists); return; }
    onSave({ ...editing, name, updatedAt: Date.now() }); setEditing(null); setErr(null);
  };
  const inp = "w-full border rounded-lg px-3 py-2 text-sm";
  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">{t.clientsTitle}</h2>
      <p className="text-sm text-slate-500 mb-4">{clients.length} {t.clientsCount} · {t.clientsNote}</p>
      {clients.length > 0 && <input placeholder={t.clientsSearch} value={q} onChange={(e) => setQ(e.target.value)} className={`${inp} mb-4 max-w-md`} data-testid="clients-search" />}
      {clients.length === 0 ? (
        <div className="bg-white border rounded-2xl p-10 text-center text-slate-500">{t.clientsEmpty}</div>
      ) : (
        <ul className="space-y-2" data-testid="clients-list">
          {shown.map((c) => (
            <li key={c.id} className="bg-white border rounded-xl p-4">
              {editing?.id === c.id ? (
                <div className="grid sm:grid-cols-2 gap-2">
                  {CLIENT_FIELDS.map((f) => (
                    <label key={f} className="text-[11px] text-slate-500">{label[f]}
                      <input value={editing[f]} onChange={(e) => setEditing({ ...editing, [f]: e.target.value })} className={inp} data-testid={`client-edit-${f}`} />
                    </label>
                  ))}
                  {err && <p role="alert" className="sm:col-span-2 text-xs text-red-600">{err}</p>}
                  <div className="sm:col-span-2 flex gap-2 pt-1">
                    <button type="button" onClick={save} className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg">{t.save}</button>
                    <button type="button" onClick={() => { setEditing(null); setErr(null); }} className="text-sm text-slate-500 px-3">{t.cancel}</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 text-sm">
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-slate-500 text-xs">{[c.address, c.city].filter(Boolean).join(", ")}</div>
                    <div className="text-slate-500 text-xs">{[c.email, c.phone].filter(Boolean).join(" · ")}</div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <button type="button" onClick={() => onNewQuote(c)} className="text-blue-600 font-medium hover:underline">{t.newQuoteFor}</button>
                    <button type="button" onClick={() => { setEditing({ ...c }); setErr(null); }} className="text-blue-600 hover:underline">{t.edit}</button>
                    <button type="button" onClick={() => { if (window.confirm(t.delConfirm)) onDelete(c.id); }} className="text-red-600 hover:underline">{t.del}</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
