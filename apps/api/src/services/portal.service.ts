import crypto from "node:crypto";
import fs from "node:fs";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { db } from "../database/connection.js";
import {
  customers,
  reservations,
  reservationTravellers,
  payments,
  documents,
  customerMessages,
  notifications,
} from "../database/schema.js";
import { getNextSequence } from "../database/counter.js";
import {
  savePrivateFile,
  getPrivateFilePath,
} from "../utils/fileVault.js";
import { createAuditEntry } from "./audit.service.js";
import { AppError } from "../middleware/errorHandler.js";
import type {
  DocumentType,
  PortalMessageInput,
} from "@travel-agency/shared";

export async function generatePortalLink(customerId: string, expiresInDays = 30) {
  const [cust] = await db
    .select({
      id: customers.id,
      fullName: customers.fullName,
      phone: customers.phone,
      email: customers.email,
    })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);

  if (!cust) {
    throw new AppError(404, "Client introuvable / Customer not found");
  }

  // Generate 32-byte cryptographic token
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  await db
    .update(customers)
    .set({
      portalAccessTokenHash: tokenHash,
      portalAccessExpires: expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(customers.id, customerId));

  return {
    rawToken,
    expiresAt,
    customerId: cust.id,
    customerName: cust.fullName,
    customerPhone: cust.phone,
  };
}

export async function verifyPortalToken(rawToken: string) {
  if (!rawToken || rawToken.length < 10) {
    throw new AppError(401, "Jeton de portail invalide / Invalid portal token");
  }

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const now = new Date();

  const [cust] = await db
    .select({
      id: customers.id,
      fullName: customers.fullName,
      phone: customers.phone,
      email: customers.email,
      wilayaCode: customers.wilayaCode,
      preferredLanguage: customers.preferredLanguage,
      portalAccessExpires: customers.portalAccessExpires,
    })
    .from(customers)
    .where(
      and(
        eq(customers.portalAccessTokenHash, tokenHash),
        sql`${customers.portalAccessExpires} > ${now}`
      )
    )
    .limit(1);

  if (!cust) {
    throw new AppError(401, "Lien d'accès au portail expiré ou invalide / Portal link expired or invalid");
  }

  return cust;
}

export async function getCustomerReservations(customerId: string) {
  // Strict Anti-IDOR: customerId is verified from session
  const resList = await db
    .select({
      id: reservations.id,
      reference: reservations.reference,
      offerSnapshot: reservations.offerSnapshot,
      passengerCount: reservations.passengerCount,
      agreedTotalCentimes: reservations.agreedTotalCentimes,
      discountCentimes: reservations.discountCentimes,
      currentStatus: reservations.currentStatus,
      createdAt: reservations.createdAt,
    })
    .from(reservations)
    .where(
      and(
        eq(reservations.customerId, customerId),
        sql`${reservations.currentStatus} != 'cancelled'`
      )
    )
    .orderBy(desc(reservations.createdAt));

  const reservationIds = resList.map((r) => r.id);
  const paymentsSummary: Record<string, number> = {};

  if (reservationIds.length > 0) {
    const payRows = await db
      .select({
        reservationId: payments.reservationId,
        totalPaid: sql<number>`coalesce(sum(${payments.amountCentimes}) filter (where not ${payments.isReversed}), 0)::bigint`,
      })
      .from(payments)
      .where(
        and(
          sql`${payments.reservationId} in ${reservationIds}`,
          eq(payments.isReversed, false)
        )
      )
      .groupBy(payments.reservationId);

    payRows.forEach((p) => {
      paymentsSummary[p.reservationId] = Number(p.totalPaid);
    });
  }

  return resList.map((r) => {
    const paidCentimes = paymentsSummary[r.id] || 0;
    const agreedCentimes = Number(r.agreedTotalCentimes);
    const balanceCentimes = Math.max(0, agreedCentimes - paidCentimes);

    return {
      id: r.id,
      reference: r.reference,
      offerTitle: r.offerSnapshot?.title,
      destinationName: r.offerSnapshot?.destinationName,
      departureDate: r.offerSnapshot?.departureDate,
      returnDate: r.offerSnapshot?.returnDate,
      durationDays: r.offerSnapshot?.durationDays,
      passengerCount: r.passengerCount,
      agreedTotalCentimes: agreedCentimes,
      paidCentimes,
      balanceCentimes,
      currentStatus: r.currentStatus,
      createdAt: r.createdAt,
    };
  });
}

export async function getCustomerReservationDetail(customerId: string, reservationId: string) {
  // Anti-IDOR check: reservation MUST belong to customer
  const [res] = await db
    .select()
    .from(reservations)
    .where(
      and(
        eq(reservations.id, reservationId),
        eq(reservations.customerId, customerId)
      )
    )
    .limit(1);

  if (!res) {
    throw new AppError(404, "Dossier de voyage introuvable ou accès refusé / Reservation not found or unauthorized");
  }

  // Travellers list
  const travellers = await db
    .select({
      id: reservationTravellers.id,
      fullName: reservationTravellers.fullName,
      dateOfBirth: reservationTravellers.dateOfBirth,
      isPrimaryContact: reservationTravellers.isPrimaryContact,
      roomAllocation: reservationTravellers.roomAllocation,
      hasPassport: sql<boolean>`${reservationTravellers.passportNumberEncrypted} is not null`,
      passportExpiryDate: reservationTravellers.passportExpiryDate,
    })
    .from(reservationTravellers)
    .where(eq(reservationTravellers.reservationId, reservationId))
    .orderBy(desc(reservationTravellers.isPrimaryContact));

  // Payments summary
  const payRecords = await db
    .select({
      id: payments.id,
      receiptNumber: payments.receiptNumber,
      amountCentimes: payments.amountCentimes,
      currency: payments.currency,
      paymentDate: payments.paymentDate,
      method: payments.method,
    })
    .from(payments)
    .where(
      and(
        eq(payments.reservationId, reservationId),
        eq(payments.isReversed, false)
      )
    )
    .orderBy(desc(payments.paymentDate));

  const totalPaidCentimes = payRecords.reduce((acc, p) => acc + Number(p.amountCentimes), 0);
  const balanceCentimes = Math.max(0, Number(res.agreedTotalCentimes) - totalPaidCentimes);

  // Documents attached to this reservation
  const docs = await db
    .select({
      id: documents.id,
      documentNumber: documents.documentNumber,
      documentType: documents.documentType,
      originalFilename: documents.originalFilename,
      fileSizeBytes: documents.fileSizeBytes,
      mimeType: documents.mimeType,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(
      and(
        eq(documents.reservationId, reservationId),
        eq(documents.customerId, customerId)
      )
    )
    .orderBy(desc(documents.createdAt));

  return {
    reservation: {
      id: res.id,
      reference: res.reference,
      offerSnapshot: res.offerSnapshot,
      passengerCount: res.passengerCount,
      agreedTotalCentimes: Number(res.agreedTotalCentimes),
      discountCentimes: Number(res.discountCentimes),
      paidCentimes: totalPaidCentimes,
      balanceCentimes,
      currentStatus: res.currentStatus,
      statusHistory: res.statusHistory,
      specialRequirements: res.specialRequirements,
      createdAt: res.createdAt,
    },
    travellers,
    payments: payRecords,
    documents: docs,
  };
}

export async function uploadPortalDocument(
  customerId: string,
  reservationId: string,
  fileBuffer: Buffer,
  originalFilename: string,
  documentType: DocumentType,
  ipAddress = "127.0.0.1",
  userAgent = "customer-portal"
) {
  // Anti-IDOR check
  const [res] = await db
    .select({ id: reservations.id, reference: reservations.reference })
    .from(reservations)
    .where(
      and(
        eq(reservations.id, reservationId),
        eq(reservations.customerId, customerId)
      )
    )
    .limit(1);

  if (!res) {
    throw new AppError(404, "Réservation introuvable ou accès non autorisé / Unauthorized reservation");
  }

  const [cust] = await db
    .select({ id: customers.id, fullName: customers.fullName })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);

  // Save file with magic byte inspection
  const stored = await savePrivateFile(fileBuffer, originalFilename);
  const documentNumber = await getNextSequence("DOC");

  const [doc] = await db
    .insert(documents)
    .values({
      documentNumber,
      customerId,
      reservationId,
      documentType,
      originalFilename,
      storageFilename: stored.storageFilename,
      mimeType: stored.mimeType,
      fileSizeBytes: stored.fileSizeBytes,
      fileSha256: stored.fileSha256,
      isPrivate: true,
      uploadedByUserId: null, // Customer upload
      notes: "Déposé par le client depuis le portail voyageur",
    })
    .returning();

  if (!doc) {
    throw new AppError(500, "Échec de l'enregistrement du document / Failed to save document");
  }

  // Audit event
  await createAuditEntry({
    userId: null,
    userEmail: `portal:${cust?.fullName || "customer"}`,
    action: "PORTAL_DOCUMENT_UPLOAD",
    entityType: "document",
    entityId: doc.id,
    ipAddress,
    userAgent,
    diffSummary: {
      documentNumber: doc.documentNumber,
      reservationReference: res.reference,
      documentType,
    },
  });

  // Notify Agency Staff
  await db.insert(notifications).values({
    type: "missing_documents",
    channel: "in_app",
    recipientType: "staff",
    title: "Document client déposé",
    message: `Le client ${cust?.fullName || ""} a déposé une pièce (${documentType}) pour la réservation ${res.reference}.`,
    data: { reservationId, documentId: doc.id },
  });

  return doc;
}

export async function downloadPortalDocument(
  customerId: string,
  documentId: string,
  ipAddress = "127.0.0.1",
  userAgent = "customer-portal"
) {
  // Anti-IDOR check: document must belong to this customer
  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.customerId, customerId)
      )
    )
    .limit(1);

  if (!doc) {
    throw new AppError(404, "Document introuvable ou accès non autorisé / Unauthorized document");
  }

  const filePath = getPrivateFilePath(doc.storageFilename);
  if (!fs.existsSync(filePath)) {
    throw new AppError(404, "Fichier physique introuvable / Storage file missing");
  }

  await createAuditEntry({
    userId: null,
    userEmail: `portal:${customerId}`,
    action: "PORTAL_DOCUMENT_ACCESS",
    entityType: "document",
    entityId: doc.id,
    ipAddress,
    userAgent,
    diffSummary: {
      documentNumber: doc.documentNumber,
      originalFilename: doc.originalFilename,
    },
  });

  return { document: doc, filePath };
}

export async function createPortalMessage(
  customerId: string,
  reservationId: string,
  input: PortalMessageInput
) {
  // Anti-IDOR check
  const [res] = await db
    .select({ id: reservations.id, reference: reservations.reference })
    .from(reservations)
    .where(
      and(
        eq(reservations.id, reservationId),
        eq(reservations.customerId, customerId)
      )
    )
    .limit(1);

  if (!res) {
    throw new AppError(404, "Réservation introuvable ou accès non autorisé");
  }

  const [cust] = await db
    .select({ fullName: customers.fullName })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);

  const [msg] = await db
    .insert(customerMessages)
    .values({
      customerId,
      reservationId,
      senderType: "customer",
      senderId: null,
      senderName: cust?.fullName || "Client",
      subject: input.subject || null,
      message: input.message.trim(),
    })
    .returning();

  if (!msg) {
    throw new AppError(500, "Échec de l'enregistrement du message / Failed to save message");
  }

  // Create Staff In-App Notification
  await db.insert(notifications).values({
    type: "customer_message",
    channel: "in_app",
    recipientType: "staff",
    title: "Nouveau message client (Portail)",
    message: `${cust?.fullName || "Un client"} a envoyé une question sur la réservation ${res.reference}.`,
    data: { reservationId, messageId: msg.id },
  });

  return msg;
}

export async function getPortalMessages(customerId: string, reservationId: string) {
  // Anti-IDOR check
  const [res] = await db
    .select({ id: reservations.id })
    .from(reservations)
    .where(
      and(
        eq(reservations.id, reservationId),
        eq(reservations.customerId, customerId)
      )
    )
    .limit(1);

  if (!res) {
    throw new AppError(404, "Réservation introuvable ou accès non autorisé");
  }

  return db
    .select()
    .from(customerMessages)
    .where(
      and(
        eq(customerMessages.reservationId, reservationId),
        eq(customerMessages.customerId, customerId)
      )
    )
    .orderBy(asc(customerMessages.createdAt));
}
