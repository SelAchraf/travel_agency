import { describe, it, expect } from "vitest";
import { formatDZD } from "@travel-agency/shared";
import fr from "./i18n/locales/fr.json";
import ar from "./i18n/locales/ar.json";

describe("Public Website (apps/web) Suite", () => {
  it("formats DZD currency strictly in integer centimes for website display", () => {
    // 145 000 DA = 14 500 000 centimes
    expect(formatDZD(14500000, "fr")).toBe("145 000 DA");
    expect(formatDZD(14500000, "ar")).toBe("145 000 دج");

    // 85 000 DA = 8 500 000 centimes
    expect(formatDZD(8500000, "fr")).toBe("85 000 DA");
    expect(formatDZD(8500000, "ar")).toBe("85 000 دج");
  });

  it("verifies bilingual parity across all critical translation namespaces", () => {
    const namespaces = [
      "nav",
      "common",
      "home",
      "offers",
      "offerDetail",
      "destinations",
      "services",
      "about",
      "contact",
      "faq",
      "bookingModal",
      "footer",
    ] as const;

    for (const ns of namespaces) {
      expect(fr[ns]).toBeDefined();
      expect(ar[ns]).toBeDefined();

      const frKeys = Object.keys(fr[ns]);
      const arKeys = Object.keys(ar[ns]);

      expect(arKeys.length).toBeGreaterThan(0);
      expect(frKeys.length).toBeGreaterThan(0);

      // Check key parity
      for (const k of frKeys) {
        expect((ar[ns] as Record<string, string>)[k]).toBeDefined();
      }
    }
  });

  it("contains valid Algerian contact and licence data in translations", () => {
    expect(fr.common.licence).toContain("16/0423/AVT");
    expect(ar.common.licence).toContain("16/0423/AVT");
    expect(fr.contact.phoneNumbers).toContain("021 63 45 78");
    expect(ar.contact.phoneNumbers).toContain("021 63 45 78");
  });

  it("includes legal disclaimer on booking request form", () => {
    expect(fr.bookingModal.disclaimer).toContain("demande de réservation préalable");
    expect(ar.bookingModal.disclaimer).toContain("طلباً أولياً للحجز");
  });
});
