import { eq, and, sql, gte, lte, desc, asc } from "drizzle-orm";
import { db } from "../database/connection.js";
import {
  enquiries,
  reservations,
  departures,
  travelOffers,
  payments,
  refunds,
  customers,
} from "../database/schema.js";

export async function getDashboardSummary() {
  const now = new Date();
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // 1. Operational Counts
  const [enqCountRes] = await db
    .select({
      newCount: sql<number>`count(*) filter (where ${enquiries.status} in ('new', 'waiting_customer'))::int`,
      unassignedCount: sql<number>`count(*) filter (where ${enquiries.status} = 'new' and ${enquiries.assignedToUserId} is null)::int`,
    })
    .from(enquiries);

  const [resCountRes] = await db
    .select({
      activeCount: sql<number>`count(*) filter (where ${reservations.currentStatus} in ('pending', 'awaiting_documents', 'awaiting_payment', 'confirmed'))::int`,
      pendingDocsCount: sql<number>`count(*) filter (where ${reservations.currentStatus} = 'awaiting_documents')::int`,
      totalBookedSalesCentimes: sql<number>`coalesce(sum(${reservations.agreedTotalCentimes}) filter (where ${reservations.currentStatus} != 'cancelled'), 0)::bigint`,
    })
    .from(reservations);

  const [depCountRes] = await db
    .select({
      upcomingCount: sql<number>`count(*)::int`,
    })
    .from(departures)
    .where(
      and(
        gte(departures.departureDate, now),
        lte(departures.departureDate, thirtyDaysLater),
        eq(departures.status, "open")
      )
    );

  // 2. Financial Metrics (Strict distinction: Cash Received vs Booked Sales)
  const [paymentsSumRes] = await db
    .select({
      totalPaymentsCentimes: sql<number>`coalesce(sum(${payments.amountCentimes}) filter (where not ${payments.isReversed}), 0)::bigint`,
    })
    .from(payments);

  const [refundsSumRes] = await db
    .select({
      totalRefundsCentimes: sql<number>`coalesce(sum(${refunds.amountCentimes}), 0)::bigint`,
    })
    .from(refunds);

  const totalPaymentsCentimes = Number(paymentsSumRes?.totalPaymentsCentimes || 0);
  const totalRefundsCentimes = Number(refundsSumRes?.totalRefundsCentimes || 0);
  const cashReceivedCentimes = Math.max(0, totalPaymentsCentimes - totalRefundsCentimes);
  const bookedSalesCentimes = Number(resCountRes?.totalBookedSalesCentimes || 0);
  const outstandingBalanceCentimes = Math.max(0, bookedSalesCentimes - cashReceivedCentimes);

  // 3. Alerts: Departures nearing capacity (>= 80% filled)
  const nearingCapacityDepartures = await db
    .select({
      id: departures.id,
      offerId: departures.offerId,
      offerTitle: travelOffers.title,
      departureDate: departures.departureDate,
      maxCapacity: departures.maxCapacity,
      bookedPlaces: departures.bookedPlaces,
      occupancyPercent: sql<number>`round((${departures.bookedPlaces}::decimal / nullif(${departures.maxCapacity}, 0)) * 100)::int`,
    })
    .from(departures)
    .innerJoin(travelOffers, eq(departures.offerId, travelOffers.id))
    .where(
      and(
        gte(departures.departureDate, now),
        sql`${departures.bookedPlaces}::decimal / nullif(${departures.maxCapacity}, 0) >= 0.8`
      )
    )
    .orderBy(asc(departures.departureDate))
    .limit(5);

  // 4. Upcoming Departures (next 5)
  const nextDepartures = await db
    .select({
      id: departures.id,
      offerId: departures.offerId,
      offerTitle: travelOffers.title,
      departureDate: departures.departureDate,
      returnDate: departures.returnDate,
      maxCapacity: departures.maxCapacity,
      bookedPlaces: departures.bookedPlaces,
      status: departures.status,
    })
    .from(departures)
    .innerJoin(travelOffers, eq(departures.offerId, travelOffers.id))
    .where(gte(departures.departureDate, now))
    .orderBy(asc(departures.departureDate))
    .limit(5);

  // 5. Recent Enquiries (last 5)
  const recentEnquiries = await db
    .select({
      id: enquiries.id,
      enquiryNumber: enquiries.enquiryNumber,
      contactName: enquiries.contactName,
      contactPhone: enquiries.contactPhone,
      status: enquiries.status,
      travellersCount: enquiries.travellersCount,
      createdAt: enquiries.createdAt,
      offerTitle: travelOffers.title,
    })
    .from(enquiries)
    .leftJoin(travelOffers, eq(enquiries.offerId, travelOffers.id))
    .orderBy(desc(enquiries.createdAt))
    .limit(5);

  // 6. Recent Payments (last 5)
  const recentPayments = await db
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
    })
    .from(payments)
    .innerJoin(reservations, eq(payments.reservationId, reservations.id))
    .leftJoin(customers, eq(reservations.customerId, customers.id))
    .where(eq(payments.isReversed, false))
    .orderBy(desc(payments.paymentDate))
    .limit(5);

  return {
    kpis: {
      newEnquiriesCount: enqCountRes?.newCount || 0,
      activeReservationsCount: resCountRes?.activeCount || 0,
      upcomingDeparturesCount: depCountRes?.upcomingCount || 0,
      pendingDocumentsCount: resCountRes?.pendingDocsCount || 0,
      unassignedEnquiriesCount: enqCountRes?.unassignedCount || 0,
      // Financial KPIs
      cashReceivedCentimes,
      bookedSalesCentimes,
      outstandingBalanceCentimes,
      currency: "DZD",
    },
    alerts: {
      nearingCapacityDepartures,
      unassignedEnquiriesCount: enqCountRes?.unassignedCount || 0,
      pendingDocumentsCount: resCountRes?.pendingDocsCount || 0,
    },
    nextDepartures,
    recentEnquiries,
    recentPayments,
  };
}
