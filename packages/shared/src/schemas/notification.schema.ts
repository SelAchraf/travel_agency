import { z } from "zod";

export const NOTIFICATION_TYPES = [
  "payment_due",
  "departure_reminder",
  "missing_documents",
  "new_enquiry",
  "customer_message",
  "capacity_alert",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const createNotificationSchema = z.object({
  type: z.enum(NOTIFICATION_TYPES),
  channel: z.enum(["in_app", "email", "whatsapp"]).default("in_app"),
  recipientType: z.enum(["staff", "customer"]),
  recipientId: z.string().uuid().optional(),
  recipientContact: z.string().max(255).optional(),
  title: z.string().min(2).max(255),
  message: z.string().min(2),
  data: z.record(z.string(), z.any()).optional(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
