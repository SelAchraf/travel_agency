import { eq, desc, and, or, ilike, sql } from "drizzle-orm";
import { db } from "../database/connection.js";
import { customers, travellers, enquiries, reservations } from "../database/schema.js";
import { normalizeAlgerianPhone } from "@travel-agency/shared";
import { createAuditEntry } from "./audit.service.js";
import { AppError } from "../middleware/errorHandler.js";
import type { CustomerInput, TravellerInput } from "@travel-agency/shared";

export type UpdateCustomerInput = Partial<{ [K in keyof CustomerInput]: CustomerInput[K] | undefined }>;

export interface ListCustomersParams {
  page?: number | undefined;
  limit?: number | undefined;
  search?: string | undefined;
  wilayaCode?: number | undefined;
  isArchived?: boolean | undefined;
}

export async function listCustomers(params: ListCustomersParams = {}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const offset = (page - 1) * limit;

  const conditions = [];

  if (params.isArchived !== undefined) {
    conditions.push(eq(customers.isArchived, params.isArchived));
  } else {
    conditions.push(eq(customers.isArchived, false));
  }

  if (params.wilayaCode) {
    conditions.push(eq(customers.wilayaCode, params.wilayaCode));
  }

  if (params.search) {
    const pattern = `%${params.search}%`;
    const normalizedDigits = params.search.replace(/\D/g, "");
    const phoneCondition = normalizedDigits ? ilike(customers.phone, `%${normalizedDigits}%`) : undefined;

    if (phoneCondition) {
      conditions.push(
        or(
          ilike(customers.fullName, pattern),
          ilike(customers.email, pattern),
          phoneCondition
        )
      );
    } else {
      conditions.push(
        or(
          ilike(customers.fullName, pattern),
          ilike(customers.email, pattern)
        )
      );
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customers)
    .where(whereClause);

  const total = countResult?.count || 0;

  const customerList = await db
    .select({
      id: customers.id,
      fullName: customers.fullName,
      phone: customers.phone,
      email: customers.email,
      wilayaCode: customers.wilayaCode,
      preferredLanguage: customers.preferredLanguage,
      internalNotes: customers.internalNotes,
      isArchived: customers.isArchived,
      createdAt: customers.createdAt,
    })
    .from(customers)
    .where(whereClause)
    .orderBy(desc(customers.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    customers: customerList,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function detectDuplicates(params: { phone?: string | undefined; email?: string | undefined }) {
  const conditions = [];

  if (params.phone) {
    const normalized = normalizeAlgerianPhone(params.phone);
    const rawDigits = params.phone.replace(/\D/g, "");
    conditions.push(eq(customers.phone, normalized));
    if (rawDigits.length >= 8) {
      conditions.push(ilike(customers.phone, `%${rawDigits.slice(-8)}%`));
    }
  }

  if (params.email && params.email.trim()) {
    conditions.push(eq(customers.email, params.email.toLowerCase().trim()));
  }

  if (conditions.length === 0) {
    return [];
  }

  return db
    .select({
      id: customers.id,
      fullName: customers.fullName,
      phone: customers.phone,
      email: customers.email,
      wilayaCode: customers.wilayaCode,
      createdAt: customers.createdAt,
    })
    .from(customers)
    .where(and(eq(customers.isArchived, false), or(...conditions)))
    .limit(5);
}

export async function getCustomerById(id: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);

  if (!customer) {
    throw new AppError(404, "Client introuvable / Customer not found");
  }

  // Linked travellers
  const linkedTravellers = await db
    .select()
    .from(travellers)
    .where(eq(travellers.customerId, id));

  // Linked enquiries count & recent enquiries
  const linkedEnquiries = await db
    .select({
      id: enquiries.id,
      enquiryNumber: enquiries.enquiryNumber,
      status: enquiries.status,
      travellersCount: enquiries.travellersCount,
      createdAt: enquiries.createdAt,
    })
    .from(enquiries)
    .where(eq(enquiries.customerId, id))
    .orderBy(desc(enquiries.createdAt))
    .limit(10);

  // Linked reservations
  const linkedReservations = await db
    .select({
      id: reservations.id,
      reference: reservations.reference,
      currentStatus: reservations.currentStatus,
      agreedTotalCentimes: reservations.agreedTotalCentimes,
      createdAt: reservations.createdAt,
    })
    .from(reservations)
    .where(eq(reservations.customerId, id))
    .orderBy(desc(reservations.createdAt))
    .limit(10);

  return {
    ...customer,
    travellers: linkedTravellers,
    enquiries: linkedEnquiries,
    reservations: linkedReservations,
  };
}

export async function createCustomer(
  input: CustomerInput,
  user: { id: string; email: string },
  ipAddress = "127.0.0.1",
  userAgent = "api"
) {
  const normalizedPhone = normalizeAlgerianPhone(input.phone);
  const normalizedEmail = input.email ? input.email.toLowerCase().trim() : null;

  const [created] = await db
    .insert(customers)
    .values({
      fullName: input.fullName.trim(),
      phone: normalizedPhone,
      email: normalizedEmail || null,
      wilayaCode: input.wilayaCode || null,
      preferredLanguage: input.preferredLanguage || "fr",
      internalNotes: input.internalNotes || null,
      createdByUserId: user.id,
      isArchived: false,
    })
    .returning();

  if (!created) {
    throw new AppError(500, "Échec de création du client / Failed to create customer");
  }

  await createAuditEntry({
    userId: user.id,
    userEmail: user.email,
    action: "CUSTOMER_CREATE",
    entityType: "Customer",
    entityId: created.id,
    ipAddress,
    userAgent,
    diffSummary: { fullName: created.fullName, phone: created.phone },
  });

  return created;
}

export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput,
  user: { id: string; email: string },
  ipAddress = "127.0.0.1",
  userAgent = "api"
) {
  const [existing] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  if (!existing) {
    throw new AppError(404, "Client introuvable / Customer not found");
  }

  const [updated] = await db
    .update(customers)
    .set({
      ...(input.fullName ? { fullName: input.fullName.trim() } : {}),
      ...(input.phone ? { phone: normalizeAlgerianPhone(input.phone) } : {}),
      ...(input.email !== undefined ? { email: input.email ? input.email.toLowerCase().trim() : null } : {}),
      ...(input.wilayaCode !== undefined ? { wilayaCode: input.wilayaCode } : {}),
      ...(input.preferredLanguage ? { preferredLanguage: input.preferredLanguage } : {}),
      ...(input.internalNotes !== undefined ? { internalNotes: input.internalNotes } : {}),
      updatedAt: new Date(),
    })
    .where(eq(customers.id, id))
    .returning();

  if (!updated) {
    throw new AppError(500, "Échec de mise à jour du client / Failed to update customer");
  }

  await createAuditEntry({
    userId: user.id,
    userEmail: user.email,
    action: "CUSTOMER_UPDATE",
    entityType: "Customer",
    entityId: id,
    ipAddress,
    userAgent,
    diffSummary: { updatedFields: Object.keys(input) },
  });

  return updated;
}

export async function addTraveller(
  customerId: string,
  input: Omit<TravellerInput, "customerId">,
  user: { id: string; email: string },
  ipAddress = "127.0.0.1",
  userAgent = "api"
) {
  const [cust] = await db.select({ id: customers.id }).from(customers).where(eq(customers.id, customerId)).limit(1);
  if (!cust) {
    throw new AppError(404, "Client introuvable / Customer not found");
  }

  const [traveller] = await db
    .insert(travellers)
    .values({
      customerId,
      fullName: input.fullName.trim(),
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
      gender: input.gender || null,
      passportNumberEncrypted: input.passportNumber || null,
      passportExpiryDate: input.passportExpiryDate ? new Date(input.passportExpiryDate) : null,
      nationality: input.nationality || "DZ",
      specialRequirements: input.specialRequirements || null,
    })
    .returning();

  if (!traveller) {
    throw new AppError(500, "Échec de création du voyageur / Failed to create traveller");
  }

  await createAuditEntry({
    userId: user.id,
    userEmail: user.email,
    action: "TRAVELLER_CREATE",
    entityType: "Traveller",
    entityId: traveller.id,
    ipAddress,
    userAgent,
    diffSummary: { customerId, fullName: input.fullName },
  });

  return traveller;
}
