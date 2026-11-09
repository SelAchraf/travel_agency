import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../lib/api.js";
import { Card } from "../components/ui/Card.js";
import { Badge } from "../components/ui/Badge.js";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table.js";
import { Button } from "../components/ui/Button.js";
import { ShieldAlert, RefreshCw, ChevronLeft, ChevronRight, Globe, User, Clock } from "lucide-react";

interface AuditLog {
  id: string;
  timestamp: string;
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  ipAddress: string;
  userAgent: string;
  diffSummary?: Record<string, any> | null;
}

export function AuditLogsPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = async (targetPage = page) => {
    setLoading(true);
    try {
      const res = await apiClient<{
        success: boolean;
        logs: AuditLog[];
        pagination: { page: number; total: number; totalPages: number };
      }>("/admin/audit-logs", {
        params: {
          page: targetPage,
          limit: 15,
          action: actionFilter || undefined,
        },
      });

      if (res.success) {
        setLogs(res.logs);
        setPage(res.pagination.page);
        setTotalPages(res.pagination.totalPages);
        setTotal(res.pagination.total);
      }
    } catch (err) {
      console.error("Failed to load audit logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [actionFilter]);

  const getActionBadgeVariant = (action: string) => {
    if (action.includes("LOCKED") || action.includes("DEACTIVATE") || action.includes("REUSE")) {
      return "destructive";
    }
    if (action.includes("SUCCESS") || action.includes("REACTIVATE")) {
      return "mint";
    }
    if (action.includes("CREATE") || action.includes("UPDATE")) {
      return "saffron";
    }
    return "indigo";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-indigo-950 font-display flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-terracotta-600" />
            {t("audit.title")}
          </h1>
          <p className="text-sm text-sand-600 mt-1">
            {t("audit.subtitle")}
          </p>
        </div>

        <Button
          variant="outline"
          size="md"
          onClick={() => fetchLogs(page)}
          className="shadow-sm"
        >
          <RefreshCw className="w-4 h-4 me-2" />
          Actualiser ({total} événements)
        </Button>
      </div>

      {/* Action Filter */}
      <Card className="p-4 bg-white border-sand-200">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-indigo-950">
            {t("audit.filterAction")} :
          </label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-sand-300 bg-sand-50/50 text-indigo-950 focus:outline-none focus:ring-2 focus:ring-terracotta-500"
          >
            <option value="">Tous les événements / جميع العمليات</option>
            <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
            <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            <option value="ACCOUNT_LOCKED">ACCOUNT_LOCKED</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="PASSWORD_RESET_REQUESTED">PASSWORD_RESET_REQUESTED</option>
            <option value="PASSWORD_RESET_COMPLETED">PASSWORD_RESET_COMPLETED</option>
            <option value="USER_CREATE">USER_CREATE</option>
            <option value="USER_DEACTIVATE">USER_DEACTIVATE</option>
            <option value="USER_REACTIVATE">USER_REACTIVATE</option>
            <option value="USER_ROLE_UPDATE">USER_ROLE_UPDATE</option>
            <option value="REFRESH_TOKEN_REUSE_DETECTED">REFRESH_TOKEN_REUSE_DETECTED</option>
          </select>
        </div>
      </Card>

      {/* Audit Logs Table */}
      <Card className="overflow-hidden border-sand-200 bg-white">
        {loading ? (
          <div className="py-16 text-center text-sand-500">
            <div className="w-8 h-8 border-3 border-terracotta-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            {t("common.loading")}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-sand-500">
            {t("audit.noLogs")}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.date")}</TableHead>
                <TableHead>{t("audit.event")}</TableHead>
                <TableHead>{t("audit.user")}</TableHead>
                <TableHead>{t("audit.ip")}</TableHead>
                <TableHead>{t("audit.details")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <React.Fragment key={log.id}>
                    <TableRow className="hover:bg-sand-50/80 transition-colors">
                      <TableCell>
                        <div className="text-xs text-sand-600 flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-sand-400" />
                          <span>
                            {new Date(log.timestamp).toLocaleDateString(isRtl ? "ar-DZ" : "fr-DZ", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action)} className="font-mono text-xs">
                          {log.action}
                        </Badge>
                        <div className="text-[11px] text-sand-500 mt-0.5">
                          {log.entityType} {log.entityId ? `(${log.entityId.slice(0, 8)}...)` : ""}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs text-indigo-950 font-medium flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-sand-400" />
                          <span>{log.userEmail || "Système / Inconnu"}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs text-sand-600 font-mono flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5 text-sand-400" />
                          <span>{log.ipAddress}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        {log.diffSummary ? (
                          <button
                            type="button"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="text-xs font-semibold text-terracotta-600 hover:text-terracotta-700 hover:underline"
                          >
                            {isExpanded ? "Masquer" : "Voir détails (JSON)"}
                          </button>
                        ) : (
                          <span className="text-xs text-sand-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>

                    {isExpanded && log.diffSummary && (
                      <TableRow className="bg-sand-100/50">
                        <TableCell colSpan={5} className="py-3 px-6">
                          <pre className="text-xs font-mono bg-white p-3 rounded-lg border border-sand-200 overflow-x-auto text-indigo-950">
                            {JSON.stringify(log.diffSummary, null, 2)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-sand-200 bg-sand-50/50">
            <div className="text-xs text-sand-600">
              Page {page} sur {totalPages} ({total} entrées)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLogs(page - 1)}
                disabled={page <= 1 || loading}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLogs(page + 1)}
                disabled={page >= totalPages || loading}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
