import { z } from "zod";
import { TRIP_TYPES, PRICING_BASIS, AVAILABILITY_STATUSES } from "../constants/statuses.js";

export const destinationSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
  name: z.object({
    ar: z.string().min(2, "Arabic name is required"),
    fr: z.string().min(2, "French name is required"),
  }),
  category: z.enum(["domestic", "international", "religious"]),
  wilayaOrCountry: z.string().min(2, "Wilaya or country is required"),
  description: z.object({
    ar: z.string().min(5, "Arabic description is required"),
    fr: z.string().min(5, "French description is required"),
  }),
  coverImageUrl: z.string().min(1, "Cover image is required"),
  galleryImages: z.array(z.string()).default([]),
  isFeatured: z.boolean().default(false),
  isPublished: z.boolean().default(true),
});

export type DestinationInput = z.infer<typeof destinationSchema>;

export const travelOfferSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
  title: z.object({
    ar: z.string().min(2, "Arabic title is required"),
    fr: z.string().min(2, "French title is required"),
  }),
  destinationId: z.string().min(1, "Destination is required"),
  tripType: z.enum(TRIP_TYPES),
  durationDays: z.coerce.number().int().min(1),
  durationNights: z.coerce.number().int().min(0),
  basePriceCentimes: z.coerce
    .number()
    .int("Price must be an integer (centimes)")
    .min(0, "Price must be non-negative"),
  currency: z.literal("DZD").default("DZD"),
  pricingBasis: z.enum(PRICING_BASIS).default("per_person"),
  availabilityStatus: z.enum(AVAILABILITY_STATUSES).default("available"),
  hotelDetails: z.object({
    ar: z.string().default(""),
    fr: z.string().default(""),
  }),
  transportDetails: z.object({
    ar: z.string().default(""),
    fr: z.string().default(""),
  }),
  itinerary: z.array(
    z.object({
      dayNumber: z.number().int().min(1),
      title: z.object({ ar: z.string(), fr: z.string() }),
      description: z.object({ ar: z.string(), fr: z.string() }),
    }),
  ),
  inclusions: z.object({
    ar: z.array(z.string()),
    fr: z.array(z.string()),
  }),
  exclusions: z.object({
    ar: z.array(z.string()),
    fr: z.array(z.string()),
  }),
  photos: z.array(
    z.object({
      url: z.string().url(),
      caption: z.object({ ar: z.string(), fr: z.string() }).optional(),
      isCover: z.boolean().default(false),
    }),
  ),
  isPublished: z.boolean().default(false),
});

export type TravelOfferInput = z.infer<typeof travelOfferSchema>;

export const departureSchema = z.object({
  offerId: z.string(),
  departureDate: z.string(),
  returnDate: z.string(),
  maxCapacity: z.coerce.number().int().min(1, "Max capacity must be at least 1"),
});

export type DepartureInput = z.infer<typeof departureSchema>;

export const departureStatusSchema = z.object({
  status: z.enum(["open", "closed", "completed", "cancelled"]),
});

export type DepartureStatusInput = z.infer<typeof departureStatusSchema>;

export const overrideDepartureCapacitySchema = z.object({
  extraPlaces: z.coerce.number().int().min(1, "Extra places must be positive"),
  reason: z.string().min(3, "Reason for override is required"),
});

export type OverrideDepartureCapacityInput = z.infer<typeof overrideDepartureCapacitySchema>;

