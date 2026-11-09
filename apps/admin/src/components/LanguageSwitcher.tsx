import React from "react";
import { useTranslation } from "react-i18next";
import { setAppLanguage } from "../i18n/index.js";
import { Globe } from "lucide-react";

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language.startsWith("ar") ? "ar" : "fr") as "ar" | "fr";

  const toggleLanguage = (lang: "ar" | "fr") => {
    setAppLanguage(lang);
  };

  return (
    <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-sand-200/60 border border-sand-300/50">
      <Globe className="h-4 w-4 text-sand-500 ms-1.5" />
      <button
        type="button"
        onClick={() => toggleLanguage("fr")}
        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
          currentLang === "fr"
            ? "bg-white text-indigo-950 shadow-sm"
            : "text-sand-500 hover:text-indigo-900"
        }`}
      >
        Français (LTR)
      </button>
      <button
        type="button"
        onClick={() => toggleLanguage("ar")}
        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all font-arabic ${
          currentLang === "ar"
            ? "bg-white text-indigo-950 shadow-sm"
            : "text-sand-500 hover:text-indigo-900"
        }`}
      >
        العربية (RTL)
      </button>
    </div>
  );
};
