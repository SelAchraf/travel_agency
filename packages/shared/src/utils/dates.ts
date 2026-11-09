/**
 * Algerian Date Formatting Utilities (Africa/Algiers)
 */

export function formatAlgerianDate(
  date: Date | string,
  locale: "ar" | "fr" = "fr",
  includeTime = false,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Africa/Algiers",
    year: "numeric",
    month: "long",
    day: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  };

  return new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ" : "fr-DZ", options).format(d);
}

export function formatAlgerianShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Africa/Algiers",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };

  return new Intl.DateTimeFormat("fr-DZ", options).format(d);
}
