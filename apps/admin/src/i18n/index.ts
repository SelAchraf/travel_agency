import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./locales/fr.json";
import ar from "./locales/ar.json";

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    ar: { translation: ar },
  },
  lng: "fr",
  fallbackLng: "fr",
  interpolation: {
    escapeValue: false,
  },
});

export function setAppLanguage(lang: "ar" | "fr") {
  i18n.changeLanguage(lang);
  const dir = lang === "ar" ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", lang);
  if (lang === "ar") {
    document.body.classList.add("font-arabic");
    document.body.classList.remove("font-sans");
  } else {
    document.body.classList.add("font-sans");
    document.body.classList.remove("font-arabic");
  }
}

export default i18n;
