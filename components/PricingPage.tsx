import Link from "next/link";
import { FREE_LIMIT } from "@/lib/plan";
import { CheckoutConsent, LegalFooterLinks } from "@/components/LegalLinks";

/** Display prices — must match the Stripe prices behind STRIPE_PRICE_MONTHLY / STRIPE_PRICE_YEARLY. */
export const PRICE_MONTHLY = 19;
export const PRICE_YEARLY = 190;
/** 12 × monthly − yearly (38 $ = 2 months at 19 $). */
export const YEARLY_SAVINGS = PRICE_MONTHLY * 12 - PRICE_YEARLY;

type PLang = "fr" | "en";

const COPY = {
  fr: {
    title: "Tarifs TradeQuote",
    sub: "Soumissions et factures pour les entrepreneurs et gens de métier du Québec : licence RBQ, TPS et TVQ sur chaque document.",
    free: "Gratuit",
    pro: "Pro",
    perMonth: "/mois",
    perYear: "/an",
    yearlyNote: `ou ${PRICE_YEARLY} $/an — 2 mois gratuits (économisez ${YEARLY_SAVINGS} $)`,
    taxNote: "Prix en dollars canadiens. Taxes en sus. Paiement sécurisé par Stripe.",
    startFree: "Commencer gratuitement",
    goPro: "Passer à Pro",
    best: "Recommandé",
    freeFeatures: [`${FREE_LIMIT} documents par mois`, ...["Soumissions + factures", "Licence RBQ imprimée sur chaque document", "TPS + TVQ calculées séparément", "Acompte et Virement Interac", "Votre logo sur le PDF", "Carnet de clients (remplissage automatique)", "Historique complet : rouvrir et dupliquer vos documents", "Partager / envoyer le PDF par courriel", "Ajouter à l'agenda (Google, Outlook, Apple)", "Modèles de métiers, dont Toiture"]],
    freeMissing: ["Filigrane « Gratuit » sur le PDF", "Export comptable"],
    proFeatures: ["Soumissions et factures illimitées", "Sans filigrane", "Export comptable : CSV pour QuickBooks en ligne (import de factures)", "CSV Excel avec colonnes TPS / TVQ, filtré par période", "Tout ce qui est inclus dans le forfait gratuit", "Abonnement vérifié par Stripe"],
    faqTitle: "Questions fréquentes",
    faq: [["Pourquoi le numéro RBQ ?", "La Régie du bâtiment du Québec exige que le titulaire d'une licence inscrive son numéro sur ses soumissions, contrats et factures. TradeQuote l'imprime automatiquement en en-tête."], ["La TPS et la TVQ sont-elles calculées correctement ?", "Oui : TPS 5 % et TVQ 9,975 % calculées séparément sur le montant avant taxes, chacune arrondie au cent, avec vos numéros TPS et TVQ imprimés sur le PDF."], ["Comment fonctionne l'export comptable ?", "Dans l'Historique, choisissez une période et téléchargez un fichier CSV : un fichier pour l'import de factures de QuickBooks en ligne (une ligne par article, codes de taxe à associer lors de l'import) ou un fichier pour Excel avec une colonne TPS et une colonne TVQ. Le fichier est créé sur votre appareil. Ce n'est pas une synchronisation automatique, et il n'y a pas encore de fichier pour Sage 50 ou Acomba."], ["Faut-il créer un compte ?", "Non. Vos documents et coordonnées restent dans votre navigateur. Votre abonnement Pro est vérifié auprès de Stripe à chaque ouverture et est lié à ce navigateur pour l'instant."], ["Puis-je annuler ?", "Oui, en tout temps, sans engagement : bouton « Gérer / annuler mon abonnement » ou par courriel (page Contact). L'accès Pro reste actif jusqu'à la fin de la période payée ; aucun remboursement pour une période entamée, sauf si la loi l'exige."]],
    other: { href: "/pricing", label: "English" },
    back: "← Retour à l'application",
  },
  en: {
    title: "TradeQuote pricing",
    sub: "Quotes and invoices for Québec contractors and trades: RBQ licence, GST and QST on every document.",
    free: "Free",
    pro: "Pro",
    perMonth: "/mo",
    perYear: "/yr",
    yearlyNote: `or $${PRICE_YEARLY}/yr — 2 months free (save $${YEARLY_SAVINGS})`,
    taxNote: "Prices in Canadian dollars. Plus applicable taxes. Secure payment by Stripe.",
    startFree: "Start free",
    goPro: "Go Pro",
    best: "Recommended",
    freeFeatures: [`${FREE_LIMIT} documents per month`, ...["Quotes + invoices", "RBQ licence printed on every document", "GST + QST computed separately", "Deposit and Interac e-Transfer", "Your logo on the PDF", "Client list (auto-fill)", "Full history: reopen and duplicate your documents", "Share / email the PDF", "Add to calendar (Google, Outlook, Apple)", "Trade templates, including Roofing"]],
    freeMissing: ["“Free” watermark on the PDF", "Accounting export"],
    proFeatures: ["Unlimited quotes & invoices", "No watermark", "Accounting export: CSV for QuickBooks Online (invoice import)", "Excel CSV with GST / QST columns, filtered by date range", "Everything in the Free plan", "Subscription verified by Stripe"],
    faqTitle: "FAQ",
    faq: [["Why the RBQ number?", "Québec's Régie du bâtiment requires licence holders to show their licence number on quotes, contracts and invoices. TradeQuote prints it automatically in the header."], ["Are GST and QST calculated correctly?", "Yes: GST 5% and QST 9.975% are computed separately on the pre-tax amount, each rounded to the cent, with your GST and QST numbers printed on the PDF."], ["How does the accounting export work?", "In History, pick a date range and download a CSV file: one for QuickBooks Online's invoice import (one row per line item, tax codes matched during the import) or one for Excel with separate GST and QST columns. The file is created on your device. It is not an automatic sync, and there is no Sage 50 or Acomba file yet."], ["Do I need an account?", "No. Your documents and details stay in your browser. Your Pro subscription is verified with Stripe each time you open the app and is tied to this browser for now."], ["Can I cancel?", "Yes, anytime: “Manage / cancel my subscription” button or by email (Contact page). Pro stays active until the end of the paid period; no refund for partial periods unless required by law."]],
    other: { href: "/tarifs", label: "Français" },
    back: "← Back to the app",
  },
} as const;

export default function PricingPage({ lang }: { lang: PLang }) {
  const c = COPY[lang];
  const price = (n: number) => (lang === "fr" ? `${n} $` : `$${n}`);
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex justify-between items-center mb-8 text-sm">
          <Link href="/" className="text-blue-600 hover:underline">{c.back}</Link>
          <Link href={c.other.href} className="text-slate-500 hover:underline">{c.other.label}</Link>
        </div>
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{c.title}</h1>
          <p className="text-slate-600">{c.sub}</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">{c.free}</h2>
            <div className="text-4xl font-bold text-slate-900 mb-6">{price(0)}</div>
            <ul className="space-y-2.5 text-sm text-slate-700 mb-8 flex-1">
              {c.freeFeatures.map((f) => (
                <li key={f} className="flex gap-2"><span className="text-emerald-500">✓</span> {f}</li>
              ))}
              {c.freeMissing.map((f) => (
                <li key={f} className="flex gap-2 text-slate-400"><span>✗</span> {f}</li>
              ))}
            </ul>
            <Link href="/" className="block text-center w-full border border-slate-300 text-slate-700 py-2.5 rounded-xl font-medium hover:bg-slate-50">
              {c.startFree}
            </Link>
          </section>
          <section className="bg-gradient-to-b from-blue-600 to-indigo-700 rounded-2xl p-6 shadow-xl text-white relative flex flex-col">
            <span className="absolute top-4 right-4 bg-amber-400 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full">{c.best}</span>
            <h2 className="text-sm font-semibold text-blue-100 uppercase tracking-wide mb-1">{c.pro}</h2>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-4xl font-bold">{price(PRICE_MONTHLY)}</span>
              <span className="text-blue-200 mb-1">{c.perMonth}</span>
            </div>
            <p className="text-blue-100 text-sm mb-6">{c.yearlyNote}</p>
            <ul className="space-y-2.5 text-sm mb-8 flex-1">
              {c.proFeatures.map((f) => (
                <li key={f} className="flex gap-2"><span className="text-emerald-300">✓</span> {f}</li>
              ))}
            </ul>
            <Link href="/?view=pricing" className="block text-center w-full bg-white text-blue-700 py-2.5 rounded-xl font-semibold hover:bg-blue-50">
              {c.goPro}
            </Link>
            <CheckoutConsent lang={lang} dark className="mt-3" />
          </section>
        </div>
        <p className="text-center text-xs text-slate-500 mt-6">{c.taxNote}</p>
        <section className="mt-12">
          <h2 className="text-xl font-bold text-slate-900 mb-4">{c.faqTitle}</h2>
          <dl className="space-y-4">
            {c.faq.map(([q, a]) => (
              <div key={q} className="bg-white rounded-xl border border-slate-200 p-4">
                <dt className="font-semibold text-slate-800">{q}</dt>
                <dd className="text-sm text-slate-600 mt-1">{a}</dd>
              </div>
            ))}
          </dl>
        </section>
        <LegalFooterLinks lang={lang} className="mt-10" />
      </div>
    </main>
  );
}
