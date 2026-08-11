import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradeQuote – Quotes & Invoices for Canadian Trades",
  description:
    "Create professional quotes and invoices for renovation and trades. GST/HST ready, Interac, deposits. Free plan available.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
