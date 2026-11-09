import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../components/LanguageSwitcher.js";
import { Button } from "../components/ui/Button.js";
import { Input } from "../components/ui/Input.js";
import { Card } from "../components/ui/Card.js";
import { Compass, Eye, EyeOff, AlertCircle, ShieldCheck } from "lucide-react";

export function LoginPage() {
  const { login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as any)?.from?.pathname || "/admin/users";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || "Échec de connexion. Vérifiez vos identifiants.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("PasswordSecure2026!");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-terracotta-500 selection:text-white">
      {/* Top Bar with Language Switcher */}
      <div className="absolute top-4 end-4 z-10">
        <LanguageSwitcher />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Icon & Heading */}
        <div className="flex justify-center mb-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-900 to-indigo-950 text-sand-50 flex items-center justify-center shadow-xl shadow-indigo-950/15 border border-indigo-800">
            <Compass className="w-10 h-10 text-saffron-500 animate-pulse" />
          </div>
        </div>

        <h1 className="text-center text-2xl sm:text-3xl font-extrabold text-indigo-950 tracking-tight font-display">
          {t("auth.loginTitle")}
        </h1>
        <p className="mt-2 text-center text-sm text-sand-600 max-w">
          {t("auth.loginSubtitle")}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="py-8 px-6 sm:px-10 shadow-lg border-sand-200 bg-white">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              type="email"
              label={t("auth.email")}
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="bg-sand-50/50"
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-indigo-950">
                  {t("auth.password")}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-terracotta-600 hover:text-terracotta-700 hover:underline"
                >
                  {t("auth.forgotPassword")}
                </Link>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={t("auth.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-sand-300 bg-sand-50/50 text-indigo-950 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 transition-colors pe-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 end-0 pe-3 flex items-center text-sand-500 hover:text-indigo-950"
                  tabIndex={-1}
                  aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="terracotta"
              size="lg"
              className="w-full justify-center shadow-md shadow-terracotta-600/20"
              disabled={isSubmitting}
            >
              {isSubmitting ? t("auth.loggingIn") : t("auth.loginButton")}
            </Button>
          </form>

          {/* Quick Demo Credentials for Fast Testing & Verification */}
          <div className="mt-8 pt-6 border-t border-sand-200">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-sand-600 mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{t("auth.quickDemo")}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillDemoAccount("admin@numidiavoyages.dz")}
                className="p-2 text-start rounded-lg border border-sand-200 bg-sand-50 hover:bg-sand-100 transition-colors"
              >
                <div className="font-bold text-indigo-950">{t("auth.owner")}</div>
                <div className="text-[11px] text-sand-500">admin@...</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount("manager@numidiavoyages.dz")}
                className="p-2 text-start rounded-lg border border-sand-200 bg-sand-50 hover:bg-sand-100 transition-colors"
              >
                <div className="font-bold text-indigo-950">{t("auth.manager")}</div>
                <div className="text-[11px] text-sand-500">manager@...</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount("agent@numidiavoyages.dz")}
                className="p-2 text-start rounded-lg border border-sand-200 bg-sand-50 hover:bg-sand-100 transition-colors"
              >
                <div className="font-bold text-indigo-950">{t("auth.agent")}</div>
                <div className="text-[11px] text-sand-500">agent@...</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount("finance@numidiavoyages.dz")}
                className="p-2 text-start rounded-lg border border-sand-200 bg-sand-50 hover:bg-sand-100 transition-colors"
              >
                <div className="font-bold text-indigo-950">{t("auth.finance")}</div>
                <div className="text-[11px] text-sand-500">finance@...</div>
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

