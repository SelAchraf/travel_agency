import { z } from "zod";
import { DOCUMENT_TYPES } from "../constants/statuses.js";

export const uploadDocumentMetadataSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES),
  customerId: z.string().uuid().optional(),
  reservationId: z.string().uuid().optional(),
  travellerId: z.string().uuid().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().max(500).optional(),
  isPrivate: z.coerce.boolean().optional().default(true),
});

export type UploadDocumentMetadataInput = z.infer<typeof uploadDocumentMetadataSchema>;

export const documentFilterSchema = z.object({
  customerId: z.string().uuid().optional(),
  reservationId: z.string().uuid().optional(),
  documentType: z.enum(DOCUMENT_TYPES).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type DocumentFilterInput = z.infer<typeof documentFilterSchema>;

