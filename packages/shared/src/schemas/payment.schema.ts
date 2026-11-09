import { z } from "zod";
import { PAYMENT_METHODS } from "../constants/statuses.js";

export const recordPaymentSchema = z.object({
  amountCentimes: z.coerce
    .number()
    .int("Amount must be an integer (centimes)")
    .min(100, "Minimum payment is 1 DA (100 centimes)"),
  paymentDate: z.string().default(() => new Date().toISOString()),
  method: z.enum(PAYMENT_METHODS),
  referenceOrSlipNumber: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const refundPaymentSchema = z.object({
  paymentId: z.string().optional(),
  amountCentimes: z.coerce
    .number()
    .int("Refund amount must be an integer (centimes)")
    .min(100, "Minimum refund is 1 DA"),
  reason: z.string().min(5, "Refund reason is mandatory"),
  notes: z.string().max(500).optional(),
});

export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;

export const reversePaymentSchema = z.object({
  reversalReason: z.string().min(5, "Reversal reason is mandatory"),
});

export type ReversePaymentInput = z.infer<typeof reversePaymentSchema>;
