"use client";
import { useEffect, useState } from "react";

const PREFIX = "tq";
const CONTACT = "lgxpowerna@gmail.com";
type LL = "fr" | "en" | "zh" | "ar";
const M = {
  fr: { confirm: "Effacer toutes vos données TradeQuote de ce navigateur (entreprise, clients, historique, abonnement mémorisé) ? Cette action est irréversible.", deleted: "Données effacées ✓", del: "Effacer mes données de ce navigateur", subj: "Annulation abonnement TradeQuote", none: "Aucun abonnement Pro n'est mémorisé dans ce navigateur. Pour gérer ou annuler votre abonnement, écrivez-nous (voir ci-dessous).", manage: "Gérer / annuler mon abonnement", err: "Le portail n'est pas disponible. Pour annuler, écrivez à " },
  en: { confirm: "Delete all your TradeQuote data from this browser (business, clients, history, remembered subscription)? This cannot be undone.", deleted: "Data deleted ✓", del: "Delete my data from this browser", subj: "Cancel TradeQuote subscription", none: "No Pro subscription is remembered in this browser. To manage or cancel it, email us (see below).", manage: "Manage / cancel my subscription", err: "The portal is unavailable. To cancel, email " },
  zh: { confirm: "从此浏览器中删除您的全部 TradeQuote 数据（企业、客户、历史记录、已记住的订阅）？此操作无法撤销。", deleted: "数据已删除 ✓", del: "删除此浏览器中的我的数据", subj: "Cancel TradeQuote subscription", none: "此浏览器中没有记住的 Pro 订阅。如需管理或取消订阅，请给我们发邮件（见下文）。", manage: "管理 / 取消我的订阅", err: "门户暂不可用。如需取消，请发邮件至 " },
  ar: { confirm: "حذف كل بيانات TradeQuote من هذا المتصفح (الشركة والعملاء والسجل والاشتراك المحفوظ)؟ لا يمكن التراجع عن ذلك.", deleted: "تم حذف البيانات ✓", del: "حذف بياناتي من هذا المتصفح", subj: "Cancel TradeQuote subscription", none: "لا يوجد اشتراك Pro محفوظ في هذا المتصفح. لإدارته أو إلغائه، راسلنا (انظر أدناه).", manage: "إدارة / إلغاء اشتراكي", err: "البوابة غير متاحة. للإلغاء، راسلنا على " },
};

/** Deletes every TradeQuote key from this browser's localStorage. */
export function ClearDataButton({ lang }: { lang: LL }) {
  const m = M[lang];
  const [done, setDone] = useState(false);
  const clear = () => {
    const ok = window.confirm(m.confirm);
    if (!ok) return;
    Object.keys(localStorage)
      .filter((k) => k.startsWith(`${PREFIX}_`))
      .forEach((k) => localStorage.removeItem(k));
    setDone(true);
  };
  return (
    <button onClick={clear} className="mt-2 border border-red-300 text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium">
      {done ? m.deleted : m.del}
    </button>
  );
}

/** "Manage / cancel my subscription": opens the Stripe customer portal for the subscription remembered in this browser. */
export function ManageSubscription({ lang, compact = false }: { lang: LL; compact?: boolean }) {
  const m = M[lang];
  const [sub, setSub] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  useEffect(() => {
    try {
      const s = localStorage.getItem(`${PREFIX}_sub`);
      if (s && /^sub_[A-Za-z0-9]{8,}$/.test(s)) setSub(s);
    } catch {
      /* ignore */
    }
  }, []);
  const mailto = `mailto:${CONTACT}?subject=${encodeURIComponent(m.subj)}`;
  if (!sub) {
    return compact ? null : (
      <p className="text-sm text-slate-600">
        {m.none}
      </p>
    );
  }
  const open = async () => {
    setState("loading");
    try {
      const r = await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: sub, lang }),
      });
      const d = await r.json();
      if (d.url) {
        window.location.href = d.url;
        return;
      }
      setState("error");
    } catch {
      setState("error");
    }
  };
  return (
    <div className={compact ? "inline-block" : ""}>
      <button
        onClick={open}
        disabled={state === "loading"}
        className={compact ? "text-xs text-slate-600 underline hover:text-slate-900" : "bg-slate-900 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"}
      >
        {state === "loading" ? "…" : m.manage}
      </button>
      {state === "error" && (
        <p className="text-xs text-red-600 mt-1">
          {m.err}
          <a href={mailto} className="underline">{CONTACT}</a>
        </p>
      )}
    </div>
  );
}
