import { eq, and, sql, gte, lte, desc, asc } from "drizzle-orm";
import { db } from "../database/connection.js";
import {
  payments,
  refunds,
  reservations,
  reservationTravellers,
  enquiries,
  departures,
  travelOffers,
  customers,
} from "../database/schema.js";
import type {
  FinancialReportFilterInput,
  OperationalReportFilterInput,
  ExportCsvFilterInput,
} from "@travel-agency/shared";

export async function getFinancialReport(filter: FinancialReportFilterInput) {
  const paymentConditions = [eq(payments.isReversed, false)];
  const refundConditions: any[] = [];
  const reservationConditions = [sql`${reservations.currentStatus} != 'cancelled'`];

  if (filter.startDate) {
    const start = new Date(filter.startDate);
    paymentConditions.push(gte(payments.paymentDate, start));
    refundConditions.push(gte(refunds.refundDate, start));
    reservationConditions.push(gte(reservations.createdAt, start));
  }

  if (filter.endDate) {
    const end = new Date(filter.endDate);
    paymentConditions.push(lte(payments.paymentDate, end));
    refundConditions.push(lte(refunds.refundDate, end));
    reservationConditions.push(lte(reservations.createdAt, end));
  }

  // 1. Payments by Method
  const methodBreakdown = await db
    .select({
      method: payments.method,
      count: sql<number>`count(*)::int`,
      totalCentimes: sql<number>`coalesce(sum(${payments.amountCentimes}), 0)::bigint`,
    })
    .from(payments)
    .where(and(...paymentConditions))
    .groupBy(payments.method);

  // 2. Total Cash Received
  const [totalPaymentsRes] = await db
    .select({
      totalCentimes: sql<number>`coalesce(sum(${payments.amountCentimes}), 0)::bigint`,
      count: sql<number>`count(*)::int`,
    })
    .from(payments)
    .where(and(...paymentConditions));

  // 3. Total Refunds
  const [totalRefundsRes] = await db
    .select({
      totalCentimes: sql<number>`coalesce(sum(${refunds.amountCentimes}), 0)::bigint`,
      count: sql<number>`count(*)::int`,
    })
    .from(refunds)
    .where(refundConditions.length > 0 ? and(...refundConditions) : undefined);

  // 4. Booked Sales in Period
  const [totalBookedSalesRes] = await db
    .select({
      totalCentimes: sql<number>`coalesce(sum(${reservations.agreedTotalCentimes}), 0)::bigint`,
      count: sql<number>`count(*)::int`,
    })
    .from(reservations)
    .where(and(...reservationConditions));

  const grossCashCentimes = Number(totalPaymentsRes?.totalCentimes || 0);
  const totalRefundsCentimes = Number(totalRefundsRes?.totalCentimes || 0);
  const netCashReceivedCentimes = Math.max(0, grossCashCentimes - totalRefundsCentimes);
  const bookedSalesCentimes = Number(totalBookedSalesRes?.totalCentimes || 0);
  const outstandingBalanceCentimes = Math.max(0, bookedSalesCentimes - netCashReceivedCentimes);

  // 5. Monthly breakdown
  const monthlyTrend = await db
    .select({
      month: sql<string>`to_char(${payments.paymentDate}, 'YYYY-MM')`,
      cashCentimes: sql<number>`coalesce(sum(${payments.amountCentimes}), 0)::bigint`,
      count: sql<number>`count(*)::int`,
    })
    .from(payments)
    .where(and(...paymentConditions))
    .groupBy(sql`to_char(${payments.paymentDate}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${payments.paymentDate}, 'YYYY-MM') ASC`);

  return {
    period: {
      startDate: filter.startDate || null,
      endDate: filter.endDate || null,
    },
    summary: {
      grossCashCentimes,
      totalRefundsCentimes,
      refundCount: totalRefundsRes?.count || 0,
      netCashReceivedCentimes,
      bookedSalesCentimes,
      bookedSalesCount: totalBookedSalesRes?.count || 0,
      outstandingBalanceCentimes,
      currency: "DZD",
    },
    methodBreakdown: methodBreakdown.map((m) => ({
      method: m.method,
      count: m.count,
      totalCentimes: Number(m.totalCentimes),
    })),
    monthlyTrend: monthlyTrend.map((t) => ({
      month: t.month,
      cashCentimes: Number(t.cashCentimes),
      count: t.count,
    })),
  };
}

export async function getOperationalReport(filter: OperationalReportFilterInput) {
  const depConditions: any[] = [];
  const enqConditions: any[] = [];
  const resConditions: any[] = [];

  if (filter.startDate) {
    const start = new Date(filter.startDate);
    depConditions.push(gte(departures.departureDate, start));
    enqConditions.push(gte(enquiries.createdAt, start));
    resConditions.push(gte(reservations.createdAt, start));
  }

  if (filter.endDate) {
    const end = new Date(filter.endDate);
    depConditions.push(lte(departures.departureDate, end));
    enqConditions.push(lte(enquiries.createdAt, end));
    resConditions.push(lte(reservations.createdAt, end));
  }

  // 1. Departures & Occupancy
  const departureStats = await db
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
      occupancyPercent: sql<number>`round((${departures.bookedPlaces}::decimal / nullif(${departures.maxCapacity}, 0)) * 100)::int`,
    })
    .from(departures)
    .innerJoin(travelOffers, eq(departures.offerId, travelOffers.id))
    .where(depConditions.length > 0 ? and(...depConditions) : undefined)
    .orderBy(asc(departures.departureDate))
    .limit(50);

  // 2. Enquiry Conversion Funnel
  const [enqStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      converted: sql<number>`count(*) filter (where ${enquiries.status} = 'converted')::int`,
      rejected: sql<number>`count(*) filter (where ${enquiries.status} = 'rejected')::int`,
      newCount: sql<number>`count(*) filter (where ${enquiries.status} = 'new')::int`,
      inProgress: sql<number>`count(*) filter (where ${enquiries.status} in ('contacted', 'waiting_customer'))::int`,
      closed: sql<number>`count(*) filter (where ${enquiries.status} = 'closed')::int`,
    })
    .from(enquiries)
    .where(enqConditions.length > 0 ? and(...enqConditions) : undefined);

  const totalEnquiries = enqStats?.total || 0;
  const convertedEnquiries = enqStats?.converted || 0;
  const conversionRatePercent =
    totalEnquiries > 0 ? Math.round((convertedEnquiries / totalEnquiries) * 100) : 0;

  // 3. Reservations by Status
  const reservationsByStatus = await db
    .select({
      status: reservations.currentStatus,
      count: sql<number>`count(*)::int`,
      totalCentimes: sql<number>`coalesce(sum(${reservations.agreedTotalCentimes}), 0)::bigint`,
    })
    .from(reservations)
    .where(resConditions.length > 0 ? and(...resConditions) : undefined)
    .groupBy(reservations.currentStatus);

  return {
    period: {
      startDate: filter.startDate || null,
      endDate: filter.endDate || null,
    },
    departures: departureStats,
    enquiriesFunnel: {
      total: totalEnquiries,
      converted: convertedEnquiries,
      rejected: enqStats?.rejected || 0,
      newCount: enqStats?.newCount || 0,
      inProgress: enqStats?.inProgress || 0,
      closed: enqStats?.closed || 0,
      conversionRatePercent,
    },
    reservationsByStatus: reservationsByStatus.map((r) => ({
      status: r.status,
      count: r.count,
      totalCentimes: Number(r.totalCentimes),
    })),
  };
}

function escapeCsvField(field: any): string {
  if (field === null || field === undefined) return "";
  const str = String(field);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function generateCsvExport(filter: ExportCsvFilterInput): Promise<string> {
  const BOM = "\uFEFF"; // UTF-8 Byte Order Mark for Excel Arabic & French support
  let headers: string[] = [];
  let rows: string[][] = [];

  if (filter.type === "reservations") {
    headers = [
      "Référence",
      "Client",
      "Téléphone",
      "Offre",
      "Passagers",
      "Montant Total (DA)",
      "Remise (DA)",
      "Statut",
      "Date Création",
    ];

    const conditions = [];
    if (filter.startDate) conditions.push(gte(reservations.createdAt, new Date(filter.startDate)));
    if (filter.endDate) conditions.push(lte(reservations.createdAt, new Date(filter.endDate)));

    const resList = await db
      .select({
        reference: reservations.reference,
        customerName: customers.fullName,
        customerPhone: customers.phone,
        offerTitle: travelOffers.title,
        passengerCount: reservations.passengerCount,
        agreedTotalCentimes: reservations.agreedTotalCentimes,
        discountCentimes: reservations.discountCentimes,
        currentStatus: reservations.currentStatus,
        createdAt: reservations.createdAt,
      })
      .from(reservations)
      .leftJoin(customers, eq(reservations.customerId, customers.id))
      .leftJoin(travelOffers, eq(reservations.offerId, travelOffers.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(reservations.createdAt));

    rows = resList.map((r) => [
      r.reference,
      r.customerName || "",
      r.customerPhone || "",
      (r.offerTitle as any)?.fr || (r.offerTitle as any)?.ar || "",
      String(r.passengerCount),
      (Number(r.agreedTotalCentimes) / 100).toFixed(2),
      (Number(r.discountCentimes) / 100).toFixed(2),
      r.currentStatus,
      r.createdAt ? new Date(r.createdAt).toISOString() : "",
    ]);
  } else if (filter.type === "payments") {
    headers = [
      "Reçu N°",
      "Réf Réservation",
      "Client",
      "Montant (DA)",
      "Méthode",
      "N° Pièce/Bordereau",
      "Annulé",
      "Date Paiement",
    ];

    const conditions = [];
    if (filter.startDate) conditions.push(gte(payments.paymentDate, new Date(filter.startDate)));
    if (filter.endDate) conditions.push(lte(payments.paymentDate, new Date(filter.endDate)));

    const payList = await db
      .select({
        receiptNumber: payments.receiptNumber,
        reservationRef: reservations.reference,
        customerName: customers.fullName,
        amountCentimes: payments.amountCentimes,
        method: payments.method,
        referenceOrSlipNumber: payments.referenceOrSlipNumber,
        isReversed: payments.isReversed,
        paymentDate: payments.paymentDate,
      })
      .from(payments)
      .leftJoin(reservations, eq(payments.reservationId, reservations.id))
      .leftJoin(customers, eq(reservations.customerId, customers.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(payments.paymentDate));

    rows = payList.map((p) => [
      p.receiptNumber,
      p.reservationRef || "",
      p.customerName || "",
      (Number(p.amountCentimes) / 100).toFixed(2),
      p.method,
      p.referenceOrSlipNumber || "",
      p.isReversed ? "OUI" : "NON",
      p.paymentDate ? new Date(p.paymentDate).toISOString() : "",
    ]);
  } else if (filter.type === "enquiries") {
    headers = [
      "Demande N°",
      "Contact",
      "Téléphone",
      "Email",
      "Offre",
      "Voyageurs",
      "Statut",
      "Source",
      "Date Demande",
    ];

    const conditions = [];
    if (filter.startDate) conditions.push(gte(enquiries.createdAt, new Date(filter.startDate)));
    if (filter.endDate) conditions.push(lte(enquiries.createdAt, new Date(filter.endDate)));

    const enqList = await db
      .select({
        enquiryNumber: enquiries.enquiryNumber,
        contactName: enquiries.contactName,
        contactPhone: enquiries.contactPhone,
        contactEmail: enquiries.contactEmail,
        offerTitle: travelOffers.title,
        travellersCount: enquiries.travellersCount,
        status: enquiries.status,
        source: enquiries.source,
        createdAt: enquiries.createdAt,
      })
      .from(enquiries)
      .leftJoin(travelOffers, eq(enquiries.offerId, travelOffers.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(enquiries.createdAt));

    rows = enqList.map((e) => [
      e.enquiryNumber,
      e.contactName,
      e.contactPhone,
      e.contactEmail || "",
      (e.offerTitle as any)?.fr || (e.offerTitle as any)?.ar || "",
      String(e.travellersCount),
      e.status,
      e.source,
      e.createdAt ? new Date(e.createdAt).toISOString() : "",
    ]);
  } else if (filter.type === "passengers") {
    headers = [
      "Réf Réservation",
      "Offre",
      "Date Départ",
      "Nom Complet",
      "Date Naissance",
      "Type Chambre",
      "Contact Principal",
    ];

    const conditions = [];
    if (filter.startDate) conditions.push(gte(departures.departureDate, new Date(filter.startDate)));
    if (filter.endDate) conditions.push(lte(departures.departureDate, new Date(filter.endDate)));

    const paxList = await db
      .select({
        reservationRef: reservations.reference,
        offerTitle: travelOffers.title,
        departureDate: departures.departureDate,
        fullName: reservationTravellers.fullName,
        dateOfBirth: reservationTravellers.dateOfBirth,
        roomAllocation: reservationTravellers.roomAllocation,
        isPrimaryContact: reservationTravellers.isPrimaryContact,
      })
      .from(reservationTravellers)
      .innerJoin(reservations, eq(reservationTravellers.reservationId, reservations.id))
      .leftJoin(travelOffers, eq(reservations.offerId, travelOffers.id))
      .leftJoin(departures, eq(reservations.departureId, departures.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(departures.departureDate));

    rows = paxList.map((p) => [
      p.reservationRef,
      (p.offerTitle as any)?.fr || (p.offerTitle as any)?.ar || "",
      p.departureDate ? new Date(p.departureDate).toISOString().split("T")[0] : "",
      p.fullName,
      p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().split("T")[0] : "",
      p.roomAllocation || "",
      p.isPrimaryContact ? "OUI" : "NON",
    ]);
  }

  const csvLines = [
    headers.map(escapeCsvField).join(","),
    ...rows.map((row) => row.map(escapeCsvField).join(",")),
  ];

  return BOM + csvLines.join("\r\n");
}
