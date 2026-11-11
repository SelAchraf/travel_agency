import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShieldCheck, MapPin, Compass, Users, Clock, Award, Building2, Phone } from "lucide-react";
import { Button } from "../components/ui/Button.js";
import { Card } from "../components/ui/Card.js";
import { SEOHead } from "../components/common/SEOHead.js";

export function AboutPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      <SEOHead
        title={t("about.title")}
        description={t("about.subtitle")}
      />

      {/* Header */}
      <div className="max-w-3xl space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-terracotta-600 block">
          {t("common.agencyName")}
        </span>
        <h1 className="text-3xl sm:text-5xl font-bold font-display text-indigo-950">
          {t("about.title")}
        </h1>
        <p className="text-base text-sand-600">{t("about.subtitle")}</p>
      </div>

      {/* Story & Heritage Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7 space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-indigo-950">
            {t("about.storyTitle")}
          </h2>
          <p className="text-sm sm:text-base text-sand-700 leading-relaxed">
            {t("about.storyP1")}
          </p>
          <p className="text-sm sm:text-base text-sand-700 leading-relaxed">
            {t("about.storyP2")}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4">
            <div className="p-4 rounded-2xl bg-sand-100 border border-sand-200 text-center space-y-1">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-terracotta-600 block">
                +10 ans
              </span>
              <span className="text-xs text-sand-600 font-medium block">
                {isRtl ? "خبرة في السياحة الصحراوية" : "D'expérience saharienne"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-sand-100 border border-sand-200 text-center space-y-1">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-indigo-950 block">
                58 Wilayas
              </span>
              <span className="text-xs text-sand-600 font-medium block">
                {isRtl ? "تغطية سياحية شاملة" : "Couverture nationale"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-sand-100 border border-sand-200 text-center space-y-1">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-700 block">
                100%
              </span>
              <span className="text-xs text-sand-600 font-medium block">
                {isRtl ? "مرشدون محليون معتمدون" : "Guides locaux certifiés"}
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-sand-200 aspect-[4/5]">
            <img
              src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80"
              alt="Patrimoine d'Algérie"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </div>

      {/* Official Accreditation Seal Banner */}
      <div className="p-8 sm:p-10 rounded-3xl bg-indigo-950 text-sand-50 space-y-4 border border-indigo-900 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-saffron-500/20 text-saffron-400 flex items-center justify-center">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-display text-sand-50">
              {t("about.accreditationTitle")}
            </h3>
            <span className="text-xs text-saffron-400 font-mono">
              République Algérienne Démocratique et Populaire
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-sand-300 leading-relaxed max-w-4xl">
          {t("about.accreditationText")}
        </p>
      </div>

      {/* Physical Offices & Contact */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold font-display text-indigo-950">
          {t("about.branchesTitle")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Central Office Alger */}
          <Card className="p-6 space-y-4 border border-sand-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-terracotta-600 block mb-1">
                  Siège Social
                </span>
                <h3 className="text-lg font-bold text-indigo-950">
                  {t("about.branchAlger")}
                </h3>
              </div>
              <Building2 className="w-6 h-6 text-sand-400" />
            </div>

            <div className="space-y-2 text-xs text-sand-700">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-terracotta-500 shrink-0 mt-0.5" />
                <span>14, Rue Didouche Mourad, Alger-Centre, 16000 Alger</span>
              </div>
              <div className="flex items-center gap-2" dir="ltr">
                <Phone className="w-4 h-4 text-terracotta-500 shrink-0" />
                <span>021 63 45 78 / +213 550 12 34 56</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-saffron-500 shrink-0" />
                <span>Samedi - Jeudi : 08h30 - 17h30</span>
              </div>
            </div>
          </Card>

          {/* Regional Office Oran */}
          <Card className="p-6 space-y-4 border border-sand-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-saffron-600 block mb-1">
                  Antenne Régionale Ouest
                </span>
                <h3 className="text-lg font-bold text-indigo-950">
                  {t("about.branchOran")}
                </h3>
              </div>
              <Building2 className="w-6 h-6 text-sand-400" />
            </div>

            <div className="space-y-2 text-xs text-sand-700">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-terracotta-500 shrink-0 mt-0.5" />
                <span>08, Boulevard de l'A.L.N (Front de Mer), 31000 Oran</span>
              </div>
              <div className="flex items-center gap-2" dir="ltr">
                <Phone className="w-4 h-4 text-terracotta-500 shrink-0" />
                <span>041 33 22 11 / +213 550 98 76 54</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-saffron-500 shrink-0" />
                <span>Samedi - Jeudi : 09h00 - 17h00</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;

