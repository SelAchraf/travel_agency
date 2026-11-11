import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../lib/api.js";
import { Card } from "../../components/ui/Card.js";
import { Button } from "../../components/ui/Button.js";
import { Input } from "../../components/ui/Input.js";
import { LanguageSwitcher } from "../../components/LanguageSwitcher.js";
import { Compass, KeyRound, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react";

export function PortalAuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  const [tokenInput, setTokenInput] = useState(searchParams.get("token") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyToken = async (tokenToVerify: string) => {
    if (!tokenToVerify.trim()) {
      setError("Veuillez renseigner votre jeton d'accès sécurisé");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<{ success: boolean; data: { customer: any; token: string } }>(
        "/portal/auth/verify-link",
        {
          method: "POST",
          body: JSON.stringify({ token: tokenToVerify.trim() }),
        }
      );

      if (res.success && res.data) {
        localStorage.setItem("portalCustomerToken", res.data.token);
        navigate("/portal/my-bookings");
      }
    } catch (err: any) {
      setError(err.message || "Jeton d'accès invalide ou expiré");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlToken = searchParams.get("token");
    if (urlToken && urlToken.length > 10) {
      verifyToken(urlToken);
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyToken(tokenInput);
  };

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans">
      {/* Top Bar with Language Switcher */}
      <div className="max-w-md mx-auto w-full flex justify-between items-center pb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-950 flex items-center justify-center text-white font-bold text-sm">
            NV
          </div>
          <span className="font-bold text-sm text-indigo-950">Numidia Voyages</span>
        </div>
        <LanguageSwitcher />
      </div>

      {/* Main Authentication Card */}
      <div className="max-w-md mx-auto w-full">
        <Card className="p-6 sm:p-8 shadow-md border-sand-200">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-900 rounded-full flex items-center justify-center mx-auto mb-3">
              <Compass className="w-6 h-6 text-terracotta-600" />
            </div>
            <h1 className="text-xl font-bold text-indigo-950">{t("portal.loginTitle")}</h1>
            <p className="text-xs text-sand-600 mt-1.5 leading-relaxed">
              {t("portal.loginSubtitle")}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-indigo-950 mb-1">
                Jeton d'accès (Token)
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-sand-400 absolute top-3 left-3 pointer-events-none" />
                <Input
                  type="text"
                  placeholder={t("portal.tokenPlaceholder")}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="pl-9 font-mono text-xs h-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-900 hover:bg-indigo-950 text-white font-semibold text-xs h-10 shadow-sm"
            >
              {loading ? t("common.loading") : t("portal.verifyButton")}
            </Button>
          </form>

          {/* Anti-IDOR Security Assurance */}
          <div className="mt-6 pt-4 border-t border-sand-100 flex items-center gap-2 text-[11px] text-sand-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{t("portal.antiIdorNotice")}</span>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-sand-500 pt-6">
        Numidia Voyages & Tourisme • Licence d'État N° 16/0423/AVT
      </div>
    </div>
  );
}
export default PortalAuthPage;

