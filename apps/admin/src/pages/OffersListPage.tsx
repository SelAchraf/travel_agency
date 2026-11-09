import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.js";
import { apiClient } from "../lib/api.js";
import { Button } from "../components/ui/Button.js";
import { Input } from "../components/ui/Input.js";
import { Badge } from "../components/ui/Badge.js";
import { Card } from "../components/ui/Card.js";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table.js";
import { Modal } from "../components/ui/Modal.js";
import { formatDZD, dinarsToCentimes } from "@travel-agency/shared";
import {
  Plus,
  Search,
  Calendar,
  Users,
  MapPin,
  CheckCircle,
  EyeOff,
  Eye,
  Archive,
  AlertCircle,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

interface Destination {
  id: string;
  slug: string;
  name: { ar: string; fr: string };
  wilayaOrCountry: string;
}

interface Departure {
  id: string;
  offerId: string;
  departureDate: string;
  returnDate: string;
  maxCapacity: number;
  bookedPlaces: number;
  availablePlaces?: number;
  status: string;
  managerOverrides?: Array<{
    overriddenByUserId: string;
    extraPlaces: number;
    reason: string;
    timestamp: string;
  }>;
}

interface TravelOffer {
  id: string;
  slug: string;
  title: { ar: string; fr: string };
  destinationId: string;
  destinationName?: { ar: string; fr: string };
  destinationWilayaOrCountry?: string;
  tripType: "guided_tour" | "trekking" | "beach_stay" | "umrah" | "custom_group";
  durationDays: number;
  durationNights: number;
  basePriceCentimes: number;
  isPublished: boolean;
  isArchived: boolean;
  photos: Array<{ url: string; caption?: { ar: string; fr: string }; isCover: boolean }>;
  departures?: Departure[];
  createdAt: string;
}

export function OffersListPage() {
  const { t, i18n } = useTranslation();
  const { hasPermission } = useAuth();
  const isRtl = i18n.language === "ar";

  const [offers, setOffers] = useState<TravelOffer[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tripTypeFilter, setTripTypeFilter] = useState("");
  const [destinationFilter, setDestinationFilter] = useState("");

  // New Offer Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newTitleFr, setNewTitleFr] = useState("");
  const [newTitleAr, setNewTitleAr] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDestinationId, setNewDestinationId] = useState("");
  const [newTripType, setNewTripType] = useState<TravelOffer["tripType"]>("guided_tour");
  const [newDurationDays, setNewDurationDays] = useState(5);
  const [newDurationNights, setNewDurationNights] = useState(4);
  const [newBasePriceDA, setNewBasePriceDA] = useState(45000);
  const [newHotelFr, setNewHotelFr] = useState("");
  const [newHotelAr, setNewHotelAr] = useState("");
  const [newTransportFr, setNewTransportFr] = useState("");
  const [newTransportAr, setNewTransportAr] = useState("");
  const [newCoverUrl, setNewCoverUrl] = useState("");

  // Manage Departures Modal
  const [departuresModalOpen, setDeparturesModalOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<TravelOffer | null>(null);
  const [offerDepartures, setOfferDepartures] = useState<Departure[]>([]);
  const [departuresLoading, setDeparturesLoading] = useState(false);
  const [newDepDate, setNewDepDate] = useState("");
  const [newRetDate, setNewRetDate] = useState("");
  const [newCapacity, setNewCapacity] = useState(20);
  const [addingDeparture, setAddingDeparture] = useState(false);

  // Capacity Override State
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideDeparture, setOverrideDeparture] = useState<Departure | null>(null);
  const [extraPlaces, setExtraPlaces] = useState(2);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const fetchDestinations = async () => {
    try {
      const res = await apiClient<{ success: boolean; data: Destination[] }>("/admin/destinations");
      if (res.data) setDestinations(res.data);
    } catch (err) {
      console.error("Failed to fetch destinations:", err);
    }
  };

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const res = await apiClient<{ success: boolean; offers: TravelOffer[] }>("/admin/offers", {
        params: {
          search: search || undefined,
          tripType: tripTypeFilter || undefined,
          destinationId: destinationFilter || undefined,
          limit: 50,
        },
      });
      setOffers(res.offers || []);
    } catch (err) {
      console.error("Failed to fetch offers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
  }, []);

  useEffect(() => {
    fetchOffers();
  }, [search, tripTypeFilter, destinationFilter]);

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    try {
      await apiClient("/admin/offers", {
        method: "POST",
        body: JSON.stringify({
          slug: newSlug.trim() || newTitleFr.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          title: { fr: newTitleFr.trim(), ar: newTitleAr.trim() },
          destinationId: newDestinationId,
          tripType: newTripType,
          durationDays: Number(newDurationDays),
          durationNights: Number(newDurationNights),
          basePriceCentimes: dinarsToCentimes(Number(newBasePriceDA)),
          currency: "DZD",
          pricingBasis: "per_person",
          availabilityStatus: "available",
          hotelDetails: { fr: newHotelFr.trim() || "Hôtel partenaire", ar: newHotelAr.trim() || "فندق شريك" },
          transportDetails: { fr: newTransportFr.trim() || "Transport climatisé", ar: newTransportAr.trim() || "نقل مكيف" },
          itinerary: [
            {
              dayNumber: 1,
              title: { fr: "Accueil et installation", ar: "الاستقبال والتسكين" },
              description: { fr: "Arrivée et transfert à l'hébergement.", ar: "الوصول والانتقال إلى مكان الإقامة." },
            },
          ],
          inclusions: {
            fr: ["Hébergement en pension complète", "Excursions au programme"],
            ar: ["الإقامة مع الوجبات الكاملة", "الرحلات والجولات المبرمجة"],
          },
          exclusions: {
            fr: ["Dépenses personnelles", "Boissons non comprises"],
            ar: ["المصاريف الشخصية", "المشروبات غير المشمولة"],
          },
          photos: newCoverUrl ? [{ url: newCoverUrl.trim(), isCover: true }] : [],
          isPublished: false,
        }),
      });

      setCreateModalOpen(false);
      // Reset form
      setNewTitleFr("");
      setNewTitleAr("");
      setNewSlug("");
      setNewCoverUrl("");
      fetchOffers();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create offer");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleTogglePublish = async (offer: TravelOffer) => {
    try {
      await apiClient(`/admin/offers/${offer.id}/publish`, {
        method: "PATCH",
        body: JSON.stringify({ isPublished: !offer.isPublished }),
      });
      fetchOffers();
    } catch (err) {
      console.error("Failed to toggle publish status:", err);
    }
  };

  const handleArchiveOffer = async (offer: TravelOffer) => {
    if (!window.confirm("Êtes-vous sûr de vouloir archiver cette offre ?")) return;
    try {
      await apiClient(`/admin/offers/${offer.id}/archive`, {
        method: "PATCH",
        body: JSON.stringify({ isArchived: !offer.isArchived }),
      });
      fetchOffers();
    } catch (err) {
      console.error("Failed to archive offer:", err);
    }
  };

  const openDeparturesModal = async (offer: TravelOffer) => {
    setSelectedOffer(offer);
    setDeparturesModalOpen(true);
    setDeparturesLoading(true);

    try {
      const res = await apiClient<{ success: boolean; data: TravelOffer }>(`/public/offers/${offer.slug}`);
      setOfferDepartures(res.data.departures || []);
    } catch {
      setOfferDepartures(offer.departures || []);
    } finally {
      setDeparturesLoading(false);
    }
  };

  const handleAddDeparture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOffer || !newDepDate || !newRetDate) return;

    setAddingDeparture(true);
    try {
      const res = await apiClient<{ success: boolean; data: Departure }>(`/admin/offers/${selectedOffer.id}/departures`, {
        method: "POST",
        body: JSON.stringify({
          offerId: selectedOffer.id,
          departureDate: new Date(newDepDate).toISOString(),
          returnDate: new Date(newRetDate).toISOString(),
          maxCapacity: Number(newCapacity),
        }),
      });

      setOfferDepartures((prev) => [...prev, res.data]);
      setNewDepDate("");
      setNewRetDate("");
      fetchOffers();
    } catch (err) {
      console.error("Failed to add departure:", err);
    } finally {
      setAddingDeparture(false);
    }
  };

  const openOverrideModal = (dep: Departure) => {
    setOverrideDeparture(dep);
    setExtraPlaces(2);
    setOverrideReason("");
    setOverrideError(null);
    setOverrideModalOpen(true);
  };

  const handleOverrideCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideDeparture) return;

    setOverrideLoading(true);
    setOverrideError(null);

    try {
      const res = await apiClient<{ success: boolean; data: Departure }>(
        `/admin/offers/departures/${overrideDeparture.id}/override`,
        {
          method: "PATCH",
          body: JSON.stringify({
            extraPlaces: Number(extraPlaces),
            reason: overrideReason.trim(),
          }),
        }
      );

      // Update departure in modal list
      setOfferDepartures((prev) =>
        prev.map((d) => (d.id === overrideDeparture.id ? { ...d, ...res.data } : d))
      );
      setOverrideModalOpen(false);
      fetchOffers();
    } catch (err: any) {
      setOverrideError(err.message || "Échec de l'autorisation de dépassement");
    } finally {
      setOverrideLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-indigo-950 font-serif">{t("offers.title")}</h1>
          <p className="text-sm text-sand-600 mt-1">{t("offers.subtitle")}</p>
        </div>
        {hasPermission("offers:write") && (
          <Button onClick={() => setCreateModalOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>{t("offers.newOffer")}</span>
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className={`w-4 h-4 text-sand-400 absolute top-3 ${isRtl ? "left-3" : "right-3"}`} />
            <Input
              type="text"
              placeholder={t("common.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={isRtl ? "pl-9" : "pr-9"}
            />
          </div>

          <div>
            <select
              value={tripTypeFilter}
              onChange={(e) => setTripTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-sand-300 rounded-lg text-sm text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-900"
            >
              <option value="">Tous les types de voyage</option>
              <option value="guided_tour">Circuit guidé</option>
              <option value="trekking">Trekking & Aventure</option>
              <option value="beach_stay">Séjour balnéaire</option>
              <option value="umrah">Omra / Religieux</option>
              <option value="custom_group">Groupe sur mesure</option>
            </select>
          </div>

          <div>
            <select
              value={destinationFilter}
              onChange={(e) => setDestinationFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-sand-300 rounded-lg text-sm text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-900"
            >
              <option value="">Toutes les destinations</option>
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {isRtl ? d.name.ar : d.name.fr} ({d.wilayaOrCountry})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Offers Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("offers.titleFr")}</TableHead>
              <TableHead>{t("offers.destination")}</TableHead>
              <TableHead>{t("offers.tripType")}</TableHead>
              <TableHead>{t("offers.duration")}</TableHead>
              <TableHead>{t("offers.basePrice")}</TableHead>
              <TableHead>{t("offers.status")}</TableHead>
              <TableHead className="text-end">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-sand-500">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-terracotta-500" />
                    <span>{t("common.loading")}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : offers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-sand-500">
                  Aucune offre trouvée pour ces critères.
                </TableCell>
              </TableRow>
            ) : (
              offers.map((offer) => (
                <TableRow key={offer.id}>
                  <TableCell>
                    <div>
                      <span className="font-semibold text-indigo-950 block">
                        {isRtl ? offer.title.ar : offer.title.fr}
                      </span>
                      <span className="text-xs text-sand-500 font-mono">/{offer.slug}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-sand-700">
                      <MapPin className="w-3.5 h-3.5 text-terracotta-500" />
                      <span>
                        {offer.destinationName
                          ? isRtl
                            ? offer.destinationName.ar
                            : offer.destinationName.fr
                          : "Algérie"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {offer.tripType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {offer.durationDays}j / {offer.durationNights}n
                  </TableCell>
                  <TableCell className="font-bold text-sm text-terracotta-600 font-mono">
                    {formatDZD(offer.basePriceCentimes, isRtl ? "ar" : "fr")}
                  </TableCell>
                  <TableCell>
                    {offer.isArchived ? (
                      <Badge variant="secondary">{t("offers.archived")}</Badge>
                    ) : offer.isPublished ? (
                      <Badge variant="success">{t("offers.published")}</Badge>
                    ) : (
                      <Badge variant="warning">{t("offers.draft")}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Manage Departures Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDeparturesModal(offer)}
                        className="flex items-center gap-1 text-xs"
                      >
                        <Calendar className="w-3.5 h-3.5 text-saffron-600" />
                        <span>Départs</span>
                      </Button>

                      {/* Publish / Unpublish Toggle */}
                      {hasPermission("offers:publish") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleTogglePublish(offer)}
                          title={offer.isPublished ? t("offers.unpublish") : t("offers.publish")}
                        >
                          {offer.isPublished ? (
                            <EyeOff className="w-4 h-4 text-sand-500 hover:text-amber-600" />
                          ) : (
                            <Eye className="w-4 h-4 text-sand-500 hover:text-emerald-600" />
                          )}
                        </Button>
                      )}

                      {/* Archive Button */}
                      {hasPermission("offers:write") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleArchiveOffer(offer)}
                          title={t("offers.archive")}
                        >
                          <Archive className="w-4 h-4 text-sand-500 hover:text-terracotta-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* CREATE OFFER MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={t("offers.newOffer")}
      >
        <form onSubmit={handleCreateOffer} className="space-y-4">
          {createError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-sand-700 mb-1">
                {t("offers.titleFr")} *
              </label>
              <Input
                required
                value={newTitleFr}
                onChange={(e) => setNewTitleFr(e.target.value)}
                placeholder="Ex: Escapade Oasis Taghit 5 jours"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-sand-700 mb-1">
                {t("offers.titleAr")} *
              </label>
              <Input
                required
                dir="rtl"
                value={newTitleAr}
                onChange={(e) => setNewTitleAr(e.target.value)}
                placeholder="مثال: سحر واحة تاغيت 5 أيام"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-sand-700 mb-1">
                {t("offers.destination")} *
              </label>
              <select
                required
                value={newDestinationId}
                onChange={(e) => setNewDestinationId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-sand-300 rounded-lg text-sm text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-900"
              >
                <option value="">Sélectionner une destination</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {isRtl ? d.name.ar : d.name.fr} ({d.wilayaOrCountry})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-sand-700 mb-1">
                {t("offers.tripType")} *
              </label>
              <select
                value={newTripType}
                onChange={(e) => setNewTripType(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-sand-300 rounded-lg text-sm text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-900"
              >
                <option value="guided_tour">Circuit guidé</option>
                <option value="trekking">Trekking & Aventure</option>
                <option value="beach_stay">Séjour balnéaire</option>
                <option value="umrah">Omra / Religieux</option>
                <option value="custom_group">Groupe sur mesure</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-sand-700 mb-1">
                Jours *
              </label>
              <Input
                type="number"
                min={1}
                required
                value={newDurationDays}
                onChange={(e) => setNewDurationDays(parseInt(e.target.value, 10))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-sand-700 mb-1">
                Nuits *
              </label>
              <Input
                type="number"
                min={0}
                required
                value={newDurationNights}
                onChange={(e) => setNewDurationNights(parseInt(e.target.value, 10))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-sand-700 mb-1">
                Prix par pers. (DA) *
              </label>
              <Input
                type="number"
                min={0}
                required
                value={newBasePriceDA}
                onChange={(e) => setNewBasePriceDA(parseInt(e.target.value, 10))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-sand-700 mb-1">
              URL Photo de couverture (WebP / CDN)
            </label>
            <Input
              type="url"
              value={newCoverUrl}
              onChange={(e) => setNewCoverUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-sand-200">
            <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={createLoading}>
              {createLoading ? t("common.loading") : t("common.save")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MANAGE DEPARTURES MODAL */}
      <Modal
        isOpen={departuresModalOpen}
        onClose={() => setDeparturesModalOpen(false)}
        title={`Dates de départ & Capacités : ${selectedOffer ? (isRtl ? selectedOffer.title.ar : selectedOffer.title.fr) : ""}`}
      >
        <div className="space-y-6">
          {/* Add Departure Form */}
          {hasPermission("offers:write") && (
            <form onSubmit={handleAddDeparture} className="p-4 bg-sand-50 rounded-xl border border-sand-200 space-y-3">
              <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-terracotta-600" />
                <span>{t("offers.addDeparture")}</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-sand-600 mb-1">{t("offers.departureDate")}</label>
                  <Input
                    type="date"
                    required
                    value={newDepDate}
                    onChange={(e) => setNewDepDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-sand-600 mb-1">{t("offers.returnDate")}</label>
                  <Input
                    type="date"
                    required
                    value={newRetDate}
                    onChange={(e) => setNewRetDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-sand-600 mb-1">{t("offers.maxCapacity")}</label>
                  <Input
                    type="number"
                    min={1}
                    required
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(parseInt(e.target.value, 10))}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button size="sm" type="submit" disabled={addingDeparture}>
                  {addingDeparture ? t("common.loading") : t("offers.addDeparture")}
                </Button>
              </div>
            </form>
          )}

          {/* Departures List */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-indigo-950">Mouvements & Départs programmés</h4>
            {departuresLoading ? (
              <p className="text-xs text-sand-500">{t("common.loading")}</p>
            ) : offerDepartures.length === 0 ? (
              <p className="text-xs text-sand-500 py-4 text-center">Aucune date de départ programmée pour cette offre.</p>
            ) : (
              <div className="divide-y divide-sand-200 border border-sand-200 rounded-xl overflow-hidden">
                {offerDepartures.map((dep) => {
                  const available = dep.availablePlaces ?? Math.max(0, dep.maxCapacity - dep.bookedPlaces);
                  const isFull = available === 0;

                  return (
                    <div key={dep.id} className="p-3.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-indigo-950 font-mono">
                            {new Date(dep.departureDate).toLocaleDateString()} ➔ {new Date(dep.returnDate).toLocaleDateString()}
                          </span>
                          {isFull ? (
                            <Badge variant="destructive" className="text-[10px]">Complet</Badge>
                          ) : (
                            <Badge variant="success" className="text-[10px]">{available} places dispo</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-sand-600 mt-1">
                          <span>Capacité max : <strong>{dep.maxCapacity}</strong></span>
                          <span>Réservées : <strong>{dep.bookedPlaces}</strong></span>
                          {dep.managerOverrides && dep.managerOverrides.length > 0 && (
                            <span className="text-amber-700 font-medium">
                              (+{dep.managerOverrides.reduce((sum, o) => sum + o.extraPlaces, 0)} places sur dérogation)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Manager Capacity Override Button */}
                      {hasPermission("departures:capacity_override") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openOverrideModal(dep)}
                          className="flex items-center gap-1.5 text-xs border-amber-300 hover:bg-amber-50 text-amber-900"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                          <span>Dérogation</span>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* CAPACITY OVERRIDE MODAL */}
      <Modal
        isOpen={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        title={t("offers.overrideCapacity")}
      >
        <form onSubmit={handleOverrideCapacity} className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs leading-relaxed">
            <p className="font-semibold mb-1">Autorisation exceptionnelle de dépassement de quota :</p>
            <p>Conformément aux règles de gestion de l'agence, toute augmentation exceptionnelle de la capacité au-delà du quota fixé nécessite une autorisation tracée dans le journal d'audit immuable.</p>
          </div>

          {overrideError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{overrideError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-sand-700 mb-1">
              {t("offers.extraPlaces")} *
            </label>
            <Input
              type="number"
              min={1}
              max={50}
              required
              value={extraPlaces}
              onChange={(e) => setExtraPlaces(parseInt(e.target.value, 10))}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-sand-700 mb-1">
              {t("offers.overrideReason")} *
            </label>
            <textarea
              required
              rows={3}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Ex: Demande de réservation groupe VIP validée par le Directeur de l'agence."
              className="w-full px-3 py-2 bg-white border border-sand-300 rounded-lg text-sm text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-sand-200">
            <Button type="button" variant="outline" onClick={() => setOverrideModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={overrideLoading} className="bg-amber-600 hover:bg-amber-700 text-white">
              {overrideLoading ? t("common.loading") : "Valider la dérogation"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default OffersListPage;

