import { eq, and, sql, gte, lte, desc, asc } from "drizzle-orm";
import { db } from "../database/connection.js";
import {
  departures,
  travelOffers,
  reservations,
  reservationTravellers,
  customers,
  payments,
} from "../database/schema.js";
import { createAuditEntry } from "./audit.service.js";
import { AppError } from "../middleware/errorHandler.js";
import type { Role } from "@travel-agency/shared";

export interface ListDeparturesFilters {
  offerId?: string | undefined;
  status?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export async function listDepartures(filters: ListDeparturesFilters) {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const offset = (page - 1) * limit;

  const conditions = [];

  if (filters.offerId) {
    conditions.push(eq(departures.offerId, filters.offerId));
  }
  if (filters.status) {
    conditions.push(eq(departures.status, filters.status));
  }
  if (filters.startDate) {
    conditions.push(gte(departures.departureDate, new Date(filters.startDate)));
  }
  if (filters.endDate) {
    conditions.push(lte(departures.departureDate, new Date(filters.endDate)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(departures)
    .where(whereClause);

  const total = countRes?.count || 0;

  const depList = await db
    .select({
      id: departures.id,
      offerId: departures.offerId,
      offerTitle: travelOffers.title,
      offerSlug: travelOffers.slug,
      departureDate: departures.departureDate,
      returnDate: departures.returnDate,
      maxCapacity: departures.maxCapacity,
      bookedPlaces: departures.bookedPlaces,
      waitingListCount: departures.waitingListCount,
      status: departures.status,
      managerOverrides: departures.managerOverrides,
      createdAt: departures.createdAt,
      occupancyPercent: sql<number>`round((${departures.bookedPlaces}::decimal / nullif(${departures.maxCapacity}, 0)) * 100)::int`,
    })
    .from(departures)
    .innerJoin(travelOffers, eq(departures.offerId, travelOffers.id))
    .where(whereClause)
    .orderBy(asc(departures.departureDate))
    .limit(limit)
    .offset(offset);

  return {
    departures: depList,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getDepartureManifest(departureId: string) {
  const [dep] = await db
    .select({
      id: departures.id,
      offerId: departures.offerId,
      offerTitle: travelOffers.title,
      departureDate: departures.departureDate,
      returnDate: departures.returnDate,
      maxCapacity: departures.maxCapacity,
      bookedPlaces: departures.bookedPlaces,
      waitingListCount: departures.waitingListCount,
      status: departures.status,
      managerOverrides: departures.managerOverrides,
    })
    .from(departures)
    .innerJoin(travelOffers, eq(departures.offerId, travelOffers.id))
    .where(eq(departures.id, departureId))
    .limit(1);

  if (!dep) {
    throw new AppError(404, "Départ introuvable / Departure not found");
  }

  // Fetch all active reservations for this departure
  const resList = await db
    .select({
      id: reservations.id,
      reference: reservations.reference,
      customerId: reservations.customerId,
      customerName: customers.fullName,
      customerPhone: customers.phone,
      passengerCount: reservations.passengerCount,
      agreedTotalCentimes: reservations.agreedTotalCentimes,
      currentStatus: reservations.currentStatus,
      createdAt: reservations.createdAt,
    })
    .from(reservations)
    .innerJoin(customers, eq(reservations.customerId, customers.id))
    .where(
      and(
        eq(reservations.departureId, departureId),
        sql`${reservations.currentStatus} != 'cancelled'`
      )
    )
    .orderBy(desc(reservations.createdAt));

  // For each reservation, fetch travellers and payment totals
  const reservationIds = resList.map((r) => r.id);

  let travellersList: any[] = [];
  let paymentsSummary: Record<string, number> = {};

  if (reservationIds.length > 0) {
    travellersList = await db
      .select({
        id: reservationTravellers.id,
        reservationId: reservationTravellers.reservationId,
        fullName: reservationTravellers.fullName,
        dateOfBirth: reservationTravellers.dateOfBirth,
        isPrimaryContact: reservationTravellers.isPrimaryContact,
        passportExpiryDate: reservationTravellers.passportExpiryDate,
        hasPassport: sql<boolean>`${reservationTravellers.passportNumberEncrypted} is not null`,
        roomAllocation: reservationTravellers.roomAllocation,
      })
      .from(reservationTravellers)
      .where(sql`${reservationTravellers.reservationId} in ${reservationIds}`)
      .orderBy(asc(reservationTravellers.fullName));

    // Payments for each reservation
    const payRows = await db
      .select({
        reservationId: payments.reservationId,
        totalPaidCentimes: sql<number>`coalesce(sum(${payments.amountCentimes}) filter (where not ${payments.isReversed}), 0)::bigint`,
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
      paymentsSummary[p.reservationId] = Number(p.totalPaidCentimes);
    });
  }

  // Merge manifest passenger records
  const manifestPassengers = travellersList.map((t) => {
    const res = resList.find((r) => r.id === t.reservationId);
    const paid = paymentsSummary[t.reservationId] || 0;
    const total = Number(res?.agreedTotalCentimes || 0);
    const balance = Math.max(0, total - paid);
    const isFullyPaid = balance === 0 && total > 0;

    return {
      travellerId: t.id,
      fullName: t.fullName,
      dateOfBirth: t.dateOfBirth,
      isPrimaryContact: t.isPrimaryContact,
      hasPassport: t.hasPassport,
      passportExpiryDate: t.passportExpiryDate,
      roomAllocation: t.roomAllocation,
      reservationId: t.reservationId,
      reservationReference: res?.reference || "",
      customerName: res?.customerName || "",
      customerPhone: res?.customerPhone || "",
      reservationStatus: res?.currentStatus || "",
      isFullyPaid,
      balanceCentimes: balance,
    };
  });

  return {
    departure: dep,
    passengerCount: manifestPassengers.length,
    reservationsCount: resList.length,
    manifest: manifestPassengers,
  };
}

export async function updateDepartureStatus(
  departureId: string,
  newStatus: "open" | "closed" | "completed" | "cancelled",
  user: { id: string; email: string; role: Role },
  ipAddress = "127.0.0.1",
  userAgent = "backoffice"
) {
  const [existing] = await db
    .select()
    .from(departures)
    .where(eq(departures.id, departureId))
    .limit(1);

  if (!existing) {
    throw new AppError(404, "Départ introuvable / Departure not found");
  }

  const [updated] = await db
    .update(departures)
    .set({
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(departures.id, departureId))
    .returning();

  await createAuditEntry({
    userId: user.id,
    userEmail: user.email,
    action: "DEPARTURE_STATUS_CHANGE",
    entityType: "departure",
    entityId: departureId,
    ipAddress,
    userAgent,
    diffSummary: {
      oldStatus: existing.status,
      newStatus,
    },
  });

  return updated;
}
