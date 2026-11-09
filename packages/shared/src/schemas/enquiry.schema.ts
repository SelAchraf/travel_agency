import { z } from "zod";
import { isValidAlgerianPhone } from "../utils/phone.js";

export const publicEnquirySchema = z.object({
  contactName: z.string().min(2, "Name must be at least 2 characters").trim(),
  contactPhone: z
    .string()
    .min(9, "Phone number is required")
    .refine((val) => isValidAlgerianPhone(val), {
      message: "Please enter a valid Algerian phone number (e.g. 0550123456 or +213550123456)",
    }),
  contactEmail: z.string().email("Invalid email").toLowerCase().trim().optional().or(z.literal("")),
  offerId: z.string().optional(),
  departureDatePreferred: z.string().optional(),
  travellersCount: z.coerce.number().int().min(1).max(50).default(1),
  message: z.string().min(5, "Message must be at least 5 characters").max(2000).trim(),
  privacyConsent: z.boolean().refine((val) => val === true, {
    message: "Consent to privacy policy is required",
  }),
  idempotencyKey: z.string().uuid("Invalid idempotency key").optional(),
  // Anti-bot honeypot field (must remain empty)
  websiteUrl_hp: z.string().max(0, "Bot submission detected").optional(),
});

export type PublicEnquiryInput = z.infer<typeof publicEnquirySchema>;

export const adminEnquirySchema = z.object({
  contactName: z.string().min(2).trim(),
  contactPhone: z.string().min(9).trim(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  offerId: z.string().optional(),
  departureDatePreferred: z.string().optional(),
  travellersCount: z.coerce.number().int().min(1).default(1),
  message: z.string().min(1).trim(),
  source: z.enum(["website_form", "whatsapp", "phone_call", "walk_in"]).default("phone_call"),
  assignedToUserId: z.string().optional(),
  followUpDate: z.string().optional(),
});

export type AdminEnquiryInput = z.infer<typeof adminEnquirySchema>;
