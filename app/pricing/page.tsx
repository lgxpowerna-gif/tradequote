import type { Metadata } from "next";
import PricingPage from "@/components/PricingPage";

export const metadata: Metadata = {
  title: "Pricing",
  description: "TradeQuote — Free or Pro at $19/mo or $190/yr CAD (unlimited, accounting export).",
  alternates: { canonical: "/pricing", languages: { "fr-CA": "/tarifs", "en-CA": "/pricing" } },
};

export default function Page() {
  return <PricingPage lang="en" />;
}
