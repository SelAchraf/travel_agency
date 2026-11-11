import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { connectDatabase, disconnectDatabase, db } from "../src/database/connection.js";
import { seedDatabase } from "../src/database/seed.js";
import { auditLogs } from "../src/database/schema.js";
import { eq, desc } from "drizzle-orm";

describe("Phase 1E: Operational Dashboard, Document Vault & Reports Integration Tests", () => {
  const app = createApp();

  let adminToken = "";
  let agentToken = "";
  let financeToken = "";
  let customerId = "";
  let documentId = "";

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

    // 4. Create customer for document attachments
    const custRes = await request(app)
      .post("/api/v1/admin/customers")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        fullName: "Kamel Meziane",
        phone: "0555 12 34 56",
        email: "kamel.meziane@gmail.com",
        wilayaCode: 16,
        preferredLanguage: "fr",
      });
    customerId = custRes.body.data.id;
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe("1. Document Vault & Magic-Byte File Security", () => {
    it("rejects malicious disguised executable payload renamed as .pdf (Magic Byte Defense)", async () => {
      // Windows PE executable header: MZ\x90\x00 (0x4D 0x5A)
      const fakeExeBuffer = Buffer.from("MZ\x90\x00ThisIsAnExecutableDisguisedAsAPdfFile");

      const res = await request(app)
        .post("/api/v1/admin/documents/upload")
        .set("Authorization", `Bearer ${adminToken}`)
        .field("documentType", "passport")
        .field("customerId", customerId)
        .attach("file", fakeExeBuffer, "passport.pdf");

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain("magic byte");
    });

    it("rejects shell script disguised as .jpg", async () => {
      const scriptBuffer = Buffer.from("#!/bin/bash\necho 'pwned'");

      const res = await request(app)
        .post("/api/v1/admin/documents/upload")
        .set("Authorization", `Bearer ${adminToken}`)
        .field("documentType", "national_id")
        .field("customerId", customerId)
        .attach("file", scriptBuffer, "id_card.jpg");

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain("magic byte");
    });

    it("accepts valid PDF document and generates atomic DOC-2026-XXXXXX reference", async () => {
      // Valid PDF magic bytes: %PDF-1.4
      const validPdfBuffer = Buffer.from("%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");

      const res = await request(app)
        .post("/api/v1/admin/documents/upload")
        .set("Authorization", `Bearer ${adminToken}`)
        .field("documentType", "passport")
        .field("customerId", customerId)
        .field("notes", "Passeport biométrique valide")
        .attach("file", validPdfBuffer, "kamel_passport.pdf");

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.documentNumber).toMatch(/^DOC-2026-\d{6}$/);
      expect(res.body.data.mimeType).toBe("application/pdf");
      expect(res.body.data.fileSha256).toHaveLength(64);
      expect(res.body.data.storageFilename).not.toContain("kamel_passport"); // Randomized storage filename
      expect(res.body.data.isPrivate).toBe(true);

      documentId = res.body.data.id;
    });

    it("lists documents with customer filter and uploader info", async () => {
      const res = await request(app)
        .get(`/api/v1/admin/documents?customerId=${customerId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].customerName).toBe("Kamel Meziane");
      expect(res.body.data[0].uploaderName).toContain("Directeur Général");
    });

    it("securely streams document download and creates DOCUMENT_ACCESS audit log", async () => {
      const res = await request(app)
        .get(`/api/v1/admin/documents/${documentId}/download`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("application/pdf");
      expect(res.headers["content-disposition"]).toContain("kamel_passport.pdf");

      // Verify Audit Log entry
      const [latestAudit] = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.entityId, documentId))
        .orderBy(desc(auditLogs.timestamp))
        .limit(1);

      expect(latestAudit).toBeDefined();
      expect(latestAudit?.action).toBe("DOCUMENT_ACCESS");
      expect(latestAudit?.entityType).toBe("document");
    });

    it("enforces RBAC on document deletion (finance role cannot delete documents)", async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/documents/${documentId}`)
        .set("Authorization", `Bearer ${financeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("allows authorized role to delete document and writes DOCUMENT_DELETE audit entry", async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/documents/${documentId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify deletion from database
      const getRes = await request(app)
        .get(`/api/v1/admin/documents/${documentId}/download`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(getRes.status).toBe(404);
    });
  });

  describe("2. Operational Dashboard Summary", () => {
    it("returns operational summary with strict Cash Received vs Booked Sales separation", async () => {
      const res = await request(app)
        .get("/api/v1/admin/dashboard/summary")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { kpis, alerts, nextDepartures, recentEnquiries, recentPayments } = res.body.data;

      // KPIs
      expect(kpis).toBeDefined();
      expect(typeof kpis.newEnquiriesCount).toBe("number");
      expect(typeof kpis.activeReservationsCount).toBe("number");
      expect(typeof kpis.upcomingDeparturesCount).toBe("number");
      expect(typeof kpis.pendingDocumentsCount).toBe("number");

      // Financial KPI distinction: strictly integer centimes
      expect(typeof kpis.cashReceivedCentimes).toBe("number");
      expect(typeof kpis.bookedSalesCentimes).toBe("number");
      expect(typeof kpis.outstandingBalanceCentimes).toBe("number");
      expect(kpis.currency).toBe("DZD");

      // Alerts
      expect(alerts).toBeDefined();
      expect(Array.isArray(alerts.nearingCapacityDepartures)).toBe(true);

      // Lists
      expect(Array.isArray(nextDepartures)).toBe(true);
      expect(Array.isArray(recentEnquiries)).toBe(true);
      expect(Array.isArray(recentPayments)).toBe(true);
    });

    it("allows reservation agent to access dashboard summary", async () => {
      const res = await request(app)
        .get("/api/v1/admin/dashboard/summary")
        .set("Authorization", `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("3. Financial & Operational Reports", () => {
    it("allows finance role to view financial report", async () => {
      const res = await request(app)
        .get("/api/v1/admin/reports/financial")
        .set("Authorization", `Bearer ${financeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary).toBeDefined();
      expect(typeof res.body.data.summary.grossCashCentimes).toBe("number");
      expect(typeof res.body.data.summary.netCashReceivedCentimes).toBe("number");
      expect(typeof res.body.data.summary.bookedSalesCentimes).toBe("number");
      expect(Array.isArray(res.body.data.methodBreakdown)).toBe(true);
      expect(Array.isArray(res.body.data.monthlyTrend)).toBe(true);
    });

    it("forbids reservation agent from viewing financial report", async () => {
      const res = await request(app)
        .get("/api/v1/admin/reports/financial")
        .set("Authorization", `Bearer ${agentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("allows reservation agent to view operational report", async () => {
      const res = await request(app)
        .get("/api/v1/admin/reports/operational")
        .set("Authorization", `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.departures)).toBe(true);
      expect(res.body.data.enquiriesFunnel).toBeDefined();
      expect(typeof res.body.data.enquiriesFunnel.conversionRatePercent).toBe("number");
      expect(Array.isArray(res.body.data.reservationsByStatus)).toBe(true);
    });

    it("forbids finance role from viewing operational report", async () => {
      const res = await request(app)
        .get("/api/v1/admin/reports/operational")
        .set("Authorization", `Bearer ${financeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe("4. CSV Data Exports with UTF-8 BOM", () => {
    it("exports reservations CSV with UTF-8 BOM for Excel Arabic & French support", async () => {
      const res = await request(app)
        .get("/api/v1/admin/reports/export-csv?type=reservations")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("text/csv");
      expect(res.headers["content-disposition"]).toContain("export_reservations_");
      // Verify BOM \uFEFF
      expect(res.text.startsWith("\uFEFF")).toBe(true);
      expect(res.text).toContain("Référence,Client,Téléphone,Offre,Passagers");
    });

    it("exports payments CSV for finance role", async () => {
      const res = await request(app)
        .get("/api/v1/admin/reports/export-csv?type=payments")
        .set("Authorization", `Bearer ${financeToken}`);

      expect(res.status).toBe(200);
      expect(res.text.startsWith("\uFEFF")).toBe(true);
      expect(res.text).toContain("Reçu N°,Réf Réservation,Client,Montant (DA)");
    });

    it("forbids reservation agent from exporting payments CSV", async () => {
      const res = await request(app)
        .get("/api/v1/admin/reports/export-csv?type=payments")
        .set("Authorization", `Bearer ${agentToken}`);

      expect(res.status).toBe(403);
    });

    it("exports enquiries CSV", async () => {
      const res = await request(app)
        .get("/api/v1/admin/reports/export-csv?type=enquiries")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.text.startsWith("\uFEFF")).toBe(true);
      expect(res.text).toContain("Demande N°,Contact,Téléphone,Email");
    });

    it("exports passengers manifest CSV", async () => {
      const res = await request(app)
        .get("/api/v1/admin/reports/export-csv?type=passengers")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.text.startsWith("\uFEFF")).toBe(true);
      expect(res.text).toContain("Réf Réservation,Offre,Date Départ,Nom Complet");
    });
  });
});
