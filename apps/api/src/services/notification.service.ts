import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import { db } from "../database/connection.js";
import {
  notifications,
  reservations,
  departures,
  customers,
  travelOffers,
  payments,
} from "../database/schema.js";
import type { CreateNotificationInput } from "@travel-agency/shared";

export function formatAlgerianPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    return `213${digits.substring(1)}`;
  }
  if (digits.startsWith("213")) {
    return digits;
  }
  return `213${digits}`;
}

export function generateWhatsAppDeepLink(phone: string, message: string): string {
  const intlNumber = formatAlgerianPhoneForWhatsApp(phone);
  return `https://wa.me/${intlNumber}?text=${encodeURIComponent(message)}`;
}

export async function createNotification(input: CreateNotificationInput) {
  const [created] = await db
    .insert(notifications)
    .values({
      type: input.type,
      channel: input.channel || "in_app",
      recipientType: input.recipientType,
      recipientId: input.recipientId || null,
      recipientContact: input.recipientContact || null,
      title: input.title,
      message: input.message,
      data: input.data || null,
      status: "pending",
    })
    .returning();

  return created;
}

export async function listStaffNotifications(status?: string, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const conditions = [eq(notifications.recipientType, "staff")];

  if (status) {
    conditions.push(eq(notifications.status, status));
  }

  const [countRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(...conditions));

  const total = countRes?.count || 0;

  const notifs = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    notifications: notifs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function markNotificationRead(id: string) {
  const [updated] = await db
    .update(notifications)
    .set({
      status: "read",
      readAt: new Date(),
    })
    .where(eq(notifications.id, id))
    .returning();

  return updated;
}

export async function generateSystemAlerts() {
  const now = new Date();
  const fourteenDaysLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const generatedAlerts: any[] = [];

  // 1. Due Balance Alerts (Confirmed bookings within 14 days of departure with balance > 0)
  const activeBookings = await db
    .select({
      id: reservations.id,
      reference: reservations.reference,
      customerId: reservations.customerId,
      customerName: customers.fullName,
      customerPhone: customers.phone,
      agreedTotalCentimes: reservations.agreedTotalCentimes,
      departureDate: departures.departureDate,
    })
    .from(reservations)
    .innerJoin(customers, eq(reservations.customerId, customers.id))
    .leftJoin(departures, eq(reservations.departureId, departures.id))
    .where(
      and(
        sql`${reservations.currentStatus} in ('confirmed', 'awaiting_payment')`,
        gte(departures.departureDate, now),
        lte(departures.departureDate, fourteenDaysLater)
      )
    );

  for (const b of activeBookings) {
    // Check payments
    const [paySum] = await db
      .select({
        total: sql<number>`coalesce(sum(${payments.amountCentimes}) filter (where not ${payments.isReversed}), 0)::bigint`,
      })
      .from(payments)
      .where(eq(payments.reservationId, b.id));

    const paid = Number(paySum?.total || 0);
    const balance = Number(b.agreedTotalCentimes) - paid;

    if (balance > 0) {
      const title = `Relance solde : Dossier ${b.reference}`;
      const msg = `Le dossier ${b.reference} (${b.customerName}) a un solde restant de ${(balance / 100).toFixed(0)} DA pour un départ le ${new Date(b.departureDate!).toLocaleDateString("fr-DZ")}.`;

      // Check if alert already created recently
      const [existing] = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.type, "payment_due"),
            sql`${notifications.data}->>'reservationId' = ${b.id}`
          )
        )
        .limit(1);

      if (!existing) {
        const notif = await createNotification({
          type: "payment_due",
          channel: "in_app",
          recipientType: "staff",
          title,
          message: msg,
          data: {
            reservationId: b.id,
            customerId: b.customerId,
            customerPhone: b.customerPhone,
            balanceCentimes: balance,
            whatsappLink: generateWhatsAppDeepLink(
              b.customerPhone,
              `Bonjour ${b.customerName}, votre agence Numidia Voyages vous rappelle le solde restant de ${(balance / 100).toFixed(0)} DA pour votre voyage ${b.reference}.`
            ),
          },
        });
        generatedAlerts.push(notif);
      }
    }
  }

  // 2. Missing Documents Alerts
  const awaitingDocs = await db
    .select({
      id: reservations.id,
      reference: reservations.reference,
      customerId: reservations.customerId,
      customerName: customers.fullName,
      customerPhone: customers.phone,
    })
    .from(reservations)
    .innerJoin(customers, eq(reservations.customerId, customers.id))
    .where(eq(reservations.currentStatus, "awaiting_documents"));

  for (const docRes of awaitingDocs) {
    const [existing] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.type, "missing_documents"),
          sql`${notifications.data}->>'reservationId' = ${docRes.id}`
        )
      )
      .limit(1);

    if (!existing) {
      const notif = await createNotification({
        type: "missing_documents",
        channel: "in_app",
        recipientType: "staff",
        title: `Documents manquants : ${docRes.reference}`,
        message: `Le dossier ${docRes.reference} (${docRes.customerName}) est en attente de pièces d'identité ou visas.`,
        data: {
          reservationId: docRes.id,
          customerPhone: docRes.customerPhone,
          whatsappLink: generateWhatsAppDeepLink(
            docRes.customerPhone,
            `Bonjour ${docRes.customerName}, merci de nous transmettre vos pièces d'identité pour votre dossier ${docRes.reference}.`
          ),
        },
      });
      generatedAlerts.push(notif);
    }
  }

  // 3. Departures Nearing Capacity (>= 90%)
  const nearingFull = await db
    .select({
      id: departures.id,
      maxCapacity: departures.maxCapacity,
      bookedPlaces: departures.bookedPlaces,
      departureDate: departures.departureDate,
      offerTitle: travelOffers.title,
    })
    .from(departures)
    .innerJoin(travelOffers, eq(departures.offerId, travelOffers.id))
    .where(
      and(
        gte(departures.departureDate, now),
        sql`${departures.bookedPlaces}::decimal / nullif(${departures.maxCapacity}, 0) >= 0.9`
      )
    );

  for (const dep of nearingFull) {
    const [existing] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.type, "capacity_alert"),
          sql`${notifications.data}->>'departureId' = ${dep.id}`
        )
      )
      .limit(1);

    if (!existing) {
      const notif = await createNotification({
        type: "capacity_alert",
        channel: "in_app",
        recipientType: "staff",
        title: `Alerte capacité : Départ ${(dep.offerTitle as any)?.fr || ""}`,
        message: `Le départ du ${new Date(dep.departureDate).toLocaleDateString("fr-DZ")} a atteint ${dep.bookedPlaces}/${dep.maxCapacity} places.`,
        data: { departureId: dep.id },
      });
      generatedAlerts.push(notif);
    }
  }

  return {
    scannedAt: new Date().toISOString(),
    alertsGenerated: generatedAlerts.length,
    alerts: generatedAlerts,
  };
}
