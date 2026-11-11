import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, HelpCircle, Phone, MessageCircle } from "lucide-react";
import { Card } from "../components/ui/Card.js";
import { Button } from "../components/ui/Button.js";
import { SEOHead } from "../components/common/SEOHead.js";

interface FAQItem {
  q: string;
  a: string;
}

export function FAQPage() {
  const { t } = useTranslation();
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs: FAQItem[] = [
    { q: t("faq.q1"), a: t("faq.a1") },
    { q: t("faq.q2"), a: t("faq.a2") },
    { q: t("faq.q3"), a: t("faq.a3") },
    { q: t("faq.q4"), a: t("faq.a4") },
    { q: t("faq.q5"), a: t("faq.a5") },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <SEOHead
        title={t("faq.title")}
        description={t("faq.subtitle")}
      />

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-terracotta-600 block">
          {t("common.agencyName")}
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold font-display text-indigo-950">
          {t("faq.title")}
        </h1>
        <p className="text-sm text-sand-600">{t("faq.subtitle")}</p>
      </div>

      {/* FAQ Accordion List */}
      <div className="space-y-4">
        {faqs.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <Card key={idx} className="border border-sand-200 overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full p-5 sm:p-6 text-start flex items-center justify-between gap-4 hover:bg-sand-50/60 transition-colors focus:outline-none"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-terracotta-600 shrink-0" />
                  <span className="text-base font-bold text-indigo-950 font-sans">
                    {faq.q}
                  </span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-sand-500 transition-transform duration-300 shrink-0 ${
                    isOpen ? "rotate-180 text-indigo-950" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm text-sand-700 leading-relaxed border-t border-sand-100 bg-sand-50/30">
                  {faq.a}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Contact prompt if not found */}
      <div className="p-8 rounded-3xl bg-sand-100 text-center space-y-4 border border-sand-200">
        <h3 className="text-lg font-bold text-indigo-950">
          Vous avez une autre question ?
        </h3>
        <p className="text-xs sm:text-sm text-sand-600 max-w-md mx-auto">
          Notre équipe est à votre écoute pour vous conseiller et répondre à toutes vos interrogations.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="tel:021634578"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-950 border border-sand-300 text-xs font-bold hover:bg-sand-50 transition-colors"
          >
            <Phone className="w-4 h-4 text-terracotta-600" />
            <span>021 63 45 78</span>
          </a>
          <a
            href={`https://wa.me/213550123456?text=${encodeURIComponent("Bonjour Numidia Voyages, j'ai une question concernant vos services.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors shadow-sm"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp Direct</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default FAQPage;

