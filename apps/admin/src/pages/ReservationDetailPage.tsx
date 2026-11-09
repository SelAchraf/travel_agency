import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.js";
import { apiClient } from "../lib/api.js";
import { Button } from "../components/ui/Button.js";
import { Input } from "../components/ui/Input.js";
import { Badge, type BadgeVariant } from "../components/ui/Badge.js";
import { Card } from "../components/ui/Card.js";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table.js";
import { Modal } from "../components/ui/Modal.js";
import {
  formatDZD,
  dinarsToCentimes,
  centimesToDinars,
  type ReservationStatus,
  type PaymentMethod,
} from "@travel-agency/shared";
import {
  CalendarCheck,
  ArrowLeft,
  ArrowRight,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Receipt,
  Printer,
  Plus,
  RefreshCw,
  Clock,
  Sparkles,
  Percent,
  RotateCcw,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

interface ReservationTraveller {
  id: string;
  fullName: string;
  dateOfBirth?: string | null;
  gender?: "male" | "female" | null;
  nationality: string;
  passportNumberEncrypted?: string | null;
  passportExpiryDate?: string | null;
  specialRequests?: string | null;
}

interface PaymentRecord {
  id: string;
  receiptNumber: string;
  amountCentimes: number;
  currency: string;
  paymentDate: string;
  method: PaymentMethod;
  referenceOrSlipNumber?: string | null;
  bankName?: string | null;
  notes?: string | null;
  isReversed: boolean;
  reversalReason?: string | null;
  recordedByUserName?: string | null;
  createdAt: string;
}

interface RefundRecord {
  id: string;
  refundNumber: string;
  amountCentimes: number;
  currency: string;
  refundDate: string;
  refundMethod: string;
  reason: string;
  processedByUserName?: string | null;
  createdAt: string;
}

interface StatusHistoryItem {
  status: ReservationStatus;
  changedByUserId: string;
  reason?: string;
  timestamp: string;
}

interface ReservationDetail {
  id: string;
  reference: string;
  customerId: string;
  customer: {
    id: string;
    fullName: string;
    phone: string;
    email?: string | null;
    preferredLanguage?: "ar" | "fr";
  };
  offerId: string;
  departureId?: string | null;
  offerSnapshot: {
    title: { ar: string; fr: string } | string;
    destinationName: { ar: string; fr: string } | string;
    departureDate: string;
    returnDate: string;
    durationDays: number;
    unitPriceCentimes: number;
    currency: string;
  };
  passengerCount: number;
  agreedTotalCentimes: number;
  discountCentimes: number;
  discountAuthorizedBy?: string | null;
  currentStatus: ReservationStatus;
  statusHistory: StatusHistoryItem[];
  specialRequirements?: string | null;
  internalNotes?: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  travellers: ReservationTraveller[];
  payments: PaymentRecord[];
  refunds: RefundRecord[];
  financial: {
    agreedTotalCentimes: number;
    totalPaidCentimes: number;
    totalRefundedCentimes: number;
    balanceCentimes: number;
    paymentStatus: "unpaid" | "partially_paid" | "paid" | "overpaid" | "refunded";
  };
}

export function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const isRtl = i18n.language === "ar";

  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status Change Dialog State
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<ReservationStatus>("pending");
  const [statusReason, setStatusReason] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Discount Modal State
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [newDiscountDinars, setNewDiscountDinars] = useState<number | "">(0);
  const [discountReason, setDiscountReason] = useState("");
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);

  // Record Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmountDinars, setPaymentAmountDinars] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentSlipRef, setPaymentSlipRef] = useState("");
  const [paymentBankName, setPaymentBankName] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Reversal Modal State
  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [selectedPaymentForReversal, setSelectedPaymentForReversal] = useState<PaymentRecord | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [reversalLoading, setReversalLoading] = useState(false);
  const [reversalError, setReversalError] = useState<string | null>(null);

  // Refund Modal State
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundAmountDinars, setRefundAmountDinars] = useState<number | "">("");
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>("cash");
  const [refundReason, setRefundReason] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  // Official Printable Receipt Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<PaymentRecord | null>(null);

  // Add Traveller Modal State
  const [travellerModalOpen, setTravellerModalOpen] = useState(false);
  const [travellerName, setTravellerName] = useState("");
  const [travellerDob, setTravellerDob] = useState("");
  const [travellerGender, setTravellerGender] = useState<"male" | "female">("male");
  const [travellerPassport, setTravellerPassport] = useState("");
  const [travellerPassportExpiry, setTravellerPassportExpiry] = useState("");
  const [travellerSpecialReqs, setTravellerSpecialReqs] = useState("");
  const [travellerLoading, setTravellerLoading] = useState(false);
  const [travellerError, setTravellerError] = useState<string | null>(null);

  const fetchReservation = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiClient<{ success: boolean; data: ReservationDetail }>(`/admin/reservations/${id}`);
      setReservation(res.data);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement de la réservation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservation();
  }, [id]);

  // Open Status Change Modal
  const handleOpenStatusModal = (newStatus: ReservationStatus) => {
    setTargetStatus(newStatus);
    setStatusReason(
      newStatus === "confirmed"
        ? "Vérification des conditions de vente et des pièces d'identité effectuée"
        : newStatus === "cancelled"
        ? "Annulation demandée par le client"
        : ""
    );
    setStatusError(null);
    setStatusModalOpen(true);
  };

  // Submit Status Change
  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setStatusLoading(true);
    setStatusError(null);
    try {
      await apiClient(`/admin/reservations/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: targetStatus,
          reason: statusReason.trim() || undefined,
        }),
      });
      setStatusModalOpen(false);
      await fetchReservation();
    } catch (err: any) {
      setStatusError(err.message || "Impossible de mettre à jour le statut");
    } finally {
      setStatusLoading(false);
    }
  };

  // Submit Discount
  const handleDiscountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const discountCentimes = dinarsToCentimes(Number(newDiscountDinars) || 0);
    setDiscountLoading(true);
    setDiscountError(null);
    try {
      await apiClient(`/admin/reservations/${id}/discount`, {
        method: "PATCH",
        body: JSON.stringify({
          discountCentimes,
          reason: discountReason.trim(),
        }),
      });
      setDiscountModalOpen(false);
      await fetchReservation();
    } catch (err: any) {
      setDiscountError(err.message || "Erreur lors de l'application de la remise");
    } finally {
      setDiscountLoading(false);
    }
  };

  // Submit Payment
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const amountCentimes = dinarsToCentimes(Number(paymentAmountDinars) || 0);
    if (amountCentimes <= 0) {
      setPaymentError("Le montant doit être supérieur à zéro");
      return;
    }

    setPaymentLoading(true);
    setPaymentError(null);
    try {
      const res = await apiClient<{ success: boolean; data: PaymentRecord }>(`/admin/reservations/${id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amountCentimes,
          method: paymentMethod,
          referenceOrSlipNumber: paymentSlipRef.trim() || undefined,
          bankName: paymentBankName.trim() || undefined,
          notes: paymentNotes.trim() || undefined,
        }),
      });
      setPaymentModalOpen(false);
      await fetchReservation();
      // Show official receipt right away
      setActiveReceipt(res.data);
      setReceiptModalOpen(true);
    } catch (err: any) {
      setPaymentError(err.message || "Erreur lors de l'enregistrement du règlement");
    } finally {
      setPaymentLoading(false);
    }
  };

  // Submit Reversal
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
      await fetchReservation();
    } catch (err: any) {
      setReversalError(err.message || "Erreur lors de l'annulation du règlement");
    } finally {
      setReversalLoading(false);
    }
  };

  // Submit Refund
  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const amountCentimes = dinarsToCentimes(Number(refundAmountDinars) || 0);
    if (amountCentimes <= 0) {
      setRefundError("Le montant de remboursement doit être supérieur à zéro");
      return;
    }

    setRefundLoading(true);
    setRefundError(null);
    try {
      await apiClient(`/admin/reservations/${id}/refunds`, {
        method: "POST",
        body: JSON.stringify({
          amountCentimes,
          refundMethod,
          reason: refundReason.trim(),
        }),
      });
      setRefundModalOpen(false);
      await fetchReservation();
    } catch (err: any) {
      setRefundError(err.message || "Erreur lors du remboursement");
    } finally {
      setRefundLoading(false);
    }
  };

  const getStatusBadge = (status: ReservationStatus) => {
    const config: Record<ReservationStatus, { variant: BadgeVariant; label: string }> = {
      pending: { variant: "pending", label: t("reservations.statusPending") },
      awaiting_documents: { variant: "indigo", label: t("reservations.statusAwaitingDocs") },
      awaiting_payment: { variant: "warning", label: t("reservations.statusAwaitingPayment") },
      confirmed: { variant: "success", label: t("reservations.statusConfirmed") },
      cancelled: { variant: "cancelled", label: t("reservations.statusCancelled") },
      completed: { variant: "completed", label: t("reservations.statusCompleted") },
    };
    const c = config[status] || { variant: "neutral", label: status };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const getPaymentBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case "paid":
        return <Badge variant="success">{t("reservations.payPaid")}</Badge>;
      case "partially_paid":
        return <Badge variant="warning">{t("reservations.payPartiallyPaid")}</Badge>;
      case "overpaid":
        return <Badge variant="indigo">{t("reservations.payOverpaid")}</Badge>;
      case "refunded":
        return <Badge variant="cancelled">{t("reservations.payRefunded")}</Badge>;
      case "unpaid":
      default:
        return <Badge variant="destructive">{t("reservations.payUnpaid")}</Badge>;
    }
  };

  const getMethodLabel = (m: PaymentMethod) => {
    switch (m) {
      case "cash":
        return t("payments.methodCash");
      case "bank_transfer":
        return t("payments.methodBankTransfer");
      case "cheque":
        return t("payments.methodCheque");
      case "cib_edahabia_manual":
        return t("payments.methodCibEdahabia");
      default:
        return m;
    }
  };

  const getOfferTitleText = (title: { ar: string; fr: string } | string) => {
    if (typeof title === "object" && title !== null) {
      return isRtl ? title.ar || title.fr : title.fr || title.ar;
    }
    return String(title);
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-sand-500">
        <RefreshCw className="w-8 h-8 animate-spin text-terracotta-500" />
        <span className="text-sm font-medium">{t("common.loading")}</span>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="p-8 text-center bg-white border border-sand-200 rounded-xl space-y-4">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-indigo-950">Dossier introuvable</h2>
        <p className="text-sm text-sand-600">{error || "Cette réservation n'existe pas ou a été déplacée."}</p>
        <Link to="/admin/reservations">
          <Button variant="outline" className="mt-2">
            Retour à la liste
          </Button>
        </Link>
      </div>
    );
  }

  const { financial, offerSnapshot, customer } = reservation;
  const paidPercent =
    financial.agreedTotalCentimes > 0
      ? Math.min(100, Math.round((financial.totalPaidCentimes / financial.agreedTotalCentimes) * 100))
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Bar with Back and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/reservations"
            className="p-2 rounded-lg text-sand-600 hover:text-indigo-950 hover:bg-sand-100 transition-colors"
          >
            {isRtl ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-mono text-indigo-950 tracking-tight">
                {reservation.reference}
              </h1>
              {getStatusBadge(reservation.currentStatus)}
              {getPaymentBadge(financial.paymentStatus)}
            </div>
            <p className="text-xs text-sand-500 mt-0.5">
              Créé le {new Date(reservation.createdAt).toLocaleDateString(isRtl ? "ar-DZ" : "fr-DZ")}
            </p>
          </div>
        </div>

        {/* Workflow Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Transitions */}
          {reservation.currentStatus === "pending" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenStatusModal("awaiting_documents")}
                className="text-xs"
              >
                {t("reservations.statusAwaitingDocs")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenStatusModal("awaiting_payment")}
                className="text-xs"
              >
                {t("reservations.statusAwaitingPayment")}
              </Button>
            </>
          )}

          {reservation.currentStatus === "awaiting_documents" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenStatusModal("awaiting_payment")}
              className="text-xs"
            >
              {t("reservations.statusAwaitingPayment")}
            </Button>
          )}

          {/* Confirm Booking: Requires reservations:confirm */}
          {hasPermission("reservations:confirm") &&
            reservation.currentStatus !== "confirmed" &&
            reservation.currentStatus !== "cancelled" &&
            reservation.currentStatus !== "completed" && (
              <Button
                size="sm"
                onClick={() => handleOpenStatusModal("confirmed")}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                {t("reservations.confirmBooking")}
              </Button>
            )}

          {/* Complete Booking */}
          {reservation.currentStatus === "confirmed" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenStatusModal("completed")}
              className="text-xs text-indigo-950 hover:bg-indigo-50"
            >
              {t("reservations.statusCompleted")}
            </Button>
          )}

          {/* Cancel Booking */}
          {reservation.currentStatus !== "cancelled" && reservation.currentStatus !== "completed" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenStatusModal("cancelled")}
              className="text-xs text-red-600 hover:bg-red-50 hover:border-red-200"
            >
              <XCircle className="w-3.5 h-3.5 me-1" />
              {t("reservations.cancelBooking")}
            </Button>
          )}

          {/* Record Payment Button */}
          {hasPermission("payments:write") && reservation.currentStatus !== "cancelled" && (
            <Button
              size="sm"
              onClick={() => {
                setPaymentAmountDinars(centimesToDinars(financial.balanceCentimes > 0 ? financial.balanceCentimes : 0));
                setPaymentModalOpen(true);
              }}
              className="text-xs bg-terracotta-600 hover:bg-terracotta-700 text-white flex items-center gap-1.5 shadow-sm"
            >
              <CreditCard className="w-4 h-4" />
              {t("payments.recordPayment")}
            </Button>
          )}
        </div>
      </div>

      {/* Offer Frozen Snapshot Banner (Rule: immutable snapshot) */}
      <Card className="p-4 bg-gradient-to-r from-sand-100/90 via-sand-50 to-white border border-sand-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-terracotta-600 bg-terracotta-50 px-2 py-0.5 rounded border border-terracotta-200">
                {t("reservations.offerSnapshot")}
              </span>
              <span className="text-xs text-sand-500 font-medium">
                {offerSnapshot.durationDays} jours / {offerSnapshot.durationDays - 1} nuits
              </span>
            </div>
            <h2 className="text-lg font-bold text-indigo-950">{getOfferTitleText(offerSnapshot.title)}</h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-sand-700">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-terracotta-500" />
                {getOfferTitleText(offerSnapshot.destinationName)}
              </span>
              <span className="flex items-center gap-1 font-mono">
                <Calendar className="w-3.5 h-3.5 text-terracotta-500" />
                {new Date(offerSnapshot.departureDate).toLocaleDateString(isRtl ? "ar-DZ" : "fr-DZ")} ➔{" "}
                {new Date(offerSnapshot.returnDate).toLocaleDateString(isRtl ? "ar-DZ" : "fr-DZ")}
              </span>
            </div>
          </div>

          <div className="text-end bg-white/80 p-3 rounded-lg border border-sand-200/60 shadow-xs">
            <span className="text-xs text-sand-500 block">{t("reservations.unitPrice")}</span>
            <span className="text-base font-bold text-indigo-950 font-mono">
              {formatDZD(offerSnapshot.unitPriceCentimes, isRtl ? "ar" : "fr")}
            </span>
            <span className="text-[11px] text-sand-600 block">
              × {reservation.passengerCount} {t("reservations.passengers").toLowerCase()}
            </span>
          </div>
        </div>
      </Card>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Financial Progress, Payments, Travellers, History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Financial Breakdown Card */}
          <Card className="p-5 bg-white border border-sand-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-terracotta-600" />
                {t("reservations.financialSummary")}
              </h3>
              {hasPermission("reservations:discount") && reservation.currentStatus !== "cancelled" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewDiscountDinars(centimesToDinars(reservation.discountCentimes));
                    setDiscountModalOpen(true);
                  }}
                  className="text-xs h-7 gap-1"
                >
                  <Percent className="w-3 h-3 text-terracotta-600" />
                  {t("reservations.applyDiscount")}
                </Button>
              )}
            </div>

            {/* Financial Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-sand-50 rounded-lg">
                <span className="text-[11px] text-sand-500 block">{t("reservations.totalAmount")}</span>
                <span className="text-sm font-bold text-indigo-950 font-mono">
                  {formatDZD(financial.agreedTotalCentimes, isRtl ? "ar" : "fr")}
                </span>
                {reservation.discountCentimes > 0 && (
                  <span className="text-[10px] text-amber-700 block mt-0.5">
                    (Remise: {formatDZD(reservation.discountCentimes, isRtl ? "ar" : "fr")})
                  </span>
                )}
              </div>

              <div className="p-3 bg-emerald-50 rounded-lg">
                <span className="text-[11px] text-emerald-800 block">{t("reservations.paidAmount")}</span>
                <span className="text-sm font-bold text-emerald-900 font-mono">
                  {formatDZD(financial.totalPaidCentimes, isRtl ? "ar" : "fr")}
                </span>
              </div>

              <div className="p-3 bg-sand-50 rounded-lg">
                <span className="text-[11px] text-sand-500 block">{t("payments.refund")}</span>
                <span className="text-sm font-bold text-sand-700 font-mono">
                  {formatDZD(financial.totalRefundedCentimes, isRtl ? "ar" : "fr")}
                </span>
              </div>

              <div
                className={`p-3 rounded-lg ${
                  financial.balanceCentimes > 0 ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-900"
                }`}
              >
                <span className="text-[11px] block opacity-80">{t("reservations.balanceRemaining")}</span>
                <span className="text-base font-bold font-mono">
                  {formatDZD(financial.balanceCentimes, isRtl ? "ar" : "fr")}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs font-semibold text-sand-600">
                <span>Règlement du dossier</span>
                <span>{paidPercent}% payé</span>
              </div>
              <div className="w-full bg-sand-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    paidPercent >= 100
                      ? "bg-emerald-500"
                      : paidPercent > 0
                      ? "bg-amber-500"
                      : "bg-sand-300"
                  }`}
                  style={{ width: `${paidPercent}%` }}
                />
              </div>
            </div>
          </Card>

          {/* Payments & Official Receipts Journal */}
          <Card className="overflow-hidden border border-sand-200 bg-white shadow-sm">
            <div className="p-4 border-b border-sand-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-terracotta-600" />
                <h3 className="text-sm font-bold text-indigo-950">
                  {t("payments.title")} ({reservation.payments.length})
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {hasPermission("payments:refund") &&
                  financial.totalPaidCentimes - financial.totalRefundedCentimes > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRefundAmountDinars("");
                        setRefundModalOpen(true);
                      }}
                      className="text-xs h-8 text-sand-700 hover:text-indigo-950"
                    >
                      <RotateCcw className="w-3.5 h-3.5 me-1 text-terracotta-600" />
                      {t("payments.refund")}
                    </Button>
                  )}

                {hasPermission("payments:write") && reservation.currentStatus !== "cancelled" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setPaymentAmountDinars(
                        centimesToDinars(financial.balanceCentimes > 0 ? financial.balanceCentimes : 0)
                      );
                      setPaymentModalOpen(true);
                    }}
                    className="text-xs h-8 bg-terracotta-600 hover:bg-terracotta-700 text-white flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t("payments.recordPayment")}
                  </Button>
                )}
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-sand-50/80">
                  <TableHead className="text-xs">{t("payments.receiptNumber")}</TableHead>
                  <TableHead className="text-xs">{t("payments.amount")}</TableHead>
                  <TableHead className="text-xs">{t("payments.method")}</TableHead>
                  <TableHead className="text-xs">{t("payments.referenceOrSlip")}</TableHead>
                  <TableHead className="text-xs">{t("payments.recordedBy")}</TableHead>
                  <TableHead className="text-xs">{t("payments.paymentDate")}</TableHead>
                  <TableHead className="text-xs text-end">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservation.payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-sand-500 text-xs">
                      {t("payments.emptyList")}
                    </TableCell>
                  </TableRow>
                ) : (
                  reservation.payments.map((p) => (
                    <TableRow key={p.id} className={p.isReversed ? "bg-red-50/40 opacity-70" : ""}>
                      <TableCell className="font-mono font-bold text-xs text-indigo-950">
                        {p.receiptNumber}
                        {p.isReversed && (
                          <span className="ms-2 text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                            {t("payments.reversed")}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="font-mono font-bold text-xs text-indigo-950">
                        <span className={p.isReversed ? "line-through text-sand-400" : ""}>
                          {formatDZD(p.amountCentimes, isRtl ? "ar" : "fr")}
                        </span>
                      </TableCell>

                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-[11px]">
                          {getMethodLabel(p.method)}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs font-mono text-sand-600">
                        {p.referenceOrSlipNumber || "—"}
                      </TableCell>

                      <TableCell className="text-xs text-sand-600">{p.recordedByUserName || "Agent"}</TableCell>

                      <TableCell className="text-xs font-mono text-sand-600">
                        {new Date(p.paymentDate).toLocaleDateString(isRtl ? "ar-DZ" : "fr-DZ")}
                      </TableCell>

                      <TableCell className="text-end space-x-1">
                        {/* Printable Receipt */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setActiveReceipt(p);
                            setReceiptModalOpen(true);
                          }}
                          className="h-7 px-2 text-xs text-indigo-950 hover:bg-sand-100"
                          title={t("payments.printReceipt")}
                        >
                          <Printer className="w-3.5 h-3.5 text-terracotta-600" />
                        </Button>

                        {/* Reversal Action */}
                        {!p.isReversed && hasPermission("payments:write") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPaymentForReversal(p);
                              setReversalReason("");
                              setReversalModalOpen(true);
                            }}
                            className="h-7 px-2 text-xs text-red-600 hover:bg-red-50"
                            title={t("payments.reversePayment")}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Travellers Registry Card */}
          <Card className="overflow-hidden border border-sand-200 bg-white shadow-sm">
            <div className="p-4 border-b border-sand-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-terracotta-600" />
                <h3 className="text-sm font-bold text-indigo-950">
                  {t("reservations.travellers")} ({reservation.travellers.length} / {reservation.passengerCount})
                </h3>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-sand-50/80">
                  <TableHead className="text-xs">#</TableHead>
                  <TableHead className="text-xs">{t("customers.fullName")}</TableHead>
                  <TableHead className="text-xs">{t("customers.dateOfBirth")}</TableHead>
                  <TableHead className="text-xs">{t("customers.gender")}</TableHead>
                  <TableHead className="text-xs">{t("customers.nationality")}</TableHead>
                  <TableHead className="text-xs">{t("customers.passportNumber")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservation.travellers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-sand-500 text-xs">
                      Aucun voyageur individuel enregistré.
                    </TableCell>
                  </TableRow>
                ) : (
                  reservation.travellers.map((trv, idx) => (
                    <TableRow key={trv.id}>
                      <TableCell className="text-xs font-bold text-sand-500">{idx + 1}</TableCell>
                      <TableCell className="text-xs font-semibold text-indigo-950">{trv.fullName}</TableCell>
                      <TableCell className="text-xs font-mono text-sand-600">
                        {trv.dateOfBirth
                          ? new Date(trv.dateOfBirth).toLocaleDateString(isRtl ? "ar-DZ" : "fr-DZ")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {trv.gender === "male"
                          ? t("customers.male")
                          : trv.gender === "female"
                          ? t("customers.female")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{trv.nationality || "DZ"}</TableCell>
                      <TableCell className="text-xs font-mono text-sand-700">
                        {trv.passportNumberEncrypted ? "••••••••••••" : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Status Progression Timeline */}
          <Card className="p-5 bg-white border border-sand-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
              <Clock className="w-4 h-4 text-terracotta-600" />
              {t("reservations.history")}
            </h3>

            <div className="space-y-3 pt-2">
              {reservation.statusHistory.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs border-s-2 border-sand-200 ps-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(item.status)}
                      <span className="font-mono text-sand-400 text-[11px]">
                        {new Date(item.timestamp).toLocaleString(isRtl ? "ar-DZ" : "fr-DZ")}
                      </span>
                    </div>
                    {item.reason && <p className="text-sand-700 mt-1 italic">{item.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column (1 col): Customer Card, Special Req, Meta */}
        <div className="space-y-6">
          {/* Customer Profile Card */}
          <Card className="p-5 bg-white border border-sand-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                <User className="w-4 h-4 text-terracotta-600" />
                {t("reservations.customer")}
              </h3>
              <Link to={`/admin/customers/${customer.id}`}>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-terracotta-600 hover:text-terracotta-700 p-1">
                  <ExternalLink className="w-3.5 h-3.5 me-1" />
                  Dossier
                </Button>
              </Link>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-sand-500 block text-[11px]">{t("customers.fullName")}</span>
                <span className="font-bold text-indigo-950 text-sm">{customer.fullName}</span>
              </div>

              <div>
                <span className="text-sand-500 block text-[11px]">{t("customers.phone")}</span>
                <a
                  href={`tel:${customer.phone}`}
                  className="font-mono font-bold text-terracotta-700 hover:underline flex items-center gap-1"
                  dir="ltr"
                >
                  <Phone className="w-3 h-3 text-sand-400" />
                  {customer.phone}
                </a>
              </div>

              {customer.email && (
                <div>
                  <span className="text-sand-500 block text-[11px]">{t("customers.email")}</span>
                  <a
                    href={`mailto:${customer.email}`}
                    className="font-mono text-indigo-950 hover:underline flex items-center gap-1"
                  >
                    <Mail className="w-3 h-3 text-sand-400" />
                    {customer.email}
                  </a>
                </div>
              )}
            </div>
          </Card>

          {/* Special Requirements */}
          {reservation.specialRequirements && (
            <Card className="p-5 bg-amber-50/50 border border-amber-200 shadow-sm space-y-2">
              <h3 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                {t("reservations.specialRequirements")}
              </h3>
              <p className="text-xs text-amber-950 whitespace-pre-wrap">{reservation.specialRequirements}</p>
            </Card>
          )}

          {/* Internal Information */}
          <Card className="p-5 bg-sand-50 border border-sand-200 shadow-sm space-y-3 text-xs text-sand-600">
            <h4 className="font-bold text-indigo-950">Informations de conformité</h4>
            <div className="space-y-1">
              <div>
                Référence : <span className="font-mono font-bold text-indigo-950">{reservation.reference}</span>
              </div>
              <div>
                Devise légale : <span className="font-bold text-indigo-950">Dinar Algérien (DZD)</span>
              </div>
              <div>
                Calcul de solde : <span className="text-indigo-950 font-medium">Contrôlé strictement côté serveur</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal: Status Change */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={t("reservations.status")}
        className="max-w-md"
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          {statusError && (
            <div className="p-3 bg-red-50 text-red-800 text-xs rounded-lg border border-red-200">
              {statusError}
            </div>
          )}

          <div className="p-3 bg-sand-50 rounded-lg text-xs space-y-1">
            <span className="text-sand-500">Nouveau statut cible :</span>
            <div>{getStatusBadge(targetStatus)}</div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-indigo-950">
              {targetStatus === "cancelled" ? t("reservations.cancellationReason") : "Motif / Commentaire"}
            </label>
            <Input
              type="text"
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="Ex: Confirmation après paiement de l'acompte..."
              required={targetStatus === "cancelled"}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setStatusModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={statusLoading} className="bg-terracotta-600 text-white">
              {statusLoading ? t("common.loading") : t("common.save")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Discount */}
      <Modal
        isOpen={discountModalOpen}
        onClose={() => setDiscountModalOpen(false)}
        title={t("reservations.applyDiscount")}
        className="max-w-md"
      >
        <form onSubmit={handleDiscountSubmit} className="space-y-4">
          {discountError && (
            <div className="p-3 bg-red-50 text-red-800 text-xs rounded-lg border border-red-200">
              {discountError}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-indigo-950">{t("reservations.discountAmount")}</label>
            <Input
              type="number"
              min="0"
              value={newDiscountDinars}
              onChange={(e) =>
                setNewDiscountDinars(e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value, 10) || 0))
              }
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-indigo-950">{t("reservations.discountReason")}</label>
            <Input
              type="text"
              value={discountReason}
              onChange={(e) => setDiscountReason(e.target.value)}
              placeholder="Ex: Geste commercial fidélité famille..."
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDiscountModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={discountLoading} className="bg-terracotta-600 text-white">
              {discountLoading ? t("common.loading") : t("common.save")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Record Payment */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={t("payments.recordPayment")}
        className="max-w-lg"
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          {paymentError && (
            <div className="p-3 bg-red-50 text-red-800 text-xs rounded-lg border border-red-200">
              {paymentError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-indigo-950">{t("payments.amountDa")} *</label>
              <Input
                type="number"
                min="100"
                value={paymentAmountDinars}
                onChange={(e) =>
                  setPaymentAmountDinars(e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value, 10) || 0))
                }
                placeholder="Montant en dinars..."
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-indigo-950">{t("payments.method")} *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full h-10 px-3 rounded-lg border border-sand-200 bg-white text-sm text-indigo-950 focus:outline-none focus:ring-2 focus:ring-terracotta-500"
              >
                <option value="cash">{t("payments.methodCash")}</option>
                <option value="bank_transfer">{t("payments.methodBankTransfer")}</option>
                <option value="cheque">{t("payments.methodCheque")}</option>
                <option value="cib_edahabia_manual">{t("payments.methodCibEdahabia")}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-indigo-950">{t("payments.referenceOrSlip")}</label>
              <Input
                type="text"
                placeholder="N° Chèque ou N° Virement"
                value={paymentSlipRef}
                onChange={(e) => setPaymentSlipRef(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-indigo-950">{t("payments.bankName")}</label>
              <Input
                type="text"
                placeholder="Ex: BNA, BEA, CCP..."
                value={paymentBankName}
                onChange={(e) => setPaymentBankName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-indigo-950">Notes de caisse</label>
            <Input
              type="text"
              placeholder="Remarques complémentaires..."
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setPaymentModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={paymentLoading} className="bg-terracotta-600 text-white">
              {paymentLoading ? t("common.loading") : t("payments.recordPayment")}
            </Button>
          </div>
        </form>
      </Modal>

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
              placeholder="Ex: Erreur de saisie de caisse, chèque rejeté..."
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

      {/* Modal: Refund */}
      <Modal
        isOpen={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        title={t("payments.refund")}
        className="max-w-md"
      >
        <form onSubmit={handleRefundSubmit} className="space-y-4">
          {refundError && (
            <div className="p-3 bg-red-50 text-red-800 text-xs rounded-lg border border-red-200">
              {refundError}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-indigo-950">{t("payments.refundAmount")} *</label>
            <Input
              type="number"
              min="100"
              value={refundAmountDinars}
              onChange={(e) =>
                setRefundAmountDinars(e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value, 10) || 0))
              }
              placeholder="Montant à restituer..."
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-indigo-950">{t("payments.refundReason")} *</label>
            <Input
              type="text"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Ex: Remboursement suite annulation voyage..."
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setRefundModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={refundLoading} className="bg-terracotta-600 text-white">
              {refundLoading ? t("common.loading") : t("payments.refund")}
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
              id="printable-receipt"
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
                  <span className="font-bold text-indigo-950">{customer.fullName}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-sand-200">
                  <span className="text-sand-600">{t("payments.forBooking")} :</span>
                  <span className="font-mono font-bold text-indigo-950">{reservation.reference}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-sand-200">
                  <span className="text-sand-600">{t("reservations.offer")} :</span>
                  <span className="font-medium text-indigo-950">{getOfferTitleText(offerSnapshot.title)}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-sand-200">
                  <span className="text-sand-600">{t("payments.method")} :</span>
                  <span className="font-medium text-indigo-950">{getMethodLabel(activeReceipt.method)}</span>
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
export default ReservationDetailPage;

