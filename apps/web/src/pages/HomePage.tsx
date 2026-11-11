import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  Calendar,
  MapPin,
  ShieldCheck,
  Users,
  CreditCard,
  Tent,
  Sparkles,
  Phone,
  Search,
  CheckCircle2,
} from "lucide-react";
import { Button } from "../components/ui/Button.js";
import { Badge } from "../components/ui/Badge.js";
import { Card } from "../components/ui/Card.js";
import { AlgeriaMap } from "../components/common/AlgeriaMap.js";
import { SEOHead } from "../components/common/SEOHead.js";
import { fetchOffers, type TravelOfferItem } from "../api/client.js";
import { formatDZD } from "@travel-agency/shared";

interface HomePageProps {
  onOpenBooking: (offerId?: string, offerTitle?: string) => void;
}

export function HomePage({ onOpenBooking }: HomePageProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRtl = i18n.language === "ar";

  const [featuredOffers, setFeaturedOffers] = useState<TravelOfferItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Search Bar state
  const [selectedDestination, setSelectedDestination] = useState("");
  const [selectedTripType, setSelectedTripType] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetchOffers({ limit: 4 });
        setFeaturedOffers(res.offers);
      } catch (err) {
        console.error("Failed to load featured offers:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = new URLSearchParams();
    if (selectedDestination) query.set("destination", selectedDestination);
    if (selectedTripType) query.set("tripType", selectedTripType);
    navigate(`/offers?${query.toString()}`);
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
    <div className="space-y-20 sm:space-y-28 pb-16">
      <SEOHead />

      {/* Hero Section with Warm Parchment & Terracotta tones */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden pt-12 pb-24 px-4 sm:px-6 lg:px-8">
        {/* Background Image with Algerian Dunes */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=2000&q=85"
            alt="Dunes du Sahara Algérien"
            className="w-full h-full object-cover object-center filter brightness-[0.78] contrast-[1.05]"
            width={2000}
            height={1200}
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-indigo-950 via-indigo-950/40 to-indigo-950/60" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8 text-sand-50">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-saffron-500/20 backdrop-blur-md border border-saffron-500/30 text-saffron-300 text-xs sm:text-sm font-semibold tracking-wide animate-in fade-in-50 duration-700">
            <Sparkles className="w-4 h-4 text-saffron-400" />
            <span>{t("home.heroBadge")}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold font-display tracking-tight leading-[1.15] text-sand-50 max-w-4xl mx-auto drop-shadow-md">
            {t("home.heroTitle")}
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-sand-200 max-w-3xl mx-auto font-sans font-normal leading-relaxed drop-shadow">
            {t("home.heroSubtitle")}
          </p>

          {/* Quick Search Card Bar */}
          <div className="pt-4 max-w-4xl mx-auto">
            <form
              onSubmit={handleSearchSubmit}
              className="bg-white/95 backdrop-blur-md rounded-2xl p-3 sm:p-4 shadow-2xl border border-sand-200/80 text-start grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-7 gap-3 items-center"
            >
              {/* Destination Dropdown (3 cols) */}
              <div className="sm:col-span-1 lg:col-span-3 space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-sand-500 block ps-1">
                  {t("home.destinationLabel")}
                </label>
                <select
                  value={selectedDestination}
                  onChange={(e) => setSelectedDestination(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-sand-200 bg-sand-50 text-indigo-950 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-900"
                >
                  <option value="">{t("common.allDestinations")}</option>
                  <option value="djanet">Djanet & Tadrart Rouge (طاسيلي)</option>
                  <option value="timimoun">Timimoun & Oasis du Gourara (تيميمون)</option>
                  <option value="constantine">Constantine & Ponts Suspendus (قسنطينة)</option>
                  <option value="tipaza">Tipaza & Vestiges Romains (تيبازة)</option>
                  <option value="umrah">Omra aux Lieux Saints (العمرة)</option>
                </select>
              </div>

              {/* Trip Type Dropdown (2 cols) */}
              <div className="sm:col-span-1 lg:col-span-2 space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-sand-500 block ps-1">
                  {t("home.typeLabel")}
                </label>
                <select
                  value={selectedTripType}
                  onChange={(e) => setSelectedTripType(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-sand-200 bg-sand-50 text-indigo-950 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-900"
                >
                  <option value="">{t("common.allTypes")}</option>
                  <option value="trekking">{isRtl ? "مغامرة وتخييم صحراوي" : "Trekking Saharien"}</option>
                  <option value="guided_tour">{isRtl ? "جولة سياحية وثقافية" : "Circuit Guidé Culturel"}</option>
                  <option value="beach_stay">{isRtl ? "إقامة ساحلية واستجمام" : "Séjour Balnéaire"}</option>
                  <option value="umrah">{isRtl ? "العمرة والزيارة" : "Omra & Pèlerinage"}</option>
                </select>
              </div>

              {/* Submit Button (2 cols) */}
              <div className="sm:col-span-1 lg:col-span-2 pt-2 sm:pt-4">
                <Button type="submit" variant="terracotta" size="lg" className="w-full h-11 shadow-md">
                  <Search className="w-4 h-4" />
                  <span>{t("common.search")}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Interactive Algeria Map Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AlgeriaMap />
      </section>

      {/* Featured Offers Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-terracotta-600 block mb-1">
              {t("home.featuredTitle")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-indigo-950">
              {isRtl ? "أجمل البرامج الاستكشافية" : "Voyages & Séjours d'Exception"}
            </h2>
            <p className="text-sm text-sand-600 mt-1">{t("home.featuredSubtitle")}</p>
          </div>

          <Link to="/offers">
            <Button variant="outline" size="sm" className="gap-2">
              <span>{t("home.exploreOffers")}</span>
              {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </Button>
          </Link>
        </div>

        {/* Offers Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-sand-100 rounded-2xl h-96 animate-pulse" />
            ))
          ) : featuredOffers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-sand-500">
              Aucun voyage publié pour le moment.
            </div>
          ) : (
            featuredOffers.map((offer) => {
              const offerImg =
                offer.coverImageUrl ||
                "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80";

              return (
                <Card key={offer.id} hover className="flex flex-col h-full group">
                  {/* Photo */}
                  <div className="relative h-52 w-full overflow-hidden bg-sand-200">
                    <img
                      src={offerImg}
                      alt={getOfferTitle(offer.title)}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      width={400}
                      height={250}
                    />
                    <div className="absolute top-3 start-3">
                      {getStatusBadge(offer.availabilityStatus)}
                    </div>
                    <div className="absolute bottom-3 start-3 end-3 flex items-center justify-between text-xs text-white bg-indigo-950/70 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                      <span className="flex items-center gap-1 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-saffron-400" />
                        <span>
                          {offer.durationDays} {t("common.days")} / {offer.durationNights} {t("common.nights")}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-indigo-950 line-clamp-2 group-hover:text-terracotta-600 transition-colors">
                        <Link to={`/offers/${offer.slug}`}>{getOfferTitle(offer.title)}</Link>
                      </h3>
                    </div>

                    <div className="pt-3 border-t border-sand-200 flex items-end justify-between">
                      <div>
                        <span className="text-[11px] text-sand-500 block">{t("common.fromPrice")}</span>
                        <span className="text-lg font-bold font-mono text-terracotta-600 block">
                          {formatDZD(offer.basePriceCentimes, isRtl ? "ar" : "fr")}
                        </span>
                      </div>

                      <Link to={`/offers/${offer.slug}`}>
                        <Button variant="primary" size="sm" className="text-xs">
                          {t("common.viewOffer")}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </section>

      {/* Why Choose Us: 4 Trust Pillars */}
      <section className="bg-sand-100/70 py-16 sm:py-20 border-y border-sand-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-terracotta-600 block">
              {t("home.whyUsTitle")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-indigo-950">
              {isRtl ? "احترافية، أمان، وأصالة جزائرية" : "L'Excellence du Voyage en Algérie"}
            </h2>
            <p className="text-sm text-sand-600">{t("home.whyUsSubtitle")}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pillar 1 */}
            <div className="bg-white p-6 rounded-2xl border border-sand-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-terracotta-500/10 text-terracotta-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-indigo-950">{t("home.pillar1Title")}</h3>
              <p className="text-xs text-sand-600 leading-relaxed">{t("home.pillar1Desc")}</p>
            </div>

            {/* Pillar 2 */}
            <div className="bg-white p-6 rounded-2xl border border-sand-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-saffron-500/10 text-amber-700 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-indigo-950">{t("home.pillar2Title")}</h3>
              <p className="text-xs text-sand-600 leading-relaxed">{t("home.pillar2Desc")}</p>
            </div>

            {/* Pillar 3 */}
            <div className="bg-white p-6 rounded-2xl border border-sand-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-indigo-950">{t("home.pillar3Title")}</h3>
              <p className="text-xs text-sand-600 leading-relaxed">{t("home.pillar3Desc")}</p>
            </div>

            {/* Pillar 4 */}
            <div className="bg-white p-6 rounded-2xl border border-sand-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-900/10 text-indigo-950 flex items-center justify-center">
                <Tent className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-indigo-950">{t("home.pillar4Title")}</h3>
              <p className="text-xs text-sand-600 leading-relaxed">{t("home.pillar4Desc")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-r from-indigo-950 via-indigo-900 to-indigo-950 p-8 sm:p-12 text-sand-50 overflow-hidden shadow-2xl border border-indigo-800">
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-saffron-400 block">
              {t("common.agencyTagline")}
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold font-display text-sand-50">
              {t("home.ctaTitle")}
            </h2>
            <p className="text-sm sm:text-base text-sand-200 leading-relaxed">
              {t("home.ctaSubtitle")}
            </p>
            <div className="pt-4 flex flex-wrap items-center gap-3">
              <Button
                variant="terracotta"
                size="lg"
                onClick={() => onOpenBooking()}
                className="shadow-lg"
              >
                <span>{t("common.requestBooking")}</span>
              </Button>
              <Link to="/contact">
                <Button variant="outline" size="lg" className="border-sand-400 text-sand-50 hover:bg-white/10">
                  <Phone className="w-4 h-4" />
                  <span>{t("home.ctaButton")}</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;

