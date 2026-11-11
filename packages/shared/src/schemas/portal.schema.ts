import { z } from "zod";

export const verifyPortalLinkSchema = z.object({
  token: z.string().min(10, "Invalid portal token"),
});

export type VerifyPortalLinkInput = z.infer<typeof verifyPortalLinkSchema>;

export const generatePortalLinkSchema = z.object({
  expiresInDays: z.coerce.number().int().min(1).max(90).optional().default(30),
});

export type GeneratePortalLinkInput = z.infer<typeof generatePortalLinkSchema>;

export const portalMessageSchema = z.object({
  subject: z.string().max(255).optional(),
  message: z.string().min(2, "Message cannot be empty").max(2000),
});

export type PortalMessageInput = z.infer<typeof portalMessageSchema>;

