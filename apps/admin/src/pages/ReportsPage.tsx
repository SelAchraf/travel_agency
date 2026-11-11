import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.js";
import { apiClient } from "../lib/api.js";
import { Card, CardHeader, CardTitle } from "../components/ui/Card.js";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table.js";
import { Badge } from "../components/ui/Badge.js";
import { Button } from "../components/ui/Button.js";
import { Input } from "../components/ui/Input.js";
import { formatDZD } from "@travel-agency/shared";
import {
  BarChart3,
  TrendingUp,
  Receipt,
  Wallet,
  Calendar,
  Download,
  Filter,
  FileSpreadsheet,
  CheckCircle2,
  Users,
  Compass,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  Clock,
} from "lucide-react";

interface FinancialReportData {
  period: { startDate?: string | null; endDate?: string | null };
  summary: {
    grossCashCentimes: number;
    totalRefundsCentimes: number;
    refundCount: number;
    netCashReceivedCentimes: number;
    bookedSalesCentimes: number;
    bookedSalesCount: number;
    outstandingBalanceCentimes: number;
    currency: string;
  };
  methodBreakdown: Array<{
    method: string;
    count: number;
    totalCentimes: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    cashCentimes: number;
    count: number;
  }>;
}

interface OperationalReportData {
  period: { startDate?: string | null; endDate?: string | null };
  departures: Array<{
    id: string;
    offerId: string;
    offerTitle: { ar: string; fr: string };
    departureDate: string;
    returnDate: string;
    maxCapacity: number;
    bookedPlaces: number;
    waitingListCount: number;
    status: string;
    occupancyPercent: number;
  }>;
  enquiriesFunnel: {
    total: number;
    converted: number;
    rejected: number;
    newCount: number;
    inProgress: number;
    closed: number;
    conversionRatePercent: number;
  };
  reservationsByStatus: Array<{
    status: string;
    count: number;
    totalCentimes: number;
  }>;
}

export function ReportsPage() {
  const { t, i18n } = useTranslation();
  const { hasPermission } = useAuth();
  const isRtl = i18n.language === "ar";

  const [activeTab, setActiveTab] = useState<"financial" | "operational" | "exports">(
    hasPermission("reports:financial") ? "financial" : "operational"
  );

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Data states
  const [financialData, setFinancialData] = useState<FinancialReportData | null>(null);
  const [operationalData, setOperationalData] = useState<OperationalReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportingType, setExportingType] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      if (activeTab === "financial" && hasPermission("reports:financial")) {
        const res = await apiClient<{ success: boolean; data: FinancialReportData }>(
          "/admin/reports/financial",
          { params }
        );
        if (res.success && res.data) {
          setFinancialData(res.data);
        }
      } else if (activeTab === "operational" && hasPermission("reports:operational")) {
        const res = await apiClient<{ success: boolean; data: OperationalReportData }>(
          "/admin/reports/operational",
          { params }
        );
        if (res.success && res.data) {
          setOperationalData(res.data);
        }
      }
    } catch (err: any) {
      setError(err.message || "Erreur de chargement des rapports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "exports") {
      fetchReports();
    }
  }, [activeTab]);

  const handleDownloadCsv = async (type: "reservations" | "payments" | "enquiries" | "passengers") => {
    setExportingType(type);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";
      const queryParams = new URLSearchParams({ type });
      if (startDate) queryParams.append("startDate", startDate);
      if (endDate) queryParams.append("endDate", endDate);

      const downloadUrl = `${API_BASE}/admin/reports/export-csv?${queryParams.toString()}`;

      const response = await fetch(downloadUrl, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || "Échec de l'exportation");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export_${type}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      alert(err.message || "Erreur lors du téléchargement du fichier CSV");
    } finally {
      setExportingType(null);
    }
  };

  const getLocalizedTitle = (titleObj?: { ar: string; fr: string } | null) => {
    if (!titleObj) return "";
    return isRtl ? titleObj.ar || titleObj.fr : titleObj.fr || titleObj.ar;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-indigo-950 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-terracotta-600" />
            {t("reports.title")}
          </h1>
          <p className="text-sand-600 text-sm mt-1">{t("reports.subtitle")}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-sand-200 gap-2">
        {hasPermission("reports:financial") && (
          <button
            onClick={() => setActiveTab("financial")}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "financial"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-sand-600 hover:text-indigo-950"
            }`}
          >
            <Wallet className="w-4 h-4" />
            {t("reports.tabFinancial")}
          </button>
        )}

        {hasPermission("reports:operational") && (
          <button
            onClick={() => setActiveTab("operational")}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "operational"
                ? "border-indigo-600 text-indigo-900"
                : "border-transparent text-sand-600 hover:text-indigo-950"
            }`}
          >
            <Compass className="w-4 h-4" />
            {t("reports.tabOperational")}
          </button>
        )}

        <button
          onClick={() => setActiveTab("exports")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "exports"
              ? "border-terracotta-600 text-terracotta-700"
              : "border-transparent text-sand-600 hover:text-indigo-950"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          {t("reports.tabExports")}
        </button>
      </div>

      {/* Date Filter Bar (for financial & operational) */}
      {activeTab !== "exports" && (
        <Card className="p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchReports();
            }}
            className="flex flex-wrap items-center gap-3 text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="text-sand-600 font-medium">{t("reports.filterStartDate")}:</span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sand-600 font-medium">{t("reports.filterEndDate")}:</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <Button type="submit" size="sm" variant="outline" className="h-8 text-xs flex items-center gap-1.5 text-indigo-950">
              <Filter className="w-3.5 h-3.5" />
              {t("reports.applyFilter")}
            </Button>

            {(startDate || endDate) && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setTimeout(fetchReports, 50);
                }}
                className="h-8 text-xs text-sand-500"
              >
                {t("reports.resetFilter")}
              </Button>
            )}
          </form>
        </Card>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-4 border-terracotta-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sand-600 font-medium text-sm">{t("common.loading")}</p>
        </div>
      ) : activeTab === "financial" && financialData ? (
        <div className="space-y-6">
          {/* Summary Financial KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Card className="border-l-4 border-l-emerald-600">
              <p className="text-xs text-sand-600 uppercase tracking-wider">{t("reports.grossCash")}</p>
              <p className="text-lg font-bold text-emerald-800 mt-1">
                {formatDZD(financialData.summary.grossCashCentimes, isRtl ? "ar" : "fr")}
              </p>
            </Card>

            <Card className="border-l-4 border-l-rose-500">
              <p className="text-xs text-sand-600 uppercase tracking-wider">
                {t("reports.totalRefunds")} ({financialData.summary.refundCount})
              </p>
              <p className="text-lg font-bold text-rose-700 mt-1">
                {formatDZD(financialData.summary.totalRefundsCentimes, isRtl ? "ar" : "fr")}
              </p>
            </Card>

            <Card className="border-l-4 border-l-emerald-700 bg-emerald-50/40">
              <p className="text-xs text-emerald-900 font-semibold uppercase tracking-wider">
                {t("reports.netCash")}
              </p>
              <p className="text-xl font-extrabold text-emerald-900 mt-1">
                {formatDZD(financialData.summary.netCashReceivedCentimes, isRtl ? "ar" : "fr")}
              </p>
            </Card>

            <Card className="border-l-4 border-l-indigo-600">
              <p className="text-xs text-sand-600 uppercase tracking-wider">
                {t("reports.bookedSales")} ({financialData.summary.bookedSalesCount})
              </p>
              <p className="text-lg font-bold text-indigo-950 mt-1">
                {formatDZD(financialData.summary.bookedSalesCentimes, isRtl ? "ar" : "fr")}
              </p>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <p className="text-xs text-sand-600 uppercase tracking-wider">{t("reports.outstanding")}</p>
              <p className="text-lg font-bold text-amber-700 mt-1">
                {formatDZD(financialData.summary.outstandingBalanceCentimes, isRtl ? "ar" : "fr")}
              </p>
            </Card>
          </div>

          {/* Breakdown by Method & Monthly Trend Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  {t("reports.byMethod")}
                </CardTitle>
              </CardHeader>
              <div className="space-y-3">
                {financialData.methodBreakdown.map((m) => {
                  const percent =
                    financialData.summary.grossCashCentimes > 0
                      ? Math.round((m.totalCentimes / financialData.summary.grossCashCentimes) * 100)
                      : 0;

                  return (
                    <div key={m.method} className="p-3 bg-sand-50/70 rounded-lg border border-sand-200">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold uppercase text-indigo-950 tracking-wider">
                          {m.method}
                        </span>
                        <span className="font-bold text-emerald-800">
                          {formatDZD(m.totalCentimes, isRtl ? "ar" : "fr")}
                        </span>
                      </div>
                      <div className="w-full bg-sand-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-sand-500 mt-1">
                        <span>{m.count} règlements</span>
                        <span>{percent}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Monthly Trend Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  {t("reports.monthlyTrend")}
                </CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow className="bg-sand-50/70">
                    <TableHead>{t("reports.month")}</TableHead>
                    <TableHead>{t("reports.count")}</TableHead>
                    <TableHead className="text-right">{t("common.amount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financialData.monthlyTrend.map((t) => (
                    <TableRow key={t.month}>
                      <TableCell className="font-mono text-xs font-semibold text-indigo-950">
                        {t.month}
                      </TableCell>
                      <TableCell className="text-xs text-sand-600">{t.count}</TableCell>
                      <TableCell className="text-right font-bold text-xs text-emerald-800">
                        {formatDZD(t.cashCentimes, isRtl ? "ar" : "fr")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>
      ) : activeTab === "operational" && operationalData ? (
        <div className="space-y-6">
          {/* Enquiry Funnel Cards */}
          <Card className="border-indigo-200 bg-indigo-50/30">
            <CardHeader className="border-b-indigo-200/50 pb-2 mb-3">
              <CardTitle className="text-sm text-indigo-950 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                {t("reports.enquiriesFunnel")}
              </CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-center">
              <div className="p-3 bg-white rounded-lg border border-sand-200">
                <p className="text-[11px] text-sand-500 uppercase">{t("reports.totalEnquiries")}</p>
                <p className="text-xl font-bold text-indigo-950 mt-1">
                  {operationalData.enquiriesFunnel.total}
                </p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-sand-200">
                <p className="text-[11px] text-amber-600 uppercase">En attente (New)</p>
                <p className="text-xl font-bold text-amber-700 mt-1">
                  {operationalData.enquiriesFunnel.newCount}
                </p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-sand-200">
                <p className="text-[11px] text-indigo-600 uppercase">En cours</p>
                <p className="text-xl font-bold text-indigo-700 mt-1">
                  {operationalData.enquiriesFunnel.inProgress}
                </p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-sand-200">
                <p className="text-[11px] text-emerald-600 uppercase">{t("reports.convertedEnquiries")}</p>
                <p className="text-xl font-bold text-emerald-700 mt-1">
                  {operationalData.enquiriesFunnel.converted}
                </p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-sand-200">
                <p className="text-[11px] text-rose-600 uppercase">Rejetées</p>
                <p className="text-xl font-bold text-rose-700 mt-1">
                  {operationalData.enquiriesFunnel.rejected}
                </p>
              </div>

              <div className="p-3 bg-indigo-900 text-white rounded-lg">
                <p className="text-[11px] text-indigo-200 uppercase">{t("reports.conversionRate")}</p>
                <p className="text-2xl font-extrabold mt-1">
                  {operationalData.enquiriesFunnel.conversionRatePercent}%
                </p>
              </div>
            </div>
          </Card>

          {/* Departures Occupancy Table */}
          <Card className="overflow-hidden p-0">
            <div className="p-4 border-b border-sand-200">
              <h3 className="text-sm font-semibold text-indigo-950 flex items-center gap-2">
                <Compass className="w-4 h-4 text-terracotta-600" />
                Taux de Remplissage des Départs
              </h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-sand-50/70">
                  <TableHead>Offre de voyage</TableHead>
                  <TableHead>Date Départ</TableHead>
                  <TableHead>Date Retour</TableHead>
                  <TableHead>Capacité</TableHead>
                  <TableHead>Inscrits</TableHead>
                  <TableHead>Taux d'occupation</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operationalData.departures.map((dep) => {
                  const isFull = dep.occupancyPercent >= 100;
                  const isNear = dep.occupancyPercent >= 80;

                  return (
                    <TableRow key={dep.id}>
                      <TableCell className="font-medium text-xs text-indigo-950">
                        {getLocalizedTitle(dep.offerTitle)}
                      </TableCell>
                      <TableCell className="text-xs text-sand-600">
                        {new Date(dep.departureDate).toLocaleDateString(isRtl ? "ar-DZ" : "fr-DZ")}
                      </TableCell>
                      <TableCell className="text-xs text-sand-600">
                        {new Date(dep.returnDate).toLocaleDateString(isRtl ? "ar-DZ" : "fr-DZ")}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{dep.maxCapacity}</TableCell>
                      <TableCell className="text-xs font-mono font-semibold">{dep.bookedPlaces}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 w-32">
                          <div className="w-full bg-sand-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isFull ? "bg-rose-500" : isNear ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(100, dep.occupancyPercent)}%` }}
                            />
                          </div>
                          <span
                            className={`text-[11px] font-bold ${
                              isFull ? "text-rose-600" : isNear ? "text-amber-600" : "text-emerald-700"
                            }`}
                          >
                            {dep.occupancyPercent}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={dep.status === "open" ? "success" : "secondary"}
                        >
                          {dep.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>
      ) : activeTab === "exports" ? (
        <div className="space-y-6">
          {/* Information Notice */}
          <Card className="border-terracotta-200 bg-sand-50/80">
            <h3 className="text-sm font-semibold text-indigo-950 mb-1">{t("reports.exportTitle")}</h3>
            <p className="text-xs text-sand-600 leading-relaxed">{t("reports.exportSubtitle")}</p>
          </Card>

          {/* Export Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Reservations Export */}
            <Card className="p-5 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center mb-3">
                  <Calendar className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-indigo-950">{t("reports.exportReservations")}</h4>
                <p className="text-xs text-sand-600 mt-1">
                  Export complet des dossiers de réservation, coordonnées clients, montants convenus (DA),
                  remises et statuts.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-sand-100 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => handleDownloadCsv("reservations")}
                  disabled={exportingType === "reservations"}
                  className="bg-indigo-900 hover:bg-indigo-950 text-white flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {exportingType === "reservations" ? t("common.loading") : t("reports.exportReservations")}
                </Button>
              </div>
            </Card>

            {/* 2. Payments Export */}
            <Card className="p-5 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                  <Receipt className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-indigo-950">{t("reports.exportPayments")}</h4>
                <p className="text-xs text-sand-600 mt-1">
                  Journal de caisse complet, numéros de reçus officiels (RCP), modes de règlement, bordereaux et
                  montants encaissés.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-sand-100 flex justify-end">
                {hasPermission("reports:financial") ? (
                  <Button
                    size="sm"
                    onClick={() => handleDownloadCsv("payments")}
                    disabled={exportingType === "payments"}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {exportingType === "payments" ? t("common.loading") : t("reports.exportPayments")}
                  </Button>
                ) : (
                  <span className="text-xs text-sand-400 italic">Accès restreint à la finance</span>
                )}
              </div>
            </Card>

            {/* 3. Enquiries Export */}
            <Card className="p-5 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-indigo-950">{t("reports.exportEnquiries")}</h4>
                <p className="text-xs text-sand-600 mt-1">
                  Liste des demandes de renseignements et prospects reçus via le site public ou au guichet,
                  avec statut et coordonnées.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-sand-100 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => handleDownloadCsv("enquiries")}
                  disabled={exportingType === "enquiries"}
                  className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {exportingType === "enquiries" ? t("common.loading") : t("reports.exportEnquiries")}
                </Button>
              </div>
            </Card>

            {/* 4. Passengers Manifest Export */}
            <Card className="p-5 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-terracotta-50 text-terracotta-700 flex items-center justify-center mb-3">
                  <Compass className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-indigo-950">{t("reports.exportPassengers")}</h4>
                <p className="text-xs text-sand-600 mt-1">
                  Manifeste officiel des passagers pour les départs : noms complets, dates de naissance,
                  répartition des chambres et contacts.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-sand-100 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => handleDownloadCsv("passengers")}
                  disabled={exportingType === "passengers"}
                  className="bg-terracotta-600 hover:bg-terracotta-700 text-white flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {exportingType === "passengers" ? t("common.loading") : t("reports.exportPassengers")}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
export default ReportsPage;
