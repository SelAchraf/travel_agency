import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.js";
import { apiClient } from "../lib/api.js";
import { Button } from "../components/ui/Button.js";
import { Input } from "../components/ui/Input.js";
import { Badge } from "../components/ui/Badge.js";
import { Card } from "../components/ui/Card.js";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table.js";
import { Modal } from "../components/ui/Modal.js";
import {
  formatDZD,
  PAYMENT_METHODS,
  type PaymentMethod,
} from "@travel-agency/shared";
import {
  Receipt,
  Wallet,
  Building2,
  CreditCard,
  Banknote,
  Search,
  RefreshCw,
  Printer,
  RotateCcw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Calendar,
} from "lucide-react";

interface PaymentListItem {
  id: string;
  receiptNumber: string;
  reservationId: string;
  reservationReference: string;
  customerName: string;
  amountCentimes: number;
  currency: string;
  paymentDate: string;
  method: PaymentMethod;
  referenceOrSlipNumber?: string | null;
  notes?: string | null;
  isReversed: boolean;
  reversalReason?: string | null;
  recordedByUserName?: string | null;
  createdAt: string;
}

interface PaymentMetrics {
  totalCentimes: number;
  cashCentimes: number;
  bankTransferCentimes: number;
  chequeCentimes: number;
  cibCentimes: number;
}

export function PaymentsListPage() {
  const { t, i18n } = useTranslation();
  const { user, hasPermission } = useAuth();
  const isRtl = i18n.language === "ar";

  const [payments, setPayments] = useState<PaymentListItem[]>([]);
  const [metrics, setMetrics] = useState<PaymentMetrics>({
    totalCentimes: 0,
    cashCentimes: 0,
    bankTransferCentimes: 0,
    chequeCentimes: 0,
    cibCentimes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Filters
  const [methodFilter, setMethodFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Reversal Modal
  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [selectedPaymentForReversal, setSelectedPaymentForReversal] = useState<PaymentListItem | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [reversalLoading, setReversalLoading] = useState(false);
  const [reversalError, setReversalError] = useState<string | null>(null);

  // Official Printable Receipt Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<PaymentListItem | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await apiClient<{
        success: boolean;
        payments: PaymentListItem[];
        metrics: PaymentMetrics;
        pagination: { total: number; page: number; limit: number };
      }>("/admin/payments", {
        params: {
          page,
          limit,
          method: methodFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });

      setPayments(res.payments || []);
      setTotalCount(res.pagination?.total || 0);
      if (res.metrics) {
        setMetrics({
          totalCentimes: Number(res.metrics.totalCentimes) || 0,
          cashCentimes: Number(res.metrics.cashCentimes) || 0,
          bankTransferCentimes: Number(res.metrics.bankTransferCentimes) || 0,
          chequeCentimes: Number(res.metrics.chequeCentimes) || 0,
          cibCentimes: Number(res.metrics.cibCentimes) || 0,
        });
      }
    } catch (err) {
      console.error("Failed to load payments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, methodFilter, startDate, endDate]);

  const handleReversalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentForReversal) return;

    setReversalLoading(true);
    setReversalError(null);
    try {
      await apiClient(`/admin/payments/${selectedPaymentForReversal.id}/reverse`, {
        method: "PATCH",
        body: JSON.stringify({
          reversalReason: reversalReason.trim(),
        }),
      });
      setReversalModalOpen(false);
      await fetchPayments();
    } catch (err: any) {
      setReversalError(err.message || "Erreur lors de l'annulation");
    } finally {
      setReversalLoading(false);
    }
  };

  const getMethodBadge = (m: PaymentMethod) => {
    switch (m) {
      case "cash":
        return (
          <Badge variant="mint" className="gap-1">
            <Banknote className="w-3 h-3" />
            {t("payments.methodCash")}
          </Badge>
        );
      case "bank_transfer":
        return (
          <Badge variant="indigo" className="gap-1">
            <Building2 className="w-3 h-3" />
            {t("payments.methodBankTransfer")}
          </Badge>
        );
      case "cheque":
        return (
          <Badge variant="terracotta" className="gap-1">
            <Receipt className="w-3 h-3" />
            {t("payments.methodCheque")}
          </Badge>
        );
      case "cib_edahabia_manual":
        return (
          <Badge variant="saffron" className="gap-1">
            <CreditCard className="w-3 h-3" />
            {t("payments.methodCibEdahabia")}
          </Badge>
        );
      default:
        return <Badge variant="outline">{m}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-indigo-950 flex items-center gap-2">
            <Receipt className="w-7 h-7 text-terracotta-600" />
            {t("payments.title")}
          </h1>
          <p className="text-sm text-sand-600 mt-1">{t("payments.subtitle")}</p>
        </div>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Net */}
        <Card className="p-4 bg-indigo-950 text-white border-0 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-sand-300">
            <span className="text-xs font-medium">{t("payments.netTotal")}</span>
            <Wallet className="w-4 h-4 text-saffron-400" />
          </div>
          <div className="text-lg font-bold font-mono text-saffron-400">
            {formatDZD(metrics.totalCentimes, isRtl ? "ar" : "fr")}
          </div>
        </Card>

        {/* Cash */}
        <Card className="p-4 bg-white border border-sand-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-sand-500">
            <span className="text-xs font-medium">{t("payments.cashTotal")}</span>
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base font-bold font-mono text-indigo-950">
            {formatDZD(metrics.cashCentimes, isRtl ? "ar" : "fr")}
          </div>
        </Card>

        {/* Bank Transfers */}
        <Card className="p-4 bg-white border border-sand-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-sand-500">
            <span className="text-xs font-medium">{t("payments.bankTotal")}</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-base font-bold font-mono text-indigo-950">
            {formatDZD(metrics.bankTransferCentimes, isRtl ? "ar" : "fr")}
          </div>
        </Card>

        {/* Cheques */}
        <Card className="p-4 bg-white border border-sand-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-sand-500">
            <span className="text-xs font-medium">{t("payments.chequeTotal")}</span>
            <Receipt className="w-4 h-4 text-terracotta-600" />
          </div>
          <div className="text-base font-bold font-mono text-indigo-950">
            {formatDZD(metrics.chequeCentimes, isRtl ? "ar" : "fr")}
          </div>
        </Card>

        {/* CIB / Edahabia */}
        <Card className="p-4 bg-white border border-sand-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-sand-500">
            <span className="text-xs font-medium">{t("payments.cibTotal")}</span>
            <CreditCard className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-base font-bold font-mono text-indigo-950">
            {formatDZD(metrics.cibCentimes, isRtl ? "ar" : "fr")}
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 bg-white border border-sand-200 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Method Filter */}
          <div>
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 px-3 rounded-lg border border-sand-200 bg-white text-sm text-indigo-950 focus:outline-none focus:ring-2 focus:ring-terracotta-500"
            >
              <option value="">{t("payments.allMethods")}</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m === "cash"
                    ? t("payments.methodCash")
                    : m === "bank_transfer"
                    ? t("payments.methodBankTransfer")
                    : m === "cheque"
                    ? t("payments.methodCheque")
                    : t("payments.methodCibEdahabia")}
                </option>
              ))}
            </select>
          </div>

          {/* Date Start */}
          <div className="relative">
            <Calendar className="w-4 h-4 text-sand-400 absolute top-3 start-3" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="ps-9 text-xs"
              placeholder="Date début"
            />
          </div>

          {/* Date End */}
          <div className="relative">
            <Calendar className="w-4 h-4 text-sand-400 absolute top-3 start-3" />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="ps-9 text-xs"
              placeholder="Date fin"
            />
          </div>

          {/* Refresh Action */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => fetchPayments()}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="text-xs">{t("common.loading") === "Chargement..." ? "Actualiser" : "تحديث"}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Payments Journal Table */}
      <Card className="overflow-hidden border border-sand-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-sand-50/80">
              <TableHead className="font-semibold text-xs text-sand-700">{t("payments.receiptNumber")}</TableHead>
              <TableHead className="font-semibold text-xs text-sand-700">{t("payments.reservationRef")}</TableHead>
              <TableHead className="font-semibold text-xs text-sand-700">{t("reservations.customer")}</TableHead>
              <TableHead className="font-semibold text-xs text-sand-700">{t("payments.amount")}</TableHead>
              <TableHead className="font-semibold text-xs text-sand-700">{t("payments.method")}</TableHead>
              <TableHead className="font-semibold text-xs text-sand-700">{t("payments.referenceOrSlip")}</TableHead>
              <TableHead className="font-semibold text-xs text-sand-700">{t("payments.recordedBy")}</TableHead>
              <TableHead className="font-semibold text-xs text-sand-700">{t("payments.paymentDate")}</TableHead>
              <TableHead className="font-semibold text-xs text-sand-700 text-end">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center gap-2 text-sand-500">
                    <RefreshCw className="w-6 h-6 animate-spin text-terracotta-500" />
                    <span className="text-sm">{t("common.loading")}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-sand-500">
                  <Receipt className="w-10 h-10 mx-auto text-sand-300 mb-2" />
                  <p className="text-sm font-medium">{t("payments.emptyList")}</p>
                </TableCell>
              </TableRow>
            ) : (
              payments.map((p) => (
                <TableRow key={p.id} className={p.isReversed ? "bg-red-50/40 opacity-70" : "hover:bg-sand-50/50"}>
                  {/* Receipt Number */}
                  <TableCell className="font-mono font-bold text-xs text-indigo-950">
                    {p.receiptNumber}
                    {p.isReversed && (
                      <span className="ms-2 text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                        {t("payments.reversed")}
                      </span>
                    )}
                  </TableCell>

                  {/* Reservation Link */}
                  <TableCell className="font-mono text-xs">
                    <Link
                      to={`/admin/reservations/${p.reservationId}`}
                      className="text-terracotta-700 hover:underline flex items-center gap-1"
                    >
                      <span>{p.reservationReference}</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </TableCell>

                  {/* Customer */}
                  <TableCell className="text-xs font-medium text-indigo-950">{p.customerName || "—"}</TableCell>

                  {/* Amount in DZD */}
                  <TableCell className="font-mono font-bold text-xs text-indigo-950 whitespace-nowrap">
                    <span className={p.isReversed ? "line-through text-sand-400" : ""}>
                      {formatDZD(p.amountCentimes, isRtl ? "ar" : "fr")}
                    </span>
                  </TableCell>

                  {/* Method */}
                  <TableCell>{getMethodBadge(p.method)}</TableCell>

                  {/* Slip / Bank Reference */}
                  <TableCell className="font-mono text-xs text-sand-600">
                    {p.referenceOrSlipNumber || "—"}
                  </TableCell>

                  {/* Recorded By */}
                  <TableCell className="text-xs text-sand-600">{p.recordedByUserName || "Agent"}</TableCell>

                  {/* Payment Date */}
                  <TableCell className="font-mono text-xs text-sand-600">
                    {new Date(p.paymentDate).toLocaleDateString(isRtl ? "ar-DZ" : "fr-DZ")}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-end space-x-1">
                    {/* Print Receipt */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActiveReceipt(p);
                        setReceiptModalOpen(true);
                      }}
                      className="h-8 w-8 p-0 text-sand-600 hover:text-indigo-950"
                      title={t("payments.printReceipt")}
                    >
                      <Printer className="w-4 h-4 text-terracotta-600" />
                    </Button>

                    {/* Reversal if permitted */}
                    {!p.isReversed && hasPermission("payments:write") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPaymentForReversal(p);
                          setReversalReason("");
                          setReversalModalOpen(true);
                        }}
                        className="h-8 w-8 p-0 text-sand-600 hover:text-red-600"
                        title={t("payments.reversePayment")}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        {totalCount > limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-sand-200 bg-sand-50/50 text-xs text-sand-600">
            <div>
              Total : <span className="font-bold text-indigo-950">{totalCount}</span> règlements
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 px-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-medium text-indigo-950">
                Page {page} / {Math.ceil(totalCount / limit)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page * limit >= totalCount}
                className="h-8 px-2"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal: Reversal */}
      <Modal
        isOpen={reversalModalOpen}
        onClose={() => setReversalModalOpen(false)}
        title={t("payments.reversePayment")}
        className="max-w-md"
      >
        <form onSubmit={handleReversalSubmit} className="space-y-4">
          {reversalError && (
            <div className="p-3 bg-red-50 text-red-800 text-xs rounded-lg border border-red-200">
              {reversalError}
            </div>
          )}

          <div className="p-3 bg-red-50 text-xs text-red-900 rounded-lg space-y-1">
            <span className="font-bold">Attention : Annulation d'encaissement</span>
            <p>
              Le reçu {selectedPaymentForReversal?.receiptNumber} sera marqué comme annulé. Le solde du client sera
              recalculé immédiatement.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-indigo-950">{t("payments.reversalReason")} *</label>
            <Input
              type="text"
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
              placeholder="Ex: Chèque sans provision, régularisation d'erreur..."
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setReversalModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={reversalLoading} className="bg-red-600 text-white hover:bg-red-700">
              {reversalLoading ? t("common.loading") : t("payments.reversePayment")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Official Printable Receipt Modal */}
      <Modal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        title={t("payments.receipt")}
        className="max-w-xl"
      >
        {activeReceipt && (
          <div className="space-y-6">
            {/* Printable Container */}
            <div
              id="printable-journal-receipt"
              className="p-6 bg-white border-2 border-dashed border-sand-300 rounded-xl space-y-4 text-indigo-950 print:border-none print:p-0"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-indigo-950 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-indigo-950">{t("common.agencyName")}</h2>
                  <p className="text-[11px] text-sand-600">Agence de Voyages et de Tourisme Algérienne</p>
                  <p className="text-[10px] text-sand-500 font-mono">Licence N° 16/0423/AVT • Alger, Algérie</p>
                </div>
                <div className="text-end">
                  <span className="text-[10px] uppercase font-bold text-terracotta-600 tracking-wider block">
                    {t("payments.officialReceiptTitle")}
                  </span>
                  <span className="text-sm font-mono font-bold text-indigo-950 block">
                    {activeReceipt.receiptNumber}
                  </span>
                  <span className="text-[11px] text-sand-500 font-mono">
                    {new Date(activeReceipt.paymentDate).toLocaleString(isRtl ? "ar-DZ" : "fr-DZ")}
                  </span>
                </div>
              </div>

              {/* Receipt Content */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-sand-200">
                  <span className="text-sand-600">{t("payments.receivedFrom")} :</span>
                  <span className="font-bold text-indigo-950">{activeReceipt.customerName}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-sand-200">
                  <span className="text-sand-600">{t("payments.forBooking")} :</span>
                  <span className="font-mono font-bold text-indigo-950">{activeReceipt.reservationReference}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-sand-200">
                  <span className="text-sand-600">{t("payments.method")} :</span>
                  <span className="font-medium text-indigo-950">
                    {activeReceipt.method === "cash"
                      ? t("payments.methodCash")
                      : activeReceipt.method === "bank_transfer"
                      ? t("payments.methodBankTransfer")
                      : activeReceipt.method === "cheque"
                      ? t("payments.methodCheque")
                      : t("payments.methodCibEdahabia")}
                  </span>
                </div>

                {activeReceipt.referenceOrSlipNumber && (
                  <div className="flex justify-between py-1 border-b border-sand-200">
                    <span className="text-sand-600">{t("payments.referenceOrSlip")} :</span>
                    <span className="font-mono font-medium text-indigo-950">
                      {activeReceipt.referenceOrSlipNumber}
                    </span>
                  </div>
                )}

                {/* Amount Box */}
                <div className="p-4 bg-sand-50 rounded-lg flex items-center justify-between border border-sand-200">
                  <span className="font-bold text-sm text-indigo-950">{t("payments.amount")} :</span>
                  <span className="text-xl font-bold font-mono text-terracotta-600">
                    {formatDZD(activeReceipt.amountCentimes, isRtl ? "ar" : "fr")}
                  </span>
                </div>
              </div>

              {/* Cashier & Stamp Footer */}
              <div className="pt-6 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-sand-500 block text-[11px]">{t("payments.recordedBy")}</span>
                  <span className="font-semibold text-indigo-950">
                    {activeReceipt.recordedByUserName || user?.fullName || "Agent de caisse"}
                  </span>
                </div>
                <div className="text-end border border-sand-200 rounded p-4 h-20 flex flex-col justify-between">
                  <span className="text-[10px] text-sand-400 uppercase">{t("payments.cashierSignature")}</span>
                  <span className="text-[10px] text-sand-300 italic">[Cachet agence]</span>
                </div>
              </div>
            </div>

            {/* Print & Close Controls */}
            <div className="flex justify-end gap-2 pt-2 print:hidden">
              <Button type="button" variant="outline" onClick={() => setReceiptModalOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                onClick={() => window.print()}
                className="bg-indigo-950 hover:bg-indigo-900 text-white flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                {t("payments.printReceipt")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
export default PaymentsListPage;

