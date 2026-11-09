import { z } from "zod";

export const customerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").trim(),
  phone: z.string().min(9, "Phone number is required").trim(),
  email: z.string().email("Invalid email").toLowerCase().trim().optional().or(z.literal("")),
  wilayaCode: z.coerce.number().int().min(1).max(58).optional(),
  preferredLanguage: z.enum(["ar", "fr"]).default("fr"),
  internalNotes: z.string().max(2000).optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export const travellerSchema = z.object({
  customerId: z.string(),
  fullName: z.string().min(2).trim(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["M", "F"]).optional(),
  passportNumber: z.string().trim().optional(),
  passportExpiryDate: z.string().optional(),
  nationality: z.string().default("DZ"),
  specialRequirements: z.string().max(500).optional(),
});

export type TravellerInput = z.infer<typeof travellerSchema>;
