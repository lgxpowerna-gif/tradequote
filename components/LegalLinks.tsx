/* Pure (client-safe) legal links, used by the app footer, checkout and legal pages. */
type L = "fr" | "en" | "zh" | "ar";
export const LEGAL_LINKS = {
  fr: { privacy: "/confidentialite", terms: "/conditions", contact: "/contact", pricing: "/tarifs" },
  en: { privacy: "/privacy", terms: "/terms", contact: "/contact-us", pricing: "/pricing" },
  zh: { privacy: "/zh/privacy", terms: "/zh/terms", contact: "/zh/contact", pricing: "/zh/pricing" },
  ar: { privacy: "/ar/privacy", terms: "/ar/terms", contact: "/ar/contact", pricing: "/ar/pricing" },
} as const;
const T = {
  fr: { privacy: "Confidentialité", terms: "Conditions", contact: "Contact", pricing: "Tarifs" },
  en: { privacy: "Privacy", terms: "Terms", contact: "Contact", pricing: "Pricing" },
  zh: { privacy: "隐私", terms: "条款", contact: "联系我们", pricing: "价格" },
  ar: { privacy: "الخصوصية", terms: "الشروط", contact: "اتصل بنا", pricing: "الأسعار" },
};
export const legalLang = (lang: string): L => (lang === "en" || lang === "zh" || lang === "ar" ? lang : "fr");

export function LegalFooterLinks({ lang, className = "mt-6" }: { lang: string; className?: string }) {
  const k = legalLang(lang);
  const l = LEGAL_LINKS[k];
  const t = T[k];
  return (
    <nav className={`${className} flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs`}>
      <a href={l.pricing} className="text-blue-600 hover:underline">{t.pricing}</a>
      <a href={l.privacy} className="text-blue-600 hover:underline">{t.privacy}</a>
      <a href={l.terms} className="text-blue-600 hover:underline">{t.terms}</a>
      <a href={l.contact} className="text-blue-600 hover:underline">{t.contact}</a>
    </nav>
  );
}

/** Shown next to every Pro checkout button. */
export function CheckoutConsent({ lang, className = "", dark = false }: { lang: string; className?: string; dark?: boolean }) {
  const k = legalLang(lang);
  const l = LEGAL_LINKS[k];
  const a = dark ? "underline text-white" : "underline text-blue-600";
  return (
    <p className={`text-[11px] leading-snug ${dark ? "text-blue-100" : "text-slate-500"} ${className}`}>
      {k === "zh" ? (
        <>订阅即表示您接受<a href={l.terms} className={a}>使用条款</a>和<a href={l.privacy} className={a}>隐私政策</a>。自动续订，可随时取消（<a href={l.contact} className={a}>如何取消</a>）。</>
      ) : k === "ar" ? (
        <>باشتراكك فإنك تقبل <a href={l.terms} className={a}>شروط الاستخدام</a> و<a href={l.privacy} className={a}>سياسة الخصوصية</a>. يتجدد تلقائيًا ويمكن إلغاؤه في أي وقت (<a href={l.contact} className={a}>كيفية الإلغاء</a>).</>
      ) : k === "fr" ? (
        <>En vous abonnant, vous acceptez les <a href={l.terms} className={a}>Conditions d&apos;utilisation</a> et la <a href={l.privacy} className={a}>Politique de confidentialité</a>. Renouvellement automatique, annulable en tout temps (<a href={l.contact} className={a}>comment annuler</a>).</>
      ) : (
        <>By subscribing you accept the <a href={l.terms} className={a}>Terms of use</a> and <a href={l.privacy} className={a}>Privacy policy</a>. Renews automatically, cancel anytime (<a href={l.contact} className={a}>how to cancel</a>).</>
      )}
    </p>
  );
}
