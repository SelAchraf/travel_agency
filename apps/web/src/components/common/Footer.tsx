import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Compass, Phone, Mail, MapPin, ShieldCheck, Clock, ExternalLink } from "lucide-react";

export function Footer() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  return (
    <footer className="bg-indigo-950 text-sand-50 pt-16 pb-24 md:pb-16 border-t border-indigo-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-indigo-900/80">
          {/* Agency Identity & Accreditation (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-saffron-500 text-indigo-950 flex items-center justify-center font-bold shadow-md">
                <Compass className="w-6 h-6 text-indigo-950" />
              </div>
              <div>
                <span className="font-bold text-xl text-sand-50 block font-display">
                  {t("common.agencyName")}
                </span>
                <span className="text-xs text-saffron-400 font-medium block">
                  {t("common.agencyTagline")}
                </span>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-sand-300 leading-relaxed max-w-md">
              {t("footer.desc")}
            </p>

            {/* Official Accreditation Seal */}
            <div className="p-3.5 rounded-2xl bg-indigo-900/60 border border-indigo-800 text-xs text-sand-200 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-sand-50 block">Agrément Officiel d'État</span>
                <p className="text-[11px] text-sand-300 mt-0.5">{t("common.licence")}</p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-saffron-400 font-sans">
              {t("footer.quickLinks")}
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-sand-300">
              <li>
                <Link to="/" className="hover:text-saffron-300 transition-colors">
                  {t("nav.home")}
                </Link>
              </li>
              <li>
                <Link to="/offers" className="hover:text-saffron-300 transition-colors">
                  {t("nav.offers")}
                </Link>
              </li>
              <li>
                <Link to="/destinations" className="hover:text-saffron-300 transition-colors">
                  {t("nav.destinations")}
                </Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-saffron-300 transition-colors">
                  {t("nav.services")}
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-saffron-300 transition-colors">
                  {t("nav.about")}
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-saffron-300 transition-colors">
                  {t("nav.faq")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Top Destinations */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-saffron-400 font-sans">
              {t("footer.topDestinations")}
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-sand-300">
              <li>
                <Link to="/destinations/djanet" className="hover:text-saffron-300 transition-colors">
                  Djanet & Tadrart Rouge
                </Link>
              </li>
              <li>
                <Link to="/destinations/timimoun" className="hover:text-saffron-300 transition-colors">
                  Timimoun & Oasis du Gourara
                </Link>
              </li>
              <li>
                <Link to="/destinations/constantine" className="hover:text-saffron-300 transition-colors">
                  Constantine & Ponts Suspendus
                </Link>
              </li>
              <li>
                <Link to="/destinations/tipaza" className="hover:text-saffron-300 transition-colors">
                  Tipaza & Ruines Romaines
                </Link>
              </li>
              <li>
                <Link to="/destinations/oran" className="hover:text-saffron-300 transition-colors">
                  Oran & Santa Cruz
                </Link>
              </li>
              <li>
                <Link to="/offers?type=umrah" className="hover:text-saffron-300 transition-colors">
                  Omra & Lieux Saints
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact coordinates */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-saffron-400 font-sans">
              {t("nav.contact")}
            </h4>
            <div className="space-y-2.5 text-xs text-sand-300">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-terracotta-500 shrink-0 mt-0.5" />
                <span>14, Rue Didouche Mourad, Alger-Centre, Algérie</span>
              </div>
              <div className="flex items-center gap-2" dir="ltr">
                <Phone className="w-4 h-4 text-terracotta-500 shrink-0" />
                <a href="tel:021634578" className="hover:text-saffron-300">
                  021 63 45 78 / +213 550 12 34 56
                </a>
              </div>
              <div className="flex items-center gap-2" dir="ltr">
                <Mail className="w-4 h-4 text-terracotta-500 shrink-0" />
                <a href="mailto:contact@numidiavoyages.dz" className="hover:text-saffron-300">
                  contact@numidiavoyages.dz
                </a>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-saffron-400 shrink-0 mt-0.5" />
                <span>Samedi - Jeudi : 08h30 - 17h30</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-sand-400">
          <div>
            © {new Date().getFullYear()} {t("footer.copyright")}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link to="/terms" className="hover:text-sand-200 transition-colors">
              {t("footer.terms")}
            </Link>
            <span>•</span>
            <Link to="/privacy" className="hover:text-sand-200 transition-colors">
              {t("footer.privacy")}
            </Link>
            <span>•</span>
            <a
              href="http://localhost:3001"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-saffron-400 hover:text-saffron-300"
            >
              <span>Accès Espace Personnel</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

