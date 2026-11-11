import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MapPin, ArrowRight, ArrowLeft, Compass, Sparkles } from "lucide-react";
import { Card } from "../components/ui/Card.js";
import { Button } from "../components/ui/Button.js";
import { SEOHead } from "../components/common/SEOHead.js";
import { fetchDestinations, type DestinationItem } from "../api/client.js";

export function DestinationsPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  const [destinations, setDestinations] = useState<DestinationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchDestinations();
        setDestinations(data);
      } catch (err) {
        console.error("Failed to load destinations:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const getLocalizedName = (name: { ar: string; fr: string }) => {
    return isRtl ? name.ar || name.fr : name.fr || name.ar;
  };

  const getLocalizedDesc = (desc: { ar: string; fr: string }) => {
    return isRtl ? desc.ar || desc.fr : desc.fr || desc.ar;
  };

  const filteredDestinations = destinations.filter((dest) => {
    if (selectedCategory === "all") return true;
    return dest.category === selectedCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <SEOHead
        title={t("destinations.title")}
        description={t("destinations.subtitle")}
      />

      {/* Header */}
      <div className="max-w-3xl space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-terracotta-600 block">
          {t("common.agencyName")}
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold font-display text-indigo-950">
          {t("destinations.title")}
        </h1>
        <p className="text-sm text-sand-600">{t("destinations.subtitle")}</p>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-sand-200 pb-4">
        {[
          { id: "all", label: isRtl ? "جميع الوجهات" : "Toutes les destinations" },
          { id: "sahara", label: isRtl ? "الصحراء الكبرى والواحات" : "Sahara & Oasis" },
          { id: "domestic", label: isRtl ? "السياحة الداخلية والساحل" : "Circuits Nationaux" },
          { id: "religious", label: isRtl ? "العمرة والبقاع المقدسة" : "Omra & Pèlerinage" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedCategory(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              selectedCategory === tab.id
                ? "bg-indigo-950 text-white shadow-sm"
                : "bg-white text-sand-600 hover:text-indigo-950 hover:bg-sand-100 border border-sand-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Destinations Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 py-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-sand-100 rounded-3xl h-96 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredDestinations.map((dest) => {
            const photo =
              dest.coverImageUrl ||
              "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80";

            return (
              <Card key={dest.id} hover className="flex flex-col h-full group">
                <div className="relative h-64 w-full overflow-hidden bg-sand-200">
                  <img
                    src={photo}
                    alt={getLocalizedName(dest.name)}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    width={500}
                    height={320}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/80 via-transparent to-transparent" />
                  <div className="absolute bottom-4 start-4 end-4">
                    <span className="text-xs text-saffron-300 font-semibold block mb-0.5">
                      {dest.wilayaOrCountry}
                    </span>
                    <h3 className="text-xl font-bold font-display text-white">
                      {getLocalizedName(dest.name)}
                    </h3>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <p className="text-xs sm:text-sm text-sand-600 line-clamp-3 leading-relaxed">
                    {getLocalizedDesc(dest.description)}
                  </p>

                  <div className="pt-4 border-t border-sand-200 flex items-center justify-between">
                    <Link
                      to={`/destinations/${dest.slug}`}
                      className="text-xs font-bold text-terracotta-600 hover:text-terracotta-700 flex items-center gap-1"
                    >
                      <span>{t("common.learnMore")}</span>
                      {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                    </Link>

                    <Link to={`/offers?destination=${dest.slug}`}>
                      <Button variant="outline" size="sm" className="text-xs">
                        {t("destinations.linkedOffers")}
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

export default DestinationsPage;

