import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../components/LanguageSwitcher.js";
import { Button } from "../components/ui/Button.js";
import { Input } from "../components/ui/Input.js";
import { Card } from "../components/ui/Card.js";
import { apiClient } from "../lib/api.js";
import { Compass, CheckCircle2, AlertCircle } from "lucide-react";

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [token, setToken] = useState(searchParams.get("token") || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 10) {
      setError("Le mot de passe doit comporter au moins 10 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe saisis ne correspondent pas.");
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
      });
      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err: any) {
      setError(err?.message || "Échec de réinitialisation.");
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
          {t("auth.resetTitle")}
        </h1>
        <p className="mt-2 text-center text-sm text-sand-600 max-w">
          {t("auth.resetSubtitle")}
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
              <h3 className="text-lg font-bold text-indigo-950 mb-2">
                {t("auth.resetSuccess")}
              </h3>
              <p className="text-sm text-sand-600 mb-6">
                Redirection automatique vers la page de connexion dans quelques secondes...
              </p>
              <Link to="/login">
                <Button variant="terracotta" className="w-full justify-center">
                  Se connecter maintenant
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label={t("auth.token")}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Ex: a1b2c3d4..."
                required
              />

              <Input
                type="password"
                label={t("auth.newPassword")}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Au moins 10 caractères (Maj, min, chiffre)"
                required
              />

              <Input
                type="password"
                label={t("auth.confirmPassword")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Répétez le mot de passe"
                required
              />

              <Button
                type="submit"
                variant="terracotta"
                size="lg"
                className="w-full justify-center"
                disabled={isSubmitting}
              >
                {isSubmitting ? t("common.loading") : t("auth.resetButton")}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

