import type { Metadata } from "next";
import { PrivacyPageX } from "@/components/LegalIntl";

export const metadata: Metadata = { title: "隐私政策", alternates: { canonical: "/zh/privacy" } };

export default function Page() {
  return <PrivacyPageX lang="zh" />;
}
