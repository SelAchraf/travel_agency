import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.js";
import { apiClient } from "../lib/api.js";
import { Card, CardHeader, CardTitle } from "../components/ui/Card.js";
import { Badge } from "../components/ui/Badge.js";
import { Button } from "../components/ui/Button.js";
import { formatDZD } from "@travel-agency/shared";
import {
  LayoutDashboard,
  Inbox,
  CalendarCheck,
  Calendar,
  Receipt,
  Wallet,
  TrendingUp,
  AlertTriangle,
  UserPlus,
  Compass,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Users,
  FileText,
  RefreshCw,
} from "lucide-react";

interface DashboardData {
  kpis: {
    newEnquiriesCount: number;
    activeReservationsCount: number;
    upcomingDeparturesCount: number;
    pendingDocumentsCount: number;
    unassignedEnquiriesCount: number;
    cashReceivedCentimes: number;
    bookedSalesCentimes: number;
    outstandingBalanceCentimes: number;
    currency: string;
  };
  alerts: {
    nearingCapacityDepartures: Array<{
      id: string;
      offerId: string;
      offerTitle: { ar: string; fr: string };
      departureDate: string;
      maxCapacity: number;
      bookedPlaces: number;
      occupancyPercent: number;
    }>;
    unassignedEnquiriesCount: number;
    pendingDocumentsCount: number;
  };
  nextDepartures: Array<{
    id: string;
    offerId: string;
    offerTitle: { ar: string; fr: string };
    departureDate: string;
    returnDate: string;
    maxCapacity: number;
    bookedPlaces: number;
    status: string;
  }>;
  recentEnquiries: Array<{
    id: string;
    enquiryNumber: string;
    contactName: string;
    contactPhone: string;
    status: string;
    travellersCount: number;
    createdAt: string;
    offerTitle?: { ar: string; fr: string } | null;
  }>;
  recentPayments: Array<{
    id: string;
    receiptNumber: string;
    reservationId: string;
    reservationReference: string;
    customerName: string;
    amountCentimes: number;
    currency: string;
    paymentDate: string;
    method: string;
  }>;
}

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRtl = i18n.language === "ar";

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<{ success: boolean; data: DashboardData }>("/admin/dashboard/summary");
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement du tableau de bord");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const getLocalizedTitle = (titleObj?: { ar: string; fr: string } | null) => {
    if (!titleObj) return "";
    return isRtl ? titleObj.ar || titleObj.fr : titleObj.fr || titleObj.ar;
  };

  return (
    <div className="space-y-6">
      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-indigo-950 flex items-center gap-2">
            <LayoutDashboard className="w-7 h-7 text-terracotta-600" />
            {t("dashboard.title")}
          </h1>
          <p className="text-sand-600 text-sm mt-1">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboard}
            disabled={loading}
            className="flex items-center gap-2 text-indigo-950"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {t("common.loading", "Actualiser")}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !data ? (
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-4 border-terracotta-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sand-600 font-medium">{t("common.loading")}</p>
        </div>
      ) : data ? (
        <>
          {/* Quick Actions Bar */}
          <div className="bg-white rounded-xl border border-sand-200 p-4 shadow-sm flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-sand-500 uppercase tracking-wider px-2">
              {t("dashboard.quickActions")}:
            </span>
            <Link to="/admin/customers">
              <Button size="sm" variant="outline" className="flex items-center gap-1.5 text-xs text-indigo-950">
                <UserPlus className="w-3.5 h-3.5 text-terracotta-500" />
                {t("dashboard.actionNewCustomer")}
              </Button>
            </Link>
            <Link to="/admin/offers">
              <Button size="sm" variant="outline" className="flex items-center gap-1.5 text-xs text-indigo-950">
                <Compass className="w-3.5 h-3.5 text-saffron-600" />
                {t("dashboard.actionNewOffer")}
              </Button>
            </Link>
            <Link to="/admin/reservations">
              <Button size="sm" variant="outline" className="flex items-center gap-1.5 text-xs text-indigo-950">
                <CalendarCheck className="w-3.5 h-3.5 text-indigo-600" />
                {t("dashboard.actionNewBooking")}
              </Button>
            </Link>
            <Link to="/admin/payments">
              <Button size="sm" variant="outline" className="flex items-center gap-1.5 text-xs text-indigo-950">
                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                {t("dashboard.actionRecordPayment")}
              </Button>
            </Link>
          </div>

          {/* Operational KPIs (Top Grid) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-sand-600 uppercase tracking-wider">
                    {t("dashboard.newEnquiries")}
                  </p>
                  <p className="text-2xl font-bold text-indigo-950 mt-1">
                    {data.kpis.newEnquiriesCount}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                  <Inbox className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="border-l-4 border-l-indigo-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-sand-600 uppercase tracking-wider">
                    {t("dashboard.activeBookings")}
                  </p>
                  <p className="text-2xl font-bold text-indigo-950 mt-1">
                    {data.kpis.activeReservationsCount}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <CalendarCheck className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="border-l-4 border-l-terracotta-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-sand-600 uppercase tracking-wider">
                    {t("dashboard.upcomingDepartures")}
                  </p>
                  <p className="text-2xl font-bold text-indigo-950 mt-1">
                    {data.kpis.upcomingDeparturesCount}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-terracotta-50 flex items-center justify-center text-terracotta-600">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="border-l-4 border-l-rose-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-sand-600 uppercase tracking-wider">
                    {t("dashboard.pendingDocuments")}
                  </p>
                  <p className="text-2xl font-bold text-indigo-950 mt-1">
                    {data.kpis.pendingDocumentsCount}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
            </Card>
          </div>

          {/* Financial KPIs (Strict Separation: Cash Received vs Booked Sales) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Cash Received */}
            <Card className="bg-gradient-to-br from-emerald-900 to-emerald-950 text-white border-0 shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                    <Wallet className="w-3.5 h-3.5" />
                    {t("dashboard.cashReceived")}
                  </span>
                  <div className="text-2xl lg:text-3xl font-extrabold mt-2 tracking-tight">
                    {formatDZD(data.kpis.cashReceivedCentimes, isRtl ? "ar" : "fr")}
                  </div>
                  <p className="text-emerald-200/80 text-xs mt-1">
                    {t("dashboard.cashReceivedTooltip")}
                  </p>
                </div>
                <div className="p-2.5 bg-emerald-800/40 rounded-lg text-emerald-300">
                  <Receipt className="w-6 h-6" />
                </div>
              </div>
            </Card>

            {/* 2. Booked Sales */}
            <Card className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white border-0 shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-indigo-300">
                    <TrendingUp className="w-3.5 h-3.5" />
                    {t("dashboard.bookedSales")}
                  </span>
                  <div className="text-2xl lg:text-3xl font-extrabold mt-2 tracking-tight">
                    {formatDZD(data.kpis.bookedSalesCentimes, isRtl ? "ar" : "fr")}
                  </div>
                  <p className="text-indigo-200/80 text-xs mt-1">
                    {t("dashboard.bookedSalesTooltip")}
                  </p>
                </div>
                <div className="p-2.5 bg-indigo-800/40 rounded-lg text-indigo-300">
                  <CalendarCheck className="w-6 h-6" />
                </div>
              </div>
            </Card>

            {/* 3. Outstanding Balances */}
            <Card className="bg-gradient-to-br from-amber-900 to-amber-950 text-white border-0 shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-amber-300">
                    <Clock className="w-3.5 h-3.5" />
                    {t("dashboard.outstandingBalance")}
                  </span>
                  <div className="text-2xl lg:text-3xl font-extrabold mt-2 tracking-tight">
                    {formatDZD(data.kpis.outstandingBalanceCentimes, isRtl ? "ar" : "fr")}
                  </div>
                  <p className="text-amber-200/80 text-xs mt-1">
                    {t("dashboard.outstandingTooltip")}
                  </p>
                </div>
                <div className="p-2.5 bg-amber-800/40 rounded-lg text-amber-300">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </Card>
          </div>

          {/* Operational Alerts Banner */}
          {(data.alerts.nearingCapacityDepartures.length > 0 ||
            data.alerts.unassignedEnquiriesCount > 0 ||
            data.alerts.pendingDocumentsCount > 0) && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="border-b-amber-200/60 pb-2 mb-2">
                <CardTitle className="text-amber-900 flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  {t("dashboard.operationalAlerts")}
                </CardTitle>
              </CardHeader>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {data.alerts.nearingCapacityDepartures.length > 0 && (
                  <div className="p-2.5 bg-white rounded-lg border border-amber-200 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-amber-950">
                        {data.alerts.nearingCapacityDepartures.length} {t("dashboard.nearingCapacity")}
                      </p>
                      <p className="text-amber-700 mt-0.5">
                        {getLocalizedTitle(data.alerts.nearingCapacityDepartures[0]?.offerTitle)} (
                        {data.alerts.nearingCapacityDepartures[0]?.occupancyPercent}%)
                      </p>
                    </div>
                    <Link to="/admin/offers" className="text-amber-700 hover:text-amber-900 font-semibold">
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}

                {data.alerts.unassignedEnquiriesCount > 0 && (
                  <div className="p-2.5 bg-white rounded-lg border border-amber-200 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-amber-950">
                        {data.alerts.unassignedEnquiriesCount} {t("dashboard.unassignedLeads")}
                      </p>
                      <p className="text-amber-700 mt-0.5">À distribuer aux conseillers</p>
                    </div>
                    <Link to="/admin/enquiries" className="text-amber-700 hover:text-amber-900 font-semibold">
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}

                {data.alerts.pendingDocumentsCount > 0 && (
                  <div className="p-2.5 bg-white rounded-lg border border-amber-200 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-amber-950">
                        {data.alerts.pendingDocumentsCount} {t("dashboard.pendingDocsAlert")}
                      </p>
                      <p className="text-amber-700 mt-0.5">Relance clients requise</p>
                    </div>
                    <Link to="/admin/reservations" className="text-amber-700 hover:text-amber-900 font-semibold">
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Next Departures & Recent Activity Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Next Departures with Capacity Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  {t("dashboard.nextDepartures")}
                </CardTitle>
                <Link to="/admin/offers" className="text-xs text-terracotta-600 font-medium hover:underline flex items-center gap-1">
                  {t("dashboard.viewAll")}
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </CardHeader>

              {data.nextDepartures.length === 0 ? (
                <p className="text-sm text-sand-500 py-6 text-center">{t("dashboard.noDepartures")}</p>
              ) : (
                <div className="space-y-3">
                  {data.nextDepartures.map((dep) => {
                    const occupancy = Math.round((dep.bookedPlaces / Math.max(1, dep.maxCapacity)) * 100);
                    const isFull = occupancy >= 100;
                    const isNear = occupancy >= 80;

                    return (
                      <div key={dep.id} className="p-3 bg-sand-50/70 rounded-lg border border-sand-200">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-semibold text-indigo-950 truncate max-w-[220px]">
                            {getLocalizedTitle(dep.offerTitle)}
                          </span>
                          <span className="text-sand-600 font-medium">
                            {new Date(dep.departureDate).toLocaleDateString(isRtl ? "ar-DZ" : "fr-DZ", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-sand-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isFull ? "bg-rose-500" : isNear ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(100, occupancy)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-sand-600 mt-1.5">
                          <span>
                            {dep.bookedPlaces} / {dep.maxCapacity} {t("dashboard.places")}
                          </span>
                          <span
                            className={`font-semibold ${
                              isFull ? "text-rose-600" : isNear ? "text-amber-600" : "text-emerald-700"
                            }`}
                          >
                            {occupancy}% {t("dashboard.occupancy")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Recent Enquiries & Recent Receipts */}
            <div className="space-y-6">
              {/* Recent Enquiries */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Inbox className="w-5 h-5 text-amber-600" />
                    {t("dashboard.recentEnquiries")}
                  </CardTitle>
                  <Link to="/admin/enquiries" className="text-xs text-terracotta-600 font-medium hover:underline flex items-center gap-1">
                    {t("dashboard.viewAll")}
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </CardHeader>

                {data.recentEnquiries.length === 0 ? (
                  <p className="text-sm text-sand-500 py-4 text-center">{t("dashboard.noEnquiries")}</p>
                ) : (
                  <div className="divide-y divide-sand-100">
                    {data.recentEnquiries.map((enq) => (
                      <div key={enq.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-indigo-950">{enq.contactName}</p>
                          <p className="text-sand-500 text-[11px]">
                            {enq.contactPhone} {enq.offerTitle ? `• ${getLocalizedTitle(enq.offerTitle)}` : ""}
                          </p>
                        </div>
                        <Badge
                          variant={
                            enq.status === "new"
                              ? "warning"
                              : enq.status === "converted"
                              ? "success"
                              : "secondary"
                          }
                        >
                          {enq.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Recent Payments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-emerald-600" />
                    {t("dashboard.recentPayments")}
                  </CardTitle>
                  <Link to="/admin/payments" className="text-xs text-terracotta-600 font-medium hover:underline flex items-center gap-1">
                    {t("dashboard.viewAll")}
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </CardHeader>

                {data.recentPayments.length === 0 ? (
                  <p className="text-sm text-sand-500 py-4 text-center">{t("dashboard.noPayments")}</p>
                ) : (
                  <div className="divide-y divide-sand-100">
                    {data.recentPayments.map((pay) => (
                      <div key={pay.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-indigo-950 flex items-center gap-2">
                            <span>{pay.receiptNumber}</span>
                            <span className="text-sand-400 font-normal">({pay.reservationReference})</span>
                          </p>
                          <p className="text-sand-500 text-[11px]">{pay.customerName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-700">
                            {formatDZD(pay.amountCentimes, isRtl ? "ar" : "fr")}
                          </p>
                          <span className="text-[10px] uppercase text-sand-500">{pay.method}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
export default DashboardPage;
