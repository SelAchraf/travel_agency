import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/database/connection.js";
import { seedDatabase } from "../src/database/seed.js";

describe("Phase 1C: Reservations, Payments & Receipts Integration Tests", () => {
  const app = createApp();

  let adminToken = "";
  let agentToken = "";
  let financeToken = "";
  let customerId = "";
  let offerId = "";
  let departureId = "";
  let reservationId = "";
  let paymentId = "";

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

    // 2. Log in agent (reservation_agent)
    const agentRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "agent@numidiavoyages.dz",
        password: "PasswordSecure2026!",
      });
    agentToken = agentRes.body.accessToken;

    // 3. Log in finance (finance)
    const financeRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "finance@numidiavoyages.dz",
        password: "PasswordSecure2026!",
      });
    financeToken = financeRes.body.accessToken;

    // 4. Create customer for testing
    const custRes = await request(app)
      .post("/api/v1/admin/customers")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        fullName: "Youcef Belhadj",
        phone: "0550 44 55 66",
        email: "youcef.belhadj@gmail.com",
        wilayaCode: 16,
        preferredLanguage: "fr",
      });
    customerId = custRes.body.data.id;

    // 5. Create destination & travel offer
    const destRes = await request(app)
      .post("/api/v1/admin/destinations")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        slug: "djanet-tassili",
        name: { ar: "جانت طاسيلي ناجر", fr: "Djanet Tassili N'Ajjer" },
        category: "domestic",
        wilayaOrCountry: "Djanet (56)",
        description: {
          ar: "رحلة استكشافية إلى أعماق طاسيلي ناجر",
          fr: "Expédition au cœur du Tassili N'Ajjer et ses gravures rupestres",
        },
        coverImageUrl: "/images/djanet.webp",
        galleryImages: [],
        isFeatured: true,
        isPublished: true,
      });

    const offerRes = await request(app)
      .post("/api/v1/admin/offers")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        slug: "bivouac-djanet-7j",
        title: {
          ar: "مغامرة طاسيلي جانت 7 أيام",
          fr: "Aventure Tassili Djanet 7 jours",
        },
        destinationId: destRes.body.data.id,
        tripType: "trekking",
        durationDays: 7,
        durationNights: 6,
        basePriceCentimes: 8500000, // 85 000 DA per person
        currency: "DZD",
        pricingBasis: "per_person",
        availabilityStatus: "available",
        hotelDetails: { ar: "مخيمات صحراوية مجهزة", fr: "Bivouac saharien tout confort" },
        transportDetails: { ar: "سيارات رباعية الدفع 4x4", fr: "Véhicules 4x4 tout-terrain" },
        itinerary: [
          {
            dayNumber: 1,
            title: { ar: "الوصول", fr: "Arrivée" },
            description: { ar: "الاستقبال في مطار جانت", fr: "Accueil aéroport Djanet" },
          },
        ],
        inclusions: { ar: ["جميع الوجبات", "النقل 4x4"], fr: ["Pension complète", "4x4"] },
        exclusions: { ar: ["المصاريف الشخصية"], fr: ["Dépenses personnelles"] },
        photos: [],
        isPublished: true,
      });
    offerId = offerRes.body.data.id;

    // 6. Create departure with max capacity = 5 places
    const depDate = new Date();
    depDate.setDate(depDate.getDate() + 20);
    const retDate = new Date(depDate);
    retDate.setDate(retDate.getDate() + 7);

    const depRes = await request(app)
      .post(`/api/v1/admin/offers/${offerId}/departures`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        offerId,
        departureDate: depDate.toISOString(),
        returnDate: retDate.toISOString(),
        maxCapacity: 5,
      });
    departureId = depRes.body.data.id;
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe("1. Reservation Creation, Reference & Price Snapshot Immutability", () => {
    it("creates reservation with atomic sequence reference TRV-2026-XXXXXX and frozen snapshot", async () => {
      const res = await request(app)
        .post("/api/v1/admin/reservations")
        .set("Authorization", `Bearer ${agentToken}`)
        .send({
          customerId,
          offerId,
          departureId,
          passengerCount: 2,
          travellers: [
            { fullName: "Youcef Belhadj", isPrimaryContact: true, passportNumber: "P123456" },
            { fullName: "Fatima Belhadj", isPrimaryContact: false, passportNumber: "P654321" },
          ],
          specialRequirements: "Chambre avec lit double si disponible en hôtel relais",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reference).toMatch(/^TRV-2026-\d{6}$/);
      expect(res.body.data.passengerCount).toBe(2);
      expect(res.body.data.agreedTotalCentimes).toBe(17000000); // 85 000 * 2 = 170 000 DA (17 000 000 centimes)
      expect(res.body.data.offerSnapshot).toBeDefined();
      expect(res.body.data.offerSnapshot.unitPriceCentimes).toBe(8500000);
      expect(res.body.data.offerSnapshot.currency).toBe("DZD");
      expect(res.body.data.currentStatus).toBe("pending");

      // Balance check
      expect(res.body.data.balanceCentimes).toBe(17000000);
      expect(res.body.data.totalPaidCentimes).toBe(0);
      expect(res.body.data.paymentStatus).toBe("unpaid");

      reservationId = res.body.data.id;
    });

    it("verifies price snapshot immutability: updating offer price does NOT change existing reservation total", async () => {
      // Modify travel offer price to 120 000 DA (12 000 000 centimes)
      await request(app)
        .put(`/api/v1/admin/offers/${offerId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          basePriceCentimes: 12000000,
        });

      // Fetch existing reservation
      const res = await request(app)
        .get(`/api/v1/admin/reservations/${reservationId}`)
        .set("Authorization", `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.agreedTotalCentimes).toBe(17000000); // Remains 170 000 DA
      expect(res.body.data.offerSnapshot.unitPriceCentimes).toBe(8500000); // Snapshot preserved
    });
  });

  describe("2. Departure Capacity & Row-Level Locking", () => {
    it("checks departure capacity: 2 booked places out of 5 leaves 3 available", async () => {
      const res = await request(app).get(`/api/v1/public/offers/bivouac-djanet-7j`);

      expect(res.status).toBe(200);
      const dep = res.body.data.departures.find((d: any) => d.id === departureId);
      expect(dep).toBeDefined();
      expect(dep.bookedPlaces).toBe(2);
      expect(dep.availablePlaces).toBe(3);
    });

    it("prevents reservation agent from overbooking beyond remaining capacity", async () => {
      // Attempting to book 4 passengers when only 3 places remain
      const res = await request(app)
        .post("/api/v1/admin/reservations")
        .set("Authorization", `Bearer ${agentToken}`)
        .send({
          customerId,
          offerId,
          departureId,
          passengerCount: 4, // 4 > 3 remaining
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain("Capacité insuffisante");
    });

    it("allows manager/owner to override capacity during reservation creation with audit trail", async () => {
      const res = await request(app)
        .post("/api/v1/admin/reservations")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          customerId,
          offerId,
          departureId,
          passengerCount: 4, // Exceeds capacity by 1 place
          managerOverride: {
            reason: "Surréservation exceptionnelle validée par le gérant pour famille VIP",
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Verify departure was expanded
      const depRes = await request(app).get(`/api/v1/public/offers/bivouac-djanet-7j`);
      const dep = depRes.body.data.departures.find((d: any) => d.id === departureId);
      expect(dep.maxCapacity).toBe(6); // 5 + 1
      expect(dep.bookedPlaces).toBe(6); // 2 + 4
      expect(dep.availablePlaces).toBe(0);
    });
  });

  describe("3. Authorized Discounts & Audit", () => {
    it("forbids unauthorized staff from applying discounts", async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/reservations/${reservationId}/discount`)
        .set("Authorization", `Bearer ${agentToken}`)
        .send({
          discountCentimes: 1000000, // 10 000 DA
          reason: "Remise amitié",
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("allows manager/owner to apply discount and recomputes agreed total", async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/reservations/${reservationId}/discount`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          discountCentimes: 1000000, // 10 000 DA discount
          reason: "Remise commerciale fidélité 10 000 DA validée par le Directeur",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.discountCentimes).toBe(1000000);
      expect(res.body.data.agreedTotalCentimes).toBe(16000000); // 170 000 - 10 000 = 160 000 DA
    });
  });

  describe("4. Status Progression & Confirmation Permissions", () => {
    it("forbids regular agent from confirming reservation (reservations:confirm required)", async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/reservations/${reservationId}/status`)
        .set("Authorization", `Bearer ${agentToken}`)
        .send({
          status: "confirmed",
          reason: "Tentative de confirmation sans vérification du responsable",
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("allows manager/owner to confirm reservation and logs to statusHistory", async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/reservations/${reservationId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          status: "confirmed",
          reason: "Conditions de voyage et passeports vérifiés par le responsable",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.currentStatus).toBe("confirmed");
      expect(res.body.data.statusHistory.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.statusHistory.some((h: any) => h.status === "confirmed")).toBe(true);
    });
  });

  describe("5. Payment Recording, Receipts & Balance Computation", () => {
    it("records a payment and generates atomic receipt RCP-2026-XXXXXX", async () => {
      const res = await request(app)
        .post(`/api/v1/admin/reservations/${reservationId}/payments`)
        .set("Authorization", `Bearer ${financeToken}`)
        .send({
          amountCentimes: 6000000, // 60 000 DA downpayment
          method: "cash",
          paymentDate: new Date().toISOString(),
          referenceOrSlipNumber: "BON-CAISSE-041",
          notes: "Acompte en espèces versé à l'agence d'Alger",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.receiptNumber).toMatch(/^RCP-2026-\d{6}$/);
      expect(res.body.data.amountCentimes).toBe(6000000);
      expect(res.body.data.method).toBe("cash");
      expect(res.body.data.isReversed).toBe(false);

      paymentId = res.body.data.id;
    });

    it("verifies reservation financial balance and partially_paid status", async () => {
      const res = await request(app)
        .get(`/api/v1/admin/reservations/${reservationId}`)
        .set("Authorization", `Bearer ${financeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.agreedTotalCentimes).toBe(16000000); // 160 000 DA
      expect(res.body.data.totalPaidCentimes).toBe(6000000); // 60 000 DA
      expect(res.body.data.balanceCentimes).toBe(10000000); // 100 000 DA remaining
      expect(res.body.data.paymentStatus).toBe("partially_paid");
      expect(res.body.data.payments).toHaveLength(1);
    });

    it("records second payment settling the entire balance to 0 (paid)", async () => {
      const res = await request(app)
        .post(`/api/v1/admin/reservations/${reservationId}/payments`)
        .set("Authorization", `Bearer ${financeToken}`)
        .send({
          amountCentimes: 10000000, // 100 000 DA balance settlement
          method: "bank_transfer",
          referenceOrSlipNumber: "VIR-BNA-889922",
          notes: "Solde versé par virement BNA",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.receiptNumber).toMatch(/^RCP-2026-\d{6}$/);

      // Verify balance is now 0 (paid)
      const resAfter = await request(app)
        .get(`/api/v1/admin/reservations/${reservationId}`)
        .set("Authorization", `Bearer ${financeToken}`);

      expect(resAfter.body.data.totalPaidCentimes).toBe(16000000);
      expect(resAfter.body.data.balanceCentimes).toBe(0);
      expect(resAfter.body.data.paymentStatus).toBe("paid");
    });

    it("lists cash desk payments with aggregated financial metrics", async () => {
      const res = await request(app)
        .get("/api/v1/admin/payments")
        .set("Authorization", `Bearer ${financeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.payments.length).toBeGreaterThanOrEqual(2);
      expect(res.body.metrics.totalCentimes).toBeGreaterThanOrEqual(16000000);
      expect(res.body.metrics.cashCentimes).toBeGreaterThanOrEqual(6000000);
      expect(res.body.metrics.bankCentimes).toBeGreaterThanOrEqual(10000000);
    });
  });

  describe("6. Payment Reversal & Refunds", () => {
    it("reverses a payment safely and updates the reservation balance", async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/payments/${paymentId}/reverse`)
        .set("Authorization", `Bearer ${financeToken}`)
        .send({
          reversalReason: "Erreur de saisie caisse: chèque impayé ou doublon",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isReversed).toBe(true);

      // Balance should now reflect only the 100 000 DA bank transfer
      const resAfter = await request(app)
        .get(`/api/v1/admin/reservations/${reservationId}`)
        .set("Authorization", `Bearer ${financeToken}`);

      expect(resAfter.body.data.totalPaidCentimes).toBe(10000000);
      expect(resAfter.body.data.balanceCentimes).toBe(6000000);
      expect(resAfter.body.data.paymentStatus).toBe("partially_paid");
    });

    it("issues an authorized refund generating RFD-2026-XXXXXX", async () => {
      const res = await request(app)
        .post(`/api/v1/admin/reservations/${reservationId}/refunds`)
        .set("Authorization", `Bearer ${financeToken}`)
        .send({
          amountCentimes: 2000000, // 20 000 DA refund
          reason: "Remboursement partiel suite à modification de prestation",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.refundNumber).toMatch(/^RFD-2026-\d{6}$/);
      expect(res.body.data.amountCentimes).toBe(2000000);

      // Balance = 160 000 - 100 000 + 20 000 = 80 000 DA (8 000 000 centimes)
      const resAfter = await request(app)
        .get(`/api/v1/admin/reservations/${reservationId}`)
        .set("Authorization", `Bearer ${financeToken}`);

      expect(resAfter.body.data.totalRefundedCentimes).toBe(2000000);
      expect(resAfter.body.data.balanceCentimes).toBe(8000000);
    });

    it("rejects refund attempt exceeding net received amount", async () => {
      // Net paid so far = 100 000 - 20 000 = 80 000 DA
      const res = await request(app)
        .post(`/api/v1/admin/reservations/${reservationId}/refunds`)
        .set("Authorization", `Bearer ${financeToken}`)
        .send({
          amountCentimes: 90000000, // 900 000 DA (exceeds)
          reason: "Remboursement trop élevé",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain("dépasse les encaissements");
    });
  });
});

