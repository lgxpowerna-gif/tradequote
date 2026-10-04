import type { Metadata } from "next";
import { ContactPageX } from "@/components/LegalIntl";

export const metadata: Metadata = { title: "联系我们", alternates: { canonical: "/zh/contact" } };

export default function Page() {
  return <ContactPageX lang="zh" />;
}
