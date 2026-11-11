import React from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || "fr";

  const toggleLanguage = () => {
    const nextLang = currentLang === "ar" ? "fr" : "ar";
    i18n.changeLanguage(nextLang);
  };

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-sand-100 hover:bg-sand-200 text-indigo-950 border border-sand-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-900"
      aria-label={currentLang === "ar" ? "Changer en français" : "التحويل إلى العربية"}
    >
      <Globe className="w-3.5 h-3.5 text-terracotta-500" />
      <span className="font-bold">{currentLang === "ar" ? "Français" : "العربية"}</span>
    </button>
  );
}

export default LanguageSwitcher;

