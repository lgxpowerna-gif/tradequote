import type { Metadata } from "next";
import PricingPage from "@/components/PricingPage";

export const metadata: Metadata = {
  title: "Tarifs",
  description: "TradeQuote — Gratuit ou Pro à 19 $/mois ou 190 $/an, en dollars canadiens (illimité, export comptable QuickBooks/Excel). TPS/TVQ, en français. Aussi disponible partout au Canada, aux États-Unis et en France.",
  alternates: { canonical: "/tarifs", languages: { "fr-CA": "/tarifs", "en-CA": "/pricing" } },
};

export default function Page() {
  return <PricingPage lang="fr" />;
}
