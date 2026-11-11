import React from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck, FileText } from "lucide-react";
import { SEOHead } from "../components/common/SEOHead.js";

export function TermsPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <SEOHead
        title={t("footer.terms")}
        description="Conditions Générales de Vente et de Réservation de Numidia Voyages."
      />

      <div className="space-y-2 border-b border-sand-200 pb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-terracotta-600 block">
          {t("common.agencyName")}
        </span>
        <h1 className="text-3xl font-bold font-display text-indigo-950">
          {t("footer.terms")}
        </h1>
        <p className="text-xs text-sand-500">Dernière mise à jour : Janvier 2026</p>
      </div>

      <div className="space-y-6 text-xs sm:text-sm text-sand-700 leading-relaxed bg-white p-6 sm:p-8 rounded-3xl border border-sand-200 shadow-sm">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-indigo-950">1. Objet & Dispositions Générales</h2>
          <p>
            Les présentes Conditions Générales de Vente régissent les relations contractuelles entre l'agence Numidia Voyages (titulaire de la licence N° 16/0423/AVT) et toute personne physique ou morale souscrivant à l'un de ses séjours, circuits ou prestations touristiques.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-indigo-950">2. Demande de Réservation & Conclusion du Contrat</h2>
          <p>
            Toute demande effectuée via le site internet constitue une pré-réservation non contractuelle. La réservation ne devient définitive qu'après vérification de la capacité par les services de l'agence, émission d'un contrat de voyage nominatif et versement de l'acompte convenu (minimum 30% du montant total).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-indigo-950">3. Tarifs & Modalités de Paiement</h2>
          <p>
            Tous les prix sont exprimés en Dinars Algériens (DZD) toutes taxes comprises. Dès confirmation du dossier, le prix convenu est garanti ferme et définitif. Les règlements peuvent être effectués en espèces, par virement bancaire, chèque ou carte CIB/Edahabia. Un reçu officiel est délivré pour chaque encaissement.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-indigo-950">4. Conditions d'Annulation & de Remboursement</h2>
          <p>
            En cas d'annulation à l'initiative du client :
          </p>
          <ul className="list-disc ps-5 space-y-1">
            <li>Plus de 30 jours avant le départ : remboursement intégral des sommes versées déduction faite des frais de dossier.</li>
            <li>Entre 30 et 15 jours avant le départ : retenue de l'acompte versé.</li>
            <li>Moins de 15 jours avant le départ : retenue de 100% du montant du séjour.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-indigo-950">5. Formalités Sahariennes & Pièces d'Identité</h2>
          <p>
            Pour les circuits sahariens, les participants doivent obligatoirement fournir une copie de leur pièce d'identité ou passeport en cours de validité pour l'établissement des autorisations de circulation et des laissez-passer par les autorités locales.
          </p>
        </section>
      </div>
    </div>
  );
}

export default TermsPage;

