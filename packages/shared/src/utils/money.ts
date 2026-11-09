/**
 * Algerian Travel Agency Platform - Currency & Money Utilities
 * Money is stored strictly as integer centimes (1 DZD = 100 centimes).
 * Displays as "12 500 DA" in French and "12 500 دج" in Arabic.
 */

export function formatDZD(centimes: number, locale: "ar" | "fr" = "fr"): string {
  if (!Number.isInteger(centimes)) {
    throw new Error(`Monetary amount must be an integer (centimes). Received: ${centimes}`);
  }

  const dinars = Math.floor(centimes / 100);
  const formatted = dinars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  return locale === "ar" ? `${formatted} دج` : `${formatted} DA`;
}

export function dinarsToCentimes(dinars: number): number {
  return Math.round(dinars * 100);
}

export function centimesToDinars(centimes: number): number {
  if (!Number.isInteger(centimes)) {
    throw new Error(`Centimes must be an integer. Received: ${centimes}`);
  }
  return centimes / 100;
}
