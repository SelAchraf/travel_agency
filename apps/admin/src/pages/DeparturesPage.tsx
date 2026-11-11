import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.js";
import { apiClient } from "../lib/api.js";
import { Card, CardHeader, CardTitle } from "../components/ui/Card.js";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table.js";
import { Badge } from "../components/ui/Badge.js";
import { Button } from "../components/ui/Button.js";
import { Input } from "../components/ui/Input.js";
import { Modal } from "../components/ui/Modal.js";
import { formatDZD } from "@travel-agency/shared";
import {
  Compass,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  FileSpreadsheet,
  Download,
  ShieldAlert,
  Search,
  Filter,
  Printer,
  ChevronRight,
  Clock,
} from "lucide-react";

interface DepartureItem {
  id: string;
  offerId: string;
  offerTitle: { ar: string; fr: string };
  offerSlug: string;
  departureDate: string;
  returnDate: string;
  maxCapacity: number;
  bookedPlaces: number;
  waitingListCount: number;
  status: "open" | "closed" | "completed" | "cancelled";
  occupancyPercent: number;
  managerOverrides: Array<{
    overriddenByUserId: string;
    extraPlaces: number;
    reason: string;
    timestamp: string;
  }>;
}

interface ManifestData {
  departure: {
    id: string;
    offerTitle: { ar: string; fr: string };
    departureDate: string;
    returnDate: string;
    maxCapacity: number;
    bookedPlaces: number;
    status: string;
  };
  passengerCount: number;
  reservationsCount: number;
  manifest: Array<{
    travellerId: string;
    fullName: string;
    dateOfBirth?: string | null;
    isPrimaryContact: boolean;
    hasPassport: boolean;
    passportExpiryDate?: string | null;
    roomAllocation?: string | null;
    reservationId: string;
    reservationReference: string;
    customerName: string;
    customerPhone: string;
    reservationStatus: string;
    isFullyPaid: boolean;
    balanceCentimes: number;
  }>;
}

export function DeparturesPage() {
  const { t, i18n } = useTranslation();
  const { hasPermission } = useAuth();
  const isRtl = i18n.language === "ar";

  const [departuresList, setDeparturesList] = useState<DepartureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Manifest Modal State
  const [manifestModalOpen, setManifestModalOpen] = useState(false);
  const [manifestData, setManifestData] = useState<ManifestData | null>(null);
  const [manifestLoading, setManifestLoading] = useState(false);

  // Capacity Override Modal State
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedDeparture, setSelectedDeparture] = useState<DepartureItem | null>(null);
  const [extraPlaces, setExtraPlaces] = useState(2);
  const [overrideReason, setOverrideReason] = useState("");
  const [overriding, setOverriding] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const fetchDepartures = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;

      const res = await apiClient<{ success: boolean; data: DepartureItem[] }>("/admin/departures", {
        params,
      });
      if (res.success && res.data) {
        setDeparturesList(res.data);
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des départs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartures();
  }, [statusFilter]);

  const handleOpenManifest = async (departureId: string) => {
    setManifestModalOpen(true);
    setManifestLoading(true);
    try {
      const res = await apiClient<{ success: boolean; data: ManifestData }>(
        `/admin/departures/${departureId}/manifest`
      );
      if (res.success && res.data) {
        setManifestData(res.data);
      }
    } catch (err: any) {
      alert(err.message || "Impossible de charger le manifeste");
      setManifestModalOpen(false);
    } finally {
      setManifestLoading(false);
    }
  };

  const handleStatusChange = async (departureId: string, newStatus: string) => {
    try {
      await apiClient(`/admin/departures/${departureId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      fetchDepartures();
    } catch (err: any) {
      alert(err.message || "Erreur de mise à jour du statut");
    }
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeparture) return;
    if (!overrideReason.trim()) {
      setOverrideError("Le motif de dérogation est obligatoire");
      return;
    }

    setOverriding(true);
    setOverrideError(null);
    try {
      await apiClient(`/admin/departures/${selectedDeparture.id}/override`, {
        method: "PATCH",
        body: JSON.stringify({
          extraPlaces,
          reason: overrideReason.trim(),
        }),
      });
      setOverrideModalOpen(false);
      setSelectedDeparture(null);
      setOverrideReason("");
      fetchDepartures();
    } catch (err: any) {
      setOverrideError(err.message || "Échec de l'application de la dérogation");
    } finally {
      setOverriding(false);
    }
  };

  const getLocalizedTitle = (titleObj?: { ar: string; fr: string } | null) => {
    if (!titleObj) return "";
    return isRtl ? titleObj.ar || titleObj.fr : titleObj.fr || titleObj.ar;
  };

  const filteredDepartures = departuresList.filter((dep) => {
    if (!searchQuery) return true;
    const title = getLocalizedTitle(dep.offerTitle).toLowerCase();
    return title.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-indigo-950 flex items-center gap-2">
            <Compass className="w-7 h-7 text-terracotta-600" />
            {t("departures.title")}
          </h1>
          <p className="text-sand-600 text-sm mt-1">{t("departures.subtitle")}</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-sand-400 absolute top-3 left-3 pointer-events-none" />
            <Input
              type="text"
              placeholder={t("common.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-9 rounded-lg border border-sand-300 bg-white px-3 py-1.5 text-xs text-indigo-950 focus:border-terracotta-500 focus:outline-none"
            >
              <option value="">{t("departures.status")} (Tous)</option>
              <option value="open">open (Ouvert)</option>
              <option value="closed">closed (Fermé)</option>
              <option value="completed">completed (Terminé)</option>
              <option value="cancelled">cancelled (Annulé)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Departures Table */}
      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-terracotta-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sand-600 text-sm font-medium">{t("common.loading")}</p>
          </div>
        ) : filteredDepartures.length === 0 ? (
          <div className="py-20 text-center">
            <Compass className="w-12 h-12 text-sand-300 mx-auto mb-3" />
            <p className="text-sand-600 text-sm">{t("departures.emptyList")}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-sand-50/70">
                <TableHead>Offre de voyage</TableHead>
                <TableHead>Date Départ</TableHead>
                <TableHead>Date Retour</TableHead>
                <TableHead>Capacité</TableHead>
                <TableHead>Inscrits</TableHead>
                <TableHead>Remplissage</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDepartures.map((dep) => {
                const isFull = dep.occupancyPercent >= 100;
                const isNear = dep.occupancyPercent >= 80;
                const hasOverrides = dep.managerOverrides && dep.managerOverrides.length > 0;

                return (
                  <TableRow key={dep.id} className="hover:bg-sand-50/50">
                    <TableCell>
                      <div>
                        <p className="font-semibold text-xs text-indigo-950">
                          {getLocalizedTitle(dep.offerTitle)}
                        </p>
                        {hasOverrides && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-medium">
                            <ShieldAlert className="w-3 h-3 text-amber-600" />
                            Dérogation ({dep.managerOverrides.length})
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-sand-700 font-mono">
                      {new Date(dep.departureDate).toLocaleDateString(isRtl ? "ar-DZ" : "fr-DZ")}
                    </TableCell>

                    <TableCell className="text-xs text-sand-700 font-mono">
                      {new Date(dep.returnDate).toLocaleDateString(isRtl ? "ar-DZ" : "fr-DZ")}
                    </TableCell>

                    <TableCell className="text-xs font-mono font-semibold">
                      {dep.maxCapacity}
                    </TableCell>

                    <TableCell className="text-xs font-mono font-bold text-indigo-950">
                      {dep.bookedPlaces}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2 w-28">
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
                      <select
                        value={dep.status}
                        onChange={(e) => handleStatusChange(dep.id, e.target.value)}
                        className="h-7 text-[11px] rounded border border-sand-300 bg-white px-2 py-0.5 text-indigo-950 font-medium"
                      >
                        <option value="open">Ouvert (open)</option>
                        <option value="closed">Fermé (closed)</option>
                        <option value="completed">Terminé (completed)</option>
                        <option value="cancelled">Annulé (cancelled)</option>
                      </select>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenManifest(dep.id)}
                          className="h-7 px-2.5 text-xs text-indigo-950 flex items-center gap-1.5"
                          title={t("departures.viewManifest")}
                        >
                          <Users className="w-3.5 h-3.5 text-indigo-700" />
                          <span>{t("departures.viewManifest")}</span>
                        </Button>

                        {hasPermission("departures:capacity_override") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedDeparture(dep);
                              setOverrideModalOpen(true);
                            }}
                            className="h-7 px-2 text-xs text-amber-700 hover:text-amber-900 border-amber-300 hover:bg-amber-50"
                            title={t("departures.overrideCapacity")}
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Passenger Manifest Modal */}
      <Modal
        isOpen={manifestModalOpen}
        onClose={() => setManifestModalOpen(false)}
        title={t("departures.manifestTitle")}
      >
        <div className="space-y-4">
          {manifestLoading ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sand-600 text-xs">{t("common.loading")}</p>
            </div>
          ) : manifestData ? (
            <>
              {/* Manifest Header Summary */}
              <div className="p-3 bg-sand-50 rounded-lg border border-sand-200 text-xs flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-sm text-indigo-950">
                    {getLocalizedTitle(manifestData.departure.offerTitle)}
                  </p>
                  <p className="text-sand-600 mt-0.5">
                    Départ : {new Date(manifestData.departure.departureDate).toLocaleDateString("fr-DZ")} →
                    Retour : {new Date(manifestData.departure.returnDate).toLocaleDateString("fr-DZ")}
                  </p>
                </div>
                <div className="flex items-center gap-3 font-mono font-semibold">
                  <span className="text-indigo-900">
                    {manifestData.passengerCount} / {manifestData.departure.maxCapacity} passagers
                  </span>
                  <Badge variant={manifestData.departure.status === "open" ? "success" : "secondary"}>
                    {manifestData.departure.status}
                  </Badge>
                </div>
              </div>

              {/* Manifest Passengers Table */}
              <div className="max-h-[350px] overflow-y-auto border border-sand-200 rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-sand-50/80 text-[11px]">
                      <TableHead>{t("departures.paxName")}</TableHead>
                      <TableHead>{t("departures.roomType")}</TableHead>
                      <TableHead>{t("departures.passportStatus")}</TableHead>
                      <TableHead>{t("departures.bookingRef")}</TableHead>
                      <TableHead>{t("departures.contactPerson")}</TableHead>
                      <TableHead className="text-right">{t("departures.paymentBalance")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {manifestData.manifest.map((pax) => (
                      <TableRow key={pax.travellerId} className="text-xs">
                        <TableCell className="font-semibold text-indigo-950">
                          {pax.fullName}
                          {pax.isPrimaryContact && (
                            <span className="text-[10px] text-terracotta-600 ml-1.5 font-normal">
                              (Contact)
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="text-sand-600 uppercase text-[11px]">
                          {pax.roomAllocation || "Standard"}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={pax.hasPassport ? "success" : "warning"}
                            className="text-[10px]"
                          >
                            {pax.hasPassport ? t("departures.passportUploaded") : t("departures.passportMissing")}
                          </Badge>
                        </TableCell>

                        <TableCell className="font-mono text-indigo-900 text-[11px]">
                          {pax.reservationReference}
                        </TableCell>

                        <TableCell className="text-sand-600 text-[11px]">
                          <p>{pax.customerName}</p>
                          <p className="text-sand-400 font-mono">{pax.customerPhone}</p>
                        </TableCell>

                        <TableCell className="text-right">
                          {pax.isFullyPaid ? (
                            <span className="text-emerald-700 font-bold text-[11px]">
                              {t("departures.fullyPaid")}
                            </span>
                          ) : (
                            <span className="text-amber-700 font-bold text-[11px]">
                              {formatDZD(pax.balanceCentimes, isRtl ? "ar" : "fr")}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 text-xs text-indigo-950"
                >
                  <Printer className="w-3.5 h-3.5" />
                  {t("departures.exportManifest")}
                </Button>
                <Button size="sm" onClick={() => setManifestModalOpen(false)}>
                  {t("common.cancel")}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </Modal>

      {/* Capacity Override Modal */}
      <Modal
        isOpen={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        title={t("departures.overrideCapacity")}
      >
        <form onSubmit={handleOverrideSubmit} className="space-y-4 text-xs">
          {overrideError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{overrideError}</span>
            </div>
          )}

          {selectedDeparture && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-1">
              <p className="font-bold">{getLocalizedTitle(selectedDeparture.offerTitle)}</p>
              <p>Capacité actuelle : {selectedDeparture.maxCapacity} places ({selectedDeparture.bookedPlaces} déjà réservées)</p>
            </div>
          )}

          <div>
            <label className="block font-semibold text-indigo-950 mb-1">
              {t("departures.extraPlaces")} *
            </label>
            <Input
              type="number"
              min={1}
              max={20}
              value={extraPlaces}
              onChange={(e) => setExtraPlaces(parseInt(e.target.value, 10) || 1)}
              required
              className="text-xs h-9"
            />
          </div>

          <div>
            <label className="block font-semibold text-indigo-950 mb-1">
              {t("departures.overrideReason")} *
            </label>
            <textarea
              rows={3}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Ex : Ajout d'un minibus ou renfort logistique autorisé par le directeur..."
              required
              className="w-full rounded-lg border border-sand-300 p-2.5 text-xs text-indigo-950 focus:border-terracotta-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-sand-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOverrideModalOpen(false)}
              disabled={overriding}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={overriding}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {overriding ? t("common.loading") : t("departures.overrideCapacity")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
export default DeparturesPage;

