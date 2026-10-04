import type { Metadata } from "next";
import PricingPage from "@/components/PricingPage";

export const metadata: Metadata = { title: "价格", description: "TradeQuote — 免费版或 Pro 每月 19 加元 / 每年 190 加元（以加元计）。专为魁北克打造，同样适用于加拿大各地、美国和法国。", alternates: { canonical: "/zh/pricing" } };

export default function Page() {
  return <PricingPage lang="zh" />;
}
