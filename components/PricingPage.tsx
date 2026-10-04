import Link from "next/link";
import { FREE_LIMIT } from "@/lib/plan";
import { CheckoutConsent, LegalFooterLinks } from "@/components/LegalLinks";

/** Display prices — must match the Stripe prices behind STRIPE_PRICE_MONTHLY / STRIPE_PRICE_YEARLY. */
export const PRICE_MONTHLY = 19;
export const PRICE_YEARLY = 190;
/** 12 × monthly − yearly (38 $ = 2 months at 19 $). */
export const YEARLY_SAVINGS = PRICE_MONTHLY * 12 - PRICE_YEARLY;

type PLang = "fr" | "en" | "zh" | "ar";

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
    cadNote: "Tous les prix sont en dollars canadiens (CAD). Hors Canada, l'émetteur de votre carte convertit le montant dans votre devise (USD, EUR, CHF…).",
    regions: "Fait pour le Québec. Aussi disponible partout au Canada, aux États-Unis et en France (et en Belgique et en Suisse) : taxes, devise et format des dates selon votre région.",
    startFree: "Commencer gratuitement",
    goPro: "Passer à Pro",
    best: "Recommandé",
    freeFeatures: [`${FREE_LIMIT} documents par mois`, ...["Soumissions + factures", "Licence RBQ imprimée sur chaque document", "TPS + TVQ calculées séparément", "Acompte et Virement Interac", "Votre logo sur le PDF", "Carnet de clients (remplissage automatique)", "Historique complet : rouvrir et dupliquer vos documents", "Partager / envoyer le PDF par courriel", "Ajouter à l'agenda (Google, Outlook, Apple)", "Modèles de métiers, dont Toiture"]],
    freeMissing: ["Filigrane « Gratuit » sur le PDF", "Export comptable"],
    proFeatures: ["Soumissions et factures illimitées", "Sans filigrane", "Export comptable : CSV pour QuickBooks en ligne (import de factures)", "CSV Excel avec colonnes TPS / TVQ, filtré par période", "Tout ce qui est inclus dans le forfait gratuit", "Abonnement vérifié par Stripe"],
    faqTitle: "Questions fréquentes",
    faq: [["Pourquoi le numéro RBQ ?", "La Régie du bâtiment du Québec exige que le titulaire d'une licence inscrive son numéro sur ses soumissions, contrats et factures. TradeQuote l'imprime automatiquement en en-tête."], ["La TPS et la TVQ sont-elles calculées correctement ?", "Oui : TPS 5 % et TVQ 9,975 % calculées séparément sur le montant avant taxes, chacune arrondie au cent, avec vos numéros TPS et TVQ imprimés sur le PDF."], ["Comment fonctionne l'export comptable ?", "Dans l'Historique, choisissez une période et téléchargez un fichier CSV : un fichier pour l'import de factures de QuickBooks en ligne (une ligne par article, codes de taxe à associer lors de l'import) ou un fichier pour Excel avec une colonne TPS et une colonne TVQ. Le fichier est créé sur votre appareil. Ce n'est pas une synchronisation automatique, et il n'y a pas encore de fichier pour Sage 50 ou Acomba."], ["Et hors du Québec ?", "Choisissez votre région dans « Votre entreprise » : chaque province canadienne (TPS, TVH, TVP/TVD), les États-Unis (taux de taxe de vente que vous saisissez, en USD), la France (TVA 20 / 10 / 5,5 % par ligne ou mention de franchise art. 293 B du CGI, en EUR), la Belgique et la Suisse. La licence RBQ ne s'affiche que pour le Québec. L'abonnement reste facturé en CAD."], ["Faut-il créer un compte ?", "Non. Vos documents et coordonnées restent dans votre navigateur. Votre abonnement Pro est vérifié auprès de Stripe à chaque ouverture et est lié à ce navigateur pour l'instant."], ["Puis-je annuler ?", "Oui, en tout temps, sans engagement : bouton « Gérer / annuler mon abonnement » ou par courriel (page Contact). L'accès Pro reste actif jusqu'à la fin de la période payée ; aucun remboursement pour une période entamée, sauf si la loi l'exige."]],
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
    cadNote: "All prices are in Canadian dollars (CAD). Outside Canada, your card issuer converts the amount to your currency (USD, EUR, CHF…).",
    regions: "Made for Québec. Also available across Canada, in the United States and in France (and in Belgium and Switzerland): taxes, currency and date format follow your region.",
    startFree: "Start free",
    goPro: "Go Pro",
    best: "Recommended",
    freeFeatures: [`${FREE_LIMIT} documents per month`, ...["Quotes + invoices", "RBQ licence printed on every document", "GST + QST computed separately", "Deposit and Interac e-Transfer", "Your logo on the PDF", "Client list (auto-fill)", "Full history: reopen and duplicate your documents", "Share / email the PDF", "Add to calendar (Google, Outlook, Apple)", "Trade templates, including Roofing"]],
    freeMissing: ["“Free” watermark on the PDF", "Accounting export"],
    proFeatures: ["Unlimited quotes & invoices", "No watermark", "Accounting export: CSV for QuickBooks Online (invoice import)", "Excel CSV with GST / QST columns, filtered by date range", "Everything in the Free plan", "Subscription verified by Stripe"],
    faqTitle: "FAQ",
    faq: [["Why the RBQ number?", "Québec's Régie du bâtiment requires licence holders to show their licence number on quotes, contracts and invoices. TradeQuote prints it automatically in the header."], ["Are GST and QST calculated correctly?", "Yes: GST 5% and QST 9.975% are computed separately on the pre-tax amount, each rounded to the cent, with your GST and QST numbers printed on the PDF."], ["How does the accounting export work?", "In History, pick a date range and download a CSV file: one for QuickBooks Online's invoice import (one row per line item, tax codes matched during the import) or one for Excel with separate GST and QST columns. The file is created on your device. It is not an automatic sync, and there is no Sage 50 or Acomba file yet."], ["What about outside Québec?", "Choose your region in “Your business”: every Canadian province (GST, HST, PST/RST), the United States (sales tax rate you enter, in USD), France (VAT 20 / 10 / 5.5% per line or the art. 293 B CGI franchise mention, in EUR), Belgium and Switzerland. The RBQ licence only shows for Québec. The subscription is still billed in CAD."], ["Do I need an account?", "No. Your documents and details stay in your browser. Your Pro subscription is verified with Stripe each time you open the app and is tied to this browser for now."], ["Can I cancel?", "Yes, anytime: “Manage / cancel my subscription” button or by email (Contact page). Pro stays active until the end of the paid period; no refund for partial periods unless required by law."]],
    other: { href: "/tarifs", label: "Français" },
    back: "← Back to the app",
  },
  zh: {
    title: "TradeQuote 价格",
    sub: "为魁北克承包商和技工打造的报价单和发票：每份单据都有 RBQ 执照、GST 和 QST。",
    regions: "专为魁北克打造。同样适用于加拿大各地、美国和法国（以及比利时和瑞士）：税种、货币和日期格式随您的地区而定。中文仅翻译界面和 PDF，不含中国税务规则。",
    free: "免费版",
    pro: "Pro",
    perMonth: "/月",
    perYear: "/年",
    yearlyNote: `或每年 ${PRICE_YEARLY} 加元 — 免费 2 个月（节省 ${YEARLY_SAVINGS} 加元）`,
    taxNote: "价格以加元计。另加适用税费。通过 Stripe 安全支付。",
    cadNote: "所有价格均以加元（CAD）计。在加拿大境外，发卡机构会将金额换算为您的货币（美元、欧元、瑞士法郎等）。",
    startFree: "免费开始",
    goPro: "升级 Pro",
    best: "推荐",
    freeFeatures: [`每月 ${FREE_LIMIT} 份单据`, ...["报价单 + 发票", "每份单据印有 RBQ 执照（魁北克）", "按地区分别计算各项税款", "定金和 Interac 转账", "PDF 上显示您的标志", "客户列表（自动填写）", "完整历史记录：重新打开和复制单据", "分享 / 通过电子邮件发送 PDF", "添加到日历（Google、Outlook、Apple）", "行业模板（含屋顶工程）"]],
    freeMissing: ["PDF 上有“免费版”水印", "会计导出"],
    proFeatures: ["无限报价单和发票", "无水印", "会计导出：QuickBooks Online CSV（发票导入）", "按税种分列的 Excel CSV，可按期间筛选", "包含免费版全部功能", "订阅由 Stripe 验证"],
    faqTitle: "常见问题",
    faq: [["为什么要 RBQ 号码？", "魁北克建筑管理局（RBQ）要求执照持有人在报价单、合同和发票上注明执照号码。TradeQuote 会自动印在页眉。此项仅适用于魁北克。"], ["税款计算正确吗？", "是的：魁北克 GST 5% 和 QST 9.975% 分别按税前金额计算，各自四舍五入到分；其他省份和国家使用各自的税率（见“魁北克以外”）。"], ["魁北克以外可以用吗？", "可以。在“您的企业”中选择地区：加拿大各省（GST、HST、PST/RST）、美国（您输入的销售税率，美元）、法国（按行选择 20 / 10 / 5.5% 增值税或 CGI 第 293 B 条免税说明，欧元）、比利时和瑞士。订阅仍以加元收费。"], ["会计导出如何使用？", "在历史记录中选择期间并下载 CSV 文件：一个用于 QuickBooks Online 发票导入，一个用于 Excel，税种分列。文件在您的设备上生成。这不是自动同步。"], ["需要注册账户吗？", "不需要。您的单据和资料保存在浏览器中。Pro 订阅每次打开应用时都会通过 Stripe 验证，目前与此浏览器绑定。"], ["可以取消吗？", "可以，随时取消，无需承诺：使用“管理 / 取消我的订阅”按钮或发邮件（联系页面）。Pro 在已付周期结束前保持有效；不足一个周期的部分不予退款，法律另有规定的除外。"]],
    other: { href: "/tarifs", label: "Français" },
    back: "← 返回应用",
  },
  ar: {
    title: "أسعار TradeQuote",
    sub: "عروض أسعار وفواتير لمقاولي وحِرَفيي كيبيك: رخصة RBQ وGST وQST على كل مستند.",
    regions: "مصمم لكيبيك. ومتوفر أيضًا في جميع أنحاء كندا وفي الولايات المتحدة وفرنسا (وبلجيكا وسويسرا): الضرائب والعملة وتنسيق التاريخ حسب منطقتك. العربية تترجم الواجهة وملفات PDF فقط.",
    free: "مجاني",
    pro: "Pro",
    perMonth: "/شهريًا",
    perYear: "/سنويًا",
    yearlyNote: `أو ${PRICE_YEARLY} دولارًا كنديًا سنويًا — شهران مجانًا (وفّر ${YEARLY_SAVINGS} دولارًا)`,
    taxNote: "الأسعار بالدولار الكندي. تُضاف الضرائب المطبقة. دفع آمن عبر Stripe.",
    cadNote: "جميع الأسعار بالدولار الكندي (CAD). خارج كندا، تحوّل الجهة المصدرة لبطاقتك المبلغ إلى عملتك (دولار أمريكي، يورو، فرنك سويسري…).",
    startFree: "ابدأ مجانًا",
    goPro: "الترقية إلى Pro",
    best: "موصى به",
    freeFeatures: [`${FREE_LIMIT} مستندات شهريًا`, ...["عروض أسعار + فواتير", "رخصة RBQ مطبوعة على كل مستند (كيبيك)", "حساب كل ضريبة على حدة حسب المنطقة", "دفعة مقدمة وتحويل Interac", "شعارك على ملف PDF", "قائمة العملاء (تعبئة تلقائية)", "سجل كامل: إعادة فتح المستندات ونسخها", "مشاركة / إرسال PDF بالبريد الإلكتروني", "إضافة إلى التقويم (Google وOutlook وApple)", "قوالب حِرَف منها الأسقف"]],
    freeMissing: ["علامة «مجاني» المائية على PDF", "التصدير المحاسبي"],
    proFeatures: ["عروض أسعار وفواتير غير محدودة", "بدون علامة مائية", "تصدير محاسبي: CSV لـ QuickBooks Online (استيراد الفواتير)", "ملف Excel CSV بأعمدة لكل ضريبة، حسب الفترة", "كل ما في الخطة المجانية", "اشتراك يتحقق منه Stripe"],
    faqTitle: "الأسئلة الشائعة",
    faq: [["لماذا رقم RBQ؟", "تشترط هيئة البناء في كيبيك (RBQ) على حاملي الرخص ذكر رقم الرخصة على عروض الأسعار والعقود والفواتير. يطبعه TradeQuote تلقائيًا في الترويسة. ينطبق ذلك على كيبيك فقط."], ["هل تُحسب الضرائب بشكل صحيح؟", "نعم: في كيبيك تُحسب GST بنسبة 5% وQST بنسبة 9.975% كلٌّ على حدة على المبلغ قبل الضرائب، وتُقرَّب كل منهما إلى السنت؛ وتستخدم المقاطعات والبلدان الأخرى نسبها الخاصة."], ["وماذا خارج كيبيك؟", "اختر منطقتك في «شركتك»: كل مقاطعة كندية (GST وHST وPST/RST)، والولايات المتحدة (نسبة ضريبة مبيعات تدخلها، بالدولار الأمريكي)، وفرنسا (ض.ق.م 20 / 10 / 5.5% لكل سطر أو عبارة الإعفاء وفق المادة 293 B من CGI، باليورو)، وبلجيكا وسويسرا. يبقى الاشتراك بالدولار الكندي."], ["كيف يعمل التصدير المحاسبي؟", "في السجل، اختر فترة ونزّل ملف CSV: ملف لاستيراد الفواتير في QuickBooks Online وملف لـ Excel بأعمدة منفصلة لكل ضريبة. يُنشأ الملف على جهازك. ليس مزامنة تلقائية."], ["هل أحتاج إلى حساب؟", "لا. تبقى مستنداتك وبياناتك في متصفحك. يُتحقق من اشتراك Pro لدى Stripe عند كل فتح للتطبيق، وهو مرتبط بهذا المتصفح حاليًا."], ["هل يمكنني الإلغاء؟", "نعم، في أي وقت ودون التزام: زر «إدارة / إلغاء اشتراكي» أو بالبريد الإلكتروني (صفحة الاتصال). يبقى Pro فعّالًا حتى نهاية الفترة المدفوعة؛ ولا استرداد عن الفترات الجزئية ما لم يقتضِ القانون ذلك."]],
    other: { href: "/tarifs", label: "Français" },
    back: "→ العودة إلى التطبيق",
  },
} as const;

export default function PricingPage({ lang }: { lang: PLang }) {
  const c = COPY[lang];
  const price = (n: number) => (lang === "fr" ? `${n} $` : lang === "zh" ? `${n} 加元` : `$${n}`);
  return (
    <main className="min-h-screen bg-slate-50" dir={lang === "ar" ? "rtl" : undefined} lang={lang === "zh" ? "zh-CN" : lang === "ar" ? "ar" : undefined}>
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex justify-between items-center mb-8 text-sm">
          <Link href="/" className="text-blue-600 hover:underline">{c.back}</Link>
          <Link href={c.other.href} className="text-slate-500 hover:underline">{c.other.label}</Link>
        </div>
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{c.title}</h1>
          <p className="text-slate-600">{c.sub}</p>
          <p className="text-slate-500 text-sm mt-2" data-testid="regions-note">{c.regions}</p>
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
        <p className="text-center text-xs text-slate-500 mt-1" data-testid="cad-note">{c.cadNote}</p>
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
