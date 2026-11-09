import { desc, eq, and, gte, lte, sql } from "drizzle-orm";
import { db } from "../database/connection.js";
import { auditLogs } from "../database/schema.js";
import { logger } from "../utils/logger.js";

export interface CreateAuditEntryInput {
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  ipAddress: string;
  userAgent: string;
  diffSummary?: Record<string, any> | null;
}

export interface GetAuditLogsParams {
  page?: number | undefined;
  limit?: number | undefined;
  userId?: string | undefined;
  action?: string | undefined;
  entityType?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
}

/**
 * Append-only AuditLog creation.
 * Writes immutable security event to PostgreSQL audit_logs table and structured logger.
 */
export async function createAuditEntry(input: CreateAuditEntryInput): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: input.userId || null,
      userEmail: input.userEmail || null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId || null,
      ipAddress: input.ipAddress || "unknown",
      userAgent: input.userAgent || "unknown",
      diffSummary: input.diffSummary || null,
    });

    logger.info({
      auditAction: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      userId: input.userId,
      userEmail: input.userEmail,
      ip: input.ipAddress,
    }, `Audit event recorded: ${input.action}`);
  } catch (err) {
    logger.error({ err, input }, "Failed to write audit log entry");
    // We log but never swallow fatal DB errors if needed; audit logs must be reliable
  }
}

/**
 * Retrieve paginated audit logs with search filters.
 */
export async function getAuditLogs(params: GetAuditLogsParams) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const offset = (page - 1) * limit;

  const conditions = [];

  if (params.userId) {
    conditions.push(eq(auditLogs.userId, params.userId));
  }
  if (params.action) {
    conditions.push(eq(auditLogs.action, params.action));
  }
  if (params.entityType) {
    conditions.push(eq(auditLogs.entityType, params.entityType));
  }
  if (params.startDate) {
    conditions.push(gte(auditLogs.timestamp, new Date(params.startDate)));
  }
  if (params.endDate) {
    conditions.push(lte(auditLogs.timestamp, new Date(params.endDate)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(whereClause);

  const total = countResult?.count || 0;

  const logs = await db
    .select()
    .from(auditLogs)
    .where(whereClause)
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit)
    .offset(offset);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
