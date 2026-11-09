import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "../database/connection.js";
import {
  payments,
  refunds,
  reservations,
  customers,
  users,
} from "../database/schema.js";
import { getNextSequence } from "../database/counter.js";
import { createAuditEntry } from "./audit.service.js";
import { AppError } from "../middleware/errorHandler.js";
import { hasPermission } from "@travel-agency/shared";
import type {
  RecordPaymentInput,
  RefundPaymentInput,
  ReversePaymentInput,
  Role,
} from "@travel-agency/shared";

export interface ListPaymentsParams {
  page?: number | undefined;
  limit?: number | undefined;
  method?: string | undefined;
  reservationId?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
}

export async function recordPayment(
  reservationId: string,
  input: RecordPaymentInput,
  user: { id: string; email: string; role: Role },
  ipAddress = "127.0.0.1",
  userAgent = "backoffice"
) {
  // 1. Verify Reservation
  const [res] = await db
    .select({
      id: reservations.id,
      reference: reservations.reference,
      currentStatus: reservations.currentStatus,
      agreedTotalCentimes: reservations.agreedTotalCentimes,
      customerId: reservations.customerId,
    })
    .from(reservations)
    .where(eq(reservations.id, reservationId))
    .limit(1);

  if (!res) {
    throw new AppError(404, "Réservation introuvable / Reservation not found");
  }

  if (res.currentStatus === "cancelled") {
    throw new AppError(
      400,
      "Impossible d'enregistrer un paiement sur une réservation annulée / Cannot pay cancelled reservation"
    );
  }

  if (input.amountCentimes <= 0) {
    throw new AppError(400, "Le montant du paiement doit être supérieur à 0 centime");
  }

  // 2. Atomic Receipt Reference RCP-2026-XXXXXX
  const receiptNumber = await getNextSequence("RCP");

  // 3. Insert Payment
  const [payment] = await db
    .insert(payments)
    .values({
      receiptNumber,
      reservationId,
      amountCentimes: input.amountCentimes,
      currency: "DZD",
      paymentDate: input.paymentDate ? new Date(input.paymentDate) : new Date(),
      method: input.method,
      referenceOrSlipNumber: input.referenceOrSlipNumber || null,
      recordedByUserId: user.id,
      notes: input.notes || null,
      isReversed: false,
    })
    .returning();

  if (!payment) {
    throw new AppError(500, "Échec de l'enregistrement du paiement / Failed to record payment");
  }

  // 4. Append-Only Audit Entry
  await createAuditEntry({
    userId: user.id,
    userEmail: user.email,
    action: "PAYMENT_CREATE",
    entityType: "Payment",
    entityId: payment.id,
    ipAddress,
    userAgent,
    diffSummary: {
      receiptNumber,
      reservationReference: res.reference,
      amountCentimes: input.amountCentimes,
      method: input.method,
      slipNumber: input.referenceOrSlipNumber,
    },
  });

  return payment;
}

export async function listPayments(params: ListPaymentsParams = {}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const offset = (page - 1) * limit;

  const conditions = [];

  if (params.method) {
    conditions.push(eq(payments.method, params.method));
  }
  if (params.reservationId) {
    conditions.push(eq(payments.reservationId, params.reservationId));
  }
  if (params.startDate) {
    conditions.push(sql`${payments.paymentDate} >= ${new Date(params.startDate)}`);
  }
  if (params.endDate) {
    conditions.push(sql`${payments.paymentDate} <= ${new Date(params.endDate)}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countRow] = await db
    .select({ count: sql<number>`cast(count(${payments.id}) as int)` })
    .from(payments)
    .where(whereClause);

  const count = countRow?.count ?? 0;

  const rows = await db
    .select({
      id: payments.id,
      receiptNumber: payments.receiptNumber,
      reservationId: payments.reservationId,
      reservationReference: reservations.reference,
      customerName: customers.fullName,
      amountCentimes: payments.amountCentimes,
      currency: payments.currency,
      paymentDate: payments.paymentDate,
      method: payments.method,
      referenceOrSlipNumber: payments.referenceOrSlipNumber,
      notes: payments.notes,
      isReversed: payments.isReversed,
      reversalReason: payments.reversalReason,
      recordedByUserName: users.fullName,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .leftJoin(reservations, eq(payments.reservationId, reservations.id))
    .leftJoin(customers, eq(reservations.customerId, customers.id))
    .leftJoin(users, eq(payments.recordedByUserId, users.id))
    .where(whereClause)
    .orderBy(desc(payments.paymentDate))
    .limit(limit)
    .offset(offset);

  // Compute summary totals
  const [metrics] = await db
    .select({
      totalCentimes: sql<number>`cast(coalesce(sum(case when ${payments.isReversed} = false then ${payments.amountCentimes} else 0 end), 0) as bigint)`,
      cashCentimes: sql<number>`cast(coalesce(sum(case when ${payments.isReversed} = false and ${payments.method} = 'cash' then ${payments.amountCentimes} else 0 end), 0) as bigint)`,
      bankCentimes: sql<number>`cast(coalesce(sum(case when ${payments.isReversed} = false and ${payments.method} = 'bank_transfer' then ${payments.amountCentimes} else 0 end), 0) as bigint)`,
      chequeCentimes: sql<number>`cast(coalesce(sum(case when ${payments.isReversed} = false and ${payments.method} = 'cheque' then ${payments.amountCentimes} else 0 end), 0) as bigint)`,
      cibCentimes: sql<number>`cast(coalesce(sum(case when ${payments.isReversed} = false and ${payments.method} = 'cib_edahabia_manual' then ${payments.amountCentimes} else 0 end), 0) as bigint)`,
    })
    .from(payments);

  return {
    payments: rows,
    metrics: {
      totalCentimes: Number(metrics?.totalCentimes || 0),
      cashCentimes: Number(metrics?.cashCentimes || 0),
      bankCentimes: Number(metrics?.bankCentimes || 0),
      chequeCentimes: Number(metrics?.chequeCentimes || 0),
      cibCentimes: Number(metrics?.cibCentimes || 0),
    },
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}

export async function getPaymentById(id: string) {
  const [payment] = await db
    .select({
      id: payments.id,
      receiptNumber: payments.receiptNumber,
      reservationId: payments.reservationId,
      reservationReference: reservations.reference,
      customerName: customers.fullName,
      customerPhone: customers.phone,
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
    .leftJoin(reservations, eq(payments.reservationId, reservations.id))
    .leftJoin(customers, eq(reservations.customerId, customers.id))
    .leftJoin(users, eq(payments.recordedByUserId, users.id))
    .where(eq(payments.id, id))
    .limit(1);

  if (!payment) {
    throw new AppError(404, "Paiement introuvable / Payment not found");
  }

  return payment;
}

export async function reversePayment(
  paymentId: string,
  input: ReversePaymentInput,
  user: { id: string; email: string; role: Role },
  ipAddress = "127.0.0.1",
  userAgent = "backoffice"
) {
  const [existing] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!existing) {
    throw new AppError(404, "Paiement introuvable / Payment not found");
  }

  if (existing.isReversed) {
    throw new AppError(400, "Ce paiement a déjà été annulé / Payment already reversed");
  }

  const [reversed] = await db
    .update(payments)
    .set({
      isReversed: true,
      reversalReason: input.reversalReason.trim(),
      reversalTimestamp: new Date(),
    })
    .where(eq(payments.id, paymentId))
    .returning();

  if (!reversed) {
    throw new AppError(500, "Échec de l'annulation du paiement / Failed to reverse payment");
  }

  await createAuditEntry({
    userId: user.id,
    userEmail: user.email,
    action: "PAYMENT_REVERSAL",
    entityType: "Payment",
    entityId: paymentId,
    ipAddress,
    userAgent,
    diffSummary: {
      receiptNumber: existing.receiptNumber,
      amountCentimes: existing.amountCentimes,
      reason: input.reversalReason,
    },
  });

  return reversed;
}

export async function refundReservation(
  reservationId: string,
  input: RefundPaymentInput,
  user: { id: string; email: string; role: Role },
  ipAddress = "127.0.0.1",
  userAgent = "backoffice"
) {
  const canRefund = hasPermission(user.role, "payments:refund");
  if (!canRefund) {
    throw new AppError(
      403,
      "Vous n'avez pas l'autorisation d'émettre un remboursement (Rôle Responsable Financier ou Directeur requis)"
    );
  }

  const [res] = await db.select().from(reservations).where(eq(reservations.id, reservationId)).limit(1);
  if (!res) {
    throw new AppError(404, "Réservation introuvable / Reservation not found");
  }

  // Calculate total net payments received to date
  const [totalPaid] = await db
    .select({
      sum: sql<number>`cast(coalesce(sum(${payments.amountCentimes}), 0) as bigint)`,
    })
    .from(payments)
    .where(and(eq(payments.reservationId, reservationId), eq(payments.isReversed, false)));

  const [totalRefunded] = await db
    .select({
      sum: sql<number>`cast(coalesce(sum(${refunds.amountCentimes}), 0) as bigint)`,
    })
    .from(refunds)
    .where(eq(refunds.reservationId, reservationId));

  const netReceivedCentimes = Number(totalPaid?.sum || 0) - Number(totalRefunded?.sum || 0);

  if (input.amountCentimes > netReceivedCentimes) {
    throw new AppError(
      400,
      `Le montant du remboursement (${input.amountCentimes} centimes) dépasse les encaissements nets enregistrés (${netReceivedCentimes} centimes)`
    );
  }

  // Atomic sequence RFD-2026-XXXXXX
  const refundNumber = await getNextSequence("RFD");

  const [refund] = await db
    .insert(refunds)
    .values({
      refundNumber,
      reservationId,
      originalPaymentId: input.paymentId || null,
      amountCentimes: input.amountCentimes,
      currency: "DZD",
      refundDate: new Date(),
      reason: input.reason.trim(),
      approvedByUserId: user.id,
      notes: input.notes || null,
    })
    .returning();

  if (!refund) {
    throw new AppError(500, "Échec de l'enregistrement du remboursement / Failed to record refund");
  }

  await createAuditEntry({
    userId: user.id,
    userEmail: user.email,
    action: "PAYMENT_REFUND",
    entityType: "Refund",
    entityId: refund.id,
    ipAddress,
    userAgent,
    diffSummary: {
      refundNumber,
      reservationReference: res.reference,
      amountCentimes: input.amountCentimes,
      reason: input.reason,
    },
  });

  return refund;
}
