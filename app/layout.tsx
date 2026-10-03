import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = "https://tradequote.faitle.net";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563eb",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TradeQuote – Soumissions et factures pour entrepreneurs du Québec | RBQ, TPS/TVQ",
    template: "%s | TradeQuote",
  },
  description:
    "Soumissions et factures professionnelles en français pour entrepreneurs et gens de métier du Québec : licence RBQ imprimée, TPS 5 % + TVQ 9,975 %, acomptes, historique complet, partage par courriel, agenda, modèle Toiture. Export comptable QuickBooks/Excel avec Pro. Gratuit · Pro 9 $/mois.",
  keywords: [
    "contractor quote software Canada",
    "renovation invoice",
    "soumission rénovation",
    "licence RBQ soumission",
    "facture TPS TVQ",
    "trade invoice GST HST",
    "construction quote generator",
    "deposit invoice Canada",
    "plumber electrician invoice",
    "soumission entrepreneur",
  ],
  authors: [{ name: "TradeQuote" }],
  creator: "TradeQuote",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "fr_CA",
    alternateLocale: ["en_CA"],
    url: siteUrl,
    siteName: "TradeQuote",
    title: "TradeQuote – Soumissions conformes RBQ avec TPS/TVQ",
    description:
      "Soumissions, acomptes et factures pour gens de métier. Licence RBQ, TPS/TVQ. Gratuit · Pro 9 $/mois.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TradeQuote – Soumissions et factures pour entrepreneurs",
    description:
      "Décrochez plus de contrats avec des soumissions pro. RBQ · TPS/TVQ · acomptes · Interac.",
  },
  category: "business",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "TradeQuote",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: [
    { "@type": "Offer", price: "0", priceCurrency: "CAD", name: "Free" },
    { "@type": "Offer", price: "9.00", priceCurrency: "CAD", name: "Pro Monthly" },
    { "@type": "Offer", price: "79.00", priceCurrency: "CAD", name: "Pro Yearly" },
  ],
  description:
    "Logiciel de soumissions et factures pour entrepreneurs et gens de métier du Québec (RBQ, TPS/TVQ).",
  url: siteUrl,
  inLanguage: ["fr-CA", "en-CA"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr-CA">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
