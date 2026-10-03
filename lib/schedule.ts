/**
 * "Envoyer / planifier" helpers (pure, unit-tested in scripts/test.mjs): mailto fallback, Google
 * Calendar link and .ics file for the job dates. Nothing goes through our servers: the mailto link
 * opens the user's mail app, the Google link opens Google Calendar with the event pre-filled (the
 * event details are then sent to Google by the user's browser), the .ics file is built locally.
 */
export type ScheduleInput = {
  lang: "fr" | "en";
  docType: "quote" | "invoice";
  number: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  jobSite: string;
  /** YYYY-MM-DD */
  jobDate: string;
  /** YYYY-MM-DD, inclusive, optional */
  jobEndDate?: string;
  total: string;
  companyName: string;
  companyPhone?: string;
  companyEmail?: string;
};

const docWord = (i: Pick<ScheduleInput, "lang" | "docType">) =>
  i.lang === "fr" ? (i.docType === "quote" ? "soumission" : "facture") : i.docType === "quote" ? "quote" : "invoice";
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function shareSubject(i: ScheduleInput): string {
  const who = i.companyName ? ` – ${i.companyName}` : "";
  return i.lang === "fr" ? `${cap(docWord(i))} n° ${i.number}${who}` : `${cap(docWord(i))} #${i.number}${who}`;
}

export function shareBody(i: ScheduleInput): string {
  const fr = i.lang === "fr";
  const hello = i.clientName ? (fr ? `Bonjour ${i.clientName},` : `Hello ${i.clientName},`) : fr ? "Bonjour," : "Hello,";
  const w = docWord(i);
  const lines = [
    hello,
    "",
    fr
      ? `Vous trouverez ci-joint notre ${w} n° ${i.number}, au montant de ${i.total} (taxes incluses).`
      : `Please find attached our ${w} #${i.number}, for a total of ${i.total} (taxes included).`,
  ];
  if (i.jobSite) lines.push(fr ? `Chantier : ${i.jobSite}` : `Job site: ${i.jobSite}`);
  if (isYmd(i.jobDate)) lines.push(fr ? `Date prévue des travaux : ${frDate(i.jobDate, i.jobEndDate, true)}` : `Planned job date: ${frDate(i.jobDate, i.jobEndDate, false)}`);
  lines.push("", fr ? "N'hésitez pas à me contacter pour toute question." : "Feel free to contact me with any questions.", "", fr ? "Merci," : "Thank you,");
  const sig = [i.companyName, i.companyPhone, i.companyEmail].filter(Boolean).join("\n");
  if (sig) lines.push(sig);
  return lines.join("\n");
}

/** mailto: link with subject and body (mailto cannot carry attachments). */
export function mailtoLink(i: ScheduleInput): string {
  const enc = (s: string) => encodeURIComponent(s).replace(/%0A/g, "%0D%0A");
  return `mailto:${encodeURIComponent(i.clientEmail.trim())}?subject=${enc(shareSubject(i))}&body=${enc(shareBody(i))}`;
}

export const isYmd = (s: string | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + "T00:00:00Z"));

function frDate(start: string, end: string | undefined, fr: boolean): string {
  const f = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString(fr ? "fr-CA" : "en-CA", { timeZone: "UTC", weekday: "long", year: "numeric", month: "long", day: "numeric" });
  return isYmd(end) && end > start ? `${f(start)} ${fr ? "au" : "to"} ${f(end)}` : f(start);
}

/** All-day span: start date and the day AFTER the last day (exclusive end, as both Google and iCalendar expect). */
export function eventSpan(i: Pick<ScheduleInput, "jobDate" | "jobEndDate">): { start: string; endExclusive: string } | null {
  if (!isYmd(i.jobDate)) return null;
  const last = isYmd(i.jobEndDate) && i.jobEndDate > i.jobDate ? i.jobEndDate : i.jobDate;
  const d = new Date(last + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  const compact = (s: string) => s.replace(/-/g, "");
  return { start: compact(i.jobDate), endExclusive: compact(d.toISOString().slice(0, 10)) };
}

export function eventTitle(i: ScheduleInput): string {
  const who = i.clientName || (i.lang === "fr" ? "client" : "client");
  return i.lang === "fr" ? `Travaux – ${who} (${i.number})` : `Job – ${who} (${i.number})`;
}
export function eventLocation(i: ScheduleInput): string {
  return i.jobSite || i.clientAddress || "";
}
export function eventDetails(i: ScheduleInput): string {
  const fr = i.lang === "fr";
  return [
    `${cap(docWord(i))} ${fr ? "n°" : "#"} ${i.number} – ${i.total}`,
    i.clientName && `${fr ? "Client" : "Client"} : ${i.clientName}`,
    i.clientEmail && `${fr ? "Courriel" : "Email"} : ${i.clientEmail}`,
    i.companyName && `${fr ? "Entrepreneur" : "Contractor"} : ${i.companyName}`,
  ].filter(Boolean).join("\n");
}

/** Google Calendar "create event" link (all-day event over the job dates). */
export function googleCalendarUrl(i: ScheduleInput): string | null {
  const span = eventSpan(i);
  if (!span) return null;
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: eventTitle(i),
    dates: `${span.start}/${span.endExclusive}`,
    details: eventDetails(i),
    location: eventLocation(i),
    ctz: "America/Toronto",
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** iCalendar TEXT escaping (RFC 5545 §3.3.11). */
export const icsEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Folds a content line at 75 octets (UTF-8), continuation lines start with a space (RFC 5545 §3.1). */
export function icsFold(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = "", bytes = 0;
  for (const ch of Array.from(line)) {
    const b = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines carry a leading space
    if (bytes + b > limit) { out.push(cur); cur = ""; bytes = 0; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** .ics file (Outlook, Apple Calendar, Google import) with one all-day event. */
export function buildIcs(i: ScheduleInput, now: Date = new Date(), uidSeed = ""): string | null {
  const span = eventSpan(i);
  if (!span) return null;
  const uid = `${(uidSeed || i.number || "tq").replace(/[^A-Za-z0-9-]/g, "")}-${span.start}@tradequote.faitle.net`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TradeQuote//Soumissions et factures//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART;VALUE=DATE:${span.start}`,
    `DTEND;VALUE=DATE:${span.endExclusive}`,
    `SUMMARY:${icsEscape(eventTitle(i))}`,
  ];
  const loc = eventLocation(i);
  if (loc) lines.push(`LOCATION:${icsEscape(loc)}`);
  lines.push(`DESCRIPTION:${icsEscape(eventDetails(i))}`, "TRANSP:OPAQUE", "END:VEVENT", "END:VCALENDAR");
  return lines.map(icsFold).join("\r\n") + "\r\n";
}

export function icsFileName(i: Pick<ScheduleInput, "number" | "lang">): string {
  return `${i.lang === "fr" ? "travaux" : "job"}-${i.number.replace(/[^A-Za-z0-9-]/g, "") || "tradequote"}.ics`;
}
