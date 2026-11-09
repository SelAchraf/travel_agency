import { describe, it, expect } from "vitest";
import { formatDZD, dinarsToCentimes, centimesToDinars } from "./money.js";
import { normalizeAlgerianPhone, isValidAlgerianPhone } from "./phone.js";
import { hasPermission } from "../constants/permissions.js";

describe("Money Utilities", () => {
  it("formats integer centimes to DZD strings correctly", () => {
    expect(formatDZD(1250000, "fr")).toBe("12 500 DA");
    expect(formatDZD(1250000, "ar")).toBe("12 500 دج");
    expect(formatDZD(0, "fr")).toBe("0 DA");
    expect(formatDZD(10000000, "fr")).toBe("100 000 DA");
  });

  it("converts between dinars and centimes accurately", () => {
    expect(dinarsToCentimes(12500)).toBe(1250000);
    expect(centimesToDinars(1250000)).toBe(12500);
  });

  it("throws on non-integer centimes to prevent float contamination", () => {
    expect(() => formatDZD(1250.5, "fr")).toThrow();
  });
});

describe("Phone Utilities", () => {
  it("normalizes and validates Algerian phone numbers", () => {
    expect(normalizeAlgerianPhone("0550123456")).toBe("+213550123456");
    expect(isValidAlgerianPhone("0550123456")).toBe(true);
    expect(isValidAlgerianPhone("0661234567")).toBe(true);
    expect(isValidAlgerianPhone("0770998877")).toBe(true);
    expect(isValidAlgerianPhone("021123456")).toBe(true); // Algiers landline
    expect(isValidAlgerianPhone("123456")).toBe(false);
  });
});

describe("Permission Matrix", () => {
  it("verifies role permissions strictly", () => {
    expect(hasPermission("owner", "users:manage")).toBe(true);
    expect(hasPermission("owner", "payments:refund")).toBe(true);
    expect(hasPermission("manager", "departures:capacity_override")).toBe(true);
    expect(hasPermission("reservation_agent", "departures:capacity_override")).toBe(false);
    expect(hasPermission("reservation_agent", "payments:refund")).toBe(false);
    expect(hasPermission("content_editor", "offers:write")).toBe(true);
    expect(hasPermission("content_editor", "payments:read")).toBe(false);
  });
});
