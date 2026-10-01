export type Lang = "en" | "fr";

export { TAX_PRESETS } from "./tax";

const L = (en: string, fr: string) => ({ en, fr });

export const TEMPLATES = [
  { id: "reno", label: { en: "Renovation", fr: "Rénovation" }, items: [{ description: L("Labour – renovation work", "Main-d'œuvre – travaux de rénovation"), quantity: 1, unitPrice: 0 }, { description: L("Materials", "Matériaux"), quantity: 1, unitPrice: 0 }] },
  { id: "plumbing", label: { en: "Plumbing", fr: "Plomberie" }, items: [{ description: L("Service call / diagnostic", "Appel de service / diagnostic"), quantity: 1, unitPrice: 95 }, { description: L("Labour", "Main-d'œuvre"), quantity: 2, unitPrice: 85 }, { description: L("Parts / materials", "Pièces / matériaux"), quantity: 1, unitPrice: 0 }] },
  { id: "electrical", label: { en: "Electrical", fr: "Électricité" }, items: [{ description: L("Electrical labour", "Main-d'œuvre électrique"), quantity: 1, unitPrice: 0 }, { description: L("Materials & devices", "Matériel et dispositifs"), quantity: 1, unitPrice: 0 }] },
  { id: "painting", label: { en: "Painting", fr: "Peinture" }, items: [{ description: L("Surface prep", "Préparation des surfaces"), quantity: 1, unitPrice: 0 }, { description: L("Painting labour", "Main-d'œuvre peinture"), quantity: 1, unitPrice: 0 }, { description: L("Paint & supplies", "Peinture et fournitures"), quantity: 1, unitPrice: 0 }] },
  { id: "general", label: { en: "General", fr: "Général" }, items: [{ description: L("Professional services", "Services professionnels"), quantity: 1, unitPrice: 0 }] },
  { id: "change", label: { en: "Change order", fr: "Avenant (extra)" }, items: [{ description: L("Additional work – change order", "Travaux supplémentaires – avenant"), quantity: 1, unitPrice: 0 }, { description: L("Materials for change order", "Matériaux pour l'avenant"), quantity: 1, unitPrice: 0 }] },
] as const;

export const i18n = {
  en: {
    brand: "TradeQuote", create: "Create", history: "History", pricing: "Pricing", upgrade: "Go Pro", free: "Free plan", pro: "Pro",
    quote: "Quote", invoice: "Invoice", templates: "Quick templates", business: "Your business", client: "Client",
    details: "Document details", items: "Line items", addItem: "+ Add line", notes: "Notes / Terms", tax: "Tax",
    subtotal: "Subtotal", total: "Total", deposit: "Deposit %", depositAmt: "Deposit amount", balance: "Balance due",
    download: "Download PDF", convert: "Convert to Invoice", limitHit: "Free limit reached — upgrade to keep closing jobs",
    limitText: "You've used your 5 free documents this month. Go Pro for unlimited quotes & invoices — one paid job covers a year.",
    monthly: "Pro – $9/mo", yearly: "Pro – $79/yr (save $29)", continueFree: "Continue free", freePlan: "Free", proPlan: "Pro", perMo: "/mo",
    featureFree: ["5 documents / month", "Quotes + Invoices", "RBQ licence on every document", "GST + QST computed separately", "Interac field", "PDF export"],
    featurePro: ["Unlimited quotes & invoices", "No watermark", "All trade templates", "Deposit tracking", "Looks pro — wins more jobs"],
    startMo: "Start $9/mo CAD", startYr: "Best value — $79/yr CAD",
    companyName: "Business name", address: "Address", city: "City / Postal", email: "Email", phone: "Phone",
    bn: "Business Number / NEQ", gst: "GST/HST #", qst: "QST # (Québec)",
    rbq: "RBQ licence (e.g. 1234-5678-01)", rbqHint: "Required on quotes and invoices for RBQ licence holders.", rbqInvalid: "An RBQ number has 10 digits: XXXX-XXXX-XX",
    freePrice: "$0", proPrice: "$9", orYear: "or $79/year", best: "BEST VALUE", typeCol: "Type",
    hero: "Québec-ready quotes & invoices: RBQ licence, GST + QST, PDF in 30 seconds. No account needed.", seePricing: "See pricing", interac: "Interac email", clientName: "Client name",
    docNumber: "Number", date: "Date", validUntil: "Valid until / Due", description: "Description", qty: "Qty", rate: "Rate",
    preview: "Preview", noDocs: "No documents yet.", createFirst: "Create your first quote →", used: "used this month",
    watermark: "Free plan includes a small watermark", footer: "Built for Québec & Canadian contractors and trades", rights: "All rights reserved",
    discount: "Discount %", jobSite: "Job site address",
  },
  fr: {
    brand: "TradeQuote", create: "Créer", history: "Historique", pricing: "Tarifs", upgrade: "Passer Pro", free: "Plan gratuit", pro: "Pro",
    quote: "Soumission", invoice: "Facture", templates: "Modèles rapides", business: "Votre entreprise", client: "Client",
    details: "Détails du document", items: "Lignes", addItem: "+ Ajouter", notes: "Notes / Conditions", tax: "Taxe",
    subtotal: "Sous-total", total: "Total", deposit: "Acompte %", depositAmt: "Montant acompte", balance: "Solde dû",
    download: "Télécharger le PDF", convert: "Convertir en facture", limitHit: "Limite gratuite atteinte — passez Pro pour continuer",
    limitText: "Vous avez utilisé vos 5 documents gratuits ce mois-ci. Passez Pro pour l'illimité — un seul chantier payé couvre l'année.",
    monthly: "Pro – 9 $/mois", yearly: "Pro – 79 $/an (économisez 29 $)", continueFree: "Continuer gratuit", freePlan: "Gratuit", proPlan: "Pro", perMo: "/mois",
    featureFree: ["5 documents / mois", "Soumissions + factures", "Licence RBQ sur chaque document", "TPS + TVQ calculées séparément", "Virement Interac", "Export PDF"],
    featurePro: ["Soumissions et factures illimitées", "Sans filigrane", "Tous les modèles de métiers", "Suivi des acomptes", "Image pro — décrochez plus de contrats"],
    startMo: "Démarrer 9 $/mois CAD", startYr: "Meilleure offre — 79 $/an CAD",
    companyName: "Nom de l'entreprise", address: "Adresse", city: "Ville / Code postal", email: "Courriel", phone: "Téléphone",
    bn: "NEQ / N° d'entreprise", gst: "N° TPS/TVH", qst: "N° TVQ", interac: "Courriel Virement Interac",
    rbq: "Licence RBQ (ex. 1234-5678-01)", rbqHint: "Obligatoire sur vos soumissions et factures si vous détenez une licence RBQ.", rbqInvalid: "Un numéro RBQ a 10 chiffres : XXXX-XXXX-XX",
    freePrice: "0 $", proPrice: "9 $", orYear: "ou 79 $/an", best: "MEILLEURE OFFRE", typeCol: "Type",
    hero: "Soumissions et factures prêtes pour le Québec : licence RBQ, TPS + TVQ, PDF en 30 secondes. Sans compte.", seePricing: "Voir les tarifs", clientName: "Nom du client",
    docNumber: "Numéro", date: "Date", validUntil: "Validité / Échéance", description: "Description", qty: "Qté", rate: "Prix",
    preview: "Aperçu", noDocs: "Aucun document.", createFirst: "Créer ma première soumission →", used: "utilisés ce mois",
    watermark: "Le plan gratuit inclut un petit filigrane", footer: "Conçu pour les entrepreneurs et gens de métier du Québec", rights: "Tous droits réservés",
    discount: "Remise %", jobSite: "Adresse du chantier",
  },
} as const;
