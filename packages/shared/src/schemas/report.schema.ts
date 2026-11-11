import { z } from "zod";

export const financialReportFilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type FinancialReportFilterInput = z.infer<typeof financialReportFilterSchema>;

export const operationalReportFilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type OperationalReportFilterInput = z.infer<typeof operationalReportFilterSchema>;

export const exportCsvFilterSchema = z.object({
  type: z.enum(["reservations", "payments", "enquiries", "passengers"]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type ExportCsvFilterInput = z.infer<typeof exportCsvFilterSchema>;

