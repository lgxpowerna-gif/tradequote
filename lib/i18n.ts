export type Lang = "en" | "fr";

export const TAX_PRESETS = [
  { id: "none", label: "No tax", rate: 0, name: "" },
  { id: "gst", label: "GST 5%", rate: 5, name: "GST" },
  { id: "hst13", label: "HST 13% (ON)", rate: 13, name: "HST" },
  { id: "hst15", label: "HST 15% (NB/NL/NS/PE)", rate: 15, name: "HST" },
  { id: "qc", label: "GST+QST 14.975% (QC)", rate: 14.975, name: "GST+QST" },
  { id: "bc", label: "GST+PST 12% (BC)", rate: 12, name: "GST+PST" },
  { id: "custom", label: "Custom %", rate: 0, name: "Tax" },
] as const;

export const TEMPLATES = [
  { id: "reno", label: { en: "Renovation", fr: "Rénovation" }, items: [{ description: "Labour – renovation work", quantity: 1, unitPrice: 0 }, { description: "Materials", quantity: 1, unitPrice: 0 }] },
  { id: "plumbing", label: { en: "Plumbing", fr: "Plomberie" }, items: [{ description: "Service call / diagnostic", quantity: 1, unitPrice: 95 }, { description: "Labour", quantity: 2, unitPrice: 85 }, { description: "Parts / materials", quantity: 1, unitPrice: 0 }] },
  { id: "electrical", label: { en: "Electrical", fr: "Électricité" }, items: [{ description: "Electrical labour", quantity: 1, unitPrice: 0 }, { description: "Materials & devices", quantity: 1, unitPrice: 0 }] },
  { id: "painting", label: { en: "Painting", fr: "Peinture" }, items: [{ description: "Surface prep", quantity: 1, unitPrice: 0 }, { description: "Painting labour", quantity: 1, unitPrice: 0 }, { description: "Paint & supplies", quantity: 1, unitPrice: 0 }] },
  { id: "general", label: { en: "General", fr: "Général" }, items: [{ description: "Professional services", quantity: 1, unitPrice: 0 }] },
  { id: "change", label: { en: "Change order", fr: "Changement de scope" }, items: [{ description: "Additional work – change order", quantity: 1, unitPrice: 0 }, { description: "Materials for change order", quantity: 1, unitPrice: 0 }] },
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
    featureFree: ["5 documents / month", "Quotes + Invoices", "GST/HST presets", "Interac field", "PDF export"],
    featurePro: ["Unlimited quotes & invoices", "No watermark", "All trade templates", "Deposit tracking", "Looks pro — wins more jobs"],
    startMo: "Start $9/mo CAD", startYr: "Best value — $79/yr CAD",
    companyName: "Business name", address: "Address", city: "City / Postal", email: "Email", phone: "Phone",
    bn: "Business Number", gst: "GST/HST #", interac: "Interac email", clientName: "Client name",
    docNumber: "Number", date: "Date", validUntil: "Valid until / Due", description: "Description", qty: "Qty", rate: "Rate",
    preview: "Preview", noDocs: "No documents yet.", createFirst: "Create your first quote →", used: "used this month",
    watermark: "Free plan includes a small watermark", footer: "Built for Canadian renovators & trades", rights: "All rights reserved",
    discount: "Discount %", jobSite: "Job site address",
  },
  fr: {
    brand: "TradeQuote", create: "Créer", history: "Historique", pricing: "Tarifs", upgrade: "Passer Pro", free: "Plan gratuit", pro: "Pro",
    quote: "Devis", invoice: "Facture", templates: "Templates rapides", business: "Votre entreprise", client: "Client",
    details: "Détails du document", items: "Lignes", addItem: "+ Ajouter", notes: "Notes / Conditions", tax: "Taxe",
    subtotal: "Sous-total", total: "Total", deposit: "Acompte %", depositAmt: "Montant acompte", balance: "Solde dû",
    download: "Télécharger PDF", convert: "Convertir en facture", limitHit: "Limite gratuite atteinte — passez Pro pour continuer",
    limitText: "Vous avez utilisé vos 5 documents gratuits ce mois-ci. Passez Pro pour l'illimité — un seul chantier payé couvre l'année.",
    monthly: "Pro – 9 $/mois", yearly: "Pro – 79 $/an (économisez 29 $)", continueFree: "Continuer gratuit", freePlan: "Gratuit", proPlan: "Pro", perMo: "/mois",
    featureFree: ["5 documents / mois", "Devis + Factures", "Presets GST/HST", "Champ Interac", "Export PDF"],
    featurePro: ["Devis & factures illimités", "Sans filigrane", "Tous les templates métiers", "Suivi acomptes", "Look pro — gagnez plus de jobs"],
    startMo: "Démarrer 9 $/mois CAD", startYr: "Meilleure offre — 79 $/an CAD",
    companyName: "Nom de l'entreprise", address: "Adresse", city: "Ville / Code postal", email: "Email", phone: "Téléphone",
    bn: "N° d'entreprise", gst: "N° GST/HST", interac: "Email Interac", clientName: "Nom du client",
    docNumber: "Numéro", date: "Date", validUntil: "Validité / Échéance", description: "Description", qty: "Qté", rate: "Prix",
    preview: "Aperçu", noDocs: "Aucun document.", createFirst: "Créer mon premier devis →", used: "utilisés ce mois",
    watermark: "Le plan gratuit inclut un petit filigrane", footer: "Conçu pour rénovateurs & trades canadiens", rights: "Tous droits réservés",
    discount: "Remise %", jobSite: "Adresse du chantier",
  },
} as const;
