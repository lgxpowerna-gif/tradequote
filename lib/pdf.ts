import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatRate, type TaxLine } from "./tax";
import { rbqLine } from "./rbq";

export type PdfArgs = {
  docType: "quote" | "invoice";
  lang: "en" | "fr";
  plan: "free" | "pro";
  meta: { number: string; date: string; notes: string };
  company: { name: string; address: string; city: string; email: string; phone: string; bn: string; gst: string; qst?: string; rbq?: string; interac: string };
  client: { name: string; address: string; city: string; email: string };
  jobSite: string;
  /** Optional job dates (YYYY-MM-DD), printed under the job site. */
  jobDate?: string;
  jobEndDate?: string;
  items: { description: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  discountPct: number;
  discountAmount: number;
  taxLines: TaxLine[];
  total: number;
  depositPct: number;
  depositAmt: number;
  balance: number;
  labels: { description: string; qty: string; rate: string; subtotal: string; total: string; depositAmt: string; balance: string; discount: string };
};

export function pdfFileName(a: Pick<PdfArgs, "lang" | "docType" | "meta">): string {
  const fr = a.lang === "fr";
  const safe = a.meta.number.replace(/[\\/:*?"<>|]+/g, "-");
  return `${fr ? (a.docType === "quote" ? "soumission" : "facture") : a.docType}-${safe}.pdf`;
}

/** Downloads the PDF (unchanged behaviour). */
export function generateTradeQuotePDF(a: PdfArgs) {
  buildTradeQuotePDF(a).save(pdfFileName(a));
}

/** Builds the PDF as a File (for the Web Share API). */
export function tradeQuotePdfFile(a: PdfArgs): File {
  const blob = buildTradeQuotePDF(a).output("blob");
  return new File([blob], pdfFileName(a), { type: "application/pdf" });
}

function buildTradeQuotePDF(a: PdfArgs): jsPDF {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const primary: [number, number, number] = [37, 99, 235];
  const fr = a.lang === "fr";
  // jsPDF core fonts are WinAnsi: replace the narrow no-break spaces used by fr-CA number formatting.
  const formatMoney = (n: number) =>
    new Intl.NumberFormat(fr ? "fr-CA" : "en-CA", { style: "currency", currency: "CAD" })
      .format(n)
      .replace(/[\u202f\u00a0]/g, " ");
  const rbq = rbqLine(a.company.rbq || "", a.lang);

  const title =
    a.docType === "quote"
      ? fr ? "SOUMISSION" : "QUOTE"
      : a.lang === "fr" ? "FACTURE" : "INVOICE";

  doc.setFillColor(...primary);
  doc.rect(0, 0, w, 26, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, 14, 17);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`# ${a.meta.number}`, w - 14, 12, { align: "right" });
  doc.text(a.meta.date, w - 14, 18, { align: "right" });
  if (rbq) {
    doc.setFont("helvetica", "bold");
    doc.text(rbq, w - 14, 24, { align: "right" });
    doc.setFont("helvetica", "normal");
  }

  let y = 36;
  doc.setTextColor(100);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(a.lang === "fr" ? "DE" : "FROM", 14, y);
  doc.text(a.lang === "fr" ? "CLIENT" : "BILL TO", w / 2 + 4, y);
  y += 6;
  doc.setFontSize(11);
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.text(a.company.name || (fr ? "Votre entreprise" : "Your Business"), 14, y);
  doc.text(a.client.name || "Client", w / 2 + 4, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(70);
  const left = [
    rbq,
    a.company.address,
    a.company.city,
    a.company.email,
    a.company.phone,
    a.company.bn && `${fr ? "NEQ" : "BN"} : ${a.company.bn}`,
    a.company.gst && `${fr ? "N° TPS/TVH" : "GST/HST #"} : ${a.company.gst}`,
    a.company.qst && `${fr ? "N° TVQ" : "QST #"} : ${a.company.qst}`,
  ].filter(Boolean) as string[];
  const right = [
    a.client.address,
    a.client.city,
    a.client.email,
    a.jobSite ? `${fr ? "Chantier" : "Site"} : ${a.jobSite}` : "",
    a.jobDate
      ? `${fr ? "Travaux" : "Job date"} : ${a.jobDate}${a.jobEndDate && a.jobEndDate > a.jobDate ? (fr ? " au " : " to ") + a.jobEndDate : ""}`
      : "",
  ].filter(Boolean) as string[];
  left.forEach((l, i) => {
    // RBQ licence line printed in bold, as required on every quote/invoice
    doc.setFont("helvetica", rbq && i === 0 ? "bold" : "normal");
    doc.text(l, 14, y + i * 4);
  });
  doc.setFont("helvetica", "normal");
  right.forEach((l, i) => doc.text(l, w / 2 + 4, y + i * 4));

  const startY = Math.max(y + left.length * 4, y + right.length * 4) + 8;
  autoTable(doc, {
    startY,
    head: [[a.labels.description, a.labels.qty, a.labels.rate, a.labels.subtotal]],
    body: a.items.map((i) => [
      i.description || "—",
      String(i.quantity),
      formatMoney(i.unitPrice),
      formatMoney(i.quantity * i.unitPrice),
    ]),
    theme: "striped",
    headStyles: { fillColor: primary, textColor: 255, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 18, halign: "center" },
      2: { cellWidth: 32, halign: "right" },
      3: { cellWidth: 32, halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });

  let fy = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(a.labels.subtotal, w - 70, fy);
  doc.text(formatMoney(a.subtotal), w - 14, fy, { align: "right" });
  if (a.discountPct > 0) {
    fy += 5;
    doc.text(`${a.labels.discount} (${a.discountPct}%)`, w - 70, fy);
    doc.text(`-${formatMoney(a.discountAmount)}`, w - 14, fy, { align: "right" });
  }
  a.taxLines.forEach((line) => {
    fy += 5;
    doc.text(`${line.label} (${formatRate(line.rate, a.lang)})`, w - 70, fy);
    doc.text(formatMoney(line.amount), w - 14, fy, { align: "right" });
  });
  fy += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...primary);
  doc.text(a.labels.total, w - 70, fy);
  doc.text(formatMoney(a.total), w - 14, fy, { align: "right" });
  if (a.depositPct > 0) {
    fy += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(`${a.labels.depositAmt} (${a.depositPct}%)`, w - 70, fy);
    doc.text(formatMoney(a.depositAmt), w - 14, fy, { align: "right" });
    fy += 5;
    doc.setFont("helvetica", "bold");
    doc.text(a.labels.balance, w - 70, fy);
    doc.text(formatMoney(a.balance), w - 14, fy, { align: "right" });
  }
  fy += 12;
  if (a.company.interac) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30);
    doc.text(fr ? "Virement Interac :" : "Interac e-Transfer:", 14, fy);
    doc.setFont("helvetica", "normal");
    doc.text(a.company.interac, 52, fy);
    fy += 6;
  }
  if (a.meta.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(fr ? "Conditions" : "Terms", 14, fy);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);
    doc.text(doc.splitTextToSize(a.meta.notes, w - 28), 14, fy + 4);
  }
  if (a.plan === "free") {
    doc.setFontSize(32);
    doc.setTextColor(230);
    doc.setFont("helvetica", "bold");
    doc.text(fr ? "TRADEQUOTE GRATUIT" : "TRADEQUOTE FREE", w / 2, 150, { align: "center", angle: 25 });
  }
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.setFont("helvetica", "normal");
  doc.text(
    fr
      ? a.plan === "pro" ? "Généré avec TradeQuote Pro" : "Généré avec TradeQuote Gratuit – tradequote.faitle.net"
      : a.plan === "pro" ? "Generated with TradeQuote Pro" : "Generated with TradeQuote Free",
    w / 2,
    287,
    { align: "center" }
  );
  return doc;
}
