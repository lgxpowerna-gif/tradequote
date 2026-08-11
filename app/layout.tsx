import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = "https://tradequote-beta.vercel.app";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563eb",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TradeQuote – Quotes & Invoices for Canadian Trades | GST/HST",
    template: "%s | TradeQuote",
  },
  description:
    "Professional quotes and invoices for renovation, contractors & trades in Canada. Deposits, Interac, GST/HST by province. Free plan · Pro from $9/mo CAD.",
  keywords: [
    "contractor quote software Canada",
    "renovation invoice",
    "devis rénovation",
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
    locale: "en_CA",
    alternateLocale: ["fr_CA"],
    url: siteUrl,
    siteName: "TradeQuote",
    title: "TradeQuote – Quotes & Invoices for Canadian Trades",
    description:
      "Quotes, deposits & invoices for trades. GST/HST ready. Free to start · Pro $9/mo.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TradeQuote – Canadian Trades Quotes & Invoices",
    description:
      "Win jobs with professional quotes. GST/HST · deposits · Interac. Free plan.",
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
    "Quote and invoice software for Canadian trades and renovation contractors.",
  url: siteUrl,
  inLanguage: ["en", "fr"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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
