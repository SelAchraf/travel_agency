import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "../database/connection.js";
import { destinations } from "../database/schema.js";
import { createAuditEntry } from "./audit.service.js";
import { AppError } from "../middleware/errorHandler.js";
import type { DestinationInput } from "@travel-agency/shared";

export type UpdateDestinationInput = Partial<{ [K in keyof DestinationInput]: DestinationInput[K] | undefined }>;

export interface ListDestinationsParams {
  category?: string | undefined;
  isPublished?: boolean | undefined;
  search?: string | undefined;
  featuredOnly?: boolean | undefined;
}

export async function listDestinations(params: ListDestinationsParams = {}) {
  const conditions = [];

  if (params.category) {
    conditions.push(eq(destinations.category, params.category));
  }
  if (params.isPublished !== undefined) {
    conditions.push(eq(destinations.isPublished, params.isPublished));
  }
  if (params.featuredOnly) {
    conditions.push(eq(destinations.isFeatured, true));
  }
  if (params.search) {
    const pattern = `%${params.search}%`;
    conditions.push(
      sql`(${destinations.name}->>'fr' ILIKE ${pattern} OR ${destinations.name}->>'ar' ILIKE ${pattern} OR ${destinations.wilayaOrCountry} ILIKE ${pattern})`
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(destinations)
    .where(whereClause)
    .orderBy(desc(destinations.isFeatured), desc(destinations.createdAt));
}

export async function getDestinationBySlug(slug: string) {
  const [dest] = await db
    .select()
    .from(destinations)
    .where(eq(destinations.slug, slug))
    .limit(1);

  if (!dest) {
    throw new AppError(404, "Destination introuvable / Destination not found");
  }

  return dest;
}

export async function getDestinationById(id: string) {
  const [dest] = await db
    .select()
    .from(destinations)
    .where(eq(destinations.id, id))
    .limit(1);

  if (!dest) {
    throw new AppError(404, "Destination introuvable / Destination not found");
  }

  return dest;
}

export async function createDestination(
  input: DestinationInput,
  user: { id: string; email: string },
  ipAddress = "127.0.0.1",
  userAgent = "api"
) {
  // Check slug uniqueness
  const [existing] = await db
    .select({ id: destinations.id })
    .from(destinations)
    .where(eq(destinations.slug, input.slug))
    .limit(1);

  if (existing) {
    throw new AppError(409, "Une destination avec ce slug existe déjà / Destination slug already exists");
  }

  const [created] = await db
    .insert(destinations)
    .values({
      slug: input.slug,
      name: input.name,
      category: input.category,
      wilayaOrCountry: input.wilayaOrCountry,
      description: input.description,
      coverImageUrl: input.coverImageUrl,
      galleryImages: input.galleryImages || [],
      isFeatured: input.isFeatured ?? false,
      isPublished: input.isPublished ?? true,
    })
    .returning();

  if (!created) {
    throw new AppError(500, "Échec de création de la destination / Failed to create destination");
  }

  await createAuditEntry({
    userId: user.id,
    userEmail: user.email,
    action: "DESTINATION_CREATE",
    entityType: "Destination",
    entityId: created.id,
    ipAddress,
    userAgent,
    diffSummary: { slug: created.slug, name: created.name },
  });

  return created;
}

export async function updateDestination(
  id: string,
  input: UpdateDestinationInput,
  user: { id: string; email: string },
  ipAddress = "127.0.0.1",
  userAgent = "api"
) {
  const [dest] = await db.select().from(destinations).where(eq(destinations.id, id)).limit(1);
  if (!dest) {
    throw new AppError(404, "Destination introuvable / Destination not found");
  }

  if (input.slug && input.slug !== dest.slug) {
    const [existing] = await db
      .select({ id: destinations.id })
      .from(destinations)
      .where(eq(destinations.slug, input.slug))
      .limit(1);
    if (existing) {
      throw new AppError(409, "Slug déjà utilisé / Slug already in use");
    }
  }

  const [updated] = await db
    .update(destinations)
    .set({
      ...(input.slug ? { slug: input.slug } : {}),
      ...(input.name ? { name: input.name } : {}),
      ...(input.category ? { category: input.category } : {}),
      ...(input.wilayaOrCountry ? { wilayaOrCountry: input.wilayaOrCountry } : {}),
      ...(input.description ? { description: input.description } : {}),
      ...(input.coverImageUrl ? { coverImageUrl: input.coverImageUrl } : {}),
      ...(input.galleryImages ? { galleryImages: input.galleryImages } : {}),
      ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
      ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
    })
    .where(eq(destinations.id, id))
    .returning();

  await createAuditEntry({
    userId: user.id,
    userEmail: user.email,
    action: "DESTINATION_UPDATE",
    entityType: "Destination",
    entityId: id,
    ipAddress,
    userAgent,
    diffSummary: { updatedFields: Object.keys(input) },
  });

  return updated;
}
