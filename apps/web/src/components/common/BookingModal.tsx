import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Calendar, User, Phone, Mail, Users, AlertCircle, CheckCircle2, ShieldCheck, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "../ui/Button.js";
import { Input } from "../ui/Input.js";
import { submitPublicEnquiry } from "../../api/client.js";

export interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerId?: string;
  offerTitle?: string;
  defaultDepartureDate?: string;
}

const STORAGE_KEY = "numidia_booking_draft";

export function BookingModal({
  isOpen,
  onClose,
  offerId,
  offerTitle,
  defaultDepartureDate,
}: BookingModalProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [travellersCount, setTravellersCount] = useState(2);
  const [preferredDate, setPreferredDate] = useState(defaultDepartureDate || "");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState(""); // Anti-bot honeypot

  // Form State
  const [draftRestored, setDraftRestored] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successReference, setSuccessReference] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");

  // Initialize idempotency key and draft recovery
  useEffect(() => {
    if (isOpen) {
      setIdempotencyKey(crypto.randomUUID ? crypto.randomUUID() : `idemp-${Date.now()}`);
      setError(null);
      setSuccessReference(null);

      if (defaultDepartureDate) {
        setPreferredDate(defaultDepartureDate);
      }

      // Check draft in localStorage
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.fullName) setFullName(parsed.fullName);
          if (parsed.phone) setPhone(parsed.phone);
          if (parsed.email) setEmail(parsed.email);
          if (parsed.travellersCount) setTravellersCount(parsed.travellersCount);
          if (parsed.message) setMessage(parsed.message);
          setDraftRestored(true);
        }
      } catch {
        // Ignore JSON error
      }
    }
  }, [isOpen, defaultDepartureDate]);

  // Persist draft on edit
  useEffect(() => {
    if (isOpen && !successReference && (fullName || phone || email || message)) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ fullName, phone, email, travellersCount, message })
        );
      } catch {
        // Ignore quota error
      }
    }
  }, [fullName, phone, email, travellersCount, message, isOpen, successReference]);

  // Esc key closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      setError(isRtl ? "يرجى إدخال الاسم الكامل ورقم الهاتف" : "Veuillez renseigner votre nom et votre numéro de téléphone.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await submitPublicEnquiry({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        offerId: offerId || undefined,
        preferredDate: preferredDate || undefined,
        travellersCount: Number(travellersCount) || 1,
        message: message.trim() || undefined,
        source: "website_modal",
        idempotencyKey,
        websiteUrl_hp: honeypot || undefined,
      });

      setSuccessReference(res.enquiryNumber);
      // Clear draft on successful booking request
      localStorage.removeItem(STORAGE_KEY);
    } catch (err: any) {
      setError(err.message || (isRtl ? "حدث خطأ أثناء إرسال الطلب" : "Erreur lors de l'envoi de votre demande."));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-indigo-950/60 backdrop-blur-sm animate-in fade-in-0"
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-sand-200 overflow-hidden text-indigo-950 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-sand-200 bg-sand-50/50">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-terracotta-600 block">
              {offerTitle || t("common.agencyName")}
            </span>
            <h2 id="booking-modal-title" className="text-lg font-bold font-display text-indigo-950">
              {t("bookingModal.title")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-sand-500 hover:text-indigo-950 hover:bg-sand-200 rounded-full transition-colors"
            aria-label={t("common.close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {successReference ? (
            /* Success confirmation */
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-xl font-bold text-indigo-950 font-display">
                {t("bookingModal.successTitle")}
              </h3>
              <p className="text-sm text-sand-600">
                {t("bookingModal.successDesc")}{" "}
                <span className="font-mono font-bold text-indigo-950 text-base">{successReference}</span>
              </p>
              <div className="p-4 bg-sand-50 rounded-2xl border border-sand-200 text-xs text-sand-700 leading-relaxed text-start space-y-2">
                <p className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{t("bookingModal.successFollowUp")}</span>
                </p>
              </div>
              <Button variant="primary" onClick={onClose} className="w-full">
                {t("bookingModal.close")}
              </Button>
            </div>
          ) : (
            /* Booking Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Draft notification badge */}
              {draftRestored && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-saffron-500/10 border border-saffron-500/30 text-amber-800 text-xs">
                  <Sparkles className="w-4 h-4 text-saffron-500 shrink-0" />
                  <span>{t("bookingModal.draftRestored")}</span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs flex items-start gap-2 border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Honeypot field - invisible to human visitors */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="websiteUrl_hp">Leave empty</label>
                <input
                  id="websiteUrl_hp"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              {/* Full Name */}
              <Input
                id="booking-fullname"
                label={t("bookingModal.fullName")}
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ex: Mohamed Benali"
                autoComplete="name"
              />

              {/* Phone and Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  id="booking-phone"
                  label={t("bookingModal.phone")}
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("bookingModal.phonePlaceholder")}
                  autoComplete="tel"
                  dir="ltr"
                />

                <Input
                  id="booking-email"
                  label={t("bookingModal.email")}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  autoComplete="email"
                  dir="ltr"
                />
              </div>

              {/* Passengers Count & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  id="booking-passengers"
                  label={t("bookingModal.passengerCount")}
                  type="number"
                  min="1"
                  max="30"
                  required
                  value={travellersCount}
                  onChange={(e) => setTravellersCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />

                <Input
                  id="booking-date"
                  label={t("bookingModal.departureDate")}
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                />
              </div>

              {/* Special Requests */}
              <div className="space-y-1.5 text-start">
                <label htmlFor="booking-message" className="block text-xs font-semibold text-indigo-950">
                  {t("bookingModal.specialRequests")}
                </label>
                <textarea
                  id="booking-message"
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("bookingModal.specialPlaceholder")}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-sand-300 bg-white text-indigo-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-900"
                />
              </div>

              {/* Legal Disclaimer Rule 02-business-rules */}
              <div className="p-3 bg-sand-50 rounded-xl border border-sand-200 text-[11px] text-sand-600 leading-relaxed text-start">
                <span className="font-semibold text-indigo-950 block mb-0.5">
                  {isRtl ? "تنبيه قانوني هام :" : "Information importante :"}
                </span>
                {t("bookingModal.disclaimer")}
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" size="sm" onClick={onClose}>
                  {t("common.close")}
                </Button>
                <Button type="submit" variant="terracotta" disabled={loading} className="min-w-40">
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {t("bookingModal.submitting")}
                    </span>
                  ) : (
                    t("bookingModal.submit")
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default BookingModal;

