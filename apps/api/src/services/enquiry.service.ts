import { eq, desc, and, or, ilike, sql } from "drizzle-orm";
import { db } from "../database/connection.js";
import { enquiries, enquiryActivities, customers, travelOffers, users } from "../database/schema.js";
import { normalizeAlgerianPhone } from "@travel-agency/shared";
import { getNextSequence } from "../database/counter.js";
import { createAuditEntry } from "./audit.service.js";
import { AppError } from "../middleware/errorHandler.js";
import type { PublicEnquiryInput, AdminEnquiryInput } from "@travel-agency/shared";

export interface ListEnquiriesParams {
  page?: number | undefined;
  limit?: number | undefined;
  status?: string | undefined;
  assignedToUserId?: string | undefined;
  search?: string | undefined;
}

export async function submitPublicEnquiry(
  input: PublicEnquiryInput,
  ipAddress = "127.0.0.1",
  userAgent = "website"
) {
  // 1. Anti-bot honeypot check
  if (input.websiteUrl_hp && input.websiteUrl_hp.length > 0) {
    throw new AppError(400, "Soumission rejetée / Bot submission detected");
  }

  // 2. Idempotency Check: if client submitted with idempotencyKey, return previous response
  if (input.idempotencyKey) {
    const [existing] = await db
      .select({
        id: enquiries.id,
        enquiryNumber: enquiries.enquiryNumber,
        status: enquiries.status,
        createdAt: enquiries.createdAt,
      })
      .from(enquiries)
      .where(eq(enquiries.idempotencyKey, input.idempotencyKey))
      .limit(1);

    if (existing) {
      return {
        id: existing.id,
        enquiryNumber: existing.enquiryNumber,
        status: existing.status,
        message: "Demande déjà enregistrée / Enquiry already submitted",
        disclaimer: "Votre demande de réservation a bien été reçue. Elle sera traitée par nos conseillers mais ne constitue pas une réservation confirmée tant qu'elle n'a pas été validée par l'agence.",
        idempotentReplay: true,
      };
    }
  }

  const normalizedPhone = normalizeAlgerianPhone(input.contactPhone);
  const normalizedEmail = input.contactEmail ? input.contactEmail.toLowerCase().trim() : null;

  // 3. Match or Create Customer Profile (Lead Capture)
  let customerId: string | null = null;
  const matchConditions = [eq(customers.phone, normalizedPhone)];
  if (normalizedEmail) {
    matchConditions.push(eq(customers.email, normalizedEmail));
  }

  const [existingCustomer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(or(...matchConditions))
    .limit(1);

  if (existingCustomer) {
    customerId = existingCustomer.id;
  } else {
    const [newCustomer] = await db
      .insert(customers)
      .values({
        fullName: input.contactName.trim(),
        phone: normalizedPhone,
        email: normalizedEmail || null,
        preferredLanguage: "fr",
        internalNotes: "Créé automatiquement suite à une demande en ligne / Inbound website lead",
      })
      .returning({ id: customers.id });

    if (newCustomer) {
      customerId = newCustomer.id;
    }
  }

  // 4. Generate atomic sequential enquiry reference: ENQ-2026-000001
  const enquiryNumber = await getNextSequence("ENQ");

  // 5. Insert Enquiry
  const [created] = await db
    .insert(enquiries)
    .values({
      enquiryNumber,
      customerId,
      offerId: input.offerId || null,
      departureDatePreferred: input.departureDatePreferred ? new Date(input.departureDatePreferred) : null,
      travellersCount: input.travellersCount || 1,
      contactName: input.contactName.trim(),
      contactPhone: normalizedPhone,
      contactEmail: normalizedEmail || null,
      message: input.message.trim(),
      source: "website_form",
      status: "new",
      privacyConsent: input.privacyConsent,
      idempotencyKey: input.idempotencyKey || null,
      ipAddress,
      userAgent,
    })
    .returning();

  if (!created) {
    throw new AppError(500, "Échec de l'enregistrement de la demande / Failed to record enquiry");
  }

  // 6. Record activity history
  await db.insert(enquiryActivities).values({
    enquiryId: created.id,
    action: "created",
    notes: "Demande reçue depuis le formulaire public du site web",
  });

  // 7. Audit Log entry
  await createAuditEntry({
    action: "ENQUIRY_PUBLIC_SUBMIT",
    entityType: "Enquiry",
    entityId: created.id,
    ipAddress,
    userAgent,
    diffSummary: {
      enquiryNumber,
      contactName: created.contactName,
      contactPhone: created.contactPhone,
      offerId: created.offerId,
    },
  });

  return {
    id: created.id,
    enquiryNumber: created.enquiryNumber,
    status: created.status,
    message: "Votre demande de voyage a été transmise à notre équipe avec succès !",
    disclaimer: "Cette demande ne constitue pas une réservation confirmée. Un agent de voyages prendra contact avec vous par téléphone ou WhatsApp pour vérifier la disponibilité et finaliser les démarches.",
    idempotentReplay: false,
  };
}

export async function listEnquiries(params: ListEnquiriesParams = {}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const offset = (page - 1) * limit;

  const conditions = [];

  if (params.status) {
    conditions.push(eq(enquiries.status, params.status));
  }
  if (params.assignedToUserId) {
    conditions.push(eq(enquiries.assignedToUserId, params.assignedToUserId));
  }
  if (params.search) {
    const pattern = `%${params.search}%`;
    conditions.push(
      or(
        ilike(enquiries.enquiryNumber, pattern),
        ilike(enquiries.contactName, pattern),
        ilike(enquiries.contactPhone, pattern),
        ilike(enquiries.contactEmail, pattern)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(enquiries)
    .where(whereClause);

  const total = countResult?.count || 0;

  const enquiryList = await db
    .select({
      id: enquiries.id,
      enquiryNumber: enquiries.enquiryNumber,
      contactName: enquiries.contactName,
      contactPhone: enquiries.contactPhone,
      contactEmail: enquiries.contactEmail,
      travellersCount: enquiries.travellersCount,
      source: enquiries.source,
      status: enquiries.status,
      followUpDate: enquiries.followUpDate,
      createdAt: enquiries.createdAt,
      offerId: enquiries.offerId,
      offerTitle: travelOffers.title,
      assignedUser: {
        id: users.id,
        fullName: users.fullName,
      },
    })
    .from(enquiries)
    .leftJoin(travelOffers, eq(enquiries.offerId, travelOffers.id))
    .leftJoin(users, eq(enquiries.assignedToUserId, users.id))
    .where(whereClause)
    .orderBy(desc(enquiries.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    enquiries: enquiryList,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getEnquiryById(id: string) {
  const [enquiry] = await db
    .select({
      id: enquiries.id,
      enquiryNumber: enquiries.enquiryNumber,
      customerId: enquiries.customerId,
      offerId: enquiries.offerId,
      departureDatePreferred: enquiries.departureDatePreferred,
      travellersCount: enquiries.travellersCount,
      contactName: enquiries.contactName,
      contactPhone: enquiries.contactPhone,
      contactEmail: enquiries.contactEmail,
      message: enquiries.message,
      source: enquiries.source,
      status: enquiries.status,
      assignedToUserId: enquiries.assignedToUserId,
      followUpDate: enquiries.followUpDate,
      createdAt: enquiries.createdAt,
      updatedAt: enquiries.updatedAt,
      offerTitle: travelOffers.title,
      offerBasePriceCentimes: travelOffers.basePriceCentimes,
      customer: {
        id: customers.id,
        fullName: customers.fullName,
        phone: customers.phone,
        email: customers.email,
      },
      assignedUser: {
        id: users.id,
        fullName: users.fullName,
      },
    })
    .from(enquiries)
    .leftJoin(travelOffers, eq(enquiries.offerId, travelOffers.id))
    .leftJoin(customers, eq(enquiries.customerId, customers.id))
    .leftJoin(users, eq(enquiries.assignedToUserId, users.id))
    .where(eq(enquiries.id, id))
    .limit(1);

  if (!enquiry) {
    throw new AppError(404, "Demande introuvable / Enquiry not found");
  }

  // Fetch timeline of activities
  const activities = await db
    .select({
      id: enquiryActivities.id,
      action: enquiryActivities.action,
      previousStatus: enquiryActivities.previousStatus,
      newStatus: enquiryActivities.newStatus,
      notes: enquiryActivities.notes,
      timestamp: enquiryActivities.timestamp,
      userName: users.fullName,
    })
    .from(enquiryActivities)
    .leftJoin(users, eq(enquiryActivities.userId, users.id))
    .where(eq(enquiryActivities.enquiryId, id))
    .orderBy(desc(enquiryActivities.timestamp));

  return {
    ...enquiry,
    activities,
  };
}

export async function createAdminEnquiry(
  input: AdminEnquiryInput,
  user: { id: string; email: string },
  ipAddress = "127.0.0.1",
  userAgent = "backoffice"
) {
  const normalizedPhone = normalizeAlgerianPhone(input.contactPhone);
  const normalizedEmail = input.contactEmail ? input.contactEmail.toLowerCase().trim() : null;

  // Match or create customer
  let customerId: string | null = null;
  const [existingCustomer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.phone, normalizedPhone))
    .limit(1);

  if (existingCustomer) {
    customerId = existingCustomer.id;
  } else {
    const [newCustomer] = await db
      .insert(customers)
      .values({
        fullName: input.contactName.trim(),
        phone: normalizedPhone,
        email: normalizedEmail,
        preferredLanguage: "fr",
        internalNotes: `Créé suite à un appel/contact (${input.source})`,
      })
      .returning({ id: customers.id });

    if (newCustomer) customerId = newCustomer.id;
  }

  const enquiryNumber = await getNextSequence("ENQ");

  const [created] = await db
    .insert(enquiries)
    .values({
      enquiryNumber,
      customerId,
      offerId: input.offerId || null,
      departureDatePreferred: input.departureDatePreferred ? new Date(input.departureDatePreferred) : null,
      travellersCount: input.travellersCount || 1,
      contactName: input.contactName.trim(),
      contactPhone: normalizedPhone,
      contactEmail: normalizedEmail,
      message: input.message.trim(),
      source: input.source || "phone_call",
      status: "new",
      assignedToUserId: input.assignedToUserId || user.id,
      followUpDate: input.followUpDate ? new Date(input.followUpDate) : null,
      privacyConsent: true,
      ipAddress,
      userAgent,
    })
    .returning();

  if (!created) {
    throw new AppError(500, "Échec de création de la demande");
  }

  await db.insert(enquiryActivities).values({
    enquiryId: created.id,
    userId: user.id,
    action: "created",
    notes: `Demande enregistrée manuellement (${input.source}) par ${user.email}`,
  });

  await createAuditEntry({
    userId: user.id,
    userEmail: user.email,
    action: "ENQUIRY_MANUAL_CREATE",
    entityType: "Enquiry",
    entityId: created.id,
    ipAddress,
    userAgent,
    diffSummary: { enquiryNumber, source: input.source },
  });

  return created;
}

export async function updateEnquiryStatus(
  id: string,
  params: { status: string; notes?: string | undefined },
  user: { id: string; email: string },
  ipAddress = "127.0.0.1",
  userAgent = "api"
) {
  const [existing] = await db.select().from(enquiries).where(eq(enquiries.id, id)).limit(1);
  if (!existing) {
    throw new AppError(404, "Demande introuvable / Enquiry not found");
  }

  const previousStatus = existing.status;
  const newStatus = params.status;

  const [updated] = await db
    .update(enquiries)
    .set({
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(enquiries.id, id))
    .returning();

  // Log to timeline
  await db.insert(enquiryActivities).values({
    enquiryId: id,
    userId: user.id,
    action: "status_changed",
    previousStatus,
    newStatus,
    notes: params.notes || `Statut modifié de ${previousStatus} vers ${newStatus}`,
  });

  await createAuditEntry({
    userId: user.id,
    userEmail: user.email,
    action: "ENQUIRY_STATUS_CHANGE",
    entityType: "Enquiry",
    entityId: id,
    ipAddress,
    userAgent,
    diffSummary: { previousStatus, newStatus, notes: params.notes },
  });

  return updated;
}

export async function assignEnquiry(
  id: string,
  params: { assignedToUserId: string; followUpDate?: string | undefined; notes?: string | undefined },
  user: { id: string; email: string },
  ipAddress = "127.0.0.1",
  userAgent = "api"
) {
  const [existing] = await db.select().from(enquiries).where(eq(enquiries.id, id)).limit(1);
  if (!existing) {
    throw new AppError(404, "Demande introuvable / Enquiry not found");
  }

  const [assignee] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, params.assignedToUserId)).limit(1);

  const [updated] = await db
    .update(enquiries)
    .set({
      assignedToUserId: params.assignedToUserId,
      ...(params.followUpDate ? { followUpDate: new Date(params.followUpDate) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(enquiries.id, id))
    .returning();

  await db.insert(enquiryActivities).values({
    enquiryId: id,
    userId: user.id,
    action: "assigned",
    notes: `Attribué à ${assignee?.fullName || params.assignedToUserId}${params.notes ? ` - ${params.notes}` : ""}`,
  });

  await createAuditEntry({
    userId: user.id,
    userEmail: user.email,
    action: "ENQUIRY_ASSIGN",
    entityType: "Enquiry",
    entityId: id,
    ipAddress,
    userAgent,
    diffSummary: { assignedToUserId: params.assignedToUserId, followUpDate: params.followUpDate },
  });

  return updated;
}

export async function addEnquiryNote(
  id: string,
  params: { notes: string },
  user: { id: string; email: string }
) {
  const [existing] = await db.select().from(enquiries).where(eq(enquiries.id, id)).limit(1);
  if (!existing) {
    throw new AppError(404, "Demande introuvable / Enquiry not found");
  }

  const [activity] = await db
    .insert(enquiryActivities)
    .values({
      enquiryId: id,
      userId: user.id,
      action: "note_added",
      notes: params.notes,
    })
    .returning();

  return activity;
}
