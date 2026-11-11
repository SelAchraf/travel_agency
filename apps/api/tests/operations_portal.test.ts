import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { connectDatabase, disconnectDatabase, db } from "../src/database/connection.js";
import { seedDatabase } from "../src/database/seed.js";
import { auditLogs, departures, travelOffers, customers, reservations, reservationTravellers } from "../src/database/schema.js";
import { eq, desc } from "drizzle-orm";

describe("Phase 2: Operations, Departures & Customer Portal Integration Tests", () => {
  const app = createApp();

  let adminToken = "";
  let agentToken = "";
  let departureId = "";
  let customerAId = "";
  let customerBId = "";
  let reservationAId = "";
  let reservationBId = "";
  let portalTokenA = "";
  let portalDocIdA = "";

  beforeAll(async () => {
    await connectDatabase();
    await seedDatabase();

    // 1. Log in admin (owner)
    const adminRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "admin@numidiavoyages.dz",
        password: "PasswordSecure2026!",
      });
    adminToken = adminRes.body.accessToken;

    // 2. Log in agent
    const agentRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "agent@numidiavoyages.dz",
        password: "PasswordSecure2026!",
      });
    agentToken = agentRes.body.accessToken;

    // 3. Create destination & offer with departure
    const destRes = await request(app)
      .post("/api/v1/admin/destinations")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        slug: "timimoun-oasis-rouge",
        name: { ar: "تيميمون الواحة الحمراء", fr: "Timimoun L'Oasis Rouge" },
        category: "domestic",
        wilayaOrCountry: "Timimoun (49)",
        description: { ar: "وصف تيميمون", fr: "Description de Timimoun" },
        coverImageUrl: "https://images.unsplash.com/timimoun.jpg",
      });

    const offerRes = await request(app)
      .post("/api/v1/admin/offers")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        slug: "timimoun-raid-4x4-2026",
        title: { ar: "رحلة تيميمون واكتشاف القصور", fr: "Raid Timimoun & Ksour" },
        destinationId: destRes.body.data.id,
        tripType: "guided_tour",
        durationDays: 5,
        durationNights: 4,
        basePriceCentimes: 6500000,
        currency: "DZD",
        hotelDetails: { ar: "فندق جنان القرارة", fr: "Hôtel Jenan Gourara" },
        transportDetails: { ar: "تويوتا 4x4", fr: "Toyota Land Cruiser 4x4" },
        itinerary: [
          { dayNumber: 1, title: { ar: "يوم 1", fr: "Jour 1" }, description: { ar: "وصول", fr: "Arrivée" } },
        ],
        inclusions: { ar: ["نقل"], fr: ["Transport"] },
        exclusions: { ar: ["مصاريف شخصية"], fr: ["Dépenses"] },
        photos: [{ url: "https://images.unsplash.com/photo.jpg", isCover: true }],
      });

    const depRes = await request(app)
      .post(`/api/v1/admin/offers/${offerRes.body.data.id}/departures`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        departureDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        returnDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        maxCapacity: 12,
      });
    departureId = depRes.body.data.id;

    // 4. Create Customer A & Reservation A
    const custARes = await request(app)
      .post("/api/v1/admin/customers")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        fullName: "Amine Cherif",
        phone: "0550 11 22 33",
        email: "amine.cherif@gmail.com",
        wilayaCode: 16,
        preferredLanguage: "fr",
      });
    customerAId = custARes.body.data.id;

    const resARes = await request(app)
      .post("/api/v1/admin/reservations")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        customerId: customerAId,
        offerId: offerRes.body.data.id,
        departureId,
        passengerCount: 2,
        travellers: [
          { fullName: "Amine Cherif", isPrimaryContact: true, roomAllocation: "double" },
          { fullName: "Sarah Cherif", isPrimaryContact: false, roomAllocation: "double" },
        ],
      });
    reservationAId = resARes.body.data.id;

    // 5. Create Customer B & Reservation B
    const custBRes = await request(app)
      .post("/api/v1/admin/customers")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        fullName: "Sofiane Benali",
        phone: "0770 99 88 77",
        email: "sofiane.benali@gmail.com",
        wilayaCode: 31,
        preferredLanguage: "fr",
      });
    customerBId = custBRes.body.data.id;

    const resBRes = await request(app)
      .post("/api/v1/admin/reservations")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        customerId: customerBId,
        offerId: offerRes.body.data.id,
        departureId,
        passengerCount: 1,
        travellers: [
          { fullName: "Sofiane Benali", isPrimaryContact: true, roomAllocation: "single" },
        ],
      });
    reservationBId = resBRes.body.data.id;
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe("1. Departure Operations, Manifests & Capacity Override", () => {
    it("lists departures with calculated occupancy percentage and capacity status", async () => {
      const res = await request(app)
        .get("/api/v1/admin/departures")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const targetDep = res.body.data.find((d: any) => d.id === departureId);
      expect(targetDep).toBeDefined();
      expect(targetDep.maxCapacity).toBe(12);
      expect(targetDep.bookedPlaces).toBe(3); // 2 from A + 1 from B
      expect(targetDep.occupancyPercent).toBe(25);
    });

    it("retrieves passenger manifest with room allocations and payment balances", async () => {
      const res = await request(app)
        .get(`/api/v1/admin/departures/${departureId}/manifest`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.passengerCount).toBe(3);
      expect(res.body.data.reservationsCount).toBe(2);

      const manifest = res.body.data.manifest;
      expect(manifest.length).toBe(3);
      expect(manifest.some((p: any) => p.fullName === "Amine Cherif")).toBe(true);
      expect(manifest.some((p: any) => p.fullName === "Sarah Cherif")).toBe(true);
      expect(manifest.some((p: any) => p.fullName === "Sofiane Benali")).toBe(true);
    });

    it("updates departure status with audit logging (DEPARTURE_STATUS_CHANGE)", async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/departures/${departureId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "closed" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("closed");

      // Verify audit log
      const [audit] = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.entityId, departureId))
        .orderBy(desc(auditLogs.timestamp))
        .limit(1);

      expect(audit?.action).toBe("DEPARTURE_STATUS_CHANGE");
    });

    it("allows manager to override capacity and records mandatory reason in audit log", async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/departures/${departureId}/override`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          extraPlaces: 4,
          reason: "Ajout d'un 4x4 supplémentaire pour répondre à la demande",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.maxCapacity).toBe(16); // 12 + 4
      expect(res.body.data.managerOverrides.length).toBeGreaterThanOrEqual(1);

      // Verify audit log
      const [audit] = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.action, "CAPACITY_OVERRIDE"))
        .orderBy(desc(auditLogs.timestamp))
        .limit(1);

      expect(audit).toBeDefined();
      const diff = audit?.diffSummary as Record<string, any> | undefined;
      expect(diff?.reason).toContain("Ajout d'un 4x4");
    });
  });

  describe("2. Customer Portal Authentication & Anti-IDOR Security", () => {
    let rawTokenA = "";

    it("generates a secure 32-byte portal link token from back-office", async () => {
      const res = await request(app)
        .post(`/api/v1/admin/customers/${customerAId}/portal-link`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ expiresInDays: 14 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rawToken).toHaveLength(64); // 32 bytes hex
      expect(res.body.data.customerName).toBe("Amine Cherif");

      rawTokenA = res.body.data.rawToken;
    });

    it("rejects invalid or forged portal tokens with 401", async () => {
      const res = await request(app)
        .post("/api/v1/portal/auth/verify-link")
        .send({ token: "invalid-token-1234567890" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("authenticates customer via magic link token and issues portal JWT session", async () => {
      const res = await request(app)
        .post("/api/v1/portal/auth/verify-link")
        .send({ token: rawTokenA });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customer.fullName).toBe("Amine Cherif");
      expect(res.body.data.token).toBeDefined();

      portalTokenA = res.body.data.token;
    });

    it("returns customer reservations list via GET /api/v1/portal/me", async () => {
      const res = await request(app)
        .get("/api/v1/portal/me")
        .set("Authorization", `Bearer ${portalTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.reservations)).toBe(true);
      expect(res.body.data.reservations.length).toBe(1);
      expect(res.body.data.reservations[0].id).toBe(reservationAId);
    });

    it("allows Customer A to view their own reservation details (Anti-IDOR Valid)", async () => {
      const res = await request(app)
        .get(`/api/v1/portal/reservations/${reservationAId}`)
        .set("Authorization", `Bearer ${portalTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reservation.id).toBe(reservationAId);
      expect(res.body.data.travellers.length).toBe(2);
      expect(res.body.data.reservation.agreedTotalCentimes).toBe(13000000); // 2 * 65000 DA
    });

    it("CRITICAL ANTI-IDOR: Blocks Customer A from accessing Customer B's reservation with 404/403", async () => {
      const res = await request(app)
        .get(`/api/v1/portal/reservations/${reservationBId}`)
        .set("Authorization", `Bearer ${portalTokenA}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain("refusé");
    });

    it("allows Customer A to upload a valid passport PDF via protected portal flow", async () => {
      const validPdfBuffer = Buffer.from("%PDF-1.4\n%Biometric passport of Amine Cherif\n%%EOF");

      const res = await request(app)
        .post(`/api/v1/portal/reservations/${reservationAId}/documents/upload`)
        .set("Authorization", `Bearer ${portalTokenA}`)
        .field("documentType", "passport")
        .attach("file", validPdfBuffer, "amine_passport.pdf");

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.documentNumber).toMatch(/^DOC-2026-\d{6}$/);
      expect(res.body.data.mimeType).toBe("application/pdf");

      portalDocIdA = res.body.data.id;
    });

    it("CRITICAL ANTI-IDOR: Blocks Customer A from uploading documents to Customer B's reservation", async () => {
      const validPdfBuffer = Buffer.from("%PDF-1.4\n%Hacker document\n%%EOF");

      const res = await request(app)
        .post(`/api/v1/portal/reservations/${reservationBId}/documents/upload`)
        .set("Authorization", `Bearer ${portalTokenA}`)
        .field("documentType", "passport")
        .attach("file", validPdfBuffer, "hacked.pdf");

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("allows Customer A to securely stream their uploaded document", async () => {
      const res = await request(app)
        .get(`/api/v1/portal/documents/${portalDocIdA}/download`)
        .set("Authorization", `Bearer ${portalTokenA}`);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("application/pdf");
      expect(res.headers["content-disposition"]).toContain("amine_passport.pdf");
    });

    it("allows Customer A to submit a question/message regarding their booking", async () => {
      const res = await request(app)
        .post(`/api/v1/portal/reservations/${reservationAId}/messages`)
        .set("Authorization", `Bearer ${portalTokenA}`)
        .send({
          subject: "Régime alimentaire",
          message: "Bonjour, l'un des passagers suit un régime sans sel. Est-ce pris en compte pour les repas du bivouac ?",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.senderType).toBe("customer");
      expect(res.body.data.message).toContain("sans sel");
    });

    it("retrieves portal messages for Customer A", async () => {
      const res = await request(app)
        .get(`/api/v1/portal/reservations/${reservationAId}/messages`)
        .set("Authorization", `Bearer ${portalTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("3. Operational Notifications & WhatsApp Workflows", () => {
    it("scans system and generates balance due and missing document alerts", async () => {
      const res = await request(app)
        .post("/api/v1/admin/notifications/scan")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.alertsGenerated).toBe("number");
    });

    it("lists staff notifications with WhatsApp deep links", async () => {
      const res = await request(app)
        .get("/api/v1/admin/notifications")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      if (res.body.data.length > 0) {
        const notif = res.body.data[0];
        expect(notif.recipientType).toBe("staff");
        expect(notif.title).toBeDefined();

        // Mark notification as read
        const readRes = await request(app)
          .patch(`/api/v1/admin/notifications/${notif.id}/read`)
          .set("Authorization", `Bearer ${adminToken}`);

        expect(readRes.status).toBe(200);
        expect(readRes.body.data.status).toBe("read");
      }
    });
  });
});
