import type { Metadata } from "next";
import { TermsPageX } from "@/components/LegalIntl";

export const metadata: Metadata = { title: "使用条款", alternates: { canonical: "/zh/terms" } };

export default function Page() {
  return <TermsPageX lang="zh" />;
}
