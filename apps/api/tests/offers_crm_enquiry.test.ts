import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/database/connection.js";
import { seedDatabase } from "../src/database/seed.js";

describe("Phase 1B: Offers, CRM & Enquiries Integration Tests", () => {
  const app = createApp();

  let adminToken = "";
  let agentToken = "";
  let createdDestinationId = "";
  let createdOfferId = "";
  let createdDepartureId = "";
  let createdCustomerId = "";
  let createdEnquiryId = "";

  beforeAll(async () => {
    await connectDatabase();
    await seedDatabase();

    // Log in admin (owner)
    const adminRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "admin@numidiavoyages.dz",
        password: "PasswordSecure2026!",
      });
    adminToken = adminRes.body.accessToken;

    // Log in agent (reservation_agent)
    const agentRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "agent@numidiavoyages.dz",
        password: "PasswordSecure2026!",
      });
    agentToken = agentRes.body.accessToken;
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe("1. Destinations & Offers Management (Admin)", () => {
    it("creates a new destination", async () => {
      const res = await request(app)
        .post("/api/v1/admin/destinations")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          slug: "test-taghit",
          name: { ar: "تاغيت الساحرة", fr: "Taghit l'Enchanteresse" },
          category: "domestic",
          wilayaOrCountry: "Béchar (08)",
          description: {
            ar: "واحة تاغيت والكثبان الرملية الذهبية في الساورة",
            fr: "L'oasis de Taghit et les dunes dorées de la Saoura",
          },
          coverImageUrl: "/images/taghit.webp",
          galleryImages: ["/images/taghit-1.webp"],
          isFeatured: true,
          isPublished: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe("test-taghit");
      createdDestinationId = res.body.data.id;
    });

    it("creates a travel offer linked to the destination", async () => {
      const res = await request(app)
        .post("/api/v1/admin/offers")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          slug: "taghit-dunes-saoura",
          title: {
            ar: "سحر تاغit والساورة 5 أيام",
            fr: "Magie de Taghit & la Saoura 5 jours",
          },
          destinationId: createdDestinationId,
          tripType: "guided_tour",
          durationDays: 5,
          durationNights: 4,
          basePriceCentimes: 6500000, // 65 000 DA
          currency: "DZD",
          pricingBasis: "per_person",
          availabilityStatus: "available",
          hotelDetails: {
            ar: "فندق تاغit أو دار الضيافة التقليدية",
            fr: "Hôtel Saoura Taghit ou maison d'hôtes traditionnelle",
          },
          transportDetails: {
            ar: "نقل بحافلة سياحية مكيفة من وإلى المطار",
            fr: "Transferts en autocar touristique climatisé",
          },
          itinerary: [
            {
              dayNumber: 1,
              title: { ar: "الوصول والاستقبال", fr: "Arrivée et accueil" },
              description: {
                ar: "الاستقبال في مطار بشار والتوجه نحو تاغيت",
                fr: "Accueil aéroport Béchar et transfert à Taghit",
              },
            },
          ],
          inclusions: {
            ar: ["الإقامة في فندق 4 نجوم", "جميع الوجبات كاملة"],
            fr: ["Hébergement hôtel 4*", "Pension complète"],
          },
          exclusions: {
            ar: ["المصاريف الشخصية", "تذاكر الطيران"],
            fr: ["Dépenses personnelles", "Vols intérieurs"],
          },
          photos: [
            {
              url: "https://example.com/photos/taghit.webp",
              isCover: true,
              caption: { ar: "كثبان تاغيت", fr: "Dunes de Taghit" },
            },
          ],
          isPublished: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe("taghit-dunes-saoura");
      expect(res.body.data.basePriceCentimes).toBe(6500000);
      createdOfferId = res.body.data.id;
    });

    it("adds a departure date with capacity to the offer", async () => {
      const departureDate = new Date();
      departureDate.setDate(departureDate.getDate() + 30);
      const returnDate = new Date(departureDate);
      returnDate.setDate(returnDate.getDate() + 5);

      const res = await request(app)
        .post(`/api/v1/admin/offers/${createdOfferId}/departures`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          offerId: createdOfferId,
          departureDate: departureDate.toISOString(),
          returnDate: returnDate.toISOString(),
          maxCapacity: 20,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.maxCapacity).toBe(20);
      expect(res.body.data.bookedPlaces).toBe(0);
      createdDepartureId = res.body.data.id;
    });

    it("prevents reservation agents from performing manager capacity overrides", async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/offers/departures/${createdDepartureId}/override`)
        .set("Authorization", `Bearer ${agentToken}`)
        .send({
          extraPlaces: 4,
          reason: "Surréservation demandée par le client VIP",
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("allows manager/owner to override departure capacity with audit trail", async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/offers/departures/${createdDepartureId}/override`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          extraPlaces: 4,
          reason: "Autorisation exceptionnelle directeur d'agence pour groupe VIP",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.maxCapacity).toBe(24); // 20 + 4
      expect(res.body.data.managerOverrides).toHaveLength(1);
      expect(res.body.data.managerOverrides[0].extraPlaces).toBe(4);
    });
  });

  describe("2. Public Catalogue Endpoints & Caching", () => {
    it("returns public destinations list", async () => {
      const res = await request(app).get("/api/v1/public/destinations");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it("returns public offers with ETag header and 304 on If-None-Match", async () => {
      const res = await request(app).get("/api/v1/public/offers");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.headers.etag).toBeDefined();

      const etag = res.headers.etag;

      // Second request with If-None-Match
      const cachedRes = await request(app)
        .get("/api/v1/public/offers")
        .set("If-None-Match", etag);

      expect(cachedRes.status).toBe(304);
    });

    it("returns offer details with departures and live availability", async () => {
      const res = await request(app).get("/api/v1/public/offers/taghit-dunes-saoura");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe("taghit-dunes-saoura");
      expect(res.body.data.departures).toHaveLength(1);
      expect(res.body.data.departures[0].availablePlaces).toBe(24);
    });
  });

  describe("3. Inbound Public Enquiry (Anti-Bot, Idempotency & Reference Counter)", () => {
    it("rejects bot submission when honeypot field is filled", async () => {
      const res = await request(app)
        .post("/api/v1/public/enquiries")
        .send({
          contactName: "Bot Spammer",
          contactPhone: "0550112233",
          message: "Spam message here",
          privacyConsent: true,
          travellersCount: 2,
          websiteUrl_hp: "http://spam-link.com", // Honeypot filled!
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain("Bot submission detected");
    });

    it("accepts valid enquiry, normalizes Algerian phone, generates sequential number and disclaimer", async () => {
      const idempotencyKey = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

      const res = await request(app)
        .post("/api/v1/public/enquiries")
        .set("Idempotency-Key", idempotencyKey)
        .send({
          contactName: "Kamel Benali",
          contactPhone: "0555 12 34 56",
          contactEmail: "kamel.benali@gmail.com",
          travellersCount: 2,
          message: "Intéressé par le départ du mois prochain pour Taghit.",
          privacyConsent: true,
          offerId: createdOfferId,
          websiteUrl_hp: "", // Honeypot empty
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.enquiryNumber).toMatch(/^ENQ-2026-\d{6}$/);
      expect(res.body.disclaimer).toContain(
        "Cette demande ne constitue pas une réservation confirmée"
      );

      createdEnquiryId = res.body.data.id;
    });

    it("handles idempotency key replay safely without duplicate creation", async () => {
      const idempotencyKey = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

      const res = await request(app)
        .post("/api/v1/public/enquiries")
        .set("Idempotency-Key", idempotencyKey)
        .send({
          contactName: "Kamel Benali",
          contactPhone: "0555 12 34 56",
          contactEmail: "kamel.benali@gmail.com",
          travellersCount: 2,
          message: "Intéressé par le départ du mois prochain pour Taghit.",
          privacyConsent: true,
          offerId: createdOfferId,
          websiteUrl_hp: "",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.idempotentReplay).toBe(true);
      expect(res.body.data.id).toBe(createdEnquiryId);
    });
  });

  describe("4. Customer CRM & Linked Travellers Registry", () => {
    it("creates a customer with phone normalization (+213)", async () => {
      const res = await request(app)
        .post("/api/v1/admin/customers")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          fullName: "Amina Mansouri",
          phone: "0661 98 76 54",
          email: "amina.mansouri@yahoo.com",
          wilayaCode: 16, // Alger
          preferredLanguage: "fr",
          internalNotes: "Cliente fidèle, préfère les hôtels 4 et 5 étoiles",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.phone).toBe("+213661987654");
      createdCustomerId = res.body.data.id;
    });

    it("detects duplicates by phone number", async () => {
      const res = await request(app)
        .get("/api/v1/admin/customers/duplicates?phone=0661987654")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.duplicateFound).toBe(true);
      expect(res.body.matches[0].id).toBe(createdCustomerId);
    });

    it("adds a traveller to customer's linked travellers registry", async () => {
      const res = await request(app)
        .post(`/api/v1/admin/customers/${createdCustomerId}/travellers`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          fullName: "Amina Mansouri",
          dateOfBirth: "1988-05-14",
          gender: "F",
          passportNumber: "123456789",
          passportExpiryDate: "2030-05-14",
          nationality: "DZ",
          specialRequirements: "Chambre calme côté jardin",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fullName).toBe("Amina Mansouri");
      expect(res.body.data.customerId).toBe(createdCustomerId);
    });

    it("retrieves full customer profile with linked travellers and history", async () => {
      const res = await request(app)
        .get(`/api/v1/admin/customers/${createdCustomerId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.travellers).toHaveLength(1);
      expect(res.body.data.travellers[0].fullName).toBe("Amina Mansouri");
    });
  });

  describe("5. Enquiry Triage & Back-Office Workflow", () => {
    it("updates enquiry status and records activity in timeline", async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/enquiries/${createdEnquiryId}/status`)
        .set("Authorization", `Bearer ${agentToken}`)
        .send({
          status: "contacted",
          notes: "Appel téléphonique effectué avec le client, devis envoyé sur WhatsApp.",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("contacted");
    });

    it("assigns staff member to enquiry with follow-up date", async () => {
      // Get agent user id
      const meRes = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${agentToken}`);
      const agentId = meRes.body.user.id;

      const followUp = new Date();
      followUp.setDate(followUp.getDate() + 3);

      const res = await request(app)
        .patch(`/api/v1/admin/enquiries/${createdEnquiryId}/assign`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          assignedToUserId: agentId,
          followUpDate: followUp.toISOString(),
          notes: "Affecté à l'agent pour finalisation devis et documents.",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assignedToUserId).toBe(agentId);
    });

    it("adds internal note to enquiry timeline", async () => {
      const res = await request(app)
        .post(`/api/v1/admin/enquiries/${createdEnquiryId}/notes`)
        .set("Authorization", `Bearer ${agentToken}`)
        .send({
          notes: "Le client confirme qu'il passera à l'agence pour régler l'acompte.",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it("retrieves full enquiry with audit trail and timeline activities", async () => {
      const res = await request(app)
        .get(`/api/v1/admin/enquiries/${createdEnquiryId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.enquiryNumber).toBeDefined();
      expect(res.body.data.activities.length).toBeGreaterThanOrEqual(3);
      expect(
        res.body.data.activities.some((a: { action: string }) => a.action === "status_changed")
      ).toBe(true);
      expect(
        res.body.data.activities.some((a: { action: string }) => a.action === "assigned")
      ).toBe(true);
      expect(
        res.body.data.activities.some((a: { action: string }) => a.action === "note_added")
      ).toBe(true);
    });
  });
});
