import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MapPin, Calendar, Clock, ArrowRight, ArrowLeft, AlertCircle, Compass, Sparkles } from "lucide-react";
import { Button } from "../components/ui/Button.js";
import { Card } from "../components/ui/Card.js";
import { SEOHead } from "../components/common/SEOHead.js";
import { fetchDestinationBySlug, fetchOffers, type DestinationItem, type TravelOfferItem } from "../api/client.js";
import { formatDZD } from "@travel-agency/shared";

export function DestinationDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  const [destination, setDestination] = useState<DestinationItem | null>(null);
  const [linkedOffers, setLinkedOffers] = useState<TravelOfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!slug) return;
      setLoading(true);
      setError(null);
      try {
        const destData = await fetchDestinationBySlug(slug);
        setDestination(destData);

        const offersData = await fetchOffers({ destinationId: destData.id, limit: 6 });
        setLinkedOffers(offersData.offers);
      } catch (err: any) {
        setError(err.message || "Destination introuvable");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  const getLocalizedName = (name: { ar: string; fr: string }) => {
    return isRtl ? name.ar || name.fr : name.fr || name.ar;
  };

  const getLocalizedDesc = (desc: { ar: string; fr: string }) => {
    return isRtl ? desc.ar || desc.fr : desc.fr || desc.ar;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-terracotta-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-sand-500">{t("common.loading")}</p>
      </div>
    );
  }

  if (error || !destination) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-2xl font-bold font-display text-indigo-950">Destination introuvable</h2>
        <p className="text-sm text-sand-600">Cette page n'existe pas ou a été déplacée.</p>
        <Link to="/destinations">
          <Button variant="outline">{t("nav.destinations")}</Button>
        </Link>
      </div>
    );
  }

  const nameText = getLocalizedName(destination.name);
  const photo =
    destination.coverImageUrl ||
    "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80";

  return (
    <div className="space-y-12 pb-20">
      <SEOHead
        title={nameText}
        description={getLocalizedDesc(destination.description)}
        imageUrl={photo}
      />

      {/* Hero Banner */}
      <div className="relative w-full h-80 sm:h-[450px] overflow-hidden bg-indigo-950 flex items-end">
        <img
          src={photo}
          alt={nameText}
          className="absolute inset-0 w-full h-full object-cover filter brightness-[0.75]"
          width={1400}
          height={600}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-950 via-indigo-950/40 to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 w-full space-y-2 text-sand-50">
          <div className="flex items-center gap-2 text-xs font-semibold text-saffron-300">
            <MapPin className="w-4 h-4 text-terracotta-500" />
            <span>{destination.wilayaOrCountry}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold font-display text-sand-50">
            {nameText}
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Destination Presentation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            <div className="p-6 sm:p-8 bg-white rounded-3xl border border-sand-200 shadow-sm space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold font-display text-indigo-950">
                {isRtl ? "سحر وخصائص الوجهة" : "Découverte & Patrimoine"}
              </h2>
              <p className="text-sm sm:text-base text-sand-700 leading-relaxed whitespace-pre-line">
                {getLocalizedDesc(destination.description)}
              </p>
            </div>
          </div>

          {/* Practical travel advice widget (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-6 bg-sand-100 rounded-3xl border border-sand-200 space-y-4">
              <h3 className="text-base font-bold text-indigo-950 flex items-center gap-2">
                <Compass className="w-5 h-5 text-terracotta-600" />
                <span>{isRtl ? "معلومات عملية للمسافر" : "Conseils Pratiques"}</span>
              </h3>
              <div className="space-y-3 text-xs text-sand-700">
                <div>
                  <span className="font-bold text-indigo-950 block">{t("destinations.bestTimeToVisit")}</span>
                  <span>{destination.category === "sahara" ? "D'Octobre à Avril (Saison saharienne idéale)" : "Toute l'année"}</span>
                </div>
                <div>
                  <span className="font-bold text-indigo-950 block">Accès & Transports</span>
                  <span>Vols domestiques réguliers Air Algérie / Tassili Airlines + 4x4 tout-terrain</span>
                </div>
                <div>
                  <span className="font-bold text-indigo-950 block">Formalités d'entrée</span>
                  <span>Laissez-passer et encadrement assurés par Numidia Voyages</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Linked Travel Offers */}
        <div className="space-y-6 pt-6 border-t border-sand-200">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold font-display text-indigo-950">
              {t("destinations.linkedOffers")}
            </h2>
            <p className="text-xs text-sand-500">
              Découvrez nos circuits guidés et formules disponibles pour cette destination.
            </p>
          </div>

          {linkedOffers.length === 0 ? (
            <div className="p-8 text-center bg-sand-50 rounded-2xl border border-sand-200 text-sand-600 text-sm">
              {t("destinations.noLinkedOffers")}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {linkedOffers.map((offer) => (
                <Card key={offer.id} hover className="flex flex-col h-full group">
                  <div className="relative h-48 w-full overflow-hidden bg-sand-200">
                    <img
                      src={offer.coverImageUrl || photo}
                      alt={isRtl ? offer.title.ar : offer.title.fr}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <h3 className="font-bold text-indigo-950 text-base line-clamp-2">
                      <Link to={`/offers/${offer.slug}`}>
                        {isRtl ? offer.title.ar : offer.title.fr}
                      </Link>
                    </h3>
                    <div className="flex items-center justify-between pt-3 border-t border-sand-200">
                      <span className="font-mono font-bold text-terracotta-600 text-base">
                        {formatDZD(offer.basePriceCentimes, isRtl ? "ar" : "fr")}
                      </span>
                      <Link to={`/offers/${offer.slug}`}>
                        <Button variant="primary" size="sm" className="text-xs">
                          {t("common.viewOffer")}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DestinationDetailPage;

