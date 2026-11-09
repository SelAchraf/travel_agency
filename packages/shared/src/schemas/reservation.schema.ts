import { z } from "zod";
import { RESERVATION_STATUSES } from "../constants/statuses.js";

export const createReservationSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  offerId: z.string().min(1, "Offer ID is required"),
  departureId: z.string().optional(),
  enquiryId: z.string().optional(),
  passengerCount: z.coerce.number().int().min(1, "Passenger count must be at least 1"),
  discountCentimes: z.coerce
    .number()
    .int("Discount must be an integer (centimes)")
    .min(0)
    .default(0),
  travellers: z
    .array(
      z.object({
        fullName: z.string().min(2, "Traveller name is required"),
        isPrimaryContact: z.boolean().default(false),
        passportNumber: z.string().optional(),
      }),
    )
    .default([]),
  specialRequirements: z.string().max(1000).optional(),
  managerOverride: z
    .object({
      reason: z.string().min(5, "Override reason must be stated"),
    })
    .optional(),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;

export const updateReservationStatusSchema = z.object({
  status: z.enum(RESERVATION_STATUSES),
  reason: z.string().max(500).optional(),
});

export type UpdateReservationStatusInput = z.infer<typeof updateReservationStatusSchema>;

export const applyDiscountSchema = z.object({
  discountCentimes: z.coerce.number().int().min(1, "Discount must be at least 1 centime"),
  reason: z.string().min(5, "Discount reason is mandatory"),
});

export type ApplyDiscountInput = z.infer<typeof applyDiscountSchema>;
