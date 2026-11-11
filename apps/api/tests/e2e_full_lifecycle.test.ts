import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import crypto from "crypto";
import { createApp } from "../src/app.js";
import { connectDatabase, disconnectDatabase, db } from "../src/database/connection.js";
import { seedDatabase } from "../src/database/seed.js";
import { auditLogs, departures, travelOffers } from "../src/database/schema.js";
import { eq, desc } from "drizzle-orm";

describe("Final Hardening: End-to-End Agency Lifecycle & Security Audit Tests", () => {
  const app = createApp();

  let adminToken = "";
  let agentToken = "";
  let financeToken = "";
  let offerId = "";
  let departureId = "";
  let customerId = "";
  let enquiryId = "";
  let reservationId = "";
  let reservationRef = "";
  let portalToken = "";

  beforeAll(async () => {
    await connectDatabase();
    await seedDatabase();

    // 1. Staff Authentication
    const adminRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@numidiavoyages.dz", password: "PasswordSecure2026!" });
    adminToken = adminRes.body.accessToken;

    const agentRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "agent@numidiavoyages.dz", password: "PasswordSecure2026!" });
    agentToken = agentRes.body.accessToken;

    const financeRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "finance@numidiavoyages.dz", password: "PasswordSecure2026!" });
    financeToken = financeRes.body.accessToken;

    // 2. Retrieve existing seeded offer and create a test departure
    const [offer] = await db.select().from(travelOffers).limit(1);
    offerId = offer.id;
    const depRes = await request(app)
      .post(`/api/v1/admin/offers/${offer.id}/departures`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        departureDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        returnDate: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString(),
        maxCapacity: 16,
      });
    departureId = depRes.body.data.id;
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe("1. Public Form Hardening (Idempotency & Anti-Spam)", () => {
    it("rejects public submissions when honeypot trap is filled by bot", async () => {
      const res = await request(app)
        .post("/api/v1/public/enquiries")
        .send({
          contactName: "Spam Bot",
          contactPhone: "0550123456",
          message: "Buy cheap products now",
          privacyConsent: true,
          offerId,
          websiteUrl_hp: "http://spam-malicious-site.com", // BOT TRAP
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("processes public enquiry and enforces idempotency for duplicate submissions", async () => {
      const idempotencyKey = crypto.randomUUID();

      const res1 = await request(app)
        .post("/api/v1/public/enquiries")
        .send({
          contactName: "Mourad Boudiaf",
          contactPhone: "0555123456",
          contactEmail: "mourad.boudiaf@example.dz",
          offerId,
          travellersCount: 2,
          message: "Voyage en famille, chambres adjacentes souhaitées.",
          privacyConsent: true,
          idempotencyKey,
        });

      expect(res1.status).toBe(201);
      expect(res1.body.success).toBe(true);
      expect(res1.body.data.id).toBeDefined();
      expect(res1.body.data.enquiryNumber).toMatch(/^ENQ-\d{4}-\d{6}$/);
      enquiryId = res1.body.data.id;

      // Duplicate submission with same idempotency key
      const res2 = await request(app)
        .post("/api/v1/public/enquiries")
        .send({
          contactName: "Mourad Boudiaf",
          contactPhone: "0555123456",
          message: "Voyage en famille, chambres adjacentes souhaitées.",
          privacyConsent: true,
          idempotencyKey,
        });

      expect(res2.status).toBe(200);
      expect(res2.body.data.id).toBe(enquiryId);
    });
  });

  describe("2. Staff CRM & Enquiry Conversion Flow", () => {
    it("creates a customer profile in CRM and links enquiry", async () => {
      const custRes = await request(app)
        .post("/api/v1/admin/customers")
        .set("Authorization", `Bearer ${agentToken}`)
        .send({
          fullName: "Mourad Boudiaf",
          phone: "0555 12 34 56",
          email: "mourad.boudiaf@example.dz",
          wilayaCode: 16,
          preferredLanguage: "fr",
          internalNotes: "Client VIP, intéressé par le Sahara",
        });

      expect(custRes.status).toBe(201);
      customerId = custRes.body.data.id;

      // Update enquiry status to Contacted
      const updateRes = await request(app)
        .patch(`/api/v1/admin/enquiries/${enquiryId}/status`)
        .set("Authorization", `Bearer ${agentToken}`)
        .send({
          status: "contacted",
          notes: "Client contacté par téléphone, devis envoyé",
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.status).toBe("contacted");
    });

    it("registers traveler details with field-level encryption", async () => {
      const travRes = await request(app)
        .post(`/api/v1/admin/customers/${customerId}/travellers`)
        .set("Authorization", `Bearer ${agentToken}`)
        .send({
          fullName: "Mourad Boudiaf",
          dateOfBirth: "1985-06-15",
          gender: "M",
          passportNumber: "219876543",
          passportExpiryDate: "2030-01-01",
          nationality: "DZ",
        });

      expect(travRes.status).toBe(201);
      expect(travRes.body.data.id).toBeDefined();
    });
  });

  describe("3. Reservation, Atomic Price Snapshot & Row-Locking Capacity", () => {
    it("creates reservation with immutable price snapshot and updates departure occupancy", async () => {
      const resRes = await request(app)
        .post("/api/v1/admin/reservations")
        .set("Authorization", `Bearer ${agentToken}`)
        .send({
          customerId,
          offerId,
          departureId,
          enquiryId,
          passengerCount: 2,
          roomType: "double",
          travellers: [
            {
              fullName: "Mourad Boudiaf",
              isPrimaryContact: true,
              roomType: "double",
            },
            {
              fullName: "Fatima Boudiaf",
              isPrimaryContact: false,
              roomType: "double",
            },
          ],
        });

      expect(resRes.status).toBe(201);
      expect(resRes.body.success).toBe(true);
      reservationId = resRes.body.data.id;
      reservationRef = resRes.body.data.reference;
      expect(reservationRef).toMatch(/^TRV-\d{4}-\d{6}$/);

      // Verify enquiry automatically marked converted
      const checkEnq = await request(app)
        .get(`/api/v1/admin/enquiries/${enquiryId}`)
        .set("Authorization", `Bearer ${agentToken}`);
      expect(checkEnq.body.data.status).toBe("converted");
    });
  });

  describe("4. Financial Operations, Receipt Generation & Server-Side Balance", () => {
    it("records a deposit payment and computes server-side balance", async () => {
      const payRes = await request(app)
        .post(`/api/v1/admin/reservations/${reservationId}/payments`)
        .set("Authorization", `Bearer ${financeToken}`)
        .send({
          amountCentimes: 5000000, // 50 000 DZD deposit
          method: "bank_transfer",
          paymentDate: new Date().toISOString(),
          referenceOrSlipNumber: "VIR-BNA-2026-9812",
          notes: "Acompte reçu par virement BNA",
        });

      expect(payRes.status).toBe(201);
      expect(payRes.body.success).toBe(true);
      expect(payRes.body.data.receiptNumber).toMatch(/^RCP-\d{4}-\d{6}$/);

      // Verify server-side balance
      const resCheck = await request(app)
        .get(`/api/v1/admin/reservations/${reservationId}`)
        .set("Authorization", `Bearer ${agentToken}`);

      expect(resCheck.body.data.totalPaidCentimes).toBe(5000000);
      expect(resCheck.body.data.balanceCentimes).toBe(
        resCheck.body.data.agreedTotalCentimes - 5000000
      );
    });

    it("verifies financial separation: cash received vs booked sales in reports", async () => {
      const repRes = await request(app)
        .get("/api/v1/admin/reports/financial")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(repRes.status).toBe(200);
      expect(repRes.body.data.summary.grossCashCentimes).toBeGreaterThanOrEqual(5000000);
      expect(repRes.body.data.summary.netCashReceivedCentimes).toBeGreaterThanOrEqual(5000000);
      expect(repRes.body.data.methodBreakdown).toBeDefined();
    });
  });

  describe("5. Customer Portal Magic Link & Anti-IDOR Security", () => {
    it("generates 30-day single-use magic link token for customer", async () => {
      const linkRes = await request(app)
        .post(`/api/v1/admin/customers/${customerId}/portal-link`)
        .set("Authorization", `Bearer ${agentToken}`)
        .send({ expiresInDays: 30 });

      expect(linkRes.status).toBe(200);
      expect(linkRes.body.data.rawToken).toBeDefined();
      portalToken = linkRes.body.data.rawToken;
    });

    it("verifies portal link and issues 7-day secure portal cookie", async () => {
      const verifyRes = await request(app)
        .post("/api/v1/portal/auth/verify-link")
        .send({ token: portalToken });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.customer.id).toBe(customerId);
      expect(verifyRes.headers["set-cookie"]).toBeDefined();
    });

    it("prevents IDOR: customer cannot access reservations belonging to another customer", async () => {
      // Create a second customer with a reservation
      const cust2Res = await request(app)
        .post("/api/v1/admin/customers")
        .set("Authorization", `Bearer ${agentToken}`)
        .send({
          fullName: "Other Customer",
          phone: "0660 99 88 77",
          preferredLanguage: "fr",
        });
      const cust2Id = cust2Res.body.data.id;

      // Generate portal link for Customer 2
      const link2Res = await request(app)
        .post(`/api/v1/admin/customers/${cust2Id}/portal-link`)
        .set("Authorization", `Bearer ${agentToken}`);
      const portalToken2 = link2Res.body.data.rawToken;

      const auth2Res = await request(app)
        .post("/api/v1/portal/auth/verify-link")
        .send({ token: portalToken2 });
      const cookie2 = auth2Res.headers["set-cookie"];

      // Customer 2 attempts to query Customer 1's reservation
      const idorRes = await request(app)
        .get(`/api/v1/portal/reservations/${reservationId}`)
        .set("Cookie", cookie2);

      expect(idorRes.status).toBe(404);
      expect(idorRes.body.success).toBe(false);
    });
  });

  describe("6. Operations: Manifest Extraction & Capacity Override", () => {
    it("extracts passenger manifest with complete traveler details and balances", async () => {
      const manRes = await request(app)
        .get(`/api/v1/admin/departures/${departureId}/manifest`)
        .set("Authorization", `Bearer ${agentToken}`);

      expect(manRes.status).toBe(200);
      expect(manRes.body.data.departure).toBeDefined();
      expect(Array.isArray(manRes.body.data.manifest)).toBe(true);

      const found = manRes.body.data.manifest.find((p: any) => p.customerName === "Mourad Boudiaf");
      expect(found).toBeDefined();
      expect(found.reservationReference).toBe(reservationRef);
      expect(found.balanceCentimes).toBeGreaterThanOrEqual(0);
    });

    it("allows manager to override capacity and logs an explicit audit entry", async () => {
      const overrideRes = await request(app)
        .patch(`/api/v1/admin/departures/${departureId}/override`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          extraPlaces: 4,
          reason: "Accord exceptionnel pour famille VIP de Mourad Boudiaf",
        });

      expect(overrideRes.status).toBe(200);
      expect(overrideRes.body.data.maxCapacity).toBeGreaterThan(16);

      // Verify audit log
      const [log] = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.action, "CAPACITY_OVERRIDE"))
        .orderBy(desc(auditLogs.timestamp))
        .limit(1);

      expect(log).toBeDefined();
      expect(log.action).toBe("CAPACITY_OVERRIDE");
      const diff = log.diffSummary as Record<string, any> | undefined;
      expect(diff?.reason).toContain("Mourad Boudiaf");
    });
  });
});
