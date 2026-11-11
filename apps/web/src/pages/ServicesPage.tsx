import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Tent,
  Compass,
  Palmtree,
  Moon,
  Plane,
  FileCheck2,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  CalendarCheck,
} from "lucide-react";
import { Button } from "../components/ui/Button.js";
import { Card } from "../components/ui/Card.js";
import { SEOHead } from "../components/common/SEOHead.js";

interface ServicesPageProps {
  onOpenBooking: () => void;
}

export function ServicesPage({ onOpenBooking }: ServicesPageProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  const servicesList = [
    {
      icon: Tent,
      color: "text-terracotta-600 bg-terracotta-500/10",
      title: t("services.s1Title"),
      desc: t("services.s1Desc"),
      features: [
        "Traversée 4x4 tout-terrain révisés et climatisés",
        "Campements confort avec matelas et duvets grand froid",
        "Cuisinier dédié et repas chauds traditionnels",
        "Guides touaregs certifiés et agréés",
      ],
    },
    {
      icon: Compass,
      color: "text-indigo-900 bg-indigo-900/10",
      title: t("services.s2Title"),
      desc: t("services.s2Desc"),
      features: [
        "Accès prioritaire aux sites archéologiques classés UNESCO",
        "Conférenciers historiens spécialisés",
        "Circuits confortables adaptés aux familles et seniors",
        "Véhicules grand tourisme de standing",
      ],
    },
    {
      icon: Palmtree,
      color: "text-emerald-700 bg-emerald-500/10",
      title: t("services.s3Title"),
      desc: t("services.s3Desc"),
      features: [
        "Hôtels en bord de mer sélectionnés avec rigueur",
        "Activités nautiques, plongée et excursions en bateau",
        "Formules tout compris ou demi-pension",
        "Transferts aéroport - hôtel inclus",
      ],
    },
    {
      icon: Moon,
      color: "text-saffron-500 bg-saffron-500/10",
      title: t("services.s4Title"),
      desc: t("services.s4Desc"),
      features: [
        "Hôtels 4 et 5 étoiles face ou proches des Harams",
        "Encadrement religieux et logistique permanent",
        "Vols directs réguliers vers Djeddah et Médine",
        "Gestion complète des visas électroniques",
      ],
    },
    {
      icon: Plane,
      color: "text-blue-600 bg-blue-500/10",
      title: t("services.s5Title"),
      desc: t("services.s5Desc"),
      features: [
        "Vols intérieurs Air Algérie & Tassili Airlines",
        "Traversées maritimes Algérie Ferries, Corsica Linea",
        "Tarifs négociés auprès des plus grands hôtels d'Algérie",
        "Émission immédiate et modification facilitée",
      ],
    },
    {
      icon: FileCheck2,
      color: "text-sand-700 bg-sand-200",
      title: t("services.s6Title"),
      desc: t("services.s6Desc"),
      features: [
        "Délivrance de visas à l'arrivée (procédure sud algérien)",
        "Assistance à la constitution des dossiers consulaires",
        "Délivrance de laissez-passer sahariens officiels",
        "Assurances voyage multirisques et rapatriement",
      ],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      <SEOHead
        title={t("services.title")}
        description={t("services.subtitle")}
      />

      {/* Header */}
      <div className="max-w-3xl space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-terracotta-600 block">
          {t("common.agencyName")}
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold font-display text-indigo-950">
          {t("services.title")}
        </h1>
        <p className="text-sm text-sand-600">{t("services.subtitle")}</p>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {servicesList.map((srv, idx) => {
          const Icon = srv.icon;
          return (
            <Card key={idx} hover className="p-7 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${srv.color}`}>
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold font-display text-indigo-950">{srv.title}</h3>
                <p className="text-xs sm:text-sm text-sand-600 leading-relaxed">{srv.desc}</p>

                <div className="pt-2 space-y-2">
                  {srv.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2 text-xs text-sand-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-sand-200">
                <Button variant="primary" size="sm" onClick={onOpenBooking} className="w-full text-xs">
                  <CalendarCheck className="w-4 h-4" />
                  <span>{t("common.requestBooking")}</span>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default ServicesPage;

