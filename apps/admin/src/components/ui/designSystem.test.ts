import { describe, it, expect } from "vitest";
import { formatDZD } from "@travel-agency/shared";

describe("Admin Design System Helpers", () => {
  it("formats Algerian dinar amounts consistently for admin UI", () => {
    expect(formatDZD(14500000, "fr")).toBe("145 000 DA");
    expect(formatDZD(14500000, "ar")).toBe("145 000 دج");
  });
});

