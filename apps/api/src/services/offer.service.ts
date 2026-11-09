import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { db } from "../database/connection.js";
import { travelOffers, destinations, departures } from "../database/schema.js";
import { createAuditEntry } from "./audit.service.js";
import { AppError } from "../middleware/errorHandler.js";
import type { TravelOfferInput, DepartureInput } from "@travel-agency/shared";

export type UpdateOfferInput = Partial<{ [K in keyof TravelOfferInput]: TravelOfferInput[K] | undefined }>;

export interface ListOffersParams {
  page?: number | undefined;
  limit?: number | undefined;
  destinationId?: string | undefined;
  destinationSlug?: string | undefined;
  tripType?: string | undefined;
  isPublished?: boolean | undefined;
  isArchived?: boolean | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  search?: string | undefined;
}

export async function listOffers(params: ListOffersParams = {}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const offset = (page - 1) * limit;

  const conditions = [];

  if (params.destinationId) {
    conditions.push(eq(travelOffers.destinationId, params.destinationId));
  }
  if (params.tripType) {
    conditions.push(eq(travelOffers.tripType, params.tripType));
  }
  if (params.isPublished !== undefined) {
    conditions.push(eq(travelOffers.isPublished, params.isPublished));
  }
  if (params.isArchived !== undefined) {
    conditions.push(eq(travelOffers.isArchived, params.isArchived));
  } else {
    // By default, exclude archived offers from regular listings unless explicitly requested
    conditions.push(eq(travelOffers.isArchived, false));
  }
  if (params.minPrice !== undefined) {
    conditions.push(gte(travelOffers.basePriceCentimes, params.minPrice));
  }
  if (params.maxPrice !== undefined) {
    conditions.push(lte(travelOffers.basePriceCentimes, params.maxPrice));
  }
  if (params.search) {
    const pattern = `%${params.search}%`;
    conditions.push(
      sql`(${travelOffers.title}->>'fr' ILIKE ${pattern} OR ${travelOffers.title}->>'ar' ILIKE ${pattern} OR ${travelOffers.slug} ILIKE ${pattern})`
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(travelOffers)
    .where(whereClause);

  const total = countResult?.count || 0;

  const offers = await db
    .select({
      id: travelOffers.id,
      slug: travelOffers.slug,
      title: travelOffers.title,
      tripType: travelOffers.tripType,
      durationDays: travelOffers.durationDays,
      durationNights: travelOffers.durationNights,
      basePriceCentimes: travelOffers.basePriceCentimes,
      currency: travelOffers.currency,
      pricingBasis: travelOffers.pricingBasis,
      availabilityStatus: travelOffers.availabilityStatus,
      photos: travelOffers.photos,
      isPublished: travelOffers.isPublished,
      isArchived: travelOffers.isArchived,
      createdAt: travelOffers.createdAt,
      destination: {
        id: destinations.id,
        slug: destinations.slug,
        name: destinations.name,
        category: destinations.category,
        wilayaOrCountry: destinations.wilayaOrCountry,
      },
    })
    .from(travelOffers)
    .innerJoin(destinations, eq(travelOffers.destinationId, destinations.id))
    .where(whereClause)
    .orderBy(desc(travelOffers.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    offers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getOfferBySlug(slug: string, publicOnly = false) {
  const conditions = [eq(travelOffers.slug, slug)];
  if (publicOnly) {
    conditions.push(eq(travelOffers.isPublished, true));
    conditions.push(eq(travelOffers.isArchived, false));
  }

  const [offer] = await db
    .select({
      id: travelOffers.id,
      slug: travelOffers.slug,
      title: travelOffers.title,
      destinationId: travelOffers.destinationId,
      tripType: travelOffers.tripType,
      durationDays: travelOffers.durationDays,
      durationNights: travelOffers.durationNights,
      basePriceCentimes: travelOffers.basePriceCentimes,
      currency: travelOffers.currency,
      pricingBasis: travelOffers.pricingBasis,
      availabilityStatus: travelOffers.availabilityStatus,
      hotelDetails: travelOffers.hotelDetails,
      transportDetails: travelOffers.transportDetails,
      itinerary: travelOffers.itinerary,
      inclusions: travelOffers.inclusions,
      exclusions: travelOffers.exclusions,
      photos: travelOffers.photos,
      brochureDocId: travelOffers.brochureDocId,
      isPublished: travelOffers.isPublished,
      isArchived: travelOffers.isArchived,
      createdAt: travelOffers.createdAt,
      destination: {
        id: destinations.id,
        slug: destinations.slug,
        name: destinations.name,
        category: destinations.category,
        wilayaOrCountry: destinations.wilayaOrCountry,
        coverImageUrl: destinations.coverImageUrl,
      },
    })
    .from(travelOffers)
    .innerJoin(destinations, eq(travelOffers.destinationId, destinations.id))
    .where(and(...conditions))
    .limit(1);

  if (!offer) {
    throw new AppError(404, "Offre de voyage introuvable / Travel offer not found");
  }

  // Load future departures
  const offerDepartures = await db
    .select()
    .from(departures)
    .where(eq(departures.offerId, offer.id))
    .orderBy(departures.departureDate);

  const mappedDepartures = offerDepartures.map((d) => ({
    ...d,
    availablePlaces: Math.max(0, d.maxCapacity - d.bookedPlaces),
  }));

  return {
    ...offer,
    departures: mappedDepartures,
  };
}

export async function getOfferById(id: string) {
  const [offer] = await db
    .select()
    .from(travelOffers)
    .where(eq(travelOffers.id, id))
    .limit(1);

  if (!offer) {
    throw new AppError(404, "Offre de voyage introuvable / Travel offer not found");
  }

  const offerDepartures = await db
    .select()
    .from(departures)
    .where(eq(departures.offerId, offer.id))
    .orderBy(departures.departureDate);

  return {
    ...offer,
    departures: offerDepartures,
  };
}

export async function createOffer(
  input: TravelOfferInput,
  user: { id: string; email: string },
  ipAddress = "127.0.0.1",
  userAgent = "api"
) {
  // 1. Verify destination exists
  const [dest] = await db
    .select({ id: destinations.id })
    .from(destinations)
    .where(eq(destinations.id, input.destinationId))
    .limit(1);

  if (!dest) {
    throw new AppError(400, "Destination spécifiée invalide / Invalid destination");
  }

  // 2. Check slug uniqueness
  const [existingSlug] = await db
    .select({ id: travelOffers.id })
    .from(travelOffers)
    .where(eq(travelOffers.slug, input.slug))
    .limit(1);

  if (existingSlug) {
    throw new AppError(409, "Une offre avec ce slug existe déjà / Offer slug already exists");
  }

  const [created] = await db
    .insert(travelOffers)
    .values({
      slug: input.slug,
      title: input.title,
      destinationId: input.destinationId,
      tripType: input.tripType,
      durationDays: input.durationDays,
      durationNights: input.durationNights,
      basePriceCentimes: input.basePriceCentimes,
      currency: "DZD",
      pricingBasis: input.pricingBasis || "per_person",
      availabilityStatus: input.availabilityStatus || "available",
      hotelDetails: input.hotelDetails,
      transportDetails: input.transportDetails,
      itinerary: input.itinerary,
      inclusions: input.inclusions,
      exclusions: input.exclusions,
      photos: input.photos || [],
      isPublished: input.isPublished ?? false,
      isArchived: false,
    })
    .returning();

  if (!created) {
    throw new AppError(500, "Échec de création de l'offre / Failed to create travel offer");
  }

  await createAuditEntry({
    userId: user.id,
    userEmail: user.email,
    action: "OFFER_CREATE",
    entityType: "TravelOffer",
    entityId: created.id,
    ipAddress,
    userAgent,
    diffSummary: { slug: created.slug, title: created.title, priceCentimes: created.basePriceCentimes },
  });

  return created;
}

export async function updateOffer(
  id: string,
  input: UpdateOfferInput,
  user: { id: string; email: string },
  ipAddress = "127.0.0.1",
  userAgent = "api"
) {
  const [existing] = await db.select().from(travelOffers).where(eq(travelOffers.id, id)).limit(1);
  if (!existing) {
    throw new AppError(404, "Offre introuvable / Travel offer not found");
  }

  if (input.slug && input.slug !== existing.slug) {
    const [slugMatch] = await db
      .select({ id: travelOffers.id })
      .from(travelOffers)
      .where(eq(travelOffers.slug, input.slug))
      .limit(1);
    if (slugMatch) {
      throw new AppError(409, "Slug déjà utilisé / Slug already in use");
    }
  }

  const [updated] = await db
    .update(travelOffers)
    .set({
      ...(input.slug ? { slug: input.slug } : {}),
      ...(input.title ? { title: input.title } : {}),
      ...(input.destinationId ? { destinationId: input.destinationId } : {}),
      ...(input.tripType ? { tripType: input.tripType } : {}),
      ...(input.durationDays !== undefined ? { durationDays: input.durationDays } : {}),
      ...(input.durationNights !== undefined ? { durationNights: input.durationNights } : {}),
      ...(input.basePriceCentimes !== undefined ? { basePriceCentimes: input.basePriceCentimes } : {}),
      ...(input.pricingBasis ? { pricingBasis: input.pricingBasis } : {}),
      ...(input.availabilityStatus ? { availabilityStatus: input.availabilityStatus } : {}),
      ...(input.hotelDetails ? { hotelDetails: input.hotelDetails } : {}),
      ...(input.transportDetails ? { transportDetails: input.transportDetails } : {}),
      ...(input.itinerary ? { itinerary: input.itinerary } : {}),
      ...(input.inclusions ? { inclusions: input.inclusions } : {}),
      ...(input.exclusions ? { exclusions: input.exclusions } : {}),
      ...(input.photos ? { photos: input.photos } : {}),
      ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
      updatedAt: new Date(),
    })
    .where(eq(travelOffers.id, id))
    .returning();

  await createAuditEntry({
    userId: user.id,
    userEmail: user.email,
    action: "OFFER_UPDATE",
    entityType: "TravelOffer",
    entityId: id,
    ipAddress,
    userAgent,
    diffSummary: { updatedFields: Object.keys(input) },
  });

  return updated;
}

export async function togglePublishOffer(
  id: string,
  isPublished: boolean,
  user: { id: string; email: string },
  ipAddress = "127.0.0.1",
  userAgent = "api"
) {
  const [updated] = await db
    .update(travelOffers)
    .set({ isPublished, updatedAt: new Date() })
    .where(eq(travelOffers.id, id))
    .returning();

  if (!updated) {
    throw new AppError(404, "Offre introuvable / Travel offer not found");
  }

  await createAuditEntry({
    userId: user.id,
    userEmail: user.email,
    action: isPublished ? "OFFER_PUBLISH" : "OFFER_UNPUBLISH",
    entityType: "TravelOffer",
    entityId: id,
    ipAddress,
    userAgent,
    diffSummary: { isPublished },
  });

  return updated;
}

export async function archiveOffer(
  id: string,
  user: { id: string; email: string },
  ipAddress = "127.0.0.1",
  userAgent = "api"
) {
  const [updated] = await db
    .update(travelOffers)
    .set({ isArchived: true, isPublished: false, updatedAt: new Date() })
    .where(eq(travelOffers.id, id))
    .returning();

  if (!updated) {
    throw new AppError(404, "Offre introuvable / Travel offer not found");
  }

  await createAuditEntry({
    userId: user.id,
    userEmail: user.email,
    action: "OFFER_ARCHIVE",
    entityType: "TravelOffer",
    entityId: id,
    ipAddress,
    userAgent,
  });

  return updated;
}

// Departures
export async function addDeparture(
  offerId: string,
  input: Omit<DepartureInput, "offerId">,
  user: { id: string; email: string },
  ipAddress = "127.0.0.1",
  userAgent = "api"
) {
  const [offer] = await db.select({ id: travelOffers.id }).from(travelOffers).where(eq(travelOffers.id, offerId)).limit(1);
  if (!offer) {
    throw new AppError(404, "Offre introuvable / Travel offer not found");
  }

  const [dep] = await db
    .insert(departures)
    .values({
      offerId,
      departureDate: new Date(input.departureDate),
      returnDate: new Date(input.returnDate),
      maxCapacity: input.maxCapacity,
      bookedPlaces: 0,
      waitingListCount: 0,
      status: "open",
    })
    .returning();

  if (!dep) {
    throw new AppError(500, "Échec de création du départ / Failed to create departure");
  }

  await createAuditEntry({
    userId: user.id,
    userEmail: user.email,
    action: "DEPARTURE_CREATE",
    entityType: "Departure",
    entityId: dep.id,
    ipAddress,
    userAgent,
    diffSummary: { offerId, maxCapacity: input.maxCapacity, departureDate: input.departureDate },
  });

  return dep;
}

export async function overrideDepartureCapacity(
  departureId: string,
  params: { extraPlaces: number; reason: string },
  user: { id: string; email: string },
  ipAddress = "127.0.0.1",
  userAgent = "api"
) {
  const [dep] = await db.select().from(departures).where(eq(departures.id, departureId)).limit(1);
  if (!dep) {
    throw new AppError(404, "Départ introuvable / Departure not found");
  }

  const overrides = dep.managerOverrides || [];
  const newOverride = {
    overriddenByUserId: user.id,
    extraPlaces: params.extraPlaces,
    reason: params.reason,
    timestamp: new Date().toISOString(),
  };

  const newCapacity = dep.maxCapacity + params.extraPlaces;

  const [updated] = await db
    .update(departures)
    .set({
      maxCapacity: newCapacity,
      managerOverrides: [...overrides, newOverride],
      updatedAt: new Date(),
    })
    .where(eq(departures.id, departureId))
    .returning();

  await createAuditEntry({
    userId: user.id,
    userEmail: user.email,
    action: "CAPACITY_OVERRIDE",
    entityType: "Departure",
    entityId: departureId,
    ipAddress,
    userAgent,
    diffSummary: {
      previousCapacity: dep.maxCapacity,
      newCapacity,
      extraPlaces: params.extraPlaces,
      reason: params.reason,
    },
  });

  return updated;
}
