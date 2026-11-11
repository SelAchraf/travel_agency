import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, MapPin, Calendar, Filter, RefreshCw, X, ArrowUpRight } from "lucide-react";
import { Card } from "../components/ui/Card.js";
import { Badge } from "../components/ui/Badge.js";
import { Button } from "../components/ui/Button.js";
import { SEOHead } from "../components/common/SEOHead.js";
import { fetchOffers, type TravelOfferItem } from "../api/client.js";
import { formatDZD } from "@travel-agency/shared";

export function OffersPage() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isRtl = i18n.language === "ar";

  const [offers, setOffers] = useState<TravelOfferItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter values initialized from URL search params
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [destination, setDestination] = useState(searchParams.get("destination") || "");
  const [tripType, setTripType] = useState(searchParams.get("tripType") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");

  const loadOffers = async () => {
    setLoading(true);
    try {
      const res = await fetchOffers({
        search: search || undefined,
        tripType: tripType || undefined,
        maxPrice: maxPrice ? Number(maxPrice) * 100 : undefined, // Convert DA to centimes
        limit: 24,
      });

      let filtered = res.offers;
      // Filter by destination slug if specified
      if (destination) {
        filtered = filtered.filter(
          (o) => o.destinationName?.fr.toLowerCase().includes(destination.toLowerCase()) ||
                 o.destinationName?.ar.includes(destination)
        );
      }

      setOffers(filtered);
    } catch (err) {
      console.error("Failed to load offers catalogue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, [searchParams]);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (destination) params.destination = destination;
    if (tripType) params.tripType = tripType;
    if (maxPrice) params.maxPrice = maxPrice;
    setSearchParams(params);
  };

  const handleResetFilters = () => {
    setSearch("");
    setDestination("");
    setTripType("");
    setMaxPrice("");
    setSearchParams({});
  };

  const getOfferTitle = (title: { ar: string; fr: string } | string) => {
    if (typeof title === "object" && title !== null) {
      return isRtl ? title.ar || title.fr : title.fr || title.ar;
    }
    return String(title);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge variant="available">{t("common.available")}</Badge>;
      case "limited":
        return <Badge variant="limited">{t("common.limited")}</Badge>;
      case "sold_out":
        return <Badge variant="soldOut">{t("common.soldOut")}</Badge>;
      default:
        return <Badge variant="requestOnly">{t("common.requestOnly")}</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <SEOHead
        title={t("offers.title")}
        description={t("offers.subtitle")}
      />

      {/* Header */}
      <div className="max-w-3xl space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-terracotta-600 block">
          {t("common.agencyName")}
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold font-display text-indigo-950">
          {t("offers.title")}
        </h1>
        <p className="text-sm text-sand-600">{t("offers.subtitle")}</p>
      </div>

      {/* Filter Form Card */}
      <Card className="p-5 bg-white border border-sand-200 shadow-sm">
        <form onSubmit={handleApplyFilters} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-indigo-950 block">
                {t("common.search")}
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-sand-400 absolute top-3 start-3" />
                <input
                  type="text"
                  placeholder={t("offers.searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-10 ps-9 pe-3 rounded-xl border border-sand-200 text-xs text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-900"
                />
              </div>
            </div>

            {/* Destination Filter */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-indigo-950 block">
                {t("offers.filterDestination")}
              </label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-sand-200 bg-white text-xs text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-900"
              >
                <option value="">{t("common.allDestinations")}</option>
                <option value="djanet">Djanet & Tadrart Rouge (جانت)</option>
                <option value="timimoun">Timimoun (تيميمون)</option>
                <option value="constantine">Constantine (قسنطينة)</option>
                <option value="tipaza">Tipaza (تيبازة)</option>
                <option value="umrah">Omra (العمرة)</option>
              </select>
            </div>

            {/* Trip Type Filter */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-indigo-950 block">
                {t("offers.filterType")}
              </label>
              <select
                value={tripType}
                onChange={(e) => setTripType(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-sand-200 bg-white text-xs text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-900"
              >
                <option value="">{t("common.allTypes")}</option>
                <option value="trekking">{isRtl ? "مغامرة وتخييم صحراوي" : "Trekking Saharien"}</option>
                <option value="guided_tour">{isRtl ? "جولة سياحية وثقافية" : "Circuit Guidé Culturel"}</option>
                <option value="beach_stay">{isRtl ? "إقامة ساحلية واستجمام" : "Séjour Balnéaire"}</option>
                <option value="umrah">{isRtl ? "العمرة والزيارة" : "Omra & Pèlerinage"}</option>
              </select>
            </div>

            {/* Price Filter */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-indigo-950 block">
                {t("offers.filterPrice")} (DA)
              </label>
              <input
                type="number"
                placeholder="Ex: 150000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-sand-200 text-xs text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-sand-100">
            <span className="text-xs text-sand-500 font-medium">
              {offers.length} {isRtl ? "رحلة معروضة" : "voyages disponibles"}
            </span>

            <div className="flex items-center gap-2">
              {(search || destination || tripType || maxPrice) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-sand-500 hover:text-indigo-950 flex items-center gap-1 px-3 py-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{t("common.reset")}</span>
                </button>
              )}

              <Button type="submit" variant="primary" size="sm" className="px-5">
                <Filter className="w-3.5 h-3.5" />
                <span>{t("common.search")}</span>
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Offers Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-sand-100 rounded-2xl h-96 animate-pulse" />
          ))}
        </div>
      ) : offers.length === 0 ? (
        <div className="py-20 text-center space-y-4 bg-white rounded-3xl border border-sand-200 p-8">
          <Calendar className="w-12 h-12 text-sand-300 mx-auto" />
          <h3 className="text-lg font-bold text-indigo-950">{t("offers.noOffersTitle")}</h3>
          <p className="text-xs sm:text-sm text-sand-500 max-w-md mx-auto">
            {t("offers.noOffersDesc")}
          </p>
          <Button variant="outline" size="sm" onClick={handleResetFilters}>
            {t("common.reset")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer) => {
            const offerImg =
              offer.coverImageUrl ||
              "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80";

            return (
              <Card key={offer.id} hover className="flex flex-col h-full group">
                {/* Photo */}
                <div className="relative h-60 w-full overflow-hidden bg-sand-200">
                  <img
                    src={offerImg}
                    alt={getOfferTitle(offer.title)}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    width={500}
                    height={300}
                  />
                  <div className="absolute top-3 start-3">
                    {getStatusBadge(offer.availabilityStatus)}
                  </div>
                  <div className="absolute bottom-3 start-3 end-3 flex items-center justify-between text-xs text-white bg-indigo-950/75 backdrop-blur-sm px-3 py-1.5 rounded-xl">
                    <span className="flex items-center gap-1 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-saffron-400" />
                      <span>
                        {offer.durationDays} {t("common.days")} / {offer.durationNights} {t("common.nights")}
                      </span>
                    </span>
                    {offer.departures && offer.departures.length > 0 && (
                      <span className="text-[11px] text-sand-200">
                        {offer.departures.length} {isRtl ? "مواعيد مبرمجة" : "dates prévues"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-indigo-950 line-clamp-2 group-hover:text-terracotta-600 transition-colors font-display">
                      <Link to={`/offers/${offer.slug}`}>{getOfferTitle(offer.title)}</Link>
                    </h2>
                  </div>

                  <div className="pt-4 border-t border-sand-200 flex items-end justify-between">
                    <div>
                      <span className="text-xs text-sand-500 block">{t("common.fromPrice")}</span>
                      <span className="text-xl font-bold font-mono text-terracotta-600 block">
                        {formatDZD(offer.basePriceCentimes, isRtl ? "ar" : "fr")}
                      </span>
                    </div>

                    <Link to={`/offers/${offer.slug}`}>
                      <Button variant="primary" size="sm" className="gap-1.5">
                        <span>{t("common.viewOffer")}</span>
                        <ArrowUpRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default OffersPage;

