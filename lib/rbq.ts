/**
 * Régie du bâtiment du Québec (RBQ) licence number helpers.
 * A licence number has 10 digits, written XXXX-XXXX-XX (e.g. 1234-5678-01).
 * The RBQ requires licence holders to show it on estimates, quotes, contracts, statements and invoices.
 */
export function rbqDigits(input: string): string {
  return String(input ?? "").replace(/\D/g, "").slice(0, 10);
}

/** Progressive formatting while typing: "12345" -> "1234-5", full -> "1234-5678-01". */
export function formatRbq(input: string): string {
  const d = rbqDigits(input);
  if (d.length <= 4) return d;
  if (d.length <= 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 8)}-${d.slice(8)}`;
}

export function isValidRbq(input: string): boolean {
  return rbqDigits(input).length === 10 && /^[\d\s-]+$/.test(String(input).trim());
}

/** Line printed on documents, e.g. "Licence RBQ : 1234-5678-01". Empty string if not valid. */
export function rbqLine(input: string, lang: "fr" | "en" = "fr"): string {
  if (!isValidRbq(input)) return "";
  return lang === "fr" ? `Licence RBQ : ${formatRbq(input)}` : `RBQ licence: ${formatRbq(input)}`;
}
