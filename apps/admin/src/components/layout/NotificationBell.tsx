import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../lib/api.js";
import { Badge } from "../ui/Badge.js";
import { Button } from "../ui/Button.js";
import {
  Bell,
  Check,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  FileWarning,
  Calendar,
  CreditCard,
  X,
} from "lucide-react";

interface NotificationItem {
  id: string;
  type: "balance_due" | "departure_reminder" | "missing_document" | "enquiry_unassigned" | "customer_message" | "custom_alert";
  channel: string;
  recipientType: string;
  recipientContact?: string | null;
  title: string;
  message: string;
  status: "pending" | "sent" | "read" | "dismissed";
  priority: "low" | "medium" | "high" | "urgent";
  metadata?: {
    whatsAppUrl?: string;
    reservationReference?: string;
    customerName?: string;
    [key: string]: any;
  } | null;
  createdAt: string;
}

export function NotificationBell() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await apiClient<{ success: boolean; data: NotificationItem[] }>(
        "/admin/notifications?limit=15"
      );
      if (res && res.data) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // 1-minute auto poll
    return () => clearInterval(interval);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient(`/admin/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: "read" as const } : n))
      );
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  const handleScanAlerts = async () => {
    try {
      setScanning(true);
      await apiClient("/admin/notifications/scan", { method: "POST" });
      await fetchNotifications();
    } catch (err) {
      console.error("Failed to scan alerts", err);
    } finally {
      setScanning(false);
    }
  };

  const unreadCount = notifications.filter(
    (n) => n.status === "pending" || n.status === "sent"
  ).length;

  const getTypeIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "balance_due":
        return <CreditCard className="w-4 h-4 text-amber-600" />;
      case "missing_document":
        return <FileWarning className="w-4 h-4 text-red-600" />;
      case "departure_reminder":
        return <Calendar className="w-4 h-4 text-indigo-600" />;
      case "customer_message":
        return <MessageSquare className="w-4 h-4 text-emerald-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-saffron-600" />;
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-sand-600 hover:text-indigo-950 rounded-lg hover:bg-sand-100 transition-colors focus:outline-none focus:ring-2 focus:ring-terracotta-500"
        aria-label={t("notifications.title")}
        title={t("notifications.title")}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 end-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-terracotta-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-sand-200 z-50 overflow-hidden flex flex-col ${
            isRtl ? "left-0" : "right-0"
          }`}
          style={{ maxHeight: "calc(100vh - 100px)" }}
        >
          {/* Header */}
          <div className="p-3 bg-sand-50 border-b border-sand-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-indigo-950">
                {t("notifications.title")}
              </span>
              {unreadCount > 0 && (
                <Badge variant="terracotta" className="text-xs px-1.5 py-0">
                  {unreadCount} {isRtl ? "جديد" : "non lus"}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleScanAlerts}
                disabled={scanning}
                className="text-xs h-7 px-2 text-sand-600 hover:text-indigo-950"
                title={t("notifications.scanAlerts")}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 me-1 ${scanning ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">{t("notifications.scanAlerts")}</span>
              </Button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-sand-400 hover:text-sand-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="divide-y divide-sand-100 overflow-y-auto max-h-[380px]">
            {loading && notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-sand-500">
                <RefreshCw className="w-5 h-5 mx-auto animate-spin text-sand-400 mb-2" />
                {isRtl ? "جاري التحميل..." : "Chargement des notifications..."}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-sand-500">
                <Bell className="w-8 h-8 mx-auto text-sand-300 mb-2" />
                {t("notifications.emptyList")}
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = item.status === "pending" || item.status === "sent";
                return (
                  <div
                    key={item.id}
                    className={`p-3 transition-colors ${
                      isUnread ? "bg-amber-50/40 hover:bg-amber-50/70" : "hover:bg-sand-50"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-white border border-sand-200 shadow-xs mt-0.5 shrink-0">
                        {getTypeIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs font-semibold truncate ${isUnread ? "text-indigo-950" : "text-sand-700"}`}>
                            {item.title}
                          </p>
                          <span className="text-[10px] text-sand-400 shrink-0">
                            {new Date(item.createdAt).toLocaleDateString(isRtl ? "ar-DZ" : "fr-DZ", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-sand-600 mt-1 line-clamp-2 leading-relaxed">
                          {item.message}
                        </p>

                        {/* Actions (WhatsApp & Mark as read) */}
                        <div className="flex items-center gap-2 mt-2 pt-1 border-t border-sand-100/60">
                          {item.metadata?.whatsAppUrl && (
                            <a
                              href={item.metadata.whatsAppUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {t("notifications.openWhatsApp")}
                            </a>
                          )}
                          {isUnread && (
                            <button
                              type="button"
                              onClick={(e) => handleMarkAsRead(item.id, e)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-sand-500 hover:text-indigo-950 px-1.5 py-0.5 rounded hover:bg-sand-100 transition-colors ms-auto"
                            >
                              <Check className="w-3 h-3 text-terracotta-600" />
                              {t("notifications.markRead")}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

