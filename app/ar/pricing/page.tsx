import type { Metadata } from "next";
import PricingPage from "@/components/PricingPage";

export const metadata: Metadata = { title: "الأسعار", description: "TradeQuote — مجاني أو Pro بـ 19 دولارًا كنديًا شهريًا / 190 سنويًا (بالدولار الكندي). مصمم لكيبيك ومتوفر أيضًا في كندا والولايات المتحدة وفرنسا.", alternates: { canonical: "/ar/pricing" } };

export default function Page() {
  return <PricingPage lang="ar" />;
}
