import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "../database/connection.js";
import {
  documents,
  customers,
  reservations,
  users,
} from "../database/schema.js";
import { getNextSequence } from "../database/counter.js";
import {
  savePrivateFile,
  getPrivateFilePath,
  deletePrivateFile,
} from "../utils/fileVault.js";
import { createAuditEntry } from "./audit.service.js";
import { AppError } from "../middleware/errorHandler.js";
import { hasPermission } from "@travel-agency/shared";
import type {
  UploadDocumentMetadataInput,
  DocumentFilterInput,
  Role,
} from "@travel-agency/shared";
import fs from "node:fs";

export async function uploadDocument(
  fileBuffer: Buffer,
  originalFilename: string,
  metadata: UploadDocumentMetadataInput,
  user: { id: string; email: string; role: Role },
  ipAddress = "127.0.0.1",
  userAgent = "backoffice"
) {
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new AppError(400, "Fichier vide ou manquant / Missing file payload");
  }

  // Verify Customer if specified
  if (metadata.customerId) {
    const [cust] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.id, metadata.customerId))
      .limit(1);
    if (!cust) {
      throw new AppError(404, "Client introuvable / Customer not found");
    }
  }

  // Verify Reservation if specified
  if (metadata.reservationId) {
    const [res] = await db
      .select({ id: reservations.id })
      .from(reservations)
      .where(eq(reservations.id, metadata.reservationId))
      .limit(1);
    if (!res) {
      throw new AppError(404, "Réservation introuvable / Reservation not found");
    }
  }

  // Save securely to disk with magic byte check & SHA-256
  const stored = await savePrivateFile(fileBuffer, originalFilename);

  // Generate atomic reference: DOC-2026-XXXXXX
  const documentNumber = await getNextSequence("DOC");

  const [doc] = await db
    .insert(documents)
    .values({
      documentNumber,
      customerId: metadata.customerId || null,
      reservationId: metadata.reservationId || null,
      travellerId: metadata.travellerId || null,
      documentType: metadata.documentType,
      originalFilename,
      storageFilename: stored.storageFilename,
      mimeType: stored.mimeType,
      fileSizeBytes: stored.fileSizeBytes,
      fileSha256: stored.fileSha256,
      isPrivate: metadata.isPrivate !== undefined ? metadata.isPrivate : true,
      uploadedByUserId: user.id,
      expiryDate: metadata.expiryDate ? new Date(metadata.expiryDate) : null,
      notes: metadata.notes || null,
    })
    .returning();

  if (!doc) {
    throw new AppError(500, "Échec de l'enregistrement du document / Failed to insert document record");
  }

  await createAuditEntry({
    userId: user.id,
    userEmail: user.email,
    action: "DOCUMENT_UPLOAD",
    entityType: "document",
    entityId: doc.id,
    ipAddress,
    userAgent,
    diffSummary: {
      documentNumber: doc.documentNumber,
      documentType: doc.documentType,
      fileSizeBytes: doc.fileSizeBytes,
      customerId: doc.customerId,
      reservationId: doc.reservationId,
    },
  });

  return doc;
}

export async function listDocuments(params: DocumentFilterInput) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const offset = (page - 1) * limit;

  const conditions = [];

  if (params.customerId) {
    conditions.push(eq(documents.customerId, params.customerId));
  }
  if (params.reservationId) {
    conditions.push(eq(documents.reservationId, params.reservationId));
  }
  if (params.documentType) {
    conditions.push(eq(documents.documentType, params.documentType));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documents)
    .where(whereClause);

  const total = countRes?.count || 0;

  const docs = await db
    .select({
      id: documents.id,
      documentNumber: documents.documentNumber,
      customerId: documents.customerId,
      customerName: customers.fullName,
      reservationId: documents.reservationId,
      reservationReference: reservations.reference,
      travellerId: documents.travellerId,
      documentType: documents.documentType,
      originalFilename: documents.originalFilename,
      storageFilename: documents.storageFilename,
      mimeType: documents.mimeType,
      fileSizeBytes: documents.fileSizeBytes,
      fileSha256: documents.fileSha256,
      isPrivate: documents.isPrivate,
      uploadedByUserId: documents.uploadedByUserId,
      uploaderName: users.fullName,
      expiryDate: documents.expiryDate,
      notes: documents.notes,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .leftJoin(customers, eq(documents.customerId, customers.id))
    .leftJoin(reservations, eq(documents.reservationId, reservations.id))
    .leftJoin(users, eq(documents.uploadedByUserId, users.id))
    .where(whereClause)
    .orderBy(desc(documents.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    documents: docs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getDocumentForDownload(
  id: string,
  user: { id: string; email: string; role: Role },
  ipAddress = "127.0.0.1",
  userAgent = "backoffice"
) {
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);

  if (!doc) {
    throw new AppError(404, "Document introuvable / Document not found");
  }

  if (doc.isPrivate && !hasPermission(user.role, "documents:read_sensitive")) {
    throw new AppError(
      403,
      "Accès non autorisé aux documents confidentiels / Forbidden to access sensitive documents"
    );
  }

  const filePath = getPrivateFilePath(doc.storageFilename);
  if (!fs.existsSync(filePath)) {
    throw new AppError(
      404,
      "Fichier physique introuvable sur le disque / Storage file missing"
    );
  }

  // Audit every access to sensitive documents
  await createAuditEntry({
    userId: user.id,
    userEmail: user.email,
    action: "DOCUMENT_ACCESS",
    entityType: "document",
    entityId: doc.id,
    ipAddress,
    userAgent,
    diffSummary: {
      documentNumber: doc.documentNumber,
      documentType: doc.documentType,
      originalFilename: doc.originalFilename,
    },
  });

  return {
    document: doc,
    filePath,
  };
}

export async function deleteDocument(
  id: string,
  user: { id: string; email: string; role: Role },
  ipAddress = "127.0.0.1",
  userAgent = "backoffice"
) {
  if (!hasPermission(user.role, "documents:delete")) {
    throw new AppError(
      403,
      "Droits insuffisants pour supprimer un document / Permission denied to delete documents"
    );
  }

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);

  if (!doc) {
    throw new AppError(404, "Document introuvable / Document not found");
  }

  // Delete from disk
  await deletePrivateFile(doc.storageFilename);

  // Delete from DB
  await db.delete(documents).where(eq(documents.id, id));

  await createAuditEntry({
    userId: user.id,
    userEmail: user.email,
    action: "DOCUMENT_DELETE",
    entityType: "document",
    entityId: id,
    ipAddress,
    userAgent,
    diffSummary: {
      documentNumber: doc.documentNumber,
      documentType: doc.documentType,
      originalFilename: doc.originalFilename,
    },
  });

  return { success: true, id };
}
