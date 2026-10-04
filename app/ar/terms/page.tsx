import type { Metadata } from "next";
import { TermsPageX } from "@/components/LegalIntl";

export const metadata: Metadata = { title: "شروط الاستخدام", alternates: { canonical: "/ar/terms" } };

export default function Page() {
  return <TermsPageX lang="ar" />;
}
