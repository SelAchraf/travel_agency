import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  imageUrl?: string;
  type?: "website" | "article" | "trip";
  structuredData?: Record<string, any>;
}

export function SEOHead({
  title,
  description,
  canonicalUrl,
  imageUrl,
  type = "website",
  structuredData,
}: SEOHeadProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  const defaultTitle = isRtl
    ? "وكالة نوميديا للأسفار | السياحة الصحراوية والرحلات في الجزائر"
    : "Numidia Voyages | Agence de Voyages et Tourisme en Algérie";

  const defaultDesc = isRtl
    ? "وكالة سياحة وأسفار معتمدة بالجزائر. رحلات استكشاف الصحراء الكبرى، تادرارت الحمراء، طاسيلي ناجر، تيميمون وبرامج السياحة الثقافية والعمرة."
    : "Agence de voyages agréée en Algérie. Circuits sahariens, Djanet, Tadrart Rouge, oasis de Timimoun, tourisme culturel et Omra avec des guides locaux certifiés.";

  const fullTitle = title ? `${title} — ${t("common.agencyName")}` : defaultTitle;
  const fullDesc = description || defaultDesc;
  const canonical = canonicalUrl || window.location.href;
  const defaultImage = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80";
  const image = imageUrl || defaultImage;

  useEffect(() => {
    // Update Title
    document.title = fullTitle;

    // Helper to set or create meta
    const setMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? `property="${name}"` : `name="${name}"`;
      let element = document.querySelector(`meta[${attr}]`) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement("meta");
        if (isProperty) {
          element.setAttribute("property", name);
        } else {
          element.setAttribute("name", name);
        }
        document.head.appendChild(element);
      }
      element.content = content;
    };

    setMeta("description", fullDesc);
    setMeta("og:title", fullTitle, true);
    setMeta("og:description", fullDesc, true);
    setMeta("og:url", canonical, true);
    setMeta("og:image", image, true);
    setMeta("og:type", type === "trip" ? "website" : type, true);
    setMeta("og:locale", isRtl ? "ar_DZ" : "fr_DZ", true);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", fullDesc);
    setMeta("twitter:image", image);

    // Canonical link tag
    let linkCanonical = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
    if (!linkCanonical) {
      linkCanonical = document.createElement("link");
      linkCanonical.rel = "canonical";
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.href = canonical;

    // JSON-LD Structured Data
    const defaultAgencyJsonLd = {
      "@context": "https://schema.org",
      "@type": "TravelAgency",
      name: "Numidia Voyages & Tourisme",
      image: defaultImage,
      address: {
        "@type": "PostalAddress",
        streetAddress: "14, Rue Didouche Mourad",
        addressLocality: "Alger-Centre",
        postalCode: "16000",
        addressCountry: "DZ",
      },
      telephone: "+213-21-63-45-78",
      email: "contact@numidiavoyages.dz",
      priceRange: "DZD",
      license: "Licence N° 16/0423/AVT",
    };

    const finalJsonLd = structuredData || defaultAgencyJsonLd;

    let scriptJsonLd = document.querySelector("#seo-json-ld") as HTMLScriptElement | null;
    if (!scriptJsonLd) {
      scriptJsonLd = document.createElement("script");
      scriptJsonLd.id = "seo-json-ld";
      scriptJsonLd.type = "application/ld+json";
      document.head.appendChild(scriptJsonLd);
    }
    scriptJsonLd.textContent = JSON.stringify(finalJsonLd);
  }, [fullTitle, fullDesc, canonical, image, type, structuredData, isRtl]);

  return null;
}

export default SEOHead;

