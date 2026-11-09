import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../components/LanguageSwitcher.js";
import { Button } from "../components/ui/Button.js";
import { Input } from "../components/ui/Input.js";
import { Card } from "../components/ui/Card.js";
import { apiClient } from "../lib/api.js";
import { Compass, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";

export function ForgotPasswordPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await apiClient<{ success: boolean; message: string; resetToken?: string }>(
        "/auth/forgot-password",
        {
          method: "POST",
          body: JSON.stringify({ email }),
        }
      );

      setSuccess(true);
      if (res.resetToken) {
        setDevToken(res.resetToken);
      }
    } catch (err: any) {
      setError(err?.message || "Une erreur est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      <div className="absolute top-4 end-4 z-10">
        <LanguageSwitcher />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-900 to-indigo-950 text-sand-50 flex items-center justify-center shadow-xl shadow-indigo-950/15 border border-indigo-800">
            <Compass className="w-10 h-10 text-saffron-500" />
          </div>
        </div>

        <h1 className="text-center text-2xl font-extrabold text-indigo-950 tracking-tight font-display">
          {t("auth.forgotPasswordTitle")}
        </h1>
        <p className="mt-2 text-center text-sm text-sand-600 max-w">
          {t("auth.forgotPasswordSubtitle")}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="py-8 px-6 sm:px-10 shadow-lg border-sand-200 bg-white">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {success ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-indigo-950 mb-2">Instructions envoyées</h3>
              <p className="text-sm text-sand-600 mb-6">
                Si un compte correspond à cette adresse email, un lien de réinitialisation sécurisé lui a été attribué.
              </p>

              {devToken && (
                <div className="mb-6 p-4 bg-sand-100 rounded-xl text-start border border-sand-300">
                  <div className="text-xs font-bold text-terracotta-700 uppercase tracking-wider mb-1">
                    Jeton de Test (Dev Mode) :
                  </div>
                  <div className="font-mono text-xs break-all bg-white p-2 rounded border border-sand-300 select-all">
                    {devToken}
                  </div>
                  <Link
                    to={`/reset-password?token=${devToken}`}
                    className="mt-3 block text-center text-xs font-bold text-terracotta-600 hover:underline"
                  >
                    Passer directement à la réinitialisation →
                  </Link>
                </div>
              )}

              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-900 hover:text-indigo-950"
              >
                <BackIcon className="w-4 h-4" />
                <span>{t("auth.backToLogin")}</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                type="email"
                label={t("auth.email")}
                placeholder={t("auth.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Button
                type="submit"
                variant="terracotta"
                size="lg"
                className="w-full justify-center"
                disabled={isSubmitting}
              >
                {isSubmitting ? t("common.loading") : t("auth.sendResetLink")}
              </Button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-sand-600 hover:text-indigo-950"
                >
                  <BackIcon className="w-3.5 h-3.5" />
                  <span>{t("auth.backToLogin")}</span>
                </Link>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

