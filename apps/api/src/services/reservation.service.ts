import { eq, desc, and, or, sql, inArray } from "drizzle-orm";
import { db } from "../database/connection.js";
import {
  reservations,
  reservationTravellers,
  travelOffers,
  destinations,
  departures,
  customers,
  enquiries,
  enquiryActivities,
  payments,
  refunds,
  users,
} from "../database/schema.js";
import { getNextSequence } from "../database/counter.js";
import { createAuditEntry } from "./audit.service.js";
import { AppError } from "../middleware/errorHandler.js";
import { hasPermission } from "@travel-agency/shared";
import type {
  CreateReservationInput,
  UpdateReservationStatusInput,
  ApplyDiscountInput,
  Role,
} from "@travel-agency/shared";

export interface ListReservationsParams {
  page?: number | undefined;
  limit?: number | undefined;
  status?: string | undefined;
  paymentStatus?: "unpaid" | "partially_paid" | "paid" | "overpaid" | "refunded" | undefined;
  customerId?: string | undefined;
  departureId?: string | undefined;
  search?: string | undefined;
}

export interface FinancialBalance {
  agreedTotalCentimes: number;
  totalPaidCentimes: number;
  totalRefundedCentimes: number;
  balanceCentimes: number;
  paymentStatus: "unpaid" | "partially_paid" | "paid" | "overpaid" | "refunded";
}

export function computeFinancialBalance(
  agreedTotalCentimes: number,
  paidCentimes: number,
  refundedCentimes: number
): FinancialBalance {
  const balanceCentimes = agreedTotalCentimes - paidCentimes + refundedCentimes;

  let paymentStatus: FinancialBalance["paymentStatus"] = "unpaid";
  if (refundedCentimes > 0 && paidCentimes > 0 && refundedCentimes >= paidCentimes) {
    paymentStatus = "refunded";
  } else if (paidCentimes === 0) {
    paymentStatus = "unpaid";
  } else if (balanceCentimes > 0) {
    paymentStatus = "partially_paid";
  } else if (balanceCentimes === 0) {
    paymentStatus = "paid";
  } else {
    paymentStatus = "overpaid";
  }

  return {
    agreedTotalCentimes,
    totalPaidCentimes: paidCentimes,
    totalRefundedCentimes: refundedCentimes,
    balanceCentimes,
    paymentStatus,
  };
}

export async function createReservation(
  input: CreateReservationInput,
  user: { id: string; email: string; role: Role },
  ipAddress = "127.0.0.1",
  userAgent = "backoffice"
) {
  // 1. Validate Customer
  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, input.customerId), eq(customers.isArchived, false)))
    .limit(1);

  if (!customer) {
    throw new AppError(404, "Client introuvable ou archivé / Customer not found or archived");
  }

  // 2. Validate Travel Offer
  const [offer] = await db
    .select()
    .from(travelOffers)
    .where(and(eq(travelOffers.id, input.offerId), eq(travelOffers.isArchived, false)))
    .limit(1);

  if (!offer) {
    throw new AppError(404, "Offre de voyage introuvable ou archivée / Travel offer not found");
  }

  // Destination info for immutable snapshot
  const [dest] = await db
    .select()
    .from(destinations)
    .where(eq(destinations.id, offer.destinationId))
    .limit(1);

  // 3. Discount authorization check
  const discountCentimes = input.discountCentimes || 0;
  if (discountCentimes > 0) {
    const canDiscount = hasPermission(user.role, "reservations:discount");
    if (!canDiscount) {
      throw new AppError(
        403,
        "Vous n'avez pas l'autorisation d'accorder une remise sur cette réservation / Discount authorization required"
      );
    }
  }

  // 4. Departure & Capacity Checking inside Transaction with Row Lock
  return db.transaction(async (tx) => {
    let dep: typeof departures.$inferSelect | undefined;

    if (input.departureId) {
      // Row lock with SELECT ... FOR UPDATE to prevent race conditions & overbooking
      const [lockedDep] = await tx
        .select()
        .from(departures)
        .where(eq(departures.id, input.departureId))
        .for("update");

      if (!lockedDep) {
        throw new AppError(404, "Date de départ introuvable / Departure not found");
      }

      dep = lockedDep;
      const availablePlaces = dep.maxCapacity - dep.bookedPlaces;

      if (input.passengerCount > availablePlaces) {
        const canOverride =
          hasPermission(user.role, "departures:capacity_override") &&
          Boolean(input.managerOverride?.reason);

        if (!canOverride) {
          throw new AppError(
            409,
            `Capacité insuffisante sur ce départ (${availablePlaces} places disponibles pour ${input.passengerCount} demandées). Une dérogation du Directeur est requise.`
          );
        }

        // Apply Manager Override
        const extraPlaces = input.passengerCount - availablePlaces;
        const currentOverrides = dep.managerOverrides || [];
        const newOverride = {
          overriddenByUserId: user.id,
          extraPlaces,
          reason: input.managerOverride!.reason,
          timestamp: new Date().toISOString(),
        };

        await tx
          .update(departures)
          .set({
            maxCapacity: dep.maxCapacity + extraPlaces,
            bookedPlaces: dep.bookedPlaces + input.passengerCount,
            managerOverrides: [...currentOverrides, newOverride],
            updatedAt: new Date(),
          })
          .where(eq(departures.id, input.departureId));
      } else {
        // Normal booking without override
        const newBookedCount = dep.bookedPlaces + input.passengerCount;
        await tx
          .update(departures)
          .set({
            bookedPlaces: newBookedCount,
            status: newBookedCount >= dep.maxCapacity ? "closed" : dep.status,
            updatedAt: new Date(),
          })
          .where(eq(departures.id, input.departureId));
      }
    }

    // 5. Freeze Immutable Offer Snapshot (Rules: editing offer never changes existing reservation)
    const offerSnapshot = {
      title: offer.title,
      destinationName: dest ? dest.name : { ar: "الجزائر", fr: "Algérie" },
      departureDate: dep ? dep.departureDate.toISOString() : new Date().toISOString(),
      returnDate: dep ? dep.returnDate.toISOString() : new Date().toISOString(),
      durationDays: offer.durationDays,
      unitPriceCentimes: offer.basePriceCentimes,
      currency: "DZD" as const,
    };

    // 6. Calculate agreed total in centimes
    const agreedBaseTotal = offer.basePriceCentimes * input.passengerCount;
    const agreedTotalCentimes = Math.max(0, agreedBaseTotal - discountCentimes);

    // 7. Atomic Sequential Reference TRV-2026-XXXXXX
    const reference = await getNextSequence("TRV");

    // Initial status history entry
    const initialStatusHistory = [
      {
        status: "pending",
        changedByUserId: user.id,
        reason: "Création initiale du dossier de réservation",
        timestamp: new Date().toISOString(),
      },
    ];

    // 8. Insert Reservation
    const [created] = await tx
      .insert(reservations)
      .values({
        reference,
        enquiryId: input.enquiryId || null,
        customerId: input.customerId,
        offerId: input.offerId,
        departureId: input.departureId || null,
        offerSnapshot,
        passengerCount: input.passengerCount,
        agreedTotalCentimes,
        discountCentimes,
        discountAuthorizedBy: discountCentimes > 0 ? user.id : null,
        currentStatus: "pending",
        statusHistory: initialStatusHistory,
        specialRequirements: input.specialRequirements || null,
        createdByUserId: user.id,
      })
      .returning();

    if (!created) {
      throw new AppError(500, "Échec de création de la réservation / Failed to create reservation");
    }

    // 9. Attach travellers to reservation
    if (input.travellers && input.travellers.length > 0) {
      for (const trav of input.travellers) {
        await tx.insert(reservationTravellers).values({
          reservationId: created.id,
          fullName: trav.fullName.trim(),
          isPrimaryContact: trav.isPrimaryContact ?? false,
          passportNumberEncrypted: trav.passportNumber || null,
        });
      }
    }

    // 10. If converted from an enquiry, update enquiry status
    if (input.enquiryId) {
      await tx
        .update(enquiries)
        .set({ status: "converted", updatedAt: new Date() })
        .where(eq(enquiries.id, input.enquiryId));

      await tx.insert(enquiryActivities).values({
        enquiryId: input.enquiryId,
        userId: user.id,
        action: "converted",
        previousStatus: "contacted",
        newStatus: "converted",
        notes: `Demande convertie avec succès en réservation ${reference}`,
      });
    }

    // 11. Append-Only Audit Entry
    await createAuditEntry({
      userId: user.id,
      userEmail: user.email,
      action: "RESERVATION_CREATE",
      entityType: "Reservation",
      entityId: created.id,
      ipAddress,
      userAgent,
      diffSummary: {
        reference,
        customerName: customer.fullName,
        passengerCount: input.passengerCount,
        agreedTotalCentimes,
        discountCentimes,
      },
    });

    const balance = computeFinancialBalance(agreedTotalCentimes, 0, 0);

    return {
      ...created,
      customer: { id: customer.id, fullName: customer.fullName, phone: customer.phone },
      ...balance,
    };
  });
}

export async function listReservations(params: ListReservationsParams = {}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const offset = (page - 1) * limit;

  const conditions = [];

  if (params.status) {
    conditions.push(eq(reservations.currentStatus, params.status));
  }
  if (params.customerId) {
    conditions.push(eq(reservations.customerId, params.customerId));
  }
  if (params.departureId) {
    conditions.push(eq(reservations.departureId, params.departureId));
  }
  if (params.search) {
    const pattern = `%${params.search}%`;
    conditions.push(
      or(
        sql`${reservations.reference} ILIKE ${pattern}`,
        sql`${customers.fullName} ILIKE ${pattern}`,
        sql`${customers.phone} ILIKE ${pattern}`
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Total count
  const [countRow] = await db
    .select({ count: sql<number>`cast(count(${reservations.id}) as int)` })
    .from(reservations)
    .leftJoin(customers, eq(reservations.customerId, customers.id))
    .where(whereClause);

  const count = countRow?.count ?? 0;

  // Rows
  const rows = await db
    .select({
      id: reservations.id,
      reference: reservations.reference,
      customerId: reservations.customerId,
      customerName: customers.fullName,
      customerPhone: customers.phone,
      offerId: reservations.offerId,
      offerTitle: travelOffers.title,
      departureId: reservations.departureId,
      departureDate: departures.departureDate,
      returnDate: departures.returnDate,
      offerSnapshot: reservations.offerSnapshot,
      passengerCount: reservations.passengerCount,
      agreedTotalCentimes: reservations.agreedTotalCentimes,
      discountCentimes: reservations.discountCentimes,
      currentStatus: reservations.currentStatus,
      createdAt: reservations.createdAt,
    })
    .from(reservations)
    .leftJoin(customers, eq(reservations.customerId, customers.id))
    .leftJoin(travelOffers, eq(reservations.offerId, travelOffers.id))
    .leftJoin(departures, eq(reservations.departureId, departures.id))
    .where(whereClause)
    .orderBy(desc(reservations.createdAt))
    .limit(limit)
    .offset(offset);

  // If there are reservations, fetch financial balances
  const reservationIds = rows.map((r) => r.id);

  let paymentsMap: Record<string, number> = {};
  let refundsMap: Record<string, number> = {};

  if (reservationIds.length > 0) {
    // Sum active non-reversed payments per reservation
    const paymentSums = await db
      .select({
        reservationId: payments.reservationId,
        total: sql<number>`cast(coalesce(sum(${payments.amountCentimes}), 0) as bigint)`,
      })
      .from(payments)
      .where(and(inArray(payments.reservationId, reservationIds), eq(payments.isReversed, false)))
      .groupBy(payments.reservationId);

    paymentSums.forEach((p) => {
      paymentsMap[p.reservationId] = Number(p.total);
    });

    // Sum refunds per reservation
    const refundSums = await db
      .select({
        reservationId: refunds.reservationId,
        total: sql<number>`cast(coalesce(sum(${refunds.amountCentimes}), 0) as bigint)`,
      })
      .from(refunds)
      .where(inArray(refunds.reservationId, reservationIds))
      .groupBy(refunds.reservationId);

    refundSums.forEach((rf) => {
      refundsMap[rf.reservationId] = Number(rf.total);
    });
  }

  const enrichedRows = rows.map((row) => {
    const paid = paymentsMap[row.id] || 0;
    const refunded = refundsMap[row.id] || 0;
    const financial = computeFinancialBalance(row.agreedTotalCentimes, paid, refunded);

    return {
      ...row,
      ...financial,
    };
  });

  // Apply optional memory filter for paymentStatus if specified
  const filteredRows = params.paymentStatus
    ? enrichedRows.filter((r) => r.paymentStatus === params.paymentStatus)
    : enrichedRows;

  return {
    reservations: filteredRows,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}

export async function getReservationById(id: string) {
  const [res] = await db
    .select({
      id: reservations.id,
      reference: reservations.reference,
      enquiryId: reservations.enquiryId,
      customerId: reservations.customerId,
      offerId: reservations.offerId,
      departureId: reservations.departureId,
      offerSnapshot: reservations.offerSnapshot,
      passengerCount: reservations.passengerCount,
      agreedTotalCentimes: reservations.agreedTotalCentimes,
      discountCentimes: reservations.discountCentimes,
      discountAuthorizedBy: reservations.discountAuthorizedBy,
      currentStatus: reservations.currentStatus,
      statusHistory: reservations.statusHistory,
      specialRequirements: reservations.specialRequirements,
      cancellationReason: reservations.cancellationReason,
      createdAt: reservations.createdAt,
      updatedAt: reservations.updatedAt,
      customer: {
        id: customers.id,
        fullName: customers.fullName,
        phone: customers.phone,
        email: customers.email,
        wilayaCode: customers.wilayaCode,
      },
      createdByUser: {
        id: users.id,
        fullName: users.fullName,
      },
    })
    .from(reservations)
    .leftJoin(customers, eq(reservations.customerId, customers.id))
    .leftJoin(users, eq(reservations.createdByUserId, users.id))
    .where(eq(reservations.id, id))
    .limit(1);

  if (!res) {
    throw new AppError(404, "Réservation introuvable / Reservation not found");
  }

  // Fetch linked reservation travellers
  const travellersList = await db
    .select()
    .from(reservationTravellers)
    .where(eq(reservationTravellers.reservationId, id));

  // Fetch linked payments (most recent first)
  const paymentsList = await db
    .select({
      id: payments.id,
      receiptNumber: payments.receiptNumber,
      amountCentimes: payments.amountCentimes,
      currency: payments.currency,
      paymentDate: payments.paymentDate,
      method: payments.method,
      referenceOrSlipNumber: payments.referenceOrSlipNumber,
      notes: payments.notes,
      isReversed: payments.isReversed,
      reversalReason: payments.reversalReason,
      reversalTimestamp: payments.reversalTimestamp,
      recordedByUserName: users.fullName,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .leftJoin(users, eq(payments.recordedByUserId, users.id))
    .where(eq(payments.reservationId, id))
    .orderBy(desc(payments.paymentDate));

  // Fetch linked refunds
  const refundsList = await db
    .select({
      id: refunds.id,
      refundNumber: refunds.refundNumber,
      amountCentimes: refunds.amountCentimes,
      currency: refunds.currency,
      refundDate: refunds.refundDate,
      reason: refunds.reason,
      notes: refunds.notes,
      approvedByUserName: users.fullName,
      createdAt: refunds.createdAt,
    })
    .from(refunds)
    .leftJoin(users, eq(refunds.approvedByUserId, users.id))
    .where(eq(refunds.reservationId, id))
    .orderBy(desc(refunds.refundDate));

  // Calculate financial balances
  const totalPaid = paymentsList
    .filter((p) => !p.isReversed)
    .reduce((sum, p) => sum + Number(p.amountCentimes), 0);

  const totalRefunded = refundsList.reduce((sum, r) => sum + Number(r.amountCentimes), 0);

  const financial = computeFinancialBalance(res.agreedTotalCentimes, totalPaid, totalRefunded);

  return {
    ...res,
    travellers: travellersList,
    payments: paymentsList,
    refunds: refundsList,
    ...financial,
  };
}

export async function updateReservationStatus(
  id: string,
  input: UpdateReservationStatusInput,
  user: { id: string; email: string; role: Role },
  ipAddress = "127.0.0.1",
  userAgent = "backoffice"
) {
  const [existing] = await db.select().from(reservations).where(eq(reservations.id, id)).limit(1);
  if (!existing) {
    throw new AppError(404, "Réservation introuvable / Reservation not found");
  }

  const previousStatus = existing.currentStatus;
  const newStatus = input.status;

  if (previousStatus === newStatus) {
    return existing;
  }

  // Confirmation requires reservations:confirm permission (spec 3.5: authorized employee checks conditions)
  if (newStatus === "confirmed") {
    const canConfirm = hasPermission(user.role, "reservations:confirm");
    if (!canConfirm) {
      throw new AppError(
        403,
        "Vous n'avez pas l'autorisation de confirmer cette réservation (rôle Directeur ou Manager requis) / Permission reservations:confirm required"
      );
    }
  }

  return db.transaction(async (tx) => {
    // If cancelling, release places on departure if departure exists
    if (newStatus === "cancelled" && existing.departureId) {
      const [dep] = await tx
        .select()
        .from(departures)
        .where(eq(departures.id, existing.departureId))
        .for("update");

      if (dep) {
        const releasedBooked = Math.max(0, dep.bookedPlaces - existing.passengerCount);
        await tx
          .update(departures)
          .set({
            bookedPlaces: releasedBooked,
            status: dep.status === "closed" && releasedBooked < dep.maxCapacity ? "open" : dep.status,
            updatedAt: new Date(),
          })
          .where(eq(departures.id, existing.departureId));
      }
    }

    const newHistoryEntry = {
      status: newStatus,
      changedByUserId: user.id,
      reason: input.reason || `Statut modifié de ${previousStatus} vers ${newStatus}`,
      timestamp: new Date().toISOString(),
    };

    const currentHistory = existing.statusHistory || [];

    const [updated] = await tx
      .update(reservations)
      .set({
        currentStatus: newStatus,
        statusHistory: [...currentHistory, newHistoryEntry],
        cancellationReason: newStatus === "cancelled" ? input.reason || null : existing.cancellationReason,
        updatedAt: new Date(),
      })
      .where(eq(reservations.id, id))
      .returning();

    // Audit Log
    await createAuditEntry({
      userId: user.id,
      userEmail: user.email,
      action: "RESERVATION_STATUS_CHANGE",
      entityType: "Reservation",
      entityId: id,
      ipAddress,
      userAgent,
      diffSummary: {
        reference: existing.reference,
        previousStatus,
        newStatus,
        reason: input.reason,
      },
    });

    return updated;
  });
}

export async function applyReservationDiscount(
  id: string,
  input: ApplyDiscountInput,
  user: { id: string; email: string; role: Role },
  ipAddress = "127.0.0.1",
  userAgent = "backoffice"
) {
  const canDiscount = hasPermission(user.role, "reservations:discount");
  if (!canDiscount) {
    throw new AppError(
      403,
      "Autorisation insuffisante pour modifier la remise / Permission reservations:discount required"
    );
  }

  const [existing] = await db.select().from(reservations).where(eq(reservations.id, id)).limit(1);
  if (!existing) {
    throw new AppError(404, "Réservation introuvable / Reservation not found");
  }

  const unitPrice = existing.offerSnapshot.unitPriceCentimes;
  const baseAgreed = unitPrice * existing.passengerCount;
  const newDiscount = input.discountCentimes;
  const newAgreedTotal = Math.max(0, baseAgreed - newDiscount);

  const [updated] = await db
    .update(reservations)
    .set({
      discountCentimes: newDiscount,
      discountAuthorizedBy: user.id,
      agreedTotalCentimes: newAgreedTotal,
      updatedAt: new Date(),
    })
    .where(eq(reservations.id, id))
    .returning();

  await createAuditEntry({
    userId: user.id,
    userEmail: user.email,
    action: "RESERVATION_DISCOUNT_APPLIED",
    entityType: "Reservation",
    entityId: id,
    ipAddress,
    userAgent,
    diffSummary: {
      reference: existing.reference,
      previousDiscount: existing.discountCentimes,
      newDiscount,
      newAgreedTotal,
      reason: input.reason,
    },
  });

  return updated;
}
