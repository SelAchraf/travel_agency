import React from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck, Lock } from "lucide-react";
import { SEOHead } from "../components/common/SEOHead.js";

export function PrivacyPage() {
  const { t, i18n } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <SEOHead
        title={t("footer.privacy")}
        description="Politique de protection des données personnelles de Numidia Voyages."
      />

      <div className="space-y-2 border-b border-sand-200 pb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-terracotta-600 block">
          {t("common.agencyName")}
        </span>
        <h1 className="text-3xl font-bold font-display text-indigo-950">
          {t("footer.privacy")}
        </h1>
        <p className="text-xs text-sand-500">Protection des données et confidentialité</p>
      </div>

      <div className="space-y-6 text-xs sm:text-sm text-sand-700 leading-relaxed bg-white p-6 sm:p-8 rounded-3xl border border-sand-200 shadow-sm">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-indigo-950 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>1. Collecte Minimale des Données</span>
          </h2>
          <p>
            Numidia Voyages applique un principe strict de minimisation de la collecte des données. Seules les informations strictement indispensables à l'organisation de vos voyages (nom, coordonnées téléphoniques, informations de passeport pour les laissez-passer sahariens) sont recueillies.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-indigo-950">2. Sécurité des Documents & Passeports</h2>
          <p>
            Les numéros de passeports et documents d'identité transmis pour vos voyages sont conservés de façon sécurisée et chiffrée. Ils ne sont jamais accessibles publiquement et sont réservés exclusivement aux agents autorisés de l'agence pour les formalités administratives.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-indigo-950">3. Non-divulgation à des Tiers</h2>
          <p>
            Vos données personnelles ne sont jamais vendues, louées ou cédées à des fins publicitaires. Elles ne sont communiquées qu'aux prestataires d'hébergement, compagnies aériennes ou autorités administratives strictement nécessaires à l'exécution de votre voyage.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-indigo-950">4. Vos Droits d'Accès et de Rectification</h2>
          <p>
            Vous disposez d'un droit permanent d'accès, de rectification et de suppression de vos données personnelles. Vous pouvez exercer ce droit à tout moment en contactant notre délégué à la protection des données par email à : <strong className="text-indigo-950">contact@numidiavoyages.dz</strong>.
          </p>
        </section>
      </div>
    </div>
  );
}

export default PrivacyPage;

