import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Compass, Phone, Menu, X, CalendarCheck, ShieldCheck } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher.js";
import { Button } from "../ui/Button.js";

interface HeaderProps {
  onOpenBooking: () => void;
}

export function Header({ onOpenBooking }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isRtl = i18n.language === "ar";

  const navLinks = [
    { to: "/", label: t("nav.home") },
    { to: "/offers", label: t("nav.offers") },
    { to: "/destinations", label: t("nav.destinations") },
    { to: "/services", label: t("nav.services") },
    { to: "/about", label: t("nav.about") },
    { to: "/contact", label: t("nav.contact") },
    { to: "/faq", label: t("nav.faq") },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-sand-200/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-20 flex items-center justify-between gap-4">
          {/* Logo Brand */}
          <Link to="/" className="flex items-center gap-3 group focus:outline-none">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-900 to-indigo-950 text-sand-50 flex items-center justify-center font-bold shadow-md shadow-indigo-950/15 group-hover:scale-105 transition-transform">
              <Compass className="w-6 h-6 text-saffron-500" />
            </div>
            <div>
              <span className="font-bold text-lg sm:text-xl text-indigo-950 block leading-tight font-display tracking-tight">
                {t("common.agencyName")}
              </span>
              <span className="text-[11px] text-terracotta-600 font-medium block">
                {t("common.agencyTagline")}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => {
              const isActive =
                link.to === "/" ? location.pathname === "/" : location.pathname.startsWith(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? "text-indigo-950 bg-sand-100"
                      : "text-sand-600 hover:text-indigo-950 hover:bg-sand-50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Phone shortcut (Desktop) */}
            <a
              href="tel:021634578"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-indigo-950 hover:bg-sand-100 border border-sand-200 transition-colors"
              dir="ltr"
            >
              <Phone className="w-3.5 h-3.5 text-terracotta-500" />
              <span>021 63 45 78</span>
            </a>

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Book Now Button */}
            <Button
              variant="terracotta"
              size="sm"
              onClick={onOpenBooking}
              className="hidden md:inline-flex shadow-sm"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>{t("common.bookNow")}</span>
            </Button>

            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-sand-600 hover:text-indigo-950 hover:bg-sand-100 focus:outline-none"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6 text-indigo-950" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-sand-200 bg-white/98 px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top-2">
          {navLinks.map((link) => {
            const isActive =
              link.to === "/" ? location.pathname === "/" : location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-2.5 rounded-xl text-base font-semibold transition-colors ${
                  isActive ? "bg-sand-100 text-indigo-950 font-bold" : "text-sand-600 hover:bg-sand-50"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          <div className="pt-4 border-t border-sand-200 flex flex-col gap-2.5">
            <a
              href="tel:021634578"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sand-100 text-indigo-950 font-bold text-sm"
              dir="ltr"
            >
              <Phone className="w-4 h-4 text-terracotta-500" />
              <span>021 63 45 78</span>
            </a>
            <Button
              variant="terracotta"
              size="md"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenBooking();
              }}
              className="w-full"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>{t("common.requestBooking")}</span>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;

