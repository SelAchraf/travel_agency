import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Phone, Mail, MapPin, Clock, MessageCircle, Send, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "../components/ui/Button.js";
import { Input } from "../components/ui/Input.js";
import { Card } from "../components/ui/Card.js";
import { SEOHead } from "../components/common/SEOHead.js";
import { submitPublicEnquiry } from "../api/client.js";

const CONTACT_DRAFT_KEY = "numidia_contact_draft";

export function ContactPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successRef, setSuccessRef] = useState<string | null>(null);

  // Restore draft from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONTACT_DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.name) setName(parsed.name);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.message) setMessage(parsed.message);
      }
    } catch {
      // Ignore JSON error
    }
  }, []);

  // Persist draft
  useEffect(() => {
    if (!successRef && (name || phone || email || message)) {
      try {
        localStorage.setItem(CONTACT_DRAFT_KEY, JSON.stringify({ name, phone, email, message }));
      } catch {
        // Ignore quota error
      }
    }
  }, [name, phone, email, message, successRef]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !message.trim()) {
      setError(isRtl ? "يرجى ملء جميع الحقول الإلزامية" : "Veuillez renseigner tous les champs obligatoires.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await submitPublicEnquiry({
        fullName: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        message: message.trim(),
        travellersCount: 1,
        source: "website_contact_page",
        idempotencyKey: crypto.randomUUID ? crypto.randomUUID() : `cnt-${Date.now()}`,
        websiteUrl_hp: honeypot || undefined,
      });

      setSuccessRef(res.enquiryNumber);
      localStorage.removeItem(CONTACT_DRAFT_KEY);
      setName("");
      setPhone("");
      setEmail("");
      setMessage("");
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'envoi du message.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      <SEOHead
        title={t("contact.title")}
        description={t("contact.subtitle")}
      />

      {/* Header */}
      <div className="max-w-3xl space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-terracotta-600 block">
          {t("common.agencyName")}
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold font-display text-indigo-950">
          {t("contact.title")}
        </h1>
        <p className="text-sm text-sand-600">{t("contact.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Contact Info (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-7 space-y-6 border border-sand-200">
            <h2 className="text-xl font-bold font-display text-indigo-950">
              Coordonnées de l'Agence
            </h2>

            <div className="space-y-4 text-sm text-sand-700">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-terracotta-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-indigo-950 block">{t("contact.address")}</span>
                  <span>14, Rue Didouche Mourad, Alger-Centre, Algérie</span>
                </div>
              </div>

              <div className="flex items-start gap-3" dir="ltr">
                <Phone className="w-5 h-5 text-terracotta-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-indigo-950 block">{t("contact.phone")}</span>
                  <a href="tel:021634578" className="hover:text-terracotta-600">
                    021 63 45 78 / +213 550 12 34 56
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3" dir="ltr">
                <Mail className="w-5 h-5 text-terracotta-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-indigo-950 block">{t("contact.email")}</span>
                  <a href="mailto:contact@numidiavoyages.dz" className="hover:text-terracotta-600">
                    contact@numidiavoyages.dz
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-saffron-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-indigo-950 block">{t("contact.hours")}</span>
                  <span className="text-xs">{t("contact.hoursText")}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-sand-200">
              <a
                href={`https://wa.me/213550123456?text=${encodeURIComponent(t("common.whatsappPrefill"))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm shadow-md hover:bg-emerald-600 transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Discuter directement sur WhatsApp</span>
              </a>
            </div>
          </Card>
        </div>

        {/* Contact Form (7 cols) */}
        <div className="lg:col-span-7">
          <Card className="p-7 sm:p-9 border border-sand-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold font-display text-indigo-950">
              {t("contact.formTitle")}
            </h2>

            {successRef ? (
              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="text-lg font-bold text-emerald-950">Message transmis avec succès !</h3>
                <p className="text-xs sm:text-sm text-emerald-900">
                  {t("contact.successAlert")}
                </p>
                <p className="text-xs text-sand-600">
                  Référence : <span className="font-mono font-bold text-indigo-950">{successRef}</span>
                </p>
                <Button variant="outline" size="sm" onClick={() => setSuccessRef(null)} className="mt-2">
                  Envoyer un autre message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs flex items-center gap-2 border border-red-200">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Honeypot field */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="contact-hp">Leave empty</label>
                  <input
                    id="contact-hp"
                    type="text"
                    tabIndex={-1}
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </div>

                <Input
                  id="contact-name"
                  label={t("contact.name")}
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Amina Boudiaf"
                  autoComplete="name"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    id="contact-phone"
                    label={t("contact.phoneField")}
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0550 12 34 56"
                    autoComplete="tel"
                    dir="ltr"
                  />

                  <Input
                    id="contact-email"
                    label={t("contact.emailField")}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="amina@domaine.dz"
                    autoComplete="email"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1.5 text-start">
                  <label htmlFor="contact-message" className="block text-xs font-semibold text-indigo-950">
                    {t("contact.message")}
                  </label>
                  <textarea
                    id="contact-message"
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Précisez votre projet de voyage, dates souhaitées, nombre de personnes..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sand-300 bg-white text-indigo-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-900"
                  />
                </div>

                <p className="text-[11px] text-sand-500">
                  {t("contact.privacyDisclaimer")}
                </p>

                <Button type="submit" variant="terracotta" size="lg" disabled={loading} className="w-full shadow-md">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {t("contact.sending")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      {t("contact.send")}
                    </span>
                  )}
                </Button>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ContactPage;
