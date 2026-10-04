import type { Metadata } from "next";
import { ContactPageX } from "@/components/LegalIntl";

export const metadata: Metadata = { title: "اتصل بنا", alternates: { canonical: "/ar/contact" } };

export default function Page() {
  return <ContactPageX lang="ar" />;
}
