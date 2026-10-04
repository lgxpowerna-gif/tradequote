import type { Metadata } from "next";
import { PrivacyPageX } from "@/components/LegalIntl";

export const metadata: Metadata = { title: "سياسة الخصوصية", alternates: { canonical: "/ar/privacy" } };

export default function Page() {
  return <PrivacyPageX lang="ar" />;
}
