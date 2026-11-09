/**
 * Algerian Phone Number Validation & Normalization
 * Standard mobile: 05XX, 06XX, 07XX (10 digits)
 * Standard landline: 02X, 03X, 04X (9 digits)
 * International format: +213...
 */

export function normalizeAlgerianPhone(input: string): string {
  // Strip all non-digit and non-plus characters
  let cleaned = input.replace(/[^\d+]/g, "");

  if (cleaned.startsWith("00213")) {
    cleaned = "+213" + cleaned.slice(5);
  } else if (cleaned.startsWith("213")) {
    cleaned = "+213" + cleaned.slice(3);
  } else if (cleaned.startsWith("0") && cleaned.length >= 9) {
    cleaned = "+213" + cleaned.slice(1);
  }

  return cleaned;
}

export function isValidAlgerianPhone(input: string): boolean {
  const normalized = normalizeAlgerianPhone(input);
  // Matches +213 followed by 5/6/7 (mobile, 8 digits) or 2/3/4 (landline, 7-8 digits)
  const regex = /^\+213[5-7]\d{8}$|^\+213[2-4]\d{7,8}$/;
  return regex.test(normalized);
}
