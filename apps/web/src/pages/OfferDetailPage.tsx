import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  Check,
  X,
  CreditCard,
  MessageCircle,
  Phone,
  ArrowLeft,
  ArrowRight,
  Compass,
  AlertCircle,
  Car,
  Hotel,
  Share2,
} from "lucide-react";
import { Button } from "../components/ui/Button.js";
import { Badge } from "../components/ui/Badge.js";
import { Card } from "../components/ui/Card.js";
import { SEOHead } from "../components/common/SEOHead.js";
import { fetchOfferBySlug, type TravelOfferItem } from "../api/client.js";
import { formatDZD } from "@travel-agency/shared";

interface OfferDetailPageProps {
  onOpenBooking: (offerId?: string, offerTitle?: string, departureDate?: string) => void;
}

export function OfferDetailPage({ onOpenBooking }: OfferDetailPageProps) {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRtl = i18n.language === "ar";

  const [offer, setOffer] = useState<TravelOfferItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected departure date
  const [selectedDepartureDate, setSelectedDepartureDate] = useState<string>("");

  useEffect(() => {
    async function loadOffer() {
      if (!slug) return;
      setLoading(true);
      setError(null);
      try {
        const data = await fetchOfferBySlug(slug);
        setOffer(data);
        if (data.departures && data.departures.length > 0) {
          const firstOpen = data.departures.find((d) => d.maxCapacity > d.bookedPlaces);
          if (firstOpen) setSelectedDepartureDate(firstOpen.departureDate);
        }
      } catch (err: any) {
        setError(err.message || "Impossible de charger ce voyage.");
      } finally {
        setLoading(false);
      }
    }
    loadOffer();
  }, [slug]);

  const getOfferTitle = (title: { ar: string; fr: string } | string) => {
    if (typeof title === "object" && title !== null) {
      return isRtl ? title.ar || title.fr : title.fr || title.ar;
    }
    return String(title);
  };

  const getLocalizedField = (field?: { ar: string; fr: string } | string) => {
    if (!field) return "";
    if (typeof field === "object") {
      return isRtl ? field.ar || field.fr : field.fr || field.ar;
    }
    return String(field);
  };

  const getLocalizedList = (field?: { ar: string[]; fr: string[] }) => {
    if (!field) return [];
    return isRtl ? field.ar || field.fr || [] : field.fr || field.ar || [];
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-terracotta-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-sand-500">{t("common.loading")}</p>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-2xl font-bold font-display text-indigo-950">Voyage introuvable</h2>
        <p className="text-sm text-sand-600">
          Ce circuit n'est plus disponible ou a été déplacé.
        </p>
        <Link to="/offers">
          <Button variant="outline">{t("offerDetail.breadcrumbOffers")}</Button>
        </Link>
      </div>
    );
  }

  const titleText = getOfferTitle(offer.title);
  const coverImage =
    offer.coverImageUrl ||
    "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=85";

  // TouristTrip JSON-LD Structured Data for Google Rich Results
  const tripJsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: titleText,
    description: getLocalizedField(offer.hotelDetails),
    image: coverImage,
    offers: {
      "@type": "Offer",
      price: offer.basePriceCentimes / 100,
      priceCurrency: "DZD",
      availability:
        offer.availabilityStatus === "sold_out"
          ? "https://schema.org/SoldOut"
          : "https://schema.org/InStock",
    },
    touristType: offer.tripType,
  };

  return (
    <div className="space-y-10 pb-20">
      <SEOHead
        title={titleText}
        description={getLocalizedField(offer.hotelDetails)}
        imageUrl={coverImage}
        type="trip"
        structuredData={tripJsonLd}
      />

      {/* Breadcrumb Bar */}
      <div className="bg-sand-100/70 border-b border-sand-200 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 text-xs text-sand-600">
          <Link to="/" className="hover:text-indigo-950">
            {t("nav.home")}
          </Link>
          <span>/</span>
          <Link to="/offers" className="hover:text-indigo-950">
            {t("offerDetail.breadcrumbOffers")}
          </Link>
          <span>/</span>
          <span className="font-semibold text-indigo-950 truncate max-w-xs">{titleText}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title Header */}
        <div className="space-y-3 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="terracotta">
              {offer.tripType === "trekking"
                ? isRtl ? "مغامرة وتخييم صحراوي" : "Trekking Saharien"
                : isRtl ? "جولة سياحية" : "Circuit Guidé"}
            </Badge>
            <span className="text-xs text-sand-500 font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-sand-400" />
              <span>
                {offer.durationDays} {t("common.days")} / {offer.durationNights} {t("common.nights")}
              </span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold font-display text-indigo-950 tracking-tight">
            {titleText}
          </h1>
        </div>

        {/* Hero Photo Banner */}
        <div className="relative w-full h-80 sm:h-[480px] rounded-3xl overflow-hidden shadow-xl border border-sand-200">
          <img
            src={coverImage}
            alt={titleText}
            className="w-full h-full object-cover"
            width={1200}
            height={600}
            loading="eager"
          />
        </div>

        {/* 2-Column Split: Itinerary Details vs Sticky Booking Action */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pt-10">
          {/* Main Details (8 cols) */}
          <div className="lg:col-span-8 space-y-10">
            {/* Overview / Accommodation & Transport */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {offer.hotelDetails && (
                <div className="p-5 rounded-2xl bg-white border border-sand-200 shadow-xs space-y-2">
                  <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm">
                    <Hotel className="w-4 h-4 text-terracotta-600" />
                    <span>{t("offerDetail.accommodation")}</span>
                  </div>
                  <p className="text-xs text-sand-700 leading-relaxed">
                    {getLocalizedField(offer.hotelDetails)}
                  </p>
                </div>
              )}

              {offer.transportDetails && (
                <div className="p-5 rounded-2xl bg-white border border-sand-200 shadow-xs space-y-2">
                  <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm">
                    <Car className="w-4 h-4 text-terracotta-600" />
                    <span>{t("offerDetail.transport")}</span>
                  </div>
                  <p className="text-xs text-sand-700 leading-relaxed">
                    {getLocalizedField(offer.transportDetails)}
                  </p>
                </div>
              )}
            </div>

            {/* Day-by-Day Itinerary */}
            {offer.itinerary && offer.itinerary.length > 0 && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-bold font-display text-indigo-950">
                    {t("offerDetail.itinerary")}
                  </h2>
                  <p className="text-xs text-sand-500">
                    Programme détaillé de votre séjour avec les étapes et activités quotidiennes.
                  </p>
                </div>

                <div className="space-y-4">
                  {offer.itinerary.map((step) => (
                    <div
                      key={step.dayNumber}
                      className="p-5 rounded-2xl bg-white border border-sand-200 shadow-xs space-y-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-terracotta-500/10 text-terracotta-600 font-bold text-xs flex items-center justify-center shrink-0">
                          J{step.dayNumber}
                        </span>
                        <h3 className="text-base font-bold text-indigo-950">
                          {getLocalizedField(step.title)}
                        </h3>
                      </div>
                      <p className="text-xs sm:text-sm text-sand-600 leading-relaxed ps-11">
                        {getLocalizedField(step.description)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inclusions & Exclusions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
              {/* Inclusions */}
              <div className="p-6 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-4">
                <h3 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                  <Check className="w-5 h-5 text-emerald-600" />
                  <span>{t("offerDetail.inclusions")}</span>
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm text-emerald-900">
                  {getLocalizedList(offer.inclusions).map((inc, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span>{inc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Exclusions */}
              <div className="p-6 rounded-2xl bg-rose-50/60 border border-rose-200/80 space-y-4">
                <h3 className="text-base font-bold text-rose-950 flex items-center gap-2">
                  <X className="w-5 h-5 text-rose-600" />
                  <span>{t("offerDetail.exclusions")}</span>
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm text-rose-900">
                  {getLocalizedList(offer.exclusions).map((exc, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                      <span>{exc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Sticky Right Column (4 cols) */}
          <div className="lg:col-span-4">
            <div className="sticky top-28 space-y-6">
              <Card className="p-6 bg-white border border-sand-300 shadow-xl space-y-6">
                {/* Price Display */}
                <div className="space-y-1 pb-4 border-b border-sand-200">
                  <span className="text-xs text-sand-500 block">{t("common.fromPrice")}</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold font-mono text-terracotta-600">
                      {formatDZD(offer.basePriceCentimes, isRtl ? "ar" : "fr")}
                    </span>
                    <span className="text-xs text-sand-500">{t("common.perPerson")}</span>
                  </div>
                </div>

                {/* Guaranteed Price Banner */}
                <div className="p-3 bg-sand-50 rounded-xl border border-sand-200 text-xs text-sand-700 space-y-1">
                  <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>{t("offerDetail.guaranteeBadge")}</span>
                  </div>
                  <p className="text-[11px] text-sand-600 leading-tight">
                    {t("offerDetail.guaranteeNotice")}
                  </p>
                </div>

                {/* Departure Dates Selector */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-indigo-950 block">
                    {t("offerDetail.selectDeparturePrompt")}
                  </label>

                  {offer.departures && offer.departures.length > 0 ? (
                    <div className="space-y-2 max-h-56 overflow-y-auto pe-1">
                      {offer.departures.map((dep) => {
                        const seatsLeft = Math.max(0, dep.maxCapacity - dep.bookedPlaces);
                        const isSoldOut = seatsLeft <= 0;
                        const isSelected = selectedDepartureDate === dep.departureDate;

                        return (
                          <div
                            key={dep.id}
                            onClick={() => !isSoldOut && setSelectedDepartureDate(dep.departureDate)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? "border-terracotta-500 bg-terracotta-500/10 text-indigo-950"
                                : isSoldOut
                                ? "border-sand-200 bg-sand-100 opacity-60 cursor-not-allowed text-sand-400"
                                : "border-sand-200 hover:border-sand-400 bg-white"
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="font-mono">
                                {new Date(dep.departureDate).toLocaleDateString(isRtl ? "ar-DZ" : "fr-DZ")} ➔{" "}
                                {new Date(dep.returnDate).toLocaleDateString(isRtl ? "ar-DZ" : "fr-DZ")}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-1 text-[11px]">
                              <span className={isSoldOut ? "text-red-600 font-bold" : "text-emerald-700"}>
                                {isSoldOut ? t("offers.seatsSoldOut") : `${seatsLeft} ${t("offers.seatsAvailable")}`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-sand-500 italic p-3 bg-sand-50 rounded-xl">
                      {t("offerDetail.noDeparturesYet")}
                    </p>
                  )}
                </div>

                {/* Primary Booking Button */}
                <Button
                  variant="terracotta"
                  size="lg"
                  onClick={() => onOpenBooking(offer.id, titleText, selectedDepartureDate)}
                  className="w-full text-base shadow-lg"
                >
                  <Calendar className="w-5 h-5" />
                  <span>{t("common.requestBooking")}</span>
                </Button>

                {/* Direct Contact Shortcuts */}
                <div className="space-y-2 pt-2 border-t border-sand-200">
                  <a
                    href={`https://wa.me/213550123456?text=${encodeURIComponent(
                      `Bonjour Numidia Voyages, je souhaite des informations sur le circuit : ${titleText}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100 text-xs font-semibold transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span>WhatsApp : Poser une question</span>
                  </a>

                  <a
                    href="tel:021634578"
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sand-100 text-indigo-950 hover:bg-sand-200 text-xs font-semibold transition-colors"
                    dir="ltr"
                  >
                    <Phone className="w-4 h-4 text-terracotta-500" />
                    <span>Appeler l'agence : 021 63 45 78</span>
                  </a>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OfferDetailPage;

