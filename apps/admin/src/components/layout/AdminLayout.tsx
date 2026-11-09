import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.js";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../LanguageSwitcher.js";
import { Badge } from "../ui/Badge.js";
import { Button } from "../ui/Button.js";
import { ROLE_LABELS } from "@travel-agency/shared";
import {
  Users,
  ShieldCheck,
  Compass,
  Palette,
  LogOut,
  Menu,
  X,
  Inbox,
  MapPin,
  Contact,
  CalendarCheck,
  Receipt,
} from "lucide-react";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, hasPermission } = useAuth();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const isRtl = i18n.language === "ar";
  const roleLabel = user ? (ROLE_LABELS[user.role]?.[isRtl ? "ar" : "fr"] || user.role) : "";

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navLinks = [
    {
      to: "/admin/offers",
      label: t("common.offers"),
      icon: MapPin,
      permission: "offers:read" as const,
    },
    {
      to: "/admin/enquiries",
      label: t("common.enquiries"),
      icon: Inbox,
      permission: "enquiries:read" as const,
    },
    {
      to: "/admin/customers",
      label: t("common.customers"),
      icon: Contact,
      permission: "customers:read" as const,
    },
    {
      to: "/admin/reservations",
      label: t("common.reservations"),
      icon: CalendarCheck,
      permission: "reservations:read" as const,
    },
    {
      to: "/admin/payments",
      label: t("common.payments"),
      icon: Receipt,
      permission: "payments:read" as const,
    },
    {
      to: "/admin/users",
      label: t("common.users"),
      icon: Users,
      permission: "users:manage" as const,
    },
    {
      to: "/admin/audit-logs",
      label: t("common.audit"),
      icon: ShieldCheck,
      permission: "audit:read" as const,
    },
    {
      to: "/design-system",
      label: t("common.designSystem"),
      icon: Palette,
      permission: undefined,
    },
  ];

  const visibleLinks = navLinks.filter(
    (link) => !link.permission || hasPermission(link.permission)
  );

  return (
    <div className="min-h-screen bg-sand-50 text-indigo-950 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-sand-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo / Agency Identity */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-sand-600 hover:text-indigo-950 rounded-lg hover:bg-sand-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link to="/admin/users" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-900 to-indigo-950 text-sand-50 flex items-center justify-center font-bold shadow-md shadow-indigo-950/10 group-hover:scale-105 transition-transform">
                <Compass className="w-6 h-6 text-saffron-500" />
              </div>
              <div>
                <span className="font-bold text-base sm:text-lg text-indigo-950 block leading-tight">
                  {t("common.agencyName")}
                </span>
                <span className="text-[11px] text-terracotta-600 font-medium block">
                  Back-Office & Administration
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 ms-6 border-s border-sand-200 ps-6">
              {visibleLinks.map((item) => {
                const isActive = location.pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-indigo-900 text-white shadow-sm"
                        : "text-sand-700 hover:text-indigo-950 hover:bg-sand-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Controls: User info, Language Switcher, Logout */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            {user && (
              <div className="hidden sm:flex items-center gap-3 ps-3 border-s border-sand-200">
                <div className="text-end">
                  <div className="text-xs font-bold text-indigo-950">{user.fullName}</div>
                  <Badge variant="indigo" className="text-[10px] py-0 px-1.5 mt-0.5">
                    {roleLabel}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-sand-600 hover:text-red-600 hover:bg-red-50 p-2"
                  title={t("common.logout")}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-sand-200 bg-white px-4 pt-2 pb-4 space-y-1">
            {visibleLinks.map((item) => {
              const isActive = location.pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    isActive
                      ? "bg-indigo-900 text-white"
                      : "text-sand-700 hover:bg-sand-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {user && (
              <div className="pt-3 mt-3 border-t border-sand-200 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-indigo-950">{user.fullName}</div>
                  <div className="text-xs text-sand-500">{user.email}</div>
                  <Badge variant="indigo" className="text-[10px] mt-1">
                    {roleLabel}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4 me-1.5" />
                  {t("common.logout")}
                </Button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

