import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  RESERVATION_STATUSES,
  type ReservationStatus,
} from "@travel-agency/shared";
import {
  CalendarCheck,
  Search,
  Plus,
  RefreshCw,
  Eye,
  AlertTriangle,
  User,
  MapPin,
  Calendar,
  CreditCard,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";

interface ReservationItem {
  id: string;
  reference: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  offerId: string;
  offerTitle: { ar: string; fr: string } | string;
  departureId?: string | null;
  departureDate?: string | null;
  returnDate?: string | null;
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
  totalPaidCentimes: number;
  totalRefundedCentimes: number;
  balanceCentimes: number;
  paymentStatus: "unpaid" | "partially_paid" | "paid" | "overpaid" | "refunded";
  currentStatus: ReservationStatus;
  createdAt: string;
}

interface DepartureOption {
  id: string;
  departureDate: string;
  returnDate: string;
  maxCapacity: number;
  bookedPlaces: number;
  status: string;
}

interface CustomerOption {
  id: string;
  fullName: string;
  phone: string;
}

interface OfferOption {
  id: string;
  title: { ar: string; fr: string };
  basePriceCentimes: number;
}

export function ReservationsListPage() {
  const { t, i18n } = useTranslation();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const isRtl = i18n.language === "ar";

  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("");

  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Modal data pickers
  const [customersList, setCustomersList] = useState<CustomerOption[]>([]);
  const [offersList, setOffersList] = useState<OfferOption[]>([]);
  const [departuresList, setDeparturesList] = useState<DepartureOption[]>([]);
  const [loadingDepartures, setLoadingDepartures] = useState(false);

  // Form Fields
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [selectedDepartureId, setSelectedDepartureId] = useState("");
  const [passengerCount, setPassengerCount] = useState(1);
  const [discountDinars, setDiscountDinars] = useState<number | "">(0);
  const [specialRequirements, setSpecialRequirements] = useState("");
  const [overrideCapacity, setOverrideCapacity] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  // Travellers inside modal
  const [travellers, setTravellers] = useState<
    { fullName: string; dateOfBirth?: string; gender?: "male" | "female"; passportNumber?: string }[]
  >([]);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const res = await apiClient<{
        success: boolean;
        reservations: ReservationItem[];
        pagination: { total: number; page: number; limit: number };
      }>("/admin/reservations", {
        params: {
          page,
          limit,
          search: search || undefined,
          status: statusFilter || undefined,
          paymentStatus: paymentStatusFilter || undefined,
        },
      });
      setReservations(res.reservations || []);
      setTotalCount(res.pagination?.total || 0);
    } catch (err) {
      console.error("Failed to load reservations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [page, statusFilter, paymentStatusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchReservations();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Load Customers and Offers for Modal
  const openCreateModal = async () => {
    setCreateModalOpen(true);
    setCreateError(null);
    setSelectedCustomerId("");
    setSelectedOfferId("");
    setSelectedDepartureId("");
    setDeparturesList([]);
    setPassengerCount(1);
    setDiscountDinars(0);
    setSpecialRequirements("");
    setOverrideCapacity(false);
    setOverrideReason("");
    setTravellers([{ fullName: "" }]);

    try {
      const [custRes, offRes] = await Promise.all([
        apiClient<{ success: boolean; customers: CustomerOption[] }>("/admin/customers", {
          params: { limit: 100 },
        }),
        apiClient<{ success: boolean; data: OfferOption[] }>("/admin/offers", {
          params: { limit: 100 },
        }),
      ]);
      setCustomersList(custRes.customers || []);
      setOffersList(offRes.data || []);
    } catch (err) {
      console.error("Failed to preload create form options:", err);
    }
  };

  // When offer is picked, load its departures
  const handleOfferChange = async (offerId: string) => {
    setSelectedOfferId(offerId);
    setSelectedDepartureId("");
    setDeparturesList([]);
    if (!offerId) return;

    setLoadingDepartures(true);
    try {
      const res = await apiClient<{ success: boolean; data: { departures: DepartureOption[] } }>(
        `/admin/offers/${offerId}`
      );
      setDeparturesList(res.data?.departures || []);
    } catch (err) {
      console.error("Failed to load offer departures:", err);
    } finally {
      setLoadingDepartures(false);
    }
  };

  // Selected Offer and Departure info
  const currentOffer = offersList.find((o) => o.id === selectedOfferId);
  const currentDeparture = departuresList.find((d) => d.id === selectedDepartureId);

  // Available seats calculation
  const availableSeats = currentDeparture
    ? Math.max(0, currentDeparture.maxCapacity - currentDeparture.bookedPlaces)
    : null;
  const isOverCapacity = availableSeats !== null && passengerCount > availableSeats;

  // Live price calculation
  const unitPriceCentimes = currentOffer ? currentOffer.basePriceCentimes : 0;
  const grossTotalCentimes = unitPriceCentimes * passengerCount;
  const discountCentimes = Math.max(0, dinarsToCentimes(Number(discountDinars) || 0));
  const agreedTotalCentimes = Math.max(0, grossTotalCentimes - discountCentimes);

  // Synchronize travellers length with passenger count
  useEffect(() => {
    const count = Math.max(1, passengerCount);
    setTravellers((prev) => {
      const copy = [...prev];
      while (copy.length < count) {
        copy.push({ fullName: "" });
      }
      return copy.slice(0, count);
    });
  }, [passengerCount]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedOfferId) {
      setCreateError("Veuillez sélectionner un client et une offre de voyage.");
      return;
    }

    if (isOverCapacity && !overrideCapacity) {
      setCreateError(
        t("reservations.overrideRequiredWarning") ||
          "La capacité disponible est insuffisante. Une dérogation est requise."
      );
      return;
    }

    if (overrideCapacity && (!overrideReason || overrideReason.trim().length < 5)) {
      setCreateError("Veuillez préciser le motif de la dérogation de capacité (au moins 5 caractères).");
      return;
    }

    setCreateLoading(true);
    setCreateError(null);

    try {
      const validTravellers = travellers
        .filter((t) => t.fullName.trim().length > 0)
        .map((t) => ({
          fullName: t.fullName.trim(),
          dateOfBirth: t.dateOfBirth || undefined,
          gender: t.gender || undefined,
          nationality: "DZ",
          passportNumber: t.passportNumber?.trim() || undefined,
        }));

      const payload = {
        customerId: selectedCustomerId,
        offerId: selectedOfferId,
        departureId: selectedDepartureId || undefined,
        passengerCount,
        discountCentimes,
        specialRequirements: specialRequirements.trim() || undefined,
        overrideCapacity: isOverCapacity ? overrideCapacity : false,
        overrideReason: isOverCapacity && overrideCapacity ? overrideReason.trim() : undefined,
        travellers: validTravellers.length > 0 ? validTravellers : undefined,
      };

      const res = await apiClient<{ success: boolean; data: ReservationItem }>("/admin/reservations", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setCreateModalOpen(false);
      navigate(`/admin/reservations/${res.data.id}`);
    } catch (err: any) {
      setCreateError(err.message || "Erreur lors de la création de la réservation");
    } finally {
      setCreateLoading(false);
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

  const getOfferTitleText = (title: { ar: string; fr: string } | string) => {
    if (typeof title === "object" && title !== null) {
      return isRtl ? title.ar || title.fr : title.fr || title.ar;
    }
    return String(title);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-indigo-950 flex items-center gap-2">
            <CalendarCheck className="w-7 h-7 text-terracotta-600" />
            {t("reservations.title")}
          </h1>
          <p className="text-sm text-sand-600 mt-1">{t("reservations.subtitle")}</p>
        </div>

        {hasPermission("reservations:write") && (
          <Button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-terracotta-600 hover:bg-terracotta-700 text-white shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t("reservations.newReservation")}
          </Button>
        )}
      </div>

      {/* Filters Bar */}
      <Card className="p-4 bg-white border border-sand-200 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-sand-400 absolute top-3 start-3" />
            <Input
              type="text"
              placeholder={t("reservations.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 px-3 rounded-lg border border-sand-200 bg-white text-sm text-indigo-950 focus:outline-none focus:ring-2 focus:ring-terracotta-500"
            >
              <option value="">{t("reservations.allStatuses")}</option>
              {RESERVATION_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {t(`reservations.status${st.charAt(0).toUpperCase() + st.slice(1).replace(/_([a-z])/g, (_, l) => l.toUpperCase())}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <select
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 px-3 rounded-lg border border-sand-200 bg-white text-sm text-indigo-950 focus:outline-none focus:ring-2 focus:ring-terracotta-500"
            >
              <option value="">{t("reservations.allPaymentStatuses")}</option>
              <option value="unpaid">{t("reservations.payUnpaid")}</option>
              <option value="partially_paid">{t("reservations.payPartiallyPaid")}</option>
              <option value="paid">{t("reservations.payPaid")}</option>
              <option value="overpaid">{t("reservations.payOverpaid")}</option>
              <option value="refunded">{t("reservations.payRefunded")}</option>
            </select>
          </div>

          {/* Refresh Action */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => fetchReservations()}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="text-xs">{t("common.loading") === "Chargement..." ? "Actualiser" : "تحديث"}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Reservations Table */}
      <Card className="overflow-hidden border border-sand-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-sand-50/80">
              <TableHead className="font-semibold text-xs text-sand-700">{t("reservations.reference")}</TableHead>
              <TableHead className="font-semibold text-xs text-sand-700">{t("reservations.customer")}</TableHead>
              <TableHead className="font-semibold text-xs text-sand-700">{t("reservations.offer")}</TableHead>
              <TableHead className="font-semibold text-xs text-sand-700">{t("reservations.passengers")}</TableHead>
              <TableHead className="font-semibold text-xs text-sand-700">{t("reservations.totalAmount")}</TableHead>
              <TableHead className="font-semibold text-xs text-sand-700">{t("reservations.balanceRemaining")}</TableHead>
              <TableHead className="font-semibold text-xs text-sand-700">{t("reservations.status")}</TableHead>
              <TableHead className="font-semibold text-xs text-sand-700">{t("reservations.paymentStatus")}</TableHead>
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
            ) : reservations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-sand-500">
                  <CalendarCheck className="w-10 h-10 mx-auto text-sand-300 mb-2" />
                  <p className="text-sm font-medium">{t("reservations.emptyList")}</p>
                </TableCell>
              </TableRow>
            ) : (
              reservations.map((res) => {
                const offerTitle = getOfferTitleText(res.offerSnapshot?.title || res.offerTitle);
                const destTitle = getOfferTitleText(res.offerSnapshot?.destinationName || "");

                return (
                  <TableRow key={res.id} className="hover:bg-sand-50/50 transition-colors">
                    {/* Reference */}
                    <TableCell className="font-mono font-bold text-xs text-indigo-950">
                      <Link
                        to={`/admin/reservations/${res.id}`}
                        className="hover:text-terracotta-600 underline decoration-sand-300 underline-offset-2"
                      >
                        {res.reference}
                      </Link>
                    </TableCell>

                    {/* Customer */}
                    <TableCell>
                      <Link
                        to={`/admin/customers/${res.customerId}`}
                        className="font-medium text-sm text-indigo-950 hover:text-terracotta-600 block"
                      >
                        {res.customerName}
                      </Link>
                      <span className="text-xs text-sand-500 font-mono" dir="ltr">
                        {res.customerPhone}
                      </span>
                    </TableCell>

                    {/* Offer & Destination */}
                    <TableCell>
                      <div className="text-xs font-semibold text-indigo-950 max-w-[200px] truncate" title={offerTitle}>
                        {offerTitle}
                      </div>
                      {destTitle && (
                        <div className="text-[11px] text-terracotta-700 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-terracotta-500 shrink-0" />
                          <span>{destTitle}</span>
                        </div>
                      )}
                    </TableCell>

                    {/* Passengers */}
                    <TableCell className="text-center text-xs font-semibold text-indigo-950">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-sand-100 text-sand-800">
                        {res.passengerCount}
                      </span>
                    </TableCell>

                    {/* Agreed Total */}
                    <TableCell className="text-xs font-bold text-indigo-950 font-mono whitespace-nowrap">
                      {formatDZD(res.agreedTotalCentimes, isRtl ? "ar" : "fr")}
                    </TableCell>

                    {/* Balance */}
                    <TableCell className="text-xs font-bold font-mono whitespace-nowrap">
                      <span className={res.balanceCentimes > 0 ? "text-amber-700" : "text-emerald-700"}>
                        {formatDZD(res.balanceCentimes, isRtl ? "ar" : "fr")}
                      </span>
                    </TableCell>

                    {/* Dossier Status */}
                    <TableCell>{getStatusBadge(res.currentStatus)}</TableCell>

                    {/* Payment Status */}
                    <TableCell>{getPaymentBadge(res.paymentStatus)}</TableCell>

                    {/* Action */}
                    <TableCell className="text-end">
                      <Link to={`/admin/reservations/${res.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-sand-600 hover:text-indigo-950">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        {totalCount > limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-sand-200 bg-sand-50/50 text-xs text-sand-600">
            <div>
              Total : <span className="font-bold text-indigo-950">{totalCount}</span> dossiers
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

      {/* Modal: Nouvelle Réservation */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={t("reservations.newReservation")}
        className="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {createError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{createError}</span>
            </div>
          )}

          {/* Notice: Snapshot Rule */}
          <div className="p-3 bg-sand-50 border border-sand-200 rounded-lg text-xs text-sand-700 flex items-start gap-2">
            <Info className="w-4 h-4 text-saffron-600 shrink-0 mt-0.5" />
            <span>{t("reservations.frozenPriceNotice")}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer Picker */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-indigo-950 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-sand-500" />
                {t("reservations.customer")} *
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-lg border border-sand-200 bg-white text-sm text-indigo-950 focus:outline-none focus:ring-2 focus:ring-terracotta-500"
              >
                <option value="">{t("reservations.selectCustomer")}</option>
                {customersList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            {/* Offer Picker */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-indigo-950 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-sand-500" />
                {t("reservations.offer")} *
              </label>
              <select
                value={selectedOfferId}
                onChange={(e) => handleOfferChange(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-lg border border-sand-200 bg-white text-sm text-indigo-950 focus:outline-none focus:ring-2 focus:ring-terracotta-500"
              >
                <option value="">{t("reservations.selectOffer")}</option>
                {offersList.map((o) => (
                  <option key={o.id} value={o.id}>
                    {getOfferTitleText(o.title)} — {formatDZD(o.basePriceCentimes, isRtl ? "ar" : "fr")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Departure Picker */}
          {selectedOfferId && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-indigo-950 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-sand-500" />
                {t("reservations.departure")}
              </label>
              {loadingDepartures ? (
                <div className="text-xs text-sand-500 py-2 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-terracotta-500" />
                  {t("common.loading")}
                </div>
              ) : departuresList.length === 0 ? (
                <div className="text-xs text-sand-500 italic py-1">{t("reservations.noDepartures")}</div>
              ) : (
                <select
                  value={selectedDepartureId}
                  onChange={(e) => setSelectedDepartureId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-sand-200 bg-white text-sm text-indigo-950 focus:outline-none focus:ring-2 focus:ring-terracotta-500"
                >
                  <option value="">{t("reservations.selectDeparture")}</option>
                  {departuresList.map((d) => {
                    const seatsLeft = Math.max(0, d.maxCapacity - d.bookedPlaces);
                    const depDate = new Date(d.departureDate).toLocaleDateString(isRtl ? "ar-DZ" : "fr-DZ");
                    const retDate = new Date(d.returnDate).toLocaleDateString(isRtl ? "ar-DZ" : "fr-DZ");
                    return (
                      <option key={d.id} value={d.id}>
                        {depDate} ➔ {retDate} ({seatsLeft} places disponibles sur {d.maxCapacity})
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          )}

          {/* Passenger count and Capacity Alert */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-indigo-950">
                {t("reservations.passengerCount")} *
              </label>
              <Input
                type="number"
                min="1"
                max="50"
                value={passengerCount}
                onChange={(e) => setPassengerCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                required
              />
            </div>

            {/* Discount if permitted */}
            {hasPermission("reservations:discount") && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-indigo-950 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-sand-500" />
                  {t("reservations.discountAmount")}
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={discountDinars}
                  onChange={(e) =>
                    setDiscountDinars(e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value, 10) || 0))
                  }
                />
              </div>
            )}
          </div>

          {/* Capacity Overrun Warning and Manager Override */}
          {isOverCapacity && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg space-y-3">
              <div className="flex items-start gap-2 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">{t("reservations.capacityExceeded")}</span>
                  <p className="mt-0.5">
                    Places restantes : {availableSeats} — Demandées : {passengerCount}
                  </p>
                </div>
              </div>

              {hasPermission("departures:capacity_override") ? (
                <div className="space-y-2 pt-2 border-t border-amber-200">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-indigo-950">
                    <input
                      type="checkbox"
                      checked={overrideCapacity}
                      onChange={(e) => setOverrideCapacity(e.target.checked)}
                      className="rounded border-sand-300 text-terracotta-600 focus:ring-terracotta-500 w-4 h-4"
                    />
                    <ShieldAlert className="w-4 h-4 text-terracotta-600" />
                    {t("reservations.capacityOverride")}
                  </label>

                  {overrideCapacity && (
                    <div className="space-y-1 ps-6">
                      <Input
                        type="text"
                        placeholder={t("reservations.overrideReason")}
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        required
                        className="text-xs"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-red-700 font-medium">
                  Seul un responsable habilité (Directeur ou Manager) peut accorder une dérogation de capacité pour ce
                  départ.
                </p>
              )}
            </div>
          )}

          {/* Live Price Summary Box */}
          {currentOffer && (
            <div className="p-3 rounded-lg bg-indigo-950 text-white space-y-2">
              <div className="flex justify-between text-xs text-sand-300">
                <span>{t("reservations.unitPrice")} :</span>
                <span className="font-mono">{formatDZD(unitPriceCentimes, isRtl ? "ar" : "fr")}</span>
              </div>
              <div className="flex justify-between text-xs text-sand-300">
                <span>{t("reservations.baseTotal")} :</span>
                <span className="font-mono">{formatDZD(grossTotalCentimes, isRtl ? "ar" : "fr")}</span>
              </div>
              {discountCentimes > 0 && (
                <div className="flex justify-between text-xs text-saffron-400">
                  <span>{t("reservations.discount")} :</span>
                  <span className="font-mono">- {formatDZD(discountCentimes, isRtl ? "ar" : "fr")}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-indigo-800">
                <span>{t("reservations.totalAmount")} :</span>
                <span className="text-saffron-400 font-mono text-base">
                  {formatDZD(agreedTotalCentimes, isRtl ? "ar" : "fr")}
                </span>
              </div>
            </div>
          )}

          {/* Special Requirements */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-indigo-950">{t("reservations.specialRequirements")}</label>
            <textarea
              rows={2}
              value={specialRequirements}
              onChange={(e) => setSpecialRequirements(e.target.value)}
              placeholder="Ex: chambre individuelle, régime sans sel, assistance aéroport..."
              className="w-full px-3 py-2 rounded-lg border border-sand-200 text-xs focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
            />
          </div>

          {/* Travellers quick names */}
          <div className="space-y-2 pt-2 border-t border-sand-200">
            <span className="text-xs font-semibold text-indigo-950">{t("reservations.travellers")}</span>
            <div className="space-y-2 max-h-36 overflow-y-auto pe-1">
              {travellers.map((trv, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-sand-500 w-6">#{idx + 1}</span>
                  <Input
                    type="text"
                    placeholder={`Nom & Prénom passager ${idx + 1}`}
                    value={trv.fullName}
                    onChange={(e) => {
                      const copy = [...travellers];
                      copy[idx].fullName = e.target.value;
                      setTravellers(copy);
                    }}
                    className="text-xs h-8"
                  />
                  <Input
                    type="text"
                    placeholder="N° Passeport (optionnel)"
                    value={trv.passportNumber || ""}
                    onChange={(e) => {
                      const copy = [...travellers];
                      copy[idx].passportNumber = e.target.value;
                      setTravellers(copy);
                    }}
                    className="text-xs h-8 w-44"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-sand-200">
            <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={createLoading || (isOverCapacity && !overrideCapacity)}
              className="bg-terracotta-600 hover:bg-terracotta-700 text-white"
            >
              {createLoading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t("common.loading")}</span>
                </div>
              ) : (
                t("reservations.newReservation")
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
export default ReservationsListPage;

