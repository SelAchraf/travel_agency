import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./locales/fr.json";
import ar from "./locales/ar.json";

const savedLang = localStorage.getItem("travel_agency_lang") || "fr";

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    ar: { translation: ar },
  },
  lng: savedLang,
  fallbackLng: "fr",
  interpolation: {
    escapeValue: false,
  },
});

export function updateDocumentDirection(lang: string) {
  const isRtl = lang === "ar";
  document.documentElement.dir = isRtl ? "rtl" : "ltr";
  document.documentElement.lang = lang;
  if (isRtl) {
    document.body.classList.add("font-arabic");
    document.body.classList.remove("font-sans");
  } else {
    document.body.classList.add("font-sans");
    document.body.classList.remove("font-arabic");
  }
}

// Initial sync
updateDocumentDirection(savedLang);

i18n.on("languageChanged", (lng) => {
  localStorage.setItem("travel_agency_lang", lng);
  updateDocumentDirection(lng);
});

export default i18n;

